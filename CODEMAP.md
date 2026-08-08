# Codemap - R&K Flow

## 项目总览

本仓库是 **R&K Flow Spec 驱动式开发 Skills 体系**的源码目录。它由 Markdown Skill 定义和引用模板组成，直接 `git clone` 到目标项目的 `.agents/skills/`，运行时目录通过软链接共享同一份副本。

**仓库地址**：`github.com/HHU3637kr/skills`
**当前分支**：`master`
**文档口径**：v2.7.0
**分发方式**：git clone + 软链接（不走 npm）

核心架构与 README 保持一致：
- 5 阶段 Spec 工作流：需求对齐 → 探索/设计/测试计划 → 实现 → 测试/调试/审查 → 收尾
- 7 个项目级角色：explorer、writer、tester、executor、debugger、reviewer、ender
- TeamLead 是当前主 Agent，不额外创建 TeamLead 子 Agent
- 每个 Spec 使用角色目录保存产物，并由 `lead/team-context.md` 记录运行账本
- 运行时适配层保持中立，OMP（Oh My Pi）为**推荐运行时**（首选）：`.omp/agents/` 角色定义；Claude Code、Codex 等为备选。OMP 16.4+：`task` 用 batch schema、角色 **默认省略 `tools`（继承完整工具集）**、产品边界靠 role rules、`model` 按需

---

## 安装入口

```
skills/
├── package.json              # 版本元数据（private，不发布 npm）
├── README.md                 # 总体说明和工作流规范
└── CODEMAP.md                # 本文件
```

安装方式是把本仓库 `git clone` 到目标项目的 `.agents/skills/`，再把 `.claude/skills`、`.codex/skills`、`.omp/skills` 软链接到该目录；目标项目通过薄入口 `AGENTS.md` 加载 `.agents/rules/` 和 `.agents/skills/`。更新用 `git pull`，软链接自动同步。

---

## 核心目录地图

