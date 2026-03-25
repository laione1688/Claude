/**
 * FB Ads Insights API 客戶端
 * 用於從 Facebook/Meta 廣告後台抓取廣告成效數據
 *
 * 使用 Graph API REST 呼叫，不依賴 facebook-business SDK
 * 與 ga4-client.ts 架構對稱
 */

import { FB_ADS_CONFIG, GRAPH_API_BASE } from "./fb-ads-config";

// ==================== 型別定義 ====================

interface InsightsParams {
  level?: "account" | "campaign" | "adset" | "ad";
  fields: string[];
  breakdowns?: string[];
  timeRange?: { since: string; until: string };
  datePreset?: string;
  filtering?: Array<{ field: string; operator: string; value: string[] }>;
  limit?: number;
  sort?: string[];
}

interface InsightsRow {
  [key: string]: any;
}

// ==================== 核心查詢函數 ====================

/**
 * 通用 Insights 查詢（對應 GA4 的 runReport）
 */
async function fetchInsights(params: InsightsParams): Promise<InsightsRow[]> {
  const { adAccountId, accessToken } = FB_ADS_CONFIG;

  if (!accessToken) {
    throw new Error(
      "FB_ACCESS_TOKEN 未設定。請先完成 FB-Ads-API-設定指南.md 中的步驟。"
    );
  }

  const url = new URL(
    `${GRAPH_API_BASE}/${adAccountId}/insights`
  );

  // 基本參數
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", params.fields.join(","));

  if (params.level) {
    url.searchParams.set("level", params.level);
  }

  if (params.breakdowns) {
    url.searchParams.set("breakdowns", params.breakdowns.join(","));
  }

  if (params.timeRange) {
    url.searchParams.set(
      "time_range",
      JSON.stringify(params.timeRange)
    );
  } else if (params.datePreset) {
    url.searchParams.set("date_preset", params.datePreset);
  }

  if (params.filtering) {
    url.searchParams.set("filtering", JSON.stringify(params.filtering));
  }

  if (params.limit) {
    url.searchParams.set("limit", String(params.limit));
  }

  if (params.sort) {
    url.searchParams.set("sort", JSON.stringify(params.sort));
  }

  // 加入時間增量，方便看月度趨勢
  url.searchParams.set("time_increment", "monthly");

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    const err = data.error;
    throw new Error(`FB API 錯誤 [${err.code}]: ${err.message}`);
  }

  // 處理分頁
  let allRows: InsightsRow[] = data.data || [];
  let nextUrl = data.paging?.next;

  while (nextUrl) {
    const nextResponse = await fetch(nextUrl);
    const nextData = await nextResponse.json();
    if (nextData.data) {
      allRows = allRows.concat(nextData.data);
    }
    nextUrl = nextData.paging?.next;
  }

  return allRows;
}

/**
 * 不帶 time_increment 的查詢（用於總覽和 breakdown）
 */
async function fetchInsightsFlat(params: InsightsParams): Promise<InsightsRow[]> {
  const { adAccountId, accessToken } = FB_ADS_CONFIG;

  if (!accessToken) {
    throw new Error(
      "FB_ACCESS_TOKEN 未設定。請先完成 FB-Ads-API-設定指南.md 中的步驟。"
    );
  }

  const url = new URL(
    `${GRAPH_API_BASE}/${adAccountId}/insights`
  );

  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", params.fields.join(","));

  if (params.level) {
    url.searchParams.set("level", params.level);
  }

  if (params.breakdowns) {
    url.searchParams.set("breakdowns", params.breakdowns.join(","));
  }

  if (params.timeRange) {
    url.searchParams.set(
      "time_range",
      JSON.stringify(params.timeRange)
    );
  } else if (params.datePreset) {
    url.searchParams.set("date_preset", params.datePreset);
  }

  if (params.filtering) {
    url.searchParams.set("filtering", JSON.stringify(params.filtering));
  }

  if (params.limit) {
    url.searchParams.set("limit", String(params.limit));
  }

  if (params.sort) {
    url.searchParams.set("sort", JSON.stringify(params.sort));
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    const err = data.error;
    throw new Error(`FB API 錯誤 [${err.code}]: ${err.message}`);
  }

  let allRows: InsightsRow[] = data.data || [];
  let nextUrl = data.paging?.next;

  while (nextUrl) {
    const nextResponse = await fetch(nextUrl);
    const nextData = await nextResponse.json();
    if (nextData.data) {
      allRows = allRows.concat(nextData.data);
    }
    nextUrl = nextData.paging?.next;
  }

  return allRows;
}

