#!/bin/bash

# Claude Skills 自动同步脚本
# 自动从 Git 拉取更新并同步到 Obsidian

# 配置
REPO_DIR="/Users/laichaochang/Documents/Claude"
BRANCH="claude/add-x-article-publisher-plugin-1SrX0"
OBSIDIAN_VAULT="/Users/laichaochang/obsidian/SKILL資料"
LOG_FILE="/tmp/claude-skills-sync.log"

# 同步模式: "file" (文件复制) 或 "api" (REST API)
SYNC_MODE="${SYNC_MODE:-file}"  # 默认使用文件复制模式

# Obsidian API 配置 (仅在 api 模式下使用)
OBSIDIAN_API_URL="http://127.0.0.1:27124"
OBSIDIAN_API_KEY="6dc6ae6497aa285257c303998d328c2ce59f3b527def4ead2d79dff289e0d2da"
VAULT_PATH="SKILL資料"

# 时间戳
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# 记录日志函数
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

log "========== 开始自动同步 =========="

# 检查仓库目录是否存在
if [ ! -d "$REPO_DIR" ]; then
    log "错误: 仓库目录不存在: $REPO_DIR"
    exit 1
fi

# 进入仓库目录
cd "$REPO_DIR" || {
    log "错误: 无法进入仓库目录"
    exit 1
}

# 拉取最新更新
log "正在从 Git 拉取最新更新..."
GIT_OUTPUT=$(git pull origin "$BRANCH" 2>&1)
GIT_EXIT_CODE=$?

if [ $GIT_EXIT_CODE -eq 0 ]; then
    if echo "$GIT_OUTPUT" | grep -q "Already up to date"; then
        log "Git: 已是最新版本，无需更新"
    else
        log "Git: 成功拉取更新"
        log "更新详情: $GIT_OUTPUT"
    fi
else
    log "警告: Git 拉取失败: $GIT_OUTPUT"
    # 即使 Git 失败，仍然尝试同步现有文件
fi

# 执行同步
log "正在同步到 Obsidian (模式: $SYNC_MODE)..."

if [ "$SYNC_MODE" == "api" ]; then
    # API 模式
    SOURCE_FILE="$REPO_DIR/Claude-Skills-Installed.md"

    if [ ! -f "$SOURCE_FILE" ]; then
        log "错误: 源文件不存在"
        exit 1
    fi

    # 测试 API 连接
    API_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
      "$OBSIDIAN_API_URL/" 2>&1)

    if [ "$API_TEST" != "200" ]; then
        log "警告: API 连接失败 (HTTP $API_TEST)，降级到文件模式"
        SYNC_MODE="file"
    else
        # 使用 API 写入
        ENCODED_PATH=$(echo "$VAULT_PATH/Claude-Skills-Installed.md" | sed 's/ /%20/g')

        HTTP_CODE=$(curl -s -o /tmp/obsidian_api_response.txt -w "%{http_code}" \
          -X PUT \
          -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
          -H "Content-Type: text/markdown" \
          --data-binary @"$SOURCE_FILE" \
          "$OBSIDIAN_API_URL/vault/$ENCODED_PATH")

        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "204" ]; then
            log "✓ 同步成功 (via API)"
            FILE_SIZE=$(wc -c < "$SOURCE_FILE")
            FILE_LINES=$(wc -l < "$SOURCE_FILE")
            log "文件统计: $FILE_LINES 行, $FILE_SIZE bytes"
        else
            log "✗ API 同步失败 (HTTP $HTTP_CODE)"
            exit 1
        fi
    fi
fi

if [ "$SYNC_MODE" == "file" ]; then
    # 文件复制模式
    if [ ! -f "$REPO_DIR/sync_skills_to_obsidian.sh" ]; then
        log "错误: 同步脚本不存在"
        exit 1
    fi

    SYNC_OUTPUT=$("$REPO_DIR/sync_skills_to_obsidian.sh" "$OBSIDIAN_VAULT" 2>&1)
    SYNC_EXIT_CODE=$?

    if [ $SYNC_EXIT_CODE -eq 0 ]; then
        log "✓ 同步成功 (via file copy)"

        # 提取文件统计信息
        if [ -f "$OBSIDIAN_VAULT/Claude-Skills-Installed.md" ]; then
            FILE_SIZE=$(ls -lh "$OBSIDIAN_VAULT/Claude-Skills-Installed.md" | awk '{print $5}')
            FILE_LINES=$(wc -l < "$OBSIDIAN_VAULT/Claude-Skills-Installed.md")
            log "文件统计: $FILE_LINES 行, $FILE_SIZE"
        fi
    else
        log "✗ 同步失败: $SYNC_OUTPUT"
        exit 1
    fi
fi

log "========== 同步完成 =========="

# 保持日志文件大小合理（只保留最后 1000 行）
tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

exit 0
