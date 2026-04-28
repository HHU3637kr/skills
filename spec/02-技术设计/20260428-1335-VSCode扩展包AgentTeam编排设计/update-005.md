---
title: AgentRole自主TeamBus通信闭环
type: update
status: 已确认
created: 2026-04-28
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec/更新
  - team-bus
  - agent-team
---

# AgentRole自主TeamBus通信闭环

## 更新背景

当前扩展已经具备 `team-chat.jsonl` / `audit-log.jsonl` 落盘能力，也已经将用户与单个 Role 的私聊从 Team Chatroom 中隔离出来。

但不同 AgentRole 之间的通信仍停留在手动 Broadcast 和日志展示层，真实 Agent 输出无法主动写入 Team Bus，也无法触发目标 Role 响应。

## 更新目标

- Agent 输出中可以声明 TeamBus 消息
- 扩展解析该声明并写入 `team-chat.jsonl`
- Team Chatroom 显示 AgentRole 之间的消息
- `requiresResponse=true` 且目标是具体 Role 时，Orchestrator 自动唤起目标 Role 一次
- 目标 Role 若没有显式输出 TeamBus 消息，则将其回复作为隐式团队回复落盘
- 增加测试覆盖，防止协议解析和路由入口退化

## 非目标

- 不实现无限多轮 Agent 自主对话
- 不实现复杂优先级队列和并发调度
- 不实现真正 MCP Server；本轮先采用 CLI 输出协议作为轻量工具通道
- 不让用户与 Role 的私聊进入 `team-chat.jsonl`

## Agent 输出协议

Agent 需要向其他角色通信时，在回复中输出 JSON fenced block：

```json
{
  "rkFlowTeamMessage": {
    "to": "spec-debugger",
    "type": "blocker",
    "subject": "测试阻塞",
    "body": "端侧测试发现 Canvas 点击无响应，需要排查 Webview 事件绑定。",
    "artifacts": ["spec/02-技术设计/.../logs/extension-host.log"],
    "requiresResponse": true
  }
}
```

扩展强制使用当前运行 Role 作为 `from`，避免 Agent 伪造其他角色身份。

## 实现步骤

1. 新增 TeamBus 协议解析模块
2. 在 Role Prompt 中写入通信协议说明
3. Agent 响应完成后解析协议并写入 TeamBus
4. 隐藏私聊 transcript 中的协议 JSON block
5. 对 `requiresResponse=true` 的目标 Role 做一次性自动唤起
6. 补充 Extension Host 回归测试
7. 打包 `0.0.5` VSIX

## 验收标准

- 编译通过
- Extension Host 测试通过
- VSIX 打包通过
- Agent 输出协议能解析为 TeamBus 消息
- TeamBus 消息按 Role 可读
- 私聊日志与团队通信日志保持分离
- 自动路由有一跳限制，避免无限循环

## 文档关联

- 更新总结: [[update-005-summary|update-005-summary]]
- 更新审查: [[update-005-review|update-005-review]]
