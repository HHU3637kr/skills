# R&K Flow - Spec 驱动式开发 Skills 体系

## 概述

**R&K Flow** 是一套完整的 Spec 驱动式开发 Skills 体系，通过 **Obsidian** 管理文档，用 **Agent Teams 多角色协作架构** 驱动开发流程。v2.0 将开发拆分为 5 个阶段，由 6 个专职角色分工协作，融合结构化文档、可追溯流程和双层记忆系统。


如果你对该工作流感兴趣,或者有疑问,欢迎加入我们的社群讨论!

![alt text](微信图片_20260228232027_175_93.jpg)


## 安装

```bash
npm install -g @rnking3637/rk-flow
rk-flow init
```

在任意项目目录执行 `rk-flow init`，所有 Skills 会自动复制到 `.claude/skills/`。

然后在项目的 `CLAUDE.md` 中添加：

```
@import .claude/skills/
```

## 核心理念

> **Spec First** - 一切从 Spec 开始
> - 先设计，后实现
> - 严格遵循 Spec，不添加额外功能
> - 每个实现都可追溯到 Spec 文档
> - 完整的开发过程记录在 Obsidian 中

> **Agent Teams** - 多角色协作，各司其职
> - TeamLead（当前 Agent）统一协调全局
> - 6 个专职角色：探索、设计、测试、实现、调试、收尾
> - 角色（Who）与 Skill（How）分离
> - 5 阶段流程，每个阶段转换有用户确认门禁


