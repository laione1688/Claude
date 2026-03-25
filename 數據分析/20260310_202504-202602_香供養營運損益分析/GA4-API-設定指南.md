# GA4 API 串接設定指南

> 設定一次，之後隨時可用 AI 抓取 GA4 數據做分析

---

## 前置作業（你需要在 GCP 完成的 5 個步驟）

### Step 1：啟用 GA4 Data API

1. 進入 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇或建立專案（建議名稱：`xiangongyang-analytics`）
3. 左側選單 → **API 和服務** → **程式庫**
4. 搜尋 **「Google Analytics Data API」**
5. 點選 → **啟用**

### Step 2：建立 Service Account

1. 左側選單 → **IAM 與管理** → **服務帳戶**
2. 點 **「建立服務帳戶」**
3. 填寫：
   - 名稱：`ga4-reader`
   - ID：`ga4-reader`（自動帶入）
   - 說明：`Read GA4 data for analysis`
4. 點「建立並繼續」
5. 角色先跳過 → 「完成」

### Step 3：下載金鑰 JSON

1. 點進剛建立的 `ga4-reader` 服務帳戶
2. 上方 → **金鑰** 頁籤
3. **新增金鑰** → **建立新金鑰** → **JSON**
4. 會自動下載一個 `.json` 檔案
5. **重要！** 把這個檔案移動到安全位置：
   ```bash
   mv ~/Downloads/xiangongyang-analytics-*.json ~/.config/gcloud/ga4-service-account.json
   ```
mv ~/Users/laichaochang/Library/CloudStorage/Dropbox/備份地/CLAUDE/GA分析用/triple-shadow-488313-s0-e27e5b8228a5.json ~/.config/gcloud/ga4-service-account.json
### Step 4：授權 Service Account 存取 GA4

1. 進入 [Google Analytics](https://analytics.google.com/)
2. 左下 **管理** → **資源設定** → **資源存取管理**
3. 點 **「+」** 新增使用者
4. 貼上 Service Account 的 email（格式：`ga4-reader@你的專案.iam.gserviceaccount.com`）
5. 角色選 **「檢視者」**（只讀，最安全）
6. 儲存

### Step 5：記下 GA4 Property ID

1. GA4 後台 → **管理** → **資源設定**
2. 記下頂部的 **「Property ID」**（純數字，如 `123456789`）
3. 告訴我這個 ID

---

## 完成後告訴我

只需要提供兩個東西：

1. **GA4 Property ID**（數字）
2. **Service Account JSON 的路徑**（如果照上面操作就是 `~/.config/gcloud/ga4-service-account.json`）

我就能幫你建立自動化分析工具，隨時抓取最新數據！

---

## 安全注意事項

- ✅ Service Account 只有「檢視者」權限 → 只能讀，不能改
- ✅ JSON 金鑰存在本機，不上傳任何地方
- ✅ 不會加入 git（會加入 .gitignore）
- ⚠️ 永遠不要把 JSON 金鑰分享給任何人或上傳到雲端

---

*建立日期：2026-03-09*
