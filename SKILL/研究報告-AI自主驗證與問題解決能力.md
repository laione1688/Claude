---
title: 研究報告：AI 自主驗證與問題解決能力
date: 2026-03-26
source: 研究文案-AI自主驗證與問題解決能力.md
repos: autoresearch, OpenSpace, evolver
---

# 研究報告：AI 自主驗證與問題解決能力

## 一、問題根源分析（FirstPrinciples）

### 為什麼 AI 驗證停在「系統內部成功」？

根本原因不是技術限制，而是**認知模型缺陷**：

1. **工具信任偏差**：AI 預設相信工具回傳值（API 說 200 就是成功），不質疑中間層
2. **驗證與執行同源**：用同一條路徑做事和確認，無法捕捉到路徑本身的問題
3. **完成定義模糊**：系統規則說「verify before claiming」，但沒定義驗證到什麼層級才算數
4. **缺乏 last-mile 思維**：AI 的世界模型止於 API 邊界，不延伸到使用者端

---

## 二、三大 Repo 評估摘要

### 2.1 Karpathy/autoresearch — 貪婪爬山自主研究

| 維度 | 評估 |
|------|------|
| **核心概念** | AI agent 自主跑 LLM 訓練實驗，greedy hill-climbing，永不停止直到被人類中斷 |
| **最大啟發** | **驗證函式與執行邏輯嚴格分離且不可篡改**（`evaluate_bpb()` 在唯讀的 `prepare.py` 中） |
| **適用性** | E2E 驗證 ★★★★☆ / 自主問題解決 ★★★★☆ / 跨 Session ★★★☆☆ / 驗證即完成 ★★★★★ |

**核心可借鑑模式：**
- **不可操縱的真相源**：驗證函式放在 agent 不能修改的位置 → PAI 的驗證步驟不能被執行邏輯繞過
- **缺席 = 失敗**：grep 結果為空 → 視為崩潰 → PAI 查詢不到預期結果 → 視為操作失敗
- **results.tsv 操作日誌**：每次實驗都有 commit hash + 指標 + status + description → PAI 每次操作都應記錄驗證結果
- **分層恢復**：讀 traceback → 修復 → 放棄該方向 → 嘗試新方向

### 2.2 HKUDS/OpenSpace — AI Agent 自我進化引擎

| 維度 | 評估 |
|------|------|
| **核心概念** | 將 SKILL.md 視為活的實體，能自動修復、衍生、捕獲；技能從執行失敗中自動進化 |
| **最大啟發** | **兩階段 Fallback + 從失敗中自動捕獲新技能** |
| **適用性** | E2E 驗證 ★★★☆☆ / 自主問題解決 ★★★★★ / 跨 Session ★★★★☆ / 驗證即完成 ★★☆☆☆ |

**核心可借鑑模式：**
- **兩階段執行**：Skill-guided → 失敗 → 清理工作區 → 純工具模式重試（不是簡單重試，是切換策略）
- **三觸發器品質監控**：Post-execution 分析 + 工具退化偵測 + 定期健康掃描
- **CAPTURED 機制**：從真實失敗中自動「捕獲」新的 fallback 技能（29 個恢復技能中 28 個是自動捕獲的）
- **ToolQualityManager**：追蹤每個工具的成功率，偵測語義失敗（HTTP 200 但內容錯誤）
- **SQLite 持久化 + 版本 DAG**：跨 session 的技能品質追蹤

### 2.3 EvoMap/evolver — GEP 驅動的 Agent 自我演化

| 維度 | 評估 |
|------|------|
| **核心概念** | Genome Evolution Protocol，將 prompt 調整轉化為可審計的演化資產（Genes/Capsules/Events） |
| **最大啟發** | **多步驟 Process Reward Model + 信號去重 + 強制策略切換** |
| **適用性** | E2E 驗證 ★★★☆☆ / 自主問題解決 ★★★★☆ / 跨 Session ★★★★★ / 驗證即完成 ★★★☆☆ |

**核心可借鑑模式：**
- **Process Reward Model**：對操作流程的每個階段獨立評分（8 個維度，加權合計），不是二元成功/失敗
- **Failed Capsule Banning**：失敗的方法在類似情境下被自動封禁，避免重複嘗試同樣的失敗路徑
- **Repair Loop Detection**：連續 3+ 次修復失敗 → 強制切換到創新模式
- **表觀遺傳記憶**：環境特定的記憶，帶 90 天時間衰減
- **Solidify 閘門**：所有變更必須通過統一驗證閘口才能被接受，驗證失敗自動 rollback
- **Saturation Detection**：連續空週期偵測 + 指數退避 + steady-state 降級

---

## 三、現有 SKILL 盤點（與四大方向相關）

### 3.1 E2E Verification 相關