// ==================== 報表查詢函數 ====================

/** 標準指標欄位 */
const STANDARD_FIELDS = [
  "campaign_name",
  "objective",
  "impressions",
  "reach",
  "clicks",
  "spend",
  "cpc",
  "cpm",
  "ctr",
  "frequency",
  "actions",
  "cost_per_action_type",
  "purchase_roas",
];

// ==================== 廣告類型分類 ====================

/**
 * FB 廣告類型：直投廣告 vs 貼文推廣
 *
 * 直投廣告（Ads Manager Campaigns）：
 *   objective = OUTCOME_SALES, OUTCOME_TRAFFIC, CONVERSIONS, LINK_CLICKS 等
 *   在 Ads Manager 中建立，有精細受眾設定
 *
 * 貼文推廣（Boosted Posts）：
 *   objective = POST_ENGAGEMENT, OUTCOME_ENGAGEMENT, PAGE_LIKES
 *   在粉專直接按「加強推廣」，目標是互動
 */

/** 貼文推廣的 objective 值 */
const BOOSTED_POST_OBJECTIVES = [
  "POST_ENGAGEMENT",
  "PAGE_LIKES",
  "OUTCOME_ENGAGEMENT",
  "BRAND_AWARENESS",
];

/** 判斷是否為貼文推廣 */
export function isBoostedPost(objective: string | undefined): boolean {
  if (!objective) return false;
  return BOOSTED_POST_OBJECTIVES.includes(objective.toUpperCase());
}

/** 取得廣告類型標籤 */
export function getAdTypeLabel(objective: string | undefined): string {
  if (!objective) return "未知";
  if (isBoostedPost(objective)) return "📢 貼文推廣";
  return "🎯 直投廣告";
}

/** 取得 objective 的中文名稱 */
export function getObjectiveLabel(objective: string | undefined): string {
  const labels: Record<string, string> = {
    OUTCOME_SALES: "銷售轉換",
    OUTCOME_TRAFFIC: "流量導入",
    OUTCOME_ENGAGEMENT: "互動推廣",
    OUTCOME_LEADS: "名單收集",
    OUTCOME_AWARENESS: "品牌知名度",
    CONVERSIONS: "轉換（舊版）",
    LINK_CLICKS: "連結點擊（舊版）",
    POST_ENGAGEMENT: "貼文互動",
    PAGE_LIKES: "粉專按讚",
    BRAND_AWARENESS: "品牌知名度",
    REACH: "觸及",
    VIDEO_VIEWS: "影片觀看",
  };
  return labels[objective?.toUpperCase() || ""] || objective || "未知";
}

/** 1. 帳戶總覽（月度趨勢） */
export async function getAccountMonthlyTrend(
  startDate: string,
  endDate: string
) {
  return fetchInsights({
    fields: [
      "impressions",
      "reach",
      "clicks",
      "spend",
      "cpc",
      "cpm",
      "ctr",
      "actions",
      "purchase_roas",
    ],
    timeRange: { since: startDate, until: endDate },
  });
}

/** 2. 各 Campaign 成效 */
export async function getCampaignPerformance(
  startDate: string,
  endDate: string
) {
  return fetchInsightsFlat({
    level: "campaign",
    fields: STANDARD_FIELDS,
    timeRange: { since: startDate, until: endDate },
  });
}

