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
| **TeamLead（当前 Agent）** | `intent-confirmation` | 无 | 全程 |
| spec-explorer | `spec-explore` | `exploration-report.md` | 阶段二（前置） |
| spec-writer | `spec-write` | `plan.md` | 阶段二 |
| spec-tester | `spec-test` | `test-plan.md`, `test-report.md` | 阶段二 + 阶段四 |
| spec-executor | `spec-execute` | `summary.md` | 阶段三 |
| spec-debugger | `spec-debug` | `debug-xxx.md`, `debug-xxx-fix.md` | 阶段三/四（按需） |
| spec-ender | `spec-end` | 无（写入 context/ + PR 收尾） | 阶段五 |

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

输出以下 Git 元数据，并在后续传给 spec-writer：

```yaml
git_branch: <branch-name>
base_branch: main
pr_url:
```

如果用户确认无分支模式，记录 `git_branch: none`，并在 plan.md 中说明原因。

### 步骤 3：加载项目级角色定义并创建本次 Spec Team Runtime

```text
创建团队：spec-{YYYYMMDD-HHMM}-{任务简称}
团队说明：Spec 驱动开发: {任务描述}
加载角色定义：
- .agents/roles/spec-explorer.md
- .agents/roles/spec-writer.md
- .agents/roles/spec-tester.md
- .agents/roles/spec-executor.md
- .agents/roles/spec-debugger.md
- .agents/roles/spec-ender.md
```

优先使用当前运行环境的项目级 Agent / Subagent 能力：
- Claude Code：优先使用 `.claude/agents/<role-id>.md`
- Codex：优先使用 `.codex/agents/<role-id>.toml`
- 其他环境：使用 `.agents/roles/<role-id>.md` 的中立角色协议

如果运行环境支持恢复子 Agent 线程，TeamLead 记录每个角色的运行时 handle；后续多轮交互优先恢复同一角色线程。若运行环境没有团队/子代理能力，或角色线程不可恢复，由当前 Agent 按同一角色协议串行执行，并从已落盘文档重建上下文。

可在当前 Spec 目录创建 `team-runtime.md` 记录本次运行实例状态：

```markdown
# Team Runtime

| role_id | adapter | handle/thread_id | status | last_artifact |
|---------|---------|------------------|--------|---------------|
| spec-explorer | .claude/.codex/.agents | 运行时填写 | pending |  |
```

### 步骤 4：建立跨角色通信规则

所有跨角色消息默认由 TeamLead 中转：

```text
上游角色 → TeamLead：提交产物路径、结论、问题、建议下游角色
TeamLead → 下游角色：传递必要上下文并启动或恢复角色线程
下游角色 → TeamLead：返回产物路径和状态
```

角色可以在产物中声明建议接收方，但不假设运行环境支持直接 Agent-to-Agent 通信。例如，`spec-tester` 发现 bug 时向 TeamLead 提交 bug handoff，由 TeamLead 启动或恢复 `spec-debugger`；`spec-debugger` 修复完成后向 TeamLead 提交重新验证请求，由 TeamLead 启动或恢复 `spec-tester`。

### 步骤 5：启动阶段二（探索）

需求对齐、分支准备、角色定义加载和通信规则建立后，TeamLead 启动或恢复 `spec-explorer`，并传递任务描述、探索范围、Spec 目录和 Git 元数据。

## 完整协作时序

```
阶段一：需求对齐
  TeamLead → intent-confirmation → 用户确认
      ↓ 【门禁 1 通过】

GitHub Flow 准备
  TeamLead → git-work → 从 main 创建 Spec 工作分支
  TeamLead → 记录 git_branch / base_branch / pr_url，后续传给 spec-writer

【团队初始化】
  TeamLead 加载 .agents/roles/ 的 6 个项目级角色定义
  TeamLead 按运行时能力创建或恢复本次 Spec 的角色实例
  TeamLead 记录可恢复的角色 handle（如运行时支持）

阶段二：Spec 创建
  TeamLead → 启动/恢复 spec-explorer
  spec-explorer → exploration-report.md → TeamLead
  TeamLead → 启动/恢复 spec-writer，传递 exploration-report.md + Git 元数据
  TeamLead → 启动/恢复 spec-tester，传递 exploration-report.md 并进入测试计划阶段
  TeamLead 中转 spec-writer 与 spec-tester 的接口边界问题
  spec-writer → plan.md 定稿 → TeamLead
  spec-tester → test-plan.md 定稿 → TeamLead
  TeamLead → 用户确认 plan.md + test-plan.md
      ↓ 【门禁 2 通过】

阶段三：实现
  TeamLead → 启动/恢复 spec-executor
  spec-executor → summary.md → TeamLead
  TeamLead → 用户确认 summary.md
      ↓ 【门禁 3 通过】

阶段四：测试
  TeamLead → 启动/恢复 spec-tester 执行测试
  [如有 bug] spec-tester → bug handoff → TeamLead
             TeamLead → 启动/恢复 spec-debugger
             spec-debugger 修复 → TeamLead
             TeamLead → 启动/恢复 spec-tester 重新验证
             spec-tester 验证通过 → 继续
  spec-tester → test-report.md → TeamLead
  TeamLead → 用户确认 test-report.md
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
| Spec 审阅 | TeamLead | plan.md + test-plan.md |
| 实现确认 | TeamLead | summary.md |
| 诊断确认 | TeamLead | debug-xxx.md（如有） |
| 测试报告确认 | TeamLead | test-report.md |
| 归档确认 | spec-ender | 是否归档 + 提交 + 推送 + 创建 PR |

## 后续动作

启动完成后确认：
1. 团队协作上下文已成功建立
2. 6 个项目级角色定义已加载（spec-explorer/writer/tester/executor/debugger/ender）
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
