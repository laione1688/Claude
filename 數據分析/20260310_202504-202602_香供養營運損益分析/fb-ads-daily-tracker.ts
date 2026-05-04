/**
 * FB Ads 每日投放追蹤器
 * 拉取當前投放期各 Campaign 的每日數據，輸出 Markdown 格式
 *
 * 用法：bun fb-ads-daily-tracker.ts [--since 2026-04-01]
 */

import {
  FB_ADS_CONFIG,
  GRAPH_API_BASE,
} from "./fb-ads-config";

// ==================== 型別 ====================

interface DailyRow {
  date_start: string;
  date_stop: string;
  campaign_name: string;
  spend: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
}

interface CampaignDaily {
  name: string;
  period: string; // 期數，例如「第 11 期」
  days: Array<{
    date: string;
    spend: number;
    purchases: number;
    cumulativeSpend: number;
    cumulativePurchases: number;
    cpa: number; // 累計 CPA
  }>;
  totalSpend: number;
  totalPurchases: number;
  avgCPA: number;
  status: "🟢" | "🟡" | "🔴" | "⚪";
}

// ==================== 核心函數 ====================

async function fetchDailyCampaignData(since: string, until: string): Promise<DailyRow[]> {
  const { adAccountId, accessToken, apiVersion } = FB_ADS_CONFIG;

  if (!accessToken) {
    throw new Error("FB_ACCESS_TOKEN 未設定");
  }

  const url = new URL(`https://graph.facebook.com/${apiVersion}/${adAccountId}/insights`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("fields", [
    "campaign_name",
    "spend",
    "actions",
    "cost_per_action_type",
  ].join(","));
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("time_increment", "1"); // 每日
  url.searchParams.set("limit", "500");

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(`FB API 錯誤 [${data.error.code}]: ${data.error.message}`);
  }

  let allRows: DailyRow[] = data.data || [];
  let nextUrl = data.paging?.next;

  while (nextUrl) {
    const nextResponse = await fetch(nextUrl);
    const nextData = await nextResponse.json();
    if (nextData.data) allRows = allRows.concat(nextData.data);
    nextUrl = nextData.paging?.next;
  }

  return allRows;
}

function extractPurchases(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  // purchase 或 omni_purchase
  const p = actions.find(a => a.action_type === "purchase" || a.action_type === "omni_purchase");
  return p ? parseInt(p.value) : 0;
}

function judgeCPA(cpa: number): "🟢" | "🟡" | "🔴" | "⚪" {
  if (cpa === 0) return "⚪"; // 無購買
  if (cpa <= 350) return "🟢";
  if (cpa <= 600) return "🟡";
  return "🔴";
}

function extractPeriod(campaignName: string): string {
  const match = campaignName.match(/第(\d+)期/);
  return match ? `第 ${match[1]} 期` : "";
}

// ==================== 主流程 ====================

