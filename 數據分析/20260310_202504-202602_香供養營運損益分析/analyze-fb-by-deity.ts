/**
 * 各神明 FB 廣告成效分析
 * 從 GA4 campaign 名稱解析神明分類，計算各神明的廣告轉換數據
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GA4_CONFIG } from "./ga4-config";

const client = new BetaAnalyticsDataClient({
  keyFilename: GA4_CONFIG.serviceAccountKeyPath,
});
const propertyId = GA4_CONFIG.propertyId;

async function runReport(params: {
  dimensions: string[];
  metrics: string[];
  startDate: string;
  endDate: string;
  dimensionFilter?: any;
  orderBys?: any[];
  limit?: number;
}) {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
    dimensions: params.dimensions.map((name) => ({ name })),
    metrics: params.metrics.map((name) => ({ name })),
    dimensionFilter: params.dimensionFilter,
    orderBys: params.orderBys,
    limit: params.limit,
  });
  return response;
}

function getMetric(row: any, index: number): number {
  return parseFloat(row?.metricValues?.[index]?.value || "0");
}
function getDim(row: any, index: number): string {
  return row?.dimensionValues?.[index]?.value || "";
}
function fmtNum(n: number): string {
  return n.toLocaleString("zh-TW");
}
function pct(num: number, denom: number): string {
  if (denom === 0) return "—";
  return ((num / denom) * 100).toFixed(2) + "%";
}

/** 從 campaign 名稱解析神明 */
function parseDeity(campaign: string): string {
  const c = campaign.toLowerCase();
  if (c.includes("地藏王") || c.includes("地藏")) return "地藏王菩薩";
  if (c.includes("五路財神") || c.includes("財神") || c.includes("財運") || c.includes("求財") || c.includes("轉運正財") || c.includes("添財")) return "五路財神";
  if (c.includes("福德正神") || c.includes("土地公")) return "福德正神（土地公）";
  if (c.includes("天上聖母") || c.includes("媽祖")) return "天上聖母（媽祖）";
  if (c.includes("菩薩") || c.includes("聞聲救苦") || c.includes("累積福報") || c.includes("新年祈福")) return "觀世音菩薩";
  if (c.includes("事業穩定") || c.includes("運勢") || c.includes("運氣好")) return "觀世音菩薩"; // 通用文案多掛菩薩
  if (c.includes("一份香")) return "通用（品牌）";
  return "其他";
}

/** 從 campaign 名稱解析期數 */
function parsePeriod(campaign: string): string {
  const match = campaign.match(/_s(\d+)_/);
  if (match) return `第${match[1]}期`;
  // 沒有 s 前綴的是早期 campaign
  return "早期";
}

