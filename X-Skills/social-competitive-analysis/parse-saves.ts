/**
 * Phase 0：從 TikTok + Instagram + X (Twitter) 收藏資料挖掘帳號清單
 *
 * 使用方式：
 *   1. 從 TikTok 匯出資料（設定 → 隱私 → 下載你的資料）
 *   2. 從 Instagram 匯出資料（設定 → 帳號 → 下載資料）
 *   3. 從 X 匯出資料（設定 → 帳號 → 下載你的 X 資料封存）
 *   4. 把 ZIP 放入 ./saves/ 目錄
 *   5. bun run parse-saves.ts
 *
 * 輸出：
 *   - 終端機顯示 TOP 帳號排名（含跨平台分析）
 *   - 自動更新 accounts.json（含 twitterX 欄位）
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import AdmZip from 'adm-zip'

const SAVES_DIR = './saves'
const ACCOUNTS_FILE = './accounts.json'
const TOP_N = 20  // 取前幾名帳號

/* ============================================================================
 * TikTok 資料解析
 * ========================================================================= */

interface TikTokSave {
  username: string
  url: string
  timestamp?: string
}

interface XSave {
  username: string
  tweetUrl?: string
  tweetId?: string
}

/**
 * 解析 TikTok 資料匯出
 *
 * TikTok 匯出格式（JSON）：
 * {
 *   "Activity": {
 *     "Favorite Videos": {
 *       "FavoriteVideoList": [
 *         { "Date": "2024-01-01", "Link": "https://www.tiktok.com/@username/video/1234" }
 *       ]
 *     },
 *     "Like List": {
 *       "ItemFavoriteList": [...]
 *     }
 *   }
 * }
 *
 * TikTok 匯出格式（TXT）：
 * Date: 2024-01-01 00:00:00
 * Link: https://www.tiktok.com/@username/video/1234
 */
async function parseTikTokData(content: string, filename: string): Promise<TikTokSave[]> {
  const saves: TikTokSave[] = []

  // 嘗試 JSON 格式（較新版本）
  if (filename.endsWith('.json') || content.trim().startsWith('{')) {
    try {
      const data = JSON.parse(content)

      // 路徑 1: 新版格式 "Likes and Favorites" / 舊版格式 "Activity"（向後兼容）
      const favorites =
        data?.['Likes and Favorites']?.['Favorite Videos']?.FavoriteVideoList ||
        data?.Activity?.['Favorite Videos']?.FavoriteVideoList ||
        data?.Activity?.['Favourites']?.FavoriteVideoList ||
        data?.Activity?.Favorites?.FavoriteVideoList || []

      // tiktokv.com/share/video/ID 格式 → 需要 HTTP redirect 解析
      // 取前 200 筆（最新收藏在前）並批次並發解析
      const RESOLVE_LIMIT = 200
      const BATCH_SIZE = 10
      const toResolve = favorites.slice(0, RESOLVE_LIMIT)

      if (toResolve.length > 0) {
        console.log(`   → 解析前 ${toResolve.length} 筆 Favorite Videos URL（共 ${favorites.length} 筆）...`)
        for (let i = 0; i < toResolve.length; i += BATCH_SIZE) {
          const batch = toResolve.slice(i, i + BATCH_SIZE)
          const resolved = await Promise.all(
            batch.map((item: any) => resolveTikTokUrl(item?.Link || item?.link || ''))
          )
          for (let j = 0; j < batch.length; j++) {
            const url = resolved[j]
            const username = extractTikTokUsername(url)
            if (username) {
              saves.push({ username, url, timestamp: batch[j]?.Date || batch[j]?.date })
            }
          }
          if (i + BATCH_SIZE < toResolve.length) {
            process.stdout.write(`\r   → 進度：${Math.min(i + BATCH_SIZE, toResolve.length)}/${toResolve.length}`)
            await new Promise(r => setTimeout(r, 300))
          }
        }
        console.log(`\r   → 完成 Favorite Videos 解析（${saves.length} 個帳號識別）`)
      }

      // 路徑 2: Like List（只做直接提取，不做 redirect，數量太多）
      const likes =
        data?.['Likes and Favorites']?.['Like List']?.ItemFavoriteList ||
        data?.Activity?.['Like List']?.ItemFavoriteList ||
        data?.Activity?.Likes?.ItemFavoriteList || []

      for (const item of likes) {
        const url = item?.Link || item?.link || ''
        const username = extractTikTokUsername(url)  // 只提取已有 @username 的 URL
        if (username) {
          saves.push({ username, url, timestamp: item?.Date || item?.date })
        }
      }

      return saves
    } catch {
      // 不是 JSON，繼續嘗試 TXT 格式
    }
  }

  // TXT 格式解析
  const lines = content.split('\n')
  let currentDate = ''

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('Date:')) {
      currentDate = trimmed.replace('Date:', '').trim()
    } else if (trimmed.startsWith('Link:')) {
      const url = trimmed.replace('Link:', '').trim()
      const username = extractTikTokUsername(url)
      if (username) {
        saves.push({ username, url, timestamp: currentDate })
      }
    }
    // 直接是 URL 的情況
    else if (trimmed.includes('tiktok.com/@')) {
      const username = extractTikTokUsername(trimmed)
      if (username) {
        saves.push({ username, url: trimmed })
      }
    }
  }

  return saves
}

