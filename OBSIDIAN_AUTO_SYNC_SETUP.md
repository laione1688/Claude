# Claude Skills 自动同步到 Obsidian - 配置说明

> 一次配置，永久自动同步 Claude Skills 列表到 Obsidian

## 📋 功能说明

此自动化方案会：
- ✅ 每小时自动从 Git 拉取最新的 Skills 列表
- ✅ 自动同步到您的 Obsidian vault
- ✅ 系统启动时也会自动执行一次
- ✅ 记录详细的同步日志
- ✅ 完全后台运行，无需手动操作

## 🚀 安装步骤

### 步骤 1: 拉取最新代码

在 Mac 终端执行：

```bash
cd /Users/laichaochang/Documents/Claude
git pull origin claude/add-x-article-publisher-plugin-1SrX0
```

### 步骤 2: 设置脚本权限

```bash
chmod +x /Users/laichaochang/Documents/Claude/auto_sync_skills.sh
chmod +x /Users/laichaochang/Documents/Claude/sync_skills_to_obsidian.sh
```

### 步骤 3: 安装 launchd 配置文件

```bash
# 复制配置文件到 LaunchAgents 目录
cp /Users/laichaochang/Documents/Claude/com.claude.skills.sync.plist \
   ~/Library/LaunchAgents/

# 设置正确的权限
chmod 644 ~/Library/LaunchAgents/com.claude.skills.sync.plist
```

### 步骤 4: 启动自动同步服务

```bash
# 加载服务
launchctl load ~/Library/LaunchAgents/com.claude.skills.sync.plist

# 立即执行一次测试
launchctl start com.claude.skills.sync
```

### 步骤 5: 验证是否成功

```bash
# 检查服务状态
launchctl list | grep com.claude.skills.sync

# 查看同步日志
tail -f /tmp/claude-skills-sync.log

# 查看系统日志（如果需要调试）
tail -f /tmp/claude-skills-launchd.log
tail -f /tmp/claude-skills-launchd.error.log
```

## 📊 配置参数

### 同步频率

默认每小时同步一次。如需修改，编辑 `com.claude.skills.sync.plist`：

```xml
<!-- 修改这个值（单位：秒） -->
<key>StartInterval</key>
<integer>3600</integer>  <!-- 3600秒 = 1小时 -->
```

常用设置：
- 30 分钟: `1800`
- 1 小时: `3600`（默认）
- 2 小时: `7200`
- 6 小时: `21600`

修改后重新加载：

```bash
launchctl unload ~/Library/LaunchAgents/com.claude.skills.sync.plist
launchctl load ~/Library/LaunchAgents/com.claude.skills.sync.plist
```

### 路径配置

如果您的路径不同，编辑 `auto_sync_skills.sh` 中的配置：

```bash
REPO_DIR="/Users/laichaochang/Documents/Claude"
OBSIDIAN_VAULT="/Users/laichaochang/obsidian/SKILL資料"
```

## 📝 日志文件

| 日志文件 | 说明 |
|---------|------|
| `/tmp/claude-skills-sync.log` | 主同步日志（详细的同步信息） |
| `/tmp/claude-skills-launchd.log` | launchd 标准输出 |
| `/tmp/claude-skills-launchd.error.log` | launchd 错误输出 |

查看日志：

```bash
# 查看主同步日志
cat /tmp/claude-skills-sync.log

# 实时监控
tail -f /tmp/claude-skills-sync.log

# 查看最近 20 条记录
tail -n 20 /tmp/claude-skills-sync.log
```

## 🔧 管理命令

### 启动服务

```bash
launchctl load ~/Library/LaunchAgents/com.claude.skills.sync.plist
```

### 停止服务

```bash
launchctl unload ~/Library/LaunchAgents/com.claude.skills.sync.plist
```

### 立即执行一次

```bash
launchctl start com.claude.skills.sync
```

### 查看服务状态

```bash
launchctl list | grep com.claude.skills.sync
```

### 重启服务

```bash
launchctl unload ~/Library/LaunchAgents/com.claude.skills.sync.plist
launchctl load ~/Library/LaunchAgents/com.claude.skills.sync.plist
```

### 完全卸载

