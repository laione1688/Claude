#!/usr/bin/env python3
"""
Skill Tier Classifier — based on laione's actual usage patterns.
Reads scan.sh output and classifies into Tier 0/1/2/3.
"""
import json, sys, os

# === TIER DEFINITIONS ===

# Tier 0: Always loaded — system core
TIER_0 = {
    "PAI", "Research", "writing-style-skill", "ceo-office", "secretary",
}

# Tier 1: Hot — laione uses regularly (based on memory + conversation history)
TIER_1 = {
    # 內容發佈 pipeline
    "content-parser", "seo-audit", "web-access", "agent-fetch",
    "baoyu-url-to-markdown", "baoyu-format-markdown", "baoyu-post-to-wechat",
    "baoyu-post-to-x", "baoyu-markdown-to-html",
    "x-publish", "x-create", "x-collect", "x-tweet-fetcher",
    "xhs-create", "xhs-collect", "xhs-advisor", "xhs-wander",
    "wechat-article",
    # 明心福旺閣 specific
    "weekly-bulletin", "shuwen-convert", "mingxin-gate2",
    "recipe-generator",
    # 寫作 + 編輯
    "grammar-check", "humanizer-zh", "ljg-writes", "ljg-card", "ljg-plain",
    # OrbitOS
    "compile", "parse-knowledge", "lint",
    # 圖片 / 影音
    "image-gen", "baoyu-image-gen", "baoyu-cover-image", "baoyu-imagine",
    "baoyu-article-illustrator", "smart-illustrator", "document-illustrator",
    "podcast", "tts", "asr", "explainer",
    # 瀏覽器 / 工具
    "browse", "bb-browser", "gstack", "setup-browser-cookies", "open-gstack-browser",
    "codex",
    # 玄學系
    "bazi", "yinyuan", "qimen-dunjia", "ziwei-doushu", "create-master",
    # 資料分析
    "ga4-analytics",
    # Obsidian
    "obsidian-cli", "obsidian-markdown", "obsidian-bases", "obsidian-canvas-creator",
    # 音樂
    "qiaomu-music-player-spotify",
    # 研究
    "last30days", "ljg-learn",
    # Fabric patterns
    "Fabric",
    # Skill 管理
    "CreateSkill", "skill-vetter", "ljg-skill-map", "PAIUpgrade",
    "autoresearch", "agnix",
    # 安全
    "careful", "guard", "freeze", "unfreeze",
    # DataRouter
    "DataRouter",
}

# Tier 2: Warm — used occasionally or part of a series with a route entry
# Defined by prefix groups + individual skills
TIER_2_PREFIXES = ["ljg-", "lark-", "dbs-", "ads-"]
TIER_2_INDIVIDUAL = {
    # Route entries for series
    "ads", "dbs",
    # ljg series (non-Tier-1)
    "ljg-word", "ljg-word-flow", "ljg-paper", "ljg-paper-flow", "ljg-paper-river",
    "ljg-read", "ljg-think", "ljg-rank", "ljg-travel", "ljg-roundtable",
    "ljg-invest", "ljg-relationship", "ljg-x-download",
    # baoyu series (non-Tier-1)
    "baoyu-comic", "baoyu-infographic", "baoyu-slide-deck",
    "baoyu-xhs-images", "baoyu-compress-image", "baoyu-translate",
    "baoyu-youtube-transcript", "baoyu-danger-gemini-web", "baoyu-danger-x-to-markdown",
    "baoyu-post-to-weibo",
    # Design tools
    "design-consultation", "design-html", "design-review", "design-shotgun",
    "logo-design", "qiaomu-mondo-poster-design",
    # Content creation
    "ContentDeconstruct", "SeoKeywords", "x-filter", "x-monitor",
    "coco-book-review", "coco-historical-figure-biography",
    "lennys-podcast-newsletter", "ai-daily-digest",
    "seedance", "remotion-video", "youtube-clipper", "marknative",
    # Obsidian extras
    "json-canvas", "excalidraw-diagram", "mermaid-visualizer", "graphify",
    # Utilities
    "html-to-pdf", "markdown-to-epub-converter", "sql-queries", "dummy-dataset",
    "varlock", "checkpoint", "analyzer", "insight",
    "claude-to-im", "agent-reach", "autocli", "opencli",
    # QA / Review
    "qa", "qa-only", "review", "seo-audit-full",
    "systematic-debugging", "investigate", "pua",
    # Plan reviews
    "autoplan", "plan-ceo-review", "plan-design-review", "plan-eng-review",
    # Ship / Deploy
    "ship", "land-and-deploy", "setup-deploy", "canary",
    "document-release", "release-notes", "release-skills",
    "retro", "health", "benchmark",
    # Dev tools
    "CreateCLI", "ai-pair", "gstack-upgrade", "learn",
    "dbskill-upgrade", "gbed",
    # Chat / Debate
    "Council", "BeCreative", "Prompting", "chatroom-austrian",
    # Security (used occasionally)
    "cso", "owasp-security",
    # 社群貼文
    "LandingPageCro",
    # Business (laione might use)
    "Telos", "office-hours",
    # Agents
    "Agents",
}

