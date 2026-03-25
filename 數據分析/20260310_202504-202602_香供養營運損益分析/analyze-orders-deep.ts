import XLSX from "xlsx";

const workbook = XLSX.readFile("/Users/laichaochang/Downloads/訂單資料表-20260310192411.xlsx");
const sheet = workbook.Sheets["Sheet1"];
const data = XLSX.utils.sheet_to_json(sheet) as any[];

// Build orders map
const orders = new Map<string, any>();
data.forEach((row) => {
  const orderId = row["訂單編號"];
  if (!orders.has(orderId)) {
    orders.set(orderId, {
      date: row["訂單日期"],
      buyer: row["購買人"],
      payment: row["付款方式"],
      status: row["付款狀態"],
      amount: row["訂單金額"],
      items: [],
    });
  }
  orders.get(orderId)!.items.push({
    sku: row["品號"],
    name: row["品名規格"],
    qty: row["數量"],
    price: row["售價"],
    subtotal: row["商品小計"],
  });
});

// === Temple / Product Category Analysis ===
console.log("=== 廟宇/產品線分析 ===\n");

const templeMap: Record<string, { qty: number; revenue: number; orders: Set<string> }> = {};
data.forEach((row) => {
  const orderId = row["訂單編號"];
  const order = orders.get(orderId);
  if (order && order.status === "付款成功") {
    const name = row["品名規格"] as string;
    let temple = "其他";
    if (name.includes("地藏庵")) temple = "新莊地藏庵";
    else if (name.includes("接雲寺")) temple = "板橋接雲寺";
    else if (name.includes("竹林山")) temple = "竹林山觀音寺";
    else if (name.includes("金山財神")) temple = "金山財神廟";
    else if (name.includes("慈惠宮")) temple = "板橋慈惠宮(媽祖)";
    else if (name.includes("南山福德")) temple = "南山福德宮";
    else if (name.includes("龍耀金昇") || name.includes("寶元上沉")) temple = "通用品/龍耀金昇";
    else if (name.includes("福虎生風")) temple = "福虎生風系列";
    else if (name.includes("香環")) temple = "香環系列";

    if (!templeMap[temple]) templeMap[temple] = { qty: 0, revenue: 0, orders: new Set() };
    templeMap[temple].qty += row["數量"];
    templeMap[temple].revenue += row["商品小計"];
    templeMap[temple].orders.add(orderId);
  }
});

let totalTempleRevenue = 0;
Object.values(templeMap).forEach(t => totalTempleRevenue += t.revenue);

console.log("廟宇/產品線    | 營收 | 佔比 | 訂單數 | 數量");
Object.entries(templeMap)
  .sort((a, b) => b[1].revenue - a[1].revenue)
  .forEach(([temple, t]) => {
    const pct = ((t.revenue / totalTempleRevenue) * 100).toFixed(1);
    console.log(`${temple}: $${t.revenue.toLocaleString()} (${pct}%), ${t.orders.size}筆, ${t.qty}件`);
  });

// === Product Type (立香 vs 香環) ===
console.log("\n=== 商品類型分析 ===");
let lixiangQty = 0, lixiangRev = 0, huanQty = 0, huanRev = 0, otherQty = 0, otherRev = 0;
data.forEach((row) => {
  const order = orders.get(row["訂單編號"]);
  if (order && order.status === "付款成功") {
    const name = row["品名規格"] as string;
    if (name.includes("立香")) {
      lixiangQty += row["數量"];
      lixiangRev += row["商品小計"];
    } else if (name.includes("香環")) {
      huanQty += row["數量"];
      huanRev += row["商品小計"];
    } else {
      otherQty += row["數量"];
      otherRev += row["商品小計"];
    }
  }
});
console.log(`立香: 數量 ${lixiangQty}, 營收 $${lixiangRev.toLocaleString()} (${((lixiangRev/totalTempleRevenue)*100).toFixed(1)}%)`);
console.log(`香環: 數量 ${huanQty}, 營收 $${huanRev.toLocaleString()} (${((huanRev/totalTempleRevenue)*100).toFixed(1)}%)`);
console.log(`其他: 數量 ${otherQty}, 營收 $${otherRev.toLocaleString()} (${((otherRev/totalTempleRevenue)*100).toFixed(1)}%)`);

// === Size analysis (2.5斤 vs 5斤) ===
console.log("\n=== 規格分析 ===");
let small = 0, smallRev = 0, large = 0, largeRev = 0;
data.forEach((row) => {
  const order = orders.get(row["訂單編號"]);
  if (order && order.status === "付款成功") {
    const name = row["品名規格"] as string;
    if (name.includes("2.5斤")) {
      small += row["數量"];
      smallRev += row["商品小計"];
    } else if (name.includes("5斤")) {
      large += row["數量"];
      largeRev += row["商品小計"];
    }
  }
});
console.log(`2.5斤: ${small}件, $${smallRev.toLocaleString()}, 均價 $${Math.round(smallRev/small)}`);
console.log(`5斤: ${large}件, $${largeRev.toLocaleString()}, 均價 $${Math.round(largeRev/large)}`);
console.log(`2.5斤佔比: ${((small/(small+large))*100).toFixed(1)}% 數量, ${((smallRev/(smallRev+largeRev))*100).toFixed(1)}% 營收`);

// === GA4 vs Orders comparison ===
console.log("\n=== GA4 vs 電商後台比對 ===");
const ga4Monthly: Record<string, number> = {
  "2025-04": 8705, "2025-05": 19000, "2025-06": 33200,
  "2025-07": 91968, "2025-08": 100600, "2025-09": 116150,
  "2025-10": 164400, "2025-11": 109200, "2025-12": 137000,
  "2026-01": 64400, "2026-02": 58500
};

