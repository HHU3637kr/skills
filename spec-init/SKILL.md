---
name: spec-init
description: >
  当项目首次接入 Spec 驱动开发 / R&K Flow，需要创建 AGENTS.md、.agents/rules/、
  .agents/skills/、spec/ 目录、记忆系统和 Obsidian Vault 时使用。
  典型信号：用户说"初始化项目"/"搭建 Spec 环境"/"创建开发环境"，或项目根目录缺少 AGENTS.md / spec/。
  不要用于已有项目的单个 Spec 开发、功能更新或少量规范修改。
---

# Spec Init

## 核心原则

1. **幂等性**：所有操作先检查后创建，已存在则跳过，不覆盖已有内容
2. **完整性**：一次搭建完整的项目骨架，用户无需手动补充
3. **一次性**：整个项目生命周期只需执行一次，后续开发任务使用 `spec-start`

## 工作流程

### 步骤 1：检查项目状态

```bash
# 检查项目是否已初始化
ls AGENTS.md
ls spec/
ls .agents/

# 检查 Git 仓库状态
git rev-parse --is-inside-work-tree
git branch --show-current
git remote -v
```

如果 AGENTS.md 和 spec/ 都已存在，告知用户无需重复初始化，建议直接使用 `spec-start` 启动开发任务。
如果部分存在，只补充缺失部分。

Git 检查规则：
- 如果已经是 Git 仓库，记录当前分支和远程仓库；不要重新 `git init`
- 如果不是 Git 仓库，询问用户是否初始化 Git 仓库
- 用户确认后执行：

```bash
git init
git branch -M main
```

- 如果没有远程仓库，提示用户稍后添加 `origin`，但不阻塞 Spec 基础设施初始化
- 如果当前分支不是 `main`，只记录现状，不强制切换；后续 `spec-start` 会按 GitHub Flow 创建工作分支

### 步骤 2：询问项目基本信息

使用当前运行环境的确认/提问方式收集项目信息（用于生成 AGENTS.md）：

```text
请提供项目基本信息：
1. 项目名称
2. 项目简介（一句话描述）
3. 主要技术栈（如 Python/FastAPI、TypeScript/React 等）
4. 项目类型（如 Web 应用、CLI 工具、库等）
```

### 步骤 3：创建 AGENTS.md

在项目根目录创建 `AGENTS.md`，这是项目的身份文件和路由入口：

```markdown
# {项目名称}

{项目简介}

## 技术栈

- **语言**: {主要语言}
- **框架**: {主要框架}
- **类型**: {项目类型}

## 项目规范

### 开发方法论

本项目采用 **Spec 驱动式开发**，所有功能开发遵循以下流程：
1. 先设计（plan.md），后实现
2. 严格遵循 Spec，不添加额外功能
3. 每个实现都可追溯到 Spec 文档
4. 完整的开发过程记录在 Obsidian 中

### 编码规范

@import .agents/rules/

> AGENTS.md 与 .agents/rules/ 是活文档。每个 Spec 收尾时由 spec-end 审查是否需要维护项目规范。

### 文档规范

- 所有 Spec 文档使用 Obsidian Flavored Markdown
- 命名规范：`YYYYMMDD-HHMM-任务描述`（任务描述必须中文）
- 使用 `[[wikilink]]` 建立文档关联
- 每个文档包含完整的 YAML frontmatter

### 开发流程

- 新功能开发：`/spec-start` → 5 阶段流程
- 功能更新：`/spec-update`
- 问题修复：`/spec-debug`
- 经验检索：`/exp-search`
- 经验沉淀：`/exp-reflect`

### 记忆系统

- 自动层：Auto Memory（Claude 自主管理）
- 显式层：`spec/context/experience/` + `spec/context/knowledge/`
- 索引文件始终加载，详情按需检索
```

> [!important] AGENTS.md 是模板
> 根据用户提供的项目信息填充模板。如果用户有额外的项目规范需求，在此文件中补充。

### 步骤 4：创建 .agents/ 配置目录

#### 4.1 创建 rules/ 目录

```bash
mkdir -p ".agents/rules"
```

创建 `.agents/rules/coding-style.md`（编码风格模板，根据技术栈调整）：
```markdown
# 编码风格

- 变量命名：{根据语言选择 camelCase / snake_case}
- 函数/方法：简短、单一职责
- 文件长度：建议不超过 300 行
- 注释：关键逻辑必须注释，勿注释显而易见的代码
- 本文件只记录长期规则，临时实现细节不要写入
```

创建 `.agents/rules/spec-workflow.md`（Spec 工作流规范）：
```markdown
# Spec 工作流规范

- 实现前必须有已确认的 plan.md
- 不添加 Spec 未定义的功能
- 每个关键节点等待用户确认
- 收尾时使用 exp-reflect 沉淀经验，并由 spec-end 审查是否维护 AGENTS.md / rules
- rules 只记录长期项目约束，避免写入一次性任务细节
```

