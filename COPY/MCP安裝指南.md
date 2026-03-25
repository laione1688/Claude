# Gemini 圖像生成 MCP 擴展安裝指南

## 📋 安裝步驟

### 步驟 1：下載 MCP 擴展檔案
1. 前往 GitHub Releases 頁面：
   https://github.com/guinacio/claude-image-gen/releases

2. 下載最新版本的 `media-pipeline.mcpb` 檔案

### 步驟 2：取得 Gemini API Key
1. 前往 Google AI Studio：
   https://aistudio.google.com/app/apikey

2. 登入您的 Google 帳號

3. 點擊「Create API Key」建立新的 API 金鑰

4. 複製並保存您的 API Key（稍後會用到）

### 步驟 3：在 Claude Desktop 中安裝擴展
1. 開啟 **Claude Desktop** 應用程式

2. 進入設定：
   - macOS: `Claude` → `Settings`
   - Windows: `File` → `Settings`

3. 點選 **Extensions**

4. 點選 **Advanced settings**

5. 點擊 **Install Extension** 按鈕

6. 選擇您剛下載的 `media-pipeline.mcpb` 檔案

7. 當提示輸入 API Key 時，貼上您的 Gemini API Key

### 步驟 4：重啟 Claude Desktop
- 完全關閉 Claude Desktop
- 重新開啟應用程式

### 步驟 5：驗證安裝
安裝完成後，您可以在 Claude Desktop 中測試：

**測試指令：**
```
請使用 create_asset 工具生成一張測試圖片：
"A beautiful sunset over mountains"
```

如果安裝成功，Claude 將能夠調用 Gemini API 生成圖像並儲存到您的電腦。

---

## ⚙️ 進階配置（選用）

### 環境變數設定

如果您想要自訂設定，可以設定以下環境變數：

- `GEMINI_DEFAULT_MODEL`: 預設模型
  - `gemini-3-pro-image-preview` (高品質，預設)
  - `gemini-2.5-flash-image` (速度快)

- `IMAGE_OUTPUT_DIR`: 圖片儲存位置
  - 預設: `./generated-images`

---

## 🎨 安裝完成後的使用方式

安裝完成並重啟 Claude Desktop 後，我將可以直接為您生成地藏王菩薩的插圖！

您只需要回到這個對話，我就能使用 `create_asset` 工具來：
1. 根據文章內容生成插圖
2. 自動選擇合適的比例（建議 9:16 適合社群媒體）
3. 優化提示詞以獲得最佳效果
4. 將圖片儲存到您的電腦

---

## ❓ 常見問題

**Q: 我找不到 Extensions 選項？**
A: 確保您使用的是最新版本的 Claude Desktop

**Q: API Key 無效？**
A: 確認您已在 Google AI Studio 正確建立 API Key，且帳號已啟用 Gemini API

**Q: 圖片儲存在哪裡？**
A: 預設儲存在 `./generated-images` 資料夾中

**Q: 可以更改圖片品質嗎？**
A: 可以，在生成時指定使用不同的模型

---

## 📞 需要協助？

如果安裝過程中遇到任何問題，請告訴我：
- 您進行到哪個步驟
- 遇到什麼錯誤訊息
- 您的作業系統（macOS/Windows）

我會協助您排除問題！
