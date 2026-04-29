---
name: spec-start
description: >
  当用户开始新的开发任务、需要启动完整 Spec 流程（需求对齐→探索→设计→实现→测试→收尾），
  或需要为一个新 Spec 创建协作上下文和 GitHub Flow 工作分支时使用。
  不要用于已有完成 Spec 的小迭代（用 spec-update）或项目首次初始化（用 spec-init）。
---

# Spec Start

## 核心原则

1. **当前 Agent 即是 TeamLead**：调用本 Skill 的 Agent 本身就承担 TeamLead 职责，无需创建额外的 TeamLead 角色
2. **角色定义由 spec-init 持久化**：`spec-start` 只加载和唤起项目级角色，不内联维护角色 prompt
3. **本次 Spec 创建运行实例**：角色线程/实例在当前 Spec 生命周期内尽量保持可恢复，跨 Spec 状态必须文件化
4. **角色 vs Skill 区分**：角色（spec-writer）是 Who，Skill（spec-write）是 How
5. **TeamLead 统一协调**：所有阶段转换、跨角色通信和用户确认节点均由 TeamLead（当前 Agent）主导
6. **分支隔离**：每个 Spec 默认从 `main` 创建独立工作分支，禁止直接在 `main` 上实现

## 前置检查

启动前检查项目是否已初始化：

```bash
ls spec/context/experience/index.md
ls .agents/roles/spec-explorer.md
```

如果 spec/ 目录或 `.agents/roles/` 缺失，提示用户先执行 `/spec-init` 完成项目初始化。若是旧项目已初始化但缺少角色定义，可只补齐 `spec-init` 的项目级角色步骤。

同时检查 Git 状态：

```bash
git rev-parse --is-inside-work-tree
git status --short
```

如果不是 Git 仓库，询问用户是否继续无分支模式；如果工作区有无关改动，先让用户处理或使用 `git worktree`，不要直接切换到 `main`。

## 角色总览

| 角色 | 调用的 Skill | 产出物 | 活跃阶段 |
|------|------------|--------|---------|
| **TeamLead（当前 Agent）** | `intent-confirmation` | `lead/team-context.md` | 全程 |
| spec-explorer | `spec-explore` | `explorer/exploration-report.md` | 阶段二（前置） |
| spec-writer | `spec-write` | `writer/plan.md` | 阶段二 |
| spec-tester | `spec-test` | `tester/test-plan.md`, `tester/test-report.md`, `tester/artifacts/test-logs/` | 阶段二 + 阶段四 |
| spec-executor | `spec-execute` | `executor/summary.md` | 阶段三 |
| spec-debugger | `spec-debug` | `debugger/debug-xxx.md`, `debugger/debug-xxx-fix.md` | 阶段三/四（按需） |
| spec-reviewer | `spec-review` | `reviewer/review.md` | 阶段四后（可选） |
| spec-ender | `spec-end` | `ender/end-report.md` | 阶段五 |

## 工作流程

### 步骤 1：澄清任务需求

使用 `intent-confirmation` 与用户对齐：
- 任务目标和范围
- 是否需要完整的 5 阶段流程，还是部分阶段
- 是否有已有的 Spec（若有，直接进入对应阶段）

### 步骤 2：创建 Spec 工作分支

需求对齐后，调用 `/git-work` 的“启动 Spec 分支”模式：

```text
base_branch: main
branch_name: <type>/spec-<YYYYMMDD-HHMM>-<ascii-slug>
```

分支类型按任务主意图选择：
- 新能力、新集成 → `feat`
- Bug / 回归 / 安全修复 → `fix`
- 不改行为的重构 → `refactor`
- 独立测试、审计证据建设 → `test`
- 文档、规则、Skill 文案 → `docs`
- 依赖、配置、仓库维护 → `chore`

输出以下 Git 元数据，并在步骤 4 写入 `lead/team-context.md`：

```yaml
git_branch: <branch-name>
base_branch: main
pr_url:
```

如果用户确认无分支模式，记录 `git_branch: none` 到 `lead/team-context.md`，并在 `next_action` 或 Blockers 中说明原因。

### 步骤 3：创建 Spec 角色目录并加载项目级角色定义

TeamLead 在阶段二开始前创建当前 Spec 根目录和角色目录。Spec 根目录仍按工作类型分类，目录名仍使用 `YYYYMMDD-HHMM-任务描述`：