```
skills/
├── spec-init/                         # 项目首次接入 R&K Flow
│   ├── SKILL.md                       # 创建项目骨架、角色定义和运行时适配
│   └── references/
│       └── project-agent-roles.md     # 7 个项目级角色中立定义 + OMP/Claude/Codex 适配（默认 omit tools）
│
├── spec-start/                        # 每次启动新 Spec
│   └── SKILL.md                       # 创建分支、角色目录、Team Context，启动阶段二
│
├── spec-explore/                      # spec-explorer
│   └── SKILL.md                       # 经验检索 + 代码探索 → explorer/exploration-report.html
│
├── spec-write/                        # spec-writer
│   ├── SKILL.md                       # 撰写 writer/plan.html
│   └── references/
│       ├── plan-template.html         # writer/plan.html 模板
│       └── templates.md               # 设计文档辅助模板
│
├── spec-test/                         # spec-tester
│   ├── SKILL.md                       # tester/test-plan.html + tester/test-report.html
│   └── references/
│       └── web-e2e-testing.md         # Web E2E 测试策略
│
├── spec-execute/                      # spec-executor
│   ├── SKILL.md                       # 按 writer/plan.html 实现 → executor/summary.html
│   └── references/
│       └── summary-template.html      # executor/summary.html 模板
│
├── spec-debug/                        # spec-debugger
│   ├── SKILL.md                       # 诊断/修复 bug → debugger/debug-*.html
│   └── references/
│       └── debug-template.html        # debug-001.html + debug-001-fix.html 骨架
│
├── spec-review/                       # spec-reviewer
│   ├── SKILL.md                       # 审查 Spec 执行情况 → reviewer/review.html
│   └── references/
│       └── review-template.html       # review.html + update-XXX-review.html 骨架
│
├── spec-end/                          # spec-ender
│   └── SKILL.md                       # 经验沉淀、规范审查、归档、提交、推送、PR
│
├── spec-update/                       # 同一活跃 Spec 内的小迭代
│   ├── SKILL.md
│   └── references/
│       ├── update-template.html       # updater/update-xxx.html 模板
│       └── summary-template.html      # updater/update-xxx-summary.html 模板
│
├── exp-search/                        # 显式记忆检索
├── exp-reflect/                       # Spec 收尾经验反思与分流
├── exp-write/                         # 写入 experience/knowledge
├── git-work/                          # GitHub Flow 分支、提交、推送、PR
├── intent-confirmation/               # 前置意图确认
├── loop-design/                       # 把重复任务设计成有边界的 Loop
│   ├── SKILL.md                       # 交互式产出 loop 定义（只产出不执行）
│   └── references/
│       └── loop-definition-template.md
├── html-report/                       # 报告 HTML 契约与共享资产
│   ├── SKILL.md                       # 固定骨架、修订规范、组件、双向关联
│   ├── assets/                        # rk-report.css（唯一样式源）+ rk-report.js（三视图）
│   └── example/                       # 已验证的完整报告范例
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
│   └── roles/
│       ├── spec-explorer.md
│       ├── spec-writer.md
│       ├── spec-tester.md
│       ├── spec-executor.md
│       ├── spec-debugger.md
│       ├── spec-reviewer.md
│       └── spec-ender.md
├── .claude/
│   └── agents/<role-id>.md            # Claude Code 项目 Agent 适配
├── .codex/
│   ├── agents/<role-id>.toml          # Codex 项目 Agent 适配
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
| TeamLead | `spec-start`, `intent-confirmation` | `lead/team-context.md` | 当前主 Agent，负责阶段、门禁、handoff、用户交互；OMP 下即 OMP 主 Agent，用 `task` spawn 角色、`irc` 协作 |
| spec-explorer | `spec-explore` | `explorer/exploration-report.html` | 收集背景和风险，结果交回 TeamLead |
| spec-writer | `spec-write` | `writer/plan.html` | 只写实现方案，不写测试计划 |
| spec-tester | `spec-test` | `tester/test-plan.html`, `tester/test-report.html` | 设计和执行测试，不直接修 bug |
| spec-executor | `spec-execute` | `executor/summary.html` | 严格按 plan 实现，不提交不归档 |
| spec-debugger | `spec-debug` | `debugger/debug-*.html`, `debugger/debug-*-fix.html` | 不改已确认 plan，修复后交 TeamLead 重新验证 |
| spec-reviewer | `spec-review` | `reviewer/review.html`, `reviewer/update-*-review.html` | 审查一致性、完成度、风险和测试缺口 |
| spec-ender | `spec-end` | `ender/end-report.html` | 收尾、沉淀、规范审查、归档、PR |

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

`spec-update` 是同一活跃 Spec 分支内的小迭代流程，不创建新 Spec，不归档；它读取 `lead/team-context.md` 的分支信息，把更新产物写入 `updater/`，并可由 `spec-review` 产出 `reviewer/update-xxx-review.html`。

### 2. 经验管理

| Skill | 作用 | 存储 |
|-------|------|------|
| `exp-search` | 检索经验、知识、SOP、工具记忆和可读的运行时原生记忆 | 只读检索 |
| `exp-reflect` | 从 Spec 文档中判断是否沉淀经验、知识、SOP、工具记忆或项目规则 | 收尾/更新时触发 |
| `exp-write` | 写入经验或知识并维护索引 | `spec/context/experience/`, `spec/context/knowledge/` |

### 3. 报告与呈现

| Skill | 作用 |
|-------|------|
| `html-report` | HTML 报告契约：固定骨架与样式、重点组件、`ins`/`del` 修订标记与三视图、`rk:*` 元数据、双向关联 |

### 4. 辅助能力

| Skill | 作用 |
|-------|------|
| `intent-confirmation` | 在理解风险较高时对齐用户意图 |
| `loop-design` | 把重复任务设计成有边界的 Loop，产出 loop 定义（运行契约 + 预算），只产出不执行 |
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
│   └── exploration-report.html
├── writer/
│   └── plan.html
├── tester/
│   ├── test-plan.html
│   ├── test-report.html
│   └── artifacts/
│       └── test-logs/<run-id>/
├── executor/
│   └── summary.html
├── debugger/
│   ├── debug-001.html
│   └── debug-001-fix.html
├── reviewer/
│   ├── review.html
│   └── update-001-review.html
├── updater/
│   ├── update-001.html
│   └── update-001-summary.html
└── ender/
    └── end-report.html
```

`tester/artifacts/test-logs/<run-id>/` 中的日志和 JSON 证据应由测试代码或测试运行自动生成，不由 Agent 手工编写。

---

## Team Context 数据结构

`lead/team-context.md` 是当前 Spec 的运行账本和 Git/PR 元数据权威来源。

| 区块 | 维护者 | 用途 |
|------|--------|------|
| frontmatter | TeamLead | `runtime`, `git_branch`, `base_branch`, `pr_url`, `phase`, `status` |
| 当前运行路径 | TeamLead | 当前任务实际走过的阶段路径 |
| 任务进度 | 各角色共享 | 各角色只追加或更新自己负责的任务行 |
| 问题闭环记录 | 各角色共享 | 发现/解决问题的角色维护自己相关的问题行；「分类」覆盖 bug/blocker/process/env/dependency/scope 等过程性问题 |
| 决策记录 | 各角色共享 | 拍板方记录每个实质取舍的候选项/结论/理由；用户决策由 TeamLead 代记 |
| 角色运行句柄 | TeamLead | 记录 agent/thread/session handle |
| 产物注册表 | TeamLead | 产物路径、状态、是否确认 |
| 门禁决策 | TeamLead | 用户确认门禁（只记通过/驳回，理由在「决策记录」） |
| 修复循环预算 | TeamLead + tester/debugger | 修复循环（test-debug）预算：最大轮数 / 最大无进展轮数由用户在进入循环前确认；已用轮数 / 连续无进展每轮由 tester/debugger 更新 |
| 角色交接 | TeamLead | 跨角色交接 |
| 开放问题与阻塞 | TeamLead | 阻塞和开放问题 |
| 下一步动作 | TeamLead | 下一步动作 |

