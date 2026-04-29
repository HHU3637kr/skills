---
title: AgentTeam Runtime生命周期与ClaudeCode后端加载设计
type: plan
category: 02-技术设计
status: 已归档
priority: 高
created: 2026-04-28
execution_mode: single-agent
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - plan
  - vscode-extension
  - agent-team-runtime
  - claude-code
related:
  - "[[../20260428-1825-CreateSpec入口与Spec目录体验优化/summary|CreateSpec入口与Spec目录体验优化]]"
---

# AgentTeam Runtime生命周期与ClaudeCode后端加载设计

## 1. 概述

### 1.1 背景

当前 R&K Flow VS Code 扩展已经具备基础能力：

- 每个 Spec 可打开 AgentTeam Canvas。
- 用户可在右侧 Role Chat 中与指定 Role 对话。
- Role 可通过 Claude Code CLI 执行一次对话 Turn。
- Role 之间可以通过 TeamBus JSONL 记录通信。
- Claude Code session id 会按 `Spec + Role` 写入 `agent-sessions/*.json`。

但当前实现仍是 MVP 形态，核心执行链路是：

```text
用户发送消息
  -> 直接调用 Claude Code CLI
  -> 消费 stream-json
  -> 写入 timeline / audit / team-chat
  -> CLI 进程退出
```

这个模型容易让用户误解为“每次发送消息都重新初始化 Agent”。实际上更准确的目标模型应该是：

```text
Role 是长期存在的职责状态机
Claude Code 是 RoleRuntime 调用的底层后端
Claude CLI Process 是一次 Turn 的短生命周期执行进程
```

因此需要引入一层明确的 `AgentTeam Runtime`，把 Spec、Team、Role、Mailbox、Backend Session 和 CLI Process 的生命周期分开管理。

### 1.2 目标

1. 明确 R&K Flow 的全局 Runtime 生命周期模型。
2. 将每个 Spec 建模为一个长期存在的 AgentTeam Runtime。
3. 将每个 AgentRole 建模为长期存活的状态机，在 Spec 归档前持续存在。
4. 将 TeamBus 从“日志记录”升级为真正的消息队列。
5. 明确 `requiresResponse` 只表示是否需要回复，不表示是否投递。
6. 明确 Claude Code session 由 Role 持有。
7. 明确 Claude Code CLI 的加载方式：后端能力常驻、session 持久、process 短生命周期。
8. 支持 VS Code 重启后的 Runtime 恢复。
9. 明确用户私聊、Role 间通信、TeamChatroom 只读边界。

### 1.3 范围

**包含**：

- Runtime 数据模型设计。
- Role 状态机设计。
- TeamBus 队列与 mailbox 设计。
- Claude Code Backend 加载与调用边界。
- VS Code 重启恢复流程。
- 当前 MVP 到目标 Runtime 的迁移步骤。

**不包含**：

- 不实现 Claude Code 常驻 daemon。
- 不嵌入 Claude Code 官方 VS Code Webview。
- 不读取 Claude Code 官方扩展私有状态。
- 不恢复 Codex CLI 支持。
- 不在本 plan 中编写测试计划。

## 2. 需求分析

### 2.1 核心概念澄清

当前讨论中需要统一三层概念：

```text
Role
  = 工作流职责与状态机

RoleRuntime
  = R&K Flow 自己管理的执行单元

Claude Code
  = RoleRuntime 调用的底层 AgentBackend
```

禁止继续混用以下概念：

```text
Role != Claude Code
Role != Claude session
Role != CLI process
AgentTeam Runtime != 一次 CLI 调用
```

### 2.2 功能需求

#### FR-001: 每个 Spec 一个 AgentTeam Runtime

每个 Spec 目录对应一个独立 AgentTeam：

```text
SpecRuntime
  owns AgentTeamRuntime
    owns RoleRuntime[]
```

Spec 创建时初始化 Runtime，Spec 归档时冻结 Runtime。

#### FR-002: AgentRole 长期存活

Role 在 Spec 归档前一直存在，不因一次 Claude CLI 进程退出而销毁。

Role 应保存：

- 角色身份。
- 当前状态。
- mailbox cursor。
- backend session。
- 当前任务。
- 最近错误。
- 生命周期时间戳。

#### FR-003: TeamBus 是真实消息队列

