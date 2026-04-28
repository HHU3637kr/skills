---
title: VSCode扩展包AgentTeam编排测试计划
type: test-plan
category: 02-技术设计
status: 已通过端侧验证
created: 2026-04-28
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - test-plan
  - vscode-extension
---

# 测试计划

## 测试目标

验证 VS Code 扩展包路线是否具备可实现性，并为后续实现阶段提供验收标准。

## MVP 验收项

- 扩展可以在 VS Code Extension Host 中启动
- Activity Bar 出现 R&K Flow 入口
- Side Bar 可以显示 Spec Explorer
- 可以打开 AgentTeam Canvas Webview
- 可以打开当前 Agent Chat Webview View
- 可以检测 Claude Code CLI / Codex CLI 是否存在
- 可以展示 Spec 与 Git 分支绑定
- 可以将 Agent Team 消息写入当前 Spec 目录

## Adapter 验证项

### Claude Code

- 可执行 `claude --help`
- 可使用 `--print` 获得非交互输出
- 可使用 `--output-format stream-json` 获得流式事件
- 可设置 `--session-id` 或 `--resume`

### Codex

- 可执行 `codex --help`
- 可使用 `codex exec --json`
- 可使用 `codex exec resume`
- 可检测 `codex app-server` 是否可用

## 端侧验证

后续实现阶段需要在 VS Code Extension Development Host 中验证：

- 打开项目工作区
- 点击 R&K Flow Activity Bar
- 切换不同 Spec
- 打开 AgentTeam Canvas
- 点击 Agent 节点
- 在右侧 Chat 发送消息
- 底部 Team Chatroom 出现通信记录
- Git / PR 面板显示当前分支

## 审计日志

所有测试证据应保留在当前 Spec 目录：

```text
logs/
  extension-host.log
  adapter-claude-code.log
  adapter-codex.log
  browser-or-webview-screenshot.png
audit-log.jsonl
team-chat.jsonl
```