## 架构概览

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    Spec 驱动式开发工作流 v2.0                              │
│                     Agent Teams 多角色协作架构                             │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  用户需求                                                                  │
│      ↓                                                                    │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │ 阶段一：需求对齐                                         │              │
│  │ TeamLead + intent-confirmation → 用户确认                │              │
│  └────────────────────────┬────────────────────────────────┘              │
│      ↓ 【门禁 1：需求理解正确】                                             │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │ 阶段二：Spec 创建                                        │              │
│  │ spec-explorer → exploration-report.md                    │              │
│  │ spec-writer ↔ spec-tester 协作讨论                        │              │
│  │ → plan.md + test-plan.md                                 │              │
│  └────────────────────────┬────────────────────────────────┘              │
│      ↓ 【门禁 2：设计方案 + 测试计划确认】                                   │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │ 阶段三：实现                                              │              │
│  │ spec-executor → summary.md                               │              │
│  └────────────────────────┬────────────────────────────────┘              │
│      ↓ 【门禁 3：实现确认】                                                │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │ 阶段四：测试                                              │              │
│  │ spec-tester 执行测试 → test-report.md                     │              │
│  │ [如有 bug] spec-tester ↔ spec-debugger 修复闭环           │              │
│  └────────────────────────┬────────────────────────────────┘              │
│      ↓ 【门禁 4：测试报告确认】                                             │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │ 阶段五：收尾                                              │              │
│  │ spec-ender → 多角色讨论 + exp-reflect                     │              │
│  │ → 用户确认归档 → git 提交                                  │              │
│  └─────────────────────────────────────────────────────────┘              │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                      双层互补记忆系统（复利工程）                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │  Auto Memory（自动层）— Claude Code 原生                     │    │  │
│  │  │  • 日常编码经验、调试技巧、项目模式                           │    │  │
│  │  │  • Claude 自主判断，零摩擦，覆盖 ~80% 轻量经验               │    │  │
│  │  │  • 存储：~/.claude/projects/*/memory/                        │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │  exp-* 系统（显式层）— 项目级结构化记忆                       │    │  │
│  │  │                                                              │    │  │
│  │  │    ┌──────────┐      ┌──────────┐      ┌──────────┐         │    │  │
│  │  │    │ 经验记忆  │      │ 知识记忆  │      │ 程序记忆  │         │    │  │
│  │  │    │ 困境-策略 │      │ 项目理解  │      │   SOP    │         │    │  │
│  │  │    └────┬─────┘      └────┬─────┘      └────┬─────┘         │    │  │
│  │  │         └─────────────────┼─────────────────┘               │    │  │
│  │  │                           ↓                                  │    │  │
│  │  │  • 重大困境-策略对，需要 Obsidian 双链关联                    │    │  │
│  │  │  • 存储：spec/context/experience/ + knowledge/               │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                     │  │
│  │         开发前检索 ←─────────────→ 开发后分流沉淀                     │  │
│  │         (exp-search)               (exp-reflect)                    │  │
│  │         搜索两层记忆                重大→exp-write / 轻量→Auto Memory │  │
│  │                                                                     │  │
│  │         每次开发都利用历史经验，每次完成都沉淀新经验                    │  │
│  │                      知识形成复利，越用越快                            │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                         信息分层架构                                        │
│                                                                           │
│  CLAUDE.md           → 项目身份 + 路由（@import .claude/rules/）           │
│  .claude/rules/      → 永久性编码规范（每文件 ≤ 20 行）                     │
│  MEMORY.md           → Auto Memory 跨会话记忆（Claude 自主管理）            │
│  exp/                → 项目级结构化经验（显式层）                            │
│  skills/             → 工作流程定义（精简核心 + references/ 按需加载）        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Agent Teams 架构

### 角色与 Skill 对照

v2.0 明确区分**角色**（Who）和 **Skill**（How）。角色是 Agent Teams 中的成员身份，Skill 是角色调用的工作流程。

| 角色（Agent 成员） | 调用的 Skill | 产出物 | 活跃阶段 |
|-------------------|------------|--------|---------|
| **TeamLead（当前 Agent）** | `intent-confirmation` | 全局协调 | 全程 |
| spec-explorer | `spec-explore` | `exploration-report.md` | 阶段二（前置） |
| spec-writer | `spec-write` | `plan.md` | 阶段二 |
| spec-tester | `spec-test` | `test-plan.md`, `test-report.md` | 阶段二 + 阶段四 |
| spec-executor | `spec-execute` | `summary.md` | 阶段三 |
| spec-debugger | `spec-debug` | `debug-xxx.md`, `debug-xxx-fix.md` | 阶段三/四（按需） |
| spec-ender | `spec-end` | 经验沉淀 + 归档 + git 提交 | 阶段五 |

### 初始化

项目首次使用时，调用 `spec-init` 搭建完整项目骨架（CLAUDE.md、.claude/rules/、.claude/skills/、spec/ 目录、记忆系统、Obsidian Vault）。

每次开始新任务时，调用 `spec-start` 启动 Agent Teams：

```python
TeamCreate(
    team_name="spec-{YYYYMMDD-HHMM}-{任务简称}",
    description="Spec 驱动开发: {任务描述}"
)
```

当前 Agent 自动成为 TeamLead，无需创建额外的 TeamLead 角色。

## Skills 体系组成

### 1. Spec 核心工作流 Skills

| Skill | 对应角色 | 功能 | 使用场景 |
|-------|---------|------|----------|
| `spec-init` | TeamLead | 完整项目骨架搭建（CLAUDE.md + rules + skills + spec/ + Obsidian Vault） | 新项目首次使用，一次性 |
| `spec-start` | TeamLead | 初始化 Agent Teams，创建 6 个专职角色 | 每次开始新开发任务 |
| `spec-explore` | spec-explorer | Spec 前置信息收集（经验检索 + 代码探索） | Spec 创建前的背景调研 |
| `spec-write` | spec-writer | 撰写 plan.md（纯代码实现计划，不含测试） | 创建新功能 Spec |
| `spec-test` | spec-tester | 撰写 test-plan.md + 执行测试产出 test-report.md | 测试计划和测试执行 |
| `spec-execute` | spec-executor | 严格按 plan.md 实现代码，产出 summary.md | 新功能开发 |
| `spec-debug` | spec-debugger | 诊断并修复 bug，产出 debug 文档 | 测试发现问题时 |
| `spec-end` | spec-ender | 多角色讨论 + 经验沉淀 + 归档 + git 提交 | 开发周期收尾 |
| `spec-update` | — | 执行功能更新 | 修改已有功能（不归档） |
| `spec-review` | — | 审查实现情况 | 可选：验证是否严格遵循 Spec |

#### 新功能开发流程（5 阶段）

```
阶段一：需求对齐
  TeamLead（当前 Agent）→ intent-confirmation → 用户确认
      ↓ 【门禁 1】

阶段二：Spec 创建
  TeamLead → spec-explorer 开始
  spec-explorer → exploration-report.md → 通知 spec-writer + spec-tester
  spec-writer ↔ spec-tester 协作讨论接口边界
  两者完成 → 通知 TeamLead
  TeamLead → 用户确认 plan.md + test-plan.md
      ↓ 【门禁 2】

阶段三：实现
  TeamLead → spec-executor 开始
  spec-executor → summary.md → 通知 TeamLead
  TeamLead → 用户确认 summary.md
      ↓ 【门禁 3】

阶段四：测试
  TeamLead → spec-tester 执行测试
  [如有 bug] spec-tester → spec-debugger → 修复 → 重新验证
  spec-tester → test-report.md → 通知 TeamLead
  TeamLead → 用户确认 test-report.md
      ↓ 【门禁 4】

阶段五：收尾
  TeamLead → spec-ender 开始
  spec-ender → 多角色讨论 + exp-reflect → 用户确认归档 → git 提交
  spec-ender → 通知 TeamLead，Teams 进入待机

可选：用户可在任意时刻调用 spec-review 进行详细审查
```

#### 问题修复流程

```
spec-tester 发现 bug
    ↓
SendMessage 通知 spec-debugger（含复现步骤）
    ↓
spec-debugger 诊断问题
    ↓
创建 debug-xxx.md（诊断文档）
    ↓
TeamLead 向用户确认诊断
    ↓
执行修复
    ↓
创建 debug-xxx-fix.md（修复总结）
    ↓
SendMessage 通知 spec-tester 重新验证
    ↓
spec-tester 验证通过 → 记录到 test-report.md
```

> **⚠️ 为什么不直接修改 plan.md？**
>
> plan.md 是已经用户确认的设计文档，不应因为执行问题而被修改。通过创建 debug 文档：
> - 保持设计的完整性和可追溯性
> - 记录问题和修复历史，形成知识库
> - 与 spec-update 区分（update 用于主动迭代，debug 用于被动修复）

#### 功能更新流程

适用场景：已有功能完成并归档后，原有需求发生变化或设计过时，需要对已有 Spec 进行迭代更新。

```
已有功能的需求/设计发生变化（原 plan.md + summary.md 已存在）
    ↓
spec-update 创建 update-xxx.md（放在原 Spec 目录）
    ↓
用户确认更新方案
    ↓
spec-update 执行更新
    ↓
spec-update 创建 update-xxx-summary.md
    ↓
用户确认
    ↓
完成（不归档，保留在原目录）

可选：用户可在任意时刻调用 spec-review 进行详细审查
```

### 2. 经验管理 Skills

| Skill | 功能 | 在 Spec 流程中的作用 |
|-------|------|---------------------|
| `exp-search` | 记忆检索 | 检索五层记忆（经验+知识+SOP+工具记忆+Auto Memory 只读） |
| `exp-reflect` | 记忆反思 | 分析对话提取记忆，自动识别类型（经验/知识），按权重分流 |
| `exp-write` | 记忆写入 | 将经验写入 experience/ 或知识写入 knowledge/，更新索引 |

### 3. Obsidian 支持 Skills

| Skill | 功能 | 在 Spec 流程中的作用 |
|-------|------|---------------------|
| `obsidian-markdown` | 创建和编辑 Obsidian Flavored Markdown | 所有 Spec 文档的格式基础 |
| `obsidian-bases` | 创建和管理数据库视图 | 动态 Spec 索引、状态跟踪 |
| `json-canvas` | 创建可视化 Canvas | Spec 依赖关系图、架构图 |

### 4. Obsidian 插件开发支持

| Skill | 功能 | 使用场景 |
|-------|------|----------|
| `obsidian-plugin-dev` | Obsidian 插件开发指南 | 开发 Obsidian 插件时参考 |

### 5. 辅助 Skills

| Skill | 功能 | 在 Spec 流程中的作用 |
|-------|------|---------------------|
| `intent-confirmation` | 确认用户意图 | **在执行任务前**避免理解偏差，确保 Agent 正确理解需求 |
| `git-workflow-sop` | Git 操作规范 | 提交代码、同步仓库 |
| `skill-creator` | 创建新 Skill 的指南 | 扩展能力时参考 |
| `find-skills` | 搜索和安装开源 Skill | 从 skills.sh 生态发现新能力 |

## Spec 目录结构

```
spec/
├── 01-项目规划/          # PRD、流程设计、项目规划
├── 02-架构设计/          # 架构、数据模型、服务层
├── 03-功能实现/          # 功能、API、集成
├── 04-问题修复/          # Bug修复、重构
├── 05-测试文档/          # 测试计划、测试报告
├── 06-已归档/           # 已完成的 Spec（自动移动）
└── context/             # 记忆系统（与 Spec 工作流一致）
    ├── experience/      # 经验记忆存储（显式层）
    │   ├── index.md     # 经验索引
    │   └── exp-xxx-标题.md  # 经验详情
    └── knowledge/       # 知识记忆存储（显式层）
        ├── index.md     # 知识索引
        └── know-xxx-标题.md  # 知识详情

~/.claude/projects/*/memory/   # Auto Memory（自动层，Claude 自主管理）
    ├── MEMORY.md              # 自动加载到系统提示
    └── *.md                   # 按主题分类的记忆文件