Role 之间的消息必须被投递到目标 Role mailbox。

```text
requiresResponse=false
  = 必须投递
  = 不要求目标 Role 立即回复

requiresResponse=true
  = 必须投递
  = 目标 Role 需要执行并回复
```

#### FR-004: Claude Code Session 由 Role 持有

Claude Code session 按 `Spec + Role` 持久化：

```text
agent-sessions/TeamLead.json
agent-sessions/spec-explorer.json
agent-sessions/spec-writer.json
```

RoleRuntime 在执行时读取自己的 backend session，并决定使用 `start` 还是 `resume`。

#### FR-005: Claude CLI Process 短生命周期

当前仍采用稳定的 CLI 调用模式：

```text
RoleRuntime receives task
  -> spawn claude --print --output-format stream-json --resume <sessionId>
  -> consume stream events
  -> update timeline / mailbox / session / state
  -> process exits
```

CLI process 不常驻。长期存在的是 RoleRuntime 与 BackendSession。

#### FR-006: 用户与 Team 对话边界隔离

用户可以与单个 Role 进行私聊：

```text
用户 <-> Role Chat <-> RoleRuntime
```

Role 之间通过 TeamBus 通信：

```text
Role <-> TeamBus <-> Role
```

用户对 TeamChatroom 只读，不直接干扰 Role 间通信历史。

### 2.3 非功能需求

- **可恢复性**：VS Code 重启后可从磁盘恢复 SpecRuntime、RoleRuntime、mailbox 和 backend session。
- **可解释性**：UI 应显示 Role 状态，而不是只显示 Claude Code init 事件。
- **可控性**：不会在 VS Code 启动时自动执行大量 queued message。
- **可扩展性**：后续可接入其他 AgentBackend，但不影响 Role 状态机设计。
- **安全性**：用户不可直接篡改 TeamBus 历史，只能通过明确入口发起调度请求。

## 3. 设计方案

### 3.1 整体架构

```text
VS Code Extension
  ├─ RuntimeManager
  │   ├─ SpecRuntimeRegistry
  │   ├─ AgentTeamRuntime
  │   ├─ RoleRuntime[]
  │   └─ RuntimeStore
  │
  ├─ TeamBusQueue
  │   ├─ team-chat.jsonl
  │   ├─ team-mailboxes/<role>.jsonl
  │   └─ delivery-state.json
  │
  ├─ BackendRegistry
  │   └─ ClaudeCodeBackend
  │       ├─ detect()
  │       ├─ loadSession()
  │       └─ invoke()
  │
  ├─ Role Chat UI
  ├─ Team Chatroom UI
  └─ Runtime Inspector UI
```

### 3.2 SpecRuntime 生命周期

```text
created
  -> initialized
  -> active
  -> paused
  -> resumed
  -> completing
  -> archived
```

状态说明：

| 状态 | 含义 | 触发条件 |
|------|------|----------|
| `created` | Spec 目录已创建 | Create Spec 完成 |
| `initialized` | Runtime 文件、Role、TeamBus 初始化完成 | 首次打开 Spec |
| `active` | Spec 可接收消息和任务 | 用户打开或激活 Spec |
| `paused` | 暂停调度，不主动执行任务 | VS Code 关闭、切换工作区 |
| `resumed` | 从磁盘恢复 Runtime | VS Code 重新打开 |
| `completing` | 收尾中，不接收新开发任务 | 进入 spec-end |
| `archived` | 生命周期结束，只读保留历史 | Spec 移入 `06-已归档` |

### 3.3 RoleRuntime 状态模型

不建议用单一字段承载全部状态。建议拆成三组状态：

```ts
interface RoleRuntimeState {
  lifecycle: RoleLifecycleState;
  activity: RoleActivityState;
  backend: BackendSessionState;
}

type RoleLifecycleState =
  | "active"
  | "paused"
  | "completing"
  | "archived";

type RoleActivityState =
  | "idle"
  | "queued"
  | "running"
  | "waiting"
  | "blocked"
  | "failed";

type BackendSessionState =
  | "none"
  | "resumable"
  | "running"
  | "expired"
  | "error";
```

示例：

```json
{
  "role": "spec-explorer",
  "lifecycle": "active",
  "activity": "queued",
  "backend": "resumable",
  "mailboxCursor": 18,
  "sessionId": "claude-session-id",
  "currentTaskId": null
}
```

