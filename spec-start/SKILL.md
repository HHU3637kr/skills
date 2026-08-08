---
disable-model-invocation: true
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
| spec-explorer | `spec-explore` | `explorer/exploration-report.html` | 阶段二（前置） |
| spec-writer | `spec-write` | `writer/plan.html` | 阶段二 |
| spec-tester | `spec-test` | `tester/test-plan.html`, `tester/test-report.html`, `tester/artifacts/test-logs/` | 阶段二 + 阶段四 |
| spec-executor | `spec-execute` | `executor/summary.html` | 阶段三 |
| spec-debugger | `spec-debug` | `debugger/debug-xxx.html`, `debugger/debug-xxx-fix.html` | 阶段三/四（按需） |
| spec-reviewer | `spec-review` | `reviewer/review.html` | 阶段四后（可选） |
| spec-ender | `spec-end` | `ender/end-report.html` | 阶段五 |

## 工作流程

### 步骤 1：澄清任务需求（理解 + 反问梳理 + 确认）

强制使用 `intent-confirmation` 的**三步工作法**，不能只做「是/否」确认：

1. **理解转述**：用可执行条目复述目标、默认假设、做/不做边界  
2. **反问梳理编码思路**：用 OMP `ask`（或等价方式）就阻塞点反问，至少覆盖：  
   - 目标与验收标准  
   - 范围（模块 / 前后端 / 文档）  
   - 实现倾向（最小补丁 / 重构 / 先调研）  
   - Git 工作方式（新分支 / 当前分支 / 先不建分支）  
   - 是否完整 5 阶段，或已有 Spec 可跳转  
   每问尽量带推荐默认，帮用户拍板而不是从零设计  
3. **收敛确认**：输出「编码思路小结」（触点、步骤顺序、关键取舍、验收），用户确认后再往下  

通过门禁后，把思路小结写入后续上下文（`lead/team-context.md` 备注或「下一步动作」），供 explorer/writer 使用，避免下游重猜需求。

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
| spec-explorer | `explorer/exploration-report.html` |
| spec-writer | `writer/plan.html` |
| spec-tester | `tester/test-plan.html`, `tester/test-report.html`, `tester/artifacts/test-logs/<run-id>/` |
| spec-executor | `executor/summary.html` |
| spec-debugger | `debugger/debug-xxx.html`, `debugger/debug-xxx-fix.html` |
| spec-reviewer | `reviewer/review.html`, `reviewer/update-xxx-review.html` |
| spec-update | `updater/update-xxx.html`, `updater/update-xxx-summary.html` |
| spec-ender | `ender/end-report.html` |

根目录只作为当前 Spec 容器，不直接平铺角色产物。

格式边界与功能等价：报告类产物统一是 HTML，按 `html-report` Skill 的固定骨架、共享样式和修订标记规范书写。
HTML 化不得丢功能——原 frontmatter 字段双轨保留（`<head>` 里 `<meta name="rk:*">` 机器可读 +
`.rk-meta` 人可读镜像，含 `base_branch` 与 `pr_url`），文档关联用 `<link rel="rk-*">`；
关联产物双向维护（`rk-links` 正向 + `rk-backlinks` 反向）。
运行账本 `lead/team-context.md` 与 `spec/context/` 下的经验/知识记忆文件保持 Markdown。
不要把账本或记忆文件改成 HTML，也不要用 Markdown 写报告。

修订与决策互相追溯：报告的「修订历史」表记文本变更，账本的「决策记录」记决策本身。
源于实质取舍的修订，在修订历史「原因」列写决策编号（如「按 D-003（多实例部署需共享缓存）」）；
纯笔误、措辞、补充直接写清原因，不编造编号。决策过程正文只留在账本，不复制进报告；
修订历史表固定 5 列（修订/日期/修改人/改了什么/原因），不新增列。

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
- OMP（Oh My Pi）：优先使用 `.omp/agents/<role-id>.md`，TeamLead 通过 `task` 工具 spawn 角色，角色间协作用 `irc` 子 Agent 通信；OMP 只发现 `.omp/agents/`，不读 `.claude/.codex`。spawn 使用 OMP 16.4+ batch schema：`{ context, tasks: [{ name?, agent: "<role-id>", task: "..." }] }`（字段是 `task`/`name`，不是 `assignment`/`id`）。若项目级 agent 未初始化，或仍使用窄 `tools` 白名单，先回到 `spec-init` 补齐（**默认省略 `tools` 继承完整工具集**；边界靠 `.agents/roles` rules）
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
runtime: omp | claude-code | codex | generic
git_branch: <branch-name 或 none>
base_branch: main
pr_url:
created_at: {ISO8601}
updated_at: {ISO8601}
---

