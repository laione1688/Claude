#!/usr/bin/env python3
"""
Rebuild skill-index.json with full 305 skill coverage + tier classification.
"""
import json, os, re, glob
from datetime import datetime

SKILLS_DIR = os.path.expanduser("~/.claude/skills")
TIERS_FILE = os.path.expanduser("~/.claude/skill-tiers.json")
OUTPUT_FILE = os.path.expanduser("~/.claude/skill-index.json")

def parse_frontmatter(path):
    """Extract YAML frontmatter from SKILL.md"""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except:
        return {}

    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return {}

    fm = {}
    for line in match.group(1).split("\n"):
        if ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if val.lower() == "true":
                val = True
            elif val.lower() == "false":
                val = False
            fm[key] = val
    return fm

def extract_triggers(fm, desc):
    """Generate trigger keywords from frontmatter description"""
    triggers = []
    name = fm.get("name", "")
    if name:
        triggers.append(name.lower())
        # Add parts for hyphenated names
        if "-" in name:
            triggers.extend(name.lower().split("-"))

    # Extract key phrases from description
    if desc:
        # Common trigger words
        for word in ["audit", "generate", "create", "analyze", "search", "fetch",
                     "convert", "publish", "post", "translate", "design", "review",
                     "brainstorm", "plan", "build", "test", "debug", "research"]:
            if word in desc.lower():
                triggers.append(word)
    return list(set(triggers))[:8]

def main():
    # Load tier classification
    with open(TIERS_FILE, "r") as f:
        tiers = json.load(f)

    # Build tier lookup
    tier_map = {}
    for tier_name, skills in tiers.items():
        for s in skills:
            tier_map[s["name"]] = tier_name.replace("tier_", "")

    # Scan all skills
    skills = {}
    skill_dirs = sorted(glob.glob(os.path.join(SKILLS_DIR, "*/SKILL.md")))

    for skill_path in skill_dirs:
        dir_name = os.path.basename(os.path.dirname(skill_path))
        fm = parse_frontmatter(skill_path)

        name = fm.get("name", dir_name)
        desc = fm.get("description", "")
        version = fm.get("version", "")
        invocable = fm.get("user_invocable", False)

        tier_num = tier_map.get(name, "3")  # default to cold
        tier_label = {"0": "always", "1": "hot", "2": "warm", "3": "cold"}[tier_num]

        triggers = extract_triggers(fm, desc)

        key = dir_name.lower().replace("-", "_").replace(" ", "_")
        skills[key] = {
            "name": name,
            "dir": dir_name,
            "path": f"{dir_name}/SKILL.md",
            "description": desc[:120] if desc else "",
            "version": version,
            "user_invocable": invocable,
            "triggers": triggers,
            "tier": tier_label,
        }

    # Count by tier
    tier_counts = {}
    for s in skills.values():
        t = s["tier"]
        tier_counts[t] = tier_counts.get(t, 0) + 1

    index = {
        "generated": datetime.now().isoformat(),
        "version": "3.0.0",
        "totalSkills": len(skills),
        "tierCounts": tier_counts,
        "skills": skills,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    print(f"Rebuilt skill-index.json: {len(skills)} skills")
    for tier, count in sorted(tier_counts.items()):
        print(f"  {tier}: {count}")

if __name__ == "__main__":
    main()
