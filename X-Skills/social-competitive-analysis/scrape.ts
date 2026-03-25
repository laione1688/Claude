/**
 * 三平台社群競品分析 - 資料抓取腳本
 *
 * 使用 Apify actors 並行抓取 TikTok + Instagram + Facebook
 * 結果存為 JSON 供後續 Fabric 分析 + x-filter 評分使用
 *
 * 執行:
 *   bun run scrape.ts                              # 批次模式（全部帳號）
 *   bun run scrape.ts --target chia4.6              # 單帳號深度抓取
 *   bun run scrape.ts --target chia4.6 --max-posts 500 --days 365
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { parseArgs } from 'node:util'
import { ApifyClient } from 'apify-client'

/* ============================================================================
 * CLI 參數解析
 * ========================================================================= */

const { values: args } = parseArgs({
  options: {
    target: { type: 'string', short: 't' },
    'max-posts': { type: 'string', short: 'm' },
    days: { type: 'string', short: 'd' },
  },
  strict: false,
})

const IS_DEEP_MODE = !!args.target

/* ============================================================================
 * 設定與初始化
 * ========================================================================= */

const TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY
if (!TOKEN) {
  console.error('❌ 未設定 APIFY_TOKEN 環境變數')
  console.error('請先執行: source ~/.zshrc')
  process.exit(1)
}

const client = new ApifyClient({ token: TOKEN })

// 讀取帳號設定
const accountsPath = new URL('./accounts.json', import.meta.url).pathname
const config = JSON.parse(readFileSync(accountsPath, 'utf8'))
const { competitors, settings } = config

// 根據模式決定參數
const MAX_POSTS = IS_DEEP_MODE
  ? parseInt(args['max-posts'] as string) || 500
  : settings?.maxPostsPerPlatform || 30
const DAYS_LOOKBACK = IS_DEEP_MODE
  ? parseInt(args.days as string) || 9999
  : settings?.daysLookback || 30
const ACTOR_TIMEOUT = IS_DEEP_MODE ? 600 : 300

// 計算起始日期
const fromDate = new Date()
fromDate.setDate(fromDate.getDate() - DAYS_LOOKBACK)
const fromDateStr = fromDate.toISOString().split('T')[0]

// 輸出目錄
const todayStr = new Date().toISOString().split('T')[0]
const outputDir = IS_DEEP_MODE
  ? `./output/deep/${args.target}-${todayStr}`
  : `./output/${todayStr}`
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

/* ============================================================================
 * 工具函數
 * ========================================================================= */

async function waitForActor(runId: string): Promise<any> {
  console.log(`  ⏳ 等待 actor 完成 (runId: ${runId.substring(0, 8)}...)`)
  const run = await client.run(runId).waitForFinish({ waitSecs: ACTOR_TIMEOUT })
  return run
}

async function getDataset(datasetId: string, limit: number = 1000): Promise<any[]> {
  const { items } = await client.dataset(datasetId).listItems({ limit })
  return items
}

/* ============================================================================
 * TikTok 抓取
 * ========================================================================= */

