# HTML 文章排版標準技能

## 目的
當用戶要求將文章內容轉換為 HTML 格式時，使用本技能提供的完整排版標準，確保輸出符合「明心福旺閣」和「三旺文創」的品牌視覺規範。

## 適用場景
- 用戶說「請排版」、「做成HTML」、「網頁格式」、「HTML版本」
- 需要將 Markdown 或純文字文章轉換為專業 HTML 網頁
- 需要符合特定品牌色彩和樣式的宗教/文化內容排版

---

## 輸出方式

### 強制要求
- **必須使用 create_file 工具創建 HTML 文件**
- 絕對不可只在對話中顯示程式碼
- 將完整 HTML 內容寫入 `/mnt/user-data/outputs/` 目錄
- 文件名使用有意義的中文描述，例如：`大士爺文章.html`、`觀音供香儀軌.html`

### 完成後的回應格式
```
[查看您的文章](computer:///mnt/user-data/outputs/文件名.html)
```

### 文件創建觸發條件
當用戶說以下任何關鍵詞時，**立即創建文件，不要詢問**：
- 「請排版」
- 「做成HTML」
- 「網頁格式」
- 「HTML版本」
- 「轉成網頁」

---

## 技術規格

### 核心要求
1. **完全內聯樣式（Critical）**
   - 所有 CSS 必須寫在每個 HTML 標籤的 `style` 屬性內
   - **絕對禁止使用 `<style>` 標籤**
   - **絕對禁止使用外部 CSS 文件**
   - 每個 HTML 標籤都必須包含完整的 `style` 屬性

2. **響應式設計**
   - `max-width: 800px`
   - `margin: 0 auto`
   - `padding: 20px`
   - 確保移動設備適配

3. **字體系統**
   - 主字體：`'Microsoft JhengHei', Arial, sans-serif`
   - 行高：`line-height: 1.8`
   - 最小字體大小：20px（body 內文）

4. **錨點導航技術**
   - 使用 `padding-top: 80px; margin-top: -80px`
   - 確保點擊目錄連結時內容不被導航列遮蔽

---

## 顏色系統

### 品牌色彩定義
| 用途 | 顏色代碼 | 說明 |
|------|----------|------|
| 主色/強調 | `#c62d42` | 紅色 - 用於 h1、strong、按鈕 |
| 章節標題 h3 | `#2c5aa0` | 藍色 - 搭配左側 4px 邊框 |
| 小標題 h4 | `#e67e22` | 橘色 - 突出重點 |
| 正文文字 | `#333` | 深灰 - 確保閱讀舒適 |
| 背景區塊 | `#f8f9fa` | 淺灰 - 用於目錄、參考資料 |
| 邊框/分隔線 | `#dee2e6` | 中灰 |
| 次要文字 | `#6c757d` | 灰色 - 用於參考資料 |
| 連結 | `#007bff` | 藍色 - 目錄連結 |

---

## HTML 元素樣式規範

### 1. 文檔結構

#### DOCTYPE 和基本結構
```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文章標題</title>
</head>
<body style="font-family: 'Microsoft JhengHei', Arial, sans-serif; line-height: 1.8; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #fafafa;">
    <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 20px rgba(0,0,0,0.1);">
        <!-- 內容區塊 -->
    </div>
</body>
</html>
```

### 2. 標題層級

#### H1 - 主標題
```html
<h1 style="color: #c62d42; font-size: 32px; margin-bottom: 20px; text-align: center; border-bottom: 3px solid #c62d42; padding-bottom: 20px; line-height: 1.4;">
    文章主標題
</h1>
```

#### H2 - 副標題/引言
```html
<h2 style="color: #666; font-size: 18px; text-align: center; margin-bottom: 30px; font-weight: normal;">
    ——副標題或引言
</h2>
```

#### H3 - 章節標題
```html
<h3 style="color: #2c5aa0; font-size: 22px; margin: 35px 0 20px 0; padding-left: 15px; border-left: 4px solid #2c5aa0;">
    🔥 章節標題（可使用 emoji）
</h3>
```

#### H4 - 小標題
```html
<h4 style="color: #e67e22; font-size: 18px; margin: 25px 0 15px 0; font-weight: bold;">
    小標題
</h4>
```

### 3. 段落和文字