# Everything else → Tier 3: Cold Archive
# (Enterprise PM, startup frameworks, security offensive tools, etc.)

def classify(skills):
    result = {"tier_0": [], "tier_1": [], "tier_2": [], "tier_3": []}

    for s in skills:
        name = s["name"]

        if name in TIER_0:
            result["tier_0"].append(s)
        elif name in TIER_1:
            result["tier_1"].append(s)
        elif name in TIER_2_INDIVIDUAL:
            result["tier_2"].append(s)
        elif any(name.startswith(p) for p in TIER_2_PREFIXES) and name not in TIER_0 and name not in TIER_1:
            result["tier_2"].append(s)
        else:
            result["tier_3"].append(s)

    return result

def main():
    with open("/tmp/all-skills-scan.json", "rb") as f:
        raw = f.read().decode("utf-8", errors="replace")
    skills = json.loads(raw)

    classified = classify(skills)

    # Save full classification
    output_path = os.path.expanduser("~/.claude/skill-tiers.json")
    with open(output_path, "w") as f:
        json.dump(classified, f, indent=2, ensure_ascii=False)

    # Print report
    print("=" * 70)
    print("SKILL TIER CLASSIFICATION REPORT")
    print("=" * 70)

    for tier_name, tier_label, desc in [
        ("tier_0", "Tier 0 — Always Loaded", "系統核心，每次 session 載入"),
        ("tier_1", "Tier 1 — Hot", "高頻使用，保留在 skills/ 目錄"),
        ("tier_2", "Tier 2 — Warm", "中頻使用，保留但可考慮按需載入"),
        ("tier_3", "Tier 3 — Cold Archive", "極少/從未使用，移到 archive"),
    ]:
        items = classified[tier_name]
        print(f"\n{'─' * 70}")
        print(f"  {tier_label} ({len(items)} skills) — {desc}")
        print(f"{'─' * 70}")
        for s in sorted(items, key=lambda x: x["name"]):
            inv = "/" if s.get("invocable") in [True, "true"] else " "
            print(f"  {inv} {s['name']:40s} {s.get('desc', '')[:50]}")

    # Summary
    total = sum(len(v) for v in classified.values())
    print(f"\n{'=' * 70}")
    print(f"SUMMARY")
    print(f"{'=' * 70}")
    print(f"  Tier 0 (Always):  {len(classified['tier_0']):3d} skills")
    print(f"  Tier 1 (Hot):     {len(classified['tier_1']):3d} skills")
    print(f"  Tier 2 (Warm):    {len(classified['tier_2']):3d} skills")
    print(f"  Tier 3 (Cold):    {len(classified['tier_3']):3d} skills")
    print(f"  ─────────────────────────")
    print(f"  Total:            {total:3d} skills")
    print(f"\n  Context 節省估算:")
    print(f"  現狀：{total} 行 skill 描述載入系統提示")
    print(f"  優化後：{len(classified['tier_0']) + len(classified['tier_1'])} 行（Tier 0+1）")
    print(f"  節省：{total - len(classified['tier_0']) - len(classified['tier_1'])} 行 ({(total - len(classified['tier_0']) - len(classified['tier_1'])) * 100 // total}%)")
    print(f"\n  Saved to: {output_path}")

if __name__ == "__main__":
    main()
