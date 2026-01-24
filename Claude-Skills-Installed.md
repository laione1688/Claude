# Claude Code Skills - 已安装列表

> 完整的 Claude Code 技能安装清单，包含名称、功能说明及原始来源

**更新日期**: 2026-01-24
**总计**: 37 个技能 + 9 个智能体 + 15 个命令 + 8 个规则

---

## 目录

- [Skills (技能)](#skills-技能)
  - [NotebookLM Integration](#notebooklm-integration)
  - [AI Daily News](#ai-daily-news)
  - [Baoyu Skills Collection](#baoyu-skills-collection)
  - [Obsidian Integration](#obsidian-integration)
  - [X (Twitter) Automation](#x-twitter-automation)
  - [Remotion Video Creation](#remotion-video-creation)
  - [Everything Claude Code Collection](#everything-claude-code-collection)
  - [Humanizer](#humanizer)
- [Agents (智能体)](#agents-智能体)
- [Commands (命令)](#commands-命令)
- [Rules (规则)](#rules-规则)
- [Tools (工具)](#tools-工具)

---

## Skills (技能)

### NotebookLM Integration

#### notebooklm
- **功能**: Google NotebookLM 完整 API 访问 - 创建笔记本、添加来源（URL、YouTube、PDF、音频、视频、图像）、聊天、生成所有类型的内容（播客、视频、测验、思维导图等）、多格式下载
- **触发方式**: `/notebooklm` 或 "create a podcast about X"、"generate a quiz"
- **原始网址**: https://github.com/teng-lin/notebooklm-py
- **安装方式**: `pip install notebooklm-py` + `notebooklm skill install`

---

### AI Daily News

#### ai-daily
- **功能**: 从 smol.ai RSS 获取 AI 新闻，智能摘要和分类，生成结构化 Markdown，可选生成 Apple 风格网页和分享卡片图片
- **触发方式**: "昨天AI资讯"、"2026-01-13的AI新闻"、"生成日报卡片图片"
- **原始网址**: https://github.com/geekjourneyx/ai-daily-skill
- **安装方式**: 手动克隆并复制到 `~/.claude/skills/ai-daily/`
- **依赖**: python3-feedparser

---

### Baoyu Skills Collection

来自 JimLiu 的综合技能包，共 14 个技能

#### baoyu-xhs-images
- **功能**: 生成小红书（Little Red Book）信息图系列，支持 9 种视觉风格和 6 种布局，将内容分解为 1-10 张卡通风格图片
- **触发方式**: "小红书图片"、"XHS images"、"小红书种草"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-infographic
- **功能**: 生成专业信息图，支持 20 种布局类型和 17 种视觉风格，自动分析内容并推荐布局×风格组合
- **触发方式**: "create infographic"、"信息图"、"visual summary"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-cover-image
- **功能**: 为文章生成优雅的封面图片，分析内容并创建吸引眼球的手绘风格封面，支持多种风格选项
- **触发方式**: "generate cover image"、"create article cover"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-article-illustrator
- **功能**: 智能文章插图工具，分析文章内容并在需要视觉辅助的位置生成插图，支持多种风格选项
- **触发方式**: "add illustrations to article"、"generate images for article"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-comic
- **功能**: 知识漫画创建器，支持多种风格（Logicomix/Ligne Claire、Ohmsha 漫画指南），创建原创教育漫画
- **触发方式**: "知识漫画"、"教育漫画"、"biography comic"、"Logicomix-style comic"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-slide-deck
- **功能**: 从内容生成专业幻灯片图片，创建包含风格说明的综合大纲，然后生成单个幻灯片图像
- **触发方式**: "create slides"、"make a presentation"、"generate deck"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-image-gen
- **功能**: 基于 AI SDK 的图像生成，使用官方 OpenAI 和 Google API，支持文本到图像、参考图像、宽高比和质量预设
- **触发方式**: 作为其他技能的图像生成后端
- **原始网址**: https://github.com/JimLiu/baoyu-skills
- **配置**: 需要在 `~/.baoyu-skills/.env` 配置 GOOGLE_API_KEY 和 OPENAI_API_KEY

#### baoyu-danger-gemini-web
- **功能**: 使用 Gemini Web 生成图像，通过 Google Gemini 从文本提示生成图像，也支持文本生成
- **触发方式**: 作为 cover-image、xhs-images、article-illustrator 等技能的图像生成后端
- **原始网址**: https://github.com/JimLiu/baoyu-skills
- **注意**: 使用逆向工程的 API（私有），需要用户同意后使用

#### baoyu-compress-image
- **功能**: 跨平台图像压缩工具，默认转换为 WebP，支持 PNG 到 PNG，使用系统工具（sips、cwebp、ImageMagick）及 Sharp 备用
- **触发方式**: 图像压缩需求
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-post-to-wechat
- **功能**: 发布内容到微信公众号，支持文章发布和图文发布
- **触发方式**: "发布到微信公众号"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-post-to-x
- **功能**: 发布内容和文章到 X（Twitter），支持常规帖子（带图片/视频）和 X Articles（长文 Markdown），使用真实 Chrome 浏览器和 CDP 绕过反自动化检测
- **触发方式**: "发布到 X"、"post to Twitter"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-url-to-markdown
- **功能**: 使用 Chrome CDP 获取任何 URL 并转换为 Markdown，支持两种模式 - 页面加载时自动捕获，或等待用户信号（用于需要登录的页面）
- **触发方式**: "save webpage as markdown"
- **原始网址**: https://github.com/JimLiu/baoyu-skills

#### baoyu-danger-x-to-markdown
- **功能**: 将 X（Twitter）推文或文章 URL 转换为 Markdown，使用逆向工程的 X API（私有）
- **触发方式**: 提供 X/Twitter URL
- **原始网址**: https://github.com/JimLiu/baoyu-skills
- **注意**: 需要用户同意后使用

---

### Obsidian Integration

来自 kepano 的 Obsidian 技能包，共 3 个技能

#### obsidian-markdown
- **功能**: 创建和编辑 Obsidian Flavored Markdown，支持 wikilinks、embeds、callouts、properties 等 Obsidian 特定语法
- **触发方式**: 在 Obsidian 中处理 .md 文件，或提到 wikilinks、callouts、frontmatter、tags、embeds
- **原始网址**: https://github.com/kepano/obsidian-skills

#### obsidian-bases
- **功能**: 创建和编辑 Obsidian Bases（.base 文件），支持视图、过滤器、公式和摘要
- **触发方式**: 处理 .base 文件，创建数据库式笔记视图，或提到 Bases、table views、card views、filters、formulas
- **原始网址**: https://github.com/kepano/obsidian-skills

#### json-canvas
- **功能**: 创建和编辑 JSON Canvas 文件（.canvas），支持节点、边、组和连接
- **触发方式**: 处理 .canvas 文件，创建可视化画布、思维导图、流程图，或提到 Canvas files in Obsidian
- **原始网址**: https://github.com/kepano/obsidian-skills

---

### X (Twitter) Automation

来自 kangarooking 的 X 内容创作自动化套件，共 4 个技能

#### x-collect
- **功能**: 使用多轮网络搜索策略收集和研究 X（Twitter）内容创作材料，执行 4 轮深度研究模拟人类研究工作流
- **触发方式**: "collect materials"、"research topic"、"find content for X"、"x-collect"
- **原始网址**: https://github.com/kangarooking/x-skills

#### x-filter
- **功能**: 使用加权标准对 X 内容创作主题进行评分和筛选，应用 10 分评分系统，支持自定义权重
- **触发方式**: "filter topics"、"score materials"、"x-filter"、"选题筛选"
- **原始网址**: https://github.com/kangarooking/x-skills

#### x-create
- **功能**: 创建病毒式 X（Twitter）帖子，包括短推文、线程和回复，支持 5 种帖子风格和可自定义模板，首次使用需要设置个人资料
- **触发方式**: "create tweet"、"write thread"、"x-create"、"写推文"、"创作推文"
- **原始网址**: https://github.com/kangarooking/x-skills

#### x-publish
- **功能**: 使用浏览器自动化将推文和线程发布到 X（Twitter）草稿箱，支持短推文和线程，始终保存为草稿（不自动发布）
- **触发方式**: "publish to X"、"post tweet"、"x-publish"、"发布推文"
- **原始网址**: https://github.com/kangarooking/x-skills
- **依赖**: Playwright（已安装）

---

### Remotion Video Creation

#### remotion-best-practices
- **功能**: Remotion 最佳实践 - React 中的视频创建，包含 28 个规则文件，涵盖动画、视频处理、字幕、3D、图表、音频、序列、过渡等
- **触发方式**: 处理 Remotion 代码时自动使用
- **原始网址**: https://github.com/remotion-dev/skills
- **安装方式**: 手动克隆并复制到 `~/.claude/skills/remotion-best-practices/`
- **规则文件**: 28 个（animations.md, videos.md, audio.md, captions.md, 3d.md, charts.md, compositions.md, display-captions.md, extract-frames.md, fonts.md, get-audio-duration.md, get-video-dimensions.md, get-video-duration.md, gifs.md, images.md, import-srt-captions.md, lottie.md, measuring-dom-nodes.md, measuring-text.md, sequencing.md, tailwind.md, text-animations.md, timing.md, transcribe-captions.md, transitions.md, trimming.md, videos.md, can-decode.md, calculate-metadata.md, assets.md）

---

### Everything Claude Code Collection

来自 affaan-m 的综合集合，包含技能、智能体、命令和规则

#### backend-patterns
- **功能**: 后端架构模式、API 设计、数据库优化，以及 Node.js、Express 和 Next.js API 路由的服务器端最佳实践
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### clickhouse-io
- **功能**: ClickHouse 数据库模式、查询优化、分析和数据工程最佳实践，用于高性能分析工作负载
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### coding-standards
- **功能**: TypeScript、JavaScript、React 和 Node.js 开发的通用编码标准、最佳实践和模式
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### continuous-learning
- **功能**: 自动从 Claude Code 会话中提取可重用模式并保存为学习技能以供将来使用
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### frontend-patterns
- **功能**: React、Next.js 的前端开发模式、状态管理、性能优化和 UI 最佳实践
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### security-review
- **功能**: 在编写处理用户输入、身份验证、API 端点或敏感数据的代码后使用，提供全面的安全检查清单和模式
- **触发方式**: 处理身份验证、用户输入、API 端点、支付/敏感功能时主动使用
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### strategic-compact
- **功能**: 在逻辑间隔建议手动上下文压缩，通过任务阶段保留上下文，而不是任意自动压缩
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### tdd-workflow
- **功能**: 在编写新功能、修复错误或重构代码时使用，强制执行测试驱动开发，确保 80%+ 覆盖率（包括单元、集成和 E2E 测试）
- **触发方式**: 编写新功能、修复错误或重构代码时主动使用
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### verification-loop
- **功能**: 验证循环工作流
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### project-guidelines-example
- **功能**: 项目指南示例
- **原始网址**: https://github.com/affaan-m/everything-claude-code

#### eval-harness
- **功能**: 评估工具
- **原始网址**: https://github.com/affaan-m/everything-claude-code

---

### Humanizer

#### humanizer
- **功能**: 从文本中删除 AI 生成写作的痕迹，基于维基百科的全面"AI 写作迹象"指南，检测并修复 24 种 AI 写作模式
- **触发方式**: 编辑或审查文本以使其更自然和人类化时使用
- **原始网址**: https://github.com/blader/humanizer
- **模式检测**: 夸大的象征主义、宣传性语言、肤浅的 -ing 分析、模糊归因、em dash 过度使用、三的法则、AI 词汇词、负面并行、过度的连接短语等

---

### Session Start Hook

#### session-start-hook
- **功能**: 为 Claude Code on the web 创建和开发启动钩子，确保项目可以在 Web 会话期间运行测试和 linters
- **触发方式**: 用户想要为 Claude Code on the web 设置仓库时使用
- **原始网址**: 预装（来源未知）

---

## Agents (智能体)

来自 everything-claude-code，位于 `~/.claude/agents/`

| 智能体 | 功能 | 使用时机 |
|--------|------|----------|
| **planner** | 实现规划专家 | 复杂功能和重构时主动使用 |
| **architect** | 系统设计、可扩展性和技术决策 | 规划新功能、重构大型系统或架构决策时主动使用 |
| **tdd-guide** | 强制测试驱动开发（先写测试）工作流 | 编写新功能、修复错误或重构代码时主动使用 |
| **code-reviewer** | 专家代码审查 | 编写或修改代码后立即使用（强制） |
| **security-reviewer** | 安全漏洞检测和修复 | 编写处理用户输入、身份验证、API 端点或敏感数据的代码后主动使用 |
| **build-error-resolver** | 构建和 TypeScript 错误解决 | 构建失败或类型错误发生时主动使用 |
| **e2e-runner** | 使用 Playwright 的端到端测试 | 生成、维护和运行 E2E 测试时主动使用 |
| **refactor-cleaner** | 死代码清理和合并 | 删除未使用代码、重复代码和重构时主动使用 |
| **doc-updater** | 文档和 codemap 专家 | 更新 codemaps 和文档时主动使用 |

**原始网址**: https://github.com/affaan-m/everything-claude-code

---

## Commands (命令)

来自 everything-claude-code，位于 `~/.claude/commands/`，共 15 个

| 命令 | 功能 |
|------|------|
| `/build-fix` | 构建和修复 |
| `/checkpoint` | 检查点 |
| `/code-review` | 代码审查 |
| `/e2e` | 生成并运行 Playwright 端到端测试 |
| `/eval` | 评估命令 |
| `/learn` | 提取可重用模式 |
| `/orchestrate` | 编排命令 |
| `/plan` | 重申需求、评估风险、创建分步实现计划，等待用户确认后再执行代码 |
| `/refactor-clean` | 重构清理 |
| `/setup-pm` | 设置包管理器 |
| `/tdd` | 强制测试驱动开发工作流，先 scaffold 接口，生成测试，然后实现最少代码通过测试，确保 80%+ 覆盖率 |
| `/test-coverage` | 测试覆盖率 |
| `/update-codemaps` | 更新 Codemaps |
| `/update-docs` | 更新文档 |
| `/verify` | 验证命令 |

**原始网址**: https://github.com/affaan-m/everything-claude-code

---

## Rules (规则)

来自 everything-claude-code，位于 `~/.claude/rules/`，共 8 个

| 规则文件 | 内容 |
|----------|------|
| `agents.md` | 智能体编排 - 可用智能体、立即使用规则、并行任务执行、多角度分析 |
| `coding-style.md` | 编码风格 - 不可变性（关键）、文件组织、错误处理、输入验证、代码质量检查清单 |
| `git-workflow.md` | Git 工作流 - 提交消息格式、Pull Request 工作流、功能实现工作流 |
| `hooks.md` | Hooks 系统 - Hook 类型、当前 Hooks、自动接受权限、TodoWrite 最佳实践 |
| `patterns.md` | 常见模式 - API 响应格式、自定义 Hooks 模式、Repository 模式、Skeleton 项目 |
| `performance.md` | 性能优化 - 模型选择策略、上下文窗口管理、Ultrathink + Plan 模式、构建故障排除 |
| `security.md` | 安全指南 - 强制安全检查、秘密管理、安全响应协议 |
| `testing.md` | 测试要求 - 最低测试覆盖率 80%、测试驱动开发、测试失败故障排除、智能体支持 |

**原始网址**: https://github.com/affaan-m/everything-claude-code

---

## Tools (工具)

### skill-vision-control (svc)
- **功能**: 用于管理技能的 npm 包（不是传统技能），全局命令行工具，支持技能版本管理、定期检查等
- **安装方式**: `npm link` (全局安装)
- **命令**: `svc`
- **配置**: 已设置每周检查计划 (`svc schedule set -i 7`)
- **原始网址**: https://github.com/Jane-xiaoer/skill-vision-control

---

## 安装说明

### 已安装位置

- **Skills**: `~/.claude/skills/` (37 个技能)
- **Agents**: `~/.claude/agents/` (9 个智能体)
- **Commands**: `~/.claude/commands/` (15 个命令)
- **Rules**: `~/.claude/rules/` (8 个规则)

### API 配置

#### Baoyu Skills 图像生成
- **配置文件**: `~/.baoyu-skills/.env`
- **已配置**:
  - `GOOGLE_API_KEY` (Google Gemini API)
  - `OPENAI_API_KEY` (OpenAI DALL-E API)
- **依赖**: ai, @ai-sdk/google, @ai-sdk/openai
- **注意**: Google API 需要在 Google Cloud Console 启用 Generative Language API；OpenAI API 需要充值账户

#### NotebookLM
- **认证**: 运行 `notebooklm login` 进行 Google OAuth 认证
- **验证**: `notebooklm list` 检查认证状态

### 系统依赖

- **Python**: python3-feedparser (用于 ai-daily)
- **Node.js**: Playwright 1.56.1 + Chromium (用于 x-publish)

---

## 使用建议

1. **图像生成技能**: baoyu-* 系列技能需要先配置 API keys 才能使用
2. **X 自动化**: x-* 系列技能形成完整的内容创作工作流（收集→筛选→创作→发布）
3. **NotebookLM**: 功能强大的研究和内容生成工具，支持播客、视频、测验等多种输出
4. **智能体**: 在相应场景自动触发（如 code-reviewer 在写代码后、tdd-guide 在写功能时）
5. **命令**: 使用 `/` 前缀调用（如 `/plan`、`/tdd`、`/code-review`）
6. **规则**: 全局生效，指导所有开发工作

---

## 相关链接

- [Agent Skills Specification](https://agentskills.io/specification)
- [Claude Code Documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [JSON Canvas Format](https://jsoncanvas.org/)
- [Obsidian Help](https://help.obsidian.md/)

---

**维护**: 此文档记录了截至 2026-01-24 的所有已安装 Claude Code 技能、智能体、命令和规则。如有新增或更新，请及时更新此文档。
