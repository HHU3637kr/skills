---
title: 修复总结-Mailbox计数显示与TeamBus响应触发混淆
type: debug-fix
category: 02-技术设计
status: 已归档
created: 2026-04-29
plan: "[[plan]]"
debug: "[[debug-001]]"
tags:
  - spec
  - debug-fix
  - vscode-extension
  - agent-team-runtime
  - teambus
---

# 修复总结

## 1. 修复概述

- **关联诊断**：[[debug-001|问题诊断]]
- **修复日期**：2026-04-29

本次修复两个问题：

1. Role Chat 中 `mailbox` 错误显示为 `mailboxCursor`。
2. `requiresResponse=false` 的 TeamBus 消息只投递到 mailbox，但没有被目标 Role 消费。

---

## 2. 修复内容

### 2.1 修改的文件

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `rk-flow-vscode-extension/src/runtime/types.ts` | 修改 | 新增 `mailboxBacklog` 字段 |
| `rk-flow-vscode-extension/src/runtime/runtimeStore.ts` | 修改 | 根据 mailbox 文件行数和 cursor 计算 backlog |
| `rk-flow-vscode-extension/src/teamBus/fileTeamBus.ts` | 修改 | 所有投递消息初始状态为 `pending`，并将目标 Role 标记为 `queued` |
| `rk-flow-vscode-extension/src/extension.ts` | 修改 | 所有直达 Role 的 TeamBus 消息都会路由消费；`requiresResponse` 只决定是否必须回复 |
| `rk-flow-vscode-extension/src/roleChat/renderRoleChatHtml.ts` | 修改 | UI 显示 `mailboxBacklog`，不再显示 cursor |
| `rk-flow-vscode-extension/src/test/suite/extension.test.ts` | 修改 | 增加 TeamBus 调度语义和 mailbox backlog 回归测试 |

### 2.2 关键修改

#### mailbox 显示

```ts
// 修改前
state.mailboxCursor ?? 0

// 修改后
state.mailboxBacklog ?? 0
```

#### TeamBus 调度语义

```ts
// 修改前
if (!message.requiresResponse || !isAgentRole(message.to) || message.to === message.from) {
  continue;
}

// 修改后
if (!shouldRouteTeamMessage(message)) {
  continue;
}
```

#### 回复义务

```ts
// 修改后
if (options.sourceTeamMessage?.requiresResponse && teamMessages.length === 0) {
  // 只有 requiresResponse=true 才生成隐式 TeamBus 回复
}
```

---

## 3. 验证结果

- [x] `npm run compile` 通过
- [x] `npm test` 通过
- [x] 新增回归测试：`requiresResponse=false` 仍会路由给目标 Role 消费
- [x] 新增回归测试：mailbox 显示使用 backlog，而不是 cursor

测试结果：

```text
25 passing
Exit code: 0
```

---

## 4. 行为确认

修复后的语义：

```text
requiresResponse=false
  -> 写入 team-chat.jsonl
  -> 写入目标 team-mailboxes/<role>.jsonl
  -> 目标 Role 标记 queued
  -> 路由到目标 RoleRuntime/Claude Code 消费
  -> 不强制目标 Role 通过 TeamBus 回复

requiresResponse=true
  -> 同样投递并消费
  -> 目标 Role 必须通过 TeamBus 回复
  -> 若未显式回复，编排器生成隐式 status reply
```

---

## 5. 文档关联

- 设计文档: [[plan|设计方案]]
- 问题诊断: [[debug-001|问题诊断]]
- 测试报告: [[test-report|测试报告]]
