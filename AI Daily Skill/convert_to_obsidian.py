#!/usr/bin/env python3
"""
AI 资讯日报转换为 Obsidian Markdown 格式
支持单文件追加和多文件模式
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path


class ObsidianConverter:
    def __init__(self, output_file: str = "AI_Daily_News.md", output_dir: str = None, use_date_filename: bool = True):
        """
        初始化转换器

        Args:
            output_file: 输出的 Markdown 文件名（单文件模式，当 use_date_filename=False 时使用）
            output_dir: 输出目录（可选，如果不指定则使用当前目录）
            use_date_filename: 是否使用日期作为文件名（默认 True）
        """
        self.output_file = output_file
        self.output_dir = Path(output_dir) if output_dir else Path.cwd()
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.use_date_filename = use_date_filename

    def load_json_data(self, json_file: str) -> Dict[str, Any]:
        """加载 JSON 数据文件"""
        with open(json_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def format_news_item(self, news: Dict[str, Any]) -> str:
        """格式化单条新闻为 Markdown"""
        title = news.get('title', '无标题')
        url = news.get('url', '#')
        summary = news.get('summary', '')
        category = news.get('category', '未分类')
        tags = news.get('tags', [])
        source = news.get('source', '未知来源')

        # 格式化标签
        tags_str = ' '.join([f'#{tag}' for tag in tags])

        markdown = f"""#### {title}

- **分类**: #{category}
- **来源**: {source}
- **链接**: [查看原文]({url})
- **标签**: {tags_str}

> {summary}

---

"""
        return markdown

    def generate_daily_report(self, data: Dict[str, Any]) -> str:
        """生成完整的日报 Markdown"""
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        news_list = data.get('news', [])

        # 统计信息
        news_count = len(news_list)
        categories = list(set([item.get('category', '未分类') for item in news_list]))
        categories_str = ', '.join([f'#{cat}' for cat in categories])

        # 生成标题和日期
        markdown = f"""# AI 资讯日报

---

## 📅 {date}

### 🔥 今日要闻

"""

        # 添加所有新闻
        for news in news_list:
            markdown += self.format_news_item(news)

        # 添加统计信息
        markdown += f"""### 📊 统计

- 本日资讯数量: {news_count}
- 主要类别: {categories_str}

---

> 💡 本日报由自动化脚本生成，数据来源于多个 AI 资讯渠道

"""
        return markdown

    def get_date_filename(self, date: str) -> str:
        """根据日期生成文件名"""
        return f"{date}_AI日报.md"

    def append_to_file(self, content: str, date: str, separator: str = "\n\n---\n\n"):
        """追加内容到文件（单文件模式）"""
        # 使用日期作为文件名
        if self.use_date_filename:
            filename = self.get_date_filename(date)
        else:
            filename = self.output_file

        output_path = self.output_dir / filename

        # 检查是否需要从旧文件迁移内容
        if self.use_date_filename:
            # 查找可能存在的旧文件（不同日期的文件）
            old_files = list(self.output_dir.glob("*_AI日报.md"))
            if old_files and not output_path.exists():
                # 如果存在旧文件但当前日期文件不存在，则重命名旧文件
                if len(old_files) == 1:
                    old_file = old_files[0]
                    # 读取旧文件内容
                    with open(old_file, 'r', encoding='utf-8') as f:
                        old_content = f.read()
                    # 写入新文件
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(old_content)
                        f.write(separator)
                        f.write(content)
                    # 删除旧文件
                    old_file.unlink()
                    print(f"✅ 重命名并追加: {old_file.name} → {filename}")
                    return

        # 如果文件不存在，创建新文件
        if not output_path.exists():
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 创建新文件: {output_path}")
        else:
            # 追加到现有文件
            with open(output_path, 'a', encoding='utf-8') as f:
                f.write(separator)
                f.write(content)
            print(f"✅ 追加内容到: {output_path}")

    def save_daily_file(self, content: str, date: str):
        """保存为独立的日期文件（多文件模式）"""
        if self.use_date_filename:
            filename = self.get_date_filename(date)
        else:
            filename = f"AI_Daily_{date}.md"
        output_path = self.output_dir / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ 创建日期文件: {output_path}")

    def convert(self, json_file: str, mode: str = "append"):
        """
        转换 JSON 数据为 Obsidian Markdown

        Args:
            json_file: 输入的 JSON 文件路径
            mode: 'append' (追加到单文件) 或 'daily' (每日独立文件)
        """
        # 加载数据
        data = self.load_json_data(json_file)

        # 生成 Markdown
        markdown_content = self.generate_daily_report(data)

        # 获取日期
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))

        # 根据模式保存
        if mode == "append":
            self.append_to_file(markdown_content, date)
        elif mode == "daily":
            self.save_daily_file(markdown_content, date)
        else:
            raise ValueError(f"未知的模式: {mode}，请使用 'append' 或 'daily'")


def main():
    """主函数 - 命令行使用示例"""
    import argparse

    parser = argparse.ArgumentParser(description='将 AI 资讯日报 JSON 转换为 Obsidian Markdown')
    parser.add_argument('json_file', help='输入的 JSON 文件路径')
    parser.add_argument('-o', '--output', default='AI_Daily_News.md',
                        help='输出文件名（默认: AI_Daily_News.md）')
    parser.add_argument('-d', '--dir', default=None,
                        help='输出目录（默认: 当前目录）')
    parser.add_argument('-m', '--mode', choices=['append', 'daily'], default='append',
                        help='输出模式: append(追加到单文件) 或 daily(每日独立文件)')

    args = parser.parse_args()

    # 创建转换器并执行转换
    converter = ObsidianConverter(output_file=args.output, output_dir=args.dir)
    converter.convert(args.json_file, mode=args.mode)


if __name__ == '__main__':
    main()
