/**
 * GA4 購物漏斗分析
 * 分析：瀏覽 → 加入購物車 → 開始結帳 → 完成購買 的轉換漏斗
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GA4_CONFIG } from "./ga4-config";

const client = new BetaAnalyticsDataClient({
  keyFilename: GA4_CONFIG.serviceAccountKeyPath,
});
const propertyId = GA4_CONFIG.propertyId;

// ==================== 通用查詢 ====================

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

// ==================== 漏斗數據查詢 ====================

/** 1. 整體漏斗：用 session-level 電商指標 */
async function getOverallFunnel(startDate: string, endDate: string) {
  // GA4 提供的 session-level 電商指標
  const resp = await runReport({
    dimensions: [],
    metrics: [
      "sessions",
      "itemsViewed",        // view_item 事件次數
      "addToCarts",         // add_to_cart 事件的 session 數
      "checkouts",          // begin_checkout 事件的 session 數
      "ecommercePurchases", // purchase 事件的 session 數
      "totalRevenue",
    ],
    startDate,
    endDate,
  });
  return resp;
}

/** 2. 每月漏斗趨勢 */
async function getMonthlyFunnel(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["yearMonth"],
    metrics: [
      "sessions",
      "addToCarts",
      "checkouts",
      "ecommercePurchases",
      "totalRevenue",
    ],
    startDate,
    endDate,
    orderBys: [{ dimension: { dimensionName: "yearMonth", orderType: "ALPHANUMERIC" } }],
  });
}

/** 3. 按裝置分析漏斗 */
async function getDeviceFunnel(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["deviceCategory"],
    metrics: [
      "sessions",
      "addToCarts",
      "checkouts",
      "ecommercePurchases",
      "totalRevenue",
    ],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });
}

/** 4. 按流量來源分析漏斗 */
async function getChannelFunnel(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["sessionDefaultChannelGroup"],
    metrics: [
      "sessions",
      "addToCarts",
      "checkouts",
      "ecommercePurchases",
      "totalRevenue",
    ],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });
}

/** 5. 商品加入購物車 vs 購買（找出被放棄最多的商品） */
async function getProductFunnel(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["itemName"],
    metrics: [
      "itemsViewed",
      "itemsAddedToCart",
      "itemsPurchased",
      "itemRevenue",
    ],
    startDate,
    endDate,
    orderBys: [{ metric: { metricName: "itemsAddedToCart" }, desc: true }],
    limit: 30,
  });
}

/** 6. 按事件名稱拉各步驟的事件數 */
async function getEventCounts(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["eventName"],
    metrics: ["eventCount", "totalUsers"],
    startDate,
    endDate,
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: [
            "session_start",
            "page_view",
            "view_item",
            "add_to_cart",
            "begin_checkout",
            "add_payment_info",
            "add_shipping_info",
            "purchase",
          ],
        },
      },
    },
  });
}

/** 7. 按裝置 × 事件名稱（細分裝置漏斗） */
async function getDeviceEventCounts(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["deviceCategory", "eventName"],
    metrics: ["eventCount", "totalUsers"],
    startDate,
    endDate,
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: ["view_item", "add_to_cart", "begin_checkout", "purchase"],
        },
      },
    },
  });
}

/** 8. 按來源 × 事件名稱（細分來源漏斗） */
async function getChannelEventCounts(startDate: string, endDate: string) {
  return runReport({
    dimensions: ["sessionDefaultChannelGroup", "eventName"],
    metrics: ["eventCount", "totalUsers"],
    startDate,
    endDate,
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: ["view_item", "add_to_cart", "begin_checkout", "purchase"],
        },
      },
    },
  });
}

// ==================== 分析與輸出 ====================

function extractRow(resp: any, dimIndex?: number, dimValue?: string) {
  if (!resp?.rows) return null;
  if (dimIndex === undefined) return resp.rows[0];
  return resp.rows.find((r: any) => r.dimensionValues?.[dimIndex]?.value === dimValue);
}

function getMetric(row: any, index: number): number {
  if (!row) return 0;
  return parseFloat(row.metricValues?.[index]?.value || "0");
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "0.0%";
  return ((num / denom) * 100).toFixed(1) + "%";
}