创建 `.agents/rules/git-workflow.md`（GitHub Flow 规范）：
```markdown
# GitHub Flow 规范

- 每个新 Spec 从 main 创建短生命周期分支
- 同一活跃 Spec 的 update 复用原 Spec 分支
- 禁止直接在 main 上实现、测试或归档 Spec
- plan.md / update-xxx.md 必须记录 git_branch、base_branch、pr_url
- 收尾时提交、推送当前分支并创建 PR
- PR 合并后同步 main 并删除本地/远程工作分支
```

> [!tip] rules/ 每文件 ≤ 20 行
> `.agents/rules/` 中的文件每次会话都会加载，保持精简，避免占用 context window。新增长期规则时优先更新已有文件，必要时再创建新的规则文件。

#### 4.2 创建 skills/ 目录并安装 Skills

```bash
mkdir -p ".agents/skills"
```

引导用户安装 Skills 体系：

```text
请选择 Skills 安装方式：
- 通过 R&K Flow CLI 安装：运行 rk-flow init 安装核心 Skills
- 手动安装：从 GitHub 仓库手动复制 Skills 到 .agents/skills/
- 跳过：稍后手动安装，先完成其他初始化
```

如果用户选择 CLI 安装：
```bash
rk-flow init
```

#### 4.3 创建项目级角色定义与运行时 Agent 适配

> [!important] 角色定义属于 spec-init
> `spec-start` 只负责加载和唤起角色实例，不再内联维护 6 个角色的 prompt 模板。6 个角色的唯一源定义见 [references/project-agent-roles.md](references/project-agent-roles.md)。

创建中立角色定义目录和运行时适配目录：

```bash
mkdir -p ".agents/roles"
mkdir -p ".claude/agents"
mkdir -p ".codex/agents"
```

按 [references/project-agent-roles.md](references/project-agent-roles.md) 创建 6 个中立角色定义：

```text
.agents/roles/spec-explorer.md
.agents/roles/spec-writer.md
.agents/roles/spec-tester.md
.agents/roles/spec-executor.md
.agents/roles/spec-debugger.md
.agents/roles/spec-ender.md
```

角色定义必须包含：
- `role_id`
- `required_skill`
- `purpose`
- `activation`
- `inputs`
- `outputs`
- `handoff`
- `rules`

同时生成项目级运行时 Agent 适配文件：

```text
.claude/agents/spec-explorer.md
.claude/agents/spec-writer.md
.claude/agents/spec-tester.md
.claude/agents/spec-executor.md
.claude/agents/spec-debugger.md
.claude/agents/spec-ender.md

.codex/agents/spec-explorer.toml
.codex/agents/spec-writer.toml
.codex/agents/spec-tester.toml
.codex/agents/spec-executor.toml
.codex/agents/spec-debugger.toml
.codex/agents/spec-ender.toml
```

如 `.codex/config.toml` 不存在，创建最小配置；如已存在，只在不覆盖用户配置的前提下合并 `[agents]` 设置：

```toml
[agents]
max_threads = 6
max_depth = 1
```

运行时适配规则：
- Claude Code 适配文件使用 Markdown + YAML frontmatter，正文要求角色先读取 `.agents/roles/<role-id>.md`
- Codex 适配文件使用 TOML，`developer_instructions` 要求角色先读取 `.agents/roles/<role-id>.md`
- 不向 `~/.claude/agents/` 或 `~/.codex/agents/` 写入任何文件，除非用户明确要求安装为个人全局 Agent
- 已存在的角色或适配文件不覆盖；如需要更新，先说明差异并等待用户确认

### 步骤 5：创建 Spec 目录结构

```bash
# 创建分类目录
mkdir -p "spec/01-产品规划"
mkdir -p "spec/02-技术设计"
mkdir -p "spec/03-能力交付"
mkdir -p "spec/04-系统改进"
mkdir -p "spec/05-验证工程"
mkdir -p "spec/06-已归档"

# 创建记忆系统目录
mkdir -p "spec/context/experience"
mkdir -p "spec/context/knowledge"
```

### 步骤 6：创建记忆索引文件

创建 `spec/context/experience/index.md`：
```markdown
---
title: 经验记忆索引
type: index
updated: {当前日期}
---

# 经验记忆索引

> 此文件由 exp-write 自动维护，记录所有经验记忆的摘要。
> 详情按需检索，避免占用过多 context window。

## 经验列表

（暂无经验记录）
```

创建 `spec/context/knowledge/index.md`：
```markdown
---
title: 知识记忆索引
type: index
updated: {当前日期}
---

# 知识记忆索引

> 此文件由 exp-write 自动维护，记录所有知识记忆的摘要。
> 详情按需检索，避免占用过多 context window。

## 知识列表

（暂无知识记录）
```

### 步骤 7：注册 Obsidian Vault

检查项目根目录是否已有 `.obsidian/` 目录：

```bash
ls .obsidian/
```

如果不存在，创建最小化的 Obsidian Vault 配置：

```bash
mkdir -p ".obsidian"
```

创建 `.obsidian/app.json`（基础配置）：
```json
{
  "alwaysUpdateLinks": true,
  "newLinkFormat": "relative",
  "useMarkdownLinks": false,
  "showFrontmatter": true
}
```

创建 `.obsidian/community-plugins.json`（推荐插件列表）：
```json
[
  "obsidian-bases"
]
```