```

每个 Spec 目录遵循以下命名规范：
```
spec/分类目录/YYYYMMDD-HHMM-任务描述/
├── plan.md                    # 设计方案（spec-write 创建）
├── exploration-report.md      # 探索报告（spec-explore 创建）
├── test-plan.md               # 测试计划（spec-test 创建）
├── summary.md                 # 实现总结（spec-execute 创建）
├── test-report.md             # 测试报告（spec-test 创建）
├── review.md                  # 审查报告（可选，spec-review 创建）
├── debug-001.md               # 问题诊断（spec-debug 创建）
├── debug-001-fix.md           # 修复总结（spec-debug 创建）
├── update-001.md              # 更新方案（spec-write 创建）
├── update-001-summary.md      # 更新总结（spec-update 创建）
└── update-001-review.md       # 更新审查（可选，spec-review 创建）
```

## Obsidian 在 Spec 流程中的关键作用

### 1. 双链建立文档关联

使用 `[[wikilink]]` 语法建立文档间的关系：

```markdown
## 文档关联

- 设计文档: [[plan|设计方案]]
- 探索报告: [[exploration-report|探索报告]]
- 测试计划: [[test-plan|测试计划]]
- 实现总结: [[summary|实现总结]]
- 测试报告: [[test-report|测试报告]]
- 审查报告: [[review|审查报告]]
```

**优势**：
- 文档关联可视化（在 Obsidian 的关系图中查看）
- 快速导航到相关文档
- 自动反向链接追踪

### 2. Frontmatter 元数据管理

每个 Spec 文档使用 YAML frontmatter 存储元数据：

```yaml
---
title: 功能名称
type: plan
category: 03-功能实现
status: 未确认
priority: 高
created: 2026-01-09
execution_mode: single-agent
tags:
  - spec
  - plan
related: []
---
```

**优势**：
- 支持结构化查询和过滤
- 与 obsidian-bases 无缝集成
- 便于生成索引和统计

### 3. Callout 突出关键信息

使用 Callout 语法突出不同类型的信息：

```markdown
> [!warning] 注意事项
> 这个实现必须保证可追溯性

> [!tip] 最佳实践
> 优先使用异步操作处理并发

> [!success] 已完成
> 所有功能已按计划实现
```

### 4. 动态索引（obsidian-bases）

使用 `.base` 文件创建动态 Spec 索引：

```yaml
filters:
  and:
    - file.inFolder("spec")
    - 'file.ext == "md"'
    - 'status != "已归档"'

views:
  - type: table
    name: "进行中的 Spec"
    order:
      - file.name
      - status
      - priority
