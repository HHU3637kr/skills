# Team Context Hook Contract

本文件是 `lead/team-context.md` 自动维护的中立 Hook 协议。Claude Code、Codex 或其他运行时只负责把自己的 Hook 事件适配到本协议；不要在这里写死某个 CLI 的配置 schema。

具体运行时配置样例见 `runtime-hook-examples.md`。该文件只提供 Claude Code / Codex 项目级 Hook 示例，不改变本协议定义的事件语义。

## 目标

Hook 只做自动记账，记录事实事件，减少 TeamLead 和角色手动更新 `lead/team-context.md` 的时差。流程判断仍由 TeamLead 和角色协议完成。

## 适配器职责

运行时适配器可以创建 `.agents/hooks/team-context-sync.*`，并把当前 CLI 的 Hook 事件转为以下中立事件：

| 中立事件 | 触发来源 | 允许更新 |
|----------|----------|----------|
| `session_started` | 会话开始或恢复 | frontmatter 的 `runtime`、`updated_at`、Git 元数据 |
| `agent_started` | 子 Agent / 角色实例启动 | `Runtime Handles` |
| `agent_stopped` | 子 Agent / 角色实例结束 | `Runtime Handles.last_artifact`、`status`、`updated_at` |
| `artifact_written` | 角色产物被创建或修改 | `Artifact Registry`、对应角色自己的 `Task Progress` |
| `task_completed` | 任务被标记完成 | 对应角色自己的 `Task Progress` |
| `issue_artifact_written` | `debugger/debug-*.md` 或 `debugger/debug-*-fix.md` 被写入 | `Problem Resolution Log` 的初始行或状态 |
| `turn_finished` | 一轮 agent 输出完成 | `updated_at` 和轻量一致性校准 |
| `pr_updated` | PR URL 创建或变更 | frontmatter 的 `pr_url` |

## 区块所有权

TeamLead 维护控制面：
- frontmatter
- `Current Run Path`
- Git/PR metadata
- `Runtime Handles`
- `Artifact Registry`
- `Gate Decisions`
- `Handoffs`
- `Open Questions / Blockers`
- `Next Action`

所有角色可共同维护共享完成区：
- `Task Progress`：只追加或更新自己负责的任务行
- `Problem Resolution Log`：只追加或更新自己发现或解决的问题行

Hook 适配器只能自动更新事实字段，不得改写其他角色的语义内容。

## 自动更新边界

Hook 可以自动记录：
- `created_at`、`updated_at`
- `runtime`
- `git_branch`、`base_branch`、`pr_url`
- 角色 runtime handle
- 文件创建/修改时间
- artifact 状态
- 任务完成时间
- debug / fix 文件对应的问题状态

Hook 不得自动推断：
- `Next Action`
- gate decision
- handoff reason
- blocker 是否成立
- plan / test / debug 正文摘要
- 业务结论、风险结论或用户确认结果

## Artifact 映射

| artifact pattern | owner | task progress |
|------------------|-------|---------------|
| `explorer/exploration-report.md` | spec-explorer | 探索项目背景 |
| `writer/plan.md` | spec-writer | 撰写设计方案 |
| `tester/test-plan.md` | spec-tester | 撰写测试计划 |
| `executor/summary.md` | spec-executor | 完成实现总结 |
| `tester/test-report.md` | spec-tester | 执行测试并产出报告 |
| `debugger/debug-*.md` | spec-debugger | 诊断问题 |
| `debugger/debug-*-fix.md` | spec-debugger | 修复问题 |
| `reviewer/review.md` | spec-reviewer | 审查 Spec 执行 |
| `reviewer/update-*-review.md` | spec-reviewer | 审查更新 |
| `updater/update-*.md` | spec-update | 撰写更新方案 |
| `updater/update-*-summary.md` | spec-update | 完成更新总结 |
| `ender/end-report.md` | spec-ender | 完成收尾报告 |

## 安全规则

- 不记录 token、API key、密码、cookie、私钥或真实用户隐私。
- 不记录不可提交的本机敏感绝对路径。
- 不覆盖已有 hook 配置；需要更新时先说明差异。
- Hook 出错不能阻断正常 Spec 流程，除非是明确的安全拦截类 hook。
- 写 `lead/team-context.md` 时必须保持 Markdown 表格结构，不删除未知字段。

## 降级策略

如果当前 CLI 不支持 hooks，或 hook 配置失败：
1. 保留 `.agents/hooks/team-context-hook-contract.md`。
2. 不创建运行时适配。
3. TeamLead 继续维护控制面。
4. 各角色继续手动维护 `Task Progress` 和 `Problem Resolution Log`。