### 步骤 8：向用户确认初始化结果

展示初始化摘要，并询问下一步：

```text
项目 Spec 开发环境已初始化完成：
- AGENTS.md（项目身份 + 规范）
- .agents/rules/（编码规范）
- .agents/skills/（Skills 体系）
- .agents/roles/（CLI 中立项目级角色定义）
- .claude/agents/ 与 .codex/agents/（项目级运行时 Agent 适配）
- spec/（Spec 目录 + 记忆系统）
- .obsidian/（Obsidian Vault）

是否需要立即启动一个开发任务？
- 启动开发任务：调用 spec-start 加载项目级角色并开始 5 阶段流程
- 暂不启动：先熟悉项目结构，稍后手动调用 /spec-start
```

用户选择"启动开发任务"时，调用 `/spec-start`。

## 初始化后的目录结构

```
项目根目录/
├── AGENTS.md                        # 项目身份 + 规范 + 路由
├── .agents/
│   ├── rules/                       # 永久性编码规范（每文件 ≤ 20 行）
│   │   ├── coding-style.md          # 编码风格
│   │   ├── spec-workflow.md         # Spec 工作流规范
│   │   └── git-workflow.md          # GitHub Flow 规范
│   ├── roles/                       # CLI 中立项目级角色定义
│   │   ├── spec-explorer.md
│   │   ├── spec-writer.md
│   │   ├── spec-tester.md
│   │   ├── spec-executor.md
│   │   ├── spec-debugger.md
│   │   └── spec-ender.md
│   └── skills/                      # Skills 体系（通过 CLI 或手动安装）
│       ├── spec-init/SKILL.md
│       ├── spec-start/SKILL.md
│       ├── spec-explore/SKILL.md
│       ├── spec-write/SKILL.md
│       ├── spec-test/SKILL.md
│       ├── spec-execute/SKILL.md
│       ├── spec-debug/SKILL.md
│       ├── spec-end/SKILL.md
│       ├── spec-update/SKILL.md
│       ├── spec-review/SKILL.md
│       ├── exp-search/SKILL.md
│       ├── exp-reflect/SKILL.md
│       ├── exp-write/SKILL.md
│       ├── intent-confirmation/SKILL.md
│       ├── git-work/SKILL.md
│       ├── skill-creator/SKILL.md
│       ├── find-skills/SKILL.md
│       ├── obsidian-markdown/SKILL.md
│       ├── obsidian-bases/SKILL.md
│       ├── obsidian-plugin-dev/SKILL.md
│       └── json-canvas/SKILL.md
├── .claude/
│   └── agents/                      # Claude Code 项目级 Agent 适配
│       ├── spec-explorer.md
│       ├── spec-writer.md
│       ├── spec-tester.md
│       ├── spec-executor.md
│       ├── spec-debugger.md
│       └── spec-ender.md
├── .codex/
│   ├── config.toml                  # Codex 项目级 Agent 配置（如需）
│   └── agents/                      # Codex 项目级 Agent 适配
│       ├── spec-explorer.toml
│       ├── spec-writer.toml
│       ├── spec-tester.toml
│       ├── spec-executor.toml
│       ├── spec-debugger.toml
│       └── spec-ender.toml
├── spec/
│   ├── 01-产品规划/
│   ├── 02-技术设计/
│   ├── 03-能力交付/
│   ├── 04-系统改进/
│   ├── 05-验证工程/
│   ├── 06-已归档/
│   └── context/
│       ├── experience/
│       │   └── index.md             # 经验索引
│       └── knowledge/
│           └── index.md             # 知识索引
└── .obsidian/                       # Obsidian Vault 配置
    ├── app.json                     # 基础配置
    └── community-plugins.json       # 推荐插件
```

## 后续动作

初始化完成后确认：
1. Git 仓库状态已检查；如用户确认，已完成 `git init` + `main` 分支初始化
2. AGENTS.md 已创建（项目身份 + 规范 + 路由）
3. .agents/rules/ 已创建（编码规范 + Spec 工作流 + GitHub Flow）
4. .agents/skills/ 已安装或引导安装
5. .agents/roles/ 已创建（6 个项目级角色定义）
6. .claude/agents/ 与 .codex/agents/ 已按需创建项目级运行时适配
7. spec/ 目录结构已创建（6 个分类目录 + context/）
8. 经验/知识索引文件已创建
9. Obsidian Vault 已注册（.obsidian/ + app.json）
10. 已询问用户是否启动开发任务（spec-start）

### 常见陷阱
- 已有 AGENTS.md 时覆盖用户自定义内容（应先检查，已有则跳过或合并）
- 已有 .agents/rules/ 时覆盖已有规范（应先检查）
- 已有 .agents/roles/ 或运行时适配文件时覆盖用户自定义角色（应先检查）
- 已有 spec/ 目录时重复创建（应先检查）
- 覆盖已有的 .obsidian/ 自定义配置（应先检查）
- 初始化后直接开始开发，跳过 spec-start 的需求对齐阶段
- AGENTS.md 中的技术栈信息与实际项目不符（应根据用户回答填充）