全部区块由 TeamLead 和各角色手动维护：产物落盘、问题闭环、取舍拍板后立即更新对应区块，不依赖自动记账。

---

## 数据流

### 文档产出流

```
spec-start     → lead/team-context.md
spec-explore   → explorer/exploration-report.html
spec-write     → writer/plan.html
spec-test      → tester/test-plan.html
spec-execute   → executor/summary.html
spec-test      → tester/test-report.html + tester/artifacts/test-logs/<run-id>/
spec-debug     → debugger/debug-*.html + debugger/debug-*-fix.html
spec-review    → reviewer/review.html 或 reviewer/update-*-review.html
spec-update    → updater/update-*.html + updater/update-*-summary.html
spec-end       → ender/end-report.html + archive / PR
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
              → updater/update-xxx.html / updater/update-xxx-summary.html
              → 必要时 reviewer/update-xxx-review.html
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

---

## 依赖关系

| Skill | 直接依赖/常用协作 | 被谁调用 |
|-------|------------------|----------|
| `spec-init` | `find-skills`, `project-agent-roles.md` | 用户一次性调用 |
| `spec-start` | `intent-confirmation`, `git-work` | 用户启动新 Spec |
| `spec-explore` | `exp-search` | TeamLead |
| `spec-write` | `html-report`, `spec-test` 协作 | TeamLead |
| `spec-test` | `spec-debug` handoff, 测试工具链 | TeamLead |
| `spec-execute` | `exp-search`, `writer/plan.html` | TeamLead |
| `spec-debug` | `spec-test` 复验 | TeamLead |
| `spec-review` | `html-report` | TeamLead 或用户可选调用 |
| `spec-end` | `exp-reflect`, `git-work` | TeamLead |
| `spec-update` | `git-work`, `spec-review`, `exp-reflect` | 用户在活跃 Spec 分支调用 |
| `exp-reflect` | `exp-write`, `skill-creator` | `spec-end`, `spec-update` |
| `loop-design` | `intent-confirmation`, `spec-start`（修复循环预算）, `skill-creator` | 用户在需要设计循环时调用 |
| `git-work` | Git CLI / GitHub Flow | `spec-start`, `spec-end`, `spec-update` |

---

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| Skill 定义 | Markdown `SKILL.md` | YAML frontmatter + 工作流协议 |
| 报告格式 | HTML | 固定样式 + `ins`/`del` 修订标记 + 三视图 + 双向关联 |
| 数据格式 | Markdown, YAML | 账本/记忆文档与元数据结构 |
| 版本控制 | Git / GitHub Flow | Spec 分支、提交、推送、PR |
| AI 运行时 | OMP / Claude Code / Codex / compatible coding agents | 项目级 Agent、resume 能力按环境适配 |
| 安装分发 | git clone + 软链接 | 克隆到 `.agents/skills/`，运行时目录软链接共享；`git pull` 更新 |

---

## 维护要点

- README 是最高层叙事文档；CODEMAP 按 README 的组织方式维护源码地图。
- 7 个核心工作流 Skill 和 3 个记忆管理 Skill（exp-search/exp-reflect/exp-write）标题后都有一张「运行契约」表（输入/权限/验证/停止/升级）；修改这些 Skill 的职责或边界时，同步更新其运行契约表。
- 新增或修改核心 Skill 时，同步更新 README 的 Skills 表、Spec 目录结构和本 CODEMAP。
- 修改角色协议时，优先更新 `spec-init/references/project-agent-roles.md`，再同步 Claude Code / Codex 适配说明。
- 修改 Team Context 字段时，优先更新 `spec-start/SKILL.md` 的模板，再同步各角色 Skill 的「更新共享区」步骤和本文档的数据结构表。
- `AGENTS.md` 保持薄入口定位；详细规则、项目偏好和前端风格落在 `.agents/rules/`。
- 不把运行时临时上下文当成长期状态；长期状态必须落在 Spec 目录、`.agents/roles/`、`.agents/rules/` 或显式记忆系统中。
- 测试证据目录中的日志和 JSON 应由测试运行自动生成，Agent 不应手写测试日志冒充证据。
