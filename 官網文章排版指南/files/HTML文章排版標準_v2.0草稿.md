# HTML 文章排版標準 v2.0（草稿）

> **v2.0 核心差異**：既然 CMS 後台鎖住全站 CSS，**inline style 是唯一能拿回版面控制權的手段**。v1.0 的「100% inline」硬規則方向正確，但漏寫關鍵屬性（尤其 `line-height`），導致站方 CSS 把排版全部吃掉。v2.0 的工作：**顯式覆蓋每一條站方會侵蝕的 CSS**。

**最後更新**：2026-04-15
**適用**：明心福旺閣 / 三旺文創官網 (me1314888.com) 所有文章

---

## 🧨 v1.0 → v2.0 的關鍵修正

| 位置 | v1.0 問題 | v2.0 修正 |
|---|---|---|
| p 行高 | 沒寫 `line-height` → 被站方 24px 吃掉 → ratio 1.20 | **必寫** `line-height: 1.9` |
| 字體 stack | 只寫 Microsoft JhengHei | 必寫 `PingFang TC, Noto Sans TC, Microsoft JhengHei, ...` |
| 字距 | 沒定義 | 必寫 `letter-spacing: 0.02em` |
| 文字顏色 | `#333` 但站方覆蓋為棕色 | **必寫** `color: #2a2a2a` |
| h3 邊框 | 寫了但被站方 CSS 覆蓋 | 用 `!important` 或提高特異性 |
| 強調色密度 | 無規則 | 每章節紅色 strong ≤ 2 處 |
| 古籍引文 | 無元件 | 新增 `.quote-ancient` 樣式 |
| 重點卡 | 無元件 | 新增紅底重點卡 |
| 文末 CTA | 無 | 必加供養預約按鈕 |
| 圖片 | 無規範 | 必含圖說 `<figcaption>` |

> **元規則**：CMS 不能改 = inline style 寫到滿 = **每段都要顯式聲明 line-height / font-size / color / letter-spacing**，不能省。

---

## 🎨 設計系統

### 色票
```
主紅 #c62d42   → h1、重點卡邊框、CTA 按鈕（一篇 ≤ 5 次）
章節藍 #2c5aa0 → h3 邊框與文字
小標橘 #e67e22 → h4
內文深灰 #2a2a2a → p（顯式覆蓋站方棕）
引文米 #faf6ef  → 古籍引文框背景
知識藍 #eaf3fb → 小知識框背景
輔助灰 #6c757d → 圖說、參考資料
```

### 字體 Stack（必寫）
```css
font-family: "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "微軟正黑體", system-ui, -apple-system, sans-serif;
```

### 字階（桌機手機通用中位值，因為 inline 無法 media query）
```
h1: 30px / 1.4 / 粗體
h3: 24px / 1.5 / 粗體 + 藍邊框
h4: 19px / 1.5 / 粗體橘
p:  18px / 1.9 / letter-spacing 0.02em
圖說: 14px / 1.6 / 灰
```

### 內容容器（根節點必用）
```html
<div style="font-family: 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif; color: #2a2a2a; line-height: 1.9; letter-spacing: 0.02em; font-size: 18px;">
  <!-- 所有內容放這 -->
</div>
```

---

## 🧱 元件庫（12 個模板）

### 1. 主標題 H1
```html
<h1 style="color: #c62d42; font-size: 30px; line-height: 1.4; font-weight: 700; text-align: center; margin: 0 0 16px; padding-bottom: 16px; border-bottom: 3px solid #c62d42; letter-spacing: 0.02em;">文章標題</h1>
```

### 2. 副標題
```html
<p style="color: #6c757d; font-size: 17px; line-height: 1.6; text-align: center; margin: 0 0 32px; font-weight: 400;">——副標題或一句話引言</p>
```

### 3. 預估閱讀時間（標題下方）
```html
<p style="color: #888; font-size: 14px; text-align: center; margin: 0 0 40px;">📖 約 8 分鐘 · 3500 字</p>
```

### 4. 目錄（灰底區塊）
```html
<div style="background: #f8f9fa; padding: 20px 24px; border-radius: 8px; margin: 32px 0; border: 1px solid #dee2e6;">
  <p style="margin: 0 0 12px; color: #495057; font-weight: 700; font-size: 16px;">本文目錄</p>
  <ol style="margin: 0; padding-left: 20px; color: #2c5aa0; line-height: 2;">
    <li><a href="#s1" style="color: #2c5aa0; text-decoration: none;">第一章節</a></li>
    <li><a href="#s2" style="color: #2c5aa0; text-decoration: none;">第二章節</a></li>
  </ol>
</div>
```

### 5. 章節標題 H3（必用錨點 + 顯式 border）
```html
<div id="s1" style="padding-top: 80px; margin-top: -80px;"></div>
<h3 style="color: #2c5aa0; font-size: 24px; line-height: 1.5; font-weight: 700; margin: 40px 0 20px; padding-left: 14px; border-left: 4px solid #2c5aa0; letter-spacing: 0.02em;">章節標題</h3>
```

