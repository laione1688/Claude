#!/bin/bash

# Claude Skills 自动同步脚本
# 自动从 Git 拉取更新并同步到 Obsidian

# 配置
REPO_DIR="/Users/laichaochang/Documents/Claude"
BRANCH="claude/add-x-article-publisher-plugin-1SrX0"
OBSIDIAN_VAULT="/Users/laichaochang/obsidian/SKILL資料"
LOG_FILE="/tmp/claude-skills-sync.log"

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

# 检查同步脚本是否存在
if [ ! -f "$REPO_DIR/sync_skills_to_obsidian.sh" ]; then
    log "错误: 同步脚本不存在"
    exit 1
fi

# 执行同步
log "正在同步到 Obsidian..."
SYNC_OUTPUT=$("$REPO_DIR/sync_skills_to_obsidian.sh" "$OBSIDIAN_VAULT" 2>&1)
SYNC_EXIT_CODE=$?

if [ $SYNC_EXIT_CODE -eq 0 ]; then
    log "✓ 同步成功"

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

log "========== 同步完成 =========="

# 保持日志文件大小合理（只保留最后 1000 行）
tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

exit 0
