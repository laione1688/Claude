#!/bin/bash
# X Bookmark Sync — 安裝腳本
# 執行：chmod +x install.sh && ./install.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.pai.x-bookmark-sync"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

echo "🔧 安裝 X Bookmark Sync..."

# 1. 確認 bun 已安裝
if ! command -v bun &> /dev/null; then
    echo "❌ 找不到 bun。請先安裝：curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

BUN_PATH=$(which bun)
echo "✅ bun 路徑：$BUN_PATH"

# 2. 更新 plist 中的 bun 路徑（如果不是 /usr/local/bin/bun）
if [ "$BUN_PATH" != "/usr/local/bin/bun" ]; then
    sed -i '' "s|/usr/local/bin/bun|$BUN_PATH|g" "$PLIST_SRC"
    echo "✅ 已更新 plist 的 bun 路徑：$BUN_PATH"
fi

# 3. 複製 plist 到 LaunchAgents
cp "$PLIST_SRC" "$PLIST_DEST"
echo "✅ plist 已複製到：$PLIST_DEST"

# 4. 載入 launchd job
launchctl unload "$PLIST_DEST" 2>/dev/null  # 先卸載舊版
launchctl load "$PLIST_DEST"
echo "✅ launchd job 已載入"

# 5. 首次設定提示
echo ""
echo "📋 下一步："
echo "   1. 取得 X API Bearer Token："
echo "      https://developer.twitter.com/en/portal/dashboard"
echo ""
echo "   2. 執行設定精靈："
echo "      bun $SCRIPT_DIR/main.ts --setup"
echo ""
echo "   3. 測試執行："
echo "      bun $SCRIPT_DIR/main.ts --dry-run"
echo ""
echo "   4. 查看排程日誌："
echo "      tail -f /tmp/x-bookmark-sync.log"
echo ""
echo "✅ 安裝完成！每天早上 8:00 自動執行"
