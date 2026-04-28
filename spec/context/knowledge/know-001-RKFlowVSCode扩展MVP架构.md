---
id: KNOW-001
title: RKFlowVSCode扩展MVP架构
type: 项目理解
keywords: [R&K Flow, VS Code Extension, AgentTeam, TeamBus, CLI Adapter, Spec]
created: 2026-04-28
---

# RKFlowVSCode扩展MVP架构

## 概述

R&K Flow VS Code Extension 的 MVP 目标是在不重做 IDE、不重做 Coding Agent 的前提下，把现有 Spec 工作流可视化并接入用户本机已安装的 Claude Code CLI / Codex CLI。

核心设计是：VS Code 负责项目、文件树、编辑器和扩展宿主；R&K Flow 扩展负责 Spec Explorer、AgentTeam Canvas、Role Chat、TeamBus、Git 分支绑定和 CLI Adapter。

## 详细内容

### 项目概述

扩展目录位于 `rk-flow-vscode-extension/`，通过 VSIX 安装。用户在已有 VS Code 工作区中打开 R&K Flow 入口，选择某个 Spec 后，可以查看该 Spec 对应的 AgentTeam Canvas，并与不同 AgentRole 对话。

### 核心架构

- `Spec Explorer`：扫描 `spec/**/plan.md`，读取 Spec 标题、目录、阶段和 Git 分支绑定。
- `AgentTeam Canvas`：Webview Panel，展示当前 Spec 的角色节点、Git 分支状态、Role Chat 和底部 Team Chatroom。
- `Role Chat`：用户与选中 AgentRole 的私聊界面，历史记录来自 `agent-chat.jsonl`。
- `TeamBus`：AgentRole 之间的通信边界，消息写入 `team-chat.jsonl`，审计写入 `audit-log.jsonl`。
- `Agent Adapter Layer`：封装 Claude Code CLI 与 Codex CLI 的检测、启动、resume 和 JSON/JSONL 事件转换。
- `Git Binding Manager`：读取当前分支，并支持切换到 Spec frontmatter 中记录的 `git_branch`。

### 数据流

1. 扩展启动后扫描 `spec/**/plan.md`。
2. 用户在 Spec Explorer 打开某个 Spec 的 AgentTeam Canvas。
3. Canvas 加载当前 Git 分支、TeamBus 消息、Role 私聊记录和 per-role session 文件。
4. 用户点击角色节点，右侧 Role Chat 切换到对应 AgentRole。
5. 用户发送消息后，扩展选择默认 Engine，启动或 resume 对应 CLI 会话。
6. CLI 输出被转换为 AgentEvent，并追加到 Role transcript。
7. Agent 如果输出 `rkFlowTeamMessage` JSON block，扩展解析后写入 TeamBus。
8. `requiresResponse=true` 的具体目标 Role 会被 Orchestrator 一跳唤起。

### 关键模块

- `src/extension.ts`：扩展激活、Webview、Role Chat、TeamBus 路由和 Orchestrator 入口。
- `src/agentAdapters/cliAdapters.ts`：Claude Code / Codex CLI 适配。
- `src/teamBus/fileTeamBus.ts`：TeamBus 文件落盘实现。
- `src/teamBus/protocol.ts`：Agent 输出协议解析。
- `src/specs/specRepository.ts`：Spec 扫描。
- `src/git/gitBinding.ts`：Git 分支读取和切换。
- `src/test/suite/extension.test.ts`：Extension Host 回归测试。

### 技术栈

- TypeScript
- VS Code Extension API
- VS Code Webview / WebviewPanel
- Node.js `child_process.spawn`
- Claude Code CLI
- Codex CLI
- JSONL 日志
- `@vscode/test-electron`

## 相关文件

- rk-flow-vscode-extension/src/extension.ts
- rk-flow-vscode-extension/src/agentAdapters/cliAdapters.ts
- rk-flow-vscode-extension/src/teamBus/fileTeamBus.ts
- rk-flow-vscode-extension/src/teamBus/protocol.ts
- rk-flow-vscode-extension/src/specs/specRepository.ts
- rk-flow-vscode-extension/src/git/gitBinding.ts
- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/plan.md
- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/summary.md

## 参考

- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/test-report.md
- prototypes/spec-workflow-canvas.html
