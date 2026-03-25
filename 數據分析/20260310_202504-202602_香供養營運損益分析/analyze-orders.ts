import XLSX from "xlsx";

const workbook = XLSX.readFile("/Users/laichaochang/Downloads/訂單資料表-20260310192411.xlsx");
const sheet = workbook.Sheets["Sheet1"];
const data = XLSX.utils.sheet_to_json(sheet) as any[];

console.log("=== 基本統計 ===");
console.log("總資料列數:", data.length);

// Unique orders
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
console.log("不重複訂單數:", orders.size);

// Payment status
const statusCount: Record<string, number> = {};
orders.forEach((order) => {
  statusCount[order.status] = (statusCount[order.status] || 0) + 1;
});
console.log("\n=== 付款狀態（訂單維度）===");
Object.entries(statusCount).forEach(([k, v]) => console.log(k, ":", v, "筆"));

// Payment methods
const paymentCount: Record<string, number> = {};
const paymentRevenue: Record<string, number> = {};
orders.forEach((order) => {
  if (order.status === "付款成功") {
    const p = order.payment;
    paymentCount[p] = (paymentCount[p] || 0) + 1;
    paymentRevenue[p] = (paymentRevenue[p] || 0) + order.amount;
  }
});
console.log("\n=== 付款方式（僅付款成功）===");
Object.entries(paymentCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => {
    console.log(k, ":", v, "筆,", paymentRevenue[k], "元");
  });

// Total revenue (paid only)
let totalRevenue = 0;
let paidOrders = 0;
orders.forEach((order) => {
  if (order.status === "付款成功") {
    totalRevenue += order.amount;
    paidOrders++;
  }
});
console.log("\n=== 營收統計（付款成功）===");
console.log("付款成功訂單數:", paidOrders);
console.log("總營收:", totalRevenue);
console.log("平均客單價:", Math.round(totalRevenue / paidOrders));

// Monthly breakdown
const monthly: Record<string, { count: number; revenue: number }> = {};
orders.forEach((order) => {
  if (order.status === "付款成功") {
    const month = order.date.substring(0, 7);
    if (!monthly[month]) monthly[month] = { count: 0, revenue: 0 };
    monthly[month].count++;
    monthly[month].revenue += order.amount;
  }
});
console.log("\n=== 月度明細 ===");
let cumRevenue = 0;
Object.entries(monthly)
  .sort()
  .forEach(([month, d]) => {
    cumRevenue += d.revenue;
    console.log(
      month,
      ": 訂單",
      d.count,
      "筆, 營收",
      d.revenue.toLocaleString(),
      ", 客單價",
      Math.round(d.revenue / d.count),
      ", 累計",
      cumRevenue.toLocaleString()
    );
  });

// Unique buyers
const buyers = new Map<string, { orders: number; revenue: number; firstDate: string; lastDate: string }>();
orders.forEach((order) => {
  if (order.status === "付款成功") {
    const name = order.buyer;
    if (!buyers.has(name)) {
      buyers.set(name, { orders: 0, revenue: 0, firstDate: order.date, lastDate: order.date });
    }
    const b = buyers.get(name)!;
    b.orders++;
    b.revenue += order.amount;
    if (order.date < b.firstDate) b.firstDate = order.date;
    if (order.date > b.lastDate) b.lastDate = order.date;
  }
});

console.log("\n=== 客戶分析 ===");
console.log("不重複客戶數:", buyers.size);

// Repeat vs new
let repeatBuyers = 0;
let repeatRevenue = 0;
let newRevenue = 0;
let repeatOrders = 0;
buyers.forEach((b) => {
  if (b.orders > 1) {
    repeatBuyers++;
    repeatRevenue += b.revenue;
    repeatOrders += b.orders;
  } else {
    newRevenue += b.revenue;
  }
});
const newBuyers = buyers.size - repeatBuyers;
console.log("新客戶（僅 1 筆訂單）:", newBuyers, "人, 營收", newRevenue.toLocaleString());
console.log(
  "回購客戶（≥2 筆訂單）:",
  repeatBuyers,
  "人 (",
  ((repeatBuyers / buyers.size) * 100).toFixed(1) + "%",
  "), 營收",
  repeatRevenue.toLocaleString(),
  "(",
  ((repeatRevenue / totalRevenue) * 100).toFixed(1) + "%",
  ")"
);
console.log("回購客戶平均訂單數:", (repeatOrders / repeatBuyers).toFixed(1));