#### 普通段落
```html
<p style="margin-bottom: 15px; text-align: justify; font-size: 20px;">
    段落內容...
</p>
```

#### 強調文字
```html
<strong style="color: #c62d42; font-weight: bold;">重要文字</strong>
```

### 4. 目錄區塊

```html
<div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #dee2e6;">
    <h3 style="color: #495057; margin-top: 0; margin-bottom: 20px; font-size: 20px;">目錄</h3>
    <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 8px;">
            <a href="#section1" style="color: #007bff; text-decoration: none; font-size: 16px;">第一章節標題</a>
        </li>
        <li style="margin-bottom: 8px;">
            <a href="#section2" style="color: #007bff; text-decoration: none; font-size: 16px;">第二章節標題</a>
        </li>
    </ul>
</div>
```

### 5. 錨點導航

#### 錨點定位元素
```html
<div id="section1" style="padding-top: 80px; margin-top: -80px;"></div>
<h3 style="color: #2c5aa0; font-size: 22px; margin: 35px 0 20px 0; padding-left: 15px; border-left: 4px solid #2c5aa0;">
    章節標題
</h3>
```

**注意**：
- 錨點 ID 使用 `section1`, `section2`, `section3` 等連續編號
- 錨點 div 必須放在章節標題的**正上方**
- 參考資料的錨點 ID 使用 `references`

### 6. 回到目錄按鈕

```html
<div style="text-align: center; margin: 50px 0 30px 0;">
    <a href="#" style="background: #c62d42; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">回到目錄</a>
</div>
```

### 7. 參考資料區塊

```html
<div id="references" style="padding-top: 80px; margin-top: -80px;"></div>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 40px; border-left: 4px solid #6c757d;">
    <h3 style="color: #6c757d; margin-top: 0; font-size: 20px;">參考資料</h3>
    <ul style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px; color: #6c757d;">《經典名稱》，作者/譯者</li>
        <li style="margin-bottom: 8px; color: #6c757d;">論文或書籍引用</li>
    </ul>
</div>
```

---

## 完整範本結構

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文章標題</title>
</head>
<body style="font-family: 'Microsoft JhengHei', Arial, sans-serif; line-height: 1.8; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #fafafa;">
    <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 20px rgba(0,0,0,0.1);">
        
        <!-- 主標題 -->
        <h1 style="color: #c62d42; font-size: 32px; margin-bottom: 20px; text-align: center; border-bottom: 3px solid #c62d42; padding-bottom: 20px; line-height: 1.4;">
            文章主標題
        </h1>
        
        <!-- 副標題 -->
        <h2 style="color: #666; font-size: 18px; text-align: center; margin-bottom: 30px; font-weight: normal;">
            ——副標題或引言
        </h2>
        
        <!-- 開場段落 -->
        <p style="margin-bottom: 15px; text-align: justify; font-size: 20px;">
            <strong style="color: #c62d42; font-weight: bold;">開場強調文字。</strong>其他內容...
        </p>
        
        <p style="margin-bottom: 15px; text-align: justify; font-size: 20px;">
            第二段內容...
        </p>
        
        <!-- 目錄 -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #dee2e6;">
            <h3 style="color: #495057; margin-top: 0; margin-bottom: 20px; font-size: 20px;">目錄</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 8px;">
                    <a href="#section1" style="color: #007bff; text-decoration: none; font-size: 16px;">第一章節</a>
                </li>
                <li style="margin-bottom: 8px;">
                    <a href="#section2" style="color: #007bff; text-decoration: none; font-size: 16px;">第二章節</a>
                </li>
                <li style="margin-bottom: 8px;">
                    <a href="#references" style="color: #007bff; text-decoration: none; font-size: 16px;">參考資料</a>
                </li>
            </ul>
        </div>
        
        <!-- 第一章節 -->
        <div id="section1" style="padding-top: 80px; margin-top: -80px;"></div>
        <h3 style="color: #2c5aa0; font-size: 22px; margin: 35px 0 20px 0; padding-left: 15px; border-left: 4px solid #2c5aa0;">
            🔥 第一章節標題
        </h3>
        
        <p style="margin-bottom: 15px; text-align: justify; font-size: 20px;">
            章節內容...
        </p>
        
        <h4 style="color: #e67e22; font-size: 18px; margin: 25px 0 15px 0; font-weight: bold;">
            小標題
        </h4>
        
        <p style="margin-bottom: 15px; text-align: justify; font-size: 20px;">
            小節內容...
        </p>
        
        <!-- 第二章節 -->
        <div id="section2" style="padding-top: 80px; margin-top: -80px;"></div>
        <h3 style="color: #2c5aa0; font-size: 22px; margin: 35px 0 20px 0; padding-left: 15px; border-left: 4px solid #2c5aa0;">
            📜 第二章節標題
        </h3>
        
        <p style="margin-bottom: 15px; text-align: justify; font-size: 20px;">
            更多內容...
        </p>
        
        <!-- 回到目錄 -->
        <div style="text-align: center; margin: 50px 0 30px 0;">
            <a href="#" style="background: #c62d42; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">回到目錄</a>
        </div>
        
        <!-- 參考資料 -->
        <div id="references" style="padding-top: 80px; margin-top: -80px;"></div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 40px; border-left: 4px solid #6c757d;">
            <h3 style="color: #6c757d; margin-top: 0; font-size: 20px;">參考資料</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px; color: #6c757d;">《經典名稱》，作者/譯者，出版資訊</li>
                <li style="margin-bottom: 8px; color: #6c757d;">論文或其他引用</li>
            </ul>
        </div>
        
    </div>