### 3.4 Runtime 持久化文件

每个 Spec 目录新增：

```text
runtime.json
team-mailboxes/
  TeamLead.jsonl
  spec-explorer.jsonl
  spec-writer.jsonl
  spec-executor.jsonl
  spec-tester.jsonl
  spec-debugger.jsonl
  spec-ender.jsonl
delivery-state.json
```

`runtime.json` 示例：

```json
{
  "version": 1,
  "specId": "20260428-1904",
  "state": "active",
  "activeRole": "TeamLead",
  "roles": {
    "TeamLead": {
      "lifecycle": "active",
      "activity": "idle",
      "backend": "resumable",
      "sessionId": "xxx",
      "mailboxCursor": 12,
      "updatedAt": "2026-04-28T19:04:00+08:00"
    }
  }
}
```

### 3.5 TeamBus 队列设计

当前 `team-chat.jsonl` 继续作为全局可读通信记录。

新增 mailbox 投递：

```text
sendMessage()
  -> append team-chat.jsonl
  -> expand recipient
  -> append team-mailboxes/<role>.jsonl
  -> update delivery-state.json
  -> if requiresResponse=true: schedule role
  -> if requiresResponse=false: mark delivered, do not force immediate reply
```

消息模型：

```ts
interface TeamMessage {
  id: string;
  specId: string;
  from: AgentRole;
  to: AgentRole | "all";
  type: TeamMessageType;
  subject: string;
  body: string;
  artifacts: string[];
  requiresResponse: boolean;
  createdAt: string;
}

interface DeliveryState {
  messageId: string;
  recipient: AgentRole;
  state: "pending" | "delivered" | "seen" | "handled" | "failed";
  requiresResponse: boolean;
  responseMessageId?: string;
  updatedAt: string;
}
```

> [!important]
> `requiresResponse=false` 不能再表示“不调度/不投递”。消息必须进入目标 Role mailbox。

### 3.6 Claude Code Backend 加载方式

当前调用方式：

```text
detect:
  claude --help

start:
  claude --print --output-format stream-json --verbose --session-id <id> <prompt>

resume:
  claude --print --output-format stream-json --verbose --resume <id> <prompt>
```

目标抽象：

```ts
interface AgentBackend {
  readonly engine: AgentEngine;
  detect(): Promise<BackendStatus>;
  loadSession(role: RoleRuntime): Promise<BackendSession>;
  invoke(request: BackendInvokeRequest): AsyncIterable<BackendEvent>;
  cancel(turnId: string): Promise<void>;
}
```

加载分三层：

```text
Extension activate
  -> BackendRegistry.detect()
  -> 不启动 Claude 对话

SpecRuntime activate
  -> RoleRuntime.loadBackendSession()
  -> 读取 agent-sessions/<role>.json
  -> 不启动 Claude 进程

RoleRuntime execute
  -> ClaudeCodeBackend.invoke()
  -> 启动一次短生命周期 CLI process
```

### 3.7 VS Code 重启恢复

恢复流程：

```text
Extension activate
  -> scan spec/**
  -> find non-archived specs
  -> read runtime.json
  -> restore SpecRuntime
  -> restore RoleRuntime[]
  -> restore mailbox cursor
  -> restore backend session metadata
  -> render UI
```

恢复原则：

- 不自动执行 queued message。
- 不自动启动 Claude CLI。
- UI 显示 queued / waiting / failed 状态。
- 由用户或 TeamLead 明确点击 Continue / Resume 后继续调度。

### 3.8 UI 影响

Role Chat 顶部不再主要展示：

```text
Claude Code session initialized
```

而应展示：

```text
TeamLead
state: idle
backend: claude-code
session: resumable
process: stopped
mailbox: 0 pending
```

Team Chatroom：

- 只读展示 Role 间通信。
- 展示 delivery state。
- 展示 requires response。
- 不提供用户直接改写 TeamBus 的输入框。

Runtime Inspector：

- 展示 SpecRuntime 状态。
- 展示每个 Role 的 lifecycle/activity/backend。
- 展示 mailbox backlog。
- 提供 retry、continue、reset session 等明确操作。

## 4. 执行模式

### 执行模式选择

**推荐模式**：单 Agent

**选择理由**：

