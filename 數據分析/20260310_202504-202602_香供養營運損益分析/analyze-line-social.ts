/**
 * LINE Official Account 社群數據分析
 * 抓取：好友趨勢、封鎖率、人口統計、訊息統計
 */

// 客戶端帳號（明心福旺閣 @me1314888）
const LINE_TOKEN =
  "Dd85NekljKhcwLhU7tw1zi2l8kyrC2ooMdg+C7IFAbOSPIPUnSVhz4RI0qso0yeJt4AjEe4Qtaa+N5GqK0aBrfdNQnTnQdPdFr8ku5KynpDCs8fbJ0k8XjVRheJvihir0mPY6iBQxMvNxn6aDFUd+QdB04t89/1O/w1cDnyilFU=";

const LINE_API = "https://api.line.me/v2/bot";

function headers() {
  return {
    Authorization: `Bearer ${LINE_TOKEN}`,
  };
}

function fmtNum(n: number): string {
  return n.toLocaleString("zh-TW");
}

function fmtDate(d: string): string {
  return `${d.substring(0, 4)}/${d.substring(4, 6)}/${d.substring(6, 8)}`;
}

// ==================== API 呼叫 ====================

async function getBotInfo() {
  const res = await fetch(`${LINE_API}/info`, { headers: headers() });
  return res.json();
}

async function getFollowerStats(date: string) {
  const res = await fetch(
    `${LINE_API}/insight/followers?date=${date}`,
    { headers: headers() }
  );
  return res.json();
}

async function getMessageStats(date: string) {
  const res = await fetch(
    `${LINE_API}/insight/message/delivery?date=${date}`,
    { headers: headers() }
  );
  return res.json();
}

async function getDemographic() {
  const res = await fetch(`${LINE_API}/insight/demographic`, {
    headers: headers(),
  });
  return res.json();
}

async function getQuota() {
  const res = await fetch(`${LINE_API}/message/quota`, {
    headers: headers(),
  });
  return res.json();
}

async function getQuotaConsumption() {
  const res = await fetch(`${LINE_API}/message/quota/consumption`, {
    headers: headers(),
  });
  return res.json();
}

async function getFollowerIds(): Promise<string[]> {
  const allIds: string[] = [];
  let next: string | undefined;
  do {
    const url = next
      ? `${LINE_API}/followers/ids?start=${next}`
      : `${LINE_API}/followers/ids`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) break;
    const data = (await res.json()) as { userIds: string[]; next?: string };
    allIds.push(...data.userIds);
    next = data.next;
  } while (next);
  return allIds;
}

// ==================== 日期工具 ====================

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

function dateRange(days: number, interval: number = 1): string[] {
  const dates: string[] = [];
  for (let i = days; i >= 0; i -= interval) {
    dates.push(dateStr(i));
  }
  return dates;
}

// ==================== 主程式 ====================