function extractTikTokUsername(url: string): string | null {
  // https://www.tiktok.com/@username/video/1234
  // https://vm.tiktok.com/...（短網址，無法直接提取）
  const match = url.match(/tiktok\.com\/@([^/?&#\s]+)/)
  if (match) {
    const username = match[1].toLowerCase()
    // 過濾無效的 username
    if (username && username !== 'undefined' && username.length > 0) {
      return username
    }
  }
  return null
}

/**
 * 解析 tiktokv.com/share/video/ID 格式 URL
 * 使用 TikTok oEmbed API 取得作者帳號名
 *
 * 流程：
 *   tiktokv.com/share/video/{ID}
 *   → 提取 videoId
 *   → GET https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/{ID}
 *   → 回傳 author_unique_id = "@username"
 */
async function resolveTikTokUrl(url: string): Promise<string> {
  // 已是標準格式，直接返回
  if (url.includes('tiktok.com/@')) return url
  // 不含 tiktok 的 URL，跳過
  if (!url.includes('tiktok')) return url

  // 從 URL 提取 video ID（純數字）
  const videoIdMatch = url.match(/\/video\/(\d+)/)
  if (!videoIdMatch) return url
  const videoId = videoIdMatch[1]

  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/${videoId}`
    const res = await fetch(oembedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!res.ok) return url

    const data = await res.json() as any
    const username = data?.author_unique_id || data?.author_url?.match(/@([^/?&\s]+)/)?.[1]
    if (username) {
      return `https://www.tiktok.com/@${username}/video/${videoId}`
    }
    return url
  } catch {
    return url  // 失敗就返回原 URL（不中斷流程）
  }
}

/* ============================================================================
 * X (Twitter) 資料解析
 * ========================================================================= */

/**
 * 透過 X oEmbed API 將 tweetId 解析為 username
 *
 * 使用 publish.twitter.com/oembed（免費，不需要 API Key）
 * 回傳格式：{ author_url: "https://twitter.com/{username}", ... }
 */
async function resolveXTweetId(tweetId: string): Promise<string | null> {
  if (!tweetId) return null
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=https://twitter.com/i/status/${tweetId}`
    const res = await fetch(oembedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return null
    const data = await res.json() as any
    // author_url 格式：「https://twitter.com/{username}」
    const authorUrl: string = data?.author_url || ''
    const username = authorUrl.split('/').filter(Boolean).pop()
    return username || null
  } catch {
    return null
  }
}

/**
 * 解析 X 官方資料匯出的書簽
 *
 * X 匯出格式（data/bookmarks.js）：
 * window.YTD.bookmarks.part0 = [
 *   { "bookmarkId": "...", "tweetId": "1234567890" },
 *   ...
 * ]
 *
 * 注意：只包含 tweetId，不包含 username，需透過 oEmbed API 解析
 */
async function parseXData(content: string, filename: string): Promise<XSave[]> {
  const saves: XSave[] = []

  // 從 JS 包裝格式提取 JSON 陣列
  // 格式：window.YTD.bookmarks.part0 = [...]
  const match = content.match(/window\.YTD\.bookmarks\.\w+\s*=\s*(\[[\s\S]*?\]);?\s*$/)
  if (!match) {
    // 嘗試直接解析為 JSON（某些版本直接是 JSON 陣列）
    try {
      const data = JSON.parse(content)
      if (!Array.isArray(data)) return saves
      const tweetIds = data.map((item: any) => item?.tweetId || item?.tweet_id || '').filter(Boolean)
      console.log(`   → 找到 ${tweetIds.length} 筆 X 書簽（JSON 格式）`)
      return resolveXBatch(tweetIds)
    } catch {
      console.warn(`   ⚠️ 無法解析 X 書簽格式：${filename}`)
      return saves
    }
  }

  let bookmarks: any[]
  try {
    bookmarks = JSON.parse(match[1])
  } catch {
    console.warn(`   ⚠️ X 書簽 JSON 解析失敗：${filename}`)
    return saves
  }

  const tweetIds = bookmarks
    .map((item: any) => item?.tweetId || item?.tweet_id || '')
    .filter(Boolean)

  console.log(`   → 找到 ${tweetIds.length} 筆 X 書簽，解析前 ${Math.min(200, tweetIds.length)} 筆...`)
  return resolveXBatch(tweetIds.slice(0, 200))
}

/**
 * 批次解析 tweetId 清單 → XSave[]（10條/批）
 */
async function resolveXBatch(tweetIds: string[]): Promise<XSave[]> {
  const saves: XSave[] = []
  const BATCH_SIZE = 10

  for (let i = 0; i < tweetIds.length; i += BATCH_SIZE) {
    const batch = tweetIds.slice(i, i + BATCH_SIZE)
    const resolved = await Promise.all(batch.map(id => resolveXTweetId(id)))
    for (let j = 0; j < batch.length; j++) {
      const username = resolved[j]
      if (username) {
        saves.push({
          username: username.toLowerCase(),
          tweetId: batch[j],
          tweetUrl: `https://twitter.com/${username}/status/${batch[j]}`
        })
      }
    }
    if (i + BATCH_SIZE < tweetIds.length) {
      process.stdout.write(`\r   → 進度：${Math.min(i + BATCH_SIZE, tweetIds.length)}/${tweetIds.length}`)
      await new Promise(r => setTimeout(r, 300))
    }
  }
  console.log(`\r   → 完成 X 書簽解析（${saves.length} 個帳號識別）`)
  return saves
}

/* ============================================================================
 * Instagram 資料解析
 * ========================================================================= */

interface InstagramSave {
  username: string
  postUrl: string
  timestamp?: number
}

/**
 * 解析 Instagram 資料匯出
 *
 * 支援兩種格式：
 *
 * 1. HTML 格式（Meta Accounts Center 新版匯出）：
 *    saved_posts.html 內含：
 *    <h2 class="_3-95 _2pim _a6-h _a6-i">username</h2>
 *    <a href="https://www.instagram.com/reel/xxx/">...</a>
 *
 * 2. JSON 格式（舊版匯出）：
 *    saved_posts.json 內含 saved_saved_media 陣列
 */
function parseInstagramHtml(content: string): InstagramSave[] {
  const saves: InstagramSave[] = []

  // 提取 h2 標籤中的帳號名（HTML 格式）
  const usernameMatches = content.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)
  const usernames = Array.from(usernameMatches).map(m => m[1].trim().toLowerCase())

  // 提取所有 IG post/reel URL
  const urlMatches = content.matchAll(/href="(https:\/\/www\.instagram\.com\/(?:p|reel)\/[^"]+)"/g)
  const urls = Array.from(urlMatches).map(m => m[1])

  // 按順序配對（每個帳號對應一個 URL）
  const maxLen = Math.min(usernames.length, urls.length)
  for (let i = 0; i < maxLen; i++) {
    const username = usernames[i]
    if (username && username.length > 0 && username !== 'undefined') {
      saves.push({ username, postUrl: urls[i] || '' })
    }
  }

  return saves
}

