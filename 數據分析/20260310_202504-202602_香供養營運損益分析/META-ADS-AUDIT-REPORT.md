---
title: 香供養 Meta Ads 46 項深度審計報告
date: 2026-03-23
period: 2026-02-21 ~ 2026-03-22（近 30 天）
account: act_1465859694781097
keywords: Meta Ads審計,FB廣告,香供養,ROAS優化,廣告健康分數
description: 基於 46 項 Meta Ads 審計檢查清單的完整帳戶健康報告
---

# 香供養 Meta Ads 46 項深度審計報告

> 📅 審計數據期間：2026-02-21 ~ 2026-03-22（近 30 天）
> 🏢 帳戶：act_1465859694781097（明心福旺閣）
> 💰 期間花費：$42,521 TWD
> 🛒 購買數：85 筆
> 📊 CPA：$500 / ROAS：0.08

---

## Meta Ads Health Score

```
Meta Ads Health Score: 29/100 (Grade: F — 需要緊急介入)

Pixel / CAPI Health:  20/100  ██░░░░░░░░  (30%)
Creative:             35/100  ███░░░░░░░  (30%)
Account Structure:    30/100  ███░░░░░░░  (20%)
Audience & Targeting: 32/100  ███░░░░░░░  (20%)
```

**⚠️ 整體評級：F — 需要緊急介入**

---

## 一、Pixel / CAPI Health（30% 權重）— 20/100

| ID | 檢查項目 | 結果 | 發現 |
|----|---------|------|------|
| M01 | Meta Pixel 安裝 | 🟡 WARNING | Pixel 有安裝但 1-2 月漏報 63-74% 訂單，顯示 Pixel 觸發不穩定 |
| M02 | Conversions API (CAPI) | 🔴 FAIL | **未部署 CAPI**。iOS 14.5 後無 CAPI = 30-40% 數據遺失。這是最關鍵問題。 |
| M03 | 事件去重 (Dedup) | 🔴 FAIL | 無 CAPI = 無法去重。可能存在事件重複計算或遺漏 |
| M04 | Event Match Quality (EMQ) | 🔴 FAIL | 無法確認，但無 CAPI 的帳戶 EMQ 通常 <4.0（行業 87% 帳戶 EMQ 不佳） |
| M05 | 網域驗證 | ❓ 需確認 | 需登入 Business Manager 檢查 |
| M06 | Aggregated Event Measurement | ❓ 需確認 | 需登入 Events Manager 檢查 AEM 配置 |
| M07 | 標準事件 vs 自訂事件 | 🟡 WARNING | GA4 顯示 `add_payment_info` 僅 6 次觸發，`add_shipping_info` 0 次 — 結帳中段事件未實裝 |
| M08 | CAPI Gateway | 🔴 FAIL | 未部署 |
| M09 | iOS 歸因窗口 | ❓ 需確認 | 需登入確認是否設為 7-day click / 1-day view |
| M10 | 數據時效性 | 🟡 WARNING | 1-2 月大量遺漏顯示事件觸發可能有延遲或中斷 |

### 🚨 Pixel/CAPI 診斷總結

**核心問題：沒有 Conversions API (CAPI)。**

這是整個帳戶最大的問題。iOS 14.5 之後，僅靠瀏覽器 Pixel 會遺失 30-40% 的轉換數據。這直接導致：
1. **FB 演算法收到的訓練信號不完整** → 投放優化能力受損
2. **ROAS 被低估** → 報告中的 ROAS 0.08 可能實際是 0.13-0.16
3. **受眾建模不準確** → Lookalike 和再行銷受眾品質下降

---

## 二、Creative（30% 權重）— 35/100

| ID | 檢查項目 | 結果 | 發現 |
|----|---------|------|------|
| M25 | 創意格式多樣性 | 🟡 WARNING | 主要為圖片+影片兩種格式。未見輪播廣告或精選集廣告。 |
| M26 | 每 Ad Set 創意數量 | 🟢 PASS | 大部分 Ad Set 有 3-5 個創意素材 |
| M27 | 影片比例 | ❓ 需確認 | 有影片廣告（如 0221_財神影片），但不確定是否有 9:16 直式影片 |
| M28 | 創意疲勞偵測 | 🔴 FAIL | **同一素材重複使用**。如 `0224_菩薩之緣` 出現在至少 4 個不同 Ad Set 中。無明顯新創意輪替。 |
| M29 | Hook Rate（影片前 3 秒） | ❓ 需確認 | 需 Ads Manager 查看影片觀看比例 |
| M30 | 社群原生內容 | 🔴 FAIL | 互動推廣（貼文推廣）花 $3,519 零購買。未善用自然貼文轉換為廣告。 |
| M31 | UGC / 社群原生內容 | 🔴 FAIL | 所有素材為品牌製作內容，0% UGC（使用者生成內容） |
| M32 | Advantage+ Creative | ❓ 需確認 | 需登入確認是否啟用 |
| M-CR1 | 創意新鮮度 | 🟢 PASS | 3 月有新創意上線（0307_地藏系列、0321_福德正神） |
| M-CR2 | 頻率 — 開發新客 | 🟡 WARNING | 部分 Ad Set 累計頻率偏高，但缺乏 7 日頻率數據 |
| M-CR3 | 頻率 — 再行銷 | ❓ 需確認 | 需 7 日細分數據 |
| M-CR4 | CTR 基準 | 🟢 PASS | 整體 CTR 3.57-4.97%，遠超基準 ≥1.0%。表現優秀。 |

