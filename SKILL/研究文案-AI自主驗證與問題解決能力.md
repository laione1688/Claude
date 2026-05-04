# 研究任務：AI 自主驗證與自主解決問題能力

## 背景問題

在我們的 PAI 系統（Personal AI Infrastructure）中，多個對話串（session）反覆出現同一個模式的失敗：

**AI 在「系統內部成功」就宣稱完成，沒有驗證到「終端使用者實際看到/收到」。**

### 具體案例

1. **TickTick 任務管理**：AI 用 MCP 工具建立任務，工具回傳成功就說「完成了」。但實際上任務建在錯誤的服務（dida365 大陸版 vs ticktick 國際版），使用者打開 TickTick App 看不到任何任務。

2. **Notion 資料庫查詢**：AI 說「DB ID 已修正」，但沒有用 curl 實際打一次 API 驗證能不能存取。結果 ID 是 data_source 類型（404），不是 database 類型。

3. **晨報推送**：AI 說「晨報已產出」，但推送到 LINE/Telegram 的內容被截斷、格式壞掉、或根本沒送達。AI 不知道，因為它只看到「檔案寫入成功」。

4. **MCP Token 過期**：AI 說「Notion MCP 已修好」，但另一個對話串不知道，又用舊的 OAuth Token，又失敗了。

5. **跨 session 資訊不同步**：Session A 完成了 FB Ads 串接，Session B 完全不知道，說「還沒設定」。

### 問題的本質

```
AI 的驗證停在：「我的工具說成功了」（Unit Test 層級）
使用者需要的：「我打開 App / 收到通知 / 團隊看到了」（E2E Test 層級）

Gap = 系統內部成功 ≠ 終端使用者體驗成功
```

同時，當 AI 遇到工具失敗、MCP 斷線、資料缺失時，第一反應是**報告問題給使用者**，而不是**嘗試自己解決**。使用者期望的是：AI 先嘗試所有可能的替代方案，真的做不到才來問。

## 研究方向

請研究並設計一套機制，讓 AI 系統具備以下能力：

### 1. 端到端驗證（E2E Verification）

- 每個操作完成後，不能只看 API 回傳值，要有**獨立的驗證步驟**
- 驗證必須模擬「使用者會怎麼確認」：
  - 建了任務 → 用**另一個路徑**（不同 MCP、curl、App 截圖）確認存在
  - 推送了訊息 → 確認對方收到（讀取推送 log、檢查回傳狀態碼）
  - 修了設定 → 用 `claude -p` 模擬排程環境實際跑一次
- 定義「驗證層級」：
  - Level 1：工具回傳成功（最低，不可靠）
  - Level 2：用不同路徑讀回資料確認存在
  - Level 3：模擬使用者流程確認體驗正確
  - Level 4：實際截圖/推送確認到達終端

### 2. 自主問題解決（Autonomous Problem Solving）

- 遇到工具失敗時的行為模型：
  - **不要**：直接報告「X 失敗了，請手動修復」
  - **要**：嘗試替代方案 → 嘗試修復 → 嘗試降級 → 真的不行才報告
- 建立「備用路對照表」（Fallback Registry）：
  - 每個 MCP/工具都有預設的備用路
  - 失敗時自動切換，不問使用者
- 定義「自主解決 vs 需要人介入」的邊界：
  - 可自主：Token 過期重新認證、MCP 重連、換備用路、重試
  - 需要人：涉及金錢、刪除、對外發布、權限變更

### 3. 跨 Session 狀態一致性（Cross-Session Consistency）

- 現有機制（SYSTEM-MANIFEST、MCP-REGISTRY、CLAUDE.md 指標）已建立
- 問題是：規則寫了但 AI 不一定遵守
- 研究：如何讓規則從「被動查閱」變成「主動執行」？
  - Session 啟動時自動載入關鍵狀態？
  - 操作前自動比對 Registry？
  - 強制 checkpoint 機制？

### 4. 驗證即完成（Verification IS Completion）

- 重新定義「完成」的標準：
  - ❌ 「我執行了指令」不等於完成
  - ❌ 「工具回傳成功」不等於完成
  - ✅ 「使用者能在終端看到/使用結果」才是完成
- 這個定義需要寫進 AI 的核心行為規則，不是建議，是強制

## 現有架構參考

- **PAI Algorithm**: `~/.claude/skills/PAI/SKILL.md`（核心演算法）
- **AI Steering Rules**: `~/.claude/skills/PAI/USER/AISTEERINGRULES.md`（行為規則）
- **System Manifest**: `~/.claude/skills/PAI/USER/SYSTEM-MANIFEST.md`（系統狀態）
- **MCP Registry**: `~/.claude/skills/PAI/SYSTEM/MCP-REGISTRY.md`（MCP 管理）
- **Experience Library**: `~/.claude/skills/PAI/USER/EXPERIENCES/`（錯誤記錄）
- **CLAUDE.md**: `~/CLAUDE.md`（每個 session 必讀的入口）

## 預期產出

1. **新的 Steering Rules**（寫入 AISTEERINGRULES.md）：
   - 「E2E Verification Before Claiming Completion」規則
   - 「Autonomous Problem Solving Protocol」規則
   - 具體的 Bad/Correct 案例

2. **Fallback Registry**（寫入 MCP-REGISTRY.md 或獨立文件）：
   - 每個 MCP/工具的備用路對照

3. **驗證層級定義**（寫入系統架構文件）：
   - Level 1-4 驗證標準
   - 每種操作類型對應的最低驗證層級

4. **改善後的行為模式**：
   - 操作 → 獨立驗證 → 確認終端可見 → 才報告完成
   - 失敗 → 嘗試備用路 → 嘗試修復 → 降級完成 → 最後才報告

## 使用方式

將此文案貼到新的 Claude Code 對話串中，讓 AI 研究並實作上述改善方案。