async function scrapeTikTok(username: string, competitorName: string) {
  if (!username) return null

  console.log(`  📱 TikTok: @${username}`)

  try {
    const run = await client.actor('clockworks/tiktok-profile-scraper').call({
      profiles: [`https://www.tiktok.com/@${username}`],
      resultsPerPage: MAX_POSTS
    }, { memory: IS_DEEP_MODE ? 1024 : 512, timeout: ACTOR_TIMEOUT })

    const finalRun = await waitForActor(run.id)
    if (finalRun.status !== 'SUCCEEDED') {
      console.log(`  ⚠️  TikTok @${username} 抓取失敗: ${finalRun.status}`)
      return null
    }

    const items = await getDataset(finalRun.defaultDatasetId, 1)
    if (!items.length) return null

    const profile = items[0]
    const videos = (profile.posts || []).map((v: any) => ({
      id: v.id,
      url: `https://www.tiktok.com/@${username}/video/${v.id}`,
      text: v.text || v.desc || '',
      timestamp: v.createTimeISO || new Date(v.createTime * 1000).toISOString(),
      playCount: v.playCount || 0,
      likeCount: v.diggCount || v.likeCount || 0,
      commentCount: v.commentCount || 0,
      shareCount: v.shareCount || 0,
      hashtags: (v.hashtags || []).map((h: any) => h.name || h),
      musicTitle: v.musicMeta?.musicName,
      isAd: v.isAd || false
    }))

    // 只取最近 N 天
    const cutoff = fromDate.getTime()
    const recentVideos = videos.filter((v: any) =>
      new Date(v.timestamp).getTime() > cutoff
    )

    return {
      platform: 'tiktok',
      competitor: competitorName,
      username,
      followersCount: profile.authorMeta?.fans || 0,
      videoCount: profile.authorMeta?.video || 0,
      totalHearts: profile.authorMeta?.heart || 0,
      posts: recentVideos,
      scrapedAt: new Date().toISOString()
    }
  } catch (e) {
    console.log(`  ⚠️  TikTok @${username} 錯誤: ${(e as any).message}`)
    return null
  }
}

/* ============================================================================
 * Instagram 抓取
 * ========================================================================= */

async function scrapeInstagram(username: string, competitorName: string) {
  if (!username) return null

  console.log(`  📸 Instagram: @${username}`)

  try {
    const run = await client.actor('apify/instagram-profile-scraper').call({
      usernames: [username],
      resultsLimit: MAX_POSTS
    }, { memory: IS_DEEP_MODE ? 1024 : 512, timeout: ACTOR_TIMEOUT })

    const finalRun = await waitForActor(run.id)
    if (finalRun.status !== 'SUCCEEDED') {
      console.log(`  ⚠️  Instagram @${username} 抓取失敗: ${finalRun.status}`)
      return null
    }

    const items = await getDataset(finalRun.defaultDatasetId, 1)
    if (!items.length) return null

    const profile = items[0]
    const cutoff = fromDate.getTime()

    const posts = (profile.latestPosts || [])
      .filter((p: any) => new Date(p.timestamp).getTime() > cutoff)
      .map((p: any) => ({
        id: p.id,
        shortCode: p.shortCode,
        url: p.url || `https://www.instagram.com/p/${p.shortCode}/`,
        caption: p.caption || '',
        type: p.type || 'Image',
        timestamp: p.timestamp,
        likesCount: p.likesCount || 0,
        commentsCount: p.commentsCount || 0,
        hashtags: p.hashtags || [],
        imageUrl: p.displayUrl,
        videoUrl: p.videoUrl,
        isSponsored: p.isSponsored || false
      }))

    return {
      platform: 'instagram',
      competitor: competitorName,
      username,
      followersCount: profile.followersCount || 0,
      followingCount: profile.followsCount || 0,
      postsCount: profile.postsCount || 0,
      isVerified: profile.verified || false,
      posts,
      scrapedAt: new Date().toISOString()
    }
  } catch (e) {
    console.log(`  ⚠️  Instagram @${username} 錯誤: ${(e as any).message}`)
    return null
  }
}

/* ============================================================================
 * Facebook 抓取
 * ========================================================================= */