/** 3. 各廣告組（Ad Set）成效 */
export async function getAdSetPerformance(
  startDate: string,
  endDate: string
) {
  return fetchInsightsFlat({
    level: "adset",
    fields: [
      "adset_name",
      "campaign_name",
      "objective",
      "impressions",
      "clicks",
      "spend",
      "cpc",
      "ctr",
      "actions",
      "cost_per_action_type",
      "purchase_roas",
    ],
    timeRange: { since: startDate, until: endDate },
  });
}

/** 4. 各廣告素材（Ad）成效 */
export async function getAdPerformance(startDate: string, endDate: string) {
  return fetchInsightsFlat({
    level: "ad",
    fields: [
      "ad_name",
      "adset_name",
      "campaign_name",
      "impressions",
      "clicks",
      "spend",
      "cpc",
      "ctr",
      "actions",
      "purchase_roas",
    ],
    timeRange: { since: startDate, until: endDate },
    limit: 50,
  });
}

/** 5. 年齡 × 性別分群 */
export async function getDemographicBreakdown(
  startDate: string,
  endDate: string
) {
  return fetchInsightsFlat({
    fields: [
      "impressions",
      "clicks",
      "spend",
      "cpc",
      "ctr",
      "actions",
      "purchase_roas",
    ],
    breakdowns: ["age", "gender"],
    timeRange: { since: startDate, until: endDate },
  });
}

/** 6. 版位分群（Facebook / Instagram / Audience Network） */
export async function getPlacementBreakdown(
  startDate: string,
  endDate: string
) {
  return fetchInsightsFlat({
    fields: [
      "impressions",
      "clicks",
      "spend",
      "cpc",
      "ctr",
      "actions",
      "purchase_roas",
    ],
    breakdowns: ["publisher_platform", "platform_position"],
    timeRange: { since: startDate, until: endDate },
  });
}

/** 7. 裝置分群 */
export async function getDeviceBreakdown(
  startDate: string,
  endDate: string
) {
  return fetchInsightsFlat({
    fields: [
      "impressions",
      "clicks",
      "spend",
      "cpc",
      "ctr",
      "actions",
    ],
    breakdowns: ["device_platform"],
    timeRange: { since: startDate, until: endDate },
  });
}

/** 8. 地區分群 */
export async function getRegionBreakdown(
  startDate: string,
  endDate: string
) {
  return fetchInsightsFlat({
    fields: [
      "impressions",
      "clicks",
      "spend",
      "actions",
    ],
    breakdowns: ["region"],
    timeRange: { since: startDate, until: endDate },
  });
}

/** 9. 按廣告類型分組的 Campaign 成效（直投 vs 貼文推廣） */
export async function getCampaignsByType(
  startDate: string,
  endDate: string
) {
  const all = await getCampaignPerformance(startDate, endDate);
  const direct = all.filter((r) => !isBoostedPost(r.objective));
  const boosted = all.filter((r) => isBoostedPost(r.objective));
  return { all, direct, boosted };
}

/** 10. 貼文推廣專用指標（互動：按讚、留言、分享） */
export async function getBoostedPostEngagement(
  startDate: string,
  endDate: string
) {
  return fetchInsightsFlat({
    level: "campaign",
    fields: [
      "campaign_name",
      "objective",
      "impressions",
      "reach",
      "clicks",
      "spend",
      "cpc",
      "cpm",
      "ctr",
      "actions",
      "cost_per_action_type",
    ],
    filtering: [
      {
        field: "objective",
        operator: "IN",
        value: BOOSTED_POST_OBJECTIVES,
      },
    ],
    timeRange: { since: startDate, until: endDate },
  });
}