- 本阶段是架构和数据模型重构，跨模块一致性比并发速度更重要。
- Runtime、TeamBus、Role 状态机、Backend 抽象互相耦合，需要统一设计和逐步迁移。
- 当前代码仍集中在 VS Code 扩展内，先由单 Agent 完成核心 Runtime 骨架更可控。
- 后续测试阶段可由 spec-tester 独立设计端侧测试和恢复测试。

## 5. 实现步骤

### 阶段 1：Runtime 数据模型

- [ ] 新增 `src/runtime/types.ts`。
- [ ] 定义 `SpecRuntimeState`、`RoleRuntimeState`、`BackendSessionState`。
- [ ] 定义 `runtime.json` 的读写模型。
- [ ] 定义 Runtime schema version。

### 阶段 2：RuntimeStore

- [ ] 新增 `src/runtime/runtimeStore.ts`。
- [ ] 支持初始化 `runtime.json`。
- [ ] 支持读取、更新、迁移 Runtime 状态。
- [ ] 支持 VS Code 重启后的恢复。

### 阶段 3：RoleRuntime

- [ ] 新增 `src/runtime/roleRuntime.ts`。
- [ ] 将当前 `runAgentMessage()` 的状态迁移到 RoleRuntime。
- [ ] RoleRuntime 负责锁定 Role、设置 running、处理完成/失败状态。
- [ ] RoleRuntime 持有 backend session 引用。

### 阶段 4：TeamBusQueue

- [ ] 扩展 `FileTeamBus` 或新增 `TeamBusQueue`。
- [ ] 新增 `team-mailboxes/<role>.jsonl`。
- [ ] 新增 `delivery-state.json`。
- [ ] 修改 `requiresResponse` 语义：始终投递，仅控制是否要求回复。
- [ ] 移除当前“一跳响应”中的隐式不投递问题。

### 阶段 5：ClaudeCodeBackend

- [ ] 将 `ClaudeCodeAdapter` 升级为 `ClaudeCodeBackend`。
- [ ] 保留 `--print + stream-json + --resume` 短进程调用模式。
- [ ] 将 detect/loadSession/invoke 分层。
- [ ] UI 中区分 backend session 与 CLI process。

### 阶段 6：UI 接入

- [ ] Role Chat 展示 RoleRuntime 状态。
- [ ] Team Chatroom 展示消息 delivery state。
- [ ] 新增 Runtime Inspector 或在现有侧栏中展示 Runtime 状态。
- [ ] 增加 Continue / Retry / Reset Session 的明确入口。

### 阶段 7：兼容迁移

- [ ] 对缺少 `runtime.json` 的旧 Spec 自动初始化 Runtime。
- [ ] 对已有 `agent-sessions/*.json` 进行无损复用。
- [ ] 对已有 `team-chat.jsonl` 只读保留，不强制回填 mailbox。
- [ ] 新消息开始写入 mailbox 和 delivery-state。

## 6. 风险和依赖

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Runtime 状态过度复杂 | 实现成本和 UI 理解成本上升 | 中 | 拆分 lifecycle/activity/backend 三组状态 |
| TeamBus 队列引入重复投递 | Role 收到重复消息 | 中 | 使用 message id + mailbox cursor 去重 |
| VS Code 重启后误自动执行任务 | 产生非预期 Claude 调用 | 中 | 恢复后只显示 queued，不自动运行 |
| Claude session 过期或 resume 失败 | Role 执行失败 | 中 | 标记 backend=expired，提供 reset session |
| 旧 Spec 缺少 runtime.json | 兼容性问题 | 高 | 首次打开时自动初始化 runtime.json |
| CLI process 无法可靠取消 | 用户体验差 | 中 | 第一阶段先支持进程级 kill，后续完善 cancel 语义 |

> [!warning]
> 不应为了“生命周期长期存在”而强行让 Claude CLI process 常驻。当前更稳妥的边界是 RoleRuntime 长期存在、BackendSession 长期持久、CLI Process 每 Turn 短生命周期。

## 7. 文档关联

- 测试计划: [[test-plan|测试计划]] (待创建，由 spec-tester 创建)
- 实现总结: [[summary|实现总结]] (待创建)
- 相关实现: [[../20260428-1825-CreateSpec入口与Spec目录体验优化/summary|CreateSpec入口与Spec目录体验优化]]
