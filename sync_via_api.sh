#!/bin/bash

# Claude Skills → Obsidian API 同步脚本
# 使用 Obsidian Local REST API 直接写入文件

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
OBSIDIAN_API_URL="http://127.0.0.1:27123"
OBSIDIAN_API_KEY="6dc6ae6497aa285257c303998d328c2ce59f3b527def4ead2d79dff289e0d2da"
SOURCE_FILE="Claude-Skills-Installed.md"
VAULT_PATH="SKILL資料"
TARGET_FILE="Claude-Skills-Installed.md"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   Claude Skills → Obsidian (via API)${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 检查源文件是否存在
if [ ! -f "$SOURCE_FILE" ]; then
    echo -e "${RED}✗ 错误: 找不到源文件 $SOURCE_FILE${NC}"
    exit 1
fi

# 读取文件内容
CONTENT=$(cat "$SOURCE_FILE")
FILE_SIZE=$(wc -c < "$SOURCE_FILE")
FILE_LINES=$(wc -l < "$SOURCE_FILE")

echo -e "${BLUE}📋 文件信息:${NC}"
echo -e "  源文件: ${GREEN}$SOURCE_FILE${NC}"
echo -e "  大小: ${YELLOW}$FILE_SIZE bytes${NC}"
echo -e "  行数: ${YELLOW}$FILE_LINES lines${NC}"
echo -e "  目标: ${GREEN}$VAULT_PATH/$TARGET_FILE${NC}"
echo ""

# 测试 API 连接
echo -e "${BLUE}🔌 测试 API 连接...${NC}"
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "$OBSIDIAN_API_URL/" 2>&1)

if [ "$API_TEST" != "200" ]; then
    echo -e "${RED}✗ API 连接失败 (HTTP $API_TEST)${NC}"
    echo -e "${YELLOW}提示: 请确保 Obsidian Local REST API 插件已启动${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API 连接成功${NC}"
echo ""

# 构建完整的文件路径（URL 编码）
ENCODED_PATH=$(echo "$VAULT_PATH/$TARGET_FILE" | sed 's/ /%20/g')

# 写入文件到 Obsidian
echo -e "${BLUE}🔄 正在同步到 Obsidian...${NC}"

HTTP_CODE=$(curl -s -o /tmp/obsidian_api_response.txt -w "%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  --data-binary @"$SOURCE_FILE" \
  "$OBSIDIAN_API_URL/vault/$ENCODED_PATH")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "204" ]; then
    echo -e "${GREEN}✓ 同步成功!${NC}"
    echo ""
    echo -e "${GREEN}📊 同步完成:${NC}"
    echo -e "  文件路径: ${YELLOW}$VAULT_PATH/$TARGET_FILE${NC}"
    echo -e "  文件大小: ${YELLOW}$FILE_SIZE bytes${NC}"
    echo -e "  文件行数: ${YELLOW}$FILE_LINES lines${NC}"
    echo ""
    echo -e "${GREEN}✓ 您现在可以在 Obsidian 中查看文件了!${NC}"
else
    echo -e "${RED}✗ 同步失败 (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}响应内容:${NC}"
    cat /tmp/obsidian_api_response.txt
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ 完成!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
