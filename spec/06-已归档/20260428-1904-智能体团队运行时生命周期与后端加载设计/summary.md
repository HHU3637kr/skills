---
title: AgentTeam Runtime生命周期与ClaudeCode后端加载设计-实现总结
type: summary
category: 02-技术设计
status: 已归档
created: 2026-04-29
plan: "[[plan]]"
tags:
  - spec
  - summary
  - vscode-extension
  - agent-team-runtime
  - claude-code
---

# 实现总结

## 1. 完成的功能

- [x] 新增 `SpecRuntime` / `RoleRuntime` / `BackendSession` 数据模型。
- [x] 新增 `RuntimeStore`，支持 `runtime.json`、`team-mailboxes/`、`delivery-state.json`、`logs/runtime-events.jsonl` 初始化与恢复。
- [x] 新增 `RoleRuntimeManager`，把 Role 执行状态从一次 CLI 调用中抽离为长期状态机。
- [x] 将 TeamBus 从只写 `team-chat.jsonl` 升级为 mailbox + delivery state 队列。
- [x] 修正 `requiresResponse` 语义：无论 true/false 均投递；true 进入待响应队列，false 只标记 delivered。
- [x] 修正 `requiresResponse=false` 的消费语义：目标 Role 仍会消费消息，只是不强制 TeamBus 回复。
- [x] 将 Claude Code 调用抽象为 Backend 语义，保留当前短生命周期 CLI process 调用方式。
- [x] Role Chat 在输入区下方以低占用状态条展示 lifecycle/activity/backend/mailbox 状态，聊天顶部保持轻量。
- [x] Team Chatroom 继续保持只读，并显示每条 TeamBus 消息的 delivery state。
- [x] 兼容旧 Spec：缺少 runtime 文件时首次打开自动初始化；已有 `agent-sessions/*.json` 会被复用。

## 2. 实现的文件

```text
rk-flow-vscode-extension/src/
├── agentAdapters/
│   ├── types.ts
│   └── cliAdapters.ts
├── runtime/
│   ├── types.ts
│   ├── runtimeStore.ts
│   └── roleRuntime.ts
├── teamBus/
│   ├── types.ts
│   └── fileTeamBus.ts
├── roleChat/
│   └── renderRoleChatHtml.ts
├── extension.ts
└── test/suite/
    └── extension.test.ts
```

## 3. 测试结果

### 编译校验

- **命令**: `npm run compile`
- **结果**: 通过

### 自动化测试

- 已补充 Runtime 初始化、TeamBus mailbox/delivery、Role Chat runtime 展示、Team Chatroom delivery 展示相关测试用例。
- `/spec-test` 阶段已执行完整 `npm test`，最新结果为 25 passing。详见 [[test-report|测试报告]]。

## 4. 遇到的问题

> [!warning] 问题 1：Role 和 Claude Code session 容易被混为同一对象
> **解决方案**：新增 `RoleRuntimeState`，用 lifecycle/activity/backend 三组状态区分 Role 生命周期、执行状态和后端 session 状态。

> [!warning] 问题 2：TeamBus 原先只有聊天日志，没有投递状态
> **解决方案**：新增 `team-mailboxes/<role>.jsonl` 和 `delivery-state.json`，`sendMessage()` 写入全局日志后必须投递到目标 mailbox。

> [!warning] 问题 3：`requiresResponse=false` 容易被误解为不投递
> **解决方案**：实现中统一投递消息；false 标记为 `delivered` 且不调度，true 标记为 `pending` 并将目标 Role 标记为 `queued`。

## 5. 与 plan.md 的差异

> [!note] UI 承载方式调整
> - 未新增独立 Runtime Inspector 页面；Runtime 状态先集成在 Role Chat 输入区下方，符合 plan 中“Runtime Inspector 或在现有侧栏中展示 Runtime 状态”的选项。
> - 根据端侧反馈移除了 Retry / Continue / Reset 按钮，避免占用聊天输入区域。

### 未实现的功能

- 暂未实现自动消费 queued mailbox 的后台调度器。当前仍坚持 plan 中的恢复原则：VS Code 重启后不自动启动 Claude CLI，由用户或 TeamLead 显式 Continue/Retry。
- 暂未回填旧 `team-chat.jsonl` 到历史 mailbox。旧消息继续只读保留，新消息开始写入 mailbox 和 delivery-state。

## 6. 后续建议

### 优化方向

1. 在 `/spec-test` 阶段补充 Extension Host 端侧验证：打开 Spec、发送 Role Chat、触发 TeamBus、重载窗口、检查 runtime 恢复。
2. 后续可以新增 Runtime Inspector 专门视图，用于批量查看所有 Role 的 backlog、failed、blocked 状态。
3. Continue queued Role 的语义可以进一步从“发送继续”升级为“读取 mailbox 中下一条 pending message 并构造任务 prompt”。

### 待完成事项

- [x] 执行 `/spec-test`，生成 `test-report.md`。
- [x] 根据端侧测试反馈处理 mailbox 显示与 TeamBus 消费语义问题。

## 7. 文档关联

- 设计文档: [[plan|设计方案]]
- 测试计划: [[test-plan|测试计划]]
- Bug 修复: [[debug-001-fix|Mailbox计数显示与TeamBus响应触发混淆修复]]
