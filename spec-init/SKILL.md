---
name: spec-init
description: >
  初始化项目的 Spec 驱动开发完整基础设施。新项目首次使用 Spec 工作流时调用，
  负责搭建完整的项目骨架：CLAUDE.md、.claude/rules/、.claude/skills/、spec/ 目录、
  记忆系统和 Obsidian Vault。整个项目生命周期只需执行一次。
  触发条件：(1) 用户说"初始化项目"/"搭建 Spec 环境"/"创建开发环境"，
  (2) 新项目首次使用 Spec 工作流，
  (3) 项目根目录下不存在 CLAUDE.md 或 spec/ 目录。
  注意：本 Skill 只做项目基础设施搭建。启动开发任务请使用 spec-start。
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
ls CLAUDE.md
ls spec/
ls .claude/
```

如果 CLAUDE.md 和 spec/ 都已存在，告知用户无需重复初始化，建议直接使用 `spec-start` 启动开发任务。
如果部分存在，只补充缺失部分。

### 步骤 2：询问项目基本信息

使用 `AskUserQuestion` 收集项目信息（用于生成 CLAUDE.md）：

```python
AskUserQuestion(
    questions=[
        {
            "question": "请提供项目基本信息：\n1. 项目名称\n2. 项目简介（一句话描述）\n3. 主要技术栈（如 Python/FastAPI、TypeScript/React 等）\n4. 项目类型（如 Web 应用、CLI 工具、库等）",
            "header": "项目初始化"
        }
    ]
)
```

### 步骤 3：创建 CLAUDE.md

在项目根目录创建 `CLAUDE.md`，这是项目的身份文件和路由入口：

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

@import .claude/rules/

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

> [!important] CLAUDE.md 是模板
> 根据用户提供的项目信息填充模板。如果用户有额外的项目规范需求，在此文件中补充。

### 步骤 4：创建 .claude/ 配置目录

#### 4.1 创建 rules/ 目录

```bash
mkdir -p ".claude/rules"
```

创建 `.claude/rules/coding-style.md`（编码风格模板，根据技术栈调整）：
```markdown
# 编码风格

- 变量命名：{根据语言选择 camelCase / snake_case}
- 函数/方法：简短、单一职责
- 文件长度：建议不超过 300 行
- 注释：关键逻辑必须注释，勿注释显而易见的代码
```

创建 `.claude/rules/spec-workflow.md`（Spec 工作流规范）：
```markdown
# Spec 工作流规范

- 实现前必须有已确认的 plan.md
- 不添加 Spec 未定义的功能
- 每个关键节点等待用户确认
- 完成后使用 exp-reflect 沉淀经验
```

> [!tip] rules/ 每文件 ≤ 20 行
> `.claude/rules/` 中的文件每次会话都会加载，保持精简，避免占用 context window。

#### 4.2 创建 skills/ 目录并安装 Skills

```bash
mkdir -p ".claude/skills"
```

引导用户安装 Skills 体系：

```python
AskUserQuestion(
    questions=[{
        "question": "需要安装 Spec 驱动开发的 Skills 体系。请选择安装方式：",
        "header": "安装 Skills",
        "multiSelect": false,
        "options": [
            {
                "label": "通过 Skills CLI 安装",
                "description": "运行 npx skills install HHU3637kr/skills 自动安装所有 Skill"
            },
            {
                "label": "手动安装",
                "description": "从 GitHub 仓库手动复制 Skills 到 .claude/skills/"
            },
            {
                "label": "跳过",
                "description": "稍后手动安装，先完成其他初始化"
            }
        ]
    }]
)
```

如果用户选择 CLI 安装：
```bash
npx skills install HHU3637kr/skills
```

### 步骤 5：创建 Spec 目录结构

```bash
# 创建分类目录
mkdir -p "spec/01-项目规划"
mkdir -p "spec/02-架构设计"
mkdir -p "spec/03-功能实现"
mkdir -p "spec/04-问题修复"
mkdir -p "spec/05-测试文档"
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

```python
AskUserQuestion(
    questions=[{
        "question": "项目 Spec 开发环境已初始化完成：\n\n✅ CLAUDE.md（项目身份 + 规范）\n✅ .claude/rules/（编码规范）\n✅ .claude/skills/（Skills 体系）\n✅ spec/（Spec 目录 + 记忆系统）\n✅ .obsidian/（Obsidian Vault）\n\n是否需要立即启动一个开发任务？",
        "header": "初始化完成",
        "multiSelect": false,
        "options": [
            {
                "label": "启动开发任务",
                "description": "调用 spec-start 初始化 Agent Teams 并开始 5 阶段流程"
            },
            {
                "label": "暂不启动",
                "description": "先熟悉项目结构，稍后手动调用 /spec-start"
            }
        ]
    }]
)
```

用户选择"启动开发任务"时，调用 `/spec-start`。

## 初始化后的目录结构

```
项目根目录/
├── CLAUDE.md                        # 项目身份 + 规范 + 路由
├── .claude/
│   ├── rules/                       # 永久性编码规范（每文件 ≤ 20 行）
│   │   ├── coding-style.md          # 编码风格
│   │   └── spec-workflow.md         # Spec 工作流规范
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
│       ├── git-workflow-sop/SKILL.md
│       ├── skill-creator/SKILL.md
│       ├── find-skills/SKILL.md
│       ├── obsidian-markdown/SKILL.md
│       ├── obsidian-bases/SKILL.md
│       ├── obsidian-plugin-dev/SKILL.md
│       └── json-canvas/SKILL.md
├── spec/
│   ├── 01-项目规划/
│   ├── 02-架构设计/
│   ├── 03-功能实现/
│   ├── 04-问题修复/
│   ├── 05-测试文档/
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
1. CLAUDE.md 已创建（项目身份 + 规范 + 路由）
2. .claude/rules/ 已创建（编码规范模板）
3. .claude/skills/ 已安装或引导安装
4. spec/ 目录结构已创建（6 个分类目录 + context/）
5. 经验/知识索引文件已创建
6. Obsidian Vault 已注册（.obsidian/ + app.json）
7. 已询问用户是否启动开发任务（spec-start）

### 常见陷阱
- 已有 CLAUDE.md 时覆盖用户自定义内容（应先检查，已有则跳过或合并）
- 已有 .claude/rules/ 时覆盖已有规范（应先检查）
- 已有 spec/ 目录时重复创建（应先检查）
- 覆盖已有的 .obsidian/ 自定义配置（应先检查）
- 初始化后直接开始开发，跳过 spec-start 的需求对齐阶段
- CLAUDE.md 中的技术栈信息与实际项目不符（应根据用户回答填充）
