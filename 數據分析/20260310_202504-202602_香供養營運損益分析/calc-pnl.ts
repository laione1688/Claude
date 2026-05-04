// ⚠️ FB 廣告費對帳（代理商 $63K vs FB API 實際）已獨立到 compare-ad-spend.ts
//    這裡的 adMonths 仍保留「代理商合約收費」數字（就是實際付出去的錢），
//    要看「合約 vs 平台實花」差額，請跑 `bun compare-ad-spend.ts`
import XLSX from "xlsx";

const workbook = XLSX.readFile("/Users/laichaochang/Downloads/訂單資料表-20260310192411.xlsx");
const sheet = workbook.Sheets["Sheet1"];
const data = XLSX.utils.sheet_to_json(sheet) as any[];

const orders = new Map<string, any>();
data.forEach((row) => {
  const orderId = row["訂單編號"];
  if (!orders.has(orderId)) {
    orders.set(orderId, { date: row["訂單日期"], buyer: row["購買人"], status: row["付款狀態"], amount: row["訂單金額"], items: [] });
  }
  orders.get(orderId)!.items.push({ name: row["品名規格"], qty: row["數量"], price: row["售價"], subtotal: row["商品小計"] });
});

const costPerJin = 180;
let totalRevenue = 0;
let totalCOGS = 0;

data.forEach((row) => {
  const order = orders.get(row["訂單編號"]);
  if (order && order.status === "付款成功") {
    const name = row["品名規格"] as string;
    const qty = row["數量"] as number;
    const subtotal = row["商品小計"] as number;
    totalRevenue += subtotal;

    if (name.includes("2.5斤")) {
      totalCOGS += qty * 2.5 * costPerJin;
    } else if (name.includes("5斤")) {
      totalCOGS += qty * 5 * costPerJin;
    } else if (name.includes("香環")) {
      totalCOGS += subtotal * 0.45;
    } else {
      totalCOGS += subtotal * 0.45;
    }
  }
});

console.log("=== 商品成本精算（立香每台斤 $180）===");
console.log("2.5斤裝: 成本 $450 → 售價 $1,000 → 毛利 $550 (55.0%)");
console.log("5斤裝:   成本 $900 → 售價 $1,800 → 毛利 $900 (50.0%)");
console.log();
console.log("總營收:", "$" + totalRevenue.toLocaleString());
console.log("總商品成本:", "$" + Math.round(totalCOGS).toLocaleString());
console.log("商品毛利:", "$" + Math.round(totalRevenue - totalCOGS).toLocaleString());
console.log("商品毛利率:", ((1 - totalCOGS / totalRevenue) * 100).toFixed(1) + "%");
console.log("商品成本率:", ((totalCOGS / totalRevenue) * 100).toFixed(1) + "%");

// Full P&L
const revenue = totalRevenue;
const adCost = 63000 * 9;
const maintenanceCost = 173250;
const cogs = Math.round(totalCOGS);
const packaging = Math.round(revenue * 0.05);
const paymentFee = Math.round(revenue * 0.025);
const totalCostAll = cogs + adCost + maintenanceCost + packaging + paymentFee;
const netIncome = revenue - totalCostAll;

console.log("\n╔══════════════════════════════════════════╗");
console.log("║     香供養 完整損益表（不含人事）          ║");
console.log("╠══════════════════════════════════════════╣");
console.log("║ 營收（電商後台）    $" + revenue.toLocaleString().padStart(10) + "  100.0% ║");
console.log("║──────────────────────────────────────────║");
console.log("║ 商品成本 (COGS)    -$" + cogs.toLocaleString().padStart(9) + "  " + ((cogs / revenue) * 100).toFixed(1).padStart(5) + "% ║");
console.log("║ 商品毛利            $" + (revenue - cogs).toLocaleString().padStart(9) + "  " + (((revenue - cogs) / revenue) * 100).toFixed(1).padStart(5) + "% ║");
console.log("║──────────────────────────────────────────║");
console.log("║ 廣告費($63K×9月)  -$" + adCost.toLocaleString().padStart(9) + "  " + ((adCost / revenue) * 100).toFixed(1).padStart(5) + "% ║");
console.log("║ 網站維護費         -$" + maintenanceCost.toLocaleString().padStart(9) + "  " + ((maintenanceCost / revenue) * 100).toFixed(1).padStart(5) + "% ║");
console.log("║ 包裝物流(估5%)    -$" + packaging.toLocaleString().padStart(9) + "  " + ((packaging / revenue) * 100).toFixed(1).padStart(5) + "% ║");
console.log("║ 金流手續費(估2.5%) -$" + paymentFee.toLocaleString().padStart(9) + "  " + ((paymentFee / revenue) * 100).toFixed(1).padStart(5) + "% ║");
console.log("║──────────────────────────────────────────║");
console.log("║ 營業淨利(不含人事) " + (netIncome >= 0 ? "+" : "") + "$" + netIncome.toLocaleString().padStart(9) + "  " + ((netIncome / revenue) * 100).toFixed(1).padStart(5) + "% ║");
console.log("╚══════════════════════════════════════════╝");

