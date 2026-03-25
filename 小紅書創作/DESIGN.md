---
title: XhsStudio 小紅書內容創作工作台 - 系統設計文檔
date: 2026-03-22
author: Architect Agent
version: 1.0.0
---

# XhsStudio 小紅書內容創作工作台 - 系統設計文檔

## 一、目錄結構

```
~/.claude/skills/XhsStudio/
├── SKILL.md                      # 統一入口 + 子命令路由
├── PlatformSpecs.md              # 小紅書平台規範（字數、格式、算法偏好）
├── MaterialSchema.md             # 素材 YAML frontmatter 規範
├── AdvisorRoles.md               # 5 個智囊團角色的 system prompt
├── StyleGuide.md                 # 小紅書文風指南（口語化、emoji、互動鉤子）
├── Workflows/
│   ├── Collect.md                # 採集入庫工作流
│   ├── Wander.md                 # 靈感漫步工作流
│   ├── Create.md                 # 小紅書專用創作工作流
│   └── Advisor.md                # 智囊團評論工作流
└── Tools/                        # CLI 工具（預留，目前為空）
```

### 相關目錄（非 skill 目錄）

```
# Obsidian 素材庫（持久存儲）
~/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian/小紅書素材庫/
├── {YYMMDD}-{slug}.md            # 採集的素材筆記
└── ...

# Claude 工作目錄（草稿 + 暫存）
~/Documents/Claude/小紅書創作/
├── drafts/                       # 創作草稿
│   └── {YYMMDD}-{slug}-draft.md
├── exports/                      # 最終輸出（文案 + 配圖 prompt）
│   └── {YYMMDD}-{slug}-final.md
└── DESIGN.md                     # 本設計文檔
```

---

## 二、SKILL.md 完整內容

```markdown
---
name: XhsStudio
description: 小紅書內容創作工作台。USE WHEN user mentions 小紅書, XHS, 紅書, 種草, 小紅書創作, 小紅書筆記, xhs collect, xhs wander, xhs create, xhs advisor, 小紅書採集, 小紅書靈感, 小紅書智囊團, OR wants to create content for Xiaohongshu platform.
---

# XhsStudio

小紅書內容創作工作台 — 從採集、靈感、創作到智囊團評審的完整工作流。

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/PAI/USER/SKILLCUSTOMIZATIONS/XhsStudio/`

If this directory exists, load and apply PREFERENCES.md. Otherwise proceed with defaults.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running WORKFLOWNAME in XhsStudio skill", "voice_id": "YOUR_VOICE_ID_HERE"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **XhsStudio** skill to ACTION...
   ```

## Core Paths

- **素材庫（Obsidian）:** `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian/小紅書素材庫/`
- **草稿（Claude）:** `~/Documents/Claude/小紅書創作/drafts/`
- **輸出（Claude）:** `~/Documents/Claude/小紅書創作/exports/`

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Collect** | `/xhs collect`、「採集小紅書」、「收集素材」、URL 採集 | `Workflows/Collect.md` |
| **Wander** | `/xhs wander`、「靈感漫步」、「隨機看看」、「找靈感」 | `Workflows/Wander.md` |
| **Create** | `/xhs create`、「寫小紅書」、「小紅書筆記」、「種草文」 | `Workflows/Create.md` |
| **Advisor** | `/xhs advisor`、「智囊團」、「幫我評估」、「小紅書評審」 | `Workflows/Advisor.md` |

**子命令格式：**
- `/xhs collect [關鍵字 or URL]` — 採集入庫
- `/xhs wander` — 靈感漫步（無參數）
- `/xhs create [主題] --type [種草|教程|合集|測評|故事]` — 創作
- `/xhs advisor [草稿路徑 or 主題]` — 智囊團評審

## Examples

**Example 1: 採集小紅書素材**
```
User: "/xhs collect 居家香氛推薦"
-> Invokes Collect workflow
-> 搜尋小紅書 + 全網相關內容
-> 結構化存入 Obsidian 素材庫
-> 建立 claude-mem 語義索引
-> 輸出採集報告
```

**Example 2: 靈感漫步**
```
User: "/xhs wander"
-> Invokes Wander workflow
-> 從素材庫隨機抽 3 條筆記（強制多樣性）
-> AI 分析隱形關聯
-> 腦暴 3-5 個新選題方向
-> 評估可行性 + 一鍵轉草稿
```

**Example 3: 創作小紅書筆記**
```
User: "/xhs create 平價香氛蠟燭測評 --type 測評"
-> Invokes Create workflow
-> 載入素材庫相關內容
-> 適配小紅書文風（口語化 + emoji + 互動鉤子）
-> 生成 A/B 兩版文案
-> 呼叫 baoyu-xhs-images 生成配圖 prompt
-> 人類化 pass + 自評 + 輸出
```

**Example 4: 智囊團評審**
```
User: "/xhs advisor ~/Documents/Claude/小紅書創作/drafts/260322-candle-review-draft.md"
-> Invokes Advisor workflow
-> 5 個角色並行評論（爆款分析師、視覺設計師、互動運營、數據分析師、文案專家）
-> 輸出綜合評審報告 + 修改建議
```

## Quick Reference

- **復用 Skills：** agent-reach, opencli, ContentDeconstruct, x-collect, x-filter, x-create, Council, claude-mem, SeoKeywords, baoyu-xhs-images, baoyu-image-gen
- **素材格式：** YAML frontmatter + Markdown（詳見 MaterialSchema.md）
- **Platform Specs：** 標題 <=20 字、正文 <=1000 字、hashtag 3-8 個
- **草稿命名：** `{YYMMDD}-{slug}-draft.md`
```

