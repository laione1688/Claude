#!/bin/bash
# Sync Claude Skills documentation to Obsidian
# Usage: ./sync-to-obsidian.sh [obsidian-vault-path]

set -e

# Default Obsidian vault path
OBSIDIAN_VAULT="${1:-/Users/laichaochang/obsidian/SKILL資料}"

# Source file in this repo
SOURCE_FILE="Claude-Skills-Installed.md"

# Check if source file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "Error: Source file $SOURCE_FILE not found"
    echo "Please run this script from the repository root directory"
    exit 1
fi

# Check if Obsidian vault exists
if [ ! -d "$OBSIDIAN_VAULT" ]; then
    echo "Error: Obsidian vault not found at: $OBSIDIAN_VAULT"
    echo "Please provide the correct path as argument:"
    echo "  ./sync-to-obsidian.sh /path/to/your/obsidian/vault"
    exit 1
fi

# Copy file to Obsidian vault
echo "Copying $SOURCE_FILE to Obsidian vault..."
cp "$SOURCE_FILE" "$OBSIDIAN_VAULT/"

echo "✅ Successfully synced to Obsidian!"
echo "📁 Location: $OBSIDIAN_VAULT/$SOURCE_FILE"
echo ""
echo "The file should now be visible in your Obsidian vault."
