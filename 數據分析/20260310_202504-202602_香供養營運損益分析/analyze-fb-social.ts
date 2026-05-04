/**
 * FB 粉專社群數據分析（完整版）
 * 抓取：貼文互動、Reels 觀看、粉絲趨勢、粉專 Insights
 */

const FB_TOKEN = process.env.FB_ACCESS_TOKEN || "";
const PAGE_ID = "567817419756095";
const API_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

// ==================== API 呼叫 ====================

async function fbGet(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  url.searchParams.set("access_token", FB_TOKEN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  return res.json();
}

async function getPageToken(): Promise<string> {
  const data = await fbGet("/me/accounts");
  return data.data?.[0]?.access_token || FB_TOKEN;
}

// ==================== 數據抓取 ====================

async function getPageInfo(pageToken: string) {
  return fbGet(`/${PAGE_ID}`, {
    fields: "name,fan_count,followers_count,talking_about_count",
    access_token: pageToken,
  });
}

async function getFollowerTrend(pageToken: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const until = new Date();
  return fbGet(`/${PAGE_ID}/insights`, {
    metric: "page_follows,page_daily_follows,page_daily_unfollows_unique",
    period: "day",
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
    access_token: pageToken,
  });
}

async function getPageInsights(pageToken: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const until = new Date();
  const metrics = [
    "page_posts_impressions",
    "page_posts_impressions_unique",
    "page_posts_impressions_paid",
    "page_posts_impressions_organic",
    "page_impressions_unique",
    "page_impressions_paid_unique",
    "page_impressions_viral_unique",
    "page_post_engagements",
    "page_views_total",
    "page_actions_post_reactions_total",
    "page_video_views",
    "page_video_views_paid",
    "page_video_views_organic",
    "page_video_view_time",
  ].join(",");

  return fbGet(`/${PAGE_ID}/insights`, {
    metric: metrics,
    period: "day",
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
    access_token: pageToken,
  });
}

async function getPosts(pageToken: string, limit: number = 30) {
  return fbGet(`/${PAGE_ID}/feed`, {
    fields:
      "message,created_time,likes.summary(true),comments.summary(true),shares,permalink_url",
    limit: String(limit),
    access_token: pageToken,
  });
}

async function getVideos(pageToken: string, limit: number = 20) {
  return fbGet(`/${PAGE_ID}/videos`, {
    fields: "title,description,length,created_time,views",
    limit: String(limit),
    access_token: pageToken,
  });
}

// ==================== 格式化 ====================

function fmtNum(n: number): string {
  return n.toLocaleString("zh-TW");
}

function truncate(s: string, len: number = 40): string {
  if (!s) return "(無文字)";
  const first = s.split("\n")[0];
  return first.length > len ? first.substring(0, len) + "…" : first;
}

function sumMetricValues(metric: any): number {
  if (!metric?.values) return 0;
  return metric.values.reduce((sum: number, v: any) => {
    const val = v.value;
    if (typeof val === "number") return sum + val;
    if (typeof val === "object" && val !== null)
      return sum + Object.values(val).reduce((s: number, n: any) => s + (n || 0), 0);
    return sum;
  }, 0);
}

function getRecentValues(metric: any, days: number = 7): any[] {
  if (!metric?.values) return [];
  return metric.values.slice(-days);
}

// ==================== 主程式 ====================

async function main() {
  console.log("🔍 正在抓取 FB 粉專社群數據（完整版）...\n");

  const pageToken = await getPageToken();

  // 並行抓取所有數據
  const [pageInfo, followerTrend, insights, posts, videos] = await Promise.all([
    getPageInfo(pageToken),
    getFollowerTrend(pageToken, 30),
    getPageInsights(pageToken, 30),
    getPosts(pageToken, 30),
    getVideos(pageToken, 20),
  ]);

  // 整理 insights 為 map
  const insightMap: Record<string, any> = {};
  if (insights?.data) {
    for (const m of insights.data) {
      insightMap[m.name] = m;
    }
  }

  // ========= 1. 粉專概覽 =========
  console.log("=".repeat(70));
  console.log("📊 一、粉專概覽");
  console.log("=".repeat(70));
  console.log(`  粉專名稱：${pageInfo.name}`);
  console.log(`  粉絲數：${fmtNum(pageInfo.fan_count)}`);
  console.log(`  追蹤者：${fmtNum(pageInfo.followers_count)}`);
  console.log(`  討論中：${fmtNum(pageInfo.talking_about_count)}`);

  // ========= 2. 粉專 Insights（30 天） =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 二、粉專 Insights（30 天累計）");
  console.log("=".repeat(70));

  const insightLabels: [string, string][] = [
    ["page_posts_impressions", "貼文總曝光"],
    ["page_posts_impressions_unique", "貼文觸及人數"],
    ["page_posts_impressions_paid", "付費曝光"],
    ["page_posts_impressions_organic", "自然曝光"],
    ["page_impressions_unique", "粉專觸及人數"],
    ["page_impressions_paid_unique", "付費觸及人數"],
    ["page_impressions_viral_unique", "病毒觸及人數"],
    ["page_post_engagements", "貼文互動次數"],
    ["page_views_total", "粉專頁面瀏覽"],
    ["page_video_views", "影片觀看"],
    ["page_video_views_paid", "影片觀看(付費)"],
    ["page_video_views_organic", "影片觀看(自然)"],
  ];

  console.log();
  for (const [key, label] of insightLabels) {
    if (insightMap[key]) {
      const total = sumMetricValues(insightMap[key]);
      console.log(`  ${label.padEnd(20)}${fmtNum(total).padStart(12)}`);
    }
  }

  // 付費 vs 自然佔比
  const totalImpressions = sumMetricValues(insightMap["page_posts_impressions"]);
  const paidImpressions = sumMetricValues(insightMap["page_posts_impressions_paid"]);
  const organicImpressions = sumMetricValues(insightMap["page_posts_impressions_organic"]);
  if (totalImpressions > 0) {
    const paidPct = (paidImpressions / totalImpressions) * 100;
    const orgPct = (organicImpressions / totalImpressions) * 100;
    console.log(`\n  📊 曝光來源佔比：`);
    console.log(`     付費：${paidPct.toFixed(1)}%（${fmtNum(paidImpressions)}）`);
    console.log(`     自然：${orgPct.toFixed(1)}%（${fmtNum(organicImpressions)}）`);
  }

  // 影片觀看時間
  const viewTimeMs = sumMetricValues(insightMap["page_video_view_time"]);
  if (viewTimeMs > 0) {
    const viewTimeHrs = viewTimeMs / 1000 / 3600;
    console.log(`\n  🎬 影片總觀看時間：${viewTimeHrs.toFixed(1)} 小時`);
  }

  // 反應類型
  if (insightMap["page_actions_post_reactions_total"]) {
    const reactionTotals: Record<string, number> = {};
    for (const v of insightMap["page_actions_post_reactions_total"].values || []) {
      if (typeof v.value === "object" && v.value !== null) {
        for (const [rtype, count] of Object.entries(v.value)) {
          reactionTotals[rtype] = (reactionTotals[rtype] || 0) + (count as number);
        }
      }
    }
    const emojiMap: Record<string, string> = {
      like: "👍",
      love: "❤️",
      wow: "😮",
      haha: "😄",
      sorry: "😢",
      anger: "😡",
    };
    const sorted = Object.entries(reactionTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      console.log(`\n  💬 反應類型分佈：`);
      for (const [rtype, count] of sorted) {
        console.log(`     ${emojiMap[rtype] || "🔹"} ${rtype}: ${fmtNum(count)}`);
      }
    }
  }

  // ========= 3. 每日趨勢（7 天） =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 三、每日趨勢（近 7 天）");
  console.log("=".repeat(70));

  const dailyMetrics: [string, string][] = [
    ["page_posts_impressions", "曝光"],
    ["page_posts_impressions_unique", "觸及"],
    ["page_posts_impressions_paid", "付費曝光"],
    ["page_posts_impressions_organic", "自然曝光"],
    ["page_post_engagements", "互動"],
    ["page_video_views", "影片觀看"],
    ["page_views_total", "頁面瀏覽"],
  ];

  // 取日期
  const sampleMetric = insightMap["page_posts_impressions"];
  const dates = getRecentValues(sampleMetric, 7).map(
    (v: any) => v.end_time?.substring(5, 10) || ""
  );

  if (dates.length > 0) {
    const header = "指標".padEnd(18) + dates.map((d: string) => d.padStart(9)).join("");
    console.log("\n" + header);
    console.log("-".repeat(18 + dates.length * 9));

    for (const [key, label] of dailyMetrics) {
      if (insightMap[key]) {
        const recent = getRecentValues(insightMap[key], 7);
        let row = label.padEnd(18);
        for (const v of recent) {
          const val = typeof v.value === "number" ? v.value : 0;
          row += fmtNum(val).padStart(9);
        }
        console.log(row);
      }
    }
  }

  // 粉絲趨勢
  if (followerTrend?.data) {
    console.log();
    for (const metric of followerTrend.data) {
      const values = metric.values || [];
      const recent = values.slice(-7);
      let row = (metric.name === "page_follows"
        ? "累計追蹤"
        : metric.name === "page_daily_follows"
          ? "新追蹤"
          : "取消追蹤"
      ).padEnd(18);
      for (const v of recent) {
        row += fmtNum(v.value).padStart(9);
      }
      console.log(row);

      if (metric.name === "page_follows" && values.length > 1) {
        const first = values[0]?.value || 0;
        const last = values[values.length - 1]?.value || 0;
        console.log(
          `  📈 30 天追蹤變化：${first} → ${last}（${last - first >= 0 ? "+" : ""}${last - first}）`
        );
      }
    }
  }

  // ========= 4. 貼文表現 =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 四、近期貼文表現");
  console.log("=".repeat(70));

  if (posts?.data) {
    console.log(
      "\n" +
        "日期".padEnd(14) +
        "👍".padStart(6) +
        "💬".padStart(6) +
        "🔄".padStart(6) +
        "  內容"
    );
    console.log("-".repeat(80));

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    for (const post of posts.data) {
      const date = post.created_time?.substring(0, 10) || "";
      const likes = post.likes?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      const shares = post.shares?.count || 0;
      const msg = truncate(post.message || "", 45);

      totalLikes += likes;
      totalComments += comments;
      totalShares += shares;

      console.log(
        date.padEnd(14) +
          String(likes).padStart(6) +
          String(comments).padStart(6) +
          String(shares).padStart(6) +
          `  ${msg}`
      );
    }

    const count = posts.data.length;
    console.log("-".repeat(80));
    console.log(
      `合計 ${count} 篇`.padEnd(14) +
        String(totalLikes).padStart(6) +
        String(totalComments).padStart(6) +
        String(totalShares).padStart(6)
    );
    console.log(
      `平均每篇`.padEnd(14) +
        (totalLikes / count).toFixed(1).padStart(6) +
        (totalComments / count).toFixed(1).padStart(6) +
        (totalShares / count).toFixed(1).padStart(6)
    );

    // TOP 5
    const sorted = [...posts.data].sort(
      (a: any, b: any) =>
        (b.likes?.summary?.total_count || 0) +
        (b.comments?.summary?.total_count || 0) * 3 +
        (b.shares?.count || 0) * 5 -
        ((a.likes?.summary?.total_count || 0) +
          (a.comments?.summary?.total_count || 0) * 3 +
          (a.shares?.count || 0) * 5)
    );

    console.log("\n🏆 TOP 5 互動貼文：");
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const p = sorted[i];
      const likes = p.likes?.summary?.total_count || 0;
      const comments = p.comments?.summary?.total_count || 0;
      const shares = p.shares?.count || 0;
      console.log(
        `  ${i + 1}. ${p.created_time?.substring(0, 10)} | 👍${likes} 💬${comments} 🔄${shares} | ${truncate(p.message, 50)}`
      );
    }
  }

  // ========= 5. 影片/Reels =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 五、影片/Reels 觀看數");
  console.log("=".repeat(70));

  if (videos?.data) {
    const sorted = [...videos.data].sort(
      (a: any, b: any) => (b.views || 0) - (a.views || 0)
    );

    console.log(
      "\n" +
        "日期".padEnd(14) +
        "觀看數".padStart(10) +
        "秒數".padStart(8) +
        "  內容"
    );
    console.log("-".repeat(80));

    let totalViews = 0;
    for (const v of sorted) {
      const date = v.created_time?.substring(0, 10) || "";
      const views = v.views || 0;
      const length = Math.round(v.length || 0);
      const desc = truncate(v.description || v.title || "", 45);
      totalViews += views;

      console.log(
        date.padEnd(14) +
          fmtNum(views).padStart(10) +
          `${length}s`.padStart(8) +
          `  ${desc}`
      );
    }

    console.log("-".repeat(80));
    console.log(`  總觀看數：${fmtNum(totalViews)}`);
    console.log(`  影片數量：${videos.data.length}`);
    console.log(
      `  平均觀看：${fmtNum(Math.round(totalViews / videos.data.length))}`
    );

    const viral = sorted.filter((v: any) => (v.views || 0) >= 1000);
    if (viral.length > 0) {
      console.log(`\n🔥 爆款影片（>1,000 觀看）：`);
      for (const v of viral) {
        console.log(
          `  ${v.created_time?.substring(0, 10)} | ${fmtNum(v.views)} 觀看 | ${truncate(v.description || v.title || "", 50)}`
        );
      }
    }
  }

  // ========= 6. 健康指標總結 =========
  console.log("\n" + "=".repeat(70));
  console.log("📊 六、社群健康指標總結");
  console.log("=".repeat(70));

  const postCount = posts?.data?.length || 0;
  const totalPostLikes =
    posts?.data?.reduce(
      (sum: number, p: any) => sum + (p.likes?.summary?.total_count || 0),
      0
    ) || 0;
  const totalPostComments =
    posts?.data?.reduce(
      (sum: number, p: any) => sum + (p.comments?.summary?.total_count || 0),
      0
    ) || 0;
  const totalVideoViews =
    videos?.data?.reduce((sum: number, v: any) => sum + (v.views || 0), 0) || 0;

  const engagementRate =
    pageInfo.followers_count > 0
      ? ((totalPostLikes + totalPostComments) / postCount / pageInfo.followers_count) * 100
      : 0;

  const insightEngagements = sumMetricValues(insightMap["page_post_engagements"]);
  const insightReach = sumMetricValues(insightMap["page_posts_impressions_unique"]);
  const insightEngRate = insightReach > 0 ? (insightEngagements / insightReach) * 100 : 0;

  console.log(`
  ┌─────────────────────────────────────────────────┐
  │ 粉絲數           ${fmtNum(pageInfo.followers_count).padStart(10)}                   │
  │ 討論中人數       ${fmtNum(pageInfo.talking_about_count).padStart(10)}${pageInfo.talking_about_count > pageInfo.followers_count ? " 🟢 超過粉絲數" : ""}        │
  │ 30 天觸及人數    ${fmtNum(insightReach).padStart(10)}                   │
  │ 30 天總曝光      ${fmtNum(totalImpressions).padStart(10)}                   │
  │ 30 天互動次數    ${fmtNum(insightEngagements).padStart(10)}                   │
  │ 觸及互動率       ${insightEngRate.toFixed(2).padStart(9)}%                   │
  │ 貼文互動率       ${engagementRate.toFixed(2).padStart(9)}%                   │
  │ 影片總觀看       ${fmtNum(totalVideoViews).padStart(10)}                   │
  │ 付費曝光佔比     ${totalImpressions > 0 ? ((paidImpressions / totalImpressions) * 100).toFixed(1).padStart(9) + "%" : "N/A".padStart(10)}                   │
  │ 自然曝光佔比     ${totalImpressions > 0 ? ((organicImpressions / totalImpressions) * 100).toFixed(1).padStart(9) + "%" : "N/A".padStart(10)}                   │
  └─────────────────────────────────────────────────┘`);

  // 健康診斷
  console.log("\n  📋 健康診斷：");
  if (engagementRate > 3)
    console.log("  🟢 互動率 > 3%（業界平均 1-3%）— 互動品質優秀");
  else if (engagementRate > 1)
    console.log("  🟡 互動率 1-3% — 業界平均水準");
  else console.log("  🔴 互動率 < 1% — 需加強互動");

  if (totalImpressions > 0 && paidImpressions / totalImpressions > 0.9)
    console.log("  🔴 付費曝光 > 90% — 過度依賴廣告，自然觸及能力弱");
  else if (totalImpressions > 0 && paidImpressions / totalImpressions > 0.7)
    console.log("  🟡 付費曝光 70-90% — 需加強自然內容");
  else console.log("  🟢 付費/自然曝光平衡");

  if (pageInfo.talking_about_count > pageInfo.followers_count)
    console.log("  🟢 討論中人數 > 粉絲數 — 內容成功破圈");
  else
    console.log(
      `  🟡 討論中人數 ${fmtNum(pageInfo.talking_about_count)} < 粉絲數 ${fmtNum(pageInfo.followers_count)}`
    );

  console.log("\n✅ FB 社群分析完成！");
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
