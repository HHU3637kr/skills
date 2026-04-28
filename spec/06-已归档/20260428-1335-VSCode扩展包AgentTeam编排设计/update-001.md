---
title: Agent角色点击与真实CLI对话接入
type: update
status: 已完成
created: 2026-04-28
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec/更新
  - vscode-extension
  - agent-chat
---

# Agent角色点击与真实CLI对话接入

## 更新背景

端侧测试已验证扩展宿主、Canvas 命令、Spec/Git 绑定、Team Bus 与 Adapter 检测可用，但真实 Agent 对话和 Canvas 节点点击尚未接入。

## 更新目标

- AgentTeam Canvas 中的角色节点可以点击
- 点击角色节点后，右侧 Agent Chat 切换到该角色
- Agent Chat 发送消息后，根据角色路由到 Claude Code CLI 或 Codex CLI Adapter
- CLI 输出写回右侧 Chat，并保留在当前 Spec 目录的审计日志中

## 范围边界

- 本次只接入单轮 CLI 对话，不实现多轮 session 恢复 UI
- 本次不开放并发 Agent 自主唤醒
- 本次不实现模型参数编辑，只保留模型选择入口和会话记录
- 本次不做 Webview 视觉重构

## 角色到引擎映射

| 角色 | 默认引擎 |
|------|----------|
| TeamLead | Claude Code |
| spec-explorer | Claude Code |
| spec-writer | Claude Code |
| spec-executor | Codex CLI |
| spec-tester | Codex CLI |
| spec-debugger | Claude Code |
| spec-ender | Claude Code |

## 实现步骤

1. 为 Canvas Agent 节点增加 `data-role` 和点击事件
2. 增加 `rkFlow.selectAgentRole` 命令，支持 Canvas 与命令面板切换角色
3. 扩展 `AgentChatViewProvider`，保存当前角色并刷新 Chat UI
4. Chat 发送消息时创建 `AgentSession`，调用对应 Adapter
5. 将 AgentEvent 写入 `logs/agent-events.jsonl`
6. 将可读回复写入 Team Bus，便于 Team Chatroom 和审计追踪
7. 补充 Extension Host 集成测试和回归测试

## 验收标准

- Extension Host 测试通过
- Canvas 命令仍可打开
- `rkFlow.selectAgentRole` 命令可执行
- Chat 发送逻辑可以通过 mock/低风险路径验证消息路由
- Team Bus 和 audit-log 继续可解析

## 执行结果

- 已完成，见 [[update-001-summary|更新总结]]
- 已审查，见 [[update-001-review|更新审查]]
