// FB Ads API 設定檔
// 使用前請先完成 FB-Ads-API-設定指南.md 中的步驟

export const FB_ADS_CONFIG = {
  // 廣告帳戶 ID（格式：act_XXXXXXXXX）
  // 從 Business Manager → 廣告帳戶 → 帳戶 ID 取得
  adAccountId: process.env.FB_AD_ACCOUNT_ID || "act_1465859694781097",

  // Access Token（從 Meta Developer App → System User 產生）
  accessToken: process.env.FB_ACCESS_TOKEN || "",

  // API 版本（截至 2026 年初的穩定版本）
  apiVersion: "v21.0",

  // 分析期間（與 GA4 分析一致）
  defaultStartDate: "2025-05-01",
  defaultEndDate: "2026-02-28",
};

// Graph API 基礎 URL
export const GRAPH_API_BASE = `https://graph.facebook.com/${FB_ADS_CONFIG.apiVersion}`;