```bash
# 停止并移除服务
launchctl unload ~/Library/LaunchAgents/com.claude.skills.sync.plist
rm ~/Library/LaunchAgents/com.claude.skills.sync.plist

# 清理日志（可选）
rm /tmp/claude-skills-sync.log
rm /tmp/claude-skills-launchd.log
rm /tmp/claude-skills-launchd.error.log
```

## ✅ 验证同步成功

1. **检查 Obsidian**
   - 打开 Obsidian
   - 进入 `SKILL資料` 目录
   - 查看 `Claude-Skills-Installed.md` 文件

2. **检查日志**
   ```bash
   tail /tmp/claude-skills-sync.log
   ```

   应该看到类似输出：
   ```
   [2026-01-24 10:00:00] ========== 开始自动同步 ==========
   [2026-01-24 10:00:01] 正在从 Git 拉取最新更新...
   [2026-01-24 10:00:02] Git: 已是最新版本，无需更新
   [2026-01-24 10:00:02] 正在同步到 Obsidian...
   [2026-01-24 10:00:03] ✓ 同步成功
   [2026-01-24 10:00:03] 文件统计: 382 行, 28K
   [2026-01-24 10:00:03] ========== 同步完成 ==========
   ```

## 🐛 故障排除

### 问题 1: 服务未运行

**症状**: `launchctl list | grep com.claude.skills.sync` 没有输出

**解决**:
```bash
# 检查 plist 文件是否存在
ls -la ~/Library/LaunchAgents/com.claude.skills.sync.plist

# 重新加载
launchctl load ~/Library/LaunchAgents/com.claude.skills.sync.plist
```

### 问题 2: 权限错误

**症状**: 日志显示 "Permission denied"

**解决**:
```bash
chmod +x /Users/laichaochang/Documents/Claude/auto_sync_skills.sh
chmod +x /Users/laichaochang/Documents/Claude/sync_skills_to_obsidian.sh
```

### 问题 3: Git 拉取失败

**症状**: 日志显示 "Git 拉取失败"

**解决**:
```bash
# 手动测试 Git
cd /Users/laichaochang/Documents/Claude
git pull origin claude/add-x-article-publisher-plugin-1SrX0

# 检查 Git 配置
git config --list
```

### 问题 4: Obsidian 路径错误

**症状**: 日志显示 "Obsidian vault 不存在"

**解决**:
编辑 `auto_sync_skills.sh`，修正 `OBSIDIAN_VAULT` 路径

### 问题 5: 查看详细错误

```bash
# 查看 launchd 错误日志
cat /tmp/claude-skills-launchd.error.log

# 手动运行脚本测试
/Users/laichaochang/Documents/Claude/auto_sync_skills.sh
```

## 🎯 工作原理

```
┌─────────────────────────────────────────────────────────┐
│                     每小时自动执行                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  1. Git 拉取最新更新                                      │
│     git pull origin claude/add-x-article-publisher-...   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  2. 检查是否有更新                                        │
│     - 有更新: 记录更新详情                                │
│     - 无更新: 记录"已是最新"                              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  3. 执行同步脚本                                          │
│     sync_skills_to_obsidian.sh                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  4. 复制文件到 Obsidian vault                             │
│     - 自动备份旧文件                                      │
│     - 复制新文件                                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  5. 记录同步结果                                          │
│     - 文件大小、行数                                      │
│     - 成功/失败状态                                       │
│     - 写入日志文件                                        │
└─────────────────────────────────────────────────────────┘
```

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `auto_sync_skills.sh` | 自动同步主脚本 |
| `sync_skills_to_obsidian.sh` | Obsidian 同步脚本 |
| `com.claude.skills.sync.plist` | launchd 配置文件 |
| `Claude-Skills-Installed.md` | Skills 列表源文件 |

## 💡 提示

- 首次设置后，建议手动运行一次测试
- 定期检查日志确保同步正常
- 日志文件会自动清理，只保留最近 1000 行
- 如果长时间不使用，可以停止服务节省资源

## 🔄 更新工作流

当 Claude Code 更新 Skills 列表时：

1. Claude 更新 `Claude-Skills-Installed.md`
2. Claude 提交到 Git 仓库
3. **自动任务每小时检测一次**
4. 发现更新后自动拉取
5. 自动同步到 Obsidian
6. 您在 Obsidian 中看到最新列表

**完全无需手动操作！** 🎉

---

**配置完成后，享受自动化的便利吧！**

如有问题，查看日志文件或参考故障排除部分。
