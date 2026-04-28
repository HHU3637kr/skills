---
title: AgentRole自主TeamBus通信闭环总结
type: update-summary
status: 已完成
created: 2026-04-28
update: "[[update-005]]"
tags:
  - spec/更新
  - summary
  - team-bus
---

# AgentRole自主TeamBus通信闭环总结

> [!success]
> 已补齐 AgentRole 之间的轻量自主通信闭环。Agent 可以通过输出协议写入 TeamBus，Team Chatroom 保持为 AgentRole 团队通信视图。

## 完成内容

- 新增 `teamBus/protocol.ts`，解析 `rkFlowTeamMessage` JSON fenced block
- Role Prompt 注入 TeamBus 通信协议
- Agent 响应完成后自动提取 TeamBus 消息并写入 `team-chat.jsonl`
- 私聊 transcript 中隐藏协议 JSON block
- `requiresResponse=true` 且目标为具体 Role 时，Orchestrator 自动唤起目标 Role 一次
- 目标 Role 没有显式 TeamBus 输出时，自动把回复作为 `status` 回写给原发送方
- Canvas 底部 Team Chatroom 支持手动选择 `from / to / type / requiresResponse`
- 扩展版本升到 `0.0.5`

## 边界说明

> [!warning]
> 本轮实现的是一跳路由闭环，不是无限多轮自治调度。这样可以先验证 AgentRole 通信和审计链路，同时避免模型调用失控。

## 新 VSIX

```text
C:\Users\18735\.claude\skills\rk-flow-vscode-extension\rk-flow-vscode-extension-0.0.5.vsix
```

## 文档关联

- 更新方案: [[update-005|update-005]]
- 更新审查: [[update-005-review|update-005-review]]
