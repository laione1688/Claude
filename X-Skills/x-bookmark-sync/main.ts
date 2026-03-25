#!/usr/bin/env bun
/**
 * X Bookmark Sync — Cookie-based GraphQL Edition
 * 每日從 X.com 抓取新書簽，依分類決定是否轉換為 Obsidian Markdown
 *
 * 使用方式：
 *   bun main.ts                    # 執行同步
 *   bun main.ts --dry-run          # 模擬執行（不寫入 Obsidian）
 *   bun main.ts --reset            # 清除已處理書簽狀態
 *   bun main.ts --test-cookie      # 測試 cookie 是否有效
 *   bun main.ts --reprocess-indexed # 重新評估已索引書簽，符合條件者轉為全文 MD
 *   bun main.ts --reprocess-full   # 重新同步 author=undefined 的全文書簽（修復截斷 + 作者問題）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs"
import { join, dirname } from "path"
import { createHash, randomBytes } from "crypto"

// ─────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────

interface Config {
  oauth2: {
    client_id: string
    client_secret: string
    redirect_uri: string
    scopes: string[]
  }
  cookies: {
    auth_token: string
    ct0: string
  }
  schedule: { hour: number; minute: number }
  categories: Record<string, {
    keywords: string[]
    convert: boolean
    description: string
  }>
  obsidian: { vault_path: string; inbox_path: string; index_path: string }
}

interface Tokens {
  access_token: string | null
  refresh_token: string | null
  expires_at: number | null
  user_id: string | null
  username: string | null
}

interface Bookmark {
  id: string
  text: string
  author_id: string
  author_name?: string
  created_at: string
  urls?: string[]
}

interface State {
  seenIds: string[]
  lastSync: string | null
  totalProcessed: number
}

// ─────────────────────────────────────────────
// 路徑設定
// ─────────────────────────────────────────────

const SCRIPT_DIR = dirname(import.meta.path ?? ".")
const CONFIG_PATH = join(SCRIPT_DIR, "config.json")
const STATE_PATH = join(SCRIPT_DIR, "state/seen-bookmarks.json")
const TOKENS_PATH = join(SCRIPT_DIR, "state/tokens.json")

// ─────────────────────────────────────────────
// 工具函式
// ─────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toLocaleTimeString("zh-TW")
  console.log(`[${ts}] ${msg}`)
}

function loadConfig(): Config {
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config
}

function loadState(): State {
  if (!existsSync(STATE_PATH)) {
    return { seenIds: [], lastSync: null, totalProcessed: 0 }
  }
  return JSON.parse(readFileSync(STATE_PATH, "utf-8")) as State
}

function saveState(state: State): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

function loadTokens(): Tokens {
  if (!existsSync(TOKENS_PATH)) {
    return { access_token: null, refresh_token: null, expires_at: null, user_id: null, username: null }
  }
  return JSON.parse(readFileSync(TOKENS_PATH, "utf-8")) as Tokens
}

function saveTokens(tokens: Tokens): void {
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2))
}

// ─────────────────────────────────────────────
// PKCE 工具
// ─────────────────────────────────────────────

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url")
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = createHash("sha256").update(verifier).digest()
  return Buffer.from(hash).toString("base64url")
}

// ─────────────────────────────────────────────
// OAuth 2.0 授權流程
// ─────────────────────────────────────────────

async function runOAuthFlow(config: Config): Promise<Tokens> {
  const { client_id, client_secret, redirect_uri, scopes } = config.oauth2

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = randomBytes(16).toString("hex")

  // 建立授權 URL
  const authUrl = "https://twitter.com/i/oauth2/authorize?" + new URLSearchParams({
    response_type: "code",
    client_id,
    redirect_uri,
    scope: scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  log("🌐 開啟瀏覽器進行 X 授權...")
  log(`\n授權網址：\n${authUrl}\n`)

  // 開啟瀏覽器（macOS）
  Bun.spawn(["open", authUrl])

  // 啟動本地 HTTP server 等待 callback
  log("⏳ 等待授權完成（在瀏覽器點擊「授權」後自動繼續）...")

  let authCode: string | null = null
  let serverDone = false

  const server = Bun.serve({
    port: 3000,
    fetch(req) {
      const url = new URL(req.url)
      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code")
        const returnedState = url.searchParams.get("state")
        const error = url.searchParams.get("error")

        if (error) {
          serverDone = true
          return new Response(`
            <html><body style="font-family:sans-serif;text-align:center;padding:50px">
              <h2>❌ 授權失敗</h2><p>${error}</p>
              <p>請關閉此視窗並重試</p>
            </body></html>`, { headers: { "Content-Type": "text/html" } })
        }

        if (returnedState !== state) {
          serverDone = true
          return new Response(`
            <html><body style="font-family:sans-serif;text-align:center;padding:50px">
              <h2>❌ State 不符</h2><p>可能的安全問題，請重試</p>
            </body></html>`, { headers: { "Content-Type": "text/html" } })
        }

        authCode = code
        serverDone = true
        return new Response(`
          <html><body style="font-family:sans-serif;text-align:center;padding:50px">
            <h2>✅ 授權成功！</h2>
            <p>X Bookmark Sync 已獲得存取權限</p>
            <p>可以關閉此視窗了</p>
            <script>setTimeout(() => window.close(), 2000)</script>
          </body></html>`, { headers: { "Content-Type": "text/html" } })
      }
      return new Response("Not found", { status: 404 })
    },
  })

  // 等待授權完成（最多 5 分鐘）
  const timeout = Date.now() + 5 * 60 * 1000
  while (!serverDone && Date.now() < timeout) {
    await new Promise(r => setTimeout(r, 500))
  }
  server.stop()

  if (!authCode) {
    throw new Error("❌ 授權逾時或失敗，請重新執行 bun main.ts --auth")
  }

  log("✅ 授權碼取得成功，正在交換 Token...")

  // 交換 authorization code → access token
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
    },
    body: new URLSearchParams({
      code: authCode,
      grant_type: "authorization_code",
      client_id,
      redirect_uri,
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`❌ Token 交換失敗 (${tokenRes.status}): ${err}`)
  }

  const tokenData = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
  }

  // 取得用戶資訊
  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const me = meRes.ok
    ? (await meRes.json() as { data: { id: string; username: string } }).data
    : { id: "unknown", username: "unknown" }

  const tokens: Tokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at: Date.now() + tokenData.expires_in * 1000,
    user_id: me.id,
    username: me.username,
  }

  saveTokens(tokens)
  log(`✅ 授權完成！帳號：@${me.username}`)

  return tokens
}

// ─────────────────────────────────────────────
// Token 管理（自動 Refresh）
// ─────────────────────────────────────────────

async function getValidAccessToken(config: Config): Promise<{ token: string; userId: string }> {
  let tokens = loadTokens()

  // 沒有 token → 執行授權流程
  if (!tokens.access_token) {
    log("🔐 尚未授權，啟動 OAuth 流程...")
    tokens = await runOAuthFlow(config)
  }

  // Token 即將過期（5 分鐘緩衝）→ 嘗試 refresh
  const isExpiringSoon = tokens.expires_at && tokens.expires_at < Date.now() + 5 * 60 * 1000
  if (isExpiringSoon && tokens.refresh_token) {
    log("🔄 Access Token 即將過期，使用 Refresh Token 更新...")

    const refreshRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(
          `${config.oauth2.client_id}:${config.oauth2.client_secret}`
        ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: config.oauth2.client_id,
      }),
    })

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json() as {
        access_token: string
        refresh_token?: string
        expires_in: number
      }
      tokens.access_token = refreshData.access_token
      tokens.refresh_token = refreshData.refresh_token ?? tokens.refresh_token
      tokens.expires_at = Date.now() + refreshData.expires_in * 1000
      saveTokens(tokens)
      log("✅ Token 已更新")
    } else {
      // Refresh 失敗 → 需要重新授權
      log("⚠️  Refresh Token 已失效，需要重新授權...")
      tokens = await runOAuthFlow(config)
    }
  }

  return {
    token: tokens.access_token!,
    userId: tokens.user_id!,
  }
}

// ─────────────────────────────────────────────
// 書簽抓取（Playwright 真實瀏覽器 — 免費、免 API key）
// 原理：用 Chromium 設好 cookies 開啟書簽頁，攔截瀏覽器自己發出的 API 呼叫
// 瀏覽器會自動計算 x-client-transaction-id 等動態 header，無需手動處理
// ─────────────────────────────────────────────

function extractTweetsFromResponse(data: unknown, target: Bookmark[]): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any
  const timeline =
    d?.data?.bookmark_timeline_v2?.timeline ??
    d?.data?.bookmark_timeline?.timeline

  if (!timeline) return

  const entries: unknown[] = timeline.instructions
    ?.flatMap((inst: { type: string; entries?: unknown[] }) =>
      inst.type === "TimelineAddEntries" ? inst.entries ?? [] : []
    ) ?? []

  for (const entry of entries as Array<{
    content?: {
      entryType?: string
      itemContent?: {
        tweet_results?: {
          result?: unknown
        }
      }
    }
  }>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result = entry?.content?.itemContent?.tweet_results?.result as any

    // 解包 TweetWithVisibilityResults（X.com 舊型包裝格式，現已改為 Tweet 型別）
    if (result?.__typename === "TweetWithVisibilityResults" && result?.tweet) {
      result = result.tweet
    }

    if (!result?.rest_id) continue

    const legacy = result.legacy
    // X.com 新 API 結構：screen_name 和 name 在 user_results.result.core（不是 legacy）
    // 舊結構：user_results.result.legacy.screen_name（保留作 fallback）
    const userResult = result.core?.user_results?.result
    const screenName: string | undefined =
      userResult?.core?.screen_name ??   // 新結構（2025+）
      userResult?.legacy?.screen_name    // 舊結構 fallback
    const displayName: string | undefined =
      userResult?.core?.name ??          // 新結構
      userResult?.legacy?.name           // 舊結構 fallback

    // 優先使用 note_tweet（X Premium 長推文完整文字）
    // legacy.full_text 對長推文只有前 280 字，note_tweet.text 才是完整版
    const noteTweet = result?.note_tweet?.note_tweet_results?.result
    const tweetText = noteTweet?.text || legacy?.full_text

    if (tweetText) {
      // 合併 note_tweet 和 legacy 的連結（去重）
      const noteTweetUrls: string[] = noteTweet?.entity_set?.urls
        ?.map((u: { expanded_url: string }) => u.expanded_url)
        .filter((u: string) => !u.includes("t.co")) ?? []
      const legacyUrls: string[] = legacy?.entities?.urls
        ?.map((u: { expanded_url: string }) => u.expanded_url)
        .filter((u: string) => !u.includes("t.co")) ?? []

      target.push({
        id: result.rest_id,
        text: tweetText,
        author_id: screenName ?? "unknown",
        author_name: screenName
          ? `@${screenName}${displayName ? ` (${displayName})` : ""}`
          : undefined,
        created_at: legacy?.created_at ?? new Date().toISOString(),
        urls: [...new Set([...noteTweetUrls, ...legacyUrls])],
      })
    }
  }
}

async function fetchBookmarks(config: Config): Promise<Bookmark[]> {
  const { cookies } = config

  if (!cookies.auth_token || !cookies.ct0) {
    throw new Error(
      "❌ Cookie 未設定。請在 config.json 的 cookies.auth_token 和 cookies.ct0 填入你的 X.com Cookie。\n" +
      "   操作方式：\n" +
      "   1. 開啟 Chrome → x.com（確認已登入）\n" +
      "   2. F12 → Application → Cookies → https://x.com\n" +
      "   3. 找到 auth_token 和 ct0，複製 Value 填入 config.json"
    )
  }

  const isDebug = process.argv.includes("--debug")
  const { chromium } = await import("playwright")

  log("🌐 啟動 Chromium（無頭模式）...")
  const browser = await chromium.launch({ headless: !isDebug })
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  })

  // 設定 X.com 登入 cookies
  await context.addCookies([
    { name: "auth_token", value: cookies.auth_token, domain: ".x.com", path: "/" },
    { name: "ct0",        value: cookies.ct0,        domain: ".x.com", path: "/" },
  ])

  const allBookmarks: Bookmark[] = []
  const page = await context.newPage()

  // 攔截所有 Bookmarks GraphQL 呼叫（瀏覽器自動帶正確 headers）
  page.on("response", async (response) => {
    const url = response.url()
    if (url.includes("/graphql/") && url.includes("Bookmarks") && response.ok()) {
      try {
        const data = await response.json()
        const before = allBookmarks.length
        extractTweetsFromResponse(data, allBookmarks)
        if (isDebug) log(`[DEBUG] 攔截到 API 回應，新增 ${allBookmarks.length - before} 則`)
      } catch { /* 非 JSON 回應略過 */ }
    }
  })

  log("📖 導航至 x.com/i/bookmarks...")
  await page.goto("https://x.com/i/bookmarks", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  })

  // 等待初始 API 呼叫完成
  await page.waitForTimeout(3000)

  // 滾動載入更多書簽（重複直到沒有新增）
  let lastCount = 0
  let scrollAttempts = 0
  const MAX_SCROLLS = 20 // 最多取 ~1000 則

  while (scrollAttempts < MAX_SCROLLS) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)

    if (allBookmarks.length === lastCount) {
      scrollAttempts++
      if (scrollAttempts >= 3) break // 連續 3 次沒新增 → 結束
    } else {
      lastCount = allBookmarks.length
      scrollAttempts = 0
    }
  }

  await browser.close()
  log(`✅ Playwright 抓取完成，共 ${allBookmarks.length} 個書簽`)
  return allBookmarks
}