# 团队运行账本

## 当前运行路径

| 步骤 | 阶段 | 负责角色 | 动作 | 状态 | 产物 | 门禁 | 更新时间 |
|------|------|----------|------|------|------|------|----------|
| 1 | intent | TeamLead | 需求对齐 | done/pending | lead/team-context.md | gate-1 | {ISO8601} |

## 任务进度

> 共享维护区：各角色只追加或更新自己负责的任务行。

| 任务号 | 负责角色 | 任务 | 状态 | 产物 | 完成时间 | 更新者 |
|--------|----------|------|------|------|----------|--------|
| T-001 | spec-explorer | 探索项目背景 | pending | explorer/exploration-report.html | | spec-explorer |

## 问题闭环记录

> 共享维护区：发现或解决问题的角色只追加或更新自己相关的问题行。
> 不只记 bug，任何影响推进的过程性问题都记：「分类」取 `bug` | `blocker` | `process` | `env` | `dependency` | `scope`。

| 问题号 | 分类 | 发现者 | 负责角色 | 问题 | 解决方案 | 关联产物 | 状态 | 更新者 |
|--------|------|--------|----------|------|----------|----------|------|--------|
| I-001 | bug | spec-tester | spec-debugger | 待记录 | 待记录 | debugger/debug-001.html / debugger/debug-001-fix.html | open | spec-tester/spec-debugger |
| I-002 | env | spec-executor | spec-executor | 待记录（如缺依赖、脚本报错、环境不一致） | 待记录 | executor/summary.html | open | spec-executor |

## 决策记录

> 共享维护区：任何角色遇到需要用户或角色拍板的岔路口，落一行。记录当时给了哪些选项、
> 选了什么、为什么、谁拍的板。被否决的选项不要删，它是复盘的关键上下文。
> 与「门禁决策」的区别：门禁决策只记阶段门禁通过/驳回；决策记录记每一个实质取舍及其理由。

| 决策号 | 阶段 | 提出者 | 议题 | 候选项 | 结论 | 理由 | 拍板者 | 决策时间 |
|--------|------|--------|------|--------|------|------|--------|----------|
| D-001 | intent | TeamLead | 实现路径 | A 最小补丁 / B 抽公共层 | A | 改动面小、可回滚 | user | {ISO8601} |

## 角色运行句柄

| 角色 id | 适配层 | 运行时角色名 | agent_id | thread_id | session_id | 状态 | 可恢复 | 最近产物 | 更新时间 |
|---------|--------|--------------|----------|-----------|------------|------|--------|----------|----------|
| spec-explorer | .claude/.codex/.agents | spec-explorer/spec_explorer | 运行时填写 | 运行时填写 | 运行时填写 | pending | unknown |  | {ISO8601} |

## 产物注册表

| 产物 | 负责角色 | 状态 | 已确认 | 更新时间 |
|------|----------|------|--------|----------|
| writer/plan.html | spec-writer | pending | no | |

## 门禁决策

| 门禁 | 确认对象 | 决策 | 决策时间 | 备注 |
|------|----------|------|----------|------|
| gate-1 | 需求对齐 | pending | | |

## 角色交接

| 来源角色 | 接收角色 | 交接原因 | 产物 | 状态 | 更新时间 |
|----------|----------|----------|------|------|----------|

## 修复循环预算

