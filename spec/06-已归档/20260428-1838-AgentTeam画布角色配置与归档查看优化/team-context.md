---
title: AgentTeam画布角色配置与归档查看优化团队上下文
type: team-context
category: 02-技术设计
status: active
created: 2026-04-28
updated: 2026-04-29
---

# Team Context

## Spec

- ID: `20260428-1838`
- Title: AgentTeam画布角色配置与归档查看优化
- Directory: `spec/02-技术设计/20260428-1838-AgentTeam画布角色配置与归档查看优化`
- Git Branch: `feat/spec-20260428-1335-rk-flow-vscode-extension`

## Team Lead 对齐结论

- 右侧 Role Chat 只承载用户与当前 Role 的对话。
- 当前 Role 由 AgentTeam Canvas 中被点击的角色节点决定。
- Role 的 backend/model/system prompt/config 属于 Canvas 节点属性面板，不属于聊天 composer。
- 已归档 Spec 进入只读 Archive Viewer，不允许继续运行旧 AgentTeam。
- `spec-update` 仅用于未归档且已完成的 Spec；归档 Spec 的后续动作是基于历史上下文启动新 Spec。

## Roles

- TeamLead
- spec-explorer
- spec-writer
- spec-executor
- spec-tester
- spec-debugger
- spec-ender
