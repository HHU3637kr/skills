---
title: VSCode扩展包AgentTeam编排设计
type: plan
category: 02-技术设计
status: 已实现待测试
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
  - agent-team
related:
  - "[[exploration-report|探索报告]]"
---

# VSCode扩展包AgentTeam编排设计

## 1. 概述

### 背景

R&K Flow 已经形成 Spec 驱动开发方法论，并通过 HTML 原型验证了 AgentTeam Canvas、当前 Agent 私聊、Team Chatroom、Spec 与 Git 分支绑定等关键交互。

当前产品方向确定为 VS Code 扩展包（VSIX），不再走独立 IDE 路线。

### 目标

构建一个 VS Code Extension，使用户可以在现有 VS Code 工作区内使用 R&K Flow：

- 管理 Spec 生命周期
- 为每个 Spec 绑定 Git 工作分支
- 在 Webview 中可视化 AgentTeam Canvas
- 在右侧 Webview View 中与当前 Agent 角色对话
- 通过 Claude Code CLI / Codex CLI 执行真实 Coding Agent 能力
- 通过 Team Bus 实现 Agent 间自主通信和审计日志

### 范围

本 Spec 进入详细设计阶段，并创建 VS Code 扩展项目子目录。

本阶段不实现完整产品闭环，只建立：

- 扩展项目骨架
- 核心模块边界
- Adapter / Team Bus / Spec Storage 的类型设计入口
- Adapter 检测、Team Bus 落盘、Spec/Git 绑定的 MVP 入口

## 2. 需求分析

### 用户需求

用户希望：

- 使用 VS Code 扩展包承载 R&K Flow
- 避免重复实现 IDE 能力
- 避免重新实现 Coding Agent
- 复用用户本机已安装的 Claude Code CLI / Codex CLI
- 支持 Agent Team 中不同角色之间自主通话
- 保留 Spec 与 Git 分支绑定
- 保留右侧统一聊天 UI

### 关键约束

- 扩展必须尊重 VS Code workspace 边界
- Agent 执行必须可审计、可恢复、可中断
- Agent 之间不能点对点直连，必须经过 Orchestrator / Team Bus
- Claude Code / Codex 的适配层要保持薄，避免依赖私有 UI
- 初期优先跑通 MVP，不直接实现复杂多 Agent 并发调度

## 3. 设计方案

### 3.1 总体架构

```text
VS Code Extension
  ├─ Spec Explorer View
  ├─ AgentTeam Canvas Webview
  ├─ Agent Chat Webview View
  ├─ Git Binding Manager
  ├─ Team Bus / Orchestrator
  ├─ Agent Adapter Layer
  │   ├─ ClaudeCodeAdapter
  │   └─ CodexAdapter
  └─ Spec Storage / Audit Log
```

### 3.2 VS Code 扩展贡献点

MVP 使用以下 VS Code 能力：

- `viewsContainers.activitybar`: R&K Flow 入口
- `views`: Spec Explorer / Agent Adapters
- `commands`: 打开 AgentTeam Canvas、启动 Spec、切换分支、发送消息
- `WebviewPanel`: AgentTeam Canvas
- `WebviewViewProvider`: Agent Chat
- `Terminal` / `Pseudoterminal`: 外部 CLI 执行和输出流承载
- `workspaceState` / `globalState`: 会话索引和 UI 状态
- 文件系统：Spec 文档、team-chat、audit-log、agent-sessions 落盘

### 3.3 Agent Role 与 Agent Engine 解耦

```text
Agent Role = R&K Flow 中的职责身份
Agent Engine = Claude Code CLI / Codex CLI / 未来其他后端
Agent Session = 某角色在某 Spec 分支下的一段外部 Agent 会话
```

示例：

```json
{
  "role": "spec-executor",
  "engine": "codex-cli",
  "model": "gpt-5.3-codex",
  "workspace": "C:/project",
  "specDir": "spec/02-技术设计/20260428-1335-VSCode扩展包AgentTeam编排设计",
  "gitBranch": "feat/spec-20260428-1335-rk-flow-vscode-extension"
}
```

### 3.4 Agent Adapter 设计

#### ClaudeCodeAdapter

MVP 方案：

```text
claude --print --output-format stream-json --input-format stream-json --session-id <id>
```

职责：