> 修复循环（spec-tester ↔ spec-debugger）的运行预算。值不写死在 Skill 中，
> 由 TeamLead 在进入阶段四修复循环前用 intent-confirmation 与用户确认后填入。
> 只跟踪两个上限：最大轮数、最大无进展轮数。

| 循环 | 最大轮数 | 最大无进展轮数 | 已用轮数 | 连续无进展 | 状态 | 用户已确认 | 更新时间 |
|------|----------|----------------|----------|------------|------|------------|----------|
| test-debug | 待确认 | 待确认 | 0 | 0 | not-started | no | |

- 「最大轮数」：本次修复循环最多允许 tester→debugger→tester 走多少轮（建议默认 3，用户可改）。
- 「最大无进展轮数」：连续多少轮没有新增进展就停止并升级给人（建议默认 2，用户可改）。
- 「已用轮数」/「连续无进展」：由 spec-debugger 和 spec-tester 在每轮重验后更新。
- 「状态」取值：`not-started` | `running` | `passed` | `stopped-budget` | `stopped-no-progress` | `escalated`。

## 开放问题与阻塞

| 编号 | 负责角色 | 问题或阻塞 | 状态 | 解决情况 |
|------|----------|------------|------|----------|

## 下一步动作

- 待记录 TeamLead 下一步动作。
```

记录规则：
- TeamLead 维护 `lead/team-context.md` 的结构、frontmatter、「当前运行路径」、Git/PR 元数据、「角色运行句柄」、「产物注册表」、「门禁决策」、「角色交接」、「开放问题与阻塞」和「下一步动作」。
- 所有角色可共同维护「任务进度」：只追加或更新自己负责的任务行，完成产物后立即记录状态、产物、完成时间和更新者。
- 发现或解决问题的角色可共同维护「问题闭环记录」：只追加或更新自己发现/处理的问题行，记录分类、问题、解决方案摘要、关联产物、状态和更新者。不止 bug——阻塞、环境、依赖、流程、范围偏差等过程性问题都在此记录。
- 遇到需要拍板的取舍时，拍板的一方（用户决策由 TeamLead 代记）在「决策记录」追加一行：「候选项」记当时的选项（含被否决项）、「结论」记选了什么、「理由」记为什么、「拍板者」记 `user` 或角色 id。这是「为什么当初这么定」的唯一权威来源。
- TeamLead 每次 spawn、resume、send message、stop 或 close 角色线程后更新 `lead/team-context.md` 的控制面信息。
- TeamLead 每次阶段切换、用户确认、handoff、PR URL 变化后更新 `lead/team-context.md`，并在需要时校准共享完成流水。
- `lead/team-context.md` 全部由 TeamLead 和各角色手动维护；不依赖任何自动记账机制。角色每产出一个产物、每解决一个问题、每做一次取舍，立即更新对应区块。
- `lead/team-context.md` 是当前 Spec 的运行账本和 Git/PR 元数据权威来源；角色产物只链接它，不复制运行状态正文。
- 「当前运行路径」记录当前任务实际走过的流程路径；「任务进度」记录已经完成的任务；「问题闭环记录」记录谁发现问题、谁解决问题、解决产物在哪里；「决策记录」记录每一个实质取舍的选项、结论和理由。
- 除「任务进度」、「问题闭环记录」和「决策记录」外，非 TeamLead 角色不要直接修改其他区块；如需变更控制面信息，向 TeamLead 提交说明。
- `agent_id`、`thread_id`、`session_id` 是运行时 handle，不作为跨 Spec 的长期身份；跨 Spec 只复用项目级角色定义。
- OMP 运行时优先记录 `task` spawn 返回的 `agent_id`（`agent://<id>` 句柄）和子 Agent job id；角色间用 `irc` 协作时按角色 id（如 `spec-tester`）寻址，交接仍落盘到「角色交接」与「问题闭环记录」。
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
  TeamLead → intent-confirmation
             （理解转述 → 反问梳理编码思路 → 收敛确认）
  用户确认编码思路小结
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
  spec-explorer → explorer/exploration-report.html → TeamLead
  TeamLead → 启动/恢复 spec-writer，传递 explorer/exploration-report.html + lead/team-context.md
  TeamLead → 启动/恢复 spec-tester，传递 explorer/exploration-report.html 并进入测试计划阶段
  TeamLead 中转 spec-writer 与 spec-tester 的接口边界问题
  spec-writer → writer/plan.html 定稿 → TeamLead
  spec-tester → tester/test-plan.html 定稿 → TeamLead
  TeamLead → 用户确认 writer/plan.html + tester/test-plan.html
      ↓ 【门禁 2 通过】