---

## 三、各工作流詳細步驟

### 3.1 Collect 工作流（採集入庫）

```markdown
# Collect 工作流 — 採集入庫

## 觸發
- `/xhs collect [關鍵字]` — 按關鍵字搜尋並採集
- `/xhs collect [URL]` — 採集指定筆記

## 執行步驟

### Step 1: 判斷輸入類型
- 若輸入為 URL → 跳到 Step 3（單筆採集）
- 若輸入為關鍵字 → 進入 Step 2（批次搜尋）

### Step 2: 搜尋小紅書內容
按以下優先順序使用工具：

1. **agent-reach search-xhs "{關鍵字}"** — 首選，結構化搜尋結果
2. **opencli xiaohongshu search --keyword "{關鍵字}" -f json** — 備選，Chrome session 搜尋
3. 若兩者都不可用 → WebSearch "{關鍵字} site:xiaohongshu.com"

取前 10-15 條結果。

### Step 3: 讀取內容詳情
針對每條結果：
1. **agent-reach read {url}** 取得完整內容
2. 提取結構化欄位：
   - 標題
   - 正文描述
   - 作者暱稱 + 主頁 URL
   - 標籤（hashtags）
   - 互動數據（按讚、收藏、留言數）
   - 圖片 URL 列表
   - 發佈時間

### Step 4: 結構化存入 Obsidian
每條素材存為一個 .md 文件，路徑：
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian/小紅書素材庫/{YYMMDD}-{slug}.md`

YAML frontmatter 格式（詳見第六節 MaterialSchema）。

正文包含：
- 原文摘要（150 字以內）
- 關鍵要點（3-5 條）
- 圖片 URL 列表
- 初步分析（為什麼這篇有效 / 值得參考的點）

### Step 5: 建立語義索引（claude-mem）
對每條入庫素材，呼叫 claude-mem save_memory：

```
mcp__plugin_claude-mem_mcp-search__save_memory
- content: "小紅書素材 | {標題} | 作者:{作者} | 類型:{種草/教程/合集/測評/故事} | 標籤:{tags} | 互動:{likes}/{collects}/{comments} | 關鍵詞:{keywords}"
- metadata: {"source": "xhs", "file": "{filename}", "date": "{date}"}
```

### Step 6: 輸出採集報告
格式：
```
# 小紅書素材採集報告

## 搜尋關鍵字: {keyword}
## 採集時間: {timestamp}
## 採集數量: {count} 條

### 素材概覽

| # | 標題 | 作者 | 按讚 | 收藏 | 類型 |
|---|------|------|------|------|------|
| 1 | ... | ... | ... | ... | ... |

### 互動數據 Top 3
1. {最高互動的筆記摘要}
2. ...
3. ...

### 內容趨勢觀察
- {觀察 1}
- {觀察 2}

### 下一步
- `/xhs wander` 從素材庫找靈感
- `/xhs create {選題}` 直接創作
```
```

### 3.2 Wander 工作流（靈感漫步）

```markdown
# Wander 工作流 — 靈感漫步