const orderMonthly: Record<string, { count: number; revenue: number }> = {};
orders.forEach((order) => {
  if (order.status === "付款成功") {
    const month = order.date.substring(0, 7);
    if (!orderMonthly[month]) orderMonthly[month] = { count: 0, revenue: 0 };
    orderMonthly[month].count++;
    orderMonthly[month].revenue += order.amount;
  }
});

console.log("月份     | 電商後台 | GA4    | 差異    | 差異%");
let totalOrder = 0, totalGA4 = 0;
Object.keys(ga4Monthly).sort().forEach(month => {
  const ga4 = ga4Monthly[month];
  const om = orderMonthly[month] || { count: 0, revenue: 0 };
  const diff = om.revenue - ga4;
  const pct = ga4 > 0 ? ((diff / ga4) * 100).toFixed(0) : "N/A";
  totalOrder += om.revenue;
  totalGA4 += ga4;
  console.log(`${month} | $${om.revenue.toLocaleString().padStart(8)} | $${ga4.toLocaleString().padStart(7)} | $${diff >= 0 ? '+' : ''}${diff.toLocaleString().padStart(7)} | ${pct}%`);
});
console.log(`合計     | $${totalOrder.toLocaleString().padStart(8)} | $${totalGA4.toLocaleString().padStart(7)} | $${(totalOrder - totalGA4) >= 0 ? '+' : ''}${(totalOrder - totalGA4).toLocaleString().padStart(7)} | ${((totalOrder - totalGA4) / totalGA4 * 100).toFixed(0)}%`);

// === LTV Analysis ===
console.log("\n=== 客戶終身價值 (LTV) ===");
const buyers = new Map<string, { orders: number; revenue: number; firstDate: string; lastDate: string; dates: string[] }>();
orders.forEach((order) => {
  if (order.status === "付款成功") {
    const name = order.buyer;
    if (!buyers.has(name)) {
      buyers.set(name, { orders: 0, revenue: 0, firstDate: order.date, lastDate: order.date, dates: [] });
    }
    const b = buyers.get(name)!;
    b.orders++;
    b.revenue += order.amount;
    b.dates.push(order.date);
    if (order.date < b.firstDate) b.firstDate = order.date;
    if (order.date > b.lastDate) b.lastDate = order.date;
  }
});

// LTV by segment
const segments = {
  "1次": { count: 0, revenue: 0 },
  "2-3次": { count: 0, revenue: 0 },
  "4-6次": { count: 0, revenue: 0 },
  "7-10次": { count: 0, revenue: 0 },
  "11次+": { count: 0, revenue: 0 },
};
buyers.forEach(b => {
  if (b.orders === 1) { segments["1次"].count++; segments["1次"].revenue += b.revenue; }
  else if (b.orders <= 3) { segments["2-3次"].count++; segments["2-3次"].revenue += b.revenue; }
  else if (b.orders <= 6) { segments["4-6次"].count++; segments["4-6次"].revenue += b.revenue; }
  else if (b.orders <= 10) { segments["7-10次"].count++; segments["7-10次"].revenue += b.revenue; }
  else { segments["11次+"].count++; segments["11次+"].revenue += b.revenue; }
});

console.log("購買次數 | 客戶數 | 佔比 | 總營收 | 營收佔比 | 人均LTV");
const totalBuyers = buyers.size;
const totalRev = Array.from(buyers.values()).reduce((s, b) => s + b.revenue, 0);
Object.entries(segments).forEach(([seg, s]) => {
  if (s.count > 0) {
    const custPct = ((s.count / totalBuyers) * 100).toFixed(1);
    const revPct = ((s.revenue / totalRev) * 100).toFixed(1);
    const avgLtv = Math.round(s.revenue / s.count);
    console.log(`${seg}: ${s.count}人 (${custPct}%), $${s.revenue.toLocaleString()} (${revPct}%), LTV $${avgLtv.toLocaleString()}`);
  }
});

// Average days between orders for repeat buyers
console.log("\n=== 回購間隔分析 ===");
let totalGap = 0, gapCount = 0;
buyers.forEach(b => {
  if (b.orders > 1) {
    const sorted = b.dates.sort();
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i-1]);
      const d2 = new Date(sorted[i]);
      const gap = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
      totalGap += gap;
      gapCount++;
    }
  }
});
console.log(`平均回購間隔: ${(totalGap / gapCount).toFixed(1)} 天`);

// Period (期) analysis - how many customers buy across multiple periods
console.log("\n=== 跨期購買分析 ===");
const buyerPeriods = new Map<string, Set<string>>();
data.forEach(row => {
  const order = orders.get(row["訂單編號"]);
  if (order && order.status === "付款成功") {
    const buyer = order.buyer;
    const name = row["品名規格"] as string;
    // Extract period info
    const periodMatch = name.match(/第[一二三四五六七八九十]+期/);
    if (periodMatch) {
      if (!buyerPeriods.has(buyer)) buyerPeriods.set(buyer, new Set());
      buyerPeriods.get(buyer)!.add(periodMatch[0]);
    }
  }
});

const periodDist: Record<number, number> = {};
buyerPeriods.forEach((periods) => {
  const n = periods.size;
  periodDist[n] = (periodDist[n] || 0) + 1;
});

console.log("購買期數 | 客戶數");
Object.entries(periodDist)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .forEach(([n, count]) => {
    console.log(`${n} 期: ${count} 人`);
  });