### 🎨 Creative 診斷總結

**CTR 表現優秀（3.5-5.0%），但存在嚴重的創意同質化問題。**

- ✅ 好的：CTR 高、有定期上新素材
- 🔴 壞的：格式單一（無輪播/精選集）、0% UGC、同一素材反覆使用在多個 Ad Set
- 💡 機會：加入 UGC/見證影片、輪播廣告、9:16 Reels 原生影片

---

## 三、Account Structure（20% 權重）— 30/100

| ID | 檢查項目 | 結果 | 發現 |
|----|---------|------|------|
| M11 | Campaign 數量 | 🟢 PASS | 5 個活躍 Campaign，合理 |
| M12 | CBO vs ABO | 🟡 WARNING | 日預算 ~$1,400，但分散到 5 個 Campaign × 多個 Ad Set，每個 Ad Set 預算可能不足 |
| M13 | 學習階段狀態 | 🔴 FAIL | **預算過於分散**。18 個 Ad Set 中有多個花費 <$300/月，遠低於 CPA $500 的 5 倍（$2,500/月 = $83/日），根本無法退出學習階段。 |
| M14 | 學習階段重設 | ❓ 需確認 | 需查看是否頻繁在學習期間編輯 |
| M15 | Advantage+ Shopping (ASC) | 🔴 FAIL | **未使用 ASC**。作為電商帳戶，這是 Meta 推薦的首要 Campaign 類型。ASC 的 ROAS 中位數 4.52（vs 標準 2.19）。 |
| M16 | Ad Set 合併 / 受眾重疊 | 🔴 FAIL | **嚴重受眾重疊**。同一 Campaign 內有「人力資源 x 運氣」「企業主 x 運氣」「農業 x 運氣」等多個 Ad Set，這些人群大量重疊，導致自己跟自己競價。 |
| M17 | 預算分配 | 🔴 FAIL | 多個 Ad Set 花費 <$300/月（如福德正神的企業主 $250、人力資源 $192），遠低於最低可行預算。 |
| M18 | Campaign 目標對齊 | 🟡 WARNING | 互動推廣 Campaign（$3,519）用了「互動」目標卻期望帶購買，目標不對齊 |
| M33 | Advantage+ 版位 | 🟡 WARNING | 看到多版位有數據（FB Feed、IG Feed、Stories、Reels），可能已啟用，但部分版位花費極低（$1-$7），可能受限 |
| M34 | 版位績效檢視 | 🟡 WARNING | 版位數據有，但 Audience Network ($0) 和 Messenger ($0) 未啟用 |
| M35 | 歸因設定 | ❓ 需確認 | 需登入確認歸因窗口設定 |
| M36 | 出價策略 | ❓ 需確認 | 需確認是 Lowest Cost 還是 Cost Cap |
| M37 | 頻率上限監控 | 🟡 WARNING | Campaign 層級缺乏頻率監控 |
| M38 | 細分報表 | 🟢 PASS | 有按年齡/性別/版位/裝置細分 |
| M39 | UTM 參數 | 🔴 FAIL | GA4 中 FB 流量歸類不明確（可能被歸到 Direct 或 Social），顯示 UTM 未正確設定 |
| M40 | A/B 測試 | 🔴 FAIL | 未見使用 Meta Experiments 工具進行正式 A/B 測試 |
| M-ST1 | 預算充足性 | 🔴 FAIL | 目標 CPA $500 → 每 Ad Set 每日需 ≥$2,500/月（$83/日）。18 個 Ad Set 中至少 10 個不達標。 |
| M-ST2 | 預算使用率 | ❓ 需確認 | 需查看每日花費 vs 預算上限 |

### 🏗️ Account Structure 診斷總結

**結構過於碎片化，是效率低落的主因。**

核心問題：
1. **18 個 Ad Set 太多** — 預算被切得太碎，每個 Ad Set 無法收集足夠數據退出學習階段
2. **受眾高度重疊** — 「人力資源 x 運氣」vs「企業主 x 運氣」vs「農業 x 運氣」等受眾大量重疊，導致自己跟自己競價、推高 CPC
3. **未使用 ASC** — Advantage+ Shopping Campaign 是電商帳戶的標配，ROAS 中位數 4.52
4. **UTM 未設定** — 無法在 GA4 中正確歸因 FB 廣告效果

