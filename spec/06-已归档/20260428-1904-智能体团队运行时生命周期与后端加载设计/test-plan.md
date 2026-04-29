---
title: AgentTeam Runtime生命周期与ClaudeCode后端加载设计测试计划
type: test-plan
status: 已归档
created: 2026-04-29
plan: "[[plan]]"
tags:
  - spec
  - test-plan
  - vscode-extension
  - agent-team-runtime
---

# 测试计划

## 验收标准

本 Spec 通过的判定标准：

1. Runtime 数据模型能够表达 `SpecRuntime`、`RoleRuntime`、`BackendSession`、`Mailbox` 和 `DeliveryState`。
2. 每个非归档 Spec 能初始化并持久化 `runtime.json`。
3. 每个 Role 在 Spec 归档前保持长期状态，不因一次 Claude CLI process 结束而销毁。
4. TeamBus 消息无论 `requiresResponse` 是 `true` 还是 `false`，都必须投递到目标 Role mailbox。
5. `requiresResponse=true` 会产生待响应状态；`requiresResponse=false` 只投递和标记，不强制目标 Role 立即执行。
6. Claude Code session 由 `Spec + Role` 持有，执行 Turn 时可复用已有 session。
7. VS Code 重启恢复 Runtime 时不会自动启动 Claude CLI，也不会自动消费 queued message。
8. Role Chat 显示 RoleRuntime 状态，不再把 Claude CLI init 事件误展示为 Agent 生命周期。
9. Team Chatroom 只读展示 Role 间消息，不提供用户直接改写 TeamBus 的输入入口。
10. 旧 Spec 缺少 `runtime.json` 时可以自动初始化，不破坏已有 `agent-sessions/*.json`、`team-chat.jsonl`、`agent-timeline.jsonl`。

## 测试用例

| 用例编号 | 描述 | 输入 | 预期输出 | 边界条件 |
|---------|------|------|---------|---------|
| TC-001 | 初始化 Runtime 文件 | 打开一个没有 `runtime.json` 的非归档 Spec | 创建 `runtime.json`，包含 7 个 Role 的初始状态 | 旧 Spec 已有 `agent-sessions` |
| TC-002 | 读取已有 Runtime | 打开已有 `runtime.json` 的 Spec | 恢复 SpecRuntime 与 RoleRuntime 状态 | JSON 字段缺失时使用默认值 |
| TC-003 | Spec 归档状态识别 | 打开 `spec/06-已归档/*` | Runtime 标记为 `archived`，Role 不可执行新任务 | 历史 timeline 仍可读 |
| TC-004 | Role 初始状态 | 初始化新 Spec | 所有 Role 为 `lifecycle=active`、`activity=idle` | TeamLead 默认 active role |
| TC-005 | Role 执行状态迁移 | 向 TeamLead 发送用户消息 | `idle -> running -> idle/completed`，记录 turn | Claude CLI 正常退出 |
| TC-006 | Role 执行失败状态 | 模拟 Claude CLI 返回错误 | Role 标记 `activity=failed`，记录错误和审计日志 | 错误不丢失原 session |
| TC-007 | Backend session 持有 | TeamLead 首次执行 | 写入 `agent-sessions/TeamLead.json`，backend 为 `resumable` | Claude 返回外部 session_id |
| TC-008 | Backend session 恢复 | TeamLead 第二次执行 | 使用 Role 持有的 session id 调用 `--resume` | session 文件存在但 id 无效 |
| TC-009 | TeamBus 投递 requiresResponse=false | TeamLead 发给 spec-explorer 且无需回复 | 写入 `team-chat.jsonl` 和 `team-mailboxes/spec-explorer.jsonl`，delivery 为 `delivered` | 不立即调用 spec-explorer |
| TC-010 | TeamBus 投递 requiresResponse=true | TeamLead 发给 spec-explorer 且需要回复 | 写入 mailbox，delivery 为 `pending/seen`，调度 spec-explorer | 防止重复调度 |
| TC-011 | all 广播投递 | TeamLead 发给 `all` | 展开投递到所有 Role mailbox，排除或包含发送者规则明确 | 重复消息去重 |
| TC-012 | mailbox cursor | Role 消费 mailbox | cursor 前移，已处理消息不重复消费 | VS Code 重启后 cursor 保持 |
| TC-013 | VS Code 重启恢复 | 模拟 extension deactivate/activate | 恢复 Runtime 和 mailbox，但不自动执行 queued message | queued message 仍显示 |
| TC-014 | Role Chat 状态展示 | 打开 Role Chat | 顶部显示 Role state、backend session、process state | 没有 active Spec |
| TC-015 | Team Chatroom 只读 | 打开 Team Chatroom | 无用户发送输入框，仅显示 TeamBus 消息和 delivery state | 历史消息为空 |
| TC-016 | Runtime Inspector | 打开 Runtime 状态入口 | 显示 SpecRuntime、RoleRuntime、mailbox backlog | Role failed/blocked 状态 |
| TC-017 | Reset Session | 对某 Role 执行 reset session | 清理或轮换该 Role backend session，不影响其他 Role | 正在 running 时禁止 reset |
| TC-018 | Continue queued Role | 对 queued Role 点击 Continue | 只调度该 Role 的待处理消息 | 不自动调度其他 Role |
| TC-019 | 旧数据兼容 | 打开只有 `team-chat.jsonl` 的旧 Spec | 不强制回填旧 mailbox，新消息开始写 mailbox | 旧记录仍在 Team Chatroom 可读 |
| TC-020 | 文件安全边界 | Runtime 读取 Spec 文件 | 不读取 workspace 外路径 | 恶意相对路径 |