## 觸發
- `/xhs wander` — 無需參數
- `/xhs wander --count 5` — 指定抽取數量（預設 3）

## 執行步驟

### Step 1: 載入素材庫索引
1. 列出 Obsidian 素材庫所有 .md 文件：
   `ls ~/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian/小紅書素材庫/`
2. 若素材庫為空 → 提示先執行 `/xhs collect`

### Step 2: 強制多樣性抽樣
從素材庫隨機抽取 3 條（或 --count 指定數量），但必須符合多樣性約束：
- **不同作者**（author 欄位不重複）
- **不同日期**（至少 2 個不同的 collected_date）
- **不同類型**（content_type 盡量不重複：種草 / 教程 / 合集 / 測評 / 故事）

抽樣方法：
1. 讀取所有文件的 frontmatter（Read 工具取前 15 行）
2. 按 author, content_type, collected_date 分組
3. 從不同組各抽 1 條，直到達到目標數量
4. 若素材不足以滿足多樣性 → 放寬約束並記錄

### Step 3: 讀取完整內容
對抽中的每條素材，Read 完整文件。

### Step 4: AI 分析隱形關聯
分析 3 條素材之間的非顯然連結：
- 共同的情緒觸發點
- 互補的受眾需求
- 可以混搭的內容元素
- 跨類型的敘事模式

輸出格式：
```
## 隱形關聯分析

### 素材 A: {標題}
### 素材 B: {標題}
### 素材 C: {標題}

### 發現的關聯
1. {關聯 1: 情緒層面}
2. {關聯 2: 受眾層面}
3. {關聯 3: 形式層面}
```

### Step 5: 腦暴新選題方向
基於關聯分析，生成 3-5 個新選題方向，每個包含：
- **選題名稱**（<=20 字，適合小紅書標題）
- **切入角度**（第一人稱、測評、教程、合集...）
- **目標情緒**（驚喜、共鳴、FOMO、實用感...）
- **預估互動類型**（收藏為主 / 留言為主 / 分享為主）

### Step 6: 小紅書可行性快評
對每個選題快速評估（1-5 分）：
- **平台適配度**：是否適合小紅書的調性
- **視覺潛力**：是否容易出好看的配圖
- **搜尋需求**：小紅書用戶是否會主動搜這個詞
- **競品飽和度**：同類內容是否已經很多

### Step 7: 一鍵轉草稿
提供選項讓用戶選擇一個選題，執行：
1. 在 `~/Documents/Claude/小紅書創作/drafts/` 建立草稿文件
2. 預填 frontmatter + 選題方向 + 參考素材連結
3. 提示：「草稿已建立，執行 `/xhs create {主題}` 開始創作，或 `/xhs advisor {草稿路徑}` 讓智囊團先評估。」
```

### 3.3 Create 工作流（小紅書專用創作）

```markdown
# Create 工作流 — 小紅書專用創作

## 觸發
- `/xhs create [主題]`
- `/xhs create [主題] --type [種草|教程|合集|測評|故事]`
- `/xhs create --from [草稿路徑]`

## 支援的內容類型

| 類型 | 特徵 | 適用場景 |
|------|------|----------|
| **種草** | 安利某產品/地點/體驗 | 產品推薦、好物分享 |
| **教程** | 步驟化教學 | How-to、技巧分享 |
| **合集** | 多物品/多方案整理 | N 個推薦、清單型 |
| **測評** | 實測對比 + 真實感受 | 產品比較、使用心得 |
| **故事** | 個人經歷 + 情緒共鳴 | 經驗分享、心路歷程 |

## 執行步驟

### Step 1: 載入上下文
1. **讀取 PlatformSpecs.md** — 小紅書平台規範
2. **讀取 StyleGuide.md** — 小紅書文風指南
3. **搜尋 claude-mem** 相關素材：
   `mcp__plugin_claude-mem_mcp-search__search query="小紅書 {主題}"`
4. 若有草稿（--from） → Read 草稿文件
5. 若素材庫有相關內容 → Read 最相關的 2-3 條

### Step 2: 確定內容類型
- 若 --type 已指定 → 使用指定類型
- 若未指定 → 根據主題自動判斷：
  - 含「推薦/安利/分享」→ 種草
  - 含「怎麼/如何/教程」→ 教程
  - 含「合集/清單/N個」→ 合集
  - 含「測評/對比/實測」→ 測評
  - 含「經歷/故事/心得」→ 故事

