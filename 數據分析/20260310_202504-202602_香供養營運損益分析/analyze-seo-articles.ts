/**
 * SEO 文章商品橋接分析
 * 找出高流量 SEO 文章，分析哪些文章最適合加入商品推薦
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

// ==================== 查詢函數 ====================

/** 1. 所有頁面的流量數據（TOP 50） */
async function getAllPages(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["pageTitle", "pagePath"],
    metrics: [
      "screenPageViews",
      "activeUsers",
      "averageSessionDuration",
      "engagementRate",
      "bounceRate",
    ],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 50,
  });
}

/** 2. SEO（自然搜尋）流量的頁面 — 用 landingPage 維度 */
async function getSeoLandingPages(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["landingPage"],
    metrics: [
      "sessions",
      "activeUsers",
      "engagementRate",
      "averageSessionDuration",
      "ecommercePurchases",
      "totalRevenue",
      "addToCarts",
      "sessionConversionRate",
    ],
    startDate,
    endDate,
    dimensionFilter: {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: {
          matchType: "EXACT",
          value: "Organic Search",
        },
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
  });
}

/** 3. 所有流量來源的著陸頁（含轉換數據） */
async function getLandingPagesWithConversion(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["landingPage"],
    metrics: [
      "sessions",
      "activeUsers",
      "ecommercePurchases",
      "totalRevenue",
      "addToCarts",
      "checkouts",
      "sessionConversionRate",
    ],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
  });
}

/** 4. SEO 著陸頁 × 頁面標題 交叉查詢 */
async function getSeoPageTitles(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["landingPage", "pageTitle"],
    metrics: ["sessions", "activeUsers"],
    startDate,
    endDate,
    dimensionFilter: {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: {
          matchType: "EXACT",
          value: "Organic Search",
        },
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 100,
  });
}

/** 5. 頁面 × 事件（看哪些頁面觸發了 add_to_cart） */
async function getPageEvents(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["pagePath", "eventName"],
    metrics: ["eventCount", "totalUsers"],
    startDate,
    endDate,
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: ["add_to_cart", "begin_checkout", "purchase", "view_item"],
        },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 200,
  });
}

// ==================== 分析邏輯 ====================

function fmtNum(n: number): string {
  return n.toLocaleString("zh-TW");
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "0.0%";
  return ((num / denom) * 100).toFixed(1) + "%";
}

function getMetric(row: any, index: number): number {
  return parseFloat(row?.metricValues?.[index]?.value || "0");
}

function getDim(row: any, index: number): string {
  return row?.dimensionValues?.[index]?.value || "";
}

/** 判斷是否為內容文章（非商品頁、非首頁、非結帳頁） */
function isContentArticle(path: string, title: string): boolean {
  // 排除商品頁
  if (path.includes("/product/") || path.includes("/products/")) return false;
  if (path.includes("/shop/") || path.includes("/cart/") || path.includes("/checkout/")) return false;
  // 排除首頁
  if (path === "/" || path === "/index.html") return false;
  // 排除帳戶相關
  if (path.includes("/my-account/") || path.includes("/account/")) return false;
  // 排除分類頁
  if (path.includes("/product-category/")) return false;
  // 排除系統頁面
  if (path.includes("/wp-admin/") || path.includes("/wp-login")) return false;
  if (path.includes("(not set)")) return false;
  // 保留 blog、文章、教學頁面
  return true;
}