async function main() {
  const startDate = "2025-04-01";
  const endDate = "today";

  console.log("🔍 各神明 FB 廣告成效分析");
  console.log(`📅 期間：${startDate} ~ ${endDate}\n`);

  // 拉所有 FB campaign 數據
  const fbCampaigns = await runReport({
    dimensions: ["sessionCampaignName"],
    metrics: [
      "sessions",
      "activeUsers",
      "addToCarts",
      "checkouts",
      "ecommercePurchases",
      "totalRevenue",
      "engagementRate",
      "averageSessionDuration",
    ],
    startDate,
    endDate,
    dimensionFilter: {
      filter: {
        fieldName: "sessionSource",
        stringFilter: { matchType: "EXACT", value: "facebook" },
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 100,
  });

  if (!fbCampaigns?.rows) {
    console.log("❌ 沒有找到 FB 廣告數據");
    return;
  }

  // ========= 1. 按神明聚合 =========
  type DeityStats = {
    sessions: number;
    users: number;
    addToCarts: number;
    checkouts: number;
    purchases: number;
    revenue: number;
    campaigns: number;
    engRateSum: number;
    durationSum: number;
  };

  const deityMap: Record<string, DeityStats> = {};
  const campaignDetails: Array<{
    campaign: string;
    deity: string;
    period: string;
    sessions: number;
    users: number;
    addToCarts: number;
    purchases: number;
    revenue: number;
    convRate: number;
    engRate: number;
  }> = [];

  for (const r of fbCampaigns.rows) {
    const campaign = getDim(r, 0);
    if (!campaign.startsWith("fb_me1314888")) continue; // 只看 FB 導購

    const deity = parseDeity(campaign);
    const period = parsePeriod(campaign);
    const sessions = getMetric(r, 0);
    const users = getMetric(r, 1);
    const addToCarts = getMetric(r, 2);
    const checkouts = getMetric(r, 3);
    const purchases = getMetric(r, 4);
    const revenue = getMetric(r, 5);
    const engRate = getMetric(r, 6);
    const duration = getMetric(r, 7);

    if (!deityMap[deity]) {
      deityMap[deity] = { sessions: 0, users: 0, addToCarts: 0, checkouts: 0, purchases: 0, revenue: 0, campaigns: 0, engRateSum: 0, durationSum: 0 };
    }
    const d = deityMap[deity];
    d.sessions += sessions;
    d.users += users;
    d.addToCarts += addToCarts;
    d.checkouts += checkouts;
    d.purchases += purchases;
    d.revenue += revenue;
    d.campaigns += 1;
    d.engRateSum += engRate * sessions;
    d.durationSum += duration * sessions;

    campaignDetails.push({
      campaign, deity, period, sessions, users, addToCarts, purchases, revenue,
      convRate: sessions > 0 ? purchases / sessions : 0,
      engRate,
    });
  }

  // ========= 輸出：各神明總覽 =========
  console.log("=".repeat(100));
  console.log("📊 一、各神明 FB 廣告成效總覽");
  console.log("=".repeat(100));

  const deities = Object.entries(deityMap).sort((a, b) => b[1].revenue - a[1].revenue);
  const totalSessions = deities.reduce((s, [, d]) => s + d.sessions, 0);
  const totalRevenue = deities.reduce((s, [, d]) => s + d.revenue, 0);
  const totalPurchases = deities.reduce((s, [, d]) => s + d.purchases, 0);
  const totalAddToCarts = deities.reduce((s, [, d]) => s + d.addToCarts, 0);

  console.log(
    "\n" + "神明".padEnd(22) +
    "Campaigns".padStart(10) +
    "Sessions".padStart(10) +
    "加購".padStart(8) +
    "購買".padStart(8) +
    "營收".padStart(12) +
    "轉換率".padStart(8) +
    "加購率".padStart(8) +
    "加購→購買".padStart(10) +
    "營收佔比".padStart(10)
  );
  console.log("-".repeat(106));

  for (const [deity, d] of deities) {
    const convRate = d.sessions > 0 ? (d.purchases / d.sessions * 100).toFixed(2) + "%" : "—";
    const cartRate = d.sessions > 0 ? (d.addToCarts / d.sessions * 100).toFixed(1) + "%" : "—";
    const cartToPurchase = d.addToCarts > 0 ? (d.purchases / d.addToCarts * 100).toFixed(1) + "%" : "—";
    const revShare = totalRevenue > 0 ? (d.revenue / totalRevenue * 100).toFixed(1) + "%" : "—";

    console.log(
      deity.padEnd(22) +
      fmtNum(d.campaigns).padStart(10) +
      fmtNum(d.sessions).padStart(10) +
      fmtNum(d.addToCarts).padStart(8) +
      fmtNum(d.purchases).padStart(8) +
      ("$" + fmtNum(Math.round(d.revenue))).padStart(12) +
      convRate.padStart(8) +
      cartRate.padStart(8) +
      cartToPurchase.padStart(10) +
      revShare.padStart(10)
    );
  }

  console.log("-".repeat(106));
  console.log(
    "合計".padEnd(22) +
    fmtNum(campaignDetails.length).padStart(10) +
    fmtNum(totalSessions).padStart(10) +
    fmtNum(totalAddToCarts).padStart(8) +
    fmtNum(totalPurchases).padStart(8) +
    ("$" + fmtNum(Math.round(totalRevenue))).padStart(12) +
    pct(totalPurchases, totalSessions).padStart(8) +
    pct(totalAddToCarts, totalSessions).padStart(8) +
    pct(totalPurchases, totalAddToCarts).padStart(10) +
    "100%".padStart(10)
  );

  // ========= 輸出：各 Campaign 明細 =========
  console.log("\n" + "=".repeat(120));
  console.log("📊 二、各 Campaign 明細（按神明分組，營收排序）");
  console.log("=".repeat(120));

  // 按神明分組
  const groupedByDeity: Record<string, typeof campaignDetails> = {};
  for (const c of campaignDetails) {
    if (!groupedByDeity[c.deity]) groupedByDeity[c.deity] = [];
    groupedByDeity[c.deity].push(c);
  }

  for (const [deity, campaigns] of Object.entries(groupedByDeity).sort((a, b) => {
    const revA = a[1].reduce((s, c) => s + c.revenue, 0);
    const revB = b[1].reduce((s, c) => s + c.revenue, 0);
    return revB - revA;
  })) {
    const deityTotal = deityMap[deity];
    console.log(`\n🙏 【${deity}】— ${campaigns.length} 個 Campaign | ${fmtNum(deityTotal.sessions)} sessions | ${fmtNum(deityTotal.purchases)} 購買 | $${fmtNum(Math.round(deityTotal.revenue))}`);
    console.log(
      "  " + "Campaign".padEnd(55) +
      "期數".padEnd(8) +
      "Sessions".padStart(10) +
      "加購".padStart(6) +
      "購買".padStart(6) +
      "營收".padStart(10) +
      "轉換率".padStart(8) +
      "互動率".padStart(8)
    );
    console.log("  " + "-".repeat(111));

    campaigns.sort((a, b) => b.revenue - a.revenue);
    for (const c of campaigns) {
      const shortName = c.campaign.replace("fb_me1314888_shop_", "").substring(0, 48);
      console.log(
        "  " + shortName.padEnd(55) +
        c.period.padEnd(8) +
        fmtNum(c.sessions).padStart(10) +
        fmtNum(c.addToCarts).padStart(6) +
        fmtNum(c.purchases).padStart(6) +
        ("$" + fmtNum(Math.round(c.revenue))).padStart(10) +
        (c.convRate * 100).toFixed(2).padStart(7) + "%" +
        (c.engRate * 100).toFixed(1).padStart(7) + "%"
      );
    }
  }

  // ========= 輸出：期數演進分析 =========
  console.log("\n" + "=".repeat(100));
  console.log("📊 三、期數演進分析（看廣告效果是否在進步）");
  console.log("=".repeat(100));

  const periodMap: Record<string, { sessions: number; purchases: number; revenue: number; addToCarts: number; campaigns: number }> = {};
  for (const c of campaignDetails) {
    if (!periodMap[c.period]) periodMap[c.period] = { sessions: 0, purchases: 0, revenue: 0, addToCarts: 0, campaigns: 0 };
    const p = periodMap[c.period];
    p.sessions += c.sessions;
    p.purchases += c.purchases;
    p.revenue += c.revenue;
    p.addToCarts += c.addToCarts;
    p.campaigns += 1;
  }

  const periods = Object.entries(periodMap).sort((a, b) => {
    const numA = a[0] === "早期" ? 0 : parseInt(a[0].replace("第", "").replace("期", ""));
    const numB = b[0] === "早期" ? 0 : parseInt(b[0].replace("第", "").replace("期", ""));
    return numA - numB;
  });

  console.log(
    "\n" + "期數".padEnd(10) +
    "Campaigns".padStart(10) +
    "Sessions".padStart(10) +
    "加購".padStart(8) +
    "購買".padStart(8) +
    "營收".padStart(12) +
    "轉換率".padStart(8) +
    "每次購買成本(CPO)".padStart(18)
  );
  console.log("-".repeat(84));

  for (const [period, p] of periods) {
    const convRate = p.sessions > 0 ? (p.purchases / p.sessions * 100).toFixed(2) + "%" : "—";
    // CPO 估算：假設平均每 campaign 花 $3,000-5,000
    console.log(
      period.padEnd(10) +
      fmtNum(p.campaigns).padStart(10) +
      fmtNum(p.sessions).padStart(10) +
      fmtNum(p.addToCarts).padStart(8) +
      fmtNum(p.purchases).padStart(8) +
      ("$" + fmtNum(Math.round(p.revenue))).padStart(12) +
      convRate.padStart(8) +
      (p.purchases > 0 ? "$" + fmtNum(Math.round(p.revenue / p.purchases)) : "—").padStart(18)
    );
  }

  // ========= 輸出：關鍵洞察 =========
  console.log("\n" + "=".repeat(100));
  console.log("📊 四、關鍵洞察");
  console.log("=".repeat(100));

  // 最佳轉換率的神明
  const bestConv = deities.filter(([, d]) => d.purchases > 0)
    .sort((a, b) => (b[1].purchases / b[1].sessions) - (a[1].purchases / a[1].sessions));

  console.log("\n🏆 轉換率排名（購買/sessions）：");
  for (const [deity, d] of bestConv) {
    const rate = (d.purchases / d.sessions * 100).toFixed(2);
    const avgRevPerPurchase = d.purchases > 0 ? Math.round(d.revenue / d.purchases) : 0;
    console.log(`   ${deity}: ${rate}% (${fmtNum(d.purchases)} 購買 / ${fmtNum(d.sessions)} sessions) — 平均客單 $${fmtNum(avgRevPerPurchase)}`);
  }

  // 最佳加購率
  console.log("\n🛒 加購率排名（加購/sessions）：");
  const bestCart = deities.filter(([, d]) => d.addToCarts > 0)
    .sort((a, b) => (b[1].addToCarts / b[1].sessions) - (a[1].addToCarts / a[1].sessions));
  for (const [deity, d] of bestCart) {
    const rate = (d.addToCarts / d.sessions * 100).toFixed(1);
    console.log(`   ${deity}: ${rate}% (${fmtNum(d.addToCarts)} 加購 / ${fmtNum(d.sessions)} sessions)`);
  }

  // 購物車放棄率
  console.log("\n🛒→💸 購物車→購買轉換率（越高越好）：");
  const bestCartConv = deities.filter(([, d]) => d.addToCarts > 0)
    .sort((a, b) => (b[1].purchases / b[1].addToCarts) - (a[1].purchases / a[1].addToCarts));
  for (const [deity, d] of bestCartConv) {
    const rate = (d.purchases / d.addToCarts * 100).toFixed(1);
    const abandonRate = ((d.addToCarts - d.purchases) / d.addToCarts * 100).toFixed(1);
    console.log(`   ${deity}: ${rate}% 完成購買 | ${abandonRate}% 放棄購物車 (${fmtNum(d.addToCarts - d.purchases)} 人放棄)`);
  }

  // 零轉換但有流量的
  const zeroPurchase = deities.filter(([, d]) => d.purchases === 0 && d.sessions > 100);
  if (zeroPurchase.length > 0) {
    console.log("\n⚠️ 有流量但零購買的：");
    for (const [deity, d] of zeroPurchase) {
      console.log(`   ${deity}: ${fmtNum(d.sessions)} sessions / ${fmtNum(d.addToCarts)} 加購 — 完全沒有購買`);
    }
  }

  console.log("\n✅ 各神明 FB 廣告成效分析完成！");
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