// Top repeat buyers
console.log("\n=== 回購 Top 15 ===");
const sortedBuyers = Array.from(buyers.entries())
  .filter(([, b]) => b.orders > 1)
  .sort((a, b) => b[1].revenue - a[1].revenue);
sortedBuyers.slice(0, 15).forEach(([name, b], i) => {
  console.log(
    `${i + 1}. ${name}: ${b.orders}筆, $${b.revenue.toLocaleString()}, 首購 ${b.firstDate.substring(0, 10)}, 末購 ${b.lastDate.substring(0, 10)}`
  );
});

// Product analysis
const products = new Map<string, { qty: number; revenue: number; orders: number }>();
data.forEach((row) => {
  // Find order status
  const orderId = row["訂單編號"];
  const order = orders.get(orderId);
  if (order && order.status === "付款成功") {
    const name = row["品名規格"];
    if (!products.has(name)) products.set(name, { qty: 0, revenue: 0, orders: 0 });
    const p = products.get(name)!;
    p.qty += row["數量"];
    p.revenue += row["商品小計"];
    p.orders++;
  }
});

console.log("\n=== 商品銷售排行（依營收）Top 20 ===");
Array.from(products.entries())
  .sort((a, b) => b[1].revenue - a[1].revenue)
  .slice(0, 20)
  .forEach(([name, p], i) => {
    console.log(`${i + 1}. ${name}`);
    console.log(`   數量: ${p.qty}, 營收: $${p.revenue.toLocaleString()}, 訂單數: ${p.orders}`);
  });

// Order frequency distribution
const freqDist: Record<number, number> = {};
buyers.forEach((b) => {
  freqDist[b.orders] = (freqDist[b.orders] || 0) + 1;
});
console.log("\n=== 購買頻次分布 ===");
Object.entries(freqDist)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .forEach(([freq, count]) => {
    console.log(`${freq} 次購買: ${count} 人`);
  });

// Average order value distribution
const aovBuckets: Record<string, number> = {
  "$0-500": 0,
  "$501-1000": 0,
  "$1001-2000": 0,
  "$2001-3000": 0,
  "$3001-5000": 0,
  "$5001-10000": 0,
  "$10001+": 0,
};
orders.forEach((order) => {
  if (order.status === "付款成功") {
    const a = order.amount;
    if (a <= 500) aovBuckets["$0-500"]++;
    else if (a <= 1000) aovBuckets["$501-1000"]++;
    else if (a <= 2000) aovBuckets["$1001-2000"]++;
    else if (a <= 3000) aovBuckets["$2001-3000"]++;
    else if (a <= 5000) aovBuckets["$3001-5000"]++;
    else if (a <= 10000) aovBuckets["$5001-10000"]++;
    else aovBuckets["$10001+"]++;
  }
});
console.log("\n=== 訂單金額分布 ===");
Object.entries(aovBuckets).forEach(([k, v]) => {
  const pct = ((v / paidOrders) * 100).toFixed(1);
  console.log(`${k}: ${v} 筆 (${pct}%)`);
});

// Cohort analysis - when did first-time buyers first purchase, and did they come back?
const cohorts: Record<string, { total: number; returned: number; returnRevenue: number }> = {};
buyers.forEach((b) => {
  const cohortMonth = b.firstDate.substring(0, 7);
  if (!cohorts[cohortMonth]) cohorts[cohortMonth] = { total: 0, returned: 0, returnRevenue: 0 };
  cohorts[cohortMonth].total++;
  if (b.orders > 1) {
    cohorts[cohortMonth].returned++;
    cohorts[cohortMonth].returnRevenue += b.revenue;
  }
});
console.log("\n=== 月度獲客留存（Cohort）===");
Object.entries(cohorts)
  .sort()
  .forEach(([month, c]) => {
    const retRate = ((c.returned / c.total) * 100).toFixed(1);
    console.log(
      `${month}: 新客 ${c.total} 人, 回購 ${c.returned} 人 (${retRate}%), 回購客營收 $${c.returnRevenue.toLocaleString()}`
    );
  });