// ─────────────────────────────────────────────
// 分類
// ─────────────────────────────────────────────

function classify(bookmark: Bookmark, config: Config): { category: string; convert: boolean } {
  const text = bookmark.text.toLowerCase()
  for (const [category, catConfig] of Object.entries(config.categories)) {
    if (catConfig.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return { category, convert: catConfig.convert }
    }
  }
  return { category: "other", convert: false }
}

// ─────────────────────────────────────────────
// 共用工具：安全檔名 + 預覽文字
// ─────────────────────────────────────────────

function safeForFilename(str: string, maxLen = 30): string {
  return str
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, maxLen)
}

function makePreview(text: string, maxLen = 120): string {
  return text
    .replace(/[\n\r]+/g, " ")
    .replace(/https:\/\/t\.co\/\S+/g, "")
    .trim()
    .slice(0, maxLen)
}

// ─────────────────────────────────────────────
// Markdown 全文轉換（格式：bookmark-is-learned raw + YAML frontmatter）
// frontmatter 供 Dataview 查詢，body 供閱讀
// ─────────────────────────────────────────────

function toMarkdown(bookmark: Bookmark, category: string): { filename: string; content: string } {
  const now = new Date()
  const tweetDate = new Date(bookmark.created_at).toISOString().split("T")[0]
  const bookmarkedDate = now.toISOString().split("T")[0]
  const dateStr = now.getFullYear() + "-"
    + String(now.getMonth() + 1).padStart(2, "0") + "-"
    + String(now.getDate()).padStart(2, "0") + " "
    + String(now.getHours()).padStart(2, "0") + ":"
    + String(now.getMinutes()).padStart(2, "0")

  const tweetUrl = `https://x.com/i/web/status/${bookmark.id}`
  const author = bookmark.author_name ?? bookmark.author_id

  // 檔名：handle-title-YYYYMMDD-HHMMSS.md（與其他系統格式一致）
  const fileTimestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") + "-" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0")
  const safeHandle = safeForFilename(bookmark.author_id, 30)
  let titleText = safeForFilename(
    bookmark.text.replace(/[\n\r]+/g, " "), 50
  )
  if (bookmark.text.length > 50) {
    const lastSpace = titleText.lastIndexOf(" ")
    if (lastSpace > 20) titleText = titleText.slice(0, lastSpace)
  }
  if (!titleText) titleText = "untitled"
  const filename = `${safeHandle}-${titleText}-${fileTimestamp}.md`

  // YAML frontmatter（Dataview 可查詢）
  const preview = makePreview(bookmark.text, 120).replace(/"/g, '\\"')
  const lines: string[] = [
    "---",
    `source: x.com`,
    `author: "${author}"`,
    `handle: "${bookmark.author_id}"`,
    `tweet_id: "${bookmark.id}"`,
    `bookmarked_date: ${bookmarkedDate}`,
    `tweet_date: ${tweetDate}`,
    `category: ${category}`,
    `convert: true`,
    `url: "${tweetUrl}"`,
    `preview: "${preview}"`,
    `tags: [x-bookmark, ${category}]`,
    "---",
    "",
    // bookmark-is-learned 風格 body（供閱讀）
    `# ${author}`,
    "",
    `> **Author**: ${author}`,
    `> **Source**: ${tweetUrl}`,
    `> **Date**: ${dateStr}`,
    "",
    "---",
    "",
    "## Original Content",
    "",
    bookmark.text,
    "",
  ]

  // 附帶連結（若有）
  if (bookmark.urls && bookmark.urls.length > 0) {
    lines.push("### Links", "")
    for (const url of bookmark.urls) lines.push(`- ${url}`)
    lines.push("")
  }

  return { filename, content: lines.join("\n") }
}