| SKILL | 能力 | 可強化方向 |
|-------|------|-----------|
| **gstack/qa** | 瀏覽器自動化 QA，截圖驗證 | 可作為 E2E 驗證的執行引擎 |
| **Browser** | Debug-first 瀏覽器自動化 | 可用於驗證網頁可見性 |
| **bb-browser** | 帶登入態的瀏覽器操作 | 可驗證需要登入的系統 |
| **Evals** | Agent 評估框架 | 可擴展為操作驗證框架 |

### 3.2 Autonomous Problem Solving 相關

| SKILL | 能力 | 可強化方向 |
|-------|------|-----------|
| **agent-fetch** | 7 種策略 + TLS 模擬 | 已有 fallback 模式，可作為範本 |
| **systematic-debugging** | 結構化除錯 | 可擴展為通用問題解決協議 |
| **pua** | 強制窮盡問題解決 | 已有「不要放棄」的精神，但缺乏結構化 fallback |
| **agent-reach** | 多平台內容讀取 | 有跨平台 fallback 策略 |

### 3.3 Cross-Session Consistency 相關

| SKILL | 能力 | 可強化方向 |
|-------|------|-----------|
| **PAI 核心** | SYSTEM-MANIFEST、MCP-REGISTRY、DAILY、EXPERIENCES | 已有但規則遵守率不穩定 |
| **claude-mem** | 跨 session 記憶搜尋 | 可強化為操作日誌的持久化層 |
| **insight** | 洞察捕獲 | 可擴展為失敗經驗的自動捕獲 |

### 3.4 AISTEERINGRULES 已有相關規則

| 規則 | 覆蓋範圍 | 缺口 |
|------|---------|------|
| Verify Before Claiming Completion | 原則層 | 未定義驗證層級（Level 1-4） |
| 工具失敗時先想辦法完成任務 | 原則層 | 缺乏結構化 Fallback Registry |
| Check System Manifest Before Claiming Absence | 查詢層 | 僅覆蓋「有沒有做過」，未覆蓋「做的結果正確嗎」 |
| Self-Improve After Every Correction | 學習層 | 被動（需要人糾正），缺乏主動偵測 |

---

## 四、綜合改善方案（可直接落地）

### 方案 A：四級驗證層級制度

從三個 repo 提煉出的統一驗證框架：

```
Level 1 — Tool Response（最低，不可作為完成依據）
  工具回傳成功（HTTP 200、API success）
  來源：所有工具的預設回傳

Level 2 — Independent Read-Back（基本要求）
  用不同路徑讀回資料確認存在
  例：用 MCP read 確認 MCP write 的結果
  借鑑：autoresearch 的 grep 驗證 + evolver 的 canary check

Level 3 — Simulated User Path（標準要求）
  模擬使用者會怎麼確認——打開 App、瀏覽網頁、收到通知
  例：用 Browser/gstack 打開 TickTick 確認任務可見
  借鑑：OpenSpace 的 verify-all-deliverables

Level 4 — End-User Confirmation（最高，關鍵操作必需）
  實際截圖/推送確認/使用者回覆確認
  例：截圖 App 畫面、確認推送已到達
  借鑑：autoresearch 的「不可操縱的真相源」
```

**每種操作的最低驗證層級建議：**

| 操作類型 | 最低層級 | 理由 |
|---------|---------|------|
| 檔案寫入/編輯 | Level 1 | 本地操作，工具可信 |
| MCP 資料操作（CRUD） | Level 2 | 中間層多，需讀回確認 |
| 跨系統操作（推送、同步） | Level 3 | 目標系統不受控，需模擬使用者確認 |
| 對外發布/刪除/不可逆操作 | Level 4 | 高風險，需最高驗證 |

### 方案 B：結構化 Fallback 協議

借鑑 OpenSpace 的兩階段執行 + evolver 的強制策略切換：

```
遇到工具/MCP 失敗時的標準流程：

Step 1 — 分類（< 2 秒判斷）
  ├─ 暫時性錯誤（timeout、rate limit、網路抖動）→ 重試 1 次
  ├─ 認證錯誤（token 過期、權限不足）→ 查 Fallback Registry 找備用路
  └─ 結構性錯誤（資源不存在、API 不支援）→ 立即切換策略

Step 2 — 嘗試備用路（已知的備用路對照表）
  借鑑：evolver 的 Gene Selection（從已知的成功路徑中選擇）

Step 3 — 策略切換（如果備用路也失敗）
  借鑑：OpenSpace 的 Phase 2（清理 → 完全不同的方法重試）
  借鑑：evolver 的 repair loop detection（3 次失敗 → 強制 innovation）

Step 4 — 降級完成（找到任何可行方式把核心任務做完）
  完成後附帶：「⚠️ 主路失敗，已用備用路完成。修復指令：xxx」

Step 5 — 報告（只有在 Step 1-4 全部失敗後才走到這裡）
  報告內容：嘗試了什麼、為什麼失敗、建議的修復方式
```