async function scrapeFacebook(pageUrl: string, competitorName: string) {
  if (!pageUrl) return null

  console.log(`  👍 Facebook: ${pageUrl}`)

  try {
    const run = await client.actor('apify/facebook-posts-scraper').call({
      startUrls: [{ url: pageUrl }],
      maxPosts: MAX_POSTS,
      ...(IS_DEEP_MODE ? {} : { fromDate: fromDateStr })
    }, { memory: IS_DEEP_MODE ? 2048 : 1024, timeout: ACTOR_TIMEOUT })

    const finalRun = await waitForActor(run.id)
    if (finalRun.status !== 'SUCCEEDED') {
      console.log(`  ⚠️  Facebook ${pageUrl} 抓取失敗: ${finalRun.status}`)
      return null
    }

    const items = await getDataset(finalRun.defaultDatasetId, MAX_POSTS)

    const posts = items.map((p: any) => ({
      id: p.postId || p.id,
      url: p.url,
      text: p.text || '',
      timestamp: p.time,
      postDate: p.time,
      pageName: p.pageName,
      type: p.postType || 'post',
      likesCount: p.likes || 0,
      commentsCount: p.comments || 0,
      sharesCount: p.shares || 0,
      hasVideo: !!p.video,
      hasImage: (p.images?.length || 0) > 0
    }))

    return {
      platform: 'facebook',
      competitor: competitorName,
      pageUrl,
      pageName: items[0]?.pageName || competitorName,
      posts,
      scrapedAt: new Date().toISOString()
    }
  } catch (e) {
    console.log(`  ⚠️  Facebook ${pageUrl} 錯誤: ${(e as any).message}`)
    return null
  }
}

/* ============================================================================
 * 主程式：並行抓取
 * ========================================================================= */

async function main() {
  if (IS_DEEP_MODE) {
    // ─── 深度模式：單帳號完整內容抓取 ───
    const targetName = args.target as string
    const target = competitors.find((c: any) =>
      c.name === targetName || c.tiktok === targetName || c.instagram === targetName
    )
    if (!target) {
      console.error(`❌ 找不到帳號「${targetName}」`)
      console.error('\n📋 可用帳號:')
      competitors.forEach((c: any) => console.error(`  - ${c.name}`))
      process.exit(1)
    }

    console.log('🔍 單帳號深度抓取模式')
    console.log(`🎯 目標帳號: ${target.name}`)
    console.log(`📊 每平台上限: ${MAX_POSTS} 篇`)
    console.log(`📅 時間範圍: ${DAYS_LOOKBACK >= 9999 ? '不限' : `最近 ${DAYS_LOOKBACK} 天`}`)
    console.log(`⏱️  Actor 超時: ${ACTOR_TIMEOUT} 秒`)
    console.log(`📁 輸出目錄: ${outputDir}\n`)

    // 並行抓取三平台
    const [tikTokData, igData, fbData] = await Promise.all([
      scrapeTikTok(target.tiktok, target.name),
      scrapeInstagram(target.instagram, target.name),
      scrapeFacebook(target.facebook, target.name)
    ])

    const result = {
      name: target.name,
      platforms: {
        tiktok: tikTokData,
        instagram: igData,
        facebook: fbData
      }
    }

    // 簡要統計
    const tiktokCount = tikTokData?.posts?.length || 0
    const igCount = igData?.posts?.length || 0
    const fbCount = fbData?.posts?.length || 0
    console.log(`\n  ✅ 抓取完成: TikTok ${tiktokCount}篇 | IG ${igCount}篇 | FB ${fbCount}篇`)

    // 儲存原始資料
    const rawDataPath = `${outputDir}/raw-data.json`
    writeFileSync(rawDataPath, JSON.stringify({
      scrapedAt: new Date().toISOString(),
      mode: 'deep',
      target: target.name,
      settings: { maxPosts: MAX_POSTS, daysLookback: DAYS_LOOKBACK },
      data: result
    }, null, 2))
    console.log(`\n✅ 原始資料已儲存至: ${rawDataPath}`)

    // 生成完整內容摘要
    const summary = generateDeepSummary(result)
    const summaryPath = `${outputDir}/full-content.md`
    writeFileSync(summaryPath, summary)
    console.log(`✅ 完整內容已儲存至: ${summaryPath}`)
    console.log(`\n🎯 可直接閱讀 ${summaryPath} 查看該帳號所有內容`)

  } else {
    // ─── 批次模式：原有邏輯 ───
    console.log('🚀 三平台社群競品分析 - 開始抓取')
    console.log(`📅 分析區間: 最近 ${DAYS_LOOKBACK} 天 (${fromDateStr} 起)`)
    console.log(`📊 每帳號最多: ${MAX_POSTS} 篇貼文`)
    console.log(`🏢 競品帳號數: ${competitors.length} 個\n`)

    // 驗證帳號設定
    const validCompetitors = competitors.filter((c: any) =>
      c.tiktok || c.instagram || c.facebook
    )
    if (!validCompetitors.length) {
      console.error('❌ accounts.json 中未填寫任何競品帳號')
      console.error('請先編輯 accounts.json 填入帳號資料')
      process.exit(1)
    }

    const allResults: any[] = []

    // 對每個競品進行三平台並行抓取
    for (const competitor of validCompetitors) {
      console.log(`\n🎯 分析競品：${competitor.name}`)

      // 並行抓取三平台（Fan-out 模式）
      const [tikTokData, igData, fbData] = await Promise.all([
        scrapeTikTok(competitor.tiktok, competitor.name),
        scrapeInstagram(competitor.instagram, competitor.name),
        scrapeFacebook(competitor.facebook, competitor.name)
      ])

      const competitorData = {
        name: competitor.name,
        platforms: {
          tiktok: tikTokData,
          instagram: igData,
          facebook: fbData
        }
      }

      allResults.push(competitorData)

      // 簡要統計
      const tiktokCount = tikTokData?.posts?.length || 0
      const igCount = igData?.posts?.length || 0
      const fbCount = fbData?.posts?.length || 0
      console.log(`  ✅ 抓取完成: TikTok ${tiktokCount}篇 | IG ${igCount}篇 | FB ${fbCount}篇`)
    }

    // 儲存原始資料
    const rawDataPath = `${outputDir}/raw-data.json`
    writeFileSync(rawDataPath, JSON.stringify({
      scrapedAt: new Date().toISOString(),
      period: { from: fromDateStr, days: DAYS_LOOKBACK },
      competitors: allResults
    }, null, 2))

    console.log(`\n✅ 原始資料已儲存至: ${rawDataPath}`)

    // 生成摘要供 Claude 分析用
    const summary = generateSummary(allResults)
    const summaryPath = `${outputDir}/summary-for-analysis.md`
    writeFileSync(summaryPath, summary)

    console.log(`✅ 分析摘要已儲存至: ${summaryPath}`)
    console.log('\n🎯 下一步：Claude 將分析此摘要並生成內容議題建議')
  }
}