## 覆盖率要求

- 代码覆盖率：核心 Runtime、TeamBusQueue、Backend 调用路径目标覆盖率 > 80%。
- 功能覆盖率：覆盖 Runtime 初始化、恢复、Role 状态迁移、TeamBus 投递、Claude session 复用、UI 状态展示。
- 回归覆盖：现有 Role Chat timeline、tool call/result 渲染、Team Chatroom 只读行为必须继续通过。

## 测试环境要求

- VS Code Extension Host。
- 工作区：`C:\Users\18735\.claude\skills`。
- Claude Code CLI 可用：`claude --help` 成功。
- 测试 Spec：
  - 一个新建 Spec。
  - 一个缺少 `runtime.json` 的旧 Spec。
  - 一个已归档 Spec。
- 测试日志保留在当前 Spec 目录：
  - `logs/extension-build.log`
  - `logs/extension-test.log`
  - `logs/extension-package.log`
  - `logs/runtime-e2e.log`

## 端侧测试策略

端侧测试需要模拟真实用户路径：

1. 打开 R&K Flow Activity Bar。
2. 在 Spec Directory 选择目标 Spec。
3. 打开 AgentTeam Canvas。
4. 点击不同 Role，确认右侧 Role Chat 状态切换。
5. 向 TeamLead 发送消息，观察 Role 状态和 Claude CLI event timeline。
6. 触发 TeamLead 向 spec-explorer 发送 `requiresResponse=false` 消息，确认消息只投递不强制回复。
7. 触发 TeamLead 向 spec-explorer 发送 `requiresResponse=true` 消息，确认 spec-explorer 被调度。
8. 重载 VS Code 窗口，确认 Runtime 恢复但不自动继续执行 queued message。
9. 打开 Team Chatroom，确认用户只能读取 Role 间消息。

## 审计日志要求

必须记录以下事件：

- Runtime 初始化。
- Runtime 恢复。
- Role 状态迁移。
- TeamBus 消息投递。
- mailbox 消费。
- Claude backend session start/resume/reset。
- CLI process start/exit/error。
- 用户手动 Continue / Retry / Reset。

审计日志写入当前 Spec：

```text
audit-log.jsonl
logs/runtime-events.jsonl
```

## 风险测试

| 风险 | 测试方式 | 预期 |
|------|----------|------|
| queued message 重启后被自动执行 | 创建 queued message 后重载 VS Code | 不自动执行，只显示 queued |
| `requiresResponse=false` 被误当成不投递 | 发送无需回复消息 | mailbox 中可见 |
| Role running 时重复触发 | 快速连续点击 Continue | 只允许一个 active turn |
| Claude session 失效 | 使用无效 session id | 标记 backend=expired 并提示 reset |
| 旧 Spec 兼容失败 | 打开旧 Spec | 自动初始化 runtime，不破坏旧文件 |

## 文档关联

- 设计文档: [[plan|设计方案]]
- 实现总结: [[summary|实现总结]] (待创建)
- 测试报告: [[test-report|测试报告]] (待创建)
