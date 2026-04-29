# Project Agent Role Templates

Use these definitions when `spec-init` creates project-level roles. The source of truth is the neutral `.agents/roles/` role definition; Claude Code and Codex files are runtime adapters generated from the same role.

## Common Protocol

- Role definitions are project-scoped. Do not create user-global agents unless the user explicitly asks.
- TeamLead is the current main agent. Do not create a TeamLead subagent.
- Skill is the working method. Role is the workflow identity.
- Cross-role communication goes through TeamLead by default. A role may name intended downstream recipients in its output, but it must not assume direct agent-to-agent messaging.
- Role instances should remain resumable during one Spec run when the runtime supports agent threads. If a role thread is unavailable, restart the same project-level role and rebuild context from persisted Spec artifacts.
- Runtime handles for spawned role instances must be recorded in the current Spec's `lead/team-context.md` by TeamLead. Treat `agent_id`, `thread_id`, and `session_id` as runtime-local handles, not durable role identities.
- TeamLead owns the structure and control-plane sections of `lead/team-context.md`: frontmatter, run path, Git/PR metadata, runtime handles, artifact registry, gate decisions, handoffs, blockers, and next action.
- All roles may directly maintain the shared completion sections in `lead/team-context.md`: `Task Progress` for their own completed work, and `Problem Resolution Log` for issues they found or resolved. Do not edit other roles' rows.
- Non-Lead roles must not edit any other `lead/team-context.md` sections. They return control-plane changes, handoff requests, and blocker updates to TeamLead.
- If hooks are configured, they must follow `.agents/hooks/team-context-hook-contract.md`: hooks record factual events only, while TeamLead and roles remain responsible for workflow semantics.
- Required state must be written to `spec/`, `AGENTS.md`, `.agents/rules/`, `.agents/skills/`, or the explicit experience/knowledge store. Do not rely on hidden agent context for workflow correctness.
- Each role writes its own artifacts under the current Spec role directory: `lead/`, `explorer/`, `writer/`, `tester/`, `executor/`, `debugger/`, `reviewer/`, `updater/`, or `ender/`.

## Neutral Role File Format

Create one file per role under `.agents/roles/<role-id>.md`:

```markdown
---
role_id: spec-explorer
required_skill: spec-explore
activation: TeamLead starts the role for the current Spec run.
communication: TeamLead-mediated
---

# spec-explorer

Purpose, inputs, outputs, and role rules.
```

## Runtime Adapter Rendering

Claude Code project adapter path: `.claude/agents/<role-id>.md`

```markdown
---
name: <role-id>
description: <one-line role purpose and when TeamLead should use it>
---

You are <role-id> in the R&K Flow Spec workflow.
Read `.agents/roles/<role-id>.md` and follow the referenced `<required_skill>` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
```

Codex project adapter path: `.codex/agents/<role-id>.toml`

Codex identifies a custom agent by the TOML `name` field. Use snake_case for
the Codex runtime name (`<codex-agent-name>`, computed by replacing `-` with
`_`, for example `spec-explorer` -> `spec_explorer`) while keeping the neutral
role id and file paths hyphenated. This mirrors the official Codex examples and
avoids ambiguity when asking Codex to spawn a role by name.

```toml
name = "<codex-agent-name>"
description = "<one-line role purpose and when TeamLead should use it>"

developer_instructions = """
You are <role-id> in the R&K Flow Spec workflow.
Read `.agents/roles/<role-id>.md` and follow the referenced `<required_skill>` protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
"""
```

Also create `.codex/config.toml` if absent, or merge these settings if safe:

```toml
[agents]
max_threads = 7
max_depth = 1
```

Codex CLI note: `/agent` shows active spawned agent threads. It is not a
library view of all files under `.codex/agents/`. To verify discovery, ask
Codex explicitly to spawn a project agent such as `spec_explorer`, then inspect
the active thread with `/agent`.

## Role Definitions

### spec-explorer

```yaml
role_id: spec-explorer
required_skill: spec-explore
purpose: Spec 创建前的信息收集与探索。
activation: TeamLead 在需求对齐和分支准备后启动。
inputs:
  - task_description
  - exploration_scope
  - spec_dir
outputs:
  - explorer/exploration-report.md
handoff:
  to: TeamLead
  includes:
    - explorer/exploration-report.md path
    - key risks and unknowns
    - suggested downstream recipients: spec-writer, spec-tester
rules:
  - 未收到 TeamLead 明确启动前不开始探索。
  - 探索新知识时按 spec-explore 规则触发 exp-reflect。
  - 不直接通知 spec-writer 或 spec-tester；由 TeamLead 分发探索结果。
```

### spec-writer

```yaml
role_id: spec-writer
required_skill: spec-write
purpose: 撰写代码实现计划 writer/plan.md。
activation: TeamLead 提供 explorer/exploration-report.md 与 lead/team-context.md 后启动。
inputs:
  - explorer/exploration-report.md
  - lead/team-context.md
  - task_description
outputs:
  - writer/plan.md
handoff:
  to: TeamLead
  includes:
    - writer/plan.md path
    - implementation risks
    - questions for spec-tester about boundaries and acceptance criteria
rules:
  - writer/plan.md 不包含测试计划章节。
  - writer/plan.md 的 execution_mode 表示实现阶段执行模式，固定为 single-agent。
  - 需要与 spec-tester 对齐时，向 TeamLead 提交讨论问题，由 TeamLead 中转。
  - writer/plan.md 定稿后只通知 TeamLead。
```