```text
spec/<01-05分类>/<YYYYMMDD-HHMM-中文任务描述>/
├── lead/
├── explorer/
├── writer/
├── tester/
│   └── artifacts/
│       └── test-logs/
├── executor/
├── debugger/
├── reviewer/
├── updater/
└── ender/
```

角色产物必须写入各自目录：

| 归属 | 路径 |
|------|------|
| TeamLead | `lead/team-context.md` |
| spec-explorer | `explorer/exploration-report.md` |
| spec-writer | `writer/plan.md` |
| spec-tester | `tester/test-plan.md`, `tester/test-report.md`, `tester/artifacts/test-logs/<run-id>/` |
| spec-executor | `executor/summary.md` |
| spec-debugger | `debugger/debug-xxx.md`, `debugger/debug-xxx-fix.md` |
| spec-reviewer | `reviewer/review.md`, `reviewer/update-xxx-review.md` |
| spec-update | `updater/update-xxx.md`, `updater/update-xxx-summary.md` |
| spec-ender | `ender/end-report.md` |

根目录只作为当前 Spec 容器，不直接平铺角色产物。

### 步骤 4：创建本次 Spec Team Context

```text
创建团队：spec-{YYYYMMDD-HHMM}-{任务简称}
团队说明：Spec 驱动开发: {任务描述}
加载角色定义：
- .agents/roles/spec-explorer.md
- .agents/roles/spec-writer.md
- .agents/roles/spec-tester.md
- .agents/roles/spec-executor.md
- .agents/roles/spec-debugger.md
- .agents/roles/spec-reviewer.md
- .agents/roles/spec-ender.md
```

优先使用当前运行环境的项目级 Agent / Subagent 能力：
- Claude Code：优先使用 `.claude/agents/<role-id>.md`
- Codex：优先使用 `.codex/agents/<role-id>.toml`，spawn 时使用 TOML `name` 字段（如 `spec_explorer`）
- 其他环境：使用 `.agents/roles/<role-id>.md` 的中立角色协议

Codex CLI 的 `/agent` 是活跃子 Agent 线程视图，不是项目 Agent 库视图；只有 TeamLead 明确 spawn 后，角色线程才会出现在 `/agent` 中。

如果运行环境支持恢复子 Agent 线程，TeamLead 记录每个角色的运行时 handle；后续多轮交互优先恢复同一角色线程。若运行环境没有团队/子代理能力，或角色线程不可恢复，由当前 Agent 按同一角色协议串行执行，并从已落盘文档重建上下文。

在当前 Spec 目录的 `lead/team-context.md` 记录本次运行实例状态。它只描述当前 Spec 的团队运行上下文，不替代项目级角色定义：

```markdown
---
type: team-context
schema_version: 1
team_name: spec-{YYYYMMDD-HHMM}-{任务简称}
spec_dir: spec/<01-05分类>/<YYYYMMDD-HHMM-中文任务描述>
task_description: {任务描述}
status: running
phase: intent | exploration | spec-writing | implementation | testing | debugging | review | ending | archived
runtime: claude-code | codex | generic
git_branch: <branch-name 或 none>
base_branch: main
pr_url:
created_at: {ISO8601}
updated_at: {ISO8601}
---

# Team Context

## Current Run Path

| step | phase | owner | action | status | artifact | gate | updated_at |
|------|-------|-------|--------|--------|----------|------|------------|
| 1 | intent | TeamLead | 需求对齐 | done/pending | lead/team-context.md | gate-1 | {ISO8601} |

## Task Progress

> 共享维护区：各角色只追加或更新自己负责的任务行。

| task_id | owner | task | status | artifact | completed_at | updated_by |
|---------|-------|------|--------|----------|--------------|------------|
| T-001 | spec-explorer | 探索项目背景 | pending | explorer/exploration-report.md | | spec-explorer |

## Problem Resolution Log

> 共享维护区：发现或解决问题的角色只追加或更新自己相关的问题行。

| issue_id | found_by | owner | problem | resolution | artifacts | status | updated_by |
|----------|----------|-------|---------|------------|-----------|--------|------------|
| I-001 | spec-tester | spec-debugger | 待记录 | 待记录 | debugger/debug-001.md / debugger/debug-001-fix.md | open | spec-tester/spec-debugger |

## Runtime Handles

| role_id | adapter | runtime_agent_name | agent_id | thread_id | session_id | status | resumable | last_artifact | updated_at |
|---------|---------|--------------------|----------|-----------|------------|--------|-----------|---------------|------------|
| spec-explorer | .claude/.codex/.agents | spec-explorer/spec_explorer | 运行时填写 | 运行时填写 | 运行时填写 | pending | unknown |  | {ISO8601} |

## Artifact Registry

| artifact | owner | status | confirmed | updated_at |
|----------|-------|--------|-----------|------------|
| writer/plan.md | spec-writer | pending | no | |

## Gate Decisions

| gate | target | decision | decided_at | note |
|------|--------|----------|------------|------|
| gate-1 | 需求对齐 | pending | | |

## Handoffs

| from | to | reason | artifact | status | updated_at |
|------|----|--------|----------|--------|------------|

## Open Questions / Blockers

| id | owner | question_or_blocker | status | resolution |
|----|-------|---------------------|--------|------------|

## Next Action

- 待记录 TeamLead 下一步动作。
```

