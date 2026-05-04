/**
 * FB 廣告 — 按活動期數累加分析
 *
 * 從 campaign 名稱解析「第 N 期」，跨神明聚合每一期的：
 *   - 總花費
 *   - 總購買數
 *   - CPA、ROAS
 *   - 該期包含哪些神明
 *
 * 用法：
 *   bun analyze-fb-by-period.ts                    # 預設 2025-05-01 ~ today
 *   bun analyze-fb-by-period.ts 2026-01-01 today   # 自訂期間
 */

import {
  getCampaignPerformance,
  extractAction,
  extractCPA,
} from "./fb-ads-client";

// ==================== 解析函數 ====================

/** 從 campaign 名稱解析期數
 * "明心福旺閣-導購-菩薩(第10期)" → [10]
 * "明心福旺閣-導購-合併(第1-2期)" → [1, 2]（跨期合併投放，花費平均分攤）
 */
function parsePeriod(campaign: string): number[] | null {
  // 跨期：第 N-M 期
  const range = campaign.match(/第\s*(\d+)\s*-\s*(\d+)\s*期/);
  if (range) {
    const start = parseInt(range[1], 10);
    const end = parseInt(range[2], 10);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }
  // 單期：第 N 期
  const single = campaign.match(/第\s*(\d+)\s*期/);
  return single ? [parseInt(single[1], 10)] : null;
}

/** 從 campaign 名稱解析神明 */
function parseDeity(campaign: string): string {
  const c = campaign;
  if (/地藏王|地藏/.test(c)) return "地藏王菩薩";
  if (/五路財神|財神|財運|求財|添財/.test(c)) return "五路財神";
  if (/福德正神|土地公/.test(c)) return "福德正神";
  if (/天上聖母|媽祖/.test(c)) return "天上聖母";
  if (/觀音|菩薩/.test(c)) return "觀世音菩薩";
  return "其他";
}

/** 從 campaign 名稱解析廣告類型 */
function parseAdType(campaign: string): "導購" | "互動" | "其他" {
  if (/導購/.test(campaign)) return "導購";
  if (/互動/.test(campaign)) return "互動";
  return "其他";
}

// ==================== 聚合邏輯 ====================

interface PeriodBucket {
  period: number;
  spend: number;
  clicks: number;
  impressions: number;
  purchases: number;
  revenue: number; // 從 purchase_roas × spend 反推
  campaigns: Array<{
    name: string;
    deity: string;
    adType: string;
    spend: number;
    purchases: number;
  }>;
  deities: Set<string>;
}