/* ============================================================================
 * 生成 Markdown 摘要（供 Claude 分析）
 * ========================================================================= */

function generateSummary(results: any[]): string {
  const lines: string[] = []
  const date = new Date().toISOString().split('T')[0]

  lines.push(`# 三平台社群競品資料摘要 ${date}`)
  lines.push(`\n> 資料來源：Apify 三平台並行抓取 | 分析區間：最近 ${DAYS_LOOKBACK} 天`)
  lines.push('\n---\n')

  for (const competitor of results) {
    lines.push(`## 🏢 ${competitor.name}`)

    // TikTok
    const tk = competitor.platforms.tiktok
    if (tk?.posts?.length) {
      lines.push(`\n### 📱 TikTok ([@${tk.username}](https://www.tiktok.com/@${tk.username}))`)
      lines.push(`- 粉絲數: ${tk.followersCount.toLocaleString()}`)

      const sortedTK = [...tk.posts].sort((a: any, b: any) => b.playCount - a.playCount)
      const avgPlay = Math.round(tk.posts.reduce((s: number, v: any) => s + v.playCount, 0) / tk.posts.length)
      lines.push(`- 本期貼文數: ${tk.posts.length} | 平均播放: ${avgPlay.toLocaleString()}`)

      lines.push(`\n**本期高效影片 TOP 5:**`)
      sortedTK.slice(0, 5).forEach((v: any, i: number) => {
        const hashtags = v.hashtags?.slice(0, 3).map((h: string) => `#${h}`).join(' ') || ''
        lines.push(`${i + 1}. 播放 ${(v.playCount || 0).toLocaleString()} | 讚 ${(v.likeCount || 0).toLocaleString()} | ${v.timestamp.split('T')[0]}`)
        lines.push(`   內容: ${(v.text || '').substring(0, 100)}`)
        if (hashtags) lines.push(`   Hashtag: ${hashtags}`)
      })

      // Hashtag 統計
      const allHashtags: Record<string, number> = {}
      tk.posts.forEach((v: any) => {
        (v.hashtags || []).forEach((h: string) => {
          allHashtags[h] = (allHashtags[h] || 0) + 1
        })
      })
      const topHashtags = Object.entries(allHashtags)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .map(([h, c]: any) => `#${h}(${c})`)
      if (topHashtags.length) {
        lines.push(`\n**常用 Hashtag:** ${topHashtags.join(', ')}`)
      }
    } else {
      lines.push(`\n### 📱 TikTok: 無資料`)
    }

    // Instagram
    const ig = competitor.platforms.instagram
    if (ig?.posts?.length) {
      lines.push(`\n### 📸 Instagram ([@${ig.username}](https://www.instagram.com/${ig.username}/))`)
      lines.push(`- 粉絲數: ${(ig.followersCount || 0).toLocaleString()} | 已驗證: ${ig.isVerified ? '✅' : '❌'}`)

      const sortedIG = [...ig.posts].sort((a: any, b: any) => b.likesCount - a.likesCount)
      const avgLikes = Math.round(ig.posts.reduce((s: number, p: any) => s + p.likesCount, 0) / ig.posts.length)
      const videoCount = ig.posts.filter((p: any) => p.type === 'Video').length
      lines.push(`- 本期貼文數: ${ig.posts.length} (影片: ${videoCount}) | 平均讚: ${avgLikes.toLocaleString()}`)

      lines.push(`\n**本期高讚貼文 TOP 5:**`)
      sortedIG.slice(0, 5).forEach((p: any, i: number) => {
        const hashtags = p.hashtags?.slice(0, 3).map((h: string) => `#${h}`).join(' ') || ''
        lines.push(`${i + 1}. 讚 ${(p.likesCount || 0).toLocaleString()} | 留言 ${(p.commentsCount || 0).toLocaleString()} | ${p.type} | ${p.timestamp.split('T')[0]}`)
        lines.push(`   內容: ${(p.caption || '').substring(0, 100)}`)
        if (hashtags) lines.push(`   Hashtag: ${hashtags}`)
      })

      // Hashtag 統計
      const allIGTags: Record<string, number> = {}
      ig.posts.forEach((p: any) => {
        (p.hashtags || []).forEach((h: string) => {
          allIGTags[h] = (allIGTags[h] || 0) + 1
        })
      })
      const topIGTags = Object.entries(allIGTags)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .map(([h, c]: any) => `#${h}(${c})`)
      if (topIGTags.length) {
        lines.push(`\n**常用 Hashtag:** ${topIGTags.join(', ')}`)
      }
    } else {
      lines.push(`\n### 📸 Instagram: 無資料`)
    }

    // Facebook
    const fb = competitor.platforms.facebook
    if (fb?.posts?.length) {
      lines.push(`\n### 👍 Facebook (${fb.pageName || fb.pageUrl})`)

      const sortedFB = [...fb.posts].sort((a: any, b: any) =>
        (b.likesCount + b.sharesCount * 3 + b.commentsCount * 2) -
        (a.likesCount + a.sharesCount * 3 + a.commentsCount * 2)
      )
      const avgLikes = Math.round(fb.posts.reduce((s: number, p: any) => s + (p.likesCount || 0), 0) / fb.posts.length)
      const videoCount = fb.posts.filter((p: any) => p.hasVideo).length
      lines.push(`- 本期貼文數: ${fb.posts.length} (含影片: ${videoCount}) | 平均讚: ${avgLikes.toLocaleString()}`)

      lines.push(`\n**本期高互動貼文 TOP 5:**`)
      sortedFB.slice(0, 5).forEach((p: any, i: number) => {
        lines.push(`${i + 1}. 讚 ${(p.likesCount || 0).toLocaleString()} | 留言 ${(p.commentsCount || 0).toLocaleString()} | 分享 ${(p.sharesCount || 0).toLocaleString()} | ${p.timestamp?.split('T')[0] || ''}`)
        lines.push(`   內容: ${(p.text || '').substring(0, 100)}`)
      })
    } else {
      lines.push(`\n### 👍 Facebook: 無資料`)
    }

    lines.push('\n---\n')
  }

  lines.push('## 📋 分析任務\n')
  lines.push('請根據以上數據進行：\n')
  lines.push('1. **各平台爆款規律** — 高效內容的格式、長度、時間特徵')
  lines.push('2. **跨平台共鳴話題** — 三個平台都高效的主題')
  lines.push('3. **平台差異分析** — 各平台的受眾反應差異')
  lines.push('4. **Hashtag 策略** — 高效 hashtag 的使用模式')
  lines.push('5. **內容空白機會** — 競品未覆蓋但有需求的話題')

  return lines.join('\n')
}