```

## 门禁设计：用户确认机制

### 概述

本项目使用 Claude Code 的原生 `AskUserQuestion` 工具实现用户确认工作流。v2.0 中每个阶段转换前都设有**门禁节点**，由 TeamLead 统一发起，确保用户始终掌控开发方向。

### 门禁节点

| 门禁 | 触发时机 | 由谁发起 | 确认内容 |
|------|---------|---------|---------|
| **门禁 1：需求对齐** | 阶段一完成 | TeamLead | 需求理解正确 |
| **门禁 2：Spec 审阅** | 阶段二完成 | TeamLead | plan.md + test-plan.md |
| **门禁 3：实现确认** | 阶段三完成 | TeamLead | summary.md |
| **门禁 4：测试确认** | 阶段四完成 | TeamLead | test-report.md |
| **诊断确认** | bug 诊断完成 | TeamLead | debug-xxx.md（如有） |
| **归档确认** | 阶段五 | spec-ender | 是否归档 + git 提交 |

### 确认示例

```python
AskUserQuestion(
    questions=[{
        "question": "plan.md 已创建完成，请确认设计方案是否可以开始实现？",
        "header": "确认方案",
        "multiSelect": false,
        "options": [
            {
                "label": "确认，开始实现",
                "description": "设计方案正确，可以开始执行实现"
            },
            {
                "label": "需要修改",
                "description": "设计方案需要调整，请说明修改要求"
            }
        ]
    }]
)
```

### intent-confirmation 前置确认

> **⚠️ 为什么需要 intent-confirmation？**
>
> 在执行非简单任务前，必须先确认用户意图，避免因理解偏差导致的无效工作。触发条件包括：
> - **抽象需求**：需求描述较为模糊（如"优化一下这个功能"）
> - **设计决策**：涉及架构变更或设计选择
> - **多义表达**：用户表达可能有多种理解
> - **大范围影响**：任务影响范围较大

## 完整工作流示例

### 示例：使用 Agent Teams 实现「专业评价 Agent」

#### 步骤 1：启动 Agent Teams（spec-start）

```bash
用户：我需要实现一个专业评价 Agent

TeamLead（当前 Agent）：
调用 spec-start，创建 Agent Teams "spec-20260109-1430-专业评价Agent"
初始化 6 个专职角色...
使用 intent-confirmation 与用户对齐需求...
```

#### 步骤 2：Spec 创建（阶段二）

```bash
TeamLead → spec-explorer 开始

spec-explorer：
  调用 exp-search 检索历史经验...
  探索项目代码库，产出 exploration-report.md

spec-explorer → 通知 spec-writer + spec-tester

spec-writer ↔ spec-tester 协作讨论接口边界
spec-writer：创建 plan.md（设计方案）
spec-tester：创建 test-plan.md（测试计划）

TeamLead → 用户确认 plan.md + test-plan.md
```

#### 步骤 3：实现（阶段三）

```bash
用户：确认，开始实现

TeamLead → spec-executor 开始
spec-executor：
  读取 plan.md，检索历史经验
  按计划逐步实现
  创建 summary.md

TeamLead → 用户确认 summary.md
```

#### 步骤 4：测试（阶段四）

```bash
TeamLead → spec-tester 开始执行测试

spec-tester：
  按 test-plan.md 执行测试用例
  发现 bug → SendMessage 通知 spec-debugger
  spec-debugger 修复 → 通知 spec-tester 重新验证
  产出 test-report.md

TeamLead → 用户确认 test-report.md
```

#### 步骤 5：收尾（阶段五）

```bash
TeamLead → spec-ender 开始

spec-ender：
  向各角色发起讨论，收集经验素材
  调用 exp-reflect 分流沉淀
  询问用户：是否归档并提交 git？

用户：确认归档

spec-ender → 移动到 06-已归档 → 调用 git-workflow-sop 提交
spec-ender → 通知 TeamLead，Teams 进入待机
```

## 灵活使用

完整的 Agent Teams 流程适合复杂需求，但并非所有场景都需要走全套。以下两种轻量用法同样有效：

**小需求 / 快速迭代**：直接单独调用某个 Skill，例如只用 `spec-write` 写方案、只用 `spec-update` 做小改动，无需启动完整的 Agent Teams 流程。

**非 Claude Code 用户**（Cursor、Windsurf 等）：这套 Skills 同样适用。将 `spec-start` 的流程交给单 Agent 按顺序执行，实测效果同样理想。每个 Skill 文件都是独立的 Markdown 提示词，可以直接粘贴到任意 AI 编辑器中使用。

## 记忆系统

本项目实现了**双层互补**的记忆架构，结合 Claude Code 原生 Auto Memory 和基于 MUSE 框架的项目级经验系统：

```
┌─────────────────────────────────────────────────────────────────────┐
│                     双层互补记忆架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Auto Memory（自动层）— Claude Code 原生                      │  │
│  │  ├─ 日常编码经验、调试技巧、项目模式                          │  │
│  │  ├─ Claude 自主判断是否记录，零摩擦                           │  │
│  │  ├─ 覆盖 ~80% 的轻量经验捕获                                 │  │
│  │  └─ 存储：~/.claude/projects/*/memory/                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  exp-* 系统（显式层）— 项目级结构化记忆                       │  │
│  │  ├─ 经验记忆：重大困境-策略对 → spec/context/experience/      │  │
│  │  ├─ 知识记忆：项目理解/技术调研 → spec/context/knowledge/     │  │
│  │  ├─ 程序记忆：可复用 SOP → sop-xxx Skill                     │  │
│  │  ├─ 工具记忆：Skill 后续动作 → Skill 末尾                    │  │
│  │  └─ 覆盖 ~20% 的重要记忆，需要 Obsidian 双链关联到 Spec      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  职责边界：                                                          │
│  • Auto Memory 和 exp-* 互补不冲突，各自管各自的存储                │
│  • exp-* 系统不写 MEMORY.md（由 Claude Code 自主管理）              │
│  • exp-search 可读 MEMORY.md（只读不写，不越界）                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Auto Memory（自动层）

**管理者**：Claude Code 自身（自主判断）

**内容**：日常编码经验、调试技巧、项目模式、个人编码习惯

**特点**：个人的、自动的、非结构化的、零摩擦

**存储位置**：`~/.claude/projects/*/memory/`（MEMORY.md 自动加载到系统提示）

**写入时机**：Claude 在工作过程中自主判断，无需用户干预

### exp-* 系统（显式层）

#### 1. 经验记忆 → spec/context/experience/

**存储位置**：`spec/context/experience/exp-xxx-标题.md`

**索引位置**：`spec/context/experience/index.md`

**加载方式**：索引全量加载，详情按需检索

**存储格式**：
```markdown
---
id: EXP-xxx
title: 标题
keywords: [关键词1, 关键词2]
scenario: 适用场景
created: YYYY-MM-DD
---