/** 11. 直投廣告專用指標（轉換：購買、加入購物車） */
export async function getDirectAdConversions(
  startDate: string,
  endDate: string
) {
  return fetchInsightsFlat({
    level: "campaign",
    fields: [
      "campaign_name",
      "objective",
      "impressions",
      "reach",
      "clicks",
      "spend",
      "cpc",
      "ctr",
      "actions",
      "cost_per_action_type",
      "purchase_roas",
    ],
    filtering: [
      {
        field: "objective",
        operator: "NOT_IN",
        value: BOOSTED_POST_OBJECTIVES,
      },
    ],
    timeRange: { since: startDate, until: endDate },
  });
}

// ==================== 輔助函數 ====================

/**
 * 從 actions 陣列中提取特定動作的值
 * FB API 回傳的 actions 是 [{action_type: "purchase", value: "5"}, ...]
 */
export function extractAction(
  actions: Array<{ action_type: string; value: string }> | undefined,
  actionType: string
): number {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === actionType);
  return action ? parseInt(action.value) : 0;
}

/**
 * 從 cost_per_action_type 中提取特定動作的 CPA
 */
export function extractCPA(
  costPerAction:
    | Array<{ action_type: string; value: string }>
    | undefined,
  actionType: string
): number {
  if (!costPerAction) return 0;
  const action = costPerAction.find((a) => a.action_type === actionType);
  return action ? parseFloat(action.value) : 0;
}

// ==================== 格式化輸出 ====================

function formatNumber(num: number): string {
  if (isNaN(num)) return "—";
  if (num >= 1000) return "$" + num.toLocaleString("zh-TW", { maximumFractionDigits: 0 });
  if (num < 1 && num > 0) return (num * 100).toFixed(1) + "%";
  return num.toFixed(num % 1 === 0 ? 0 : 2);
}

export function formatInsightsTable(
  title: string,
  rows: InsightsRow[],
  columns: { key: string; label: string; format?: (v: any) => string }[]
): string {
  const lines: string[] = [
    `\n${"=".repeat(70)}`,
    `📊 ${title}`,
    `${"=".repeat(70)}`,
  ];

  if (!rows.length) {
    lines.push("（無數據）");
    return lines.join("\n");
  }

  // 表頭
  lines.push(columns.map((c) => c.label).join("\t"));
  lines.push("-".repeat(70));

  // 數據行
  for (const row of rows) {
    const values = columns.map((col) => {
      const val = row[col.key];
      if (col.format) return col.format(val);
      if (typeof val === "number") return formatNumber(val);
      return val ?? "—";
    });
    lines.push(values.join("\t"));
  }

  return lines.join("\n");
}

// ==================== 連線測試 ====================

export async function testConnection(): Promise<boolean> {
  const { adAccountId, accessToken, apiVersion } = FB_ADS_CONFIG;

  if (!accessToken) {
    console.error("❌ FB_ACCESS_TOKEN 未設定");
    console.error("→ 請先完成 FB-Ads-API-設定指南.md 中的步驟");
    return false;
  }

  try {
    // 測試：取得帳戶基本資訊
    const url = `${GRAPH_API_BASE}/${adAccountId}?fields=name,account_status,currency,timezone_name&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`❌ API 錯誤 [${data.error.code}]: ${data.error.message}`);

      if (data.error.code === 190) {
        console.error("→ Access Token 無效或已過期，請重新產生");
      } else if (data.error.code === 100) {
        console.error("→ 廣告帳戶 ID 不正確，請確認格式為 act_XXXXXXXXX");
      } else if (data.error.code === 200) {
        console.error("→ 沒有權限存取此帳戶，需要 ads_read 權限");
      }
      return false;
    }

    console.log("✅ FB Ads API 連線成功！");
    console.log(`   帳戶名稱：${data.name}`);
    console.log(`   帳戶狀態：${data.account_status === 1 ? "啟用中" : "停用"}`);
    console.log(`   幣別：${data.currency}`);
    console.log(`   時區：${data.timezone_name}`);
    console.log(`   API 版本：${apiVersion}`);
    return true;
  } catch (err: any) {
    console.error(`❌ 網路錯誤：${err.message}`);
    return false;
  }
}