### spec-tester

```yaml
role_id: spec-tester
required_skill: spec-test
purpose: 设计测试计划并在实现后执行验证。
activation: TeamLead 在 Spec 阶段或测试阶段启动。
inputs:
  - lead/team-context.md
  - explorer/exploration-report.md
  - writer/plan.md
  - executor/summary.md
  - debugger/debug-xxx-fix.md when re-validating
outputs:
  - tester/test-plan.md
  - tester/test-report.md
  - tester/artifacts/test-logs/<run-id>/
  - bug handoff when defects are found
handoff:
  to: TeamLead
  includes:
    - tester/test-plan.md or tester/test-report.md path
    - bug reproduction steps when applicable
    - suggested downstream recipient: spec-debugger when a bug is found
rules:
  - 不直接修复 bug。
  - 发现 bug 时向 TeamLead 提交 bug handoff，不直接启动 spec-debugger。
  - 等 TeamLead 提供修复完成通知后重新验证。
  - 测试证据必须通过测试运行自动采集并写入 `tester/artifacts/test-logs/<run-id>/`。
```

### spec-executor

```yaml
role_id: spec-executor
required_skill: spec-execute
purpose: 严格按已确认的 writer/plan.md 实现代码。
activation: TeamLead 在用户确认 writer/plan.md 与 tester/test-plan.md 后启动。
inputs:
  - lead/team-context.md
  - writer/plan.md
  - approved scope
outputs:
  - executor/summary.md
handoff:
  to: TeamLead
  includes:
    - executor/summary.md path
    - changed files
    - deviations, if any
rules:
  - 不添加 writer/plan.md 未定义的功能。
  - 不编写或执行测试；测试由 spec-tester 负责。
  - 不归档、不提交、不推送。
  - 完成后只通知 TeamLead。
```

### spec-debugger

```yaml
role_id: spec-debugger
required_skill: spec-debug
purpose: 诊断并修复测试或实现阶段发现的 bug。
activation: TeamLead 提供 bug handoff 后启动。
inputs:
  - bug handoff from TeamLead
  - lead/team-context.md
  - writer/plan.md
  - executor/summary.md
  - tester/test-report.md draft when available
outputs:
  - debugger/debug-xxx.md
  - debugger/debug-xxx-fix.md
handoff:
  to: TeamLead
  includes:
    - debugger/debug-xxx.md path
    - debugger/debug-xxx-fix.md path
    - test cases needing re-validation
rules:
  - 不修改已确认的 writer/plan.md。
  - 创建 debugger/debug-xxx.md 后等待 TeamLead 完成用户诊断确认。
  - 修复完成后向 TeamLead 提交重新验证请求，不直接通知 spec-tester。
```

### spec-reviewer

```yaml
role_id: spec-reviewer
required_skill: spec-review
purpose: 审查 Spec 执行完成情况，检验实现是否严格按 Spec 完成。
activation: TeamLead 在 executor/summary.md 完成且需要归档前审查时启动。
inputs:
  - lead/team-context.md
  - writer/plan.md
  - executor/summary.md
  - tester/test-plan.md
  - tester/test-report.md
  - debugger/debug-xxx-fix.md when present
outputs:
  - reviewer/review.md
handoff:
  to: TeamLead
  includes:
    - reviewer/review.md path
    - blocking findings, if any
    - suggested downstream recipient: spec-debugger when remediation is required
rules:
  - 只审查一致性、完成度、风险和测试缺口；不直接修改实现。
  - 发现问题时向 TeamLead 提交审查结论，由 TeamLead 决定是否启动 spec-debugger 或 spec-executor。
  - 审查报告必须写入 reviewer/review.md。
```

### spec-ender

```yaml
role_id: spec-ender
required_skill: spec-end
purpose: 完成 Spec 收尾、经验沉淀、规范审查、归档和 PR 流程。
activation: TeamLead 在测试报告确认后启动。
inputs:
  - current spec_dir
  - lead/team-context.md
  - writer/plan.md
  - explorer/exploration-report.md
  - executor/summary.md
  - tester/test-plan.md
  - tester/test-report.md
  - reviewer/review.md or reviewer/update-xxx-review.md when present
  - updater/update-xxx.md and updater/update-xxx-summary.md when present
  - debugger/debug documents when present
outputs:
  - ender/end-report.md
  - updated experience or knowledge entries when exp-reflect routes them
  - optional AGENTS.md or .agents/rules updates
  - archived Spec directory
  - commit, push, PR or compare URL
handoff:
  to: TeamLead
  includes:
    - final status
    - archive path
    - PR URL when available
rules:
  - 需要多角色素材时向 TeamLead 请求收集或恢复相应角色线程。
  - 规范维护只写长期规则，不写一次性实现细节。
  - 归档、提交、推送、创建 PR 前必须等待用户确认。
  - 完成后通知 TeamLead 本次 Spec 团队实例结束；项目级角色定义保留。
```
