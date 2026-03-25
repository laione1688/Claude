# AI 资讯日报 → Obsidian 转换工具

这是一个将 AI 资讯日报数据转换为 Obsidian Markdown 格式的工具。

## 📁 文件说明

- `sample_data.json` - JSON 数据格式示例
- `template.md` - Markdown 模板参考
- `convert_to_obsidian.py` - Python 转换脚本
- `README.md` - 使用说明文档

## 🚀 快速开始

### 1. 准备 JSON 数据

创建一个 JSON 文件，格式如下：

```json
{
  "date": "2026-01-23",
  "news": [
    {
      "title": "新闻标题",
      "url": "https://example.com/news",
      "summary": "新闻摘要内容",
      "category": "分类名称",
      "tags": ["标签1", "标签2"],
      "source": "来源名称"
    }
  ]
}
```

### 2. 运行转换脚本

#### 方式一：追加到单文件（推荐）

```bash
python3 convert_to_obsidian.py sample_data.json
```

这会将内容追加到 `AI_Daily_News.md` 文件中。

#### 方式二：创建每日独立文件

```bash
python3 convert_to_obsidian.py sample_data.json -m daily
```

这会创建 `AI_Daily_2026-01-23.md` 格式的独立文件。

#### 方式三：指定输出目录和文件名

```bash
# 输出到 Obsidian 仓库目录
python3 convert_to_obsidian.py sample_data.json \
  -o "AI资讯汇总.md" \
  -d "/Users/你的用户名/Documents/Obsidian/你的仓库/AI资讯"
```

## 📋 命令行参数

```
python3 convert_to_obsidian.py <json_file> [选项]

必需参数:
  json_file              输入的 JSON 文件路径

可选参数:
  -o, --output          输出文件名（默认: AI_Daily_News.md）
  -d, --dir             输出目录（默认: 当前目录）
  -m, --mode            输出模式: append 或 daily（默认: append）
                        - append: 追加到单个文件
                        - daily: 每日创建独立文件
```

## 🔧 高级用法

### 在 Python 代码中使用

```python
from convert_to_obsidian import ObsidianConverter

# 创建转换器
converter = ObsidianConverter(
    output_file="AI_News.md",
    output_dir="/path/to/obsidian/vault"
)

# 转换 JSON 文件
converter.convert("your_data.json", mode="append")
```

### 批量转换多个 JSON 文件

```bash
# 转换当前目录下所有 JSON 文件
for file in *.json; do
    python3 convert_to_obsidian.py "$file" -m daily
done
```

## 📊 生成的 Markdown 格式

转换后的 Markdown 文件包含：

- 📅 日期标题
- 🔥 新闻列表（包含标题、分类、来源、链接、标签、摘要）
- 📊 统计信息（资讯数量、主要类别）
- Obsidian 标签支持（使用 `#标签` 格式）
- 内部链接支持

## 💡 Obsidian 使用技巧

### 1. 设置自动标签

在 Obsidian 中，`#分类` 和 `#标签` 会自动成为可点击的标签，方便分类检索。

### 2. 使用 Dataview 插件

安装 Dataview 插件后，可以创建动态查询：

```dataview
TABLE file.ctime as "日期", length(rows) as "资讯数量"
FROM "AI资讯"
GROUP BY file.folder
```

### 3. 使用日记功能

如果你使用 Obsidian 的日记功能，可以将输出目录设置为日记文件夹：

```bash
python3 convert_to_obsidian.py data.json \
  -d "/path/to/obsidian/vault/Daily Notes" \
  -m daily
```

### 4. 创建 MOC（Map of Content）

在 Obsidian 中创建一个 `AI资讯索引.md` 文件，使用以下格式：

```markdown
# AI 资讯索引

## 按时间浏览
- [[AI_Daily_2026-01-23]]
- [[AI_Daily_2026-01-22]]

## 按类别浏览
- #模型发布
- #技术更新
- #行业动态
```

## 🔄 自动化工作流

### 使用 Cron 定时任务

```bash
# 编辑 crontab
crontab -e

# 每天晚上 9 点自动转换
0 21 * * * cd /path/to/project && python3 convert_to_obsidian.py daily_data.json
```

### 使用 GitHub Actions

如果你的数据存储在 GitHub，可以设置 Actions 自动转换并提交到 Obsidian 仓库。

## 🛠️ 自定义数据源

### 从 API 获取数据

```python
import requests
import json

# 从 API 获取数据
response = requests.get('https://api.example.com/ai-news')
data = response.json()

# 保存为 JSON
with open('daily_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 转换为 Markdown
from convert_to_obsidian import ObsidianConverter
converter = ObsidianConverter()
converter.convert('daily_data.json')
```

### 从 RSS 抓取

```python
import feedparser
import json
from datetime import datetime

# 解析 RSS feed
feed = feedparser.parse('https://example.com/ai-news/rss')

# 转换为 JSON 格式
news_data = {
    "date": datetime.now().strftime('%Y-%m-%d'),
    "news": []
}

for entry in feed.entries:
    news_data["news"].append({
        "title": entry.title,
        "url": entry.link,
        "summary": entry.summary,
        "category": "RSS资讯",
        "tags": [tag.term for tag in entry.get('tags', [])],
        "source": feed.feed.title
    })

# 保存并转换
with open('rss_data.json', 'w', encoding='utf-8') as f:
    json.dump(news_data, f, ensure_ascii=False, indent=2)
```

## ❓ 常见问题

### Q: 如何修改 Markdown 格式？

A: 编辑 `convert_to_obsidian.py` 文件中的 `format_news_item()` 方法。

### Q: 支持其他数据格式吗？

A: 当前支持 JSON 格式。如需支持 CSV、XML 等格式，可以先转换为 JSON，或修改脚本添加相应解析器。

### Q: 如何在 Obsidian 中搜索特定标签？

A: 在 Obsidian 搜索框中输入 `tag:#标签名` 即可搜索包含该标签的所有笔记。

### Q: 追加模式会重复内容吗？

A: 脚本不会自动去重，建议每次使用新的 JSON 数据文件，或自行管理数据去重。

## 📝 示例输出

运行示例：

```bash
python3 convert_to_obsidian.py sample_data.json
```

输出：
```
✅ 创建新文件: /Users/laichaochang/Documents/Claude/AI Daily Skill/AI_Daily_News.md
```

生成的 Markdown 文件将包含格式良好的 AI 资讯内容，可直接在 Obsidian 中查看和编辑。

## 📄 许可

此工具免费使用，欢迎修改和分享。

## 🤝 贡献

如有问题或建议，欢迎反馈！