# 标题

## 困境
[描述遇到的问题]

## 策略
[解决方案步骤]

## 理由
[为什么这个策略有效]
```

**写入时机**（仅重大经验）：
- 涉及多组件协调、非显而易见的解决方案
- 需要链接到 Spec/代码文件的结构化记录
- 团队/项目级别需要共享的经验
- 长期有效的架构决策和设计模式

**管理 Skill**：`exp-search`、`exp-reflect`、`exp-write`

#### 2. 知识记忆 → spec/context/knowledge/

**存储位置**：`spec/context/knowledge/know-xxx-标题.md`

**索引位置**：`spec/context/knowledge/index.md`

**加载方式**：索引全量加载，详情按需检索

**存储格式**：
```markdown
---
id: KNOW-xxx
title: 标题
type: 项目理解 / 技术调研 / 代码分析
keywords: [关键词1, 关键词2]
created: YYYY-MM-DD
---

# 标题

## 概述
[简要说明核心内容]

## 详细内容
[根据类型组织内容：项目理解/技术调研/代码分析]

## 相关文件
[涉及的文件路径]
```

**写入时机**：
- 探索项目架构、数据流后
- 完成技术调研、框架对比后
- 深入分析某个模块的设计后

**管理 Skill**：`exp-search`、`exp-reflect`、`exp-write`

#### 3. 程序记忆 → SOP Skill

**存储位置**：`.claude/skills/sop-xxx-名称/SKILL.md`

**加载方式**：
- Skill 的 `description` 作为索引（始终可见）
- Skill 的正文作为 SOP 内容（触发时才加载）

**SOP 判断标准**（只有满足以下条件才创建 SOP）：
- 有明确的触发动作（如"部署"、"发布"）
- 有可机械执行的步骤序列
- 每次都按相同顺序执行
- 核心是"怎么做"而非"为什么"

**写入时机**：
- 完成了可重复执行的操作流程
- 发现了固定的操作模式

#### 4. 工具记忆 → Skill 末尾

**存储位置**：每个 Skill 文件的末尾「后续动作」章节

**加载方式**：随 Skill 一起加载，执行完 Skill 后自动参考

**写入时机**：
- 发现某个操作后总是需要特定的后续步骤
- 工具调用有固定的检查或验证模式
- 一个 Skill 执行后经常需要调用另一个 Skill

### 记忆类型边界

| 类型 | 核心问题 | 内容特征 | 示例 |
|------|---------|---------|------|
| **经验记忆** | 为什么 | 困境-策略对、决策依据、踩坑经验 | Hook 状态管理原理、指标评估流程理解 |
| **知识记忆** | 是什么 | 项目理解、技术调研、代码分析 | TeachingAnalyzer 架构、AgentScope 框架对比 |
| **程序记忆（SOP）** | 怎么做 | 可机械执行的步骤序列 | Docker 部署流程、数据库迁移流程 |

### 经验权重分流

`exp-reflect` 会对识别出的经验进行权重判断，自动分流：

| 判断维度 | 重大经验 → exp-write | 轻量经验 → Auto Memory |
|----------|---------------------|------------------------|
| 复杂度 | 涉及多组件协调、非显而易见的解决方案 | 单点技巧、简单调试经验 |
| 关联性 | 需要链接到 Spec/代码文件的结构化记录 | 独立的、无需关联其他文档 |
| 共享性 | 团队/项目级别需要共享的经验 | 个人编码习惯和偏好 |
| 持久性 | 长期有效的架构决策和设计模式 | 临时性的调试技巧 |

### 使用记忆管理 Skills

**手动触发**：
```bash
/exp-search <关键词>        # 检索相关记忆（含 Auto Memory 只读搜索）
/exp-reflect               # 反思对话，自动识别记忆类型并分流
/exp-reflect 记录数据流     # 带提示词，引导识别为知识记忆
/exp-write type=experience # 写入经验记忆（通常由 exp-reflect 调用）
/exp-write type=knowledge  # 写入知识记忆（通常由 exp-reflect 调用）
```

**自动提示**：
- 解决了反复出现的困难问题 → 经验记忆（exp-write）
- 探索了项目架构、数据流 → 知识记忆（exp-write）
- 完成了技术调研、框架对比 → 知识记忆（exp-write）
- 完成了一个可重复的操作流程 → 程序记忆（SOP）
- 发现某个操作后总是需要特定的后续步骤 → 工具记忆
- 日常编码技巧和调试经验 → Auto Memory（自动处理）

## 最佳实践

### 1. Spec 撰写原则

- **明确性**：需求和设计必须清晰明确
- **完整性**：包含所有必要的技术细节
- **可追溯性**：设计决策要有依据
- **可实施性**：提供具体的实现步骤

### 2. 开发约束

- **Spec 优先**：只实现 Spec 中定义的功能
- **开发顺序**：Framework 服务层 → Agent 层 → API 层
- **严格遵循**：不添加 Spec 中未定义的功能
- **可追溯性**：每个功能都能追溯到 Spec 的具体章节

### 3. 文档管理

- **命名规范**：`YYYYMMDD-HHMM-任务描述`（任务描述必须中文）
- **分类存放**：必须放入对应的分类目录（01-05）
- **双链关联**：使用 `[[wikilink]]` 建立文档关系
- **元数据完整**：每个文档都有完整的 frontmatter

### 4. 质量把关

- **意图确认**：**第一步**就使用 `intent-confirmation` 避免理解偏差
  - 触发条件：抽象需求、设计决策、多义表达、大范围影响
  - 确认方式：复述用户意图、列出关键理解点、询问"是这个意思吗？"
- **门禁机制**：每个阶段转换都等待用户确认
- **审查机制**：`spec-review` 验证实现是否符合 Spec
- **防止重复**：`exp-search` 检索是否已存在相似经验
- **测试闭环**：spec-tester 与 spec-debugger 的 bug 修复闭环

### 5. Agent Teams 协作规范

- **角色职责清晰**：不越权操作（如 spec-executor 不写测试）
- **闭环通知**：完成工作后必须通知相关角色
- **不跳过门禁**：阶段转换必须经过用户确认
- **TeamLead 统一协调**：所有用户交互由 TeamLead 发起

## 快速上手

### 新成员入门流程

1. **理解 Spec 驱动开发理念**
   - 阅读 CLAUDE.md 了解项目背景
   - 阅读 spec/ 目录下现有 Spec 了解文档风格

2. **熟悉 Agent Teams 工作流**
   - 了解 6 个角色的分工和协作方式
   - 了解 5 个阶段和门禁机制
   - 阅读各 Skill 的 SKILL.md 了解具体流程

3. **配置 Obsidian**
   - 安装 Obsidian（如需要本地查看）
   - 安装 Obsidian Base 插件（支持 .base 文件）
   - 打开项目根目录作为 Vault

4. **开始第一个 Spec**
   - 使用 `spec-init` 初始化项目基础设施
   - 使用 `spec-start` 启动 Agent Teams
   - 经历完整的 5 阶段流程，体验门禁机制和多角色协作

### 常见命令速查

```bash
# 在 Claude Code 中调用 Skills