async function main() {
  // 解析參數
  const args = process.argv.slice(2);
  const sinceIdx = args.indexOf("--since");
  const today = new Date().toISOString().split("T")[0];

  // 預設：從本月 1 號開始
  const defaultSince = today.slice(0, 8) + "01";
  const since = sinceIdx >= 0 ? args[sinceIdx + 1] : defaultSince;
  const until = today;

  console.log(`📊 FB Ads 每日投放追蹤`);
  console.log(`📅 期間：${since} ~ ${until}`);
  console.log(`⏰ 更新時間：${new Date().toLocaleString("zh-TW")}\n`);

  // 拉數據
  const rows = await fetchDailyCampaignData(since, until);

  if (!rows.length) {
    console.log("⚠️ 該期間無數據");
    return;
  }

  // 按 Campaign 分組
  const campaignMap = new Map<string, DailyRow[]>();
  for (const row of rows) {
    const name = row.campaign_name;
    if (!campaignMap.has(name)) campaignMap.set(name, []);
    campaignMap.get(name)!.push(row);
  }

  // 處理每個 Campaign
  const campaigns: CampaignDaily[] = [];

  for (const [name, dailyRows] of campaignMap) {
    // 按日期排序
    dailyRows.sort((a, b) => a.date_start.localeCompare(b.date_start));

    let cumulativeSpend = 0;
    let cumulativePurchases = 0;

    const days = dailyRows.map(row => {
      const spend = parseFloat(row.spend);
      const purchases = extractPurchases(row.actions);
      cumulativeSpend += spend;
      cumulativePurchases += purchases;
      const cpa = cumulativePurchases > 0 ? Math.round(cumulativeSpend / cumulativePurchases) : 0;

      return {
        date: row.date_start,
        spend,
        purchases,
        cumulativeSpend,
        cumulativePurchases,
        cpa,
      };
    });

    const totalSpend = cumulativeSpend;
    const totalPurchases = cumulativePurchases;
    const avgCPA = totalPurchases > 0 ? Math.round(totalSpend / totalPurchases) : 0;

    campaigns.push({
      name,
      period: extractPeriod(name),
      days,
      totalSpend,
      totalPurchases,
      avgCPA,
      status: judgeCPA(avgCPA),
    });
  }

  // 排序：花費最多的在前
  campaigns.sort((a, b) => b.totalSpend - a.totalSpend);

  // ==================== 輸出 Markdown ====================

  // 總覽
  const totalSpend = campaigns.reduce((s, c) => s + c.totalSpend, 0);
  const totalPurchases = campaigns.reduce((s, c) => s + c.totalPurchases, 0);
  const overallCPA = totalPurchases > 0 ? Math.round(totalSpend / totalPurchases) : 0;

  console.log(`## 【FB 廣告成效】投放中（截至 ${until}）`);
  console.log(`💰 本期花費 $${Math.round(totalSpend).toLocaleString()} | 購買 ${totalPurchases} 筆 | CPA $${overallCPA}\n`);

  // 每個 Campaign 的每日追蹤表
  for (const c of campaigns) {
    if (c.days.length === 0) continue;

    const startDate = c.days[0].date.slice(5); // MM-DD
    const endDate = c.days[c.days.length - 1].date.slice(5);

    console.log(`### ${c.name}（${startDate} ~ ${endDate}）${c.status}`);
    console.log();

    // 表頭：日期用 D, D+1, D+2...
    const dateHeaders = c.days.map((d, i) => i === 0 ? "D" : `D+${i}`);
    const dateLabels = c.days.map(d => d.date.slice(5)); // MM-DD

    console.log(`| 指標 | ${dateHeaders.join(" | ")} | **累計** |`);
    console.log(`|------|${dateHeaders.map(() => "------").join("|")}|--------|`);

    // 日期行
    console.log(`| 日期 | ${dateLabels.join(" | ")} | — |`);

    // 當日花費
    console.log(`| 當日花費 | ${c.days.map(d => `$${Math.round(d.spend).toLocaleString()}`).join(" | ")} | **$${Math.round(c.totalSpend).toLocaleString()}** |`);

    // 累計花費
    console.log(`| 累計花費 | ${c.days.map(d => `$${Math.round(d.cumulativeSpend).toLocaleString()}`).join(" | ")} | — |`);

    // 當日購買
    console.log(`| 當日購買 | ${c.days.map(d => String(d.purchases)).join(" | ")} | **${c.totalPurchases}** |`);

    // 累計購買
    console.log(`| 累計購買 | ${c.days.map(d => String(d.cumulativePurchases)).join(" | ")} | — |`);

    // 累計 CPA
    console.log(`| 累計 CPA | ${c.days.map(d => d.cpa > 0 ? `$${d.cpa}` : "—").join(" | ")} | **$${c.avgCPA > 0 ? c.avgCPA : "—"}** |`);

    // 判定
    console.log(`| 判定 | ${c.days.map(() => "").join(" | ")} | **${c.status}** |`);

    console.log();
  }

  // 投放結束的彙總表
  console.log(`### 📋 Campaign 彙總`);
  console.log();
  console.log(`| Campaign | 花費 | 購買 | CPA | 判定 |`);
  console.log(`|----------|------|------|-----|------|`);
  for (const c of campaigns) {
    console.log(`| ${c.name} | $${Math.round(c.totalSpend).toLocaleString()} | ${c.totalPurchases} | $${c.avgCPA > 0 ? c.avgCPA : "—"} | ${c.status} |`);
  }
  console.log();

  // 最佳受眾提示
  const bestCampaign = campaigns.filter(c => c.avgCPA > 0).sort((a, b) => a.avgCPA - b.avgCPA)[0];
  if (bestCampaign) {
    console.log(`⭐ 最佳 Campaign：${bestCampaign.name}（CPA $${bestCampaign.avgCPA}）`);
  }

  const worstCampaign = campaigns.filter(c => c.avgCPA > 600).sort((a, b) => b.avgCPA - a.avgCPA)[0];
  if (worstCampaign) {
    console.log(`⚠️ 建議關注：${worstCampaign.name}（CPA $${worstCampaign.avgCPA}）`);
  }
}

main().catch(err => {
  console.error("❌ 執行錯誤：", err.message);
  process.exit(1);
});
