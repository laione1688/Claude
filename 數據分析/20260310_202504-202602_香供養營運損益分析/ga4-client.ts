/**
 * GA4 Data API 客戶端
 * 用於從 Google Analytics 4 抓取數據做分析
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GA4_CONFIG } from "./ga4-config";

// 初始化客戶端
const client = new BetaAnalyticsDataClient({
  keyFilename: GA4_CONFIG.serviceAccountKeyPath,
});

const propertyId = GA4_CONFIG.propertyId;

// ==================== 核心查詢函數 ====================

/**
 * 通用查詢函數
 */
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

// ==================== 年度成效報表 ====================

/** 1. 月度趨勢（營收、流量、轉換） */
export async function getMonthlyTrend(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["yearMonth"],
    metrics: [
      "activeUsers",
      "sessions",
      "engagedSessions",
      "ecommercePurchases",
      "totalRevenue",
      "averagePurchaseRevenue",
      "sessionConversionRate",
    ],
    startDate,
    endDate,
    orderBys: [{ dimension: { dimensionName: "yearMonth", orderType: "ALPHANUMERIC" } }],
  });
}

/** 2. 流量來源分析 */
export async function getTrafficSources(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["sessionDefaultChannelGroup"],
    metrics: [
      "sessions",
      "activeUsers",
      "engagedSessions",
      "engagementRate",
      "ecommercePurchases",
      "totalRevenue",
      "sessionConversionRate",
    ],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });
}

/** 3. 熱門頁面 TOP 20 */
export async function getTopPages(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["pageTitle", "pagePath"],
    metrics: ["screenPageViews", "activeUsers", "averageSessionDuration", "engagementRate"],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 20,
  });
}

/** 4. 商品銷售排行 */
export async function getTopProducts(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["itemName"],
    metrics: ["itemsViewed", "itemsAddedToCart", "itemsPurchased", "itemRevenue"],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
    limit: 20,
  });
}

/** 5. 用戶輪廓（年齡 × 性別） */
export async function getUserDemographics(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["userAgeBracket", "userGender"],
    metrics: ["activeUsers", "totalRevenue", "ecommercePurchases"],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
  });
}

/** 6. 裝置分佈 */
export async function getDeviceBreakdown(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["deviceCategory"],
    metrics: ["activeUsers", "sessions", "totalRevenue", "sessionConversionRate"],
    startDate,
    endDate,
  });
}

/** 7. 地區分佈 */
export async function getGeoBreakdown(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["city"],
    metrics: ["activeUsers", "sessions", "totalRevenue", "ecommercePurchases"],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit: 20,
  });
}

/** 8. 新客 vs 回訪 */
export async function getNewVsReturning(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["newVsReturning"],
    metrics: ["activeUsers", "sessions", "totalRevenue", "ecommercePurchases", "sessionConversionRate"],
    startDate,
    endDate,
  });
}

// ==================== 格式化輸出 ====================

function formatReport(title: string, response: any): string {
  const lines: string[] = [`\n${"=".repeat(60)}`, `📊 ${title}`, `${"=".repeat(60)}`];

  if (!response.rows?.length) {
    lines.push("（無數據）");
    return lines.join("\n");
  }

  // 表頭
  const dimHeaders = response.dimensionHeaders?.map((h: any) => h.name) || [];
  const metricHeaders = response.metricHeaders?.map((h: any) => h.name) || [];
  const allHeaders = [...dimHeaders, ...metricHeaders];
  lines.push(allHeaders.join("\t"));
  lines.push("-".repeat(allHeaders.join("\t").length));

  // 數據行
  for (const row of response.rows) {
    const dims = row.dimensionValues?.map((v: any) => v.value) || [];
    const metrics = row.metricValues?.map((v: any) => {
      const num = parseFloat(v.value);
      if (isNaN(num)) return v.value;
      if (num > 1000) return num.toLocaleString("zh-TW");
      if (num < 1 && num > 0) return (num * 100).toFixed(1) + "%";
      return num.toFixed(num % 1 === 0 ? 0 : 2);
    }) || [];
    lines.push([...dims, ...metrics].join("\t"));
  }

  // 合計
  if (response.totals?.length) {
    const totals = response.totals[0].metricValues?.map((v: any) => v.value) || [];
    lines.push("-".repeat(40));
    lines.push(`合計\t${totals.join("\t")}`);
  }

  return lines.join("\n");
}

// ==================== 完整年度報告 ====================

export async function runAnnualReport(startDate: string, endDate: string) {
  console.log(`\n🔍 正在從 GA4 抓取數據...`);
  console.log(`📅 期間：${startDate} ~ ${endDate}\n`);

  const reports = await Promise.all([
    getMonthlyTrend(startDate, endDate).then((r) => formatReport("月度趨勢", r)),
    getTrafficSources(startDate, endDate).then((r) => formatReport("流量來源分析", r)),
    getTopPages(startDate, endDate).then((r) => formatReport("熱門頁面 TOP 20", r)),
    getTopProducts(startDate, endDate).then((r) => formatReport("商品銷售排行", r)),
    getUserDemographics(startDate, endDate).then((r) => formatReport("用戶輪廓（年齡×性別）", r)),
    getDeviceBreakdown(startDate, endDate).then((r) => formatReport("裝置分佈", r)),
    getGeoBreakdown(startDate, endDate).then((r) => formatReport("地區分佈 TOP 20", r)),
    getNewVsReturning(startDate, endDate).then((r) => formatReport("新客 vs 回訪", r)),
  ]);

  const fullReport = reports.join("\n\n");
  console.log(fullReport);
  return fullReport;
}

// ==================== CLI 入口 ====================

const args = process.argv.slice(2);
const startDate = args[0] || "2025-03-01";
const endDate = args[1] || "2026-02-28";

runAnnualReport(startDate, endDate).catch((err) => {
  console.error("❌ 錯誤:", err.message);
  if (err.message.includes("PERMISSION_DENIED")) {
    console.error("→ Service Account 可能還沒有 GA4 存取權限");
  }
  if (err.message.includes("NOT_FOUND")) {
    console.error("→ Property ID 可能不正確，或 API 未啟用");
  }
  process.exit(1);
});
