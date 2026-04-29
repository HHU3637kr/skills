---
title: 问题诊断-Mailbox计数显示与TeamBus响应触发混淆
type: debug
category: 02-技术设计
status: 已归档
severity: 中
created: 2026-04-29
plan: "[[plan]]"
tags:
  - spec
  - debug
  - vscode-extension
  - agent-team-runtime
  - teambus
---

# 问题诊断

## 1. 问题概述

### 1.1 问题现象

端侧测试中，TeamLead 向 `spec-explorer` 发送 TeamBus 消息后：

- `team-mailboxes/spec-explorer.jsonl` 中已有 1 条消息。
- Role Chat 中切换到 `spec-explorer` 时，底部 Runtime 状态仍显示 `mailbox 0`。
- 用户感知为 `spec-explorer` 没有收到消息，也没有做出响应。

### 1.2 预期行为

- Runtime 状态中的 `mailbox` 应显示目标 Role 当前未读/未消费的 mailbox backlog，而不是显示 cursor。
- 已投递但未消费的消息应显示为 `mailbox 1`。
- 所有 TeamBus 消息都应被目标 Role 消费并送入该 Role 的 Claude Code session。
- 如果 TeamBus 消息 `requiresResponse=true`，目标 Role 消费后必须通过 TeamBus 回复发送方。
- 如果 TeamBus 消息 `requiresResponse=false`，目标 Role 仍必须消费/感知消息，但不需要再通过 TeamBus 回复发送方。

### 1.3 严重程度

- **级别**：中
- **影响范围**：Role Chat Runtime 状态展示、TeamBus 投递可解释性、端侧测试判断。

---

## 2. 复现步骤

1. 打开当前 Spec：`20260428-1904-智能体团队运行时生命周期与后端加载设计`。
2. 通过 TeamLead 发送 TeamBus 消息给 `spec-explorer`。
3. 检查当前 Spec 文件：
   - `team-chat.jsonl`
   - `team-mailboxes/spec-explorer.jsonl`
   - `delivery-state.json`
   - `runtime.json`
4. 切换 Role Chat 到 `spec-explorer`。
5. **结果**：`team-mailboxes/spec-explorer.jsonl` 有 1 条消息，但 UI 显示 `mailbox 0`。

当前磁盘状态确认：

```text
team-mailboxes/spec-explorer.jsonl: 1 条
runtime.roles.spec-explorer.mailboxCursor: 0
delivery-state[0].requiresResponse: false
delivery-state[0].state: delivered
```

---

## 3. 根因分析

### 3.1 问题定位

- **问题代码位置**：`rk-flow-vscode-extension/src/roleChat/renderRoleChatHtml.ts`
- **问题代码**：

```ts
'<div class="runtimePill"><span>mailbox</span><b>' + escapeText(state.mailboxCursor ?? 0) + '</b></div>'
```

- **问题类型**：实现偏差 + 展示语义错误。

### 3.2 根因说明

`mailboxCursor` 表示 Role 已消费到 mailbox 的哪个位置，本质是消费游标，不是 mailbox 中待处理消息数。

当前 UI 直接显示 `mailboxCursor`，所以在以下状态下会误导用户：

```text
mailbox 总行数 = 1
mailboxCursor = 0
实际未消费数量 = 1 - 0 = 1
UI 显示 = 0
```

因此，“mailbox 0”不是消息未投递，而是 UI 把 cursor 当成 backlog 显示。

### 3.3 关于“没有做出反应”

当前已落盘的 `spec-explorer` 消息是：

```json
{
  "to": "spec-explorer",
  "requiresResponse": false,
  "state": "delivered"
}
```

根据 [[plan]] 中的设计：

```text
requiresResponse=false
  = 必须投递
  = 目标 Role 必须消费
  = 不要求目标 Role 再发送 TeamBus 回复
```

因此当前实现还存在第二个 bug：`requiresResponse=false` 被实现成“只写入 mailbox，不调度目标 Role 消费”。这与需求不一致。正确行为是目标 Role 仍然要被调度执行，只是执行结束后不强制生成 TeamBus 回复。

### 3.4 与 plan.md 的关系

> [!note] 设计关联
> [[plan]] 中已经区分了 `mailboxCursor` 和 TeamBus 队列，但实现阶段 UI 没有把 cursor 转换为 backlog，导致状态展示与用户理解不一致。

---

## 4. 修复方案

### 4.1 方案描述

最小修复方案：

1. 在 `RoleRuntimeState` 中新增 `mailboxBacklog` 或同等字段。
2. `RuntimeStore.ensureRuntime()` / `updateRole()` 根据 mailbox 文件行数和 `mailboxCursor` 计算：

```text
mailboxBacklog = max(mailboxLineCount - mailboxCursor, 0)
```

3. `FileTeamBus.deliverToMailboxes()` 每次投递后刷新目标 Role 的 mailbox backlog，并把目标 Role 标记为 `queued`。
4. `routeRequestedResponses()` 改为路由所有直接发送给 AgentRole 的 TeamBus 消息，不再只路由 `requiresResponse=true`。
5. `runAgentMessage()` 处理 `sourceTeamMessage` 时：
   - `requiresResponse=true`：若目标 Role 未显式发 TeamBus 回复，则生成隐式回复。
   - `requiresResponse=false`：不生成隐式回复，但仍标记原消息已 handled。
6. `renderRoleChatHtml.ts` 显示 `mailboxBacklog`，不再直接显示 `mailboxCursor`。
7. 增加自动化测试：
   - 投递 1 条 `requiresResponse=false` 消息后，目标 Role `mailboxBacklog=1` 且 activity 进入 `queued`。
   - UI 渲染显示 mailbox backlog，而不是 cursor。
   - `requiresResponse=false` 会被路由给目标 Role 消费，但不强制生成 TeamBus reply。

### 4.2 修改范围

- [ ] `rk-flow-vscode-extension/src/runtime/types.ts` - 新增 mailbox backlog 字段。
- [ ] `rk-flow-vscode-extension/src/runtime/runtimeStore.ts` - 计算并刷新 mailbox backlog。
- [ ] `rk-flow-vscode-extension/src/teamBus/fileTeamBus.ts` - 投递后更新目标 Role runtime 统计。
- [ ] `rk-flow-vscode-extension/src/extension.ts` - 所有 TeamBus 消息都路由给目标 Role 消费，仅按 requiresResponse 决定是否回复。
- [ ] `rk-flow-vscode-extension/src/roleChat/renderRoleChatHtml.ts` - 显示 backlog。
- [ ] `rk-flow-vscode-extension/src/test/suite/extension.test.ts` - 增加回归测试。

### 4.3 风险评估

- **是否影响其他功能**：低。
- **主要风险**：如果把 backlog 命名为 pending，可能与 `delivery-state=pending` 混淆。因此建议 UI 文案继续用 `mailbox`，内部字段用 `mailboxBacklog`。
- **不应改变的行为**：`requiresResponse=false` 仍然只投递，不自动响应。

---

## 5. 文档关联

- 设计文档: [[plan|设计方案]]
- 实现总结: [[summary|实现总结]]
- 测试报告: [[test-report|测试报告]]