### Step 3: 呼叫 ContentDeconstruct（選用）
若素材庫中有同類型高互動筆記（收藏 > 500）：
1. 呼叫 ContentDeconstruct QuickExtract 提取成功模式
2. 將模式作為創作參考（不直接複製）

### Step 4: 生成 A/B 兩版文案
遵循小紅書文風規範（載入 StyleGuide.md）：

**文風要求：**
- 第一人稱（「我」「姐妹們」「家人們」）
- 口語化（不要書面語）
- emoji 適度使用（每段 1-2 個，不過度堆砌）
- 互動鉤子（提問、投票、「你們覺得呢」）
- 標題用 emoji + 數字 + 痛點/好奇心
- 正文 <=1000 字
- 段落短（每段 2-3 行）
- 善用分隔線和列表

**Variant A:** 更感性、情緒驅動、強 hook
**Variant B:** 更理性、信息密度高、結構清晰

每版包含：
- 標題（<=20 字）
- 正文
- hashtags（3-8 個，含熱門 + 長尾）

### Step 5: 配圖 Prompt 生成
根據內容類型和文案，生成配圖指令：

**若 baoyu-xhs-images 可用：**
呼叫 baoyu-xhs-images 生成（從 11 種風格 x 8 種佈局中選擇）

**若不可用，生成手動 prompt：**
- 風格建議（實拍風 / 扁平插畫 / 拼圖 / 文字卡片）
- 配色建議
- 構圖建議
- 可直接餵給 AI 圖片生成工具的 prompt

### Step 6: 人類化 Pass（強制執行）
與 x-create 的人類化規則一致：
- 刪除 AI 客套話（「希望對你有幫助」「讓我們來看看」）
- 去掉過度營銷語氣（「強烈推薦」「一定要買」→ 改為「我自己回購了 3 次」）
- 避免模糊引用（「很多人說」→ 改為具體場景）
- 減少連接詞堆砌
- 打破公式感（不要每段都一樣長）
- 加入小紅書特有的口語表達（「絕了」「救命」「誰懂」「閉眼入」）

### Step 7: 自評 + 最終選擇
評分維度（0-10）：
- Hook 吸引力
- 信息價值 / 種草力
- 小紅書調性適配
- 視覺配合度
- 互動潛力
- AI 味控制

若兩版都 < 7 分 → 重寫一次（最多一次）
選出最佳版本作為推薦。

### Step 8: 輸出
將最終文案存入 `~/Documents/Claude/小紅書創作/exports/{YYMMDD}-{slug}-final.md`

輸出格式：
```
# 小紅書筆記創作

## 主題: {topic}
## 類型: {type}
## 創作時間: {timestamp}

---

## Variant A

### 標題
{title_a}

### 正文
{body_a}

### Hashtags
{hashtags_a}

### 配圖 Prompt
{image_prompt_a}

**自評: {score_a}/10**

---

## Variant B

### 標題
{title_b}

### 正文
{body_b}

### Hashtags
{hashtags_b}

### 配圖 Prompt
{image_prompt_b}

**自評: {score_b}/10**

---

## 推薦版本: {A|B}
**理由:** {reason}

## 下一步
- `/xhs advisor {export_path}` — 讓智囊團評審
- 手動複製到小紅書 App 發佈
```
```

### 3.4 Advisor 工作流（智囊團）

```markdown
# Advisor 工作流 — 智囊團

## 觸發
- `/xhs advisor [草稿路徑 or 主題文字]`
- `/xhs advisor --roles [角色1,角色2]` — 指定部分角色

## 前置條件
需要 Council skill 可用（多 agent 辯論機制）。

## 5 個預設角色
詳見 AdvisorRoles.md（第四節）。

## 執行步驟

### Step 1: 載入評審內容
- 若輸入為文件路徑 → Read 文件
- 若輸入為主題文字 → 直接使用
- 若無輸入 → 讀取最新的草稿文件

### Step 2: 載入角色定義
Read `~/.claude/skills/XhsStudio/AdvisorRoles.md`
取得 5 個角色的 system prompt。

### Step 3: 多角色並行評論
基於 Council skill 的 Debate workflow 機制，但使用 XhsStudio 自訂的 5 個角色。