记录规则：
- TeamLead 维护 `lead/team-context.md` 的结构、frontmatter、`Current Run Path`、Git/PR 元数据、`Runtime Handles`、`Artifact Registry`、`Gate Decisions`、`Handoffs`、`Open Questions / Blockers` 和 `Next Action`。
- 所有角色可共同维护 `Task Progress`：只追加或更新自己负责的任务行，完成产物后立即记录 `status`、`artifact`、`completed_at` 和 `updated_by`。
- 发现或解决问题的角色可共同维护 `Problem Resolution Log`：只追加或更新自己发现/处理的问题行，记录问题、解决方案摘要、关联产物、状态和 `updated_by`。
- TeamLead 每次 spawn、resume、send message、stop 或 close 角色线程后更新 `lead/team-context.md` 的控制面信息。
- TeamLead 每次阶段切换、用户确认、handoff、PR URL 变化后更新 `lead/team-context.md`，并在需要时校准共享完成流水。
- 如果项目已通过 `spec-init` 配置 Hook 适配器，Hook 可以按 `.agents/hooks/team-context-hook-contract.md` 自动更新事实字段；未配置 Hook 时，TeamLead 和各角色按本节规则手动维护。
- Hook 只负责文件事件、runtime handle、Git/PR 元数据、artifact 状态、时间戳等事实同步，不负责 `Next Action`、gate decision、handoff reason 或 blocker 业务判断。
- `lead/team-context.md` 是当前 Spec 的运行账本和 Git/PR 元数据权威来源；角色产物只链接它，不复制运行状态正文。
- `Current Run Path` 记录当前任务实际走过的流程路径；`Task Progress` 记录已经完成的任务；`Problem Resolution Log` 记录谁发现问题、谁解决问题、解决产物在哪里。
- 除 `Task Progress` 和 `Problem Resolution Log` 外，非 TeamLead 角色不要直接修改其他区块；如需变更控制面信息，向 TeamLead 提交说明。
- `agent_id`、`thread_id`、`session_id` 是运行时 handle，不作为跨 Spec 的长期身份；跨 Spec 只复用项目级角色定义。
- Claude Code 运行时优先记录 subagent `agent_id` 和对应 transcript/session 信息。
- Codex 运行时优先记录 `/agent` 可见线程或当前 session handle；如 CLI 不暴露稳定 ID，记录 runtime agent name、当前 session 线索和最近产物路径。
- 不记录 token、API key、私有凭据或不可提交的本机绝对敏感路径。
- 不在 `lead/team-context.md` 复制 plan 正文、测试日志、debug 细节或长篇总结；只记录路径、状态、决策和简短摘要。
- `resumable` 可取 `yes`、`no`、`unknown`；无法恢复时由 TeamLead 重新 spawn 同一项目级角色，并从 Spec 文档重建上下文。

### 步骤 5：建立跨角色通信规则

所有跨角色消息默认由 TeamLead 中转：

```text
上游角色 → TeamLead：提交产物路径、结论、问题、建议下游角色
TeamLead → 下游角色：先查 lead/team-context.md；可恢复则继续同一角色线程，不可恢复则重新 spawn 同一项目级角色
下游角色 → TeamLead：返回产物路径和状态
```

角色可以在产物中声明建议接收方，但不假设运行环境支持直接 Agent-to-Agent 通信。例如，`spec-tester` 发现 bug 时向 TeamLead 提交 bug handoff，由 TeamLead 启动或恢复 `spec-debugger`；`spec-debugger` 修复完成后向 TeamLead 提交重新验证请求，由 TeamLead 启动或恢复 `spec-tester`。

### 步骤 6：启动阶段二（探索）