/spec-init        # 项目初始化（一次性）
/spec-start       # 启动 Agent Teams
/spec-explore     # 前置信息收集
/spec-write       # 撰写设计方案
/spec-test        # 撰写测试计划 / 执行测试
/spec-execute     # 执行新功能开发
/spec-debug       # 诊断并修复问题
/spec-end         # 收尾（经验沉淀 + 归档）
/spec-update      # 执行功能更新
/spec-review      # 审查实现情况

/exp-search       # 检索历史经验
/exp-reflect      # 反思并沉淀经验
/find-skills      # 搜索开源 Skill
/intent-confirmation  # 确认用户意图
```

## 技术栈

- **AI Agent**: Claude Code (Anthropic)
- **文档系统**: Obsidian
- **版本控制**: Git
- **文档格式**: Obsidian Flavored Markdown
- **数据格式**: YAML (frontmatter), JSON (canvas)

## 参考资源

### 内部文档

- `CLAUDE.md` - 项目总体指南
- `spec/` - 所有 Spec 文档
- `.claude/skills/*/SKILL.md` - 各 Skill 的详细说明

### 外部资源

- [Obsidian Help](https://help.obsidian.md/)
- [Obsidian Bases Syntax](https://help.obsidian.md/bases/syntax)
- [JSON Canvas Spec](https://jsoncanvas.org/spec/1.0/)
- [Claude Code Documentation](https://claude.ai/code)
- [Skills CLI & Ecosystem](https://skills.sh/)

## 维护说明

### 添加新 Skill

1. 参考 `skill-creator/SKILL.md` 的指南
2. 在 `.claude/skills/` 下创建新目录
3. 编写 SKILL.md 文件
4. 更新本 README 的 Skills 列表

### 更新现有 Skill

1. 直接编辑对应 Skill 的 SKILL.md
2. 遵循 Skill 的更新规范
3. 更新相关文档引用

---

**版本**: 2.1
**最后更新**: 2026-02-28
**维护者**: 项目团队

---

## 更新日志

### v2.1 (2026-02-28) - spec-update 职责收敛

**核心改进**：

1. **spec-update 独立化**：移除对 spec-write 的依赖，update-xxx.md 的创建由 spec-update 自身负责
2. **spec-update 单 Agent 化**：移除路径 B（Agent Teams），更新流程统一为单 Agent；若更新规模需要多角色协作，应新建 Spec 走 spec-start 流程
3. **update-template.md 精简**：去掉 `execution_mode` 字段

### v2.0 (2026-02-27) - Agent Teams 架构重构

**核心改进**：

1. **Agent Teams 多角色协作架构**：
   - 引入 TeamLead + 6 专职角色的协作模型
   - 当前 Agent 即 TeamLead，统一协调全局
   - 明确区分角色（Who）与 Skill（How）

2. **5 阶段开发流程**：
   - 阶段一：需求对齐（TeamLead + intent-confirmation）
   - 阶段二：Spec 创建（spec-explorer → spec-writer ↔ spec-tester 协作）
   - 阶段三：实现（spec-executor）
   - 阶段四：测试（spec-tester ↔ spec-debugger 闭环）
   - 阶段五：收尾（spec-ender：多角色讨论 + 经验沉淀 + 归档）

3. **Skill 重命名（角色 vs Skill 分离）**：
   - `spec-writer` → `spec-write`（Skill）
   - `spec-executor` → `spec-execute`（Skill）
   - `spec-debugger` → `spec-debug`（Skill）
   - `spec-reviewer` → `spec-review`（Skill）
   - `spec-updater` → `spec-update`（Skill）

4. **新增 Skill**：
   - `spec-init`：完整项目骨架搭建（CLAUDE.md + .claude/rules/ + .claude/skills/ + spec/ + Obsidian Vault）
   - `spec-start`：启动 Agent Teams，创建 6 个专职角色（与 spec-end 对应）
   - `spec-explore`：Spec 前置信息收集（经验检索 + 代码探索 + 外部资源）
   - `spec-test`：测试计划撰写（test-plan.md）+ 测试执行（test-report.md）
   - `spec-end`：收尾工作（多角色讨论 + 经验沉淀 + 归档 + git 提交）
   - `find-skills`：搜索和安装开源 Skill（npx skills）

5. **职责拆分**：
   - plan.md 不再包含测试计划章节（由 spec-tester 单独创建 test-plan.md）
   - spec-execute 移除路径 B（agent-teams）和测试步骤
   - spec-debug 修复后必须通知 spec-tester 重新验证，不自行判断

6. **新增文档类型**：
   - `exploration-report.md`：探索报告（spec-explore 产出）
   - `test-plan.md`：测试计划（spec-test 阶段一产出）
   - `test-report.md`：测试报告（spec-test 阶段二产出）

### v1.4.2 (2026-02-09) - 知识记忆支持

**核心改进**：

1. **扩展记忆类型，支持知识记忆**：
   - 原有经验记忆（困境-策略对）→ `spec/context/experience/`
   - 新增知识记忆（项目理解/技术调研）→ `spec/context/knowledge/`
   - 统一入口，自动分类：用户只需调用 `/exp-reflect`，Skill 自动识别类型

2. **exp-reflect 增强**：
   - 支持用户提示词参数（如 `/exp-reflect 记录数据流`）
   - 自动识别记忆类型：困境-策略对 vs 项目理解/技术调研
   - 根据类型调用 `exp-write type=experience` 或 `type=knowledge`
   - 新增知识记忆草稿格式模板

3. **exp-search 扩展搜索范围**：
   - 从 4 层扩展到 5 层记忆检索
   - 新增知识记忆搜索（`spec/context/knowledge/`）
   - 同时搜索 `experience/index.md` 和 `knowledge/index.md`
   - 搜索结果按类型分组展示（经验记忆、知识记忆、程序记忆、工具记忆、Auto Memory）

4. **exp-write 支持知识记忆写入**：
   - 支持 `type=experience` 和 `type=knowledge` 参数
   - 根据类型选择文件名前缀（`exp-` 或 `know-`）
   - 根据类型选择 ID 格式（`EXP-xxx` 或 `KNOW-xxx`）
   - 提供知识记忆文档模板（项目理解/技术调研/代码分析）
   - 支持写入和更新 `spec/context/knowledge/` 目录

**文件命名规范**：
- 经验记忆：`exp-001-中文标题.md` → `spec/context/experience/`
- 知识记忆：`know-001-中文标题.md` → `spec/context/knowledge/`

**使用场景**：
- 探索项目数据流、架构后，使用 `/exp-reflect 记录数据流` 自动识别为知识记忆
- 技术选型、框架对比后，使用 `/exp-reflect 记录技术调研` 自动识别为知识记忆
- 解决困难问题后，使用 `/exp-reflect` 自动识别为经验记忆

### v1.4.1 (2026-02-09) - 用户确认机制优化

**核心改进**：

1. **废弃 MCP 确认插件，改用 Claude Code 原生特性**：
   - `obsidian-spec-confirm` MCP 插件目前存在 Bug，暂时废弃
   - 所有 Spec 确认流程改用 Claude Code 原生 `AskUserQuestion` 工具
   - 后续 MCP 插件完善后再投入使用

2. **更新所有 Skill 的确认机制**：
   - spec-writer：plan.md 确认改用 `AskUserQuestion`
   - spec-executor：summary.md 确认改用 `AskUserQuestion`
   - spec-updater：update-xxx.md 和 review.md 确认改用 `AskUserQuestion`
   - spec-reviewer：review.md 确认改用 `AskUserQuestion`
   - spec-debugger：debug-xxx.md 和 debug-xxx-fix.md 确认改用 `AskUserQuestion`

3. **用户确认节点**：
   - 方案确认：spec-writer 创建 plan.md 后
   - 实现确认：spec-executor 创建 summary.md 后
   - 更新方案确认：spec-writer 创建 update-xxx.md 后
   - 审查确认：spec-reviewer 创建 review.md 后
   - 诊断确认：spec-debugger 创建 debug-xxx.md 后
   - 修复确认：spec-debugger 创建 debug-xxx-fix.md 后

**文档更新**：
- README.md：删除 MCP 插件章节，新增"用户确认机制"章节
- obsidian-spec-confirm/README.md：添加废弃警告

### v1.4 (2026-02-07) - Claude Code 原生特性集成

**核心改进**：

1. **双层互补记忆架构**：
   - 新增 Auto Memory（自动层）：Claude Code 原生跨会话记忆，自主管理，零摩擦
   - exp-* 系统定位为显式层：仅处理重大困境-策略对，需要 Obsidian 双链关联
   - 明确职责边界：exp-* 不写 MEMORY.md，exp-search 可读 MEMORY.md（只读）

2. **exp-reflect 经验权重分流**：
   - 新增经验权重判断步骤（复杂度/关联性/共享性/持久性）
   - 重大经验 → exp-write 结构化记录
   - 轻量经验 → 引导 Auto Memory 自动处理
   - spec-executor 的强制 exp-reflect 改为建议性

3. **exp-write 职责边界明确**：
   - 明确只写 `spec/context/experience/` 目录
   - 不写 MEMORY.md（由 Claude Code 自主管理）

4. **exp-search 搜索范围扩展**：
   - 新增 Auto Memory 只读搜索（MEMORY.md + memory/*.md）
   - 无匹配结果时引导检查 Auto Memory

5. **spec-writer 新增 Agent Teams 评估**：
   - 规划阶段评估任务是否适合 Agent Teams（可分解性/独立性/复杂度/测试独立性）
   - plan.md 新增「执行模式」章节和 `execution_mode` frontmatter 字段
   - 设计任务拆分方案（队友名称/职责/依赖关系）

6. **spec-executor 双轨工作流**：
   - 路径 A（单 Agent）：保持现有流程不变
   - 路径 B（Agent Teams）：TeamCreate → TaskCreate → 生成队友 → 监控 → 汇总 → TeamDelete
   - 根据 plan.md 的 execution_mode 自动选择路径

7. **spec-updater 双轨工作流**：
   - 同 spec-executor 的双轨改造
   - 路径 B 增加回归测试和 spec-reviewer 审查

8. **skill-creator 增强**：
   - 创建 Skill 时评估是否需要 `.claude/rules/` 摘要文件
   - 规范摘要不超过 20 行，引用 Skill 获取详情

9. **Skill 模块化重构**（遵循 skill-creator 渐进式披露原则）：
   - spec-writer：592 → 116 行（-80%），提取 `references/plan-template.md` + `references/templates.md`
   - spec-executor：1224 → 238 行（-80%），提取 `references/` 模板
   - spec-updater：1257 → 104 行（-92%），提取 `references/` 模板
   - spec-reviewer：690 → 94 行（-86%），提取 `references/review-template.md`
   - 删除所有 Skill 中的 README.md、EXAMPLES.md 等辅助文件
   - Frontmatter 统一只保留 `name` + `description`（移除 `allowed-tools`、`model`）

**信息分层架构**：

```
CLAUDE.md          → 项目身份 + 路由（@import .claude/rules/）
.claude/rules/     → 永久性编码规范（每文件 ≤ 20 行）
MEMORY.md          → Auto Memory 跨会话记忆（Claude 自主管理）
exp/               → 项目级结构化经验（显式层）
skills/            → 工作流程定义（按需加载）
```

### v1.3 (2026-01-28) - 归档与经验沉淀闭环

**核心改进**：

1. **spec-executor 归档前自动触发经验反思**：
   - 用户确认 summary.md 后，必须调用 `/exp-reflect` 进行经验反思
   - 解决了「归档只是移动文件，不是学习」的问题
   - 将执行过程中的知识转化为可复用经验

2. **summary.md 通过双链引用沉淀的经验**：
   - 文档关联章节新增「沉淀经验」字段
   - 使用 `[[spec/context/experience/exp-xxx-标题|EXP-xxx 标题]]` 格式引用
   - 实现 Spec 文档与经验记忆的关联

3. **经验记忆目录迁移到 spec/ 下**：
   - 路径从 `context/experience/` 改为 `spec/context/experience/`
   - 记忆系统与 Spec 工作流保持一致的目录结构
   - 更新了 exp-search、exp-reflect、exp-write 的路径引用

4. **执行前检索历史经验，形成完整闭环**：
   - spec-executor、spec-updater、spec-debugger 新增检索历史经验步骤
   - 开发/更新/调试前调用 `/exp-search` 检索相关经验，避免重复踩坑
   - 形成闭环：开发前检索（exp-search）→ 开发后反思（exp-reflect）

**更新的流程**：

```
读取并理解 plan.md
    ↓
检索历史经验（exp-search）  ← 新增
    ↓
创建任务清单并实现
    ↓
用户确认 summary.md
    ↓
调用 exp-reflect 进行经验反思
    ↓
如有经验沉淀，更新 summary.md 添加经验引用
    ↓
移动到 spec/06-已归档
```

### v1.2 (2026-01-28) - 经验管理系统重构

**重大变更**：

1. **废弃 memory Skill，拆分为三个独立 Skill**：
   - `exp-search` - 经验检索，支持三层记忆检索
   - `exp-reflect` - 经验反思，分析对话提取可沉淀的经验
   - `exp-write` - 经验写入，将经验写入文件并更新索引

2. **新增 context/experience/ 目录**：
   - 经验记忆从 CLAUDE.md 迁移到独立文件
   - 索引全量加载，详情按需检索，避免上下文膨胀
   - 文件使用中文命名：`exp-xxx-标题.md`

3. **明确经验记忆与 SOP 的边界**：
   - **经验记忆**：知识点、决策依据、踩坑经验（核心是"为什么"）
   - **程序记忆（SOP）**：可重复执行的操作流程（核心是"怎么做"）

4. **SOP 判断标准**：
   - 有明确的触发动作（如"部署"、"发布"）
   - 有可机械执行的步骤序列
   - 核心是"怎么做"而非"为什么"

5. **新增 spec-debugger Skill**：
   - 诊断并修复 Spec 执行过程中发现的问题
   - 不修改已确认的 plan.md，创建独立的 debug 文档
   - 保持设计的可追溯性

6. **新增 agent-browser Skill**：
   - 基于 agent-browser CLI 的无头浏览器自动化
   - 支持网页交互、表单填写、截图等操作

7. **优化 spec-executor 流程**：
   - 简化确认流程：summary.md 确认后直接归档
   - spec-reviewer 改为可选步骤，用户需要时单独调用

**参考**：
- [认知重建：Speckit 用了三个月，我放弃了](https://zhuanlan.zhihu.com/p/1993009461451831150)

### v1.1 (2026-01-16)

- 初始版本
- Spec 驱动式开发工作流
- 三层记忆架构（memory Skill）


