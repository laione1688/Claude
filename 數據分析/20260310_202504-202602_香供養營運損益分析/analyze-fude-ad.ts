/**
 * 福德正神廣告轉換率分析
 * 查詢 GA4 中福德正神商品的廣告表現
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

function fmtNum(n: number): string {
  return n.toLocaleString("zh-TW");
}
function pct(a: number, b: number): string {
  return b === 0 ? "0.0%" : ((a / b) * 100).toFixed(2) + "%";
}
function getMetric(row: any, i: number): number {
  return parseFloat(row?.metricValues?.[i]?.value || "0");
}
function getDim(row: any, i: number): string {
  return row?.dimensionValues?.[i]?.value || "";
}

async function main() {
  const startDate = "2025-04-01";
  const endDate = "2026-02-28";
  console.log("🔍 查詢福德正神相關廣告數據...");
  console.log(`📅 期間：${startDate} ~ ${endDate}\n`);

  // 1. 查所有商品名稱中含「福德」的數據（按流量來源）
  const [productByChannel, productByCampaign, productMonthly, landingFude] = await Promise.all([
    // 商品 × 流量來源
    runReport({
      dimensions: ["itemName", "sessionDefaultChannelGroup"],
      metrics: ["itemsViewed", "itemsAddedToCart", "itemsPurchased", "itemRevenue"],
      startDate,
      endDate,
      orderBys: [{ metric: { metricName: "itemsViewed" }, desc: true }],
      limit: 200,
    }),
    // 商品 × 廣告活動名稱
    runReport({
      dimensions: ["itemName", "sessionCampaignName"],
      metrics: ["itemsViewed", "itemsAddedToCart", "itemsPurchased", "itemRevenue"],
      startDate,
      endDate,
      orderBys: [{ metric: { metricName: "itemsViewed" }, desc: true }],
      limit: 200,
    }),
    // 商品 × 月份
    runReport({
      dimensions: ["itemName", "yearMonth"],
      metrics: ["itemsViewed", "itemsAddedToCart", "itemsPurchased", "itemRevenue"],
      startDate,
      endDate,
      dimensionFilter: {
        filter: {
          fieldName: "itemName",
          stringFilter: {
            matchType: "CONTAINS",
            value: "福德",
          },
        },
      },
      orderBys: [{ dimension: { dimensionName: "yearMonth", orderType: "ALPHANUMERIC" } }],
    }),
    // 著陸頁含 shopping/20250619（福德正神商品頁）× 流量來源
    runReport({
      dimensions: ["landingPage", "sessionDefaultChannelGroup"],
      metrics: ["sessions", "addToCarts", "checkouts", "ecommercePurchases", "totalRevenue"],
      startDate,
      endDate,
      dimensionFilter: {
        filter: {
          fieldName: "landingPage",
          stringFilter: {
            matchType: "CONTAINS",
            value: "20250619",
          },
        },
      },
    }),
  ]);

  // ========= 1. 福德正神商品 × 流量來源 =========
  console.log("=".repeat(80));
  console.log("📊 一、福德正神商品 × 流量來源");
  console.log("=".repeat(80));

  if (productByChannel?.rows) {
    const fudeRows = productByChannel.rows.filter((r: any) =>
      getDim(r, 0).includes("福德") || getDim(r, 0).includes("財神") || getDim(r, 0).includes("土地公")
    );

    if (fudeRows.length > 0) {
      console.log(
        "\n" + "商品名".padEnd(40) + "流量來源".padEnd(25) +
        "瀏覽".padStart(8) + "加購".padStart(8) + "購買".padStart(8) +
        "營收".padStart(12) + "瀏覽→加購".padStart(12) + "加購→購買".padStart(12)
      );
      console.log("-".repeat(125));

      for (const r of fudeRows) {
        const name = getDim(r, 0);
        const channel = getDim(r, 1);
        const views = getMetric(r, 0);
        const atc = getMetric(r, 1);
        const purchased = getMetric(r, 2);
        const revenue = getMetric(r, 3);
        const shortName = name.length > 35 ? name.substring(0, 35) + "…" : name;

        console.log(
          shortName.padEnd(40) + channel.padEnd(25) +
          fmtNum(views).padStart(8) + fmtNum(atc).padStart(8) + fmtNum(purchased).padStart(8) +
          ("$" + fmtNum(Math.round(revenue))).padStart(12) +
          pct(atc, views).padStart(12) + pct(purchased, atc).padStart(12)
        );
      }
    } else {
      console.log("\n⚠️ 未找到商品名稱含「福德」「財神」「土地公」的數據");
      // 列出所有商品名供參考
      console.log("\n📋 所有商品名稱（供參考）：");
      const names = new Set<string>();
      for (const r of productByChannel.rows) {
        names.add(getDim(r, 0));
      }
      for (const n of names) {
        console.log(`   - ${n}`);
      }
    }
  }

  // ========= 2. 福德正神商品 × 廣告活動 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 二、福德正神商品 × 廣告活動名稱");
  console.log("=".repeat(80));

  if (productByChannel?.rows) {
    const fudeRows = (productByChannel?.rows || []).filter((r: any) =>
      getDim(r, 0).includes("福德") || getDim(r, 0).includes("財神") || getDim(r, 0).includes("土地公")
    );

    // 同時看 campaign 數據
    const fudeCampaignRows = (productByChannel?.rows || []).filter((r: any) =>
      getDim(r, 0).includes("福德") || getDim(r, 0).includes("財神") || getDim(r, 0).includes("土地公")
    );
  }

  if (productByChannel?.rows) {
    // 重新從 campaign 查詢結果取
    const fudeCampaigns = (productByChannel?.rows || []).filter((r: any) => {
      const name = getDim(r, 0);
      return name.includes("福德") || name.includes("財神") || name.includes("土地公");
    });

    if (fudeCampaigns.length === 0) {
      console.log("\n（見上方商品名列表）");
    }
  }

  // 用 campaign 查詢的結果
  if (productByChannel?.rows) {
    const allCampaignRows = (productByChannel?.rows || []);
    const fudeRows2 = allCampaignRows.filter((r: any) => {
      const name = getDim(r, 0);
      return name.includes("福德") || name.includes("財神") || name.includes("土地公");
    });
  }

  // 正確使用 productByChannel 的結果
  if (productByChannel?.rows) {
    const fRows = productByChannel.rows.filter((r: any) => {
      const n = getDim(r, 0);
      return n.includes("福德") || n.includes("財神") || n.includes("土地公") || n.includes("南山");
    });
    if (fRows.length > 0) {
      console.log(
        "\n" + "商品".padEnd(40) + "廣告活動".padEnd(30) +
        "瀏覽".padStart(8) + "加購".padStart(8) + "購買".padStart(8) + "營收".padStart(12)
      );
      console.log("-".repeat(106));
      for (const r of fRows) {
        const name = getDim(r, 0).substring(0, 35);
        const campaign = getDim(r, 1);
        const views = getMetric(r, 0);
        const atc = getMetric(r, 1);
        const purchased = getMetric(r, 2);
        const revenue = getMetric(r, 3);
        console.log(
          name.padEnd(40) + campaign.padEnd(30) +
          fmtNum(views).padStart(8) + fmtNum(atc).padStart(8) + fmtNum(purchased).padStart(8) +
          ("$" + fmtNum(Math.round(revenue))).padStart(12)
        );
      }
    }
  }

  // ========= 3. 福德正神著陸頁 × 流量來源 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 三、福德正神商品頁（/shopping/20250619）× 流量來源");
  console.log("=".repeat(80));

  if (landingFude?.rows) {
    console.log(
      "\n" + "著陸頁".padEnd(35) + "流量來源".padEnd(25) +
      "訪次".padStart(8) + "加購".padStart(8) + "結帳".padStart(8) +
      "購買".padStart(8) + "營收".padStart(12) + "轉換率".padStart(10)
    );
    console.log("-".repeat(114));

    let totalSessions = 0, totalPurchases = 0, totalRevenue = 0;

    for (const r of landingFude.rows) {
      const page = getDim(r, 0);
      const channel = getDim(r, 1);
      const sessions = getMetric(r, 0);
      const atc = getMetric(r, 1);
      const co = getMetric(r, 2);
      const purchases = getMetric(r, 3);
      const revenue = getMetric(r, 4);

      totalSessions += sessions;
      totalPurchases += purchases;
      totalRevenue += revenue;

      const shortPage = page.length > 30 ? page.substring(0, 30) + "…" : page;
      console.log(
        shortPage.padEnd(35) + channel.padEnd(25) +
        fmtNum(sessions).padStart(8) + fmtNum(atc).padStart(8) + fmtNum(co).padStart(8) +
        fmtNum(purchases).padStart(8) + ("$" + fmtNum(Math.round(revenue))).padStart(12) +
        pct(purchases, sessions).padStart(10)
      );
    }

    console.log("-".repeat(114));
    console.log(
      "合計".padEnd(60) +
      fmtNum(totalSessions).padStart(8) + "".padStart(8) + "".padStart(8) +
      fmtNum(totalPurchases).padStart(8) + ("$" + fmtNum(Math.round(totalRevenue))).padStart(12) +
      pct(totalPurchases, totalSessions).padStart(10)
    );
  } else {
    console.log("\n⚠️ 未找到 /shopping/20250619 的著陸頁數據");
  }

  // ========= 4. 月度趨勢 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 四、福德正神商品月度趨勢");
  console.log("=".repeat(80));

  if (productMonthly?.rows) {
    console.log(
      "\n" + "商品".padEnd(40) + "月份".padEnd(10) +
      "瀏覽".padStart(8) + "加購".padStart(8) + "購買".padStart(8) + "營收".padStart(12)
    );
    console.log("-".repeat(86));

    for (const r of productMonthly.rows) {
      const name = getDim(r, 0).substring(0, 35);
      const month = getDim(r, 1);
      const views = getMetric(r, 0);
      const atc = getMetric(r, 1);
      const purchased = getMetric(r, 2);
      const revenue = getMetric(r, 3);
      const ym = month.substring(0, 4) + "/" + month.substring(4);

      console.log(
        name.padEnd(40) + ym.padEnd(10) +
        fmtNum(views).padStart(8) + fmtNum(atc).padStart(8) + fmtNum(purchased).padStart(8) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12)
      );
    }
  } else {
    console.log("\n⚠️ 未找到福德正神商品的月度數據");
  }

  // ========= 5. 額外：所有「付費」流量的商品表現 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 五、所有付費流量（Paid Shopping / Paid Social）的商品表現 TOP 20");
  console.log("=".repeat(80));

  if (productByChannel?.rows) {
    const paidRows = productByChannel.rows.filter((r: any) => {
      const ch = getDim(r, 1);
      return ch.includes("Paid") || ch.includes("paid");
    });

    paidRows.sort((a: any, b: any) => getMetric(b, 0) - getMetric(a, 0));

    console.log(
      "\n" + "商品名".padEnd(40) + "付費來源".padEnd(25) +
      "瀏覽".padStart(8) + "加購".padStart(8) + "購買".padStart(8) +
      "營收".padStart(12) + "轉換率".padStart(12)
    );
    console.log("-".repeat(113));

    for (const r of paidRows.slice(0, 20)) {
      const name = getDim(r, 0).substring(0, 35);
      const channel = getDim(r, 1);
      const views = getMetric(r, 0);
      const atc = getMetric(r, 1);
      const purchased = getMetric(r, 2);
      const revenue = getMetric(r, 3);

      console.log(
        name.padEnd(40) + channel.padEnd(25) +
        fmtNum(views).padStart(8) + fmtNum(atc).padStart(8) + fmtNum(purchased).padStart(8) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12) +
        pct(purchased, views).padStart(12)
      );
    }
  }

  console.log("\n✅ 福德正神廣告分析完成！");
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
