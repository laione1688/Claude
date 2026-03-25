/**
 * 商品購買者人群分析 — 投廣告受眾定位依據
 * 分析：誰在買？（年齡、性別、興趣、裝置、地區）× 買了什麼商品
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

async function main() {
  const startDate = "2025-04-01";
  const endDate = "2026-02-28";

  console.log("🔍 正在分析購買者人群特徵（投廣告受眾定位依據）...");
  console.log(`📅 期間：${startDate} ~ ${endDate}\n`);

  // 並行拉取所有維度數據
  const [
    ageGender,           // 年齡 × 性別
    agePurchase,         // 年齡 × 購買
    genderPurchase,      // 性別 × 購買
    interestPurchase,    // 興趣 × 購買
    devicePurchase,      // 裝置 × 購買
    cityPurchase,        // 城市 × 購買
    channelPurchase,     // 渠道 × 購買
    productChannel,      // 商品 × 渠道
    productAge,          // 商品 × 年齡
    productGender,       // 商品 × 性別
    hourPurchase,        // 時段 × 購買
    dayOfWeekPurchase,   // 星期 × 購買
  ] = await Promise.all([
    // 1. 年齡 × 性別（整體流量 vs 購買）
    runReport({
      dimensions: ["userAgeBracket", "userGender"],
      metrics: ["activeUsers", "ecommercePurchases", "totalRevenue"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
    }),
    // 2. 年齡 × 購買
    runReport({
      dimensions: ["userAgeBracket"],
      metrics: ["activeUsers", "sessions", "ecommercePurchases", "totalRevenue", "addToCarts"],
      startDate, endDate,
      orderBys: [{ dimension: { dimensionName: "userAgeBracket", orderType: "ALPHANUMERIC" } }],
    }),
    // 3. 性別 × 購買
    runReport({
      dimensions: ["userGender"],
      metrics: ["activeUsers", "sessions", "ecommercePurchases", "totalRevenue", "addToCarts"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
    }),
    // 4. 興趣分類 × 購買
    runReport({
      dimensions: ["brandingInterest"],
      metrics: ["activeUsers", "ecommercePurchases", "totalRevenue", "addToCarts"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
      limit: 30,
    }),
    // 5. 裝置 × 購買
    runReport({
      dimensions: ["deviceCategory", "operatingSystem"],
      metrics: ["activeUsers", "ecommercePurchases", "totalRevenue", "addToCarts"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
    }),
    // 6. 城市 × 購買
    runReport({
      dimensions: ["city"],
      metrics: ["activeUsers", "ecommercePurchases", "totalRevenue", "addToCarts"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
      limit: 30,
    }),
    // 7. 渠道 × 購買
    runReport({
      dimensions: ["sessionDefaultChannelGroup"],
      metrics: ["sessions", "activeUsers", "ecommercePurchases", "totalRevenue", "addToCarts", "checkouts"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
    }),
    // 8. 商品 × 渠道
    runReport({
      dimensions: ["itemName", "sessionDefaultChannelGroup"],
      metrics: ["itemsViewed", "itemsAddedToCart", "itemsPurchased", "itemRevenue"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
      limit: 500,
    }),
    // 9. 商品 × 年齡
    runReport({
      dimensions: ["itemName", "userAgeBracket"],
      metrics: ["itemsAddedToCart", "itemsPurchased", "itemRevenue"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
      limit: 300,
    }),
    // 10. 商品 × 性別
    runReport({
      dimensions: ["itemName", "userGender"],
      metrics: ["itemsAddedToCart", "itemsPurchased", "itemRevenue"],
      startDate, endDate,
      orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
      limit: 200,
    }),
    // 11. 時段 × 購買
    runReport({
      dimensions: ["hour"],
      metrics: ["activeUsers", "ecommercePurchases", "totalRevenue", "addToCarts"],
      startDate, endDate,
      orderBys: [{ dimension: { dimensionName: "hour", orderType: "ALPHANUMERIC" } }],
    }),
    // 12. 星期 × 購買
    runReport({
      dimensions: ["dayOfWeekName"],
      metrics: ["activeUsers", "ecommercePurchases", "totalRevenue", "addToCarts"],
      startDate, endDate,
    }),
  ]);

  // ========= 1. 性別分析 =========
  console.log("=".repeat(90));
  console.log("📊 一、購買者性別分佈");
  console.log("=".repeat(90));

  if (genderPurchase?.rows) {
    let totalUsers = 0, totalPurchases = 0, totalRevenue = 0;
    for (const r of genderPurchase.rows) totalUsers += getMetric(r, 0);
    for (const r of genderPurchase.rows) totalPurchases += getMetric(r, 2);
    for (const r of genderPurchase.rows) totalRevenue += getMetric(r, 3);

    console.log("\n" + "性別".padEnd(15) + "用戶數".padStart(10) + "用戶占比".padStart(10) + "購買數".padStart(8) + "購買占比".padStart(10) + "營收".padStart(12) + "營收占比".padStart(10) + "轉換率".padStart(8));
    console.log("-".repeat(85));

    for (const r of genderPurchase.rows) {
      const gender = getDim(r, 0);
      const users = getMetric(r, 0);
      const purchases = getMetric(r, 2);
      const revenue = getMetric(r, 3);
      const genderLabel = gender === "male" ? "男性" : gender === "female" ? "女性" : gender;

      console.log(
        genderLabel.padEnd(15) +
        fmtNum(users).padStart(10) +
        pct(users, totalUsers).padStart(10) +
        fmtNum(purchases).padStart(8) +
        pct(purchases, totalPurchases).padStart(10) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12) +
        pct(revenue, totalRevenue).padStart(10) +
        pct(purchases, users).padStart(8)
      );
    }
  }

  // ========= 2. 年齡分析 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 二、購買者年齡分佈");
  console.log("=".repeat(90));

  if (agePurchase?.rows) {
    let totalUsers = 0, totalPurchases = 0, totalRevenue = 0;
    for (const r of agePurchase.rows) {
      totalUsers += getMetric(r, 0);
      totalPurchases += getMetric(r, 2);
      totalRevenue += getMetric(r, 3);
    }

    console.log("\n" + "年齡層".padEnd(15) + "用戶數".padStart(10) + "用戶占比".padStart(10) + "購買數".padStart(8) + "購買占比".padStart(10) + "營收".padStart(12) + "營收占比".padStart(10) + "轉換率".padStart(8));
    console.log("-".repeat(85));

    for (const r of agePurchase.rows) {
      const age = getDim(r, 0);
      const users = getMetric(r, 0);
      const purchases = getMetric(r, 2);
      const revenue = getMetric(r, 3);

      console.log(
        age.padEnd(15) +
        fmtNum(users).padStart(10) +
        pct(users, totalUsers).padStart(10) +
        fmtNum(purchases).padStart(8) +
        pct(purchases, totalPurchases).padStart(10) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12) +
        pct(revenue, totalRevenue).padStart(10) +
        pct(purchases, users).padStart(8)
      );
    }
  }

  // ========= 3. 年齡 × 性別 交叉 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 三、年齡 × 性別 交叉分析（購買數 > 0）");
  console.log("=".repeat(90));

  if (ageGender?.rows) {
    console.log("\n" + "年齡".padEnd(12) + "性別".padEnd(10) + "用戶數".padStart(10) + "購買數".padStart(8) + "營收".padStart(12) + "轉換率".padStart(8));
    console.log("-".repeat(60));

    const filtered = ageGender.rows
      .filter((r: any) => getMetric(r, 1) > 0)
      .sort((a: any, b: any) => getMetric(b, 2) - getMetric(a, 2));

    for (const r of filtered) {
      const age = getDim(r, 0);
      const gender = getDim(r, 1);
      const users = getMetric(r, 0);
      const purchases = getMetric(r, 1);
      const revenue = getMetric(r, 2);
      const genderLabel = gender === "male" ? "男" : gender === "female" ? "女" : gender;

      console.log(
        age.padEnd(12) +
        genderLabel.padEnd(10) +
        fmtNum(users).padStart(10) +
        fmtNum(purchases).padStart(8) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12) +
        pct(purchases, users).padStart(8)
      );
    }
  }

  // ========= 4. 興趣分類 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 四、購買者興趣分類（Google 興趣標籤）");
  console.log("=".repeat(90));

  if (interestPurchase?.rows) {
    console.log("\n" + "興趣分類".padEnd(50) + "用戶數".padStart(10) + "購買數".padStart(8) + "營收".padStart(12) + "轉換率".padStart(8));
    console.log("-".repeat(88));

    const filtered = interestPurchase.rows.filter((r: any) => {
      const interest = getDim(r, 0);
      return interest && interest !== "(not set)";
    });

    for (const r of filtered.slice(0, 25)) {
      const interest = getDim(r, 0);
      const users = getMetric(r, 0);
      const purchases = getMetric(r, 1);
      const revenue = getMetric(r, 2);
      const shortInterest = interest.length > 45 ? interest.substring(0, 45) + "…" : interest;

      console.log(
        shortInterest.padEnd(50) +
        fmtNum(users).padStart(10) +
        fmtNum(purchases).padStart(8) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12) +
        pct(purchases, users).padStart(8)
      );
    }
  }

  // ========= 5. 城市 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 五、購買者地區分佈（城市）");
  console.log("=".repeat(90));

  if (cityPurchase?.rows) {
    console.log("\n" + "城市".padEnd(25) + "用戶數".padStart(10) + "加購".padStart(8) + "購買數".padStart(8) + "營收".padStart(12) + "轉換率".padStart(8));
    console.log("-".repeat(72));

    for (const r of cityPurchase.rows.slice(0, 25)) {
      const city = getDim(r, 0);
      const users = getMetric(r, 0);
      const atc = getMetric(r, 3);
      const purchases = getMetric(r, 1);
      const revenue = getMetric(r, 2);

      console.log(
        city.padEnd(25) +
        fmtNum(users).padStart(10) +
        fmtNum(atc).padStart(8) +
        fmtNum(purchases).padStart(8) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12) +
        pct(purchases, users).padStart(8)
      );
    }
  }

  // ========= 6. 裝置 × 系統 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 六、購買者裝置 × 作業系統");
  console.log("=".repeat(90));

  if (devicePurchase?.rows) {
    console.log("\n" + "裝置".padEnd(12) + "系統".padEnd(15) + "用戶數".padStart(10) + "購買數".padStart(8) + "營收".padStart(12) + "轉換率".padStart(8));
    console.log("-".repeat(65));

    for (const r of devicePurchase.rows) {
      const device = getDim(r, 0);
      const os = getDim(r, 1);
      const users = getMetric(r, 0);
      const purchases = getMetric(r, 1);
      const revenue = getMetric(r, 2);

      if (purchases > 0 || users > 100) {
        console.log(
          device.padEnd(12) +
          os.padEnd(15) +
          fmtNum(users).padStart(10) +
          fmtNum(purchases).padStart(8) +
          ("$" + fmtNum(Math.round(revenue))).padStart(12) +
          pct(purchases, users).padStart(8)
        );
      }
    }
  }

  // ========= 7. 購買時段 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 七、購買時段分佈（24 小時）");
  console.log("=".repeat(90));

  if (hourPurchase?.rows) {
    console.log("\n" + "時段".padEnd(8) + "用戶數".padStart(10) + "加購".padStart(8) + "購買數".padStart(8) + "營收".padStart(12));
    console.log("-".repeat(48));

    for (const r of hourPurchase.rows) {
      const hour = getDim(r, 0);
      const users = getMetric(r, 0);
      const purchases = getMetric(r, 1);
      const revenue = getMetric(r, 2);
      const atc = getMetric(r, 3);
      const h = parseInt(hour);
      const label = `${h.toString().padStart(2, "0")}:00`;

      console.log(
        label.padEnd(8) +
        fmtNum(users).padStart(10) +
        fmtNum(atc).padStart(8) +
        fmtNum(purchases).padStart(8) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12)
      );
    }
  }

  // ========= 8. 星期分佈 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 八、購買星期分佈");
  console.log("=".repeat(90));

  if (dayOfWeekPurchase?.rows) {
    console.log("\n" + "星期".padEnd(15) + "用戶數".padStart(10) + "加購".padStart(8) + "購買數".padStart(8) + "營收".padStart(12));
    console.log("-".repeat(55));

    const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayLabel: Record<string, string> = {
      Sunday: "週日", Monday: "週一", Tuesday: "週二", Wednesday: "週三",
      Thursday: "週四", Friday: "週五", Saturday: "週六",
    };

    const sorted = dayOfWeekPurchase.rows.sort((a: any, b: any) => {
      return dayOrder.indexOf(getDim(a, 0)) - dayOrder.indexOf(getDim(b, 0));
    });

    for (const r of sorted) {
      const day = getDim(r, 0);
      const users = getMetric(r, 0);
      const purchases = getMetric(r, 1);
      const revenue = getMetric(r, 2);
      const atc = getMetric(r, 3);

      console.log(
        (dayLabel[day] || day).padEnd(15) +
        fmtNum(users).padStart(10) +
        fmtNum(atc).padStart(8) +
        fmtNum(purchases).padStart(8) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12)
      );
    }
  }

  // ========= 9. 渠道 × 購買 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 九、流量渠道電商表現");
  console.log("=".repeat(90));

  if (channelPurchase?.rows) {
    console.log(
      "\n" + "渠道".padEnd(28) +
      "Sessions".padStart(10) +
      "用戶".padStart(8) +
      "加購".padStart(8) +
      "結帳".padStart(8) +
      "購買".padStart(8) +
      "營收".padStart(12) +
      "轉換率".padStart(8)
    );
    console.log("-".repeat(92));

    for (const r of channelPurchase.rows) {
      const channel = getDim(r, 0);
      const sessions = getMetric(r, 0);
      const users = getMetric(r, 1);
      const purchases = getMetric(r, 2);
      const revenue = getMetric(r, 3);
      const atc = getMetric(r, 4);
      const co = getMetric(r, 5);

      console.log(
        channel.padEnd(28) +
        fmtNum(sessions).padStart(10) +
        fmtNum(users).padStart(8) +
        fmtNum(atc).padStart(8) +
        fmtNum(co).padStart(8) +
        fmtNum(purchases).padStart(8) +
        ("$" + fmtNum(Math.round(revenue))).padStart(12) +
        pct(purchases, sessions).padStart(8)
      );
    }
  }

  // ========= 10. 商品 × 渠道 交叉 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 十、商品 × 流量渠道 交叉分析");
  console.log("=".repeat(90));

  if (productChannel?.rows) {
    type ChannelData = { viewed: number; added: number; purchased: number; revenue: number };
    const productMap: Record<string, Record<string, ChannelData>> = {};
    const productTotals: Record<string, { viewed: number; added: number; purchased: number; revenue: number }> = {};

    for (const r of productChannel.rows) {
      const product = getDim(r, 0);
      const channel = getDim(r, 1);
      const viewed = getMetric(r, 0);
      const added = getMetric(r, 1);
      const purchased = getMetric(r, 2);
      const revenue = getMetric(r, 3);

      if (!productMap[product]) productMap[product] = {};
      productMap[product][channel] = { viewed, added, purchased, revenue };

      if (!productTotals[product]) productTotals[product] = { viewed: 0, added: 0, purchased: 0, revenue: 0 };
      productTotals[product].viewed += viewed;
      productTotals[product].added += added;
      productTotals[product].purchased += purchased;
      productTotals[product].revenue += revenue;
    }

    const sortedProducts = Object.entries(productTotals)
      .filter(([_, t]) => t.purchased > 0)
      .sort((a, b) => b[1].revenue - a[1].revenue);

    for (const [product, totals] of sortedProducts) {
      const shortName = product.length > 60 ? product.substring(0, 60) + "…" : product;
      console.log(`\n🛍️ ${shortName}`);
      console.log(`   總計：瀏覽 ${fmtNum(totals.viewed)} | 加購 ${fmtNum(totals.added)} | 購買 ${fmtNum(totals.purchased)} | 營收 $${fmtNum(Math.round(totals.revenue))}`);

      const channels = productMap[product];
      const channelEntries = Object.entries(channels)
        .filter(([_, d]) => d.added > 0 || d.purchased > 0)
        .sort((a, b) => b[1].revenue - a[1].revenue || b[1].added - a[1].added);

      if (channelEntries.length > 0) {
        console.log("   " + "渠道".padEnd(28) + "瀏覽".padStart(8) + "加購".padStart(8) + "購買".padStart(8) + "營收".padStart(12));
        console.log("   " + "-".repeat(65));

        for (const [ch, d] of channelEntries) {
          console.log(
            "   " + ch.padEnd(28) +
            fmtNum(d.viewed).padStart(8) +
            fmtNum(d.added).padStart(8) +
            fmtNum(d.purchased).padStart(8) +
            ("$" + fmtNum(Math.round(d.revenue))).padStart(12)
          );
        }
      }
    }
  }

  // ========= 11. 商品 × 年齡 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 十一、商品 × 購買者年齡（有購買的）");
  console.log("=".repeat(90));

  if (productAge?.rows) {
    type AgeData = { added: number; purchased: number; revenue: number };
    const prodAgeMap: Record<string, Record<string, AgeData>> = {};

    for (const r of productAge.rows) {
      const product = getDim(r, 0);
      const age = getDim(r, 1);
      const added = getMetric(r, 0);
      const purchased = getMetric(r, 1);
      const revenue = getMetric(r, 2);

      if (!prodAgeMap[product]) prodAgeMap[product] = {};
      prodAgeMap[product][age] = { added, purchased, revenue };
    }

    // 只顯示有購買的商品
    for (const [product, ages] of Object.entries(prodAgeMap)) {
      const totalPurchased = Object.values(ages).reduce((s, a) => s + a.purchased, 0);
      if (totalPurchased === 0) continue;

      const shortName = product.length > 60 ? product.substring(0, 60) + "…" : product;
      console.log(`\n🛍️ ${shortName}`);

      const sorted = Object.entries(ages)
        .filter(([_, d]) => d.purchased > 0)
        .sort((a, b) => b[1].purchased - a[1].purchased);

      for (const [age, d] of sorted) {
        const bar = "█".repeat(Math.min(Math.round(d.purchased / 2), 30));
        console.log(`   ${age.padEnd(12)} 購買 ${fmtNum(d.purchased).padStart(6)} / $${fmtNum(Math.round(d.revenue)).padStart(8)} ${bar}`);
      }
    }
  }

  // ========= 12. 商品 × 性別 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 十二、商品 × 購買者性別（有購買的）");
  console.log("=".repeat(90));

  if (productGender?.rows) {
    type GenderData = { added: number; purchased: number; revenue: number };
    const prodGenderMap: Record<string, Record<string, GenderData>> = {};

    for (const r of productGender.rows) {
      const product = getDim(r, 0);
      const gender = getDim(r, 1);
      const added = getMetric(r, 0);
      const purchased = getMetric(r, 1);
      const revenue = getMetric(r, 2);

      if (!prodGenderMap[product]) prodGenderMap[product] = {};
      prodGenderMap[product][gender] = { added, purchased, revenue };
    }

    for (const [product, genders] of Object.entries(prodGenderMap)) {
      const totalPurchased = Object.values(genders).reduce((s, g) => s + g.purchased, 0);
      if (totalPurchased === 0) continue;

      const shortName = product.length > 60 ? product.substring(0, 60) + "…" : product;
      console.log(`\n🛍️ ${shortName}`);

      for (const [gender, d] of Object.entries(genders)) {
        if (d.purchased > 0) {
          const label = gender === "male" ? "男性" : gender === "female" ? "女性" : gender;
          console.log(`   ${label.padEnd(12)} 購買 ${fmtNum(d.purchased).padStart(6)} / $${fmtNum(Math.round(d.revenue)).padStart(8)} (${pct(d.purchased, totalPurchased)})`);
        }
      }
    }
  }

  // ========= 總結 =========
  console.log("\n" + "=".repeat(90));
  console.log("📊 ★ 廣告受眾定位建議總結");
  console.log("=".repeat(90));
  console.log(`
基於以上數據，建議的 Facebook/Google 廣告受眾定位：

1️⃣  人口統計：以上數據中轉換率最高的年齡層 × 性別組合
2️⃣  興趣標籤：以上購買者興趣分類中的 TOP 標籤
3️⃣  地區定位：以上購買者城市分佈中的 TOP 城市
4️⃣  裝置定位：根據裝置 × 系統數據選擇投放裝置
5️⃣  時段投放：購買集中的時段加大投放
6️⃣  星期投放：購買集中的星期加大投放

（以上為數據摘要，請依據實際數字填入廣告後台設定）
`);

  console.log("✅ 購買者人群分析完成！");
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
