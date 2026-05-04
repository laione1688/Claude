/**
 * 從 Notion 訂單資料庫分析新客/回購客
 * 使用 Notion API 直接查詢
 */

const NOTION_TOKEN = process.env.NOTION_API_KEY || "";
const DATA_SOURCE_ID = "33040e35-fb3a-80b5-a3fb-000bf87ea5ed";

interface NotionPage {
  id: string;
  properties: {
    訂單編號: { title: Array<{ plain_text: string }> };
    姓名: { rich_text: Array<{ plain_text: string }> };
    購買日期: { date: { start: string } | null };
    產品名稱: { rich_text: Array<{ plain_text: string }> };
    產品編號: { rich_text: Array<{ plain_text: string }> };
    付款方式: { select: { name: string } | null };
    末四碼: { url: string | null };
  };
}

async function queryAllPages(): Promise<NotionPage[]> {
  const allPages: NotionPage[] = [];
  let hasMore = true;
  let startCursor: string | undefined;
  let page = 0;

  while (hasMore) {
    page++;
    const body: any = { page_size: 100 };
    if (startCursor) body.start_cursor = startCursor;

    const resp = await fetch(
      `https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2025-09-03",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Notion API error: ${resp.status} ${err}`);
    }

    const data = await resp.json();
    allPages.push(...(data.results as NotionPage[]));
    hasMore = data.has_more;
    startCursor = data.next_cursor;
    process.stdout.write(`\r  已讀取 ${allPages.length} 筆訂單（第 ${page} 頁）...`);
  }

  console.log(`\n  ✅ 共讀取 ${allPages.length} 筆訂單`);
  return allPages;
}

function extractField(page: NotionPage, field: string): string {
  const props = page.properties as any;
  const p = props[field];
  if (!p) return "";

  if (p.type === "title") return p.title?.[0]?.plain_text || "";
  if (p.type === "rich_text") return p.rich_text?.[0]?.plain_text || "";
  if (p.type === "date") return p.date?.start || "";
  if (p.type === "select") return p.select?.name || "";
  if (p.type === "url") return p.url || "";
  return "";
}

function fmtNum(n: number): string {
  return n.toLocaleString("zh-TW");
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "—";
  return ((num / denom) * 100).toFixed(1) + "%";
}