**Round 1（並行）：** 5 個角色各自獨立評論
- 每個角色產出：評分（1-10）+ 3 條具體建議 + 1 條核心風險
- 格式固定，便於後續綜合

**Round 2（序列）：** 角色之間交叉回應
- 爆款分析師回應視覺設計師的建議
- 互動運營回應數據分析師的預估
- 文案專家綜合所有人意見給出最終修改方案

### Step 4: 綜合評審報告
```
# 小紅書智囊團評審報告

## 評審內容: {title or topic}
## 評審時間: {timestamp}

---

### 爆款分析師
**評分: {score}/10**
- {建議 1}
- {建議 2}
- {建議 3}
**核心風險:** {risk}

### 視覺設計師
**評分: {score}/10**
- {建議 1}
- {建議 2}
- {建議 3}
**核心風險:** {risk}

### 互動運營
**評分: {score}/10**
- {建議 1}
- {建議 2}
- {建議 3}
**核心風險:** {risk}

### 數據分析師
**評分: {score}/10**
- {建議 1}
- {建議 2}
- {建議 3}
**核心風險:** {risk}

### 文案專家
**評分: {score}/10**
- {建議 1}
- {建議 2}
- {建議 3}
**核心風險:** {risk}

---

## 交叉討論重點
{Round 2 中的關鍵交鋒與共識}

## 綜合評分: {avg_score}/10

## Top 3 修改建議（優先級排序）
1. {最重要的修改}
2. {次重要的修改}
3. {第三重要的修改}

## 下一步
- 根據建議修改後，重新執行 `/xhs advisor` 驗證
- 或直接執行 `/xhs create --from {draft_path}` 重新創作
```

### Step 5: 存檔
報告存入 `~/Documents/Claude/小紅書創作/drafts/{YYMMDD}-{slug}-review.md`
```

---

## 四、Advisor 角色 System Prompts

以下為 AdvisorRoles.md 的完整內容：

### 4.1 爆款分析師（Viral Analyst）

```
你是一位小紅書爆款分析師，研究過上萬篇互動量破萬的筆記。

你的核心能力：
- 判斷一個選題/文案是否具備爆款潛力
- 識別內容中的「病毒因子」（好奇心缺口、情緒觸發點、社交貨幣）
- 預測內容的傳播路徑（搜尋流量 vs 推薦流量 vs 社交分享）

你的評估框架：
1. 標題是否能在 0.5 秒內抓住注意力？
2. 首圖是否能讓人停下滑動？
3. 內容是否提供了「值得收藏」的價值？
4. 是否有讓人想在留言區分享自己經歷的鉤子？
5. 是否避開了小紅書的內容雷區（硬廣感、過度營銷、爭議敏感詞）？

你的語言風格：
- 直接、不客套
- 用數據和案例說話
- 會指出「這個點在小紅書上不 work」的具體原因
```

### 4.2 視覺設計師（Visual Designer）

```
你是一位小紅書視覺設計專家，精通小紅書首圖設計和版面規劃。

你的核心能力：
- 判斷什麼樣的配圖能讓筆記在信息流中脫穎而出
- 建議配圖風格（實拍 / 拼圖 / 文字卡片 / 扁平插畫 / 對比圖）
- 規劃多圖筆記的圖片順序和視覺節奏
- 設計封面圖的文字排版和配色

你的評估框架：
1. 首圖是否符合小紅書 3:4 比例的最佳實踐？
2. 圖片風格是否與內容調性一致？
3. 文字是否清晰可讀（手機螢幕尺寸下）？
4. 配色是否吸睛但不刺眼？
5. 多圖排列是否有「翻頁慾」？

你的語言風格：
- 視覺思維，會用「畫面感」來描述建議
- 會具體到顏色代碼、字體建議、構圖比例
- 經常舉小紅書上的實際案例作為參考
```

### 4.3 互動運營（Engagement Operator）

```
你是一位小紅書互動運營專家，專注於提升筆記的留言率、收藏率和分享率。

你的核心能力：
- 設計互動鉤子（提問、投票、挑戰、話題）
- 規劃留言區引導策略（置頂留言、回覆話術）
- 識別能引發 UGC 的內容設計
- 設計「收藏理由」（讓人覺得這篇筆記值得存下來）

