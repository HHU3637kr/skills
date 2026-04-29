---
id: EXP-004
title: TeamBus投递消费回复三段语义
keywords: [TeamBus, mailbox, requiresResponse, RoleRuntime, AgentTeam, 消息队列]
scenario: 设计或调试多角色 AgentTeam 通信协议时
created: 2026-04-29
---

# TeamBus投递消费回复三段语义

## 困境

在 AgentTeam 编排中，`requiresResponse=false` 容易被误实现为“不调度目标 Role”。这会导致 TeamLead 发出的消息虽然写入 `team-chat.jsonl` 和目标 `team-mailboxes/<role>.jsonl`，但目标 Role 没有真正消费，用户会认为“消息发出去了但 Agent 没收到”。

另一个相关问题是 UI 把 `mailboxCursor` 当成 mailbox 数量显示。cursor 表示已消费位置，不表示待处理数量，会掩盖真实 backlog。

## 策略

1. 将 TeamBus 消息处理拆成三段：投递、消费、回复。
2. 所有直达 AgentRole 的 TeamBus 消息都必须进入目标 RoleRuntime 消费链路。
3. `requiresResponse` 只控制“是否必须通过 TeamBus 回复”，不能控制是否投递或是否消费。
4. mailbox UI 显示 `mailboxBacklog = mailbox 总行数 - mailboxCursor`，不直接显示 cursor。
5. delivery state 用 `pending / seen / handled / failed` 表达处理进度，避免和 UI backlog 混用。

## 理由

TeamBus 是编排协议，不是普通聊天日志。只有把“消息已写入日志”“目标 Role 已感知”“目标 Role 是否需要回复”拆开，才能支持可恢复队列、多 Role 并发、端侧审计和后续调度器。

## 相关文件

- `rk-flow-vscode-extension/src/teamBus/fileTeamBus.ts`
- `rk-flow-vscode-extension/src/teamBus/types.ts`
- `rk-flow-vscode-extension/src/runtime/runtimeStore.ts`
- `rk-flow-vscode-extension/src/extension.ts`
- `rk-flow-vscode-extension/src/roleChat/renderRoleChatHtml.ts`
- `spec/06-已归档/20260428-1904-智能体团队运行时生命周期与后端加载设计/debug-001.md`
- `spec/06-已归档/20260428-1904-智能体团队运行时生命周期与后端加载设计/debug-001-fix.md`

## 参考

- `spec/06-已归档/20260428-1904-智能体团队运行时生命周期与后端加载设计/plan.md`