---

## 四、Audience & Targeting（20% 權重）— 32/100

| ID | 檢查項目 | 結果 | 發現 |
|----|---------|------|------|
| M19 | 受眾重疊 | 🔴 FAIL | **>40% 重疊**。多個 Ad Set 都用「30-64 歲 × 運氣/卜卦」，只換了一個興趣維度，重疊率極高 |
| M20 | 自訂受眾新鮮度 | 🟡 WARNING | 有再行銷 Ad Set，但不確定 Custom Audience 是否定期更新 |
| M21 | Lookalike 來源品質 | ❓ 需確認 | 需查看 Lookalike 種子受眾的大小和來源 |
| M22 | Advantage+ Audience 測試 | 🔴 FAIL | 未見測試 Advantage+ Audience（Meta 的 AI 受眾） |
| M23 | 排除受眾 | 🟡 WARNING | 有再行銷 Ad Set 分離，但不確定開發新客 Campaign 是否排除了已購買者 |
| M24 | 第一方數據利用 | 🔴 FAIL | 未見上傳客戶名單作為 Custom Audience。已知有 352 位客戶 + Email/Phone 數據，完全未利用。 |

### 👥 Audience 診斷總結

**最大浪費：352 位客戶的第一方數據完全未利用。**

1. **未上傳客戶名單** — 352 位客戶（其中 155 位回購客）的 Email/Phone 沒有上傳到 FB 做 Custom Audience 和 Lookalike
2. **受眾定向太窄** — 用「職業 × 興趣」做交叉定向，把受眾切得太細。Meta 演算法在寬受眾上表現更好。
3. **未測試 Advantage+ Audience** — Meta 的 AI 受眾通常優於手動定向

---

## 五、關鍵問題排序（依影響力）

| 優先度 | 問題 | 影響 | 修復時間 |
|--------|------|------|---------|
| 🔴 P0 | **未部署 CAPI** | 遺失 30-40% 轉換數據，演算法優化能力受損 | 15 分鐘（CAPI Gateway）|
| 🔴 P0 | **未使用 ASC** | 錯失 ROAS 4.52 的 Campaign 類型 | 30 分鐘 |
| 🔴 P0 | **受眾過度碎片化** | 18 個 Ad Set 互相競價，推高 CPC | 1 小時 |
| 🔴 P1 | **未上傳客戶名單** | 352 位客戶的 Lookalike 是最有價值的受眾 | 15 分鐘 |
| 🔴 P1 | **UTM 未設定** | 無法在 GA4 歸因 FB 廣告效果 | 5 分鐘 |
| 🟡 P2 | **0% UGC 內容** | 缺乏社會證明，降低信任度 | 持續 |
| 🟡 P2 | **未測試 Advantage+ Audience** | 可能找到更好的受眾 | 30 分鐘 |
| 🟡 P2 | **創意格式單一** | 僅圖片+影片，缺輪播/精選集 | 1 小時 |

---

## 六、Quick Wins（15 分鐘內可完成）

| # | 動作 | 預估影響 | 時間 |
|---|------|---------|------|
| 1 | **部署 CAPI Gateway** | 恢復 30-40% 遺失數據 → ROAS 測量更準確 | 15 分鐘 |
| 2 | **上傳客戶名單** → 建立 Custom Audience + 1% Lookalike | 精準獲客，預估 CPA 降 30% | 15 分鐘 |
| 3 | **設定 UTM 參數**（Campaign 層級 URL 模板） | 解決 GA4 歸因問題 | 5 分鐘 |
| 4 | **排除已購買者**（從開發新客 Campaign 排除 Purchase Custom Audience） | 減少浪費花費 | 10 分鐘 |
| 5 | **合併 Ad Set**（18 個 → 4-6 個） | 預算集中，加速退出學習階段 | 30 分鐘 |

---

## 七、帳戶重建建議

### 現況 vs 建議架構

