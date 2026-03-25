# Notion MCP 使用指南

## 設定摘要

Notion MCP 已設定在全域 User MCPs 中，所有專案都可以使用。

### 設定位置
- 設定檔：`~/.claude.json`
- 設定類型：User MCP（全域）
- URL：`https://mcp.notion.com/mcp`

## 可用工具列表

Notion MCP 提供 13 個工具：

| 工具名稱 | 說明 | 權限 |
|---------|------|------|
| `notion-search` | 搜尋工作區 | read-only, open-world |
| `notion-fetch` | 讀取頁面/資料庫內容 | read-only |
| `notion-create-pages` | 建立新頁面 | - |
| `notion-update-page` | 更新頁面內容 | destructive |
| `notion-move-pages` | 移動頁面 | - |
| `notion-duplicate-page` | 複製頁面 | - |
| `notion-create-database` | 建立資料庫 | - |
| `notion-update-data-source` | 更新資料來源 | - |
| `notion-create-comment` | 建立評論 | - |
| `notion-get-comments` | 取得評論 | read-only |
| `notion-get-teams` | 取得團隊 | read-only |
| `notion-get-users` | 取得使用者 | read-only |
| `notion-query-database-view` | 查詢資料庫視圖 | read-only |

## 工具調用格式

使用 MCP 工具時，格式為：
```
mcp__notion__<工具名稱>
```

### 範例

**搜尋工作區：**
```
mcp__notion__notion-search
參數：query: "搜尋關鍵字"
```

**讀取頁面：**
```
mcp__notion__notion-fetch
參數：page_id: "頁面ID"
```

**建立頁面：**
```
mcp__notion__notion-create-pages
參數：parent_id: "父頁面ID", title: "標題", content: "內容"
```

## 常見問題排解

### 工具無法使用 (Error: No such tool available)

1. **確認 MCP 連接狀態**
   - 輸入 `/mcp` 查看 notion 是否顯示 `✔ connected`

2. **確認認證狀態**
   - 在 `/mcp` 中選擇 notion
   - 確認 `Auth: ✔ authenticated`
   - 如果需要認證，選擇 `Authenticate` 或 `Re-authenticate`

3. **重啟 Claude Code**
   - 按 `Ctrl+C` 結束
   - 重新執行 `claude`
   - 工具需要重啟後才會載入

### MCP 顯示 connected 但工具無法調用

這通常是因為 OAuth token 還沒被正確載入。解決方法：
1. 在 `/mcp` 中選擇 notion
2. 選擇 `Clear authentication`
3. 重新選擇 `Authenticate`
4. 完成瀏覽器中的 OAuth 授權
5. 重啟 Claude Code

### Notion 設定在 Local MCP vs User MCP

- **User MCP**（推薦）：全域設定，所有專案都可使用
- **Local MCP**：僅限特定專案目錄使用

如果只在特定目錄看到 Notion MCP，需要將設定移到全域：
```json
// ~/.claude.json 中的 mcpServers 區塊（全域設定）
"mcpServers": {
  "notion": {
    "type": "http",
    "url": "https://mcp.notion.com/mcp"
  }
}
```

## 香供養活動資料同步流程

### 資料格式
活動資料格式範例：
```
板橋慈惠宮-香供養時間
2/6（五）農曆12/19
報名截止：02/02（日）
```

### 同步步驟

1. **搜尋現有資料庫**
   ```
   mcp__notion__notion-search
   query: "每週活動清單導入"
   ```

2. **比對活動資料**
   - 新活動 → 新增
   - 已存在且相同 → 略過
   - 已存在但時間不同 → 詢問是否更新

3. **新增活動**
   ```
   mcp__notion__notion-create-pages
   parent_id: "資料庫ID"
   title: "活動名稱"
   properties: { 廟宇, 活動日期, 農曆日期, 報名截止日 }
   ```

## 相關資源

- [Notion MCP 官方文件](https://developers.notion.com/guides/mcp/get-started-with-mcp)
- [Claude Code Notion Plugin](https://github.com/makenotion/claude-code-notion-plugin)
- Notion 工作區：香供養推廣專案管理中心 Dashboard