</body>
</html>
```

---

## 執行工作流程

### 步驟 1：接收用戶請求
當用戶說：
- 「請排版」
- 「做成 HTML」
- 「轉成網頁格式」
- 「HTML 版本」

### 步驟 2：立即創建文件
- **不要詢問確認**
- 使用 `create_file` 工具
- 路徑：`/mnt/user-data/outputs/有意義的文件名.html`
- 內容：完整符合本規範的 HTML

### 步驟 3：提供下載連結
```
[查看您的文章](computer:///mnt/user-data/outputs/文件名.html)
```

### 步驟 4：簡短回應
示例：
```
已為您完成 HTML 排版。

[查看您的文章](computer:///mnt/user-data/outputs/大士爺文章.html)

文章包含完整的目錄導航、章節錨點和參考資料區塊，可直接在瀏覽器中打開查看。
```

**避免**：
- ❌ 冗長的解釋文字
- ❌ 過度描述完成了什麼工作
- ❌ 詢問用戶是否需要調整

---

## 品質檢查清單

在創建 HTML 文件前，確認：

- [ ] **所有樣式都使用內聯 `style` 屬性**
- [ ] **沒有使用 `<style>` 標籤**
- [ ] **沒有外部 CSS 引用**
- [ ] **顏色代碼正確**（紅 #c62d42、藍 #2c5aa0、橘 #e67e22）
- [ ] **字體指定為 'Microsoft JhengHei'**
- [ ] **body 內文字體大小至少 20px**
- [ ] **目錄連結正確對應錨點**
- [ ] **錨點 div 放在章節標題上方**
- [ ] **包含「回到目錄」按鈕**
- [ ] **參考資料區塊格式正確**
- [ ] **響應式設計（max-width: 800px）**

---

## 常見問題處理

### Q: 用戶提供的是 Markdown 格式文章？
**A:** 轉換時保持內容結構，將：
- `#` → `<h3>` (章節標題)
- `##` → `<h4>` (小標題)
- `**粗體**` → `<strong style="...">`
- 段落 → `<p style="...">`

### Q: 文章沒有明確的章節劃分？
**A:** 根據內容邏輯自行劃分 3-7 個章節，確保：
- 每個章節有清晰主題
- 目錄能反映文章結構
- 添加適當的錨點導航

### Q: 用戶要求修改顏色或樣式？
**A:** 遵循用戶要求調整，但：
- 保持內聯樣式的原則
- 確保色彩對比度足夠（可讀性）
- 維持整體視覺和諧

### Q: 需要添加圖片嗎?
**A:** 本規範主要針對文字排版。如需圖片：
```html
<img src="圖片URL" alt="描述" style="max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 8px;">
```

---

## 範例參考

完整範例請參考：
- `/mnt/project/大士爺文章_HTML_版本.html`

這個文件展示了所有規範的實際應用。

---

## 版本資訊
- **版本**: 1.0
- **最後更新**: 2024-12-06
- **適用範圍**: 明心福旺閣、三旺文創所有宗教文化內容
- **維護者**: LAI