function parseInstagramData(content: string): InstagramSave[] {
  const saves: InstagramSave[] = []

  // 優先嘗試 HTML 格式（Meta Accounts Center 新版）
  if (content.includes('<h2') && content.includes('_2pim')) {
    const htmlSaves = parseInstagramHtml(content)
    if (htmlSaves.length > 0) return htmlSaves
  }

  // HTML 格式但 _2pim 解析失敗時，不再嘗試 JSON（避免無用錯誤訊息）
  if (content.trimStart().startsWith('<')) {
    return saves
  }

  try {
    const data = JSON.parse(content)

    // 路徑 1: saved_saved_media（Saved Posts）
    const savedMedia = data?.saved_saved_media ||
                      data?.saved_collections?.[0]?.saved_media ||
                      (Array.isArray(data) ? data : [])

    for (const item of savedMedia) {
      // title 欄位直接是 username
      const username = item?.title?.toLowerCase?.()

      // 從 string_list_data 取 URL 和時間
      const linkData = item?.string_list_data?.[0]
      const postUrl = linkData?.href || linkData?.value || ''
      const timestamp = linkData?.timestamp

      if (username && username.length > 0 && username !== 'undefined') {
        saves.push({ username, postUrl, timestamp })
      } else if (postUrl) {
        // 從 URL 推斷（備用方法）
        const urlUsername = extractInstagramUsername(postUrl)
        if (urlUsername) {
          saves.push({ username: urlUsername, postUrl, timestamp })
        }
      }
    }

    // 路徑 2: 可能的其他格式
    if (saves.length === 0 && Array.isArray(data)) {
      for (const item of data) {
        const username = item?.author?.username ||
                        item?.owner?.username ||
                        item?.title
        if (username) {
          saves.push({ username: username.toLowerCase(), postUrl: item?.href || '' })
        }
      }
    }

  } catch (e) {
    console.error('Instagram JSON 解析失敗:', (e as any).message)
  }

  return saves
}