// ─────────────────────────────────────────────
// Markdown 輕量索引（純 YAML frontmatter + preview，無全文）
// 用於 convert=false 的書簽，讓 Dataview 可查詢
// ─────────────────────────────────────────────

function toMarkdownIndex(bookmark: Bookmark, category: string): { filename: string; content: string } {
  const now = new Date()
  const tweetDate = new Date(bookmark.created_at).toISOString().split("T")[0]
  const bookmarkedDate = now.toISOString().split("T")[0]
  const tweetUrl = `https://x.com/i/web/status/${bookmark.id}`
  const author = bookmark.author_name ?? bookmark.author_id
  const preview = makePreview(bookmark.text, 120).replace(/"/g, '\\"')

  // 索引檔名：idx-{tweet_id}.md（保證唯一、不需可讀性）
  const filename = `idx-${bookmark.id}.md`

  const content = [
    "---",
    `source: x.com`,
    `author: "${author}"`,
    `handle: "${bookmark.author_id}"`,
    `tweet_id: "${bookmark.id}"`,
    `bookmarked_date: ${bookmarkedDate}`,
    `tweet_date: ${tweetDate}`,
    `category: ${category}`,
    `convert: false`,
    `url: "${tweetUrl}"`,
    `preview: "${preview}"`,
    `tags: [x-bookmark, ${category}, x-index]`,
    "---",
    "",
  ].join("\n")

  return { filename, content }
}

// ─────────────────────────────────────────────
// Obsidian 寫入（全文）
// ─────────────────────────────────────────────

function writeToObsidian(filename: string, content: string, config: Config): string {
  const targetDir = join(config.obsidian.vault_path, config.obsidian.inbox_path)
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })
  const filePath = join(targetDir, filename)
  const finalPath = existsSync(filePath) ? filePath.replace(".md", `-${Date.now()}.md`) : filePath
  writeFileSync(finalPath, content, "utf-8")
  return finalPath
}

