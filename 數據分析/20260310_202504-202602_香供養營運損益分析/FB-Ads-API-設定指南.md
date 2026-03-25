# FB Ads API 設定指南

> 目標：用自己的帳號先做技術驗證，確認可行後再跟垣宣要權限

---

## 第一步：確認你有 Meta Business Manager

1. 前往 [business.facebook.com](https://business.facebook.com/)
2. 如果沒有 → 建立一個（用你的 Facebook 個人帳號）
3. 記下你的 **Business Manager ID**

---

## 第二步：建立 Meta Developer App

1. 前往 [developers.facebook.com](https://developers.facebook.com/)
2. 點選 **My Apps** → **Create App**
3. 選擇 **Business** 類型
4. App 名稱：`香供養數據分析`（隨意取）
5. 綁定你的 Business Manager
6. 建立完成後，進入 App Dashboard

---

## 第三步：加入 Marketing API

1. 在 App Dashboard 左側找到 **Add Products**
2. 找到 **Marketing API** → 點 **Set Up**
3. 這樣就開啟了 Ads Insights API 的存取能力

---

## 第四步：取得 Access Token

### 方式 A：用 Graph API Explorer（快速測試用，Token 有效期 1-2 小時）

1. 前往 [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. 選擇你剛建的 App
3. 點 **Generate Access Token**
4. 勾選權限：`ads_read`
5. 複製產生的 Token

### 方式 B：用 System User（正式使用，Token 不過期）

1. 進入 Business Manager → **Settings** → **Users** → **System Users**
2. 點 **Add** → 命名 `data-analyzer`
3. 角色選 **Admin**（自己的 BM）
4. 建立後 → 點 **Generate New Token**
5. 選擇你的 App
6. 勾選 `ads_read` 權限
7. 複製不過期的 Token

---

## 第五步：找到你的廣告帳戶 ID

### 如果你有自己的廣告帳戶（有投過廣告）：
1. Business Manager → **Ad Accounts**
2. 帳戶 ID 格式：`act_XXXXXXXXX`

### 如果你從沒投過廣告（技術驗證用）：
- 你仍然可以建立一個測試用的廣告帳戶
- Business Manager → **Ad Accounts** → **Add** → **Create a new ad account**
- 即使沒有花費，API 連線測試也會通過

---

## 第六步：設定環境變數

在終端執行（或加到 `.env`）：

```bash
export FB_ACCESS_TOKEN="你的_access_token"
export FB_AD_ACCOUNT_ID="act_你的帳戶ID"
```

或建立 `.env` 檔案在分析目錄下：

```
FB_ACCESS_TOKEN=你的_access_token
FB_AD_ACCOUNT_ID=act_你的帳戶ID
```

> Bun 會自動載入 `.env`，不需要 dotenv。

---

## 第七步：測試連線

```bash
cd ~/Documents/Claude/數據分析/20260310_202504-202602_香供養營運損益分析/
bun analyze-fb-ads.ts
```

預期輸出：
```
🔌 測試 FB Ads API 連線...

✅ FB Ads API 連線成功！
   帳戶名稱：你的帳戶名
   帳戶狀態：啟用中
   幣別：TWD
   時區：Asia/Taipei
   API 版本：v21.0
```

---

## 技術驗證通過後：跟垣宣要什麼

驗證成功後，你只需要跟垣宣要**一件事**：

### 最小需求（二選一）

**選項 A（最簡單）：Partner Access**
> 「請把我們的 Business Manager（ID: XXXXXXX）加為你們廣告帳戶的 Partner，角色選 Analyst 就好。」

**選項 B（最完整）：帳戶轉移**
> 「請把我們的 FB 廣告帳戶轉移到我們自己的 Business Manager 下面，你們還是可以用 Partner 身份操作。」

### 你要準備好告訴垣宣的資訊
1. 你的 Business Manager ID
2. 需要的角色：**Analyst**（唯讀，看數據用）

### 他們會做的事
1. Business Manager → Settings → Partners → Add
2. 輸入你的 Business Manager ID
3. 分配 Analyst 權限到他們管理的廣告帳戶

### 拿到權限後
1. 更新 `.env` 中的 `FB_AD_ACCOUNT_ID` 為垣宣管理的帳戶 ID
2. 重新產生 Token（可能需要重新授權）
3. 跑完整分析：`bun analyze-fb-ads.ts 2025-05-01 2026-02-28`

---

## 常見問題

### Q: 我的 Token 過期了怎麼辦？
A: 用 System User 產生的 Token 不會過期。Graph API Explorer 的 Token 只有 1-2 小時。

### Q: 出現 "Error code 200: Permission denied"
A: 你沒有該廣告帳戶的 `ads_read` 權限。需要垣宣幫你開。

### Q: 出現 "Error code 100: Invalid parameter"
A: 廣告帳戶 ID 格式不對，確認是 `act_` 開頭。

### Q: 開發模式需要 App Review 嗎？
A: 不需要。只要讀取自己是 Admin 的帳戶，Development Mode 就夠了。

---

## 架構對照

| 元件 | GA4（已完成） | FB Ads（本指南） |
|------|-------------|----------------|
| 設定檔 | `ga4-config.ts` | `fb-ads-config.ts` |
| API 客戶端 | `ga4-client.ts` | `fb-ads-client.ts` |
| 分析腳本 | `analyze-funnel.ts` 等 | `analyze-fb-ads.ts` |
| 認證方式 | Service Account JSON | Access Token (.env) |
| 套件依賴 | `@google-analytics/data` | 無（直接用 fetch） |

---

*設定指南 | 2026-03-19*