阶段三：实现
  TeamLead → 启动/恢复 spec-executor
  spec-executor → executor/summary.html → TeamLead
  TeamLead → 用户确认 executor/summary.html
      ↓ 【门禁 3 通过】

阶段四：测试
  TeamLead → 启动/恢复 spec-tester 执行测试
  [如有 bug] spec-tester → bug handoff → TeamLead
             TeamLead → 用 intent-confirmation 与用户确认本次修复循环预算
                        （max_rounds 建议 3，max_no_progress_rounds 建议 2，用户可改）
                        → 写入 lead/team-context.md 的「修复循环预算」，status=running
             TeamLead → 启动/恢复 spec-debugger
             spec-debugger 修复 → 更新 rounds_used / no_progress_streak → TeamLead
             TeamLead → 启动/恢复 spec-tester 重新验证
             spec-tester 验证 → 更新「修复循环预算」进展信号
             [验证通过]「修复循环预算」status=passed → 继续
             [仍失败且未触上限] 回到 spec-debugger 下一轮
             [触发 max_rounds 或 max_no_progress_rounds]
                        → spec-tester/spec-debugger 停止，status=stopped-budget/stopped-no-progress
                        → TeamLead 升级给用户决定（继续加预算 / 改方案 / 暂停）
  spec-tester → tester/test-report.html → TeamLead
  TeamLead → 用户确认 tester/test-report.html
  [可选审查] TeamLead → 启动/恢复 spec-reviewer
             spec-reviewer → reviewer/review.html → TeamLead
             TeamLead → 用户确认 reviewer/review.html
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
| 需求对齐 | TeamLead | 目标/范围/验收 + 反问后的编码思路小结（非单纯「理解正确」） |
| 分支准备 | TeamLead | 仅在工作区不干净、无 Git 仓库或需使用 worktree 时询问 |
| Spec 审阅 | TeamLead | `writer/plan.html` + `tester/test-plan.html` |
| 实现确认 | TeamLead | `executor/summary.html` |
| 修复循环预算 | TeamLead | 进入修复循环前确认 「最大轮数」 和 「最大无进展轮数」（带建议默认值，用户可改） |
| 诊断确认 | TeamLead | `debugger/debug-xxx.html`（如有） |
| 测试报告确认 | TeamLead | `tester/test-report.html` |
| 修复循环升级 | TeamLead | 触发预算上限或连续无进展时，确认继续加预算 / 改方案 / 暂停 |
| 归档确认 | spec-ender | 是否归档 + 提交 + 推送 + 创建 PR |

## 修复循环进展信号

进入阶段四的 spec-tester ↔ spec-debugger 修复循环时，TeamLead 维护 `lead/team-context.md` 的「修复循环预算」：

- **预算来自用户**：「最大轮数」 和 「最大无进展轮数」 不写死在 Skill 中。每次进入修复循环前，TeamLead 用 `intent-confirmation` 向用户确认，带建议默认值（3 轮 / 连续 2 轮无进展），用户可直接接受或改写。
- **每轮记账**：spec-debugger 修复后、spec-tester 重验后，各自更新 「已用轮数」 和 「连续无进展」。
- **进展的定义**：一轮算"有进展"当且仅当出现以下至少一项——新增通过的测试用例、失败范围缩小、定位到此前未知的根因、产生新的可验证证据。仅写了新总结但上述都没有，记为"无进展"，「连续无进展」 加一。
- **停止与升级**：「已用轮数」 达到 「最大轮数」，或 「连续无进展」 达到 「最大无进展轮数」 时，停止循环并由 TeamLead 升级给用户，不自行无限重试。

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