async function main() {
  const startDate = "2025-04-01";
  const endDate = "2026-02-28";

  console.log("🔍 正在分析 SEO 文章商品橋接機會...");
  console.log(`📅 期間：${startDate} ~ ${endDate}\n`);

  // 並行拉取
  const [allPages, seoLanding, landingConv, seoTitles, pageEvents] = await Promise.all([
    getAllPages(startDate, endDate),
    getSeoLandingPages(startDate, endDate),
    getLandingPagesWithConversion(startDate, endDate),
    getSeoPageTitles(startDate, endDate),
    getPageEvents(startDate, endDate),
  ]);

  // ========= 1. 所有高流量頁面 =========
  console.log("=".repeat(80));
  console.log("📊 一、所有高流量頁面 TOP 50");
  console.log("=".repeat(80));

  if (allPages?.rows) {
    console.log(
      "\n" + "頁面標題".padEnd(50) +
      "URL路徑".padEnd(45) +
      "頁面瀏覽".padStart(10) +
      "用戶".padStart(8) +
      "互動率".padStart(8) +
      "跳出率".padStart(8)
    );
    console.log("-".repeat(130));

    for (const r of allPages.rows) {
      const title = getDim(r, 0);
      const path = getDim(r, 1);
      const views = getMetric(r, 0);
      const users = getMetric(r, 1);
      const engRate = getMetric(r, 3);
      const bounceRate = getMetric(r, 4);

      const shortTitle = title.length > 45 ? title.substring(0, 45) + "…" : title;
      const shortPath = path.length > 40 ? path.substring(0, 40) + "…" : path;
      const isArticle = isContentArticle(path, title);
      const marker = isArticle ? "📝" : "🛍️";

      console.log(
        `${marker} ${shortTitle}`.padEnd(50) +
        shortPath.padEnd(45) +
        fmtNum(views).padStart(10) +
        fmtNum(users).padStart(8) +
        (engRate * 100).toFixed(1).padStart(7) + "%" +
        (bounceRate * 100).toFixed(1).padStart(7) + "%"
      );
    }
  }

  // ========= 2. SEO 著陸頁（自然搜尋流量） =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 二、SEO（自然搜尋）著陸頁 — 含轉換數據");
  console.log("=".repeat(80));

  // 建立 title 映射
  const pathTitleMap: Record<string, string> = {};
  if (seoTitles?.rows) {
    for (const r of seoTitles.rows) {
      const path = getDim(r, 0);
      const title = getDim(r, 1);
      const sessions = getMetric(r, 0);
      // 取同路徑最多 session 的 title
      if (!pathTitleMap[path] || sessions > 0) {
        pathTitleMap[path] = title;
      }
    }
  }

  const seoArticles: Array<{
    path: string;
    title: string;
    sessions: number;
    users: number;
    engRate: number;
    avgDuration: number;
    purchases: number;
    revenue: number;
    addToCarts: number;
    convRate: number;
    isArticle: boolean;
  }> = [];

  if (seoLanding?.rows) {
    console.log(
      "\n" + "頁面標題".padEnd(50) +
      "著陸頁路徑".padEnd(45) +
      "SEO訪次".padStart(10) +
      "加購".padStart(6) +
      "購買".padStart(6) +
      "營收".padStart(10) +
      "轉換率".padStart(8)
    );
    console.log("-".repeat(135));

    for (const r of seoLanding.rows) {
      const path = getDim(r, 0);
      const sessions = getMetric(r, 0);
      const users = getMetric(r, 1);
      const engRate = getMetric(r, 2);
      const avgDuration = getMetric(r, 3);
      const purchases = getMetric(r, 4);
      const revenue = getMetric(r, 5);
      const addToCarts = getMetric(r, 6);
      const convRate = getMetric(r, 7);
      const title = pathTitleMap[path] || "(無標題)";
      const isArticle = isContentArticle(path, title);

      seoArticles.push({
        path, title, sessions, users, engRate, avgDuration,
        purchases, revenue, addToCarts, convRate, isArticle,
      });

      const marker = isArticle ? "📝" : "🛍️";
      const shortTitle = title.length > 45 ? title.substring(0, 45) + "…" : title;
      const shortPath = path.length > 40 ? path.substring(0, 40) + "…" : path;

      console.log(
        `${marker} ${shortTitle}`.padEnd(50) +
        shortPath.padEnd(45) +
        fmtNum(sessions).padStart(10) +
        fmtNum(addToCarts).padStart(6) +
        fmtNum(purchases).padStart(6) +
        ("$" + fmtNum(Math.round(revenue))).padStart(10) +
        (convRate * 100).toFixed(2).padStart(7) + "%"
      );
    }
  }

  // ========= 3. 篩選：高流量 SEO 內容文章（非商品頁） =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 三、🎯 高流量 SEO 內容文章 — 商品橋接候選");
  console.log("    （排除商品頁、首頁、帳戶頁、分類頁）");
  console.log("=".repeat(80));

  const contentArticles = seoArticles.filter(a => a.isArticle && a.sessions >= 30);
  contentArticles.sort((a, b) => b.sessions - a.sessions);

  console.log(
    "\n" + "#".padStart(3) +
    "  頁面標題".padEnd(55) +
    "著陸頁路徑".padEnd(50) +
    "SEO訪次".padStart(10) +
    "加購".padStart(6) +
    "購買".padStart(6) +
    "互動率".padStart(8) +
    "橋接潛力".padStart(10)
  );
  console.log("-".repeat(148));

  let rank = 0;
  for (const a of contentArticles) {
    rank++;
    const shortTitle = a.title.length > 50 ? a.title.substring(0, 50) + "…" : a.title;
    const shortPath = a.path.length > 45 ? a.path.substring(0, 45) + "…" : a.path;

    // 橋接潛力評分：高流量 + 高互動 + 低轉換 = 最大機會
    let potential = "⭐";
    if (a.sessions >= 500 && a.convRate < 0.005) potential = "⭐⭐⭐"; // 500+ 訪次且幾乎沒轉換
    else if (a.sessions >= 200 && a.convRate < 0.01) potential = "⭐⭐⭐";
    else if (a.sessions >= 100 && a.convRate < 0.01) potential = "⭐⭐";
    else if (a.sessions >= 50) potential = "⭐⭐";

    if (a.engRate > 0.6 && potential.length < 6) potential += "⭐"; // 高互動加分

    console.log(
      `${rank}`.padStart(3) +
      `  ${shortTitle}`.padEnd(55) +
      shortPath.padEnd(50) +
      fmtNum(a.sessions).padStart(10) +
      fmtNum(a.addToCarts).padStart(6) +
      fmtNum(a.purchases).padStart(6) +
      (a.engRate * 100).toFixed(1).padStart(7) + "%" +
      potential.padStart(10)
    );
  }

  // ========= 4. 頁面上的電商事件 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 四、頁面電商事件分佈（哪些頁面觸發了加購/結帳）");
  console.log("=".repeat(80));

  if (pageEvents?.rows) {
    // 聚合：path → { view_item, add_to_cart, begin_checkout, purchase }
    const pageEventMap: Record<string, Record<string, number>> = {};
    for (const r of pageEvents.rows) {
      const path = getDim(r, 0);
      const event = getDim(r, 1);
      const count = getMetric(r, 0);
      if (!pageEventMap[path]) pageEventMap[path] = {};
      pageEventMap[path][event] = (pageEventMap[path][event] || 0) + count;
    }

    // 只顯示有 add_to_cart 的內容文章
    const articlePaths = new Set(contentArticles.map(a => a.path));
    const articleEvents = Object.entries(pageEventMap)
      .filter(([path]) => {
        // 檢查是否有任何內容文章的路徑匹配
        for (const ap of articlePaths) {
          if (path === ap || path.startsWith(ap)) return true;
        }
        return isContentArticle(path, "");
      })
      .sort((a, b) => (b[1]["add_to_cart"] || 0) - (a[1]["add_to_cart"] || 0));

    if (articleEvents.length > 0) {
      console.log(
        "\n" + "頁面路徑".padEnd(50) +
        "view_item".padStart(12) +
        "add_to_cart".padStart(14) +
        "checkout".padStart(12) +
        "purchase".padStart(12)
      );
      console.log("-".repeat(100));

      for (const [path, events] of articleEvents.slice(0, 30)) {
        const shortPath = path.length > 45 ? path.substring(0, 45) + "…" : path;
        console.log(
          shortPath.padEnd(50) +
          fmtNum(events["view_item"] || 0).padStart(12) +
          fmtNum(events["add_to_cart"] || 0).padStart(14) +
          fmtNum(events["begin_checkout"] || 0).padStart(12) +
          fmtNum(events["purchase"] || 0).padStart(12)
        );
      }
    } else {
      console.log("\n（內容文章上未偵測到電商事件 — 確認：文章頁面目前沒有商品推薦區塊）");
    }
  }

  // ========= 5. 總結分析 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 五、商品橋接建議總結");
  console.log("=".repeat(80));

  const totalSeoArticleSessions = contentArticles.reduce((sum, a) => sum + a.sessions, 0);
  const totalSeoPurchases = contentArticles.reduce((sum, a) => sum + a.purchases, 0);
  const totalSeoRevenue = contentArticles.reduce((sum, a) => sum + a.revenue, 0);

  console.log(`\n📈 SEO 內容文章總覽：`);
  console.log(`   共 ${contentArticles.length} 篇內容文章`);
  console.log(`   總 SEO 訪問次數：${fmtNum(totalSeoArticleSessions)}`);
  console.log(`   目前購買次數：${fmtNum(totalSeoPurchases)}（轉換率 ${pct(totalSeoPurchases, totalSeoArticleSessions)}）`);
  console.log(`   目前營收：$${fmtNum(Math.round(totalSeoRevenue))}`);

  // TOP 文章詳細建議
  console.log(`\n🎯 優先橋接 TOP 文章：`);
  const top10 = contentArticles.slice(0, 10);
  for (let i = 0; i < top10.length; i++) {
    const a = top10[i];
    console.log(`\n   ${i + 1}. ${a.title}`);
    console.log(`      路徑：${a.path}`);
    console.log(`      SEO 流量：${fmtNum(a.sessions)} 訪次 / ${fmtNum(a.users)} 用戶`);
    console.log(`      互動率：${(a.engRate * 100).toFixed(1)}% | 目前轉換：${fmtNum(a.purchases)} 筆 / $${fmtNum(Math.round(a.revenue))}`);

    // 根據文章標題/路徑推薦可能的商品橋接
    const suggestions = suggestProducts(a.path, a.title);
    if (suggestions.length > 0) {
      console.log(`      💡 建議橋接商品：${suggestions.join("、")}`);
    }
  }

  // 預估影響
  console.log(`\n💰 預估商品橋接效益：`);
  console.log(`   假設橋接後 SEO 文章轉換率從 ${pct(totalSeoPurchases, totalSeoArticleSessions)} 提升到 0.5%：`);
  const projectedPurchases = Math.round(totalSeoArticleSessions * 0.005);
  const avgOrderValue = 1468; // 從訂單分析得知
  console.log(`   預估新增購買：${fmtNum(projectedPurchases)} 筆`);
  console.log(`   預估新增營收：$${fmtNum(projectedPurchases * avgOrderValue)}（AOV $${fmtNum(avgOrderValue)}）`);

  console.log("\n✅ SEO 文章商品橋接分析完成！");
}

