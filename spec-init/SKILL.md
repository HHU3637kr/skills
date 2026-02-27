---
name: spec-init
description: >
  初始化项目的 Spec 驱动开发基础设施。新项目首次使用 Spec 工作流时调用，
  负责创建 spec/ 目录结构、记忆系统目录和 Obsidian Vault 注册。
  整个项目生命周期只需执行一次。
  触发条件：(1) 用户说"初始化项目"/"搭建 Spec 环境"/"创建 spec 目录"，
  (2) 新项目首次使用 Spec 工作流，
  (3) 项目根目录下不存在 spec/ 目录。
  注意：本 Skill 只做项目基础设施搭建。启动开发任务请使用 spec-start。
---

# Spec Init

## 核心原则

1. **幂等性**：所有操作先检查后创建，已存在则跳过，不覆盖已有内容
2. **最小化**：只创建必要的目录和配置文件，不引入多余依赖
3. **一次性**：整个项目生命周期只需执行一次，后续开发任务使用 `spec-start`

## 工作流程

### 步骤 1：检查项目状态

```bash
# 检查项目根目录下是否已有 spec/ 目录
ls spec/
```

如果已存在完整的目录结构，告知用户无需重复初始化，建议直接使用 `spec-start` 启动开发任务。

### 步骤 2：创建 Spec 目录结构

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

### 步骤 3：创建记忆索引文件

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

### 步骤 4：注册 Obsidian Vault

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

### 步骤 5：向用户确认初始化结果

```python
AskUserQuestion(
    questions=[{
        "question": "项目 Spec 基础设施已初始化完成。是否需要立即启动一个开发任务？",
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
├── .obsidian/                   # Obsidian Vault 配置
│   ├── app.json                 # 基础配置
│   └── community-plugins.json   # 推荐插件
├── spec/
│   ├── 01-项目规划/
│   ├── 02-架构设计/
│   ├── 03-功能实现/
│   ├── 04-问题修复/
│   ├── 05-测试文档/
│   ├── 06-已归档/
│   └── context/
│       ├── experience/
│       │   └── index.md         # 经验索引
│       └── knowledge/
│           └── index.md         # 知识索引
└── ...（项目其他文件）
```

## 后续动作

初始化完成后确认：
1. spec/ 目录结构已创建（6 个分类目录 + context/）
2. 经验/知识索引文件已创建
3. Obsidian Vault 已注册（.obsidian/ + app.json）
4. 已提示用户安装 Obsidian Bases 插件
5. 已询问用户是否启动开发任务（spec-start）

### 常见陷阱
- 已有 spec/ 目录时重复创建覆盖内容（应先检查）
- 覆盖已有的 .obsidian/ 自定义配置（应先检查）
- 初始化后直接开始开发，跳过 spec-start 的需求对齐阶段
