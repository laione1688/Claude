/**
 * 檢查 GA4 是否收到 FB 廣告的 UTM 參數
 * 查詢維度：source / medium / campaign
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

async function main() {
  console.log("🔍 檢查 GA4 中 FB 廣告流量的 UTM 歸類情況...\n");

  // ========= 1. 所有 source/medium 組合 =========
  console.log("=".repeat(80));
  console.log("📊 一、所有流量來源 × 媒介（source / medium）— 最近 30 天");
  console.log("=".repeat(80));

  const sourceMedium = await runReport({
    dimensions: ["sessionSource", "sessionMedium"],
    metrics: ["sessions", "activeUsers", "ecommercePurchases", "totalRevenue"],
    startDate: "30daysAgo",
    endDate: "today",
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
  });

  if (sourceMedium?.rows) {
    console.log(
      "\n" + "Source".padEnd(30) + "Medium".padEnd(20) +
      "Sessions".padStart(10) + "Users".padStart(8) +
      "Purchases".padStart(10) + "Revenue".padStart(12)
    );
    console.log("-".repeat(90));

    for (const r of sourceMedium.rows) {
      const source = getDim(r, 0);
      const medium = getDim(r, 1);
      const sessions = getMetric(r, 0);
      const users = getMetric(r, 1);
      const purchases = getMetric(r, 2);
      const revenue = getMetric(r, 3);

      // 標記 FB 相關的來源
      const isFB = source.toLowerCase().includes("facebook") ||
                    source.toLowerCase().includes("fb") ||
                    source.toLowerCase().includes("ig") ||
                    source.toLowerCase().includes("instagram") ||
                    source.toLowerCase().includes("meta");
      const marker = isFB ? "🔵" : "  ";

      console.log(
        `${marker} ${source}`.padEnd(30) +
        medium.padEnd(20) +
        fmtNum(sessions).padStart(10) +
        fmtNum(users).padStart(8) +
        fmtNum(purchases).padStart(10) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12)
      );
    }
  }

  // ========= 2. 專門找 facebook 相關 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 二、Facebook / Instagram / Meta 相關流量（全期間）");
  console.log("=".repeat(80));

  const fbTraffic = await runReport({
    dimensions: ["sessionSource", "sessionMedium", "sessionCampaignName"],
    metrics: ["sessions", "activeUsers", "ecommercePurchases", "totalRevenue", "addToCarts"],
    startDate: "2025-04-01",
    endDate: "today",
    dimensionFilter: {
      orGroup: {
        expressions: [
          { filter: { fieldName: "sessionSource", stringFilter: { matchType: "CONTAINS", value: "facebook" } } },
          { filter: { fieldName: "sessionSource", stringFilter: { matchType: "CONTAINS", value: "fb" } } },
          { filter: { fieldName: "sessionSource", stringFilter: { matchType: "CONTAINS", value: "instagram" } } },
          { filter: { fieldName: "sessionSource", stringFilter: { matchType: "CONTAINS", value: "ig" } } },
          { filter: { fieldName: "sessionSource", stringFilter: { matchType: "CONTAINS", value: "meta" } } },
          { filter: { fieldName: "sessionMedium", stringFilter: { matchType: "CONTAINS", value: "paid" } } },
          { filter: { fieldName: "sessionMedium", stringFilter: { matchType: "CONTAINS", value: "cpc" } } },
          { filter: { fieldName: "sessionMedium", stringFilter: { matchType: "CONTAINS", value: "social" } } },
        ],
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
  });

  if (fbTraffic?.rows) {
    console.log(
      "\n" + "Source".padEnd(25) + "Medium".padEnd(15) + "Campaign".padEnd(40) +
      "Sessions".padStart(10) + "Users".padStart(8) +
      "AddToCart".padStart(10) + "Purchases".padStart(10) + "Revenue".padStart(12)
    );
    console.log("-".repeat(130));

    for (const r of fbTraffic.rows) {
      const source = getDim(r, 0);
      const medium = getDim(r, 1);
      const campaign = getDim(r, 2);
      const sessions = getMetric(r, 0);
      const users = getMetric(r, 1);
      const purchases = getMetric(r, 2);
      const revenue = getMetric(r, 3);
      const addToCarts = getMetric(r, 4);

      const shortCampaign = campaign.length > 35 ? campaign.substring(0, 35) + "…" : campaign;

      console.log(
        source.padEnd(25) +
        medium.padEnd(15) +
        shortCampaign.padEnd(40) +
        fmtNum(sessions).padStart(10) +
        fmtNum(users).padStart(8) +
        fmtNum(addToCarts).padStart(10) +
        fmtNum(purchases).padStart(10) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12)
      );
    }
  } else {
    console.log("\n⚠️ 完全找不到任何 Facebook / Instagram / Meta 相關的流量來源！");
    console.log("   這表示 UTM 參數可能沒有正確設定，或 FB 流量被歸到其他來源。");
  }

  // ========= 3. Default Channel Group 檢查 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 三、GA4 預設渠道分組（最近 30 天）— 確認 Paid Social 是否存在");
  console.log("=".repeat(80));

  const channels = await runReport({
    dimensions: ["sessionDefaultChannelGroup"],
    metrics: ["sessions", "activeUsers", "ecommercePurchases", "totalRevenue"],
    startDate: "30daysAgo",
    endDate: "today",
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  if (channels?.rows) {
    console.log(
      "\n" + "Channel Group".padEnd(30) +
      "Sessions".padStart(10) + "Users".padStart(8) +
      "Purchases".padStart(10) + "Revenue".padStart(12)
    );
    console.log("-".repeat(70));

    for (const r of channels.rows) {
      const channel = getDim(r, 0);
      const sessions = getMetric(r, 0);
      const users = getMetric(r, 1);
      const purchases = getMetric(r, 2);
      const revenue = getMetric(r, 3);

      const isPaidSocial = channel.toLowerCase().includes("paid social");
      const marker = isPaidSocial ? "🔵" : "  ";

      console.log(
        `${marker} ${channel}`.padEnd(30) +
        fmtNum(sessions).padStart(10) +
        fmtNum(users).padStart(8) +
        fmtNum(purchases).padStart(10) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12)
      );
    }
  }

  // ========= 4. 每月 Paid Social 趨勢 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 四、Paid Social 月度趨勢（看 UTM 何時開始生效）");
  console.log("=".repeat(80));

  const monthlyPaidSocial = await runReport({
    dimensions: ["yearMonth", "sessionDefaultChannelGroup"],
    metrics: ["sessions", "ecommercePurchases", "totalRevenue"],
    startDate: "2025-04-01",
    endDate: "today",
    dimensionFilter: {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { matchType: "EXACT", value: "Paid Social" },
      },
    },
    orderBys: [{ dimension: { dimensionName: "yearMonth", orderType: "ALPHANUMERIC" } }],
  });

  if (monthlyPaidSocial?.rows && monthlyPaidSocial.rows.length > 0) {
    console.log(
      "\n" + "Month".padEnd(10) +
      "Sessions".padStart(10) + "Purchases".padStart(10) + "Revenue".padStart(12)
    );
    console.log("-".repeat(42));

    for (const r of monthlyPaidSocial.rows) {
      const month = getDim(r, 0);
      const sessions = getMetric(r, 0);
      const purchases = getMetric(r, 1);
      const revenue = getMetric(r, 2);

      const ym = month.substring(0, 4) + "/" + month.substring(4);
      console.log(
        ym.padEnd(10) +
        fmtNum(sessions).padStart(10) +
        fmtNum(purchases).padStart(10) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12)
      );
    }
  } else {
    console.log("\n⚠️ 沒有 Paid Social 月度數據！FB 廣告流量可能被歸類到其他渠道。");
  }

  // ========= 5. 所有 campaign 名稱列表 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 五、所有 Campaign 名稱（找「明心福旺閣」或「導購」字樣）");
  console.log("=".repeat(80));

  const allCampaigns = await runReport({
    dimensions: ["sessionCampaignName"],
    metrics: ["sessions", "ecommercePurchases", "totalRevenue"],
    startDate: "2025-04-01",
    endDate: "today",
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
  });

  if (allCampaigns?.rows) {
    console.log(
      "\n" + "Campaign Name".padEnd(60) +
      "Sessions".padStart(10) + "Purchases".padStart(10) + "Revenue".padStart(12)
    );
    console.log("-".repeat(92));

    for (const r of allCampaigns.rows) {
      const campaign = getDim(r, 0);
      const sessions = getMetric(r, 0);
      const purchases = getMetric(r, 1);
      const revenue = getMetric(r, 2);

      const isMingxin = campaign.includes("明心") || campaign.includes("福旺") ||
                         campaign.includes("導購") || campaign.includes("互動");
      const marker = isMingxin ? "🔵" : "  ";

      const shortCampaign = campaign.length > 55 ? campaign.substring(0, 55) + "…" : campaign;

      console.log(
        `${marker} ${shortCampaign}`.padEnd(60) +
        fmtNum(sessions).padStart(10) +
        fmtNum(purchases).padStart(10) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12)
      );
    }
  }

  console.log("\n✅ UTM 檢查完成！");
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
