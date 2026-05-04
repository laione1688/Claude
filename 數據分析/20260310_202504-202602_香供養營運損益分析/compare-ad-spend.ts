/**
 * FB 廣告費對帳 — 代理商合約 vs 平台實花
 *
 * 目的：
 *   代理商（垣宣）每月固定收 $63,000 打包費，但 FB 平台實際 spend 是多少？
 *   差額就是代理商的服務費+毛利+稅（或操作優化效果）。
 *
 * 產出：
 *   1. 月度對帳表（合約 vs 實花 vs 差額 %）
 *   2. 各期活動的實際廣告花費（從 campaign 名稱解析）
 *
 * 用法：
 *   bun compare-ad-spend.ts                            # 預設 2025-05-01 ~ 2026-04-22
 *   bun compare-ad-spend.ts 2025-05-01 2026-04-30      # 自訂期間
 */

import {
  getAccountMonthlyTrend,
  getCampaignPerformance,
  extractAction,
} from "./fb-ads-client";

// ==================== 代理商合約收費（每月 $63K） ====================

const AGENCY_MONTHLY_FEE = 63000;
const agencyContractMonths: Record<string, number> = {
  "2025-04": 0,
  "2025-05": AGENCY_MONTHLY_FEE,
  "2025-06": AGENCY_MONTHLY_FEE,
  "2025-07": AGENCY_MONTHLY_FEE,
  "2025-08": AGENCY_MONTHLY_FEE,
  "2025-09": AGENCY_MONTHLY_FEE,
  "2025-10": AGENCY_MONTHLY_FEE,
  "2025-11": AGENCY_MONTHLY_FEE,
  "2025-12": AGENCY_MONTHLY_FEE,
  "2026-01": AGENCY_MONTHLY_FEE,
  "2026-02": 0,
  "2026-03": AGENCY_MONTHLY_FEE, // 第十波
  "2026-04": AGENCY_MONTHLY_FEE, // 第十一波
};

// ==================== 解析期數 ====================

function parsePeriod(name: string): number[] | null {
  const range = name.match(/第\s*(\d+)\s*-\s*(\d+)\s*期/);
  if (range) {
    const s = parseInt(range[1], 10);
    const e = parseInt(range[2], 10);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }
  const single = name.match(/第\s*(\d+)\s*期/);
  return single ? [parseInt(single[1], 10)] : null;
}

function parseDeity(name: string): string {
  if (/地藏/.test(name)) return "地藏王";
  if (/福德正神|土地公/.test(name)) return "福德正神";
  if (/天上聖母|媽祖/.test(name)) return "天上聖母";
  if (/財神|財運|添財/.test(name)) return "五路財神";
  if (/觀音|菩薩/.test(name)) return "觀世音";
  return "其他";
}

// ==================== 主流程 ====================

