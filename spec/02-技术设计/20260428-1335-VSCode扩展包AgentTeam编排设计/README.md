---
title: VSCode扩展包AgentTeam编排设计
type: spec-index
category: 02-技术设计
status: 进行中
created: 2026-04-28
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - vscode-extension
  - agent-team
---

# VSCode扩展包AgentTeam编排设计

## 目标

将 R&K Flow 的 Spec 驱动、多角色 Agent Team 工作流设计为 VS Code 扩展包（VSIX）形态。

核心原则：

- 不重新实现 Coding Agent
- 复用用户本机已安装的 Claude Code CLI / Codex CLI
- 复用 VS Code 原生 Explorer / Editor / Git / Terminal / Webview
- R&K Flow 只负责 Spec 管理、角色编排、消息路由、审计日志和阶段门禁

## 当前阶段

- 阶段一：需求对齐已完成
- 阶段二：详细设计已确认
- 阶段三：MVP 骨架实现已完成
- 阶段四：Extension Host 端侧验证已通过

## 文档

- [[exploration-report|探索报告]]
- [[plan|详细设计方案]]
- [[test-plan|测试计划草稿]]
- [[test-report|测试报告]]
- [[team-context|团队上下文]]
- [[summary|实现总结]]

## 项目子目录

代码骨架位于：

```text
rk-flow-vscode-extension/
```