需求对齐、分支准备、角色定义加载和通信规则建立后，TeamLead 启动或恢复 `spec-explorer`，并传递任务描述、探索范围、Spec 目录和 Git 元数据。

## 完整协作时序

```
阶段一：需求对齐
  TeamLead → intent-confirmation → 用户确认
      ↓ 【门禁 1 通过】

GitHub Flow 准备
  TeamLead → git-work → 从 main 创建 Spec 工作分支
  TeamLead → 记录 git_branch / base_branch / pr_url 到 lead/team-context.md

【团队初始化】
  TeamLead 加载 .agents/roles/ 的 7 个项目级角色定义
  TeamLead 按运行时能力创建或恢复本次 Spec 的角色实例
  TeamLead 记录可恢复的角色 handle 到 lead/team-context.md（如运行时支持）

阶段二：Spec 创建
  TeamLead → 启动/恢复 spec-explorer
  spec-explorer → explorer/exploration-report.md → TeamLead
  TeamLead → 启动/恢复 spec-writer，传递 explorer/exploration-report.md + lead/team-context.md
  TeamLead → 启动/恢复 spec-tester，传递 explorer/exploration-report.md 并进入测试计划阶段
  TeamLead 中转 spec-writer 与 spec-tester 的接口边界问题
  spec-writer → writer/plan.md 定稿 → TeamLead
  spec-tester → tester/test-plan.md 定稿 → TeamLead
  TeamLead → 用户确认 writer/plan.md + tester/test-plan.md
      ↓ 【门禁 2 通过】

阶段三：实现
  TeamLead → 启动/恢复 spec-executor
  spec-executor → executor/summary.md → TeamLead
  TeamLead → 用户确认 executor/summary.md
      ↓ 【门禁 3 通过】

阶段四：测试
  TeamLead → 启动/恢复 spec-tester 执行测试
  [如有 bug] spec-tester → bug handoff → TeamLead
             TeamLead → 启动/恢复 spec-debugger
             spec-debugger 修复 → TeamLead
             TeamLead → 启动/恢复 spec-tester 重新验证
             spec-tester 验证通过 → 继续
  spec-tester → tester/test-report.md → TeamLead
  TeamLead → 用户确认 tester/test-report.md
  [可选审查] TeamLead → 启动/恢复 spec-reviewer
             spec-reviewer → reviewer/review.md → TeamLead
             TeamLead → 用户确认 reviewer/review.md
      ↓ 【门禁 4 通过】

阶段五：收尾
  TeamLead → 启动/恢复 spec-ender
  spec-ender → 向 TeamLead 请求多角色素材 + exp-reflect → 规范维护审查 → 询问用户归档
  spec-ender → git-work 提交、推送、创建 PR
  spec-ender → TeamLead，本次 Spec 团队实例结束，项目级角色定义保留
```

## 用户确认节点

| 节点 | 由谁发起 | 确认内容 |
|------|---------|---------|
| 需求对齐 | TeamLead | 需求理解正确 |
| 分支准备 | TeamLead | 仅在工作区不干净、无 Git 仓库或需使用 worktree 时询问 |
| Spec 审阅 | TeamLead | `writer/plan.md` + `tester/test-plan.md` |
| 实现确认 | TeamLead | `executor/summary.md` |
| 诊断确认 | TeamLead | `debugger/debug-xxx.md`（如有） |
| 测试报告确认 | TeamLead | `tester/test-report.md` |
| 归档确认 | spec-ender | 是否归档 + 提交 + 推送 + 创建 PR |

## 后续动作

启动完成后确认：
1. 团队协作上下文已成功建立
2. 7 个项目级角色定义已加载（spec-explorer/writer/tester/executor/debugger/reviewer/ender）
3. 已创建或确认当前 Spec 工作分支
4. 阶段二（探索）已启动
5. 用户已了解整体流程

### 常见陷阱
- spec/ 目录不存在就启动（应先 spec-init）
- 跳过 git-work，直接在 `main` 上开发
- 工作区有无关改动时切换分支
- 多个并发 Spec 共用同一个 working tree（应使用 `git worktree`）
- 在 spec-start 中重写角色定义，导致与 spec-init 持久化角色漂移
- 创建角色时混淆角色名（spec-writer）和 Skill 名（spec-write）
- 尝试创建 TeamLead 角色（当前 Agent 本身就是 TeamLead）
- 假设角色之间可以直接通信，绕过 TeamLead 中转
- 阶段转换时未等待用户确认就继续