async function main() {
  const startDate = process.argv[2] || "2025-05-01";
  const endDate = process.argv[3] || "2026-04-22";

  console.log("🔍 FB 廣告費對帳 — 代理商合約 vs 平台實花");
  console.log(`📅 期間：${startDate} ~ ${endDate}\n`);

  // --- 1. 月度 API spend ---
  console.log("⏳ 拉取月度 FB 平台實際花費...");
  const monthlyRows = await getAccountMonthlyTrend(startDate, endDate);
  const apiMonthlySpend: Record<string, number> = {};
  for (const r of monthlyRows) {
    const start = r.date_start as string;
    if (!start) continue;
    const month = start.substring(0, 7);
    apiMonthlySpend[month] = (apiMonthlySpend[month] || 0) + parseFloat(r.spend || "0");
  }

  // --- 2. 月度對帳表 ---
  console.log("\n" + "═".repeat(82));
  console.log("📊 一、月度對帳（代理商合約 vs FB 平台實花）");
  console.log("═".repeat(82));
  console.log(
    "月份      | 代理合約    | FB 實花    | 差額（代理服務費）| 差額%  | 備註"
  );
  console.log("-".repeat(82));

  const allMonths = new Set<string>([
    ...Object.keys(agencyContractMonths),
    ...Object.keys(apiMonthlySpend),
  ]);
  const monthsSorted = [...allMonths].sort();

  let totContract = 0;
  let totApi = 0;
  const fmt = (n: number) =>
    "$" + Math.round(n).toLocaleString("zh-TW").padStart(8);

  for (const m of monthsSorted) {
    const contract = agencyContractMonths[m] || 0;
    const api = apiMonthlySpend[m] || 0;
    const diff = contract - api;
    const diffPct = contract > 0 ? (diff / contract) * 100 : 0;
    totContract += contract;
    totApi += api;

    let note = "";
    if (contract === 0 && api > 0) note = "⚠️ 無合約但有花費";
    else if (contract > 0 && api === 0) note = "⚠️ 有合約但零花費";
    else if (diff < 0) note = "🔴 FB 實花超過合約";
    else if (diffPct > 50) note = "🟡 代理收費佔比過高";

    console.log(
      `${m}   | ${fmt(contract)} | ${fmt(api)} | ${fmt(diff)}       | ${diffPct.toFixed(1).padStart(5)}% | ${note}`
    );
  }

  const totalDiff = totContract - totApi;
  const totalDiffPct = totContract > 0 ? (totalDiff / totContract) * 100 : 0;
  console.log("-".repeat(82));
  console.log(
    `合計      | ${fmt(totContract)} | ${fmt(totApi)} | ${fmt(totalDiff)}       | ${totalDiffPct.toFixed(1).padStart(5)}% |`
  );

  console.log(`\n── 💡 對帳解讀 ──`);
  console.log(`  代理商收費總額：$${Math.round(totContract).toLocaleString()}`);
  console.log(`  FB 平台實際花費：$${Math.round(totApi).toLocaleString()}`);
  console.log(
    `  代理商服務費/毛利：$${Math.round(totalDiff).toLocaleString()}（佔合約 ${totalDiffPct.toFixed(1)}%）`
  );
  if (totalDiff < 0) {
    console.log(`  ⚠️ FB 實花超過代理商合約——可能代理商額外加投或計算有誤，需確認`);
  } else if (totalDiffPct > 40) {
    console.log(`  🔴 代理商抽成偏高（>40%）——業界行情通常 15-25%，可議價`);
  } else if (totalDiffPct > 25) {
    console.log(`  🟡 代理商抽成略高於業界（15-25%），但若服務到位可接受`);
  } else {
    console.log(`  🟢 代理商抽成在合理區間`);
  }

  // --- 3. 各期廣告費 ---
  console.log("\n" + "═".repeat(82));
  console.log("📊 二、各期活動 — FB 平台實際花費");
  console.log("═".repeat(82));

  console.log("⏳ 拉取 campaign 層級花費...");
  const campaigns = await getCampaignPerformance(startDate, endDate);
  const byPeriod = new Map<
    number,
    {
      spend: number;
      purchases: number;
      clicks: number;
      deities: Map<string, number>;
    }
  >();
  let unmatched = 0;
  let unmatchedSpend = 0;

  for (const c of campaigns) {
    const name = c.campaign_name || "";
    const spend = parseFloat(c.spend || "0");
    const purchases = extractAction(c.actions, "purchase");
    const clicks = parseInt(c.clicks || "0", 10);
    const periods = parsePeriod(name);
    if (!periods) {
      unmatched++;
      unmatchedSpend += spend;
      continue;
    }
    const split = periods.length;
    for (const p of periods) {
      if (!byPeriod.has(p)) {
        byPeriod.set(p, { spend: 0, purchases: 0, clicks: 0, deities: new Map() });
      }
      const bucket = byPeriod.get(p)!;
      bucket.spend += spend / split;
      bucket.purchases += purchases / split;
      bucket.clicks += clicks / split;
      const deity = parseDeity(name);
      bucket.deities.set(deity, (bucket.deities.get(deity) || 0) + spend / split);
    }
  }

  console.log("\n期數     | 實花        | 購買 | CPA       | 涵蓋神明");
  console.log("-".repeat(82));
  const sortedPeriods = [...byPeriod.keys()].sort((a, b) => a - b);
  let totPeriodSpend = 0;
  let totPeriodPurch = 0;
  for (const p of sortedPeriods) {
    const row = byPeriod.get(p)!;
    totPeriodSpend += row.spend;
    totPeriodPurch += row.purchases;
    const cpa = row.purchases > 0 ? row.spend / row.purchases : 0;
    const deities = [...row.deities.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([d]) => d)
      .join("、");
    console.log(
      `第 ${String(p).padStart(2)} 期  | ${fmt(row.spend)} | ${row.purchases.toFixed(0).padStart(4)} | ${cpa > 0 ? fmt(cpa) : "     —   "} | ${deities}`
    );
  }
  console.log("-".repeat(82));
  const overallCpa = totPeriodPurch > 0 ? totPeriodSpend / totPeriodPurch : 0;
  console.log(
    `合計     | ${fmt(totPeriodSpend)} | ${totPeriodPurch.toFixed(0).padStart(4)} | ${overallCpa > 0 ? fmt(overallCpa) : "     —   "} |`
  );
  if (unmatchedSpend > 0) {
    console.log(
      `⚠️  未綁期數（品牌廣告等）：$${Math.round(unmatchedSpend).toLocaleString()}（${unmatched} 個 campaign）`
    );
  }

  console.log("\n✅ 對帳完成\n");
}

main().catch((err) => {
  console.error("❌ 執行失敗：", err.message);
  process.exit(1);
});
