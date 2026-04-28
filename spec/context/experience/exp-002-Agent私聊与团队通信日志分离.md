---
id: EXP-002
title: Agent私聊与团队通信日志分离
keywords: [AgentTeam, TeamBus, agent-chat, team-chat, audit-log]
scenario: 多角色 Agent 产品同时支持用户与单个 Agent 私聊、AgentRole 之间团队通信
created: 2026-04-28
---

# Agent私聊与团队通信日志分离

## 困境

在 AgentTeam Canvas 中，右侧 Role Chat 是用户与某个 AgentRole 的私聊界面，底部 Team Chatroom 是 AgentRole 之间的团队通信视图。如果把用户私聊、Agent 回复和 AgentRole 团队消息都写进 `team-chat.jsonl`，Team Chatroom 会被用户对话污染，后续审计和自动路由也无法区分“用户指令”和“角色间协作”。

## 策略

1. 用户与单个 AgentRole 的对话写入 `agent-chat.jsonl`。
2. AgentRole 之间的通信写入 `team-chat.jsonl`。
3. 审计事件统一写入 `audit-log.jsonl`，但事件类型要区分 `role_chat_message`、`role_chat_response` 和 `team_message`。
4. Team Chatroom 只展示 `from/to` 都属于 AgentRole 或 `all` 的团队消息。
5. 如果 Agent 需要向其他角色通信，通过显式 `rkFlowTeamMessage` 协议写入 TeamBus。
6. 对 `requiresResponse=true` 的团队消息只做一跳自动唤起，避免多 Agent 无限互相调用。

## 理由

私聊 transcript 和团队通信具有不同的产品语义、审计目的和自动化后果。分离后，右侧 Role Chat 可以保持用户上下文连续性，Team Chatroom 可以承担 AgentRole 协作记录，TeamBus 也能作为后续调度器或 MCP 工具的稳定边界。

## 相关文件

- rk-flow-vscode-extension/src/extension.ts
- rk-flow-vscode-extension/src/teamBus/fileTeamBus.ts
- rk-flow-vscode-extension/src/teamBus/protocol.ts
- rk-flow-vscode-extension/src/teamBus/types.ts
- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/update-004-summary.md
- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/update-005-summary.md

## 参考

- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/team-chat.jsonl
- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/audit-log.jsonl