// Monthly P&L
const monthlyData: Record<string, { revenue: number; cogs: number; orders: Set<string> }> = {};
data.forEach((row) => {
  const order = orders.get(row["訂單編號"]);
  if (order && order.status === "付款成功") {
    const month = order.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, cogs: 0, orders: new Set() };
    monthlyData[month].revenue += row["商品小計"];
    monthlyData[month].orders.add(row["訂單編號"]);

    const name = row["品名規格"] as string;
    const qty = row["數量"] as number;
    if (name.includes("2.5斤")) monthlyData[month].cogs += qty * 450;
    else if (name.includes("5斤")) monthlyData[month].cogs += qty * 900;
    else monthlyData[month].cogs += row["商品小計"] * 0.45;
  }
});

const adMonths: Record<string, number> = {
  "2025-04": 0, "2025-05": 63000, "2025-06": 63000, "2025-07": 63000,
  "2025-08": 63000, "2025-09": 63000, "2025-10": 63000, "2025-11": 63000,
  "2025-12": 63000, "2026-01": 63000, "2026-02": 0,
};
const maintMonths: Record<string, number> = {
  "2025-04": 0, "2025-05": 12600, "2025-06": 12600, "2025-07": 12600,
  "2025-08": 12600, "2025-09": 20475, "2025-10": 20475, "2025-11": 20475,
  "2025-12": 20475, "2026-01": 20475, "2026-02": 20475,
};

console.log("\n=== 月度損益明細 ===");
console.log("月份    | 營收      | COGS     | 毛利     | 毛利率 | 廣告    | 維護    | 其他   | 淨利      | 累計");
let cumNet = 0;
Object.entries(monthlyData)
  .sort()
  .forEach(([month, d]) => {
    const rev = d.revenue;
    const mc = Math.round(d.cogs);
    const gp = rev - mc;
    const gm = ((gp / rev) * 100).toFixed(0);
    const ad = adMonths[month] || 0;
    const mt = maintMonths[month] || 0;
    const other = Math.round(rev * 0.075);
    const net = rev - mc - ad - mt - other;
    cumNet += net;
    console.log(
      `${month} | $${rev.toLocaleString().padStart(8)} | $${mc.toLocaleString().padStart(7)} | $${gp.toLocaleString().padStart(7)} | ${gm.padStart(3)}% | $${ad.toLocaleString().padStart(6)} | $${mt.toLocaleString().padStart(5)} | $${other.toLocaleString().padStart(5)} | ${net >= 0 ? "+" : ""}$${net.toLocaleString().padStart(7)} | ${cumNet >= 0 ? "+" : ""}$${cumNet.toLocaleString()}`
    );
  });

// Break-even
console.log("\n=== 損益平衡分析 ===");
const monthlyFixed = 83475; // ad 63K + maintenance 20.475K
const grossMarginPct = (totalRevenue - totalCOGS) / totalRevenue;
const varCostPct = 0.075;
const contributionPct = grossMarginPct - varCostPct;
const breakeven = monthlyFixed / contributionPct;
console.log("月固定成本 (廣告+維護): $" + monthlyFixed.toLocaleString());
console.log("商品毛利率: " + (grossMarginPct * 100).toFixed(1) + "%");
console.log("變動成本率 (包裝+金流): 7.5%");
console.log("貢獻利潤率: " + (contributionPct * 100).toFixed(1) + "%");
console.log("月營收損益平衡點: $" + Math.round(breakeven).toLocaleString());

const recent3 = (monthlyData["2025-12"].revenue + monthlyData["2026-01"].revenue + monthlyData["2026-02"].revenue) / 3;
console.log("最近 3 月平均月營收: $" + Math.round(recent3).toLocaleString());
console.log("vs 損益平衡點: " + (recent3 > breakeven ? "✅ 已超越！" : "❌ 尚未達到"));
console.log("超越幅度: " + (((recent3 - breakeven) / breakeven) * 100).toFixed(1) + "%");

// What-if with personnel
console.log("\n=== 加入人事成本情境 ===");
[0, 30000, 50000, 80000, 100000].forEach((personnel) => {
  const newFixed = monthlyFixed + personnel;
  const newBE = newFixed / contributionPct;
  const label = personnel === 0 ? "不含人事" : `人事 $${(personnel / 1000).toFixed(0)}K/月`;
  console.log(`${label}: 月損益平衡 $${Math.round(newBE).toLocaleString()} (${recent3 > newBE ? "✅" : "❌"} 目前月營收 $${Math.round(recent3).toLocaleString()})`);
});
