#!/bin/bash

# Claude Skills 列表 → Obsidian 同步脚本
# 自动同步 Skills 安装清单到你的 Obsidian 仓库

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="$SCRIPT_DIR/Claude-Skills-Installed.md"
OBSIDIAN_PATH="/Users/laichaochang/obsidian/SKILL資料"
OUTPUT_FILE="Claude-Skills-Installed.md"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   Claude Skills → Obsidian 同步工具${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 检查源文件是否存在
if [ ! -f "$SOURCE_FILE" ]; then
    echo -e "${RED}✗ 错误: 找不到源文件${NC}"
    echo -e "${YELLOW}  文件路径: $SOURCE_FILE${NC}"
    echo -e "${YELLOW}  请确保在 Git 仓库根目录运行此脚本${NC}"
    exit 1
fi

# 检查 Obsidian vault 是否存在
if [ ! -d "$OBSIDIAN_PATH" ]; then
    echo -e "${RED}✗ 错误: Obsidian vault 不存在${NC}"
    echo -e "${YELLOW}  路径: $OBSIDIAN_PATH${NC}"
    echo ""
    echo -e "${YELLOW}提示: 您可以通过参数指定路径:${NC}"
    echo -e "${YELLOW}  $0 /path/to/your/obsidian/vault${NC}"
    exit 1
fi

# 如果提供了参数，使用参数作为 Obsidian 路径
if [ -n "$1" ]; then
    OBSIDIAN_PATH="$1"
    echo -e "${YELLOW}ℹ 使用自定义路径: $OBSIDIAN_PATH${NC}"
    echo ""
fi

# 显示配置信息
echo -e "${BLUE}📋 同步配置:${NC}"
echo -e "  源文件: ${GREEN}$SOURCE_FILE${NC}"
echo -e "  目标路径: ${GREEN}$OBSIDIAN_PATH${NC}"
echo -e "  输出文件: ${GREEN}$OUTPUT_FILE${NC}"
echo ""

# 执行同步
DEST_FILE="$OBSIDIAN_PATH/$OUTPUT_FILE"

echo -e "${BLUE}🔄 开始同步...${NC}"

# 备份现有文件（如果存在）
if [ -f "$DEST_FILE" ]; then
    BACKUP_FILE="$DEST_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$DEST_FILE" "$BACKUP_FILE"
    echo -e "${YELLOW}  已备份现有文件到: $(basename "$BACKUP_FILE")${NC}"
fi

# 复制文件
cp "$SOURCE_FILE" "$DEST_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 同步成功!${NC}"
    echo ""
    echo -e "${GREEN}📊 文件统计:${NC}"

    # 统计信息
    LINES=$(wc -l < "$DEST_FILE")
    SIZE=$(ls -lh "$DEST_FILE" | awk '{print $5}')
    MODIFIED=$(date -r "$DEST_FILE" "+%Y-%m-%d %H:%M:%S")

    echo -e "  行数: ${YELLOW}$LINES${NC}"
    echo -e "  大小: ${YELLOW}$SIZE${NC}"
    echo -e "  更新时间: ${YELLOW}$MODIFIED${NC}"
    echo ""
    echo -e "${GREEN}✓ 文件已同步到 Obsidian vault${NC}"
    echo -e "${BLUE}  您现在可以在 Obsidian 中查看: $OUTPUT_FILE${NC}"
    echo ""
else
    echo -e "${RED}✗ 同步失败${NC}"
    exit 1
fi

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ 完成!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
