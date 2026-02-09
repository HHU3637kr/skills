# Spec 驱动式开发 - Skills 体系指南

## 概述

本项目构建了一套完整的 Skills 体系，旨在通过 **Obsidian** 实现 **Spec 驱动式开发**方法论。这套体系将 AI Agent 的能力、结构化的文档管理、和可追溯的开发流程融为一体，形成了一个高效、可维护的开发工作流。

## 核心理念

> **Spec First** - 一切从 Spec 开始
> - 先设计，后实现
> - 严格遵循 Spec，不添加额外功能
> - 每个实现都可追溯到 Spec 文档
> - 完整的开发过程记录在 Obsidian 中

## 架构概览

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        Spec 驱动式开发工作流 v1.4                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  用户需求                                                                  │
│      ↓                                                                    │
│  intent-confirmation ←── AI 帮助明确需求                                   │
│      ↓                                                                    │
│  【开发者确认】 ←─────────── 门禁 1：确认理解正确                             │
│      ↓                                                                    │
│  spec-writer ←───────── AI 生成设计方案 + 评估执行模式                      │
│      ↓                                                                    │
│  plan.md（含 execution_mode: single-agent / agent-teams）                  │
│      ↓                                                                    │
│  【开发者确认】 ←─────────── 门禁 2：确认设计合理                             │
│      ↓                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ exp-search ←───────── 检索历史经验，避免重复踩坑                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│      ↓                                                                    │
│  spec-executor 读取 execution_mode                                        │
│      │                                                                    │
│      ├─ single-agent ──→ 路径 A：单 Agent 逐步实现                         │
│      │                                                                    │
│      └─ agent-teams ───→ 路径 B：Agent Teams 并行实现                      │
│                          TeamCreate → TaskCreate → 生成队友                 │
│                          → 并行开发 → 监控汇总 → TeamDelete                 │
│      ↓                                                                    │
│  代码 + summary.md                                                        │
│      ↓                                                                    │
│  【开发者确认】 ←─────────── 门禁 3：确认实现正确                             │
│      ↓                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ exp-reflect ←──────── 反思本次开发，按权重分流经验                     │  │
│  │     ├─ 重大经验 → exp-write（结构化记录到 Obsidian）                   │  │
│  │     └─ 轻量经验 → Auto Memory（Claude 自动管理）                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│      ↓                                                                    │
│  归档到 06-已归档                                                          │
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
│  │  │  exp-* 系统（显式层）— 项目级结构化经验                       │    │  │
│  │  │                                                              │    │  │
│  │  │    ┌──────────┐      ┌──────────┐      ┌──────────┐         │    │  │
│  │  │    │ 经验记忆  │      │ 程序记忆  │      │ 工具记忆  │         │    │  │
│  │  │    │ 困境-策略 │      │   SOP    │      │ 后续动作  │         │    │  │
│  │  │    └────┬─────┘      └────┬─────┘      └────┬─────┘         │    │  │
│  │  │         └─────────────────┼─────────────────┘               │    │  │
│  │  │                           ↓                                  │    │  │
│  │  │  • 重大困境-策略对，需要 Obsidian 双链关联                    │    │  │
│  │  │  • 存储：spec/context/experience/                            │    │  │
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

## Skills 体系组成

### 1. Spec 核心工作流 Skills

这套 Skills 实现了完整的 Spec 驱动开发流程：

| Skill | 功能 | 使用场景 |
|-------|------|----------|
| `spec-writer` | 撰写技术规格文档（plan.md），含执行模式评估 | 创建新功能 Spec，决定单 Agent 或 Agent Teams |
| `spec-executor` | 执行新功能开发（支持双轨工作流） | 基于 plan.md 首次实现，自动选择单 Agent 或 Agent Teams 路径 |
| `spec-updater` | 执行功能更新（支持双轨工作流） | 修改已有功能（不归档） |
| `spec-debugger` | 诊断并修复问题 | 执行后发现问题时，创建 debug 文档 |
| `spec-reviewer` | 审查实现情况 | 可选：用户需要时调用，验证是否严格遵循 Spec |

#### 新功能开发流程