// ─────────────────────────────────────────────
// Obsidian 寫入（輕量索引，存至 _index/ 子目錄）
// ─────────────────────────────────────────────

function writeToIndex(filename: string, content: string, config: Config): string {
  const targetDir = join(config.obsidian.vault_path, config.obsidian.index_path)
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })
  const filePath = join(targetDir, filename)
  // 若已存在（重複執行）直接覆蓋（idx-{tweet_id}.md 保證同一則 tweet 永遠同名）
  writeFileSync(filePath, content, "utf-8")
  return filePath
}

// ─────────────────────────────────────────────
// Setup — 互動式設定 Client ID/Secret
// ─────────────────────────────────────────────

async function runSetup(): Promise<void> {
  console.log("\n🔧 X Bookmark Sync — 設定精靈\n")
  const config = loadConfig()

  console.log("請從 developer.twitter.com 的 App 頁面取得：")
  console.log("Settings → User authentication settings → 儲存後的 OAuth 2.0 Client ID & Secret\n")

  process.stdout.write("Client ID: ")
  const reader = config.oauth2.client_id  // 從 stdin 讀取

  // 使用 Bun 的標準輸入
  const stdin = Bun.stdin.stream()
  const chunks: Buffer[] = []
  for await (const chunk of stdin) {
    chunks.push(Buffer.from(chunk))
    const text = Buffer.concat(chunks).toString().trim()
    if (text.includes("\n")) break
  }

  // 簡化：直接提示用戶手動編輯 config.json
  console.log("\n✏️  請直接編輯 config.json 填入：")
  console.log(`   "client_id": "你的 Client ID"`)
  console.log(`   "client_secret": "你的 Client Secret"`)
  console.log("\n填好後執行：bun main.ts --auth")
}

