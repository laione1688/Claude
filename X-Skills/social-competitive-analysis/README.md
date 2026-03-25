# 三平台社群競品分析系統

TikTok + Instagram + Facebook 競品內容分析，自動產出內容議題建議。

## 快速開始

### 1. 填寫競品帳號
編輯 `accounts.json`，填入競品帳號資訊：

```json
{
  "competitors": [
    {
      "name": "競品A",
      "tiktok": "handle_without_at",
      "instagram": "handle_without_at",
      "facebook": "https://www.facebook.com/PageName"
    }
  ]
}
```

### 2. 執行抓取
```bash
source ~/.zshrc  # 載入 APIFY_TOKEN
bun run scrape.ts
```

### 3. 分析數據
抓取完成後，`output/YYYY-MM-DD/summary-for-analysis.md` 會包含：
- 各競品三平台高效貼文 TOP 5
- Hashtag 使用統計
- 跨平台數據對比

將此摘要給 Claude 分析，取得內容議題建議。

## 系統架構

```
[Fan-out 並行抓取]
  ├── TikTok (clockworks/tiktok-profile-scraper)
  ├── Instagram (apify/instagram-profile-scraper)
  └── Facebook (apify/facebook-posts-scraper)
         ↓
[輸出 raw-data.json + summary-for-analysis.md]
         ↓
[Claude 分析] → Fabric 模式識別 → x-filter 評分
         ↓
[TOP 10 議題建議報告]
```

## 成本估算

| 平台 | 每次 | 5帳號/月 |
|------|------|----------|
| TikTok × 5 | ~$0.25 | ~$1.00 |
| Instagram × 5 | ~$0.25 | ~$1.00 |
| Facebook × 5 | ~$0.15 | ~$0.60 |
| **合計** | **~$0.65** | **~$2.60** |

> Apify 免費額度 $5/月 → 約可跑 **7 次完整分析**

## 輸出目錄結構

```
output/
└── 2026-01-25/
    ├── raw-data.json              # 完整原始資料
    └── summary-for-analysis.md   # Markdown 摘要（供分析用）
```