你的評估框架：
1. 文末是否有明確的互動引導？
2. 內容是否預留了「留言切入點」（不完整的清單、開放式問題）？
3. 是否有讓人想 @朋友的場景？
4. 收藏價值是否足夠（工具清單、步驟教程、對比表格）？
5. 話題標籤是否精準（熱門 + 長尾 + 場景化）？

你的語言風格：
- 運營思維，會考慮發佈時間、話題蹭熱度
- 建議具體可執行（「在第 3 張圖加一個投票」）
- 關注用戶行為路徑（看到 → 點進 → 看完 → 互動）
```

### 4.4 數據分析師（Data Analyst）

```
你是一位小紅書數據分析師，擅長用數據預測內容表現和優化方向。

你的核心能力：
- 預估筆記的曝光量、互動率、收藏率
- 分析目標關鍵詞的競爭程度
- 判斷發佈時機的最佳窗口
- 識別內容的長尾搜尋價值

你的評估框架：
1. 目標關鍵詞在小紅書的搜尋熱度如何？
2. 同類內容的平均互動數據是多少？
3. 預估的初始曝光量（基於賬號權重和內容質量）？
4. 內容的搜尋 SEO 是否做到位（標題含關鍵詞、正文自然植入）？
5. 7 天、30 天、90 天的長尾流量預估？

你的語言風格：
- 數據導向，會給出具體數字範圍
- 善用對比（「同類型筆記平均收藏 200，你的目標應該是 500+」）
- 會指出可量化的優化點
```

### 4.5 文案專家（Copywriting Expert）

```
你是一位小紅書文案專家，精通小紅書的文字表達和用戶心理。

你的核心能力：
- 優化標題的點擊率（CTR）
- 打磨正文的可讀性和節奏
- 控制 AI 味（讓文案聽起來像真人寫的）
- 設計金句和記憶點

你的評估框架：
1. 標題是否用了小紅書高 CTR 公式（數字 + emoji + 痛點/好奇心）？
2. 開頭 3 行是否能留住讀者（不會被「展開全文」截斷關鍵信息）？
3. 是否有至少 1 個「金句」（值得截圖分享的句子）？
4. 語氣是否自然（像朋友聊天，不像品牌文案）？
5. 結尾是否有力（不是虎頭蛇尾）？

你的語言風格：
- 對文字敏感，會逐句分析
- 會提供 2-3 個替代寫法讓人選
- 嚴格控制 AI 味，如果發現 AI 痕跡會直接指出
```

---

## 五、素材 YAML Frontmatter 規範

以下為 MaterialSchema.md 的完整內容：

```yaml
---
# === 基本信息 ===
title: "筆記標題（原文）"
slug: "url-safe-english-slug"
source_url: "https://www.xiaohongshu.com/explore/..."
source_platform: xhs

# === 作者信息 ===
author: "作者暱稱"
author_url: "https://www.xiaohongshu.com/user/profile/..."
author_followers: 12000         # 粉絲數（採集時）

# === 內容分類 ===
content_type: 種草              # 種草 | 教程 | 合集 | 測評 | 故事
topic_cluster: "居家香氛"       # 主題叢集
tags:
  - 香氛蠟燭
  - 居家好物
  - 平價推薦

# === 互動數據（採集時快照）===
likes: 3200
collects: 5800                  # 收藏數（小紅書核心指標）
comments: 420
shares: 150
engagement_rate: 0.082          # (likes+collects+comments) / 估計曝光

# === 視覺信息 ===
image_count: 6
image_urls:
  - "https://..."
  - "https://..."
cover_style: 實拍              # 實拍 | 拼圖 | 文字卡片 | 扁平插畫 | 對比圖
has_video: false

