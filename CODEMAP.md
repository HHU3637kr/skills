# Codemap - R&K Flow

## 项目总览

本仓库是 **R&K Flow Spec 驱动式开发 Skills 体系**的源码目录。它主要由 Markdown Skill 定义、引用模板和 npm 安装脚本组成，用于把一套项目级 Spec 工作流安装到目标项目的 `.agents/skills/` 中。

**仓库地址**：`github.com/HHU3637kr/skills`
**当前分支**：`master`
**文档口径**：v2.4.1
**npm package**：`@rnking3637/rk-flow` v2.3.0

核心架构与 README 保持一致：
- 5 阶段 Spec 工作流：需求对齐 → 探索/设计/测试计划 → 实现 → 测试/调试/审查 → 收尾
- 7 个项目级角色：explorer、writer、tester、executor、debugger、reviewer、ender
- TeamLead 是当前主 Agent，不额外创建 TeamLead 子 Agent
- 每个 Spec 使用角色目录保存产物，并由 `lead/team-context.md` 记录运行账本
- Claude Code、Codex 或其他 CLI 只作为运行时适配层，核心协议保持中立

---

## 安装入口

```
skills/
├── package.json              # npm package 元数据，bin 指向 bin/cli.js
├── bin/
│   └── cli.js                # rk-flow init 安装入口
├── README.md                 # 总体说明和工作流规范
└── CODEMAP.md                # 本文件
```

`rk-flow init` 的目标是把核心 Skills 复制到目标项目 `.agents/skills/`，并引导目标项目通过薄入口 `AGENTS.md` 加载 `.agents/rules/` 和 `.agents/skills/`。

---

## 核心目录地图

```
skills/
├── spec-init/                         # 项目首次接入 R&K Flow
│   ├── SKILL.md                       # 创建项目骨架、角色定义、运行时适配和 Hook 协议
│   └── references/
│       ├── project-agent-roles.md     # 7 个项目级角色的中立定义与 Claude/Codex 适配模板
│       ├── team-context-hook-contract.md # lead/team-context.md 自动记账的中立 Hook 协议
│       └── runtime-hook-examples.md      # Claude Code / Codex 项目级 Hook 配置样例
│
├── spec-start/                        # 每次启动新 Spec
│   └── SKILL.md                       # 创建分支、角色目录、Team Context，启动阶段二
│
├── spec-explore/                      # spec-explorer
│   └── SKILL.md                       # 经验检索 + 代码探索 → explorer/exploration-report.md
│
├── spec-write/                        # spec-writer
│   ├── SKILL.md                       # 撰写 writer/plan.md
│   └── references/
│       ├── plan-template.md           # writer/plan.md 模板
│       └── templates.md               # 设计文档辅助模板
│
├── spec-test/                         # spec-tester
│   ├── SKILL.md                       # tester/test-plan.md + tester/test-report.md
│   └── references/
│       └── web-e2e-testing.md         # Web E2E 测试策略
│
├── spec-execute/                      # spec-executor
│   ├── SKILL.md                       # 按 writer/plan.md 实现 → executor/summary.md
│   └── references/
│       └── summary-template.md
│
├── spec-debug/                        # spec-debugger
│   ├── SKILL.md                       # 诊断/修复 bug → debugger/debug-*.md
│   └── references/
│       └── debug-template.md
│
├── spec-review/                       # spec-reviewer
│   ├── SKILL.md                       # 审查 Spec 执行情况 → reviewer/review.md
│   └── references/
│       └── review-template.md
│
├── spec-end/                          # spec-ender
│   └── SKILL.md                       # 经验沉淀、规范审查、归档、提交、推送、PR
│
├── spec-update/                       # 同一活跃 Spec 内的小迭代
│   ├── SKILL.md
│   └── references/
│       ├── update-template.md         # updater/update-xxx.md 模板
│       └── summary-template.md        # updater/update-xxx-summary.md 模板
│
├── exp-search/                        # 显式记忆检索
├── exp-reflect/                       # Spec 收尾经验反思与分流
├── exp-write/                         # 写入 experience/knowledge
├── git-work/                          # GitHub Flow 分支、提交、推送、PR
├── intent-confirmation/               # 前置意图确认
├── obsidian-markdown/                 # Obsidian Markdown 支持
├── obsidian-bases/                    # Obsidian Bases 支持
├── obsidian-plugin-dev/               # Obsidian 插件开发参考
├── json-canvas/                       # JSON Canvas 支持
├── skill-creator/                     # Skill 创建/验证工具
└── find-skills/                       # Skill 生态发现
```

