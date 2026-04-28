---
title: 自研RoleChat与ClaudeCode单后端设计
type: spec-index
category: 02-技术设计
status: 需求已确认
created: 2026-04-28
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - vscode-extension
  - claude-code
  - agent-team
---

# 自研RoleChat与ClaudeCode单后端设计

## 目标

调整 R&K Flow VS Code 扩展的 Agent 交互架构：

- 保留自研 Role Chat，作为用户与单个 AgentRole 的主聊天入口
- 保留 Spec 编排层、AgentTeam Canvas、TeamBus 通信协议、审计日志和 Spec/Git 绑定
- MVP 只支持 Claude Code CLI 后端
- 暂时移除 Codex CLI 支持，不在 UI、默认路由、测试和打包说明中暴露 Codex
- 保留 `AgentAdapter` 抽象，后续可重新接入新的 CLI 后端

## 当前阶段

- 阶段一：需求方向已调整
- 阶段二：详细设计已同步到自研 Role Chat 路线
- 阶段三：实现中

## 文档

- [[team-context|团队上下文]]
- [[exploration-report|探索报告]]
- [[plan|详细设计方案]]
- [[test-plan|测试计划]]

## 代码范围

目标代码子目录：

```text
rk-flow-vscode-extension/
```