### 方案 C：操作日誌 + Solidify 閘門

融合 autoresearch 的 results.tsv + evolver 的 solidify 模式：

```
每個操作記錄到操作日誌（append-only）：
timestamp | operation | tool | status | verification_level | evidence | notes

操作「完成」的條件（Solidify Gate）：
1. 操作已執行 ✓
2. 驗證已通過（達到該操作類型的最低驗證層級）✓
3. 結果已記錄到操作日誌 ✓
→ 三項全過才能宣稱「完成」

借鑑：
- autoresearch：results.tsv 的 keep/discard/crash 記錄
- evolver：solidify() 的多維度評分 + 自動 rollback
- OpenSpace：SkillRecord 上的 completion_rate 追蹤
```

### 方案 D：跨 Session 狀態啟動協議

借鑑 autoresearch 的 session bootstrap + evolver 的 state persistence：

```
Session 啟動時自動執行：
1. 讀取 SYSTEM-MANIFEST.md — 確認基礎設施狀態
2. 讀取 MCP-REGISTRY.md — 確認工具可用性
3. 讀取最近 3 天的 DAILY 日誌 — 確認近期工作狀態
4. 檢查 TickTick 未完成任務 — 確認待跟進事項

（這已部分實現在 hooks 中，但執行率不穩定）

強化方案：
- 將啟動協議寫成一個獨立的 SKILL（session-bootstrap）
- 啟動後產出一份「狀態摘要」注入 context
- 借鑑 evolver 的 pending solidify gating：上一個 session 未完成的操作標記為「待驗證」
```

### 方案 E：失敗經驗自動捕獲（CAPTURED 機制）

直接借鑑 OpenSpace 的核心創新：

```
當工具失敗 + 人工介入修復後：
1. 分析失敗原因和修復路徑
2. 自動生成新的 Fallback 記錄：
   - 什麼工具/MCP 失敗了
   - 什麼情境下（trigger signals）
   - 用什麼替代方案解決
   - 替代方案的驗證指令
3. 寫入 Fallback Registry
4. 下次相同失敗 → 自動使用捕獲的替代方案

已有的基礎：
- EXPERIENCES/ 目錄（記錄錯誤）
- AISTEERINGRULES.md 的 Self-Improve 規則
缺少的：結構化的 Fallback Registry + 自動匹配機制
```

---

## 五、三 Repo 啟發對照表

| PAI 改進方向 | autoresearch | OpenSpace | evolver |
|---|---|---|---|
| **E2E Verification** | 不可操縱的驗證函式 ★★★★ | verify-all-deliverables 技能 ★★★ | Canary Check + Blast Radius ★★★ |
| **Autonomous Problem Solving** | 分層恢復 + NEVER STOP ★★★★ | 兩階段 Fallback + CAPTURED ★★★★★ | Failed Capsule Ban + 強制策略切換 ★★★★ |
| **Cross-Session Consistency** | Git 狀態 + results.tsv ★★★ | SQLite + 版本 DAG ★★★★ | Memory Graph + 表觀遺傳 ★★★★★ |
| **Verification IS Completion** | 完成 = 指標被提取 ★★★★★ | 完成定義停在 Agent 端 ★★ | Solidify 閘門 ★★★★ |

---

## 六、建議實施優先順序

| 優先級 | 方案 | 預估工作量 | 預期影響 |
|--------|------|-----------|---------|
| **P0** | 方案 A：四級驗證層級（寫入 AISTEERINGRULES） | 低 | 極高——直接解決核心問題 |
| **P0** | 方案 B：結構化 Fallback 協議（寫入 AISTEERINGRULES） | 低 | 高——減少使用者被打斷 |
| **P1** | 方案 C：操作日誌 + Solidify 閘門 | 中 | 高——讓驗證有跡可循 |
| **P1** | 方案 E：Fallback Registry 建立 | 中 | 中高——讓備用路可查可用 |
| **P2** | 方案 D：Session 啟動協議強化 | 中 | 中——改善跨 session 體驗 |

---

## 七、下一步行動

1. **立即可做**：將方案 A（四級驗證）和方案 B（Fallback 協議）寫入 AISTEERINGRULES.md
2. **本週可做**：建立 Fallback Registry 文件（基於 MCP-REGISTRY.md 的已知備用路）
3. **需要設計**：操作日誌的格式和持久化方式（TSV？SQLite？DAILY 文件？）
4. **需要觀察**：Session 啟動協議的實際執行率，決定是否需要 SKILL 化

---

*研究完成時間：2026-03-26*
*參考 Repo：karpathy/autoresearch, HKUDS/OpenSpace, EvoMap/evolver*
*研究方法：四路並行研究（3 repo + SKILL 盤點）→ FirstPrinciples 根因分析 → 方案綜合*