# === 元數據 ===
published_date: 2026-03-15     # 筆記發佈日期
collected_date: 2026-03-22     # 採集日期
collected_by: XhsStudio
quality_score: 8.5             # 0-10，採集時自動評分
keywords: "香氛蠟燭,居家好物,平價推薦,IKEA,無印良品"
description: "一段式描述，概括筆記的核心內容和價值點"
---
```

### 欄位說明

| 欄位 | 必填 | 說明 |
|------|------|------|
| title | Y | 原文標題，不修改 |
| slug | Y | URL 安全的英文短名，用於文件命名 |
| source_url | Y | 小紅書原始連結 |
| source_platform | Y | 固定為 `xhs` |
| author | Y | 作者暱稱 |
| author_url | N | 作者主頁連結 |
| author_followers | N | 粉絲數，無法取得時省略 |
| content_type | Y | 五選一：種草/教程/合集/測評/故事 |
| topic_cluster | Y | 主題叢集，用於 Wander 多樣性抽樣 |
| tags | Y | 原文 hashtags，array 格式 |
| likes | Y | 按讚數 |
| collects | Y | 收藏數（小紅書最重要指標） |
| comments | Y | 留言數 |
| shares | N | 分享數，無法取得時省略 |
| engagement_rate | N | 自動計算，無法估算時省略 |
| image_count | Y | 圖片數量 |
| image_urls | N | 圖片 URL 列表 |
| cover_style | N | 首圖風格分類 |
| has_video | Y | 是否為影片筆記 |
| published_date | Y | 筆記發佈日期 |
| collected_date | Y | 採集入庫日期 |
| collected_by | Y | 固定為 `XhsStudio` |
| quality_score | Y | 0-10 自動評分 |
| keywords | Y | 半形逗號分隔，不加空格，不加井號 |
| description | Y | 一段式描述 |

---

## 六、工作流之間的數據流圖

```
┌──────────────────────────────────────────────────────────────────┐
│                        XhsStudio 數據流                         │
└──────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │  小紅書平台  │
                    └──────┬──────┘
                           │
              agent-reach search-xhs
              opencli xiaohongshu
              agent-reach read {url}
                           │
                           v
              ┌────────────────────────┐
              │    COLLECT（採集入庫）   │
              │                        │
              │  輸入: 關鍵字 or URL    │
              │  工具: agent-reach,     │
              │        opencli          │
              └────────┬───────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          v            v            v
   ┌────────────┐ ┌─────────┐ ┌──────────┐
   │  Obsidian   │ │claude-mem│ │ 採集報告  │
   │ 素材庫      │ │ 語義索引 │ │(stdout)  │
   │ (.md files) │ │          │ │          │
   └──────┬─────┘ └────┬────┘ └──────────┘
          │             │
          │    搜尋/隨機抽樣
          │             │
          v             v
   ┌────────────────────────┐
   │    WANDER（靈感漫步）    │
   │                        │
   │  輸入: 無（從素材庫抽）  │
   │  工具: Read,            │
   │        claude-mem search│
   └────────┬───────────────┘
            │
            │  選題方向 + 草稿骨架
            v
   ┌────────────────────────────────────────┐
   │          CREATE（小紅書專用創作）         │
   │                                        │
   │  輸入: 主題/草稿 + 素材庫參考            │
   │  工具: ContentDeconstruct (模式提取)     │
   │        SeoKeywords (hashtag 優化)       │
   │        baoyu-xhs-images (配圖生成)      │
   │        StyleGuide.md (文風規範)          │
   │        PlatformSpecs.md (平台規範)       │
   │                                        │
   │  流程: 載入上下文 → 確定類型 →           │
   │        生成 A/B → 配圖 prompt →         │
   │        人類化 pass → 自評 → 輸出         │
   └────────┬───────────────────────────────┘
            │
            │  A/B 文案 + 配圖 prompt + hashtags
            v
   ┌──────────────────────────────────────┐
   │  ~/Documents/Claude/小紅書創作/       │
   │  ├── drafts/{YYMMDD}-{slug}-draft.md │
   │  └── exports/{YYMMDD}-{slug}-final.md│
   └────────┬─────────────────────────────┘
            │
            │  草稿 or 最終文案
            v
   ┌────────────────────────────────────┐
   │      ADVISOR（智囊團評審）           │
   │                                    │
   │  輸入: 草稿/文案                    │
   │  工具: Council skill (多 agent 機制)│
   │        AdvisorRoles.md (角色定義)   │
   │                                    │
   │  5 角色並行評論:                    │
   │  ┌───────────┐  ┌──────────┐       │
   │  │爆款分析師   │  │視覺設計師 │      │
   │  └───────────┘  └──────────┘       │
   │  ┌───────────┐  ┌──────────┐       │
   │  │互動運營    │  │數據分析師 │       │
   │  └───────────┘  └──────────┘       │
   │  ┌───────────┐                     │
   │  │文案專家    │                     │
   │  └───────────┘                     │
   │                                    │
   │  Round 1: 獨立評論（並行）          │
   │  Round 2: 交叉回應（序列）          │
   │                                    │
   │  輸出: 綜合評審報告 + Top 3 修改建議 │
   └────────┬───────────────────────────┘
            │
            │  修改建議
            v
   ┌──────────────────┐
   │  回到 CREATE 修改  │
   │  或直接發佈        │
   └──────────────────┘
