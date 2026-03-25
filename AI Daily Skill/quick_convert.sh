#!/bin/bash

# AI 资讯日报快速转换脚本
# 使用方法: ./quick_convert.sh <json文件>

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 默认配置（可以根据需要修改）
OUTPUT_FILE="AI_Daily_News.md"
OUTPUT_DIR="$SCRIPT_DIR"
MODE="append"  # append 或 daily

# 显示帮助信息
show_help() {
    echo -e "${BLUE}AI 资讯日报转换工具${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./quick_convert.sh <json文件> [选项]"
    echo ""
    echo "选项:"
    echo "  -o <文件名>    输出文件名（默认: AI_Daily_News.md）"
    echo "  -d <目录>      输出目录（默认: 当前目录）"
    echo "  -m <模式>      append（追加）或 daily（独立文件）"
    echo "  -h             显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./quick_convert.sh sample_data.json"
    echo "  ./quick_convert.sh data.json -o MyNews.md -m daily"
    echo "  ./quick_convert.sh data.json -d ~/Documents/Obsidian/AI资讯"
}

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}错误: 请提供 JSON 文件路径${NC}"
    show_help
    exit 1
fi

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

JSON_FILE="$1"
shift

# 解析选项
while getopts "o:d:m:h" opt; do
    case $opt in
        o)
            OUTPUT_FILE="$OPTARG"
            ;;
        d)
            OUTPUT_DIR="$OPTARG"
            ;;
        m)
            MODE="$OPTARG"
            ;;
        h)
            show_help
            exit 0
            ;;
        \?)
            echo -e "${RED}无效选项: -$OPTARG${NC}" >&2
            show_help
            exit 1
            ;;
    esac
done

# 检查 JSON 文件是否存在
if [ ! -f "$JSON_FILE" ]; then
    echo -e "${RED}错误: 文件不存在: $JSON_FILE${NC}"
    exit 1
fi

# 检查 Python 脚本是否存在
PYTHON_SCRIPT="$SCRIPT_DIR/convert_to_obsidian.py"
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo -e "${RED}错误: 找不到转换脚本: $PYTHON_SCRIPT${NC}"
    exit 1
fi

# 执行转换
echo -e "${BLUE}开始转换...${NC}"
echo "JSON 文件: $JSON_FILE"
echo "输出文件: $OUTPUT_FILE"
echo "输出目录: $OUTPUT_DIR"
echo "模式: $MODE"
echo ""

python3 "$PYTHON_SCRIPT" "$JSON_FILE" -o "$OUTPUT_FILE" -d "$OUTPUT_DIR" -m "$MODE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 转换完成！${NC}"
else
    echo ""
    echo -e "${RED}❌ 转换失败，请检查错误信息${NC}"
    exit 1
fi