// ─────────────────────────────────────────────
// 重新評估已索引書簽（修復首次同步分類錯誤）
// 讀取 _index/ 目錄下的 idx-*.md，對仍在 seenIds 的書簽重新分類
// 若現在符合 convert: true，從 seenIds 移除 → 後續正常同步會重新抓取並轉換為全文
// ─────────────────────────────────────────────

function reprocessIndexed(config: Config, state: State): number {
  const indexDir = join(config.obsidian.vault_path, config.obsidian.index_path)
  if (!existsSync(indexDir)) {
    log("⚠️  索引目錄不存在，跳過重新評估")
    return 0
  }

  const files = readdirSync(indexDir).filter(f => f.startsWith("idx-") && f.endsWith(".md"))
  log(`🔍 掃描索引目錄：${files.length} 個 idx-*.md 檔案`)

  const seenSet = new Set(state.seenIds)
  const toRemove: string[] = []

  for (const file of files) {
    const content = readFileSync(join(indexDir, file), "utf-8")

    // 解析 frontmatter 中的 tweet_id
    const tweetIdMatch = content.match(/^tweet_id:\s*"(\d+)"/m)
    if (!tweetIdMatch) continue
    const tweetId = tweetIdMatch[1]

    // 只處理仍在 seenIds 中的書簽（避免處理 --reset 後的殘留索引）
    if (!seenSet.has(tweetId)) continue

    // 解析 preview 作為重新分類文字
    const previewMatch = content.match(/^preview:\s*"(.*)"/m)
    const preview = previewMatch ? previewMatch[1].replace(/\\"/g, '"') : ""

    const fakeBookmark: Bookmark = {
      id: tweetId,
      text: preview,
      author_id: "unknown",
      created_at: new Date().toISOString(),
    }
    const { convert } = classify(fakeBookmark, config)

    if (convert) {
      toRemove.push(tweetId)
    }
  }

  if (toRemove.length === 0) {
    log("✅ 索引書簽中沒有需要重新轉換為全文的項目")
    return 0
  }

  log(`🔄 發現 ${toRemove.length} 個索引書簽符合全文轉換條件（共掃描 ${files.length} 個）`)

  // 從 seenIds 移除這些 ID（讓後續同步將其視為「新書簽」重新處理）
  const removeSet = new Set(toRemove)
  state.seenIds = state.seenIds.filter(id => !removeSet.has(id))

  return toRemove.length
}

// ─────────────────────────────────────────────
// 重新同步有截斷問題的全文書簽（修復 author=undefined + 長推文被截斷）
// 識別方式：全文 MD 檔案中有 author: "@undefined (undefined)" 的 YAML 欄位
// 移除這些 tweet_id 從 seenIds → 後續正常同步會重新抓取並正確寫入
// ─────────────────────────────────────────────

function reprocessFull(config: Config, state: State): number {
  const inboxDir = join(config.obsidian.vault_path, config.obsidian.inbox_path)
  if (!existsSync(inboxDir)) {
    log("⚠️  全文目錄不存在，跳過")
    return 0
  }

  const files = readdirSync(inboxDir).filter(f => f.endsWith(".md"))
  log(`🔍 掃描全文目錄：${files.length} 個 .md 檔案`)

  const seenSet = new Set(state.seenIds)
  const toRemove: string[] = []

  for (const file of files) {
    const content = readFileSync(join(inboxDir, file), "utf-8")

    // 識別標記：author: "@undefined (undefined)" 是 x-bookmark-sync 截斷 bug 的特徵
    if (!content.includes('author: "@undefined (undefined)"')) continue

    // 解析 tweet_id
    const tweetIdMatch = content.match(/^tweet_id:\s*"(\d+)"/m)
    if (!tweetIdMatch) continue
    const tweetId = tweetIdMatch[1]

    // 只移除仍在 seenIds 中的（確保是我們系統處理過的）
    if (seenSet.has(tweetId)) {
      toRemove.push(tweetId)
    }
  }

  if (toRemove.length === 0) {
    log("✅ 沒有需要重新同步的全文書簽")
    return 0
  }

  log(`🔄 發現 ${toRemove.length} 個 author=undefined 的全文書簽（共掃描 ${files.length} 個）`)

  const removeSet = new Set(toRemove)
  state.seenIds = state.seenIds.filter(id => !removeSet.has(id))
  return toRemove.length
}

// ─────────────────────────────────────────────
// 主程式
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run")
  const isReset = args.includes("--reset")
  const isTestCookie = args.includes("--test-cookie")
  const isReprocessIndexed = args.includes("--reprocess-indexed")
  const isReprocessFull = args.includes("--reprocess-full")

  console.log("📚 X Bookmark Sync (Cookie + GraphQL)")
  console.log(`⏰ 執行時間：${new Date().toLocaleString("zh-TW")}\n`)

  if (isReset) {
    saveState({ seenIds: [], lastSync: null, totalProcessed: 0 })
    console.log("✅ 狀態已重置")
    return
  }

  if (isDryRun) console.log("🏃 Dry Run 模式 — 不會實際寫入 Obsidian\n")

  try {
    const config = loadConfig()

    // Cookie 測試模式
    if (isTestCookie) {
      log("🍪 測試 Cookie 有效性...")
      const bookmarks = await fetchBookmarks(config)
      log(`✅ Cookie 有效！取得 ${bookmarks.length} 個書簽`)
      if (bookmarks[0]) {
        log(`   最新書簽：${bookmarks[0].text.slice(0, 80)}...`)
      }
      return
    }

    const state = loadState()

    // --reprocess-full 模式：重新同步所有 author=undefined 的截斷全文書簽
    if (isReprocessFull) {
      log("🔄 --reprocess-full 模式：重新同步 author=undefined 的全文書簽\n")
      const removed = reprocessFull(config, state)

      if (removed === 0) {
        log("  沒有需要重新同步的全文書簽，退出")
        return
      }

      if (!isDryRun) {
        saveState(state)
        log(`✅ 已從 seenIds 移除 ${removed} 個 ID，繼續重新同步...\n`)
      } else {
        log(`🏃 [DRY] 將從 seenIds 移除 ${removed} 個 ID，繼續模擬同步...\n`)
      }
    }

    // --reprocess-indexed 模式：重新評估已索引書簽，轉換符合條件者為全文
    if (isReprocessIndexed) {
      log("🔄 --reprocess-indexed 模式：重新評估已索引書簽\n")
      const removed = reprocessIndexed(config, state)

      if (removed === 0) {
        log("  使用提示：嘗試擴充 config.json 的關鍵詞後再執行")
        return
      }

      if (!isDryRun) {
        saveState(state)
        log(`✅ 已從 seenIds 移除 ${removed} 個 ID，繼續重新同步...\n`)
      } else {
        log(`🏃 [DRY] 將從 seenIds 移除 ${removed} 個 ID，繼續模擬同步...\n`)
      }
    }

    // 抓取書簽
    log("🔍 正在從 X.com 抓取書簽（GraphQL）...")
    const allBookmarks = await fetchBookmarks(config)
    log(`  取得 ${allBookmarks.length} 個書簽`)

    // 增量比對
    const seenSet = new Set(state.seenIds)
    const newBookmarks = allBookmarks.filter(b => !seenSet.has(b.id))
    log(`✨ 新增書簽：${newBookmarks.length} 個`)

    if (newBookmarks.length === 0) {
      log("  沒有新書簽，同步完成")
      state.lastSync = new Date().toISOString()
      saveState(state)
      return
    }

    // 處理新書簽
    let converted = 0, indexed = 0, failed = 0

    for (const bookmark of newBookmarks) {
      try {
        const { category, convert } = classify(bookmark, config)
        const preview = bookmark.text.slice(0, 50).replace(/\n/g, " ")

        if (convert) {
          // 全文轉換 → 寫入主目錄（含 YAML frontmatter + 全文）
          const { filename, content } = toMarkdown(bookmark, category)
          if (!isDryRun) {
            const savedPath = writeToObsidian(filename, content, config)
            log(`  ✅ [${category}] ${preview}...`)
            log(`      → ${savedPath}`)
          } else {
            log(`  ✅ [DRY] [${category}] ${preview}...`)
          }
          converted++
        } else {
          // 輕量索引 → 寫入 _index/ 子目錄（只有 YAML frontmatter + preview）
          const { filename, content } = toMarkdownIndex(bookmark, category)
          if (!isDryRun) {
            writeToIndex(filename, content, config)
            log(`  📋 [${category}] ${preview}...（已索引）`)
          } else {
            log(`  📋 [DRY] [${category}] ${preview}...（索引）`)
          }
          indexed++
        }

        state.seenIds.push(bookmark.id)
      } catch (err) {
        log(`  ❌ 處理失敗 ${bookmark.id}: ${err}`)
        failed++
      }
    }

    state.lastSync = new Date().toISOString()
    state.totalProcessed += converted + indexed
    if (!isDryRun) saveState(state)

    console.log(`
─────────────────────────────
📊 同步完成
  新書簽：    ${newBookmarks.length} 個
  全文轉換：  ${converted} 個  → ${config.obsidian.inbox_path}/
  輕量索引：  ${indexed} 個  → ${config.obsidian.index_path}/
  失敗：      ${failed} 個
  累計處理：  ${state.totalProcessed} 個
─────────────────────────────`)

  } catch (err) {
    console.error(`\n❌ 同步失敗：${err}`)
    process.exit(1)
  }
}

main()