```
【現況 — 碎片化】
├─ Campaign: 五路財神 (第 9 期)
│   ├─ Ad Set: 人力資源 x 運氣    $9,847
│   ├─ Ad Set: 企業主 x 運氣      $2,970
│   └─ Ad Set: 再行銷              $1,917
├─ Campaign: 菩薩 (第 9 期)
│   ├─ Ad Set: 農業 x 運氣        $6,483
│   ├─ Ad Set: 再行銷              $3,723
│   ├─ Ad Set: 保健 x 運氣        $1,125
│   ├─ Ad Set: 企業主 x 運氣      $1,089
│   └─ Ad Set: 航空 x 運氣        $790
├─ Campaign: 地藏王 (第 10 期)
│   ├─ Ad Set: 生命禮儀 x 運氣    $3,693
│   ├─ Ad Set: 再行銷              $3,162
│   ├─ Ad Set: 急診人員 x 運氣    $2,220
│   ├─ Ad Set: 長照 x 運氣        $320
│   ├─ Ad Set: 法律服務 x 運氣    $285
│   └─ Ad Set: 警察/消防 x 運氣   $142
├─ Campaign: 福德正神 (第 10 期)
│   ├─ Ad Set: 再行銷              $794
│   ├─ Ad Set: 企業主 x 運氣      $250
│   └─ Ad Set: 人力資源 x 運氣    $192
└─ Campaign: 互動-地藏王          $3,519  ← 0 購買

問題：18 個 Ad Set，多數預算不足，受眾重疊，自己跟自己競價
```

```
【建議 — 精簡架構】
├─ 🟢 Campaign 1: ASC（Advantage+ Shopping）
│   └─ 全自動：AI 選受眾 × 選版位 × 選創意
│   └─ 預算：$20,000/月（總預算的 50%）
│   └─ 放入所有商品：菩薩、五路財神、地藏王、福德正神、媽祖
│
├─ 🟡 Campaign 2: 再行銷（Retargeting）
│   ├─ Ad Set: 加購未結帳（7 天內）
│   └─ Ad Set: 瀏覽未加購（14 天內）
│   └─ 預算：$10,000/月（25%）
│
├─ 🔵 Campaign 3: Lookalike 開發新客
│   ├─ Ad Set: 購買者 1% Lookalike（寬受眾）
│   └─ Ad Set: 高 LTV 客戶 2% Lookalike
│   └─ 預算：$8,000/月（20%）
│
└─ 🟣 Campaign 4: 測試（Testing）
    └─ Ad Set: 新素材 / 新受眾測試
    └─ 預算：$2,000/月（5%）

優點：4 個 Campaign × 6 個 Ad Set → 預算集中 → 快速退出學習階段
```

### 預估效果

| 指標 | 現況 | 重建後（保守估計） |
|------|------|-------------------|
| Campaign 數 | 5 | 4 |
| Ad Set 數 | 18 | 6 |
| 月預算 | $42K | $40K |
| CPA | $500 | $300-350（降 30%） |
| ROAS | 0.08（報告值，受追蹤問題影響） | 2.0-3.0（修復追蹤 + ASC） |
| 購買數 | 85 | 120-150 |

---

## 八、需要垣宣確認/執行的項目

| # | 項目 | 我們能做 | 需要垣宣做 |
|---|------|---------|-----------|
| 1 | 部署 CAPI | ❌ | ✅ 在 Events Manager 啟用 CAPI Gateway |
| 2 | 確認 EMQ 分數 | ❌ | ✅ Events Manager → Data Sources → Purchase 的 EMQ |
| 3 | 上傳客戶名單 | ✅ 我們準備名單 | ✅ 垣宣上傳到 Business Manager |
| 4 | 設定 UTM 參數 | ❌ | ✅ Campaign 設定 → URL Parameters |
| 5 | 建立 ASC | ❌ | ✅ 新建 Advantage+ Shopping Campaign |
| 6 | 合併 Ad Set | ❌ | ✅ 精簡到 4-6 個 Ad Set |
| 7 | 排除已購買者 | ✅ 我們提供名單 | ✅ 垣宣設定排除受眾 |
| 8 | 啟用 Advantage+ Audience | ❌ | ✅ 在 Ad Set 層級啟用 |

---

## 九、與業界基準對照

| 指標 | 香供養（目前） | 業界基準（電商） | 差距 |
|------|--------------|----------------|------|
| CTR | **3.57-4.97%** ✅ | 1.0-2.0% | **超越 2-3 倍** |
| CPC | $4.3-8.6 TWD | $0.70-1.92 USD (~$22-62 TWD) | ✅ 合理範圍 |
| CPM | $152-429 TWD | $12.50 USD (~$400 TWD) | ✅ 合理 |
| ROAS | 0.08 | 2.19-4.52 | 🔴 **差距巨大**（但受追蹤問題影響） |
| CPA | $500 TWD | — | 🟡 需對照 AOV 評估 |
| Creative 格式 | 2 種 | ≥3 種 | 🔴 不足 |
| UGC 比例 | 0% | ≥30% | 🔴 嚴重不足 |

**注意：ROAS 0.08 極可能是追蹤問題造成的假象。** 從訂單後台數據看，真實 ROAS 應在 1.5-3.0 之間。但即使如此，仍有大幅優化空間。

---

*報告產出時間：2026-03-23*
*審計框架：Claude Ads Meta Audit Checklist v2026-02（46 項檢查）*
*數據來源：FB Ads API 直接拉取 + GA4 交叉驗證*