/* ============================================================================
 * 生成深度抓取完整內容摘要（不截斷、列出所有貼文）
 * ========================================================================= */

function generateDeepSummary(result: any): string {
  const lines: string[] = []
  const date = new Date().toISOString().split('T')[0]
  const name = result.name

  lines.push(`# 🔍 深度內容分析：${name}`)
  lines.push(`\n> 抓取日期：${date} | 模式：單帳號深度抓取 | 上限：${MAX_POSTS} 篇/平台`)
  lines.push('\n---\n')

  // TikTok
  const tk = result.platforms.tiktok
  if (tk?.posts?.length) {
    lines.push(`## 📱 TikTok [@${tk.username}](https://www.tiktok.com/@${tk.username})`)
    lines.push(`- 粉絲數: ${(tk.followersCount || 0).toLocaleString()}`)
    lines.push(`- 總影片數: ${(tk.videoCount || 0).toLocaleString()}`)
    lines.push(`- 總愛心數: ${(tk.totalHearts || 0).toLocaleString()}`)
    lines.push(`- 本次抓取: ${tk.posts.length} 篇`)

    const avgPlay = Math.round(tk.posts.reduce((s: number, v: any) => s + v.playCount, 0) / tk.posts.length)
    lines.push(`- 平均播放: ${avgPlay.toLocaleString()}\n`)

    // 所有貼文，按時間排序（新→舊）
    const sorted = [...tk.posts].sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    sorted.forEach((v: any, i: number) => {
      const allHashtags = (v.hashtags || []).map((h: string) => `#${h}`).join(' ')
      lines.push(`### ${i + 1}. ${v.timestamp.split('T')[0]} | ▶️ ${(v.playCount || 0).toLocaleString()} | ❤️ ${(v.likeCount || 0).toLocaleString()} | 💬 ${(v.commentCount || 0).toLocaleString()} | 🔄 ${(v.shareCount || 0).toLocaleString()}`)
      lines.push(`- 連結: ${v.url}`)
      if (v.musicTitle) lines.push(`- 音樂: ${v.musicTitle}`)
      if (v.isAd) lines.push(`- ⚠️ 廣告貼文`)
      lines.push(`\n${v.text || '（無文案）'}\n`)
      if (allHashtags) lines.push(`${allHashtags}\n`)
    })
  } else {
    lines.push(`## 📱 TikTok: 無資料\n`)
  }

  lines.push('---\n')

  // Instagram
  const ig = result.platforms.instagram
  if (ig?.posts?.length) {
    lines.push(`## 📸 Instagram [@${ig.username}](https://www.instagram.com/${ig.username}/)`)
    lines.push(`- 粉絲數: ${(ig.followersCount || 0).toLocaleString()}`)
    lines.push(`- 追蹤中: ${(ig.followingCount || 0).toLocaleString()}`)
    lines.push(`- 總貼文數: ${(ig.postsCount || 0).toLocaleString()}`)
    lines.push(`- 已驗證: ${ig.isVerified ? '✅' : '❌'}`)
    lines.push(`- 本次抓取: ${ig.posts.length} 篇`)

    const avgLikes = Math.round(ig.posts.reduce((s: number, p: any) => s + p.likesCount, 0) / ig.posts.length)
    lines.push(`- 平均讚: ${avgLikes.toLocaleString()}\n`)

    const sorted = [...ig.posts].sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    sorted.forEach((p: any, i: number) => {
      const allHashtags = (p.hashtags || []).map((h: string) => `#${h}`).join(' ')
      lines.push(`### ${i + 1}. ${p.timestamp.split('T')[0]} | ${p.type} | ❤️ ${(p.likesCount || 0).toLocaleString()} | 💬 ${(p.commentsCount || 0).toLocaleString()}`)
      lines.push(`- 連結: ${p.url}`)
      if (p.isSponsored) lines.push(`- ⚠️ 贊助貼文`)
      lines.push(`\n${p.caption || '（無文案）'}\n`)
      if (allHashtags) lines.push(`${allHashtags}\n`)
    })
  } else {
    lines.push(`## 📸 Instagram: 無資料\n`)
  }

  lines.push('---\n')

  // Facebook
  const fb = result.platforms.facebook
  if (fb?.posts?.length) {
    lines.push(`## 👍 Facebook (${fb.pageName || fb.pageUrl})`)
    lines.push(`- 本次抓取: ${fb.posts.length} 篇`)

    const avgLikes = Math.round(fb.posts.reduce((s: number, p: any) => s + (p.likesCount || 0), 0) / fb.posts.length)
    lines.push(`- 平均讚: ${avgLikes.toLocaleString()}\n`)

    const sorted = [...fb.posts].sort((a: any, b: any) =>
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    )

    sorted.forEach((p: any, i: number) => {
      lines.push(`### ${i + 1}. ${p.timestamp?.split('T')[0] || '未知日期'} | ❤️ ${(p.likesCount || 0).toLocaleString()} | 💬 ${(p.commentsCount || 0).toLocaleString()} | 🔄 ${(p.sharesCount || 0).toLocaleString()}`)
      lines.push(`- 連結: ${p.url || '無'}`)
      lines.push(`- 類型: ${p.type}${p.hasVideo ? ' 📹' : ''}${p.hasImage ? ' 🖼️' : ''}`)
      lines.push(`\n${p.text || '（無文案）'}\n`)
    })
  } else {
    lines.push(`## 👍 Facebook: 無資料\n`)
  }

  // 統計總覽
  lines.push('---\n')
  lines.push('## 📊 統計總覽\n')
  const totalPosts = (tk?.posts?.length || 0) + (ig?.posts?.length || 0) + (fb?.posts?.length || 0)
  lines.push(`| 平台 | 貼文數 | 平均互動 |`)
  lines.push(`|------|--------|----------|`)
  if (tk?.posts?.length) {
    const avg = Math.round(tk.posts.reduce((s: number, v: any) => s + v.playCount, 0) / tk.posts.length)
    lines.push(`| TikTok | ${tk.posts.length} | ${avg.toLocaleString()} 播放 |`)
  }
  if (ig?.posts?.length) {
    const avg = Math.round(ig.posts.reduce((s: number, p: any) => s + p.likesCount, 0) / ig.posts.length)
    lines.push(`| Instagram | ${ig.posts.length} | ${avg.toLocaleString()} 讚 |`)
  }
  if (fb?.posts?.length) {
    const avg = Math.round(fb.posts.reduce((s: number, p: any) => s + (p.likesCount || 0), 0) / fb.posts.length)
    lines.push(`| Facebook | ${fb.posts.length} | ${avg.toLocaleString()} 讚 |`)
  }
  lines.push(`| **合計** | **${totalPosts}** | |`)

  return lines.join('\n')
}

// 執行
main().catch(err => {
  console.error('❌ 執行失敗:', err.message)
  process.exit(1)
})