```
用户提出需求
    ↓
【intent-confirmation】确认用户意图 ⚠️
- 需求描述是否清晰？
- 技术方案是否明确？
- 是否有多种理解方式？
    ↓
spec-writer 创建 plan.md
（放入 spec/01-05 分类目录）
（含执行模式评估：单 Agent / Agent Teams）
    ↓
用户确认 Spec
    ↓
spec-executor 读取 execution_mode
    ├─ single-agent → 路径 A：单 Agent 逐步实现
    └─ agent-teams  → 路径 B：创建团队并行实现
    ↓
spec-executor 创建 summary.md
    ↓
用户确认 summary.md
    ↓
【exp-reflect】经验反思（建议性）💡
- 有值得结构化记录的重大经验？→ exp-write
- 日常小经验？→ Auto Memory 自动处理
- 如有经验沉淀，更新 summary.md 添加经验引用（双链）
    ↓
移动到 spec/06-已归档
（Agent Teams 模式会自动关闭团队）

可选：用户可在任意时刻调用 spec-reviewer 进行详细审查
```

#### 问题修复流程

```
执行后发现问题
    ↓
spec-debugger 诊断问题
    ↓
创建 debug-xxx.md（诊断文档）
    ↓
用户确认诊断
    ↓
执行修复
    ↓
创建 debug-xxx-fix.md（修复总结）
    ↓
用户确认修复
    ↓
完成（考虑记录到 memory）
```

> **⚠️ 为什么不直接修改 plan.md？**
>
> plan.md 是已经用户确认的设计文档，不应因为执行问题而被修改。通过创建 debug 文档：
> - 保持设计的完整性和可追溯性
> - 记录问题和修复历史，形成知识库
> - 与 spec-updater 区分（updater 用于主动迭代，debugger 用于被动修复）

> **⚠️ 为什么需要 intent-confirmation？**
>
> 在执行非简单任务前，必须先确认用户意图，避免因理解偏差导致的无效工作。触发条件包括：
> - **抽象需求**：需求描述较为模糊（如"优化一下这个功能"）
> - **设计决策**：涉及架构变更或设计选择
> - **多义表达**：用户表达可能有多种理解
> - **大范围影响**：任务影响范围较大

#### 功能更新流程

```
发现需要修改已有功能
    ↓
【intent-confirmation】确认更新意图 ⚠️
- 更新范围是否明确？
- 是否影响现有功能？
- 是否需要回归测试？
    ↓
spec-writer 创建 update-xxx.md
（放在原 Spec 目录，含执行模式评估）
    ↓
用户确认更新方案
    ↓
spec-updater 读取 execution_mode
    ├─ single-agent → 路径 A：单 Agent 逐步更新
    └─ agent-teams  → 路径 B：创建团队并行更新
    ↓
spec-updater 创建 update-xxx-summary.md
    ↓
用户确认
    ↓
完成（不归档，保留在原目录）
（Agent Teams 模式会自动关闭团队）

可选：用户可在任意时刻调用 spec-reviewer 进行详细审查
```

### 2. Obsidian 支持 Skills

| Skill | 功能 | 在 Spec 流程中的作用 |
|-------|------|---------------------|
| `obsidian-markdown` | 创建和编辑 Obsidian Flavored Markdown | 所有 Spec 文档的格式基础 |
| `obsidian-bases` | 创建和管理数据库视图 | 动态 Spec 索引、状态跟踪 |
| `json-canvas` | 创建可视化 Canvas | Spec 依赖关系图、架构图 |

### 3. Obsidian 插件开发支持

| Skill | 功能 | 使用场景 |
|-------|------|----------|
| `obsidian-plugin-dev` | Obsidian 插件开发指南 | 开发 Obsidian 插件时参考 |

### 4. 辅助 Skills

| Skill | 功能 | 在 Spec 流程中的作用 |
|-------|------|---------------------|
| `intent-confirmation` | 确认用户意图 | **在执行任务前**避免理解偏差，确保 Agent 正确理解需求 |
| `git-workflow-sop` | Git 操作规范 | 提交代码、同步仓库 |
| `exp-search` | 经验检索 | 检索四层记忆（经验+SOP+工具记忆+Auto Memory 只读） |
| `exp-reflect` | 经验反思 | 分析对话提取经验，按权重分流到 exp-write 或 Auto Memory |
| `exp-write` | 经验写入 | 将重大经验写入 exp/ 文件并更新索引（不写 MEMORY.md） |
| `skill-creator` | 创建新 Skill 的指南 | 扩展能力时参考 |

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
    └── experience/      # 经验记忆存储（显式层）
        ├── index.md     # 经验索引
        └── exp-xxx-标题.md  # 经验详情