仓库中还包含若干独立领域 Skill（如 frontend、fullstack、mobile、office、nuwa、perspective 等），它们不属于 R&K Flow 核心链路，但可以被具体 Spec 在探索、实现或测试阶段按需调用。

---

## Agent Teams 架构地图

### 项目初始化产物

`spec-init` 在目标项目中创建或补齐以下结构：

```
<project>/
├── AGENTS.md                         # 项目身份 + 入口清单 + 路由
├── .agents/
│   ├── rules/                        # 长期规则、项目偏好、前端风格
│   │   ├── coding-style.md
│   │   ├── project-preferences.md
│   │   ├── spec-workflow.md
│   │   ├── documentation.md
│   │   └── git-workflow.md
│   ├── skills/
│   ├── roles/
│   │   ├── spec-explorer.md
│   │   ├── spec-writer.md
│   │   ├── spec-tester.md
│   │   ├── spec-executor.md
│   │   ├── spec-debugger.md
│   │   ├── spec-reviewer.md
│   │   └── spec-ender.md
│   └── hooks/
│       └── team-context-hook-contract.md
├── .claude/
│   ├── settings.json                  # Claude Code 项目级 Hook 配置（如需）
│   └── agents/<role-id>.md            # Claude Code 项目 Agent 适配
├── .codex/
│   ├── agents/<role-id>.toml          # Codex 项目 Agent 适配
│   ├── hooks.json                     # Codex 项目级 Hook 配置（如需）
│   └── config.toml
└── spec/
    └── context/
        ├── experience/
        └── knowledge/
```

`.agents/roles/` 是角色定义的权威来源；`.claude/`、`.codex/` 只是运行时适配层。Codex agent 文件名使用 hyphenated role id，TOML `name` 使用 snake_case，例如 `spec-explorer.toml` 中 `name = "spec_explorer"`。

### 运行时角色

| 角色 | Skill | 主要产物 | 运行时规则 |
|------|-------|----------|------------|
| TeamLead | `spec-start`, `intent-confirmation` | `lead/team-context.md` | 当前主 Agent，负责阶段、门禁、handoff、用户交互 |
| spec-explorer | `spec-explore` | `explorer/exploration-report.md` | 收集背景和风险，结果交回 TeamLead |
| spec-writer | `spec-write` | `writer/plan.md` | 只写实现方案，不写测试计划 |
| spec-tester | `spec-test` | `tester/test-plan.md`, `tester/test-report.md` | 设计和执行测试，不直接修 bug |
| spec-executor | `spec-execute` | `executor/summary.md` | 严格按 plan 实现，不提交不归档 |
| spec-debugger | `spec-debug` | `debugger/debug-*.md`, `debugger/debug-*-fix.md` | 不改已确认 plan，修复后交 TeamLead 重新验证 |
| spec-reviewer | `spec-review` | `reviewer/review.md`, `reviewer/update-*-review.md` | 审查一致性、完成度、风险和测试缺口 |
| spec-ender | `spec-end` | `ender/end-report.md` | 收尾、沉淀、规范审查、归档、PR |

---

## Skills 体系组成

### 1. Spec 核心工作流

```
spec-init
  ↓
spec-start → git-work → lead/team-context.md
  ↓
阶段一：TeamLead + intent-confirmation
  ↓
阶段二：spec-explore → spec-write ↔ spec-test
  ↓
阶段三：spec-execute
  ↓
阶段四：spec-test ↔ spec-debug，可选 spec-review
  ↓
阶段五：spec-end → exp-reflect / exp-write → git-work
```

`spec-update` 是同一活跃 Spec 分支内的小迭代流程，不创建新 Spec，不归档；它读取 `lead/team-context.md` 的分支信息，把更新产物写入 `updater/`，并可由 `spec-review` 产出 `reviewer/update-xxx-review.md`。

