---
title: VSCode扩展包AgentTeam编排探索报告
type: exploration-report
category: 02-技术设计
status: 已完成
created: 2026-04-28
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - explore
  - vscode-extension
---

# 探索报告

## 背景

前期原型已经验证了 R&K Flow Agent IDE 的核心交互：

- 左侧 Spec Explorer
- 中间 AgentTeam Canvas
- 右侧当前 Agent 私聊
- 底部 Team Chatroom / Agent Adapters / Git PR
- Spec 与 Git 分支绑定
- Agent 节点映射到 Claude Code / Codex 外部执行器

用户明确希望产品路线收敛为 VS Code 扩展包，而不是重新实现独立 IDE。

## 本机 CLI 能力观察

### Claude Code CLI

本机存在 `claude` 命令。能力要点：

- `--print` 非交互输出
- `--output-format stream-json`
- `--input-format stream-json`
- `--session-id`
- `--resume` / `--continue`
- `--permission-mode`
- `--allowedTools` / `--disallowedTools`
- `--model`
- `--debug-file`

结论：Claude Code 适合先作为流式进程适配器接入。

### Codex CLI

本机存在 `codex` 命令。能力要点：

- `codex exec --json`
- `codex exec resume`
- `codex resume` / `codex fork`
- `codex mcp-server`
- `codex app-server --listen stdio:// | ws://IP:PORT`

结论：Codex MVP 可先走 `exec --json`，后续升级为 `app-server` 或 MCP server。

## 产品路线判断

推荐路线：

1. VS Code Extension MVP
2. 本地 Orchestrator / Team Bus
3. 外部 Agent Adapter
4. 后续再抽象为独立桌面端或多 IDE 后端

不推荐路线：

- 重写文件树、编辑器、Git、Terminal
- 嵌入 Claude Code / Codex 自己的 VS Code 扩展 UI
- 让 Agent 之间点对点通信

## 核心设计结论

Agent Team 通信应通过 R&K Team Bus 实现：

```text
Agent Role -> R&K MCP / Adapter API -> Team Bus -> Target Agent Session
```

每条通信都必须落盘，形成可审计记录。

## 关联原型

- `prototypes/spec-workflow-canvas.html`
- `prototypes/spec-workflow-canvas-preview.png`
- `prototypes/spec-workflow-canvas-figma-brief.md`