function fmtNum(n: number): string {
  return n.toLocaleString("zh-TW");
}

async function main() {
  const startDate = "2025-04-01";
  const endDate = "2026-02-28";

  console.log("🔍 正在從 GA4 抓取購物漏斗數據...");
  console.log(`📅 期間：${startDate} ~ ${endDate}\n`);

  // 並行拉取所有數據
  const [
    overallFunnel,
    monthlyFunnel,
    deviceFunnel,
    channelFunnel,
    productFunnel,
    eventCounts,
    deviceEvents,
    channelEvents,
  ] = await Promise.all([
    getOverallFunnel(startDate, endDate),
    getMonthlyFunnel(startDate, endDate),
    getDeviceFunnel(startDate, endDate),
    getChannelFunnel(startDate, endDate),
    getProductFunnel(startDate, endDate),
    getEventCounts(startDate, endDate),
    getDeviceEventCounts(startDate, endDate),
    getChannelEventCounts(startDate, endDate),
  ]);

  // ========= 1. 整體漏斗 =========
  console.log("\n" + "=".repeat(60));
  console.log("📊 一、整體購物漏斗");
  console.log("=".repeat(60));

  const row = overallFunnel?.rows?.[0];
  if (row) {
    const sessions = getMetric(row, 0);
    const itemViews = getMetric(row, 1);
    const addToCarts = getMetric(row, 2);
    const checkouts = getMetric(row, 3);
    const purchases = getMetric(row, 4);
    const revenue = getMetric(row, 5);

    console.log(`
┌─────────────────────────────────────────────────────┐
│  工作階段 (Sessions)    ${fmtNum(sessions).padStart(10)}            │
│        ↓  瀏覽商品率                                  │
│  瀏覽商品 (view_item)   ${fmtNum(itemViews).padStart(10)}  ${pct(itemViews, sessions).padStart(8)} │
│        ↓  加購率                                      │
│  加入購物車 (add_to_cart) ${fmtNum(addToCarts).padStart(8)}  ${pct(addToCarts, sessions).padStart(8)} │
│        ↓  結帳率                                      │
│  開始結帳 (begin_checkout) ${fmtNum(checkouts).padStart(6)}  ${pct(checkouts, sessions).padStart(8)} │
│        ↓  購買率                                      │
│  完成購買 (purchase)     ${fmtNum(purchases).padStart(8)}  ${pct(purchases, sessions).padStart(8)} │
│                                                       │
│  營收                   $${fmtNum(Math.round(revenue))}                │
└─────────────────────────────────────────────────────┘`);

    console.log("\n步驟間流失率：");
    console.log(`  瀏覽→加購：${pct(addToCarts, itemViews)}（流失 ${pct(itemViews - addToCarts, itemViews)}）`);
    console.log(`  加購→結帳：${pct(checkouts, addToCarts)}（流失 ${pct(addToCarts - checkouts, addToCarts)}）`);
    console.log(`  結帳→購買：${pct(purchases, checkouts)}（流失 ${pct(checkouts - purchases, checkouts)}）`);
    console.log(`  整體轉換率：${pct(purchases, sessions)}`);
  }

  // ========= 2. 事件計數漏斗 =========
  console.log("\n" + "=".repeat(60));
  console.log("📊 二、事件計數漏斗（eventCount & uniqueUsers）");
  console.log("=".repeat(60));

  if (eventCounts?.rows) {
    const eventOrder = [
      "session_start", "page_view", "view_item",
      "add_to_cart", "begin_checkout", "add_payment_info",
      "add_shipping_info", "purchase",
    ];
    const eventLabels: Record<string, string> = {
      session_start: "開始工作階段",
      page_view: "瀏覽頁面",
      view_item: "瀏覽商品",
      add_to_cart: "加入購物車",
      begin_checkout: "開始結帳",
      add_payment_info: "填寫付款資訊",
      add_shipping_info: "填寫運送資訊",
      purchase: "完成購買",
    };

    console.log("\n事件名稱".padEnd(25) + "事件次數".padStart(12) + "不重複用戶".padStart(12));
    console.log("-".repeat(50));

    for (const event of eventOrder) {
      const eRow = eventCounts.rows.find(
        (r: any) => r.dimensionValues?.[0]?.value === event
      );
      if (eRow) {
        const count = getMetric(eRow, 0);
        const users = getMetric(eRow, 1);
        const label = `${eventLabels[event] || event} (${event})`;
        console.log(label.padEnd(35) + fmtNum(count).padStart(10) + fmtNum(users).padStart(10));
      }
    }
  }

  // ========= 3. 月度漏斗趨勢 =========
  console.log("\n" + "=".repeat(60));
  console.log("📊 三、月度漏斗趨勢");
  console.log("=".repeat(60));

  if (monthlyFunnel?.rows) {
    console.log("\n月份".padEnd(10) + "Sessions".padStart(10) + "加購".padStart(8) + "結帳".padStart(8) + "購買".padStart(8) + "轉換率".padStart(8) + "購物車→購買".padStart(12));
    console.log("-".repeat(65));

    for (const r of monthlyFunnel.rows) {
      const month = r.dimensionValues?.[0]?.value || "";
      const sessions = getMetric(r, 0);
      const atc = getMetric(r, 1);
      const co = getMetric(r, 2);
      const purchases = getMetric(r, 3);

      const ym = month.substring(0, 4) + "/" + month.substring(4);
      console.log(
        ym.padEnd(10) +
        fmtNum(sessions).padStart(10) +
        fmtNum(atc).padStart(8) +
        fmtNum(co).padStart(8) +
        fmtNum(purchases).padStart(8) +
        pct(purchases, sessions).padStart(8) +
        pct(purchases, atc).padStart(12)
      );
    }
  }

  // ========= 4. 裝置分析 =========
  console.log("\n" + "=".repeat(60));
  console.log("📊 四、按裝置分析漏斗");
  console.log("=".repeat(60));

  if (deviceFunnel?.rows) {
    console.log("\n裝置".padEnd(12) + "Sessions".padStart(10) + "加購".padStart(8) + "結帳".padStart(8) + "購買".padStart(8) + "轉換率".padStart(8) + "購物車放棄率".padStart(14));
    console.log("-".repeat(70));

    for (const r of deviceFunnel.rows) {
      const device = r.dimensionValues?.[0]?.value || "";
      const sessions = getMetric(r, 0);
      const atc = getMetric(r, 1);
      const co = getMetric(r, 2);
      const purchases = getMetric(r, 3);
      const cartAbandonment = atc > 0 ? ((atc - purchases) / atc * 100).toFixed(1) + "%" : "N/A";

      console.log(
        device.padEnd(12) +
        fmtNum(sessions).padStart(10) +
        fmtNum(atc).padStart(8) +
        fmtNum(co).padStart(8) +
        fmtNum(purchases).padStart(8) +
        pct(purchases, sessions).padStart(8) +
        cartAbandonment.padStart(14)
      );
    }
  }

  // ========= 5. 流量來源分析 =========
  console.log("\n" + "=".repeat(60));
  console.log("📊 五、按流量來源分析漏斗");
  console.log("=".repeat(60));

  if (channelFunnel?.rows) {
    console.log("\n來源".padEnd(25) + "Sessions".padStart(10) + "加購".padStart(8) + "結帳".padStart(8) + "購買".padStart(8) + "轉換率".padStart(8) + "購物車放棄率".padStart(14));
    console.log("-".repeat(82));

    for (const r of channelFunnel.rows) {
      const channel = r.dimensionValues?.[0]?.value || "";
      const sessions = getMetric(r, 0);
      const atc = getMetric(r, 1);
      const co = getMetric(r, 2);
      const purchases = getMetric(r, 3);
      const cartAbandonment = atc > 0 ? ((atc - purchases) / atc * 100).toFixed(1) + "%" : "N/A";

      console.log(
        channel.padEnd(25) +
        fmtNum(sessions).padStart(10) +
        fmtNum(atc).padStart(8) +
        fmtNum(co).padStart(8) +
        fmtNum(purchases).padStart(8) +
        pct(purchases, sessions).padStart(8) +
        cartAbandonment.padStart(14)
      );
    }
  }

  // ========= 6. 商品漏斗（加購 vs 購買） =========
  console.log("\n" + "=".repeat(60));
  console.log("📊 六、商品加購→購買漏斗 TOP 20");
  console.log("=".repeat(60));

  if (productFunnel?.rows) {
    console.log("\n商品名".padEnd(35) + "瀏覽".padStart(8) + "加購".padStart(8) + "購買".padStart(8) + "瀏覽→加購".padStart(12) + "加購→購買".padStart(12) + "放棄數".padStart(8));
    console.log("-".repeat(95));

    for (const r of productFunnel.rows) {
      const name = r.dimensionValues?.[0]?.value || "";
      const views = getMetric(r, 0);
      const atc = getMetric(r, 1);
      const purchased = getMetric(r, 2);
      const abandoned = atc - purchased;
      const shortName = name.length > 30 ? name.substring(0, 30) + "…" : name;

      console.log(
        shortName.padEnd(35) +
        fmtNum(views).padStart(8) +
        fmtNum(atc).padStart(8) +
        fmtNum(purchased).padStart(8) +
        pct(atc, views).padStart(12) +
        pct(purchased, atc).padStart(12) +
        fmtNum(abandoned).padStart(8)
      );
    }
  }

  // ========= 7. 裝置×事件 細分 =========
  console.log("\n" + "=".repeat(60));
  console.log("📊 七、裝置×事件 細分漏斗（用戶數）");
  console.log("=".repeat(60));

  if (deviceEvents?.rows) {
    const devices = new Set<string>();
    const eventMap: Record<string, Record<string, number>> = {};

    for (const r of deviceEvents.rows) {
      const device = r.dimensionValues?.[0]?.value || "";
      const event = r.dimensionValues?.[1]?.value || "";
      const users = getMetric(r, 1);
      devices.add(device);
      if (!eventMap[device]) eventMap[device] = {};
      eventMap[device][event] = users;
    }

    for (const device of devices) {
      const e = eventMap[device] || {};
      const vi = e["view_item"] || 0;
      const atc = e["add_to_cart"] || 0;
      const bc = e["begin_checkout"] || 0;
      const p = e["purchase"] || 0;

      console.log(`\n【${device}】`);
      console.log(`  瀏覽商品: ${fmtNum(vi)} 人`);
      console.log(`  加入購物車: ${fmtNum(atc)} 人 (${pct(atc, vi)} of view)`);
      console.log(`  開始結帳: ${fmtNum(bc)} 人 (${pct(bc, atc)} of cart)`);
      console.log(`  完成購買: ${fmtNum(p)} 人 (${pct(p, bc)} of checkout)`);
      console.log(`  整體: 瀏覽→購買 ${pct(p, vi)}`);
    }
  }

  // ========= 8. 來源×事件 細分 =========
  console.log("\n" + "=".repeat(60));
  console.log("📊 八、流量來源×事件 細分漏斗（用戶數）");
  console.log("=".repeat(60));

  if (channelEvents?.rows) {
    const channels = new Set<string>();
    const chMap: Record<string, Record<string, number>> = {};

    for (const r of channelEvents.rows) {
      const channel = r.dimensionValues?.[0]?.value || "";
      const event = r.dimensionValues?.[1]?.value || "";
      const users = getMetric(r, 1);
      channels.add(channel);
      if (!chMap[channel]) chMap[channel] = {};
      chMap[channel][event] = users;
    }

    console.log("\n來源".padEnd(25) + "瀏覽商品".padStart(8) + "加購".padStart(8) + "結帳".padStart(8) + "購買".padStart(8) + "瀏覽→購買".padStart(10));
    console.log("-".repeat(70));

    for (const ch of channels) {
      const e = chMap[ch] || {};
      const vi = e["view_item"] || 0;
      const atc = e["add_to_cart"] || 0;
      const bc = e["begin_checkout"] || 0;
      const p = e["purchase"] || 0;

      console.log(
        ch.padEnd(25) +
        fmtNum(vi).padStart(8) +
        fmtNum(atc).padStart(8) +
        fmtNum(bc).padStart(8) +
        fmtNum(p).padStart(8) +
        pct(p, vi).padStart(10)
      );
    }
  }

  console.log("\n✅ 漏斗分析完成！");
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