### 6. 小標題 H4
```html
<h4 style="color: #e67e22; font-size: 19px; line-height: 1.5; font-weight: 700; margin: 28px 0 14px;">小標題</h4>
```

### 7. 內文段落（**關鍵**：必寫 line-height）
```html
<p style="font-size: 18px; line-height: 1.9; letter-spacing: 0.02em; color: #2a2a2a; margin: 0 0 22px; text-align: justify;">
  段落內容。強調就只加粗，不變色：<strong style="font-weight: 700;">某個概念</strong>。整章節只保留一處變色強調：<strong style="color: #c62d42; font-weight: 700;">真正關鍵的一句</strong>。
</p>
```

### 8. 古籍引文框 🆕
```html
<blockquote style="background: #faf6ef; border-left: 4px solid #b8860b; padding: 18px 22px; margin: 24px 0; font-family: 'Noto Serif TC', 'Songti TC', serif; font-size: 17px; line-height: 1.9; color: #5a4a3a; letter-spacing: 0.03em;">
  「是時，世尊從座而起，入三摩地……」
  <footer style="margin-top: 10px; font-size: 13px; color: #8b7355; font-style: normal;">——《佛說救拔焰口餓鬼陀羅尼經》</footer>
</blockquote>
```

### 9. 重點卡（章節 TL;DR）🆕
```html
<div style="background: #fef5f5; border-left: 5px solid #c62d42; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
  <p style="margin: 0 0 6px; color: #c62d42; font-weight: 700; font-size: 15px; letter-spacing: 0.05em;">⭐ 重點</p>
  <p style="margin: 0; font-size: 17px; line-height: 1.8; color: #2a2a2a;">大士爺不是鬼王，是護法神。祂以「同類相應」的兇相度化餓鬼道眾生。</p>
</div>
```

### 10. 小知識框 🆕
```html
<div style="background: #eaf3fb; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
  <p style="margin: 0 0 6px; color: #1d4e89; font-weight: 700; font-size: 15px;">💡 小知識</p>
  <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #2a2a2a;">玄天上帝又稱真武大帝、北極大帝，是北極星的神格化。</p>
</div>
```

### 11. 對照表（響應式）🆕
```html
<div style="margin: 24px 0; overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse; font-size: 16px; line-height: 1.7;">
    <thead>
      <tr style="background: #2c5aa0; color: #fff;">
        <th style="padding: 10px 14px; text-align: left;">版本</th>
        <th style="padding: 10px 14px; text-align: left;">來源</th>
        <th style="padding: 10px 14px; text-align: left;">特色</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #dee2e6;">
        <td style="padding: 10px 14px;">佛教版</td>
        <td style="padding: 10px 14px;">《陀羅尼經》</td>
        <td style="padding: 10px 14px;">觀音化身</td>
      </tr>
      <tr style="background: #f8f9fa;">
        <td style="padding: 10px 14px;">道教版</td>
        <td style="padding: 10px 14px;">民間信仰</td>
        <td style="padding: 10px 14px;">普度真君</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 12. 圖片 + 圖說 🆕
```html
<figure style="margin: 28px 0; text-align: center;">
  <img src="圖片URL" alt="具體描述" style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;">
  <figcaption style="margin-top: 8px; font-size: 14px; line-height: 1.6; color: #6c757d;">圖說：新莊地藏庵大士爺神像（2026 中元）</figcaption>
</figure>
```

### 13. 分隔線
```html
<hr style="border: none; border-top: 1px dashed #dee2e6; margin: 40px 0;">
```

### 14. 文末 CTA（必用）🆕
```html
<div style="background: linear-gradient(135deg, #c62d42 0%, #a1222f 100%); color: #fff; padding: 28px 24px; border-radius: 12px; margin: 48px 0 32px; text-align: center;">
  <p style="margin: 0 0 14px; font-size: 19px; line-height: 1.6; font-weight: 700;">這篇讓你想為家人祈福嗎？</p>
  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7; opacity: 0.92;">明心福旺閣 提供線上供養、疏文代書、神明祝福活動。</p>
  <a href="https://lin.ee/xxxxx" style="display: inline-block; background: #fff; color: #c62d42; padding: 12px 32px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 4px;">加入 LINE 諮詢</a>
  <a href="/booking" style="display: inline-block; background: #fef5f5; color: #c62d42; padding: 12px 32px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 4px;">線上供養預約</a>
</div>
```

### 15. 參考資料
```html
<div id="references" style="padding-top: 80px; margin-top: -80px;"></div>
<div style="background: #f8f9fa; padding: 18px 22px; border-radius: 8px; margin: 32px 0; border-left: 4px solid #6c757d;">
  <p style="margin: 0 0 10px; color: #495057; font-weight: 700; font-size: 16px;">參考資料</p>
  <ul style="margin: 0; padding-left: 20px; color: #6c757d; font-size: 14px; line-height: 1.8;">
    <li>《佛說救拔焰口餓鬼陀羅尼經》</li>
    <li>中華民俗廟宇文化協會網站</li>
  </ul>