/** 根據文章主題推薦商品 */
function suggestProducts(path: string, title: string): string[] {
  const combined = (path + " " + title).toLowerCase();
  const suggestions: string[] = [];

  // 祖先/公媽相關
  if (combined.includes("祖先") || combined.includes("公媽") || combined.includes("忌日") || combined.includes("掃墓")) {
    suggestions.push("祖先供養香品", "祖先金紙組合");
  }

  // 地基主
  if (combined.includes("地基主")) {
    suggestions.push("地基主供養香品", "地基主金紙");
  }

  // 神明生日/聖誕
  if (combined.includes("神明生日") || combined.includes("聖誕") || combined.includes("神明")) {
    suggestions.push("各廟宇香品（依當月神明聖誕）", "供品組合");
  }

  // 天赦日
  if (combined.includes("天赦日") || combined.includes("天赦")) {
    suggestions.push("天赦日金紙", "補財庫金紙組合");
  }

  // 拜拜/初一十五
  if (combined.includes("拜拜") || combined.includes("初一") || combined.includes("十五") || combined.includes("拜")) {
    suggestions.push("常用供養香品", "入門香品組合");
  }

  // 補財庫/財運
  if (combined.includes("財庫") || combined.includes("財運") || combined.includes("補運")) {
    suggestions.push("補財庫金紙", "財神供養香品");
  }

  // 安太歲/光明燈
  if (combined.includes("太歲") || combined.includes("光明燈") || combined.includes("點燈")) {
    suggestions.push("安太歲服務", "光明燈登記");
  }

  // 月老/感情
  if (combined.includes("月老") || combined.includes("姻緣") || combined.includes("感情")) {
    suggestions.push("月老祈願香品", "姻緣香品");
  }

  // 文昌/考試
  if (combined.includes("文昌") || combined.includes("考試") || combined.includes("功名")) {
    suggestions.push("文昌祈願香品");
  }

  // 普渡/中元
  if (combined.includes("普渡") || combined.includes("中元") || combined.includes("好兄弟")) {
    suggestions.push("普渡供品組合", "中元金紙");
  }

  // 廟宇相關
  if (combined.includes("廟") || combined.includes("寺") || combined.includes("宮")) {
    suggestions.push("對應廟宇專屬香品");
  }

  if (suggestions.length === 0) {
    suggestions.push("熱銷香品推薦");
  }

  return suggestions;
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
