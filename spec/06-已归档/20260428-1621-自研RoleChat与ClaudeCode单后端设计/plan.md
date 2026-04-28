---
title: 自研RoleChat与ClaudeCode单后端设计
type: plan
category: 02-技术设计
status: 已确认
priority: 高
created: 2026-04-28
execution_mode: single-agent
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
pr_url:
tags:
  - spec
  - plan
  - vscode-extension
  - claude-code
related:
  - "[[exploration-report|探索报告]]"
---

# 自研RoleChat与ClaudeCode单后端设计

## 1. 背景

当前 R&K Flow VS Code 扩展已经实现：

- Spec Explorer
- AgentTeam Canvas
- Role Chat Webview
- Team Chatroom Panel
- TeamBus 协议和审计日志
- Claude Code / Codex CLI Adapter

经过 Claude Code 官方 VS Code 扩展探索后，确认官方扩展没有公开稳定的第三方 Chat API，也不适合作为 R&K Flow 的可控聊天内核。最新方向调整为：继续自研 Role Chat UI，但 MVP 后端只保留 Claude Code CLI。

## 2. 目标

- 保留 `Role Chat` 作为用户与单个 AgentRole 的对话入口
- 点击 Canvas Role 后切换右侧 Role Chat 的当前角色
- 用户与 Role 的私聊记录写入当前 Spec 目录的 `agent-chat.jsonl`
- AgentRole 之间的消息只写入 `team-chat.jsonl` / `audit-log.jsonl`
- 所有 AgentRole 默认使用 Claude Code CLI
- 暂时移除 Codex CLI 支持，不在 UI、默认路由和测试中暴露
- 保留 `AgentAdapter` 抽象，后续接入新 CLI 时再新增具体 Adapter

## 3. 非目标

- 不嵌入 Claude Code 官方 Webview
- 不读取 Claude Code 官方 Webview DOM
- 不把 Claude Code 本地 transcript / session 文件作为实时编排协议
- 不依赖 Claude Code 扩展私有 bundle
- 不支持 Codex CLI
- 不把用户与 Role 的私聊记录混入 Team Chatroom
- 不实现无限多轮 Agent 自主调度

## 4. 目标架构

```text
R&K Flow VS Code Extension
  ├─ Spec Explorer
  ├─ AgentTeam Canvas
  │   └─ click Role -> select AgentRole -> focus Role Chat
  ├─ Role Chat View
  │   ├─ role selector
  │   ├─ per-role private transcript
  │   ├─ Claude Code model/default selector
  │   └─ Send to Role -> ClaudeCodeAdapter
  ├─ Team Chatroom Panel
  │   └─ TeamBus messages only
  ├─ TeamBus / Orchestrator
  ├─ Agent Adapter Layer
  │   └─ ClaudeCodeAdapter
  └─ Adapter Registry
      └─ future CLI adapters
```

## 5. 模块设计

### 5.1 Role Chat

职责：

- 展示当前 Role
- 按 Role 隔离私聊 transcript
- 发送用户消息到当前 Role
- 使用 ClaudeCodeAdapter 启动或恢复该 Role 的 CLI session
- 将用户消息和 Agent 响应写入 `agent-chat.jsonl`
- 从 Agent 响应中提取 `rkFlowTeamMessage`，只把角色间消息写入 TeamBus

### 5.2 ClaudeCodeAdapter

MVP 唯一注册后端：

```ts
const adapters: AgentAdapter[] = [new ClaudeCodeAdapter()];
```

约束：

- 使用 Claude Code CLI `--print --output-format stream-json`
- 每个 Role 使用独立 session 文件
- 支持 resume，避免每次对话都新开会话
- 不依赖 Claude Code 官方 VS Code 扩展

### 5.3 Adapter Registry

当前实现：

- 只注册 `ClaudeCodeAdapter`
- `AgentEngine` 保留扩展位，例如 `external-cli`
- 不保留已暴露的 Codex UI、Codex 默认路由、Codex 检测测试

### 5.4 Role 默认引擎

所有 Role 默认映射：

```text
TeamLead       -> claude-code
spec-explorer  -> claude-code
spec-writer    -> claude-code
spec-executor  -> claude-code
spec-tester    -> claude-code
spec-debugger  -> claude-code
spec-ender     -> claude-code
```

### 5.5 TeamBus 边界

TeamBus 继续负责：

- `team-chat.jsonl`
- `audit-log.jsonl`
- AgentRole 间消息展示
- 一跳自动路由
- 阶段推进请求

边界规则：

- 用户和 Role 的私聊只进入 `agent-chat.jsonl`
- Team Chatroom 只展示 AgentRole 到 AgentRole 的消息
- Agent 响应中的 `rkFlowTeamMessage` 会被解析并落入 TeamBus

## 6. 实现步骤

### 步骤 A：移除 Codex 暴露路径

- 从扩展激活逻辑中移除 `new CodexAdapter()`
- `AgentAdaptersProvider` 只显示 Claude Code 和 VS Code terminal bridge
- 所有 Canvas 节点显示 `Claude Code`
- 移除 Role Chat 中的 Codex 模型选项
- 测试不再导入或检测 CodexAdapter

### 步骤 B：统一 Role 后端

- `defaultEngineForRole()` 永远返回 `claude-code`
- `normalizeModelForEngine()` 对当前 MVP 统一返回 `default`
- `extractExternalSessionId()` 只处理 Claude Code 的 `session_id`

### 步骤 C：保留自研 Role Chat

- 保留 `rkFlow.agentChat` Webview View
- 保留 per-role transcript 和 session 状态
- Canvas 点击 Agent 节点后调用 `rkFlow.selectAgentRole`
- Role Chat 聚焦并切换到对应 Role

### 步骤 D：保持 Team Chatroom 独立

- `rkFlow.teamChatroom` 保持在 VS Code Panel
- 不把用户私聊写入 Team Chatroom
- TeamBus 消息继续支持 `from/to/type/subject/body/requiresResponse`

### 步骤 E：验证

- TypeScript 编译
- Extension Host 测试
- VSIX 打包
- 端侧验证 Canvas 点击、Role Chat 私聊、Team Chatroom 角色间消息

## 7. 风险

> [!warning]
> 自研 Role Chat 需要持续维护 UI 和会话状态，但这是当前唯一能保证 R&K Flow 可控编排、可审计、可扩展的方案。

> [!warning]
> Claude Code CLI session resume 依赖 CLI 的稳定参数和返回字段；需要保留降级错误提示和日志。

> [!important]
> 自动化编排必须走 R&K 自己的 ClaudeCodeAdapter 和 TeamBus，否则无法保证 AgentRole 通信记录与审计日志完整。

## 8. 验收标准

- 扩展编译通过
- Extension Host 测试通过
- VSIX 打包通过
- Agent Adapters 中不显示 Codex
- 代码中不注册 CodexAdapter
- UI 中不出现 Codex 模型选项
- 所有 Role 默认 engine 为 Claude Code
- 点击 Canvas Role 后切换右侧 Role Chat
- 用户与 Role 的对话写入 `agent-chat.jsonl`
- Team Chatroom 只展示 TeamBus 角色间消息
- 代码仍保留 Adapter interface，后续可接入新 CLI

## 9. 文档关联

- 探索报告: [[exploration-report|探索报告]]
- 测试计划: [[test-plan|测试计划]]
- 团队上下文: [[team-context|团队上下文]]