### 2. 经验管理

| Skill | 作用 | 存储 |
|-------|------|------|
| `exp-search` | 检索经验、知识、SOP、工具记忆和可读的运行时原生记忆 | 只读检索 |
| `exp-reflect` | 从 Spec 文档中判断是否沉淀经验、知识、SOP、工具记忆或项目规则 | 收尾/更新时触发 |
| `exp-write` | 写入经验或知识并维护索引 | `spec/context/experience/`, `spec/context/knowledge/` |

### 3. Obsidian 支持

| Skill | 作用 |
|-------|------|
| `obsidian-markdown` | Obsidian Flavored Markdown、wikilink、callout、frontmatter |
| `obsidian-bases` | 动态索引和状态视图 |
| `json-canvas` | Canvas 可视化图 |
| `obsidian-plugin-dev` | 插件开发参考 |

### 4. 辅助能力

| Skill | 作用 |
|-------|------|
| `intent-confirmation` | 在理解风险较高时对齐用户意图 |
| `git-work` | 创建 Spec 分支、提交、推送、PR |
| `skill-creator` | 创建或维护 Skill |
| `find-skills` | 发现外部 Skill |

---

## Spec 目录与产物

目标项目中的每个 Spec 目录按角色组织：

```
spec/<01-05分类>/<YYYYMMDD-HHMM-中文任务描述>/
├── lead/
│   └── team-context.md
├── explorer/
│   └── exploration-report.md
├── writer/
│   └── plan.md
├── tester/
│   ├── test-plan.md
│   ├── test-report.md
│   └── artifacts/
│       └── test-logs/<run-id>/
├── executor/
│   └── summary.md
├── debugger/
│   ├── debug-001.md
│   └── debug-001-fix.md
├── reviewer/
│   ├── review.md
│   └── update-001-review.md
├── updater/
│   ├── update-001.md
│   └── update-001-summary.md
└── ender/
    └── end-report.md
```

`tester/artifacts/test-logs/<run-id>/` 中的日志和 JSON 证据应由测试代码或测试运行自动生成，不由 Agent 手工编写。

---

## Team Context 数据结构

`lead/team-context.md` 是当前 Spec 的运行账本和 Git/PR 元数据权威来源。

| 区块 | 维护者 | 用途 |
|------|--------|------|
| frontmatter | TeamLead | `runtime`, `git_branch`, `base_branch`, `pr_url`, `phase`, `status` |
| Current Run Path | TeamLead | 当前任务实际走过的阶段路径 |
| Task Progress | 各角色共享 | 各角色只追加或更新自己负责的任务行 |
| Problem Resolution Log | 各角色共享 | 发现/解决问题的角色维护自己相关的问题行 |
| Runtime Handles | TeamLead | 记录 agent/thread/session handle |
| Artifact Registry | TeamLead | 产物路径、状态、是否确认 |
| Gate Decisions | TeamLead | 用户确认门禁 |
| Handoffs | TeamLead | 跨角色交接 |
| Open Questions / Blockers | TeamLead | 阻塞和开放问题 |
| Next Action | TeamLead | 下一步动作 |

Hook 适配器只能记录事实事件，例如 artifact 写入、角色启动/结束、PR URL 更新、时间戳更新。门禁决策、业务结论、handoff 原因和下一步动作必须由 TeamLead 或对应角色明确维护。

---

## 数据流

### 文档产出流

```
spec-start     → lead/team-context.md
spec-explore   → explorer/exploration-report.md
spec-write     → writer/plan.md
spec-test      → tester/test-plan.md
spec-execute   → executor/summary.md
spec-test      → tester/test-report.md + tester/artifacts/test-logs/<run-id>/
spec-debug     → debugger/debug-*.md + debugger/debug-*-fix.md
spec-review    → reviewer/review.md 或 reviewer/update-*-review.md
spec-update    → updater/update-*.md + updater/update-*-summary.md
spec-end       → ender/end-report.md + archive / PR
exp-write      → spec/context/experience/*.md 或 spec/context/knowledge/*.md
```

### Git 数据流