- 构造 role prompt
- 注入 Spec 上下文
- 读取 stream-json 输出
- 映射为统一 AgentEvent
- 保存 session id

#### CodexAdapter

MVP 方案：

```text
codex exec --json -C <workspace> <prompt>
```

后续增强：

```text
codex app-server --listen ws://127.0.0.1:<port>
```

职责：

- 执行非交互任务
- 解析 JSONL 事件
- 支持 resume / fork
- 未来支持 app-server 长连接

### 3.5 Team Bus / 自主通信

Agent 之间不直接通信，统一通过 Team Bus。

MVP 接口：

```ts
team_send_message(input: {
  from: AgentRole;
  to: AgentRole | "TeamLead" | "all";
  type: "handoff" | "question" | "blocker" | "review_request" | "phase_request";
  subject: string;
  body: string;
  artifacts?: string[];
  requiresResponse?: boolean;
}): Promise<TeamMessage>;
```

Team Bus 职责：

- 写入 `team-chat.jsonl`
- 写入 `audit-log.jsonl`
- 判断是否需要唤醒目标 Agent
- 将消息注入目标 Agent 会话
- 防止循环唤醒和无限对话

### 3.6 存储布局

每个 Spec 目录下建议保留：

```text
team-chat.jsonl
audit-log.jsonl
agent-sessions/
  TeamLead.json
  spec-writer.json
  spec-executor.json
logs/
  claude-code/
  codex/
```

扩展全局状态只存索引，不存主要业务记录。

### 3.7 Git 分支绑定

每个 Spec 必须记录：

- `base_branch`
- `git_branch`
- `pr_url`

扩展通过 VS Code Git 能力或 Git CLI 完成：

- 检查当前分支
- 创建 Spec 分支
- 切换分支
- 展示同步状态
- 收尾时推送并创建 PR

## 4. 执行模式

### 执行模式选择

**推荐模式**：单 Agent

**选择理由**：

- v2.0 规范要求 `plan.md` 固定为 `single-agent`
- 本阶段是详细设计和骨架创建，不需要多文件并发改造
- Agent Teams 作为产品对象和工作流对象存在，具体实现阶段再按模块拆分

## 5. 实现步骤

### 阶段 A：扩展骨架

- 创建 `rk-flow-vscode-extension/`
- 配置 `package.json`
- 配置 TypeScript
- 注册 R&K Flow Activity Bar
- 注册 Spec Explorer
- 注册 AgentTeam Canvas Webview
- 注册 Agent Chat Webview View

### 阶段 B：核心类型

- 定义 `AgentRole`
- 定义 `AgentEngine`
- 定义 `AgentSession`
- 定义 `TeamMessage`
- 定义 `AgentEvent`
- 定义 `SpecBinding`

### 阶段 C：Adapter MVP

- `ClaudeCodeAdapter`: 先支持 stream-json 输出解析
- `CodexAdapter`: 先支持 `codex exec --json`
- 统一转换为 `AgentEvent`
- 输出落盘到 Spec 目录

### 阶段 D：Team Bus MVP

- 实现 `team_send_message`
- 实现 `team_read_messages`
- 实现 `team_request_phase_change`
- 写入 `team-chat.jsonl` / `audit-log.jsonl`
- UI 显示 Team Chatroom

### 阶段 E：Git Binding

- 读取 plan frontmatter
- 显示当前 Spec 分支
- 检查当前 workspace 分支
- 提供 checkout branch command

## 6. 风险和依赖

> [!warning]
> Claude Code / Codex CLI 输出协议可能随版本变化。Adapter 必须保持薄，并在日志中记录原始事件，方便排查。

> [!warning]
> 多 Agent 自主通信容易形成循环。Team Bus 必须设置唤醒上限、消息类型白名单和 TeamLead 阶段门禁。

> [!warning]
> Codex `app-server` 当前标注 experimental。MVP 不依赖它作为唯一实现路径。

> [!important]
> 不嵌入 Claude Code / Codex 自己的 VS Code 扩展 UI。R&K Flow 右侧 Chat 是统一产品界面，底层只复用 CLI / 服务能力。

## 7. 文档关联

- 探索报告: [[exploration-report|探索报告]]
- 测试计划: [[test-plan|测试计划草稿]]
- 团队上下文: [[team-context|团队上下文]]
- 实现总结: [[summary|实现总结]]