async function main() {
  console.log("🔍 正在抓取 LINE 官方帳號數據...\n");

  // 並行抓取基本數據
  const [botInfo, demographic, quota, consumption] = await Promise.all([
    getBotInfo(),
    getDemographic(),
    getQuota(),
    getQuotaConsumption(),
  ]);

  // ========= 1. 帳號概覽 =========
  console.log("=".repeat(70));
  console.log("📊 一、LINE 官方帳號概覽");
  console.log("=".repeat(70));
  console.log(`  帳號名稱：${botInfo.displayName}`);
  console.log(`  Basic ID：${botInfo.basicId}`);
  console.log(`  Premium ID：${botInfo.premiumId || "—"}`);
  console.log(`  聊天模式：${botInfo.chatMode}`);
  console.log(`  訊息配額：${fmtNum(quota.value)} 則/月（${quota.type}）`);
  console.log(`  本月已用：${fmtNum(consumption.totalUsage || 0)} 則`);

  // ========= 2. 好友趨勢 =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 二、好友趨勢");
  console.log("=".repeat(70));

  // 抓近 60 天，每 5 天一個點
  const trendDates = dateRange(60, 5);
  const trendData: Array<{
    date: string;
    followers: number;
    reaches: number;
    blocks: number;
  }> = [];

  for (const d of trendDates) {
    const stats = await getFollowerStats(d);
    if (stats.status === "ready") {
      trendData.push({
        date: d,
        followers: stats.followers || 0,
        reaches: stats.targetedReaches || 0,
        blocks: stats.blocks || 0,
      });
    }
  }

  if (trendData.length > 0) {
    console.log(
      "\n" +
        "日期".padEnd(14) +
        "好友數".padStart(8) +
        "有效觸及".padStart(10) +
        "封鎖數".padStart(8) +
        "封鎖率".padStart(8) +
        "較前期".padStart(8)
    );
    console.log("-".repeat(58));

    for (let i = 0; i < trendData.length; i++) {
      const t = trendData[i];
      const blockRate =
        t.followers > 0
          ? ((t.blocks / t.followers) * 100).toFixed(1) + "%"
          : "—";
      const prev = i > 0 ? trendData[i - 1] : null;
      const delta = prev ? t.followers - prev.followers : 0;
      const deltaStr = prev
        ? `${delta >= 0 ? "+" : ""}${delta}`
        : "—";

      console.log(
        fmtDate(t.date).padEnd(14) +
          fmtNum(t.followers).padStart(8) +
          fmtNum(t.reaches).padStart(10) +
          fmtNum(t.blocks).padStart(8) +
          blockRate.padStart(8) +
          deltaStr.padStart(8)
      );
    }

    // 總結
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    const growth = last.followers - first.followers;
    const growthPct =
      first.followers > 0
        ? ((growth / first.followers) * 100).toFixed(1)
        : "0";
    console.log(
      `\n  📈 60 天好友成長：${first.followers} → ${last.followers}（+${growth}，+${growthPct}%）`
    );
    console.log(
      `  📊 目前封鎖率：${((last.blocks / last.followers) * 100).toFixed(1)}%（${last.blocks}/${last.followers}）`
    );
    console.log(
      `  📊 有效觸及率：${((last.reaches / last.followers) * 100).toFixed(1)}%（${last.reaches}/${last.followers}）`
    );
  }

  // ========= 3. 每日好友變化（近 7 天） =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 三、每日好友變化（近 7 天）");
  console.log("=".repeat(70));

  const dailyDates = dateRange(7, 1);
  const dailyData: Array<{
    date: string;
    followers: number;
    reaches: number;
    blocks: number;
  }> = [];

  for (const d of dailyDates) {
    const stats = await getFollowerStats(d);
    if (stats.status === "ready") {
      dailyData.push({
        date: d,
        followers: stats.followers || 0,
        reaches: stats.targetedReaches || 0,
        blocks: stats.blocks || 0,
      });
    }
  }

  if (dailyData.length > 1) {
    console.log(
      "\n" +
        "日期".padEnd(14) +
        "好友數".padStart(8) +
        "日增".padStart(6) +
        "封鎖".padStart(6)
    );
    console.log("-".repeat(36));

    for (let i = 0; i < dailyData.length; i++) {
      const t = dailyData[i];
      const prev = i > 0 ? dailyData[i - 1] : null;
      const newFollows = prev ? t.followers - prev.followers : 0;
      const newBlocks = prev ? t.blocks - prev.blocks : 0;

      console.log(
        fmtDate(t.date).padEnd(14) +
          fmtNum(t.followers).padStart(8) +
          (prev ? `${newFollows >= 0 ? "+" : ""}${newFollows}` : "—").padStart(6) +
          (prev ? `${newBlocks >= 0 ? "+" : ""}${newBlocks}` : "—").padStart(6)
      );
    }
  }

  // ========= 4. 訊息統計（近 7 天） =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 四、訊息統計（近 7 天）");
  console.log("=".repeat(70));

  const msgDates = dateRange(7, 1);
  let totalBroadcast = 0;
  let totalAutoResponse = 0;
  let totalChat = 0;
  let totalWelcome = 0;

  console.log(
    "\n" +
      "日期".padEnd(14) +
      "群發".padStart(6) +
      "自動回覆".padStart(10) +
      "1對1".padStart(8) +
      "歡迎".padStart(6)
  );
  console.log("-".repeat(46));

  for (const d of msgDates) {
    const stats = await getMessageStats(d);
    if (stats.status === "ready") {
      const broadcast = stats.broadcast || 0;
      const auto = stats.autoResponse || 0;
      const chat = stats.chat || 0;
      const welcome = stats.welcomeResponse || 0;

      totalBroadcast += broadcast;
      totalAutoResponse += auto;
      totalChat += chat;
      totalWelcome += welcome;

      console.log(
        fmtDate(d).padEnd(14) +
          fmtNum(broadcast).padStart(6) +
          fmtNum(auto).padStart(10) +
          fmtNum(chat).padStart(8) +
          fmtNum(welcome).padStart(6)
      );
    }
  }

  console.log("-".repeat(46));
  console.log(
    "合計".padEnd(14) +
      fmtNum(totalBroadcast).padStart(6) +
      fmtNum(totalAutoResponse).padStart(10) +
      fmtNum(totalChat).padStart(8) +
      fmtNum(totalWelcome).padStart(6)
  );

  // ========= 5. 人口統計 =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 五、好友人口統計");
  console.log("=".repeat(70));

  if (demographic?.available) {
    // 性別
    if (demographic.genders) {
      console.log("\n  【性別分佈】");
      const genderEmoji: Record<string, string> = {
        female: "👩",
        male: "👨",
        unknown: "❓",
      };
      const genderLabel: Record<string, string> = {
        female: "女性",
        male: "男性",
        unknown: "未知",
      };
      for (const g of demographic.genders) {
        const bar = "█".repeat(Math.round(g.percentage / 2));
        console.log(
          `  ${genderEmoji[g.gender] || "❓"} ${(genderLabel[g.gender] || g.gender).padEnd(6)} ${g.percentage.toFixed(1).padStart(5)}% ${bar}`
        );
      }
    }

    // 年齡
    if (demographic.ages) {
      console.log("\n  【年齡分佈】");
      const ageLabel: Record<string, string> = {
        "from0to14": "0-14",
        "from15to19": "15-19",
        "from20to24": "20-24",
        "from25to29": "25-29",
        "from30to34": "30-34",
        "from35to39": "35-39",
        "from40to44": "40-44",
        "from45to49": "45-49",
        "from50to54": "50-54",
        "from55to59": "55-59",
        "from60to64": "60-64",
        "from65to69": "65-69",
        unknown: "未知",
      };
      for (const a of demographic.ages) {
        if (a.percentage > 0) {
          const bar = "█".repeat(Math.round(a.percentage / 2));
          console.log(
            `  ${(ageLabel[a.age] || a.age).padEnd(8)} ${a.percentage.toFixed(1).padStart(5)}% ${bar}`
          );
        }
      }
    }

    // 地區
    if (demographic.areas) {
      console.log("\n  【地區分佈 TOP 10】");
      const sorted = [...demographic.areas].sort(
        (a: any, b: any) => b.percentage - a.percentage
      );
      for (const a of sorted.slice(0, 10)) {
        const bar = "█".repeat(Math.round(a.percentage / 2));
        console.log(
          `  ${a.area.padEnd(15)} ${a.percentage.toFixed(1).padStart(5)}% ${bar}`
        );
      }
    }

    // 作業系統
    if (demographic.appTypes) {
      console.log("\n  【裝置分佈】");
      const osEmoji: Record<string, string> = {
        ios: "🍎",
        android: "🤖",
        windows: "💻",
        mac: "🖥️",
        undefined: "❓",
      };
      for (const o of demographic.appTypes) {
        const bar = "█".repeat(Math.round(o.percentage / 2));
        console.log(
          `  ${osEmoji[o.appType] || "❓"} ${o.appType.padEnd(10)} ${o.percentage.toFixed(1).padStart(5)}% ${bar}`
        );
      }
    }
  } else {
    console.log("\n  ⚠️ 人口統計不可用（需要好友數 > 20 才會開啟）");
  }

  // ========= 6. 健康指標總結 =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 六、LINE 社群健康指標總結");
  console.log("=".repeat(70));

  const latest = dailyData.length > 0 ? dailyData[dailyData.length - 1] : null;
  const blockRate = latest && latest.followers > 0
    ? (latest.blocks / latest.followers) * 100
    : 0;
  const reachRate = latest && latest.followers > 0
    ? (latest.reaches / latest.followers) * 100
    : 0;

  if (latest) {
    console.log(`
  ┌─────────────────────────────────────────────────┐
  │ 帳號            ${botInfo.displayName.padEnd(20)}          │
  │ Premium ID      ${(botInfo.premiumId || "—").padEnd(20)}          │
  │ 好友數          ${fmtNum(latest.followers).padStart(10)}                   │
  │ 有效觸及        ${fmtNum(latest.reaches).padStart(10)}                   │
  │ 封鎖數          ${fmtNum(latest.blocks).padStart(10)}                   │
  │ 封鎖率          ${blockRate.toFixed(1).padStart(9)}%                   │
  │ 有效觸及率      ${reachRate.toFixed(1).padStart(9)}%                   │
  │ 訊息配額        ${fmtNum(quota.value).padStart(10)} 則/月              │
  │ 本月已用        ${fmtNum(consumption.totalUsage || 0).padStart(10)} 則                 │
  └─────────────────────────────────────────────────┘`);
  }

  // 健康診斷
  console.log("\n  📋 健康診斷：");
  if (blockRate < 10) console.log("  🟢 封鎖率 < 10% — 內容耐受度高");
  else if (blockRate < 20) console.log("  🟡 封鎖率 10-20% — 注意推送頻率");
  else console.log("  🔴 封鎖率 > 20% — 需降低推送頻率或提升內容品質");

  if (reachRate > 85) console.log("  🟢 有效觸及率 > 85% — 訊息送達率優秀");
  else if (reachRate > 70) console.log("  🟡 有效觸及率 70-85% — 尚可");
  else console.log("  🔴 有效觸及率 < 70% — 太多封鎖用戶");

  const growthRate = trendData.length >= 2
    ? ((trendData[trendData.length - 1].followers - trendData[0].followers) / trendData[0].followers) * 100
    : 0;
  if (growthRate > 10) console.log(`  🟢 60 天成長率 ${growthRate.toFixed(1)}% — 成長快速`);
  else if (growthRate > 3) console.log(`  🟡 60 天成長率 ${growthRate.toFixed(1)}% — 穩定成長`);
  else console.log(`  🔴 60 天成長率 ${growthRate.toFixed(1)}% — 成長停滯`);

  console.log("\n✅ LINE 社群分析完成！");
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
