#!/bin/bash

# AI 资讯日报 → Obsidian 同步脚本
# 自动转换 JSON 数据到你的 Obsidian 仓库

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置（从 config.json 读取或使用默认值）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.json"
OBSIDIAN_PATH="/Users/laichaochang/obsidian/AI 資訊周報"
OUTPUT_FILE="AI_Daily_News.md"  # 当不使用日期文件名时的默认值
MODE="append"
USE_DATE_FILENAME=true  # 使用日期作为文件名（格式: YYYY-MM-DD_AI日报.md）

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   AI 资讯日报 → Obsidian 同步工具${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 显示帮助
show_help() {
    echo "使用方法:"
    echo "  ./sync_to_obsidian.sh <json文件>          # 追加到单文件"
    echo "  ./sync_to_obsidian.sh <json文件> daily    # 创建独立日期文件"
    echo ""
    echo "示例:"
    echo "  ./sync_to_obsidian.sh my_data.json"
    echo "  ./sync_to_obsidian.sh my_data.json daily"
    echo ""
    echo "Obsidian 仓库路径: $OBSIDIAN_PATH"
}

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ 错误: 请提供 JSON 文件路径${NC}"
    echo ""
    show_help
    exit 1
fi

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

JSON_FILE="$1"
MODE="${2:-append}"  # 如果没有第二个参数，默认为 append

# 检查 JSON 文件
if [ ! -f "$JSON_FILE" ]; then
    echo -e "${RED}❌ 错误: 文件不存在: $JSON_FILE${NC}"
    exit 1
fi

# 检查 Obsidian 目录
if [ ! -d "$OBSIDIAN_PATH" ]; then
    echo -e "${YELLOW}⚠️  警告: Obsidian 目录不存在，正在创建...${NC}"
    mkdir -p "$OBSIDIAN_PATH"
fi

# 检查转换脚本
PYTHON_SCRIPT="$SCRIPT_DIR/convert_to_obsidian.py"
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo -e "${RED}❌ 错误: 找不到转换脚本${NC}"
    exit 1
fi

# 提取日期（用于显示）
DATE=$(python3 -c "import json; print(json.load(open('$JSON_FILE'))['date'])" 2>/dev/null || date +%Y-%m-%d)

# 显示配置信息
echo -e "${YELLOW}📋 配置信息:${NC}"
echo "  JSON 文件: $JSON_FILE"
echo "  Obsidian 路径: $OBSIDIAN_PATH"
echo "  日期: $DATE"
echo "  文件名格式: ${DATE}_AI日报.md"
echo "  模式: $MODE"
echo ""

# 执行转换
echo -e "${BLUE}🔄 开始转换...${NC}"
python3 "$PYTHON_SCRIPT" "$JSON_FILE" \
    -o "$OUTPUT_FILE" \
    -d "$OBSIDIAN_PATH" \
    -m "$MODE"

# 检查结果
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ 转换成功！${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}📂 文件位置:${NC}"

    # 使用日期格式的文件名
    OUTPUT_PATH="$OBSIDIAN_PATH/${DATE}_AI日报.md"

    echo "  $OUTPUT_PATH"
    echo ""
    echo -e "${YELLOW}💡 提示:${NC}"
    echo "  - 现在可以在 Obsidian 中打开查看"
    echo "  - 使用标签（#分类 #标签）快速检索"
    echo "  - 支持链接和笔记关联"
    echo ""
else
    echo ""
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}❌ 转换失败${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}请检查:${NC}"
    echo "  1. JSON 文件格式是否正确"
    echo "  2. Python 环境是否正常"
    echo "  3. 文件权限是否充足"
    exit 1
fi
