---
title: 自研RoleChat与ClaudeCode单后端设计团队上下文
type: team-context
status: 已更新
created: 2026-04-28
spec: "[[README]]"
tags:
  - spec/team-context
  - agent-team
---

# 自研RoleChat与ClaudeCode单后端设计团队上下文

## Team

TeamLead：当前 Agent。

角色职责：

| Role | Skill | 当前状态 |
|------|-------|----------|
| spec-explorer | spec-explore | 已完成 Claude Code 官方扩展能力探索 |
| spec-writer | spec-write | 已按新方向更新详细设计 |
| spec-tester | spec-test | 已按新方向更新测试计划 |
| spec-executor | spec-execute | 正在执行代码调整 |
| spec-debugger | spec-debug | 待测试阶段按需启动 |
| spec-ender | spec-end | 待收尾阶段启动 |

## 需求确认记录

用户确认的最新方向：

- 放弃使用 Claude Code 官方 VS Code 扩展接管 Role Chat 的方案
- R&K Flow 继续自研用户与单个 AgentRole 的聊天 UI
- AgentRole 默认只使用 Claude Code CLI 后端
- 暂时不支持 Codex CLI
- 保留后续接入新 CLI 的 Adapter 扩展能力
- Team Chatroom 只展示 AgentRole 之间的 TeamBus 消息，不混入用户与 Role 的私聊记录

## 协作边界

- 用户与单个 Role 的对话：R&K Role Chat
- AgentRole 之间通信：R&K TeamBus / Team Chatroom
- 自动化执行和团队路由：R&K Orchestrator 调用 ClaudeCodeAdapter
- Claude Code 官方扩展只作为探索结论保留，不作为 MVP 依赖

## 当前门禁

- 代码中不得注册 CodexAdapter
- UI 中不得出现 Codex 模型选项
- 所有 Role 默认后端必须为 Claude Code
- 测试不得要求 Codex CLI 可用