~/.claude/projects/*/memory/   # Auto Memory（自动层，Claude 自主管理）
    ├── MEMORY.md              # 自动加载到系统提示
    └── *.md                   # 按主题分类的记忆文件
```

每个 Spec 目录遵循以下命名规范：
```
spec/分类目录/YYYYMMDD-HHMM-任务描述/
├── plan.md                    # 设计方案（spec-writer 创建，含 execution_mode）
├── summary.md                 # 实现总结（spec-executor 创建）
├── review.md                  # 审查报告（可选，spec-reviewer 创建）
├── debug-001.md               # 问题诊断（spec-debugger 创建）
├── debug-001-fix.md           # 修复总结（spec-debugger 创建）
├── update-001.md              # 更新方案（spec-writer 创建，含 execution_mode）
├── update-001-summary.md      # 更新总结（spec-updater 创建）
└── update-001-review.md       # 更新审查（可选，spec-reviewer 创建）
```

## Obsidian 在 Spec 流程中的关键作用

### 1. 双链建立文档关联

使用 `[[wikilink]]` 语法建立文档间的关系：

```markdown
## 文档关联

- 设计文档: [[plan|设计方案]]
- 实现总结: [[summary|实现总结]]
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
execution_mode: single-agent / agent-teams
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

## 用户确认机制

### 概述

本项目使用 Claude Code 的原生 `AskUserQuestion` 工具实现 Spec 文档的用户确认工作流。

### 工作流程

```
Claude Code 生成 Spec 文档
       ↓
调用 AskUserQuestion 工具
       ↓
用户在 Claude Code 界面中看到确认选项
       ↓
用户选择确认或修改
       ↓
Claude Code 根据用户选择继续执行或调整
```

### 确认节点

| 节点 | 触发时机 | 确认内容 |
|------|---------|---------|
| **方案确认** | spec-writer 创建 plan.md 后 | 设计方案是否可以开始实现 |
| **实现确认** | spec-executor 创建 summary.md 后 | 实现总结是否正确，可以归档 |
| **更新方案确认** | spec-writer 创建 update-xxx.md 后 | 更新方案是否可以开始执行 |
| **审查确认** | spec-reviewer 创建 review.md 后 | 审查报告是否准确 |
| **诊断确认** | spec-debugger 创建 debug-xxx.md 后 | 问题诊断是否正确 |
| **修复确认** | spec-debugger 创建 debug-xxx-fix.md 后 | 修复结果是否满意 |

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

## 完整工作流示例

### 示例：实现「专业评价 Agent」

#### 步骤 1：创建 Spec（spec-writer）

```bash
用户：我需要实现一个专业评价 Agent

Claude（调用 spec-writer）：
正在创建 plan.md...
路径：spec/03-功能实现/20260109-1430-专业评价Agent设计/plan.md

Spec 已创建，内容包括：
- 需求分析
- 数据模型设计
- 接口定义
- 实现步骤
- 测试计划

请审阅并确认后开始实现。
```

#### 步骤 2：用户确认

```bash
用户：确认，开始实现

Claude（调用 spec-executor）：
开始执行实现...
- [x] 实现 IndicatorParser 类
- [x] 实现 MaterialAnalyzer 类
- [x] 实现 EvaluationAgent 类
- [x] 编写单元测试
- [x] 运行测试验证

已创建 summary.md，记录实现总结。
```

#### 步骤 3：审查实现（spec-reviewer）

```bash
Claude（调用 spec-reviewer）：
正在审查实现...

审查结果：
- ✅ 已完成：8/8 项功能
- ❌ 未完成：0 项
- ⚠️ 不符项：0 项
- ➕ 额外项：0 项

已生成 review.md 审查报告。
请确认后归档到 06-已归档。
```

#### 步骤 4：用户确认并归档

```bash
用户：确认归档

Claude（调用 spec-executor 归档流程）：
正在移动 Spec 文件夹到 06-已归档...
归档完成！
```

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
│  │  exp-* 系统（显式层）— 项目级结构化经验                       │  │
│  │  ├─ 经验记忆：重大困境-策略对 → spec/context/experience/      │  │
│  │  ├─ 程序记忆：可复用 SOP → sop-xxx Skill                     │  │
│  │  ├─ 工具记忆：Skill 后续动作 → Skill 末尾                    │  │
│  │  └─ 覆盖 ~20% 的重要经验，需要 Obsidian 双链关联到 Spec      │  │
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

#### 2. 程序记忆 → SOP Skill

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

#### 3. 工具记忆 → Skill 末尾

**存储位置**：每个 Skill 文件的末尾「后续动作」章节

**加载方式**：随 Skill 一起加载，执行完 Skill 后自动参考

**写入时机**：
- 发现某个操作后总是需要特定的后续步骤
- 工具调用有固定的检查或验证模式
- 一个 Skill 执行后经常需要调用另一个 Skill

### 经验记忆与 SOP 的边界

| 类型 | 核心问题 | 内容特征 | 示例 |
|------|---------|---------|------|
| **经验记忆** | 为什么 | 知识点、决策依据、踩坑经验 | Hook 状态管理原理、指标评估流程理解 |
| **程序记忆（SOP）** | 怎么做 | 可机械执行的步骤序列 | Docker 部署流程、数据库迁移流程 |

### 经验权重分流

`exp-reflect` 会对识别出的经验进行权重判断，自动分流：

| 判断维度 | 重大经验 → exp-write | 轻量经验 → Auto Memory |
|----------|---------------------|------------------------|
| 复杂度 | 涉及多组件协调、非显而易见的解决方案 | 单点技巧、简单调试经验 |
| 关联性 | 需要链接到 Spec/代码文件的结构化记录 | 独立的、无需关联其他文档 |
| 共享性 | 团队/项目级别需要共享的经验 | 个人编码习惯和偏好 |
| 持久性 | 长期有效的架构决策和设计模式 | 临时性的调试技巧 |

### 使用经验管理 Skills

**手动触发**：
```bash
/exp-search <关键词>   # 检索相关经验（含 Auto Memory 只读搜索）
/exp-reflect           # 反思对话，按权重分流到 exp-write 或 Auto Memory
/exp-write             # 写入经验（通常由 exp-reflect 调用）
```

**自动提示**：
- 解决了反复出现的困难问题 → 经验记忆（exp-write）
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

- **命名规范**：`YYYYMMDD-HHMM-任务描述`
- **分类存放**：必须放入对应的分类目录（01-05）
- **双链关联**：使用 `[[wikilink]]` 建立文档关系
- **元数据完整**：每个文档都有完整的 frontmatter

### 4. 质量把关

- **意图确认**：**第一步**就使用 `intent-confirmation` 避免理解偏差
  - 触发条件：抽象需求、设计决策、多义表达、大范围影响
  - 确认方式：复述用户意图、列出关键理解点、询问"是这个意思吗？"
- **用户确认**：每个关键节点都等待用户确认
- **审查机制**：`spec-reviewer` 验证实现是否符合 Spec
- **防止重复**：`exp-search` 检索是否已存在相似经验

## 快速上手

### 新成员入门流程

1. **理解 Spec 驱动开发理念**
   - 阅读 CLAUDE.md 了解项目背景
   - 阅读 spec/ 目录下现有 Spec 了解文档风格

2. **熟悉 Skills 工作流**
   - 阅读 spec-writer 了解如何创建 Spec
   - 阅读 spec-executor 了解如何执行实现
   - 阅读 spec-reviewer 了解如何审查实现

3. **配置 Obsidian**
   - 安装 Obsidian（如需要本地查看）
   - 安装 Obsidian Base 插件（支持 .base 文件）
   - 打开项目根目录作为 Vault

4. **开始第一个 Spec**
   - 使用 spec-writer 创建 plan.md
   - 等待用户确认
   - 使用 spec-executor 执行实现
   - 使用 spec-reviewer 审查实现

### 常见命令速查

```bash
# 在 Claude Code 中调用 Skills

/spec-writer      # 创建 Spec 文档
/spec-executor    # 执行新功能开发
/spec-updater     # 执行功能更新
/spec-reviewer    # 审查实现情况

/memory           # 进入记忆管理模式
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

**版本**: 1.4.1
**最后更新**: 2026-02-09
**维护者**: 项目团队

---

## 更新日志

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