async function main() {
  console.log("🔍 從 Notion 訂單資料庫分析新客/回購客...\n");

  if (!NOTION_TOKEN) {
    console.error("❌ 需要 NOTION_API_KEY 環境變數");
    process.exit(1);
  }

  // 拉取所有訂單
  console.log("📥 正在讀取 Notion 訂單資料庫...");
  const pages = await queryAllPages();

  // 解析訂單
  type Order = {
    orderId: string;
    name: string;
    date: string;
    product: string;
    productCode: string;
    payment: string;
    lastFour: string;
  };

  const orders: Order[] = pages
    .map((p) => ({
      orderId: extractField(p, "訂單編號"),
      name: extractField(p, "姓名"),
      date: extractField(p, "購買日期"),
      product: extractField(p, "產品名稱"),
      productCode: extractField(p, "產品編號"),
      payment: extractField(p, "付款方式"),
      lastFour: extractField(p, "末四碼"),
    }))
    .filter((o) => o.name && o.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\n📊 有效訂單：${fmtNum(orders.length)} 筆\n`);

  // ========= 1. 客戶分析 =========
  // 用姓名識別客戶（末四碼可輔助）
  const customerOrders: Record<string, Order[]> = {};
  for (const o of orders) {
    const key = o.name; // 用姓名作為主鍵
    if (!customerOrders[key]) customerOrders[key] = [];
    customerOrders[key].push(o);
  }

  const totalCustomers = Object.keys(customerOrders).length;
  const oneTimers = Object.values(customerOrders).filter((o) => o.length === 1);
  const repeaters = Object.values(customerOrders).filter((o) => o.length >= 2);

  console.log("=".repeat(80));
  console.log("📊 一、客戶概覽");
  console.log("=".repeat(80));
  console.log(`\n  總訂單數：${fmtNum(orders.length)}`);
  console.log(`  不重複客戶：${fmtNum(totalCustomers)}`);
  console.log(`  一次性客戶：${fmtNum(oneTimers.length)}（${pct(oneTimers.length, totalCustomers)}）`);
  console.log(`  回購客戶（2次+）：${fmtNum(repeaters.length)}（${pct(repeaters.length, totalCustomers)}）`);
  console.log(`  平均每人訂單數：${(orders.length / totalCustomers).toFixed(1)}`);

  // ========= 2. 回購客分層 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 二、回購客戶分層");
  console.log("=".repeat(80));

  const tiers = [
    { label: "1 次（新客）", min: 1, max: 1 },
    { label: "2-3 次", min: 2, max: 3 },
    { label: "4-6 次", min: 4, max: 6 },
    { label: "7-10 次", min: 7, max: 10 },
    { label: "11+ 次（超忠實）", min: 11, max: 999 },
  ];

  console.log(
    "\n" + "購買次數".padEnd(20) + "人數".padStart(8) + "佔比".padStart(8) +
    "訂單數".padStart(8) + "訂單佔比".padStart(10)
  );
  console.log("-".repeat(54));

  for (const tier of tiers) {
    const customers = Object.values(customerOrders).filter(
      (o) => o.length >= tier.min && o.length <= tier.max
    );
    const orderCount = customers.reduce((sum, c) => sum + c.length, 0);
    console.log(
      tier.label.padEnd(20) +
      fmtNum(customers.length).padStart(8) +
      pct(customers.length, totalCustomers).padStart(8) +
      fmtNum(orderCount).padStart(8) +
      pct(orderCount, orders.length).padStart(10)
    );
  }

  // ========= 3. TOP 回購客 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 三、TOP 20 回購客戶");
  console.log("=".repeat(80));

  const topCustomers = Object.entries(customerOrders)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  console.log(
    "\n" + "#".padStart(3) + "  姓名".padEnd(12) + "訂單數".padStart(8) +
    "首購".padStart(14) + "最近購買".padStart(14) + "天數跨度".padStart(10) +
    "平均間隔".padStart(10)
  );
  console.log("-".repeat(71));

  for (let i = 0; i < topCustomers.length; i++) {
    const [name, customerOrd] = topCustomers[i];
    const first = customerOrd[0].date;
    const last = customerOrd[customerOrd.length - 1].date;
    const daySpan = Math.round(
      (new Date(last).getTime() - new Date(first).getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgInterval = customerOrd.length > 1 ? Math.round(daySpan / (customerOrd.length - 1)) : 0;

    console.log(
      `${i + 1}`.padStart(3) +
      `  ${name}`.padEnd(12) +
      fmtNum(customerOrd.length).padStart(8) +
      first.padStart(14) +
      last.padStart(14) +
      `${daySpan} 天`.padStart(10) +
      (avgInterval > 0 ? `${avgInterval} 天` : "—").padStart(10)
    );
  }

  // ========= 4. 每月新客/回購趨勢 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 四、每月新客 vs 回購客趨勢");
  console.log("=".repeat(80));

  // 追蹤每個客戶的首購月份
  const customerFirstMonth: Record<string, string> = {};
  for (const [name, custOrders] of Object.entries(customerOrders)) {
    customerFirstMonth[name] = custOrders[0].date.substring(0, 7); // YYYY-MM
  }

  // 按月統計
  const monthlyStats: Record<string, { total: number; newCustomers: Set<string>; returning: Set<string>; orders: number }> = {};

  for (const o of orders) {
    const month = o.date.substring(0, 7);
    if (!monthlyStats[month]) {
      monthlyStats[month] = { total: 0, newCustomers: new Set(), returning: new Set(), orders: 0 };
    }
    monthlyStats[month].orders++;

    const isNew = customerFirstMonth[o.name] === month;
    if (isNew) {
      monthlyStats[month].newCustomers.add(o.name);
    } else {
      monthlyStats[month].returning.add(o.name);
    }
    monthlyStats[month].total++;
  }

  const months = Object.keys(monthlyStats).sort();

  console.log(
    "\n" + "月份".padEnd(10) + "訂單數".padStart(8) +
    "新客人數".padStart(10) + "回購人數".padStart(10) +
    "新客佔比".padStart(10) + "回購佔比".padStart(10)
  );
  console.log("-".repeat(58));

  let totalNewAll = 0;
  let totalRetAll = 0;

  for (const m of months) {
    const s = monthlyStats[m];
    const newCount = s.newCustomers.size;
    const retCount = s.returning.size;
    const totalPeople = newCount + retCount;
    totalNewAll += newCount;
    totalRetAll += retCount;

    console.log(
      m.padEnd(10) +
      fmtNum(s.orders).padStart(8) +
      fmtNum(newCount).padStart(10) +
      fmtNum(retCount).padStart(10) +
      pct(newCount, totalPeople).padStart(10) +
      pct(retCount, totalPeople).padStart(10)
    );
  }

  console.log("-".repeat(58));
  console.log(
    "合計".padEnd(10) +
    fmtNum(orders.length).padStart(8) +
    fmtNum(totalNewAll).padStart(10) +
    fmtNum(totalRetAll).padStart(10) +
    pct(totalNewAll, totalNewAll + totalRetAll).padStart(10) +
    pct(totalRetAll, totalNewAll + totalRetAll).padStart(10)
  );

  // ========= 5. 產品分析 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 五、產品購買排行");
  console.log("=".repeat(80));

  const productCount: Record<string, number> = {};
  for (const o of orders) {
    const shortProduct = o.product.length > 50 ? o.product.substring(0, 50) + "…" : o.product;
    productCount[shortProduct] = (productCount[shortProduct] || 0) + 1;
  }

  const sortedProducts = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 20);

  console.log("\n" + "產品名稱".padEnd(55) + "訂單數".padStart(8) + "佔比".padStart(8));
  console.log("-".repeat(71));

  for (const [product, count] of sortedProducts) {
    console.log(
      product.padEnd(55) +
      fmtNum(count).padStart(8) +
      pct(count, orders.length).padStart(8)
    );
  }

  // ========= 6. 付款方式 =========
  console.log("\n" + "=".repeat(80));
  console.log("📊 六、付款方式分佈");
  console.log("=".repeat(80));

  const paymentCount: Record<string, number> = {};
  for (const o of orders) {
    const pay = o.payment || "未知";
    paymentCount[pay] = (paymentCount[pay] || 0) + 1;
  }

  console.log("\n" + "付款方式".padEnd(20) + "訂單數".padStart(8) + "佔比".padStart(8));
  console.log("-".repeat(36));

  for (const [pay, count] of Object.entries(paymentCount).sort((a, b) => b[1] - a[1])) {
    console.log(pay.padEnd(20) + fmtNum(count).padStart(8) + pct(count, orders.length).padStart(8));
  }

  console.log("\n✅ Notion 訂單分析完成！");
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