async function main() {
  const startDate = process.argv[2] || "2025-05-01";
  const endDate = process.argv[3] || "today";

  console.log("🔍 FB 廣告 — 按活動期數累加分析");
  console.log(`📅 期間：${startDate} ~ ${endDate}\n`);
  console.log("⏳ 拉取 campaign 層級數據...\n");

  const campaigns = await getCampaignPerformance(startDate, endDate);

  const buckets = new Map<number, PeriodBucket>();
  const unmatched: Array<{ name: string; spend: number }> = [];

  for (const row of campaigns) {
    const name = row.campaign_name || "";
    const spend = parseFloat(row.spend || "0");
    const clicks = parseInt(row.clicks || "0", 10);
    const impressions = parseInt(row.impressions || "0", 10);
    const purchases = extractAction(row.actions, "purchase");
    const roas = parseFloat(row.purchase_roas?.[0]?.value || "0");
    const revenue = spend * roas;

    const periods = parsePeriod(name);
    if (periods === null) {
      unmatched.push({ name, spend });
      continue;
    }

    // 跨期 campaign 按期數平均分攤花費 / 點擊 / 購買
    const split = periods.length;
    const sSpend = spend / split;
    const sClicks = clicks / split;
    const sImpressions = impressions / split;
    const sPurchases = purchases / split;
    const sRevenue = revenue / split;

    for (const period of periods) {
      if (!buckets.has(period)) {
        buckets.set(period, {
          period,
          spend: 0,
          clicks: 0,
          impressions: 0,
          purchases: 0,
          revenue: 0,
          campaigns: [],
          deities: new Set(),
        });
      }

      const b = buckets.get(period)!;
      b.spend += sSpend;
      b.clicks += sClicks;
      b.impressions += sImpressions;
      b.purchases += sPurchases;
      b.revenue += sRevenue;

      const deity = parseDeity(name);
      const adType = parseAdType(name);
      b.deities.add(deity);
      b.campaigns.push({
        name: split > 1 ? `${name}（${split} 期分攤 1/${split}）` : name,
        deity,
        adType,
        spend: sSpend,
        purchases: sPurchases,
      });
    }
  }

  // 排序：期數由小到大
  const sorted = Array.from(buckets.values()).sort(
    (a, b) => a.period - b.period
  );

  // ==================== 輸出 ====================

  const fmt = (n: number) => Math.round(n).toLocaleString("zh-TW");
  const money = (n: number) => "$" + fmt(n);

  console.log("═".repeat(80));
  console.log("📊 一、各期數總覽（跨神明累加）");
  console.log("═".repeat(80));
  console.log(
    "期數\t花費\t\t點擊\t購買\tCPC\tCPA\tROAS\t涵蓋神明"
  );
  console.log("-".repeat(80));

  let totalSpend = 0;
  let totalPurchases = 0;
  let totalRevenue = 0;

  for (const b of sorted) {
    const cpc = b.clicks > 0 ? b.spend / b.clicks : 0;
    const cpa = b.purchases > 0 ? b.spend / b.purchases : 0;
    const roas = b.spend > 0 ? b.revenue / b.spend : 0;

    console.log(
      `第 ${b.period} 期\t${money(b.spend)}\t${fmt(b.clicks)}\t${b.purchases}\t$${cpc.toFixed(1)}\t${cpa > 0 ? "$" + fmt(cpa) : "—"}\t${roas.toFixed(2)}\t${[...b.deities].join("、")}`
    );

    totalSpend += b.spend;
    totalPurchases += b.purchases;
    totalRevenue += b.revenue;
  }

  console.log("-".repeat(80));
  console.log(
    `合計\t${money(totalSpend)}\t\t\t${totalPurchases}\t\t${totalPurchases > 0 ? "$" + fmt(totalSpend / totalPurchases) : "—"}\t${totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "—"}`
  );

  // ==================== 二、各期 × 神明 明細 ====================
  console.log("\n" + "═".repeat(80));
  console.log("📊 二、各期 × 神明 明細");
  console.log("═".repeat(80));

  for (const b of sorted) {
    console.log(`\n🔸 第 ${b.period} 期（總花費 ${money(b.spend)}，共 ${b.purchases} 單）`);
    console.log("-".repeat(80));

    // 同神明、同期內可能有多個 campaign（導購 + 互動），按花費排序
    const byDeity = new Map<string, { spend: number; purchases: number; items: typeof b.campaigns }>();
    for (const c of b.campaigns) {
      const key = `${c.deity}｜${c.adType}`;
      if (!byDeity.has(key)) {
        byDeity.set(key, { spend: 0, purchases: 0, items: [] });
      }
      const agg = byDeity.get(key)!;
      agg.spend += c.spend;
      agg.purchases += c.purchases;
      agg.items.push(c);
    }

    const rows = Array.from(byDeity.entries()).sort(
      (a, b) => b[1].spend - a[1].spend
    );

    for (const [key, v] of rows) {
      const cpa = v.purchases > 0 ? v.spend / v.purchases : 0;
      console.log(
        `  ${key.padEnd(20)}\t${money(v.spend).padStart(10)}\t${v.purchases} 單\t${cpa > 0 ? "CPA " + money(cpa) : ""}`
      );
    }
  }

  // ==================== 三、未匹配期數的 campaign ====================
  if (unmatched.length > 0) {
    console.log("\n" + "═".repeat(80));
    console.log(`⚠️  未能解析期數的 campaign（${unmatched.length} 個，名稱內找不到「第 N 期」）`);
    console.log("═".repeat(80));
    for (const u of unmatched.sort((a, b) => b.spend - a.spend)) {
      console.log(`  ${money(u.spend).padStart(10)}\t${u.name}`);
    }
  }

  console.log("\n✅ 分析完成\n");
}

main().catch((err) => {
  console.error("❌ 執行失敗：", err.message);
  if (err.message.includes("FB_ACCESS_TOKEN")) {
    console.error("\n請先設定環境變數：");
    console.error("  export FB_ACCESS_TOKEN='你的_access_token'");
    console.error("  export FB_AD_ACCOUNT_ID='act_1465859694781097'");
    console.error("或建立 .env 檔案在此資料夾下。");
  }
  process.exit(1);
});
