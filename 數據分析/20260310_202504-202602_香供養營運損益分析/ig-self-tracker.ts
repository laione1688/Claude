/**
 * IG 自家帳號數據追蹤（使用 IG Graph API，不耗 Apify 額度）
 * 帳號：me1314888
 * 
 * 執行：
 *   bun ig-self-tracker.ts
 */

const FB_TOKEN = process.env.FB_ACCESS_TOKEN || "";
const IG_BUSINESS_ID = "17841473316725680";
const API_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

async function igGet(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  url.searchParams.set("access_token", FB_TOKEN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`IG API Error: ${data.error.message}`);
  return data;
}

async function main() {
  if (!FB_TOKEN) {
    console.error("❌ 未設定 FB_ACCESS_TOKEN 環境變數");
    process.exit(1);
  }

  // 1. 帳號基本資料
  const profile = await igGet(`/${IG_BUSINESS_ID}`, {
    fields: "username,followers_count,media_count",
  });

  // 2. 最近 10 篇貼文
  const media = await igGet(`/${IG_BUSINESS_ID}/media`, {
    fields: "id,caption,timestamp,like_count,comments_count,media_type,permalink",
    limit: "10",
  });

  const posts = media.data || [];

  // 計算近 7 天發文數
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recent7 = posts.filter((p: any) => new Date(p.timestamp) >= sevenDaysAgo);

  // 計算均讚
  const avgLikes =
    posts.length > 0
      ? Math.round(posts.reduce((s: number, p: any) => s + (p.like_count || 0), 0) / posts.length)
      : 0;

  // 最佳貼文
  const best = [...posts].sort(
    (a: any, b: any) =>
      (b.like_count || 0) + (b.comments_count || 0) * 3 -
      ((a.like_count || 0) + (a.comments_count || 0) * 3)
  )[0];

  // 輸出（符合晨報格式）
  const bestCaption = best
    ? (best.caption || "").split("\n")[0].substring(0, 30)
    : "N/A";

  console.log(`IG_FOLLOWERS=${profile.followers_count}`);
  console.log(`IG_MEDIA_COUNT=${profile.media_count}`);
  console.log(`IG_RECENT_7=${recent7.length}`);
  console.log(`IG_AVG_LIKES=${avgLikes}`);
  console.log(`IG_BEST_POST=${best?.timestamp?.substring(0, 10) || "N/A"} 👍${best?.like_count || 0} | ${bestCaption}`);
  console.log(`IG_BEST_URL=${best?.permalink || ""}`);

  // 人類可讀版
  console.error(`\n📊 IG 帳號數據（@${profile.username}）`);
  console.error(`粉絲數：${profile.followers_count}`);
  console.error(`累計發文：${profile.media_count} 篇`);
  console.error(`近 7 天：${recent7.length} 篇`);
  console.error(`均讚：${avgLikes}`);
  console.error(`最佳貼文：${bestCaption}（👍${best?.like_count || 0}）`);
}

main().catch((err) => {
  console.error("❌ 錯誤:", err.message);
  process.exit(1);
});