</div>
```

---

## 📏 強制規則（寫入檢查清單）

### 🔴 必寫屬性（inline style 必須包含）
每個內文元素的 style 必須顯式聲明：
- [ ] `font-size`
- [ ] `line-height`（**最重要**，絕對不能省）
- [ ] `color`
- [ ] `font-family`（在根節點一次即可，靠繼承）
- [ ] `letter-spacing`（在根節點一次即可）

### 🟠 密度規則
- [ ] 一章節內**紅色 strong ≤ 2 處**，其餘用 `<strong style="font-weight:700;">` 只加粗不變色
- [ ] 每 2–3 個章節穿插一個元件（重點卡 / 小知識框 / 引文框 / 對照表）
- [ ] 超過 2000 字文章必須有目錄
- [ ] 每 600–800 字配一張圖 + 圖說

### 🟢 結構規則
- [ ] 根節點用「內容容器」統一 font-family / line-height / letter-spacing
- [ ] h3 前方都有錨點 div
- [ ] 文末必有 CTA 區 + 參考資料
- [ ] 所有 a 標籤都要 inline `color` 和 `text-decoration`（站方可能覆蓋）

---

## 🧪 範文片段（玄天上帝節選，v2.0 排版）

```html
<div style="font-family: 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif; color: #2a2a2a; line-height: 1.9; letter-spacing: 0.02em; font-size: 18px;">

  <h1 style="color: #c62d42; font-size: 30px; line-height: 1.4; font-weight: 700; text-align: center; margin: 0 0 16px; padding-bottom: 16px; border-bottom: 3px solid #c62d42;">拜上帝公在拜什麼？</h1>
  <p style="color: #6c757d; font-size: 17px; line-height: 1.6; text-align: center; margin: 0 0 12px;">——那個從北極星走下來、鎮守台灣四百年的神</p>
  <p style="color: #888; font-size: 14px; text-align: center; margin: 0 0 40px;">📖 約 8 分鐘 · 3500 字</p>

  <p style="font-size: 18px; line-height: 1.9; letter-spacing: 0.02em; color: #2a2a2a; margin: 0 0 22px; text-align: justify;">農曆三月初三，是玄天上帝聖誕。很多台灣人從小就知道「要拜上帝公」，但你有沒有想過——<strong style="color: #c62d42; font-weight: 700;">我們到底在拜什麼？</strong></p>

  <div style="background: #fef5f5; border-left: 5px solid #c62d42; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
    <p style="margin: 0 0 6px; color: #c62d42; font-weight: 700; font-size: 15px;">⭐ 重點</p>
    <p style="margin: 0; font-size: 17px; line-height: 1.8; color: #2a2a2a;">玄天上帝是北極星的神格化，從天上的導航星 → 道教護法 → 明朝國神 → 台灣討海人守護神，一路走了兩千多年。</p>
  </div>

  <div id="s1" style="padding-top: 80px; margin-top: -80px;"></div>
  <h3 style="color: #2c5aa0; font-size: 24px; line-height: 1.5; font-weight: 700; margin: 40px 0 20px; padding-left: 14px; border-left: 4px solid #2c5aa0;">🌌 從北極星走下來的神</h3>

  <p style="font-size: 18px; line-height: 1.9; letter-spacing: 0.02em; color: #2a2a2a; margin: 0 0 22px; text-align: justify;">古代航海沒有 GPS，晚上要看什麼？<strong style="font-weight: 700;">北極星。</strong>這顆在夜空中幾乎不動的星，變成所有迷路的人的座標原點。</p>

  <blockquote style="background: #faf6ef; border-left: 4px solid #b8860b; padding: 18px 22px; margin: 24px 0; font-family: 'Noto Serif TC', serif; font-size: 17px; line-height: 1.9; color: #5a4a3a;">
    「北辰居其所而眾星共之。」
    <footer style="margin-top: 10px; font-size: 13px; color: #8b7355;">——《論語·為政》</footer>
  </blockquote>

</div>
```

---

## ✅ 交付檢查清單（發文前必走）

- [ ] 所有 p 都有 `line-height: 1.9`（**不是** 24px）
- [ ] 根節點 font-family 有 PingFang TC 在第一位
- [ ] 所有連結 a 都有 inline color
- [ ] 紅色 strong 全篇清點 ≤ 每章 2 處
- [ ] 有目錄（2000+ 字）
- [ ] 有至少 1 個重點卡 + 1 個圖片 + 文末 CTA
- [ ] 手機視口實測可讀（Chrome DevTools 390px）

---

## 📝 版本
- v1.0 (2024-12-06)：inline style 硬規則，但缺 line-height 等覆蓋屬性
- **v2.0 (2026-04-15)**：顯式覆蓋站方 CSS，新增 7 個元件，強調色密度規則
- 未來 v3.0 候選：若 CMS 開放 `<style>` 標籤，整體搬去 class 架構