function extractInstagramUsername(url: string): string | null {
  // 某些 URL 格式包含用戶名
  const match = url.match(/instagram\.com\/([^/?&#\s]+)\/p\//)
  return match ? match[1].toLowerCase() : null
}

/* ============================================================================
 * 頻率統計
 * ========================================================================= */

interface AccountStats {
  username: string
  count: number
  platforms: string[]
  tiktokUrls?: string[]
  igUrls?: string[]
  xUrls?: string[]
}

function aggregateAccounts(
  tiktokSaves: TikTokSave[],
  igSaves: InstagramSave[],
  xSaves: XSave[] = []
): AccountStats[] {
  const stats: Map<string, AccountStats> = new Map()

  // TikTok 帳號統計
  for (const save of tiktokSaves) {
    const key = save.username
    if (!stats.has(key)) {
      stats.set(key, { username: key, count: 0, platforms: [], tiktokUrls: [], igUrls: [], xUrls: [] })
    }
    const s = stats.get(key)!
    s.count++
    if (!s.platforms.includes('tiktok')) s.platforms.push('tiktok')
    s.tiktokUrls?.push(save.url)
  }

  // Instagram 帳號統計
  for (const save of igSaves) {
    const key = save.username
    if (!stats.has(key)) {
      stats.set(key, { username: key, count: 0, platforms: [], tiktokUrls: [], igUrls: [], xUrls: [] })
    }
    const s = stats.get(key)!
    s.count++
    if (!s.platforms.includes('instagram')) s.platforms.push('instagram')
    s.igUrls?.push(save.postUrl)
  }

  // X 帳號統計
  for (const save of xSaves) {
    const key = save.username
    if (!stats.has(key)) {
      stats.set(key, { username: key, count: 0, platforms: [], tiktokUrls: [], igUrls: [], xUrls: [] })
    }
    const s = stats.get(key)!
    s.count++
    if (!s.platforms.includes('x')) s.platforms.push('x')
    if (save.tweetUrl) s.xUrls?.push(save.tweetUrl)
  }

  // 跨平台出現 → 加權（每多一個平台加 30% 權重）
  for (const s of stats.values()) {
    if (s.platforms.length > 1) {
      s.count = Math.round(s.count * (1 + (s.platforms.length - 1) * 0.3))
    }
  }

  return Array.from(stats.values())
    .sort((a, b) => b.count - a.count)
}

/* ============================================================================
 * 讀取 ZIP 或目錄中的檔案
 * ========================================================================= */

function readFromZipOrDir(savesDir: string): {
  tiktokFiles: { name: string; content: string }[]
  igFiles: { name: string; content: string }[]
  xFiles: { name: string; content: string }[]
} {
  const tiktokFiles: { name: string; content: string }[] = []
  const igFiles: { name: string; content: string }[] = []
  const xFiles: { name: string; content: string }[] = []

  // Bug fix：追蹤已從 ZIP 處理過的檔案名稱，避免重複處理同名獨立 JSON
  const processedFromZip: Set<string> = new Set()

  if (!existsSync(savesDir)) {
    return { tiktokFiles, igFiles, xFiles }
  }

  const files = readdirSync(savesDir)

  for (const filename of files) {
    const filepath = join(savesDir, filename)

    // ZIP 檔案
    if (filename.endsWith('.zip')) {
      try {
        const zip = new AdmZip(filepath)
        const entries = zip.getEntries()

        for (const entry of entries) {
          const name = entry.name.toLowerCase()
          const entryPath = entry.entryName.toLowerCase()
          const content = entry.getData().toString('utf8')

          // 記錄已從 ZIP 處理過的檔案名稱
          processedFromZip.add(name)

          // TikTok 相關檔案
          if (
            name.includes('tiktok') ||
            entryPath.includes('activity') ||
            name.includes('favourite') ||
            name.includes('favorite') ||
            name.includes('user_data')
          ) {
            if (name.endsWith('.json') || name.endsWith('.txt')) {
              tiktokFiles.push({ name: entry.entryName, content })
            }
          }

          // Instagram 相關檔案（僅解析 saved_posts，明確排除 collections/locations）
          // saved_collections.html 存的是收藏資料夾名稱（如「精選集」），非帳號
          // saved_locations.html 存的是地點資料，非帳號
          const isSavedPostsFile =
            name === 'saved_posts.html' ||
            name === 'saved_posts.json' ||
            (entryPath.includes('saved_posts') &&
             !entryPath.includes('collection') &&
             !entryPath.includes('location'))

          if (isSavedPostsFile && (name.endsWith('.json') || name.endsWith('.html'))) {
            igFiles.push({ name: entry.entryName, content })
          }

          // X (Twitter) 相關檔案：bookmarks.js
          if (
            name === 'bookmarks.js' ||
            (entryPath.includes('data/') && name.includes('bookmark'))
          ) {
            xFiles.push({ name: entry.entryName, content })
          }
        }
      } catch (e) {
        console.error(`ZIP 讀取失敗 (${filename}):`, (e as any).message)
      }
    }

    // 直接的 JSON 或 JS 檔案
    else if (filename.endsWith('.json') || filename.endsWith('.js')) {
      const lowerName = filename.toLowerCase()

      // Bug fix：跳過已從 ZIP 解析過的同名檔案，避免雙重處理
      if (processedFromZip.has(lowerName)) {
        console.log(`   ⏭️ 跳過重複：${filename}（已從 ZIP 解析）`)
        continue
      }

      const content = readFileSync(filepath, 'utf8')

      if (
        lowerName.includes('tiktok') ||
        lowerName.includes('favourite') ||
        lowerName.includes('user_data')
      ) {
        tiktokFiles.push({ name: filename, content })
      } else if (
        lowerName.includes('saved') ||
        lowerName.includes('instagram')
      ) {
        igFiles.push({ name: filename, content })
      } else if (
        lowerName.includes('bookmark') ||
        lowerName.includes('twitter')
      ) {
        xFiles.push({ name: filename, content })
      }
    }

    // TXT 檔案（TikTok 舊格式）
    else if (filename.endsWith('.txt')) {
      const content = readFileSync(filepath, 'utf8')
      const lowerName = filename.toLowerCase()

      if (
        lowerName.includes('tiktok') ||
        lowerName.includes('favourite') ||
        content.includes('tiktok.com')
      ) {
        tiktokFiles.push({ name: filename, content })
      }
    }
  }

  return { tiktokFiles, igFiles, xFiles }
}

/* ============================================================================
 * 更新 accounts.json
 * ========================================================================= */

function updateAccountsJson(topAccounts: AccountStats[]) {
  let existing: any = {
    _comment: '三平台競品帳號清單',
    competitors: [],
    myAccount: { name: '我的帳號', tiktok: '', instagram: '', facebook: '', positioning: '' },
    settings: { maxPostsPerPlatform: 30, daysLookback: 30 }
  }

  if (existsSync(ACCOUNTS_FILE)) {
    try {
      existing = JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf8'))
    } catch {}
  }

  // 過濾出跨平台帳號或高頻率帳號
  const newCompetitors = topAccounts
    .filter(a => a.count >= 2)  // 至少收藏 2 次
    .slice(0, TOP_N)
    .map(a => ({
      name: a.username,
      tiktok: a.platforms.includes('tiktok') ? a.username : '',
      instagram: a.platforms.includes('instagram') ? a.username : '',
      facebook: '',
      twitterX: a.platforms.includes('x') ? a.username : '',
      _stats: `被收藏 ${a.count} 次 [${a.platforms.join('+')}]`
    }))

  existing.competitors = newCompetitors
  existing._generated = new Date().toISOString()
  existing._source = 'parse-saves.ts（從 TikTok/IG 收藏資料自動生成）'

  writeFileSync(ACCOUNTS_FILE, JSON.stringify(existing, null, 2))
  console.log(`\n✅ accounts.json 已更新（${newCompetitors.length} 個帳號）`)
}

/* ============================================================================
 * 主程式
 * ========================================================================= */

async function main() {
  console.log('🔍 Phase 0：從 TikTok + Instagram + X 收藏挖掘帳號清單')
  console.log(`📁 讀取目錄：${SAVES_DIR}\n`)

  // 讀取檔案（含 X 書簽）
  const { tiktokFiles, igFiles, xFiles } = readFromZipOrDir(SAVES_DIR)

  if (tiktokFiles.length === 0 && igFiles.length === 0 && xFiles.length === 0) {
    console.error('❌ 未在 ./saves/ 目錄中找到任何資料檔案')
    console.error('\n📋 使用說明：')
    console.error('  TikTok：')
    console.error('    1. 打開 TikTok App → 設定 → 隱私 → 下載你的資料')
    console.error('    2. 選擇「JSON 格式」，等待下載')
    console.error('    3. 把 ZIP 檔案放到 ./saves/ 目錄')
    console.error('\n  Instagram：')
    console.error('    1. 打開 IG App → 設定 → 帳號 → 你的資料 → 下載資料')
    console.error('    2. 選擇「JSON 格式」，等待 Email 通知')
    console.error('    3. 把 ZIP 檔案放到 ./saves/ 目錄')
    console.error('\n  X (Twitter)：')
    console.error('    1. X.com → 設定 → 帳號 → 下載你的 X 資料封存')
    console.error('    2. 等待下載通知（需幾天）')
    console.error('    3. 把 ZIP 檔案放到 ./saves/ 目錄')
    process.exit(1)
  }

  // 解析 TikTok
  let allTikTokSaves: TikTokSave[] = []
  if (tiktokFiles.length > 0) {
    console.log(`📱 找到 ${tiktokFiles.length} 個 TikTok 資料檔案`)
    for (const file of tiktokFiles) {
      const saves = await parseTikTokData(file.content, file.name)
      allTikTokSaves = [...allTikTokSaves, ...saves]
      if (saves.length > 0) {
        console.log(`   ✅ ${file.name}: 解析到 ${saves.length} 筆收藏`)
      }
    }
    console.log(`   📊 TikTok 收藏總計：${allTikTokSaves.length} 筆`)
  } else {
    console.log('📱 TikTok：未找到資料檔案（跳過）')
  }

  // 解析 Instagram
  let allIgSaves: InstagramSave[] = []
  if (igFiles.length > 0) {
    console.log(`\n📸 找到 ${igFiles.length} 個 Instagram 資料檔案`)
    for (const file of igFiles) {
      const saves = parseInstagramData(file.content)
      allIgSaves = [...allIgSaves, ...saves]
      if (saves.length > 0) {
        console.log(`   ✅ ${file.name}: 解析到 ${saves.length} 筆收藏`)
      }
    }
    console.log(`   📊 Instagram 收藏總計：${allIgSaves.length} 筆`)
  } else {
    console.log('📸 Instagram：未找到資料檔案（跳過）')
  }

  // 解析 X 書簽
  let allXSaves: XSave[] = []
  if (xFiles.length > 0) {
    console.log(`\n🐦 找到 ${xFiles.length} 個 X 書簽資料檔案`)
    for (const file of xFiles) {
      const saves = await parseXData(file.content, file.name)
      allXSaves = [...allXSaves, ...saves]
      if (saves.length > 0) {
        console.log(`   ✅ ${file.name}: 解析到 ${saves.length} 筆書簽`)
      }
    }
    console.log(`   📊 X 書簽總計：${allXSaves.length} 筆`)
  } else {
    console.log('🐦 X (Twitter)：未找到書簽檔案（跳過）')
    console.log('   提示：X 資料封存含 data/bookmarks.js，解壓後放入 saves/')
  }

  if (allTikTokSaves.length === 0 && allIgSaves.length === 0 && allXSaves.length === 0) {
    console.error('\n❌ 未解析到任何收藏資料，請確認檔案格式正確')
    console.error('提示：TikTok 請選擇「JSON 格式」下載，非「TXT 格式」')
    process.exit(1)
  }

  // 彙整排名（含 X）
  const topAccounts = aggregateAccounts(allTikTokSaves, allIgSaves, allXSaves)

  // 顯示結果
  console.log('\n' + '═'.repeat(60))
  console.log(`🏆 帳號收藏頻率排名 TOP ${Math.min(TOP_N, topAccounts.length)}`)
  console.log('═'.repeat(60))

  // TikTok 專屬
  const tiktokOnly = topAccounts.filter(a =>
    a.platforms.length === 1 && a.platforms[0] === 'tiktok'
  ).slice(0, 10)

  if (tiktokOnly.length > 0) {
    console.log('\n📱 TikTok 高頻收藏帳號：')
    tiktokOnly.forEach((a, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. @${a.username.padEnd(25)} ← 收藏 ${a.count} 次`)
    })
  }

  // Instagram 專屬
  const igOnly = topAccounts.filter(a =>
    a.platforms.length === 1 && a.platforms[0] === 'instagram'
  ).slice(0, 10)

  if (igOnly.length > 0) {
    console.log('\n📸 Instagram 高頻收藏帳號：')
    igOnly.forEach((a, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. @${a.username.padEnd(25)} ← 收藏 ${a.count} 次`)
    })
  }

  // X 書簽專屬
  const xOnly = topAccounts.filter(a =>
    a.platforms.length === 1 && a.platforms[0] === 'x'
  ).slice(0, 10)

  if (xOnly.length > 0) {
    console.log('\n🐦 X 高頻書簽帳號：')
    xOnly.forEach((a, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. @${a.username.padEnd(25)} ← 書簽 ${a.count} 次`)
    })
  }

  // 跨平台
  const crossPlatform = topAccounts.filter(a => a.platforms.length > 1)
  if (crossPlatform.length > 0) {
    console.log('\n⭐ 跨平台都有收藏（最值得關照）：')
    crossPlatform.forEach((a, i) => {
      const platforms = a.platforms.map(p => {
        if (p === 'tiktok') return '📱TT'
        if (p === 'instagram') return '📸IG'
        if (p === 'x') return '🐦X'
        return p
      }).join(' + ')
      console.log(`  ${(i + 1).toString().padStart(2)}. @${a.username.padEnd(25)} ← 收藏 ${a.count} 次 [${platforms}]`)
    })
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`📋 共發現 ${topAccounts.length} 個不重複帳號`)
  console.log(`   其中收藏 ≥2 次：${topAccounts.filter(a => a.count >= 2).length} 個`)
  console.log(`   跨平台（≥2個平台）：${crossPlatform.length} 個`)

  // 更新 accounts.json
  updateAccountsJson(topAccounts)

  console.log('\n🎯 下一步：')
  console.log('   1. 確認 accounts.json 中的帳號清單（含 twitterX 欄位）')
  console.log('   2. 補充 Facebook 粉專網址（如有需要）')
  console.log('   3. 執行：bun run scrape.ts')
  if (xFiles.length === 0) {
    console.log('\n   💡 尚無 X 書簽資料：')
    console.log('   → X.com → 設定 → 帳號 → 下載你的 X 資料封存')
    console.log('   → 收到 ZIP 後放入 saves/ 再重跑 parse-saves.ts')
  }
}

main().catch(err => {
  console.error('❌ 執行失敗:', err.message)
  process.exit(1)
})