```

### 工具依賴關係圖

```
XhsStudio
├── COLLECT
│   ├── agent-reach search-xhs      (搜尋小紅書)
│   ├── agent-reach read             (讀取內容)
│   ├── opencli xiaohongshu          (備選搜尋)
│   ├── obsidian-mcp                 (寫入 Obsidian)
│   └── claude-mem save_memory       (語義索引)
│
├── WANDER
│   ├── Read tool                    (讀取素材庫 .md)
│   └── claude-mem search            (語義搜尋輔助)
│
├── CREATE
│   ├── claude-mem search            (搜尋相關素材)
│   ├── ContentDeconstruct           (爆款模式提取)
│   ├── SeoKeywords                  (hashtag 優化)
│   ├── baoyu-xhs-images             (配圖生成)
│   ├── PlatformSpecs.md             (平台規範)
│   └── StyleGuide.md                (文風指南)
│
└── ADVISOR
    ├── Council skill                (多 agent 辯論引擎)
    └── AdvisorRoles.md              (5 角色定義)
```

### 典型使用流程

```
全流程（推薦）:
  /xhs collect 居家香氛 → 素材入庫
       ↓
  /xhs wander → 找到靈感「平價 vs 貴價蠟燭盲測」
       ↓
  /xhs create 平價vs貴價蠟燭盲測 --type 測評 → A/B 文案
       ↓
  /xhs advisor {draft_path} → 智囊團評審
       ↓
  根據建議修改 → 發佈

快速流程（跳過採集和靈感）:
  /xhs create 我的居家香氛清單 --type 合集 → 直接創作

單獨評審:
  /xhs advisor "標題：5 款百元蠟燭實測，第 3 款絕了" → 只評估選題
```

---

## 七、PlatformSpecs.md 核心規範摘要

| 維度 | 規範 |
|------|------|
| 標題長度 | <=20 字（含 emoji） |
| 正文長度 | <=1000 字（超過會折疊） |
| 圖片數量 | 1-18 張（推薦 6-9 張） |
| 圖片比例 | 3:4（豎版最佳）或 1:1 |
| 影片長度 | 1-15 分鐘（推薦 1-3 分鐘） |
| Hashtags | 3-8 個（混合熱門 + 長尾） |
| 首圖文字 | 大字、高對比、手機可讀 |
| 發佈時間 | 工作日 12:00-13:00, 20:00-22:00 |
| 週末 | 10:00-12:00, 15:00-17:00, 20:00-22:00 |
| 敏感詞 | 避免「最好」「第一」「100%」等絕對化用語 |
| 導流限制 | 不能明顯導流到站外（微信、淘寶連結） |

---

## 八、設計決策記錄

### 為什麼用 Obsidian 存素材庫而不是 Claude 目錄？
素材是需要長期保存、跨 session 引用、可以手動瀏覽和編輯的知識資產。根據雙軌原則（Claude 目錄 = 工作台暫存，Obsidian = 文件倉庫），素材庫屬於 Obsidian。

### 為什麼用 claude-mem 做語義索引而不是本地向量庫？
claude-mem 已整合進 PAI 生態系統，支援跨 session 記憶，無需額外部署向量資料庫。語義搜尋能力足以支撐素材庫的規模（預估 <1000 條）。

### 為什麼 Advisor 基於 Council 而不是獨立實現？
Council 已提供成熟的多 agent 辯論機制（並行評論 + 交叉回應 + 綜合報告）。XhsStudio 只需定義角色和 prompt，復用 Council 的執行引擎。

### 為什麼 Create 工作流不直接使用 x-create？
x-create 針對 X/Twitter 平台優化（280 字限制、thread 格式）。小紅書的文風、格式、互動邏輯完全不同（第一人稱口語化、圖文並重、收藏驅動）。但 Create 復用了 x-create 的人類化 pass 規則。

### 為什麼用 YYMMDD 而不是 YYYYMMDD 命名？
保持與專案現有命名慣例一致（參考 `1150304-五路財神文武財神香供養...` 的日期格式），同時更簡潔。