```
新 Spec：
  spec-start → git-work 创建 <type>/spec-<timestamp>-<slug>
             → lead/team-context.md 记录 git_branch / base_branch / pr_url
             → spec-end → git-work commit + push + PR
             → lead/team-context.md 写回 pr_url

同一 Spec 更新：
  spec-update → 读取 lead/team-context.md 校验当前分支
              → updater/update-xxx.md / updater/update-xxx-summary.md
              → 必要时 reviewer/update-xxx-review.md
              → git-work commit + push；必要时创建或更新 PR
              → lead/team-context.md 写回 pr_url
```

### 跨角色通信流

```
上游角色 → TeamLead：
  产物路径 + 结论 + 风险 + 建议下游角色

TeamLead → 下游角色：
  lead/team-context.md + 必要上游产物 + 明确任务

下游角色 → TeamLead：
  产物路径 + 状态 + 需要的 handoff 或 blocker
```

直接 Agent-to-Agent 通信不是协议要求。即使运行环境支持直接发消息，也应由 TeamLead 维护 `lead/team-context.md` 的控制面。

### Hook 数据流

```
Claude Code / Codex 原生 Hook
  ↓ 运行时适配器
.agents/hooks/team-context-hook-contract.md 中立事件
  ↓
lead/team-context.md 的事实字段
```

若当前 CLI 不支持 Hook，则保留中立协议，降级为 TeamLead 和各角色手动维护。

---

## 依赖关系

| Skill | 直接依赖/常用协作 | 被谁调用 |
|-------|------------------|----------|
| `spec-init` | `find-skills`, `project-agent-roles.md`, `team-context-hook-contract.md`, `runtime-hook-examples.md` | 用户一次性调用 |
| `spec-start` | `intent-confirmation`, `git-work` | 用户启动新 Spec |
| `spec-explore` | `exp-search` | TeamLead |
| `spec-write` | `obsidian-markdown`, `spec-test` 协作 | TeamLead |
| `spec-test` | `spec-debug` handoff, 测试工具链 | TeamLead |
| `spec-execute` | `exp-search`, `writer/plan.md` | TeamLead |
| `spec-debug` | `spec-test` 复验 | TeamLead |
| `spec-review` | `obsidian-markdown` | TeamLead 或用户可选调用 |
| `spec-end` | `exp-reflect`, `git-work` | TeamLead |
| `spec-update` | `git-work`, `spec-review`, `exp-reflect` | 用户在活跃 Spec 分支调用 |
| `exp-reflect` | `exp-write`, `skill-creator` | `spec-end`, `spec-update` |
| `git-work` | Git CLI / GitHub Flow | `spec-start`, `spec-end`, `spec-update` |

---

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| Skill 定义 | Markdown `SKILL.md` | YAML frontmatter + 工作流协议 |
| 文档系统 | Obsidian | wikilink、callout、frontmatter、Bases |
| 数据格式 | Markdown, YAML, JSON Canvas | 文档和可视化结构 |
| 版本控制 | Git / GitHub Flow | Spec 分支、提交、推送、PR |
| AI 运行时 | Claude Code / Codex / compatible coding agents | 项目级 Agent、Hook、resume 能力按环境适配 |
| 安装分发 | npm CLI | `rk-flow init` |

---

## 维护要点

- README 是最高层叙事文档；CODEMAP 按 README 的组织方式维护源码地图。
- 新增或修改核心 Skill 时，同步更新 README 的 Skills 表、Spec 目录结构和本 CODEMAP。
- 修改角色协议时，优先更新 `spec-init/references/project-agent-roles.md`，再同步 Claude Code / Codex 适配说明。
- 修改 Team Context 字段或 Hook 行为时，优先更新 `spec-init/references/team-context-hook-contract.md`、`spec-init/references/runtime-hook-examples.md` 和 `spec-start/SKILL.md`。
- `AGENTS.md` 保持薄入口定位；详细规则、项目偏好和前端风格落在 `.agents/rules/`。
- 不把运行时临时上下文当成长期状态；长期状态必须落在 Spec 目录、`.agents/roles/`、`.agents/rules/` 或显式记忆系统中。
- 测试证据目录中的日志和 JSON 应由测试运行自动生成，Agent 不应手写测试日志冒充证据。
