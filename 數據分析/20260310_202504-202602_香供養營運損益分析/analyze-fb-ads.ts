/**
 * FB Ads 廣告成效分析
 * 找出哪些廣告組在燒錢、哪些在拉新客
 *
 * 用法：
 *   bun analyze-fb-ads.ts                    # 測試連線
 *   bun analyze-fb-ads.ts 2025-05-01 2026-02-28  # 完整分析
 */

import { FB_ADS_CONFIG } from "./fb-ads-config";
import {
  testConnection,
  getAccountMonthlyTrend,
  getCampaignPerformance,
  getCampaignsByType,
  getAdSetPerformance,
  getAdPerformance,
  getDemographicBreakdown,
  getPlacementBreakdown,
  getDeviceBreakdown,
  getBoostedPostEngagement,
  getDirectAdConversions,
  extractAction,
  extractCPA,
  formatInsightsTable,
  isBoostedPost,
  getAdTypeLabel,
  getObjectiveLabel,
} from "./fb-ads-client";

// ==================== 分析報表 ====================

async function runFullAnalysis(startDate: string, endDate: string) {
  console.log(`\n🔍 正在從 FB Ads API 抓取廣告數據...`);
  console.log(`📅 期間：${startDate} ~ ${endDate}`);
  console.log(`📊 帳戶：${FB_ADS_CONFIG.adAccountId}\n`);

  const output: string[] = [];

  // ────────────────────────────────────────
  // 1. 月度趨勢
  // ────────────────────────────────────────
  console.log("⏳ 1/7 拉取月度趨勢...");
  const monthly = await getAccountMonthlyTrend(startDate, endDate);

  output.push("\n" + "═".repeat(70));
  output.push("📊 一、月度廣告趨勢");
  output.push("═".repeat(70));
  output.push(
    "月份\t曝光\t觸及\t點擊\t花費\tCPC\tCPM\tCTR\t購買數\tCPA\tROAS"
  );
  output.push("-".repeat(70));

  let totalSpend = 0;
  let totalPurchases = 0;

  for (const row of monthly) {
    const purchases = extractAction(row.actions, "purchase");
    const cpa = extractCPA(row.cost_per_action_type, "purchase");
    const spend = parseFloat(row.spend || "0");
    totalSpend += spend;
    totalPurchases += purchases;

    const roas = row.purchase_roas?.[0]?.value
      ? parseFloat(row.purchase_roas[0].value).toFixed(2)
      : "—";

    output.push(
      [
        row.date_start?.substring(0, 7) || "—",
        parseInt(row.impressions || "0").toLocaleString(),
        parseInt(row.reach || "0").toLocaleString(),
        parseInt(row.clicks || "0").toLocaleString(),
        "$" + spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
        "$" + parseFloat(row.cpc || "0").toFixed(1),
        "$" + parseFloat(row.cpm || "0").toFixed(0),
        parseFloat(row.ctr || "0").toFixed(2) + "%",
        purchases || "—",
        cpa ? "$" + cpa.toFixed(0) : "—",
        roas,
      ].join("\t")
    );
  }

  output.push("-".repeat(70));
  output.push(
    `合計\t\t\t\t$${totalSpend.toLocaleString()}\t\t\t\t${totalPurchases}\t$${totalPurchases > 0 ? (totalSpend / totalPurchases).toFixed(0) : "—"}`
  );

  // ────────────────────────────────────────
  // 2. 🆕 直投廣告 vs 貼文推廣 — 總覽比較
  // ────────────────────────────────────────
  console.log("⏳ 2/10 拉取 Campaign 成效（含類型分類）...");
  const { all: campaigns, direct, boosted } = await getCampaignsByType(startDate, endDate);

  // 計算兩類加總
  function sumType(rows: typeof campaigns) {
    let spend = 0, clicks = 0, impressions = 0, purchases = 0;
    let likes = 0, comments = 0, shares = 0;
    for (const r of rows) {
      spend += parseFloat(r.spend || "0");
      clicks += parseInt(r.clicks || "0");
      impressions += parseInt(r.impressions || "0");
      purchases += extractAction(r.actions, "purchase");
      likes += extractAction(r.actions, "like") + extractAction(r.actions, "post_reaction");
      comments += extractAction(r.actions, "comment");
      shares += extractAction(r.actions, "post");
    }
    return { spend, clicks, impressions, purchases, likes, comments, shares };
  }

  const directSum = sumType(direct);
  const boostedSum = sumType(boosted);
  const allSum = sumType(campaigns);

  output.push("\n" + "═".repeat(70));
  output.push("📊 二、🎯 直投廣告 vs 📢 貼文推廣 — 總覽比較");
  output.push("═".repeat(70));
  output.push("類型\tCampaign 數\t花費\t花費佔比\t點擊\tCPC\t購買\tCPA\tROAS");
  output.push("-".repeat(70));

  const directCPC = directSum.clicks > 0 ? directSum.spend / directSum.clicks : 0;
  const directCPA = directSum.purchases > 0 ? directSum.spend / directSum.purchases : 0;
  const boostedCPC = boostedSum.clicks > 0 ? boostedSum.spend / boostedSum.clicks : 0;
  const boostedCPA = boostedSum.purchases > 0 ? boostedSum.spend / boostedSum.purchases : 0;

  // 計算 ROAS（從各 campaign 的 purchase_roas 加權平均）
  function weightedROAS(rows: typeof campaigns): number {
    let totalSpendWithROAS = 0;
    let weightedSum = 0;
    for (const r of rows) {
      const spend = parseFloat(r.spend || "0");
      const roas = r.purchase_roas?.[0]?.value ? parseFloat(r.purchase_roas[0].value) : 0;
      if (roas > 0) {
        weightedSum += spend * roas;
        totalSpendWithROAS += spend;
      }
    }
    return totalSpendWithROAS > 0 ? weightedSum / totalSpendWithROAS : 0;
  }

  const directROAS = weightedROAS(direct);
  const boostedROAS = weightedROAS(boosted);
  const directPct = allSum.spend > 0 ? (directSum.spend / allSum.spend * 100).toFixed(1) + "%" : "—";
  const boostedPct = allSum.spend > 0 ? (boostedSum.spend / allSum.spend * 100).toFixed(1) + "%" : "—";

  output.push([
    "🎯 直投廣告",
    direct.length,
    "$" + directSum.spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
    directPct,
    directSum.clicks.toLocaleString(),
    "$" + directCPC.toFixed(1),
    directSum.purchases,
    directCPA > 0 ? "$" + directCPA.toFixed(0) : "—",
    directROAS.toFixed(2),
  ].join("\t"));

  output.push([
    "📢 貼文推廣",
    boosted.length,
    "$" + boostedSum.spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
    boostedPct,
    boostedSum.clicks.toLocaleString(),
    "$" + boostedCPC.toFixed(1),
    boostedSum.purchases,
    boostedCPA > 0 ? "$" + boostedCPA.toFixed(0) : "—",
    boostedROAS.toFixed(2),
  ].join("\t"));

  output.push("-".repeat(70));
  output.push([
    "合計",
    campaigns.length,
    "$" + allSum.spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
    "100%",
    allSum.clicks.toLocaleString(),
    "$" + (allSum.clicks > 0 ? (allSum.spend / allSum.clicks).toFixed(1) : "—"),
    allSum.purchases,
    allSum.purchases > 0 ? "$" + (allSum.spend / allSum.purchases).toFixed(0) : "—",
    weightedROAS(campaigns).toFixed(2),
  ].join("\t"));

  // ────────────────────────────────────────
  // 3. 🎯 直投廣告明細
  // ────────────────────────────────────────
  output.push("\n" + "═".repeat(70));
  output.push("📊 三、🎯 直投廣告 — 各 Campaign 成效排行");
  output.push("═".repeat(70));
  output.push("Campaign\t目標\t花費\t點擊\tCPC\t購買\tCPA\tROAS\t判定");
  output.push("-".repeat(70));

  direct.sort((a, b) => parseFloat(b.spend || "0") - parseFloat(a.spend || "0"));

  for (const row of direct) {
    const spend = parseFloat(row.spend || "0");
    const purchases = extractAction(row.actions, "purchase");
    const cpa = purchases > 0 ? spend / purchases : 0;
    const roas = row.purchase_roas?.[0]?.value ? parseFloat(row.purchase_roas[0].value) : 0;

    let verdict = "🟡 待評估";
    if (roas >= 3) verdict = "🟢 有效";
    else if (roas >= 1) verdict = "🟡 勉強";
    else if (spend > 5000 && purchases === 0) verdict = "🔴 燒錢";
    else if (roas > 0 && roas < 1) verdict = "🔴 虧損";

    output.push([
      (row.campaign_name || "—").substring(0, 20),
      getObjectiveLabel(row.objective),
      "$" + spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
      parseInt(row.clicks || "0").toLocaleString(),
      "$" + parseFloat(row.cpc || "0").toFixed(1),
      purchases || "0",
      cpa ? "$" + cpa.toFixed(0) : "—",
      roas.toFixed(2),
      verdict,
    ].join("\t"));
  }

  // ────────────────────────────────────────
  // 4. 📢 貼文推廣明細（重點看互動指標）
  // ────────────────────────────────────────
  output.push("\n" + "═".repeat(70));
  output.push("📊 四、📢 貼文推廣 — 各 Campaign 互動成效");
  output.push("═".repeat(70));
  output.push("Campaign\t目標\t花費\t觸及\t點擊\t按讚\t留言\t分享\t互動成本\t購買");
  output.push("-".repeat(70));

  boosted.sort((a, b) => parseFloat(b.spend || "0") - parseFloat(a.spend || "0"));

  for (const row of boosted) {
    const spend = parseFloat(row.spend || "0");
    const reach = parseInt(row.reach || "0");
    const likes = extractAction(row.actions, "like") + extractAction(row.actions, "post_reaction");
    const comments = extractAction(row.actions, "comment");
    const shares = extractAction(row.actions, "post");
    const purchases = extractAction(row.actions, "purchase");
    const totalEngagement = likes + comments + shares;
    const costPerEngagement = totalEngagement > 0 ? spend / totalEngagement : 0;

    output.push([
      (row.campaign_name || "—").substring(0, 20),
      getObjectiveLabel(row.objective),
      "$" + spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
      reach.toLocaleString(),
      parseInt(row.clicks || "0").toLocaleString(),
      likes || "—",
      comments || "—",
      shares || "—",
      costPerEngagement > 0 ? "$" + costPerEngagement.toFixed(1) : "—",
      purchases || "—",
    ].join("\t"));
  }

  if (boosted.length === 0) {
    output.push("（無貼文推廣數據 — 可能全部都是直投廣告，或需要確認 objective 欄位）");
  }

  // ────────────────────────────────────────
  // 5. Ad Set 成效（找出具體哪些受眾在燒錢）
  // ────────────────────────────────────────
  console.log("⏳ 5/10 拉取 Ad Set 成效...");
  const adsets = await getAdSetPerformance(startDate, endDate);

  output.push("\n" + "═".repeat(70));
  output.push("📊 五、各 Ad Set 成效（🔴 = 高花費低轉換）");
  output.push("═".repeat(70));
  output.push("Ad Set\tCampaign\t花費\t點擊\t購買\tCPA\tROAS\t判定");
  output.push("-".repeat(70));

  adsets.sort(
    (a, b) => parseFloat(b.spend || "0") - parseFloat(a.spend || "0")
  );

  for (const row of adsets.slice(0, 30)) {
    const spend = parseFloat(row.spend || "0");
    const purchases = extractAction(row.actions, "purchase");
    const cpa = purchases > 0 ? spend / purchases : 0;
    const roas = row.purchase_roas?.[0]?.value
      ? parseFloat(row.purchase_roas[0].value)
      : 0;

    let verdict = "🟡";
    if (roas >= 3) verdict = "🟢 有效";
    else if (roas >= 1) verdict = "🟡 勉強";
    else if (spend > 3000 && purchases === 0) verdict = "🔴 燒錢";
    else if (roas > 0 && roas < 1) verdict = "🔴 虧損";

    output.push(
      [
        (row.adset_name || "—").substring(0, 20),
        (row.campaign_name || "—").substring(0, 15),
        "$" + spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
        parseInt(row.clicks || "0").toLocaleString(),
        purchases || "0",
        cpa ? "$" + cpa.toFixed(0) : "—",
        roas.toFixed(2),
        verdict,
      ].join("\t")
    );
  }

  // ────────────────────────────────────────
  // 4. 各廣告素材成效 TOP 20
  // ────────────────────────────────────────
  console.log("⏳ 6/10 拉取廣告素材成效...");
  const ads = await getAdPerformance(startDate, endDate);

  output.push("\n" + "═".repeat(70));
  output.push("📊 六、各廣告素材成效 TOP 20");
  output.push("═".repeat(70));
  output.push("廣告名稱\t花費\t點擊\tCTR\t購買\tROAS");
  output.push("-".repeat(70));

  ads.sort(
    (a, b) => parseFloat(b.spend || "0") - parseFloat(a.spend || "0")
  );

  for (const row of ads.slice(0, 20)) {
    const spend = parseFloat(row.spend || "0");
    const purchases = extractAction(row.actions, "purchase");
    const roas = row.purchase_roas?.[0]?.value
      ? parseFloat(row.purchase_roas[0].value).toFixed(2)
      : "—";

    output.push(
      [
        (row.ad_name || "—").substring(0, 30),
        "$" + spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
        parseInt(row.clicks || "0").toLocaleString(),
        parseFloat(row.ctr || "0").toFixed(2) + "%",
        purchases || "0",
        roas,
      ].join("\t")
    );
  }

  // ────────────────────────────────────────
  // 5. 受眾年齡 × 性別
  // ────────────────────────────────────────
  console.log("⏳ 7/10 拉取受眾分群...");
  const demographics = await getDemographicBreakdown(startDate, endDate);

  output.push("\n" + "═".repeat(70));
  output.push("📊 七、受眾年齡 × 性別（對比 GA4 Buyer Persona）");
  output.push("═".repeat(70));
  output.push("年齡\t性別\t曝光\t點擊\tCTR\t花費\t購買\tCPA\tROAS");
  output.push("-".repeat(70));

  demographics.sort(
    (a, b) => parseFloat(b.spend || "0") - parseFloat(a.spend || "0")
  );

  for (const row of demographics) {
    const spend = parseFloat(row.spend || "0");
    const purchases = extractAction(row.actions, "purchase");
    const cpa = purchases > 0 ? spend / purchases : 0;
    const roas = row.purchase_roas?.[0]?.value
      ? parseFloat(row.purchase_roas[0].value).toFixed(2)
      : "—";

    output.push(
      [
        row.age || "—",
        row.gender || "—",
        parseInt(row.impressions || "0").toLocaleString(),
        parseInt(row.clicks || "0").toLocaleString(),
        parseFloat(row.ctr || "0").toFixed(2) + "%",
        "$" + spend.toLocaleString("zh-TW", { maximumFractionDigits: 0 }),
        purchases || "0",
        cpa ? "$" + cpa.toFixed(0) : "—",
        roas,
      ].join("\t")
    );
  }

  // ────────────────────────────────────────
  // 6. 版位分群
  // ────────────────────────────────────────
  console.log("⏳ 8/10 拉取版位分群...");
  const placements = await getPlacementBreakdown(startDate, endDate);

  output.push("\n" + "═".repeat(70));
  output.push("📊 八、版位成效（FB vs IG vs Audience Network）");
  output.push("═".repeat(70));
  output.push("平台\t版位\t曝光\t點擊\tCTR\t花費\t購買\tROAS");
  output.push("-".repeat(70));

  placements.sort(
    (a, b) => parseFloat(b.spend || "0") - parseFloat(a.spend || "0")
  );

  for (const row of placements) {
    const purchases = extractAction(row.actions, "purchase");
    const roas = row.purchase_roas?.[0]?.value
      ? parseFloat(row.purchase_roas[0].value).toFixed(2)
      : "—";

    output.push(
      [
        row.publisher_platform || "—",
        row.platform_position || "—",
        parseInt(row.impressions || "0").toLocaleString(),
        parseInt(row.clicks || "0").toLocaleString(),
        parseFloat(row.ctr || "0").toFixed(2) + "%",
        "$" + parseFloat(row.spend || "0").toLocaleString("zh-TW", {
          maximumFractionDigits: 0,
        }),
        purchases || "0",
        roas,
      ].join("\t")
    );
  }

  // ────────────────────────────────────────
  // 7. 裝置分群
  // ────────────────────────────────────────
  console.log("⏳ 9/10 拉取裝置分群...");
  const devices = await getDeviceBreakdown(startDate, endDate);

  output.push("\n" + "═".repeat(70));
  output.push("📊 九、裝置成效");
  output.push("═".repeat(70));
  output.push("裝置\t曝光\t點擊\tCTR\t花費\t購買");
  output.push("-".repeat(70));

  for (const row of devices) {
    const purchases = extractAction(row.actions, "purchase");

    output.push(
      [
        row.device_platform || "—",
        parseInt(row.impressions || "0").toLocaleString(),
        parseInt(row.clicks || "0").toLocaleString(),
        parseFloat(row.ctr || "0").toFixed(2) + "%",
        "$" + parseFloat(row.spend || "0").toLocaleString("zh-TW", {
          maximumFractionDigits: 0,
        }),
        purchases || "0",
      ].join("\t")
    );
  }

  // ────────────────────────────────────────
  // 10. 總結
  // ────────────────────────────────────────
  console.log("⏳ 10/10 生成分析總結...");

  output.push("\n" + "═".repeat(70));
  output.push("📋 分析總結");
  output.push("═".repeat(70));

  const avgCPA = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  output.push(`總花費：$${totalSpend.toLocaleString()}`);
  output.push(`總購買數：${totalPurchases}`);
  output.push(`平均 CPA：$${avgCPA.toFixed(0)}`);

  // 直投 vs 貼文推廣總結
  output.push(`\n── 📊 直投廣告 vs 貼文推廣 比較結論 ──`);
  output.push(`🎯 直投廣告：${direct.length} 個 Campaign，花費 $${directSum.spend.toLocaleString()}（${directPct}），購買 ${directSum.purchases} 筆，ROAS ${directROAS.toFixed(2)}`);
  output.push(`📢 貼文推廣：${boosted.length} 個 Campaign，花費 $${boostedSum.spend.toLocaleString()}（${boostedPct}），購買 ${boostedSum.purchases} 筆，ROAS ${boostedROAS.toFixed(2)}`);

  if (directROAS > boostedROAS && directROAS > 0) {
    output.push(`\n💡 結論：直投廣告的轉換效率（ROAS ${directROAS.toFixed(2)}）優於貼文推廣（ROAS ${boostedROAS.toFixed(2)}）`);
    output.push(`   → 建議將更多預算從貼文推廣移到直投廣告`);
  } else if (boostedROAS > directROAS && boostedROAS > 0) {
    output.push(`\n💡 結論：貼文推廣的轉換效率（ROAS ${boostedROAS.toFixed(2)}）優於直投廣告（ROAS ${directROAS.toFixed(2)}）`);
    output.push(`   → 貼文推廣不只帶互動，還帶購買！考慮加碼`);
  }

  if (boostedSum.spend > 0 && boostedSum.purchases === 0) {
    output.push(`\n⚠️ 貼文推廣花了 $${boostedSum.spend.toLocaleString()} 但零購買 — 只帶來互動不帶營收`);
    output.push(`   → 如果目標是拉新客/帶營收，應該把這筆預算移到直投廣告`);
    output.push(`   → 如果目標是品牌曝光/社群互動，則需評估互動成本是否合理`);
  }

  // 找出燒錢的 Campaign
  const burners = campaigns.filter((c) => {
    const spend = parseFloat(c.spend || "0");
    const purchases = extractAction(c.actions, "purchase");
    const roas = c.purchase_roas?.[0]?.value
      ? parseFloat(c.purchase_roas[0].value)
      : 0;
    return spend > 5000 && (purchases === 0 || roas < 1);
  });

  if (burners.length > 0) {
    output.push(`\n🔴 燒錢 Campaign（建議停止或大幅調整）：`);
    for (const b of burners) {
      const typeLabel = getAdTypeLabel(b.objective);
      output.push(
        `   - ${typeLabel} ${b.campaign_name}: 花了 $${parseFloat(b.spend).toLocaleString()}，購買 ${extractAction(b.actions, "purchase")} 筆`
      );
    }
  }

  // 找出有效的 Campaign
  const winners = campaigns.filter((c) => {
    const roas = c.purchase_roas?.[0]?.value
      ? parseFloat(c.purchase_roas[0].value)
      : 0;
    return roas >= 3;
  });

  if (winners.length > 0) {
    output.push(`\n🟢 高效 Campaign（建議加碼）：`);
    for (const w of winners) {
      const roas = parseFloat(w.purchase_roas[0].value);
      const typeLabel = getAdTypeLabel(w.objective);
      output.push(
        `   - ${typeLabel} ${w.campaign_name}: ROAS ${roas.toFixed(2)}，花 $${parseFloat(w.spend).toLocaleString()} 賺 $${(parseFloat(w.spend) * roas).toLocaleString()}`
      );
    }
  }

  const fullReport = output.join("\n");
  console.log(fullReport);

  // 存檔
  const reportPath = import.meta.dir + "/FB廣告成效分析報告.md";
  await Bun.write(reportPath, `# FB 廣告成效分析報告\n\n> 期間：${startDate} ~ ${endDate}\n> 產出日期：${new Date().toISOString().split("T")[0]}\n\n\`\`\`\n${fullReport}\n\`\`\``);
  console.log(`\n💾 報告已儲存到：${reportPath}`);

  return fullReport;
}

// ==================== CLI 入口 ====================

const args = process.argv.slice(2);

if (args.length === 0) {
  // 無參數 → 測試連線
  console.log("🔌 測試 FB Ads API 連線...\n");
  const ok = await testConnection();
  if (ok) {
    console.log("\n✅ 技術驗證通過！可以用以下指令跑完整分析：");
    console.log("   bun analyze-fb-ads.ts 2025-05-01 2026-02-28");
  } else {
    console.log("\n📋 設定步驟請見：FB-Ads-API-設定指南.md");
  }
} else {
  // 有參數 → 完整分析
  const startDate = args[0] || FB_ADS_CONFIG.defaultStartDate;
  const endDate = args[1] || FB_ADS_CONFIG.defaultEndDate;
  await runFullAnalysis(startDate, endDate).catch((err) => {
    console.error("❌ 錯誤:", err.message);
    process.exit(1);
  });
}
