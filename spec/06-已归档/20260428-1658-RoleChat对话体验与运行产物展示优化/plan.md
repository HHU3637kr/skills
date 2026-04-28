---
title: RoleChat对话体验与运行产物展示优化
type: plan
category: 02-技术设计
status: 已确认
priority: 高
created: 2026-04-28
execution_mode: single-agent
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - plan
  - vscode-extension
  - role-chat
  - agent-timeline
  - claude-code
related:
  - "[[exploration-report|探索报告]]"
---

# RoleChat对话体验与运行产物展示优化

## 1. 概述

### 背景

当前 R&K Flow 的 Role Chat 已经能够完成用户与单个 AgentRole 的私聊，并通过 Claude Code CLI 执行真实 Agent 会话。但当前展示层仍是“纯文本气泡”：

- Claude Code `stream-json` 事件被抽取为字符串后直接追加到 transcript
- 工具调用、工具结果、计划、错误、系统状态都没有独立展示形态
- Markdown、代码块、diff、文件引用、命令输出缺少专用渲染
- 大输出容易刷屏，最终回答容易被工具日志淹没
- Webview HTML/JS/CSS 仍集中在 `extension.ts`，继续扩展会失控

因此本 Spec 目标是把 Role Chat 从“聊天气泡列表”升级为“结构化 Agent Timeline”。

### 目标

本次实现目标：

- 建立 R&K Flow 自有的 `RoleTimelineItem` 数据模型
- 将 Claude Code raw `AgentEvent` 映射为稳定 Timeline item
- 引入 turn grouping，将一轮用户输入下的回复、工具、状态、错误聚合展示
- 将 Role Chat 渲染逻辑从 `extension.ts` 拆分到 `src/roleChat/`
- 支持安全 Markdown、代码块、工具调用折叠、系统状态、错误状态
- TeamBus 协议块友好展示，不裸露 JSON block
- 保留 `agent-chat.jsonl` 兼容读取，同时新增 `agent-timeline.jsonl` 承载结构化 UI 事件

### 范围

本轮覆盖：

- Role Chat Webview 结构化 timeline
- Claude Code 单后端事件映射
- 私聊历史兼容展示
- 工具调用/工具结果摘要展示
- Markdown 和代码块基础安全渲染
- 文件路径展示与打开命令
- 大输出摘要/折叠
- UI 运行状态、错误状态、重试入口的基础展示

本轮不覆盖：

- Codex 或其他 CLI 后端
- Claude Code 官方扩展 Webview 接管
- 读取 Claude Code 私有 transcript 作为主数据源
- 完整 token/cost/context 可视化
- 完整虚拟滚动系统
- 完整 diff viewer 组件
- 多 Agent 自主调度重构

> [!important]
> 本 Spec 是显示层和内部 UI 事件模型升级，不改变 TeamBus 的协议边界，不改变 ClaudeCodeAdapter 作为当前唯一后端的方向。

## 2. 需求分析

### 2.1 用户体验需求

用户希望 Role Chat 的体验接近 Claude / Claude Code：

- 对话主体清爽，最终回答突出
- 工具调用可见但不刷屏
- 计划/步骤能被快速理解
- 命令、文件、测试、错误等运行产物有专门展示方式
- 长输出默认折叠，用户需要时可以展开
- 历史会话刷新后结构保持一致
- 不出现重复回复、空白气泡、协议 JSON 裸露等问题

### 2.2 信息类型需求

Role Chat 需要展示以下信息类型：

| 类型 | 说明 |
|------|------|
| 用户消息 | 当前用户发给某个 AgentRole 的输入 |
| Agent 回复 | Agent 面向用户的可读回答 |
| 计划/步骤 | Agent 的 plan、todo、阶段性执行步骤 |
| 工具调用 | Bash、Read、Edit、Write、Grep、Glob、Task、TodoWrite 等 |
| 工具结果 | stdout/stderr、文件内容、diff、匹配结果、测试结果 |
| 系统状态 | session start/resume、api retry、init、done |
| 错误 | CLI 不可用、命令失败、权限问题、解析失败 |
| TeamBus 事件 | Agent 向其他角色发送消息的结构化提示 |
| Artifact | 文件路径、日志路径、打包产物、测试报告 |

### 2.3 数据边界需求

必须保留现有边界：

- `agent-chat.jsonl`：用户与单个 Role 的私聊最终消息
- `team-chat.jsonl`：AgentRole 之间的 TeamBus 消息
- `audit-log.jsonl`：审计事件
- `logs/agent-events.jsonl`：Claude Code raw event
- `agent-timeline.jsonl`：新增，Role Chat 结构化 UI 事件

`agent-timeline.jsonl` 不能替代 raw event，也不能替代审计日志。它是 UI 可恢复展示层。

### 2.4 安全需求

- Webview 不直接插入 raw HTML
- Markdown 渲染必须 escape HTML
- 工具输出默认截断和折叠
- 命令输出中疑似 token / key / secret 的内容需要脱敏
- 文件路径点击打开必须限制在当前 workspace 内
- TeamBus JSON block 不直接裸露给普通用户阅读

### 2.5 与 spec-tester 的接口边界

给 spec-tester 的测试边界建议：

- `AgentEvent -> RoleTimelineItem` 是核心可测接口
- Markdown 渲染必须覆盖 XSS 输入
- 大输出截断必须可配置、可断言
- TeamBus JSON block 必须转换为结构化 item
- `type === "result"` 聚合事件不能造成重复回复
- Webview 端需要验证折叠/展开、跳到底部、Role 切换和历史恢复

## 3. 设计方案

### 3.1 总体架构

新增 `src/roleChat/` 模块：

```text
rk-flow-vscode-extension/src/roleChat/
  timelineTypes.ts        # Timeline 类型定义
  timelineMapper.ts       # AgentEvent / PrivateRoleChatMessage -> Timeline item
  timelineStore.ts        # agent-timeline.jsonl 读写与旧数据兼容
  markdown.ts             # 安全 Markdown 渲染
  renderRoleChatHtml.ts   # Webview HTML/CSS/JS 渲染
  renderers.ts            # Timeline item -> HTML fragment
```

`extension.ts` 保留编排职责：

- Webview 注册
- Spec / Role 状态管理
- 调用 ClaudeCodeAdapter
- 写入 audit / TeamBus
- 将 Timeline item postMessage 给 Webview

`extension.ts` 不再承载复杂 HTML、CSS、JS 字符串。

### 3.2 Timeline 数据模型

新增核心类型：

```ts
export type RoleTimelineItemType =
  | "turn_start"
  | "user_message"
  | "assistant_message"
  | "plan"
  | "tool_call"
  | "tool_result"
  | "artifact"
  | "team_bus"
  | "system_status"
  | "error"
  | "turn_end";

export interface RoleTimelineItemBase {
  id: string;
  specId: string;
  role: AgentRole;
  turnId: string;
  sessionId?: string;
  type: RoleTimelineItemType;
  timestamp: string;
  source: "user" | "agent" | "system" | "team_bus";
  rawEventId?: string;
}
```

具体 item：

```ts
export interface UserMessageItem extends RoleTimelineItemBase {
  type: "user_message";
  body: string;
}

export interface AssistantMessageItem extends RoleTimelineItemBase {
  type: "assistant_message";
  body: string;
  format: "markdown";
  final: boolean;
}

export interface PlanItem extends RoleTimelineItemBase {
  type: "plan";
  title: string;
  steps: Array<{
    id: string;
    text: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
  }>;
}

export interface ToolCallItem extends RoleTimelineItemBase {
  type: "tool_call";
  toolName: string;
  title: string;
  inputSummary: string;
  rawInput?: unknown;
  collapsed: boolean;
}

export interface ToolResultItem extends RoleTimelineItemBase {
  type: "tool_result";
  toolName: string;
  title: string;
  status: "success" | "failed" | "canceled";
  outputSummary: string;
  outputPreview?: string;
  rawOutput?: unknown;
  exitCode?: number;
  durationMs?: number;
  collapsed: boolean;
}

export interface ArtifactItem extends RoleTimelineItemBase {
  type: "artifact";
  artifactType: "file" | "diff" | "log" | "test" | "package" | "link";
  title: string;
  path?: string;
  summary?: string;
}

export interface TeamBusItem extends RoleTimelineItemBase {
  type: "team_bus";
  to: AgentRole | "all";
  messageType: TeamMessageType;
  subject: string;
  body: string;
  requiresResponse: boolean;
}

export interface SystemStatusItem extends RoleTimelineItemBase {
  type: "system_status";
  status: "started" | "resumed" | "retrying" | "completed" | "waiting" | "info";
  message: string;
}

export interface ErrorItem extends RoleTimelineItemBase {
  type: "error";
  severity: "warning" | "error";
  message: string;
  detail?: string;
}
```

### 3.3 Turn grouping

每次用户发送消息时创建一个 `turnId`：

```ts
const turnId = createId("turn");
```

同一轮中：

1. 写入 `turn_start`
2. 写入 `user_message`
3. session start/resume 写入 `system_status`
4. Claude Code event 映射为多个 timeline item
5. 最终回答 upsert 到该 turn 的 `assistant_message`
6. 写入 `turn_end`

> [!important]
> 不能在 `agentEvent` 和 `agentDone` 中各追加一次最终回答。`agentDone` 只能补充 messageId / final 状态，不能造成重复气泡。

### 3.4 AgentEvent 映射规则

新增：

```ts
export function mapAgentEventToTimelineItems(input: {
  spec: SpecBinding;
  role: AgentRole;
  turnId: string;
  sessionId: string;
  event: AgentEvent;
}): RoleTimelineItem[];
```

映射规则：

| raw event | timeline |
|----------|----------|
| `type === "system" && subtype === "init"` | `system_status(started/resumed)` |
| `type === "system" && subtype === "api_retry"` | `system_status(retrying)` |
| `type === "assistant"` text content | `assistant_message(final=false)` |
| `type === "result"` | 不生成可见 assistant item，只用于 metadata |
| content item `tool_use` | `tool_call` |
| content item `tool_result` | `tool_result` |
| inferred `tool_call` | `tool_call` fallback |
| inferred `tool_result` | `tool_result` fallback |
| inferred `permission_request` | `system_status(waiting)` |
| inferred `error` | `error` |
| text containing `rkFlowTeamMessage` | `team_bus` + stripped assistant text |

### 3.5 TeamBus 协议块展示

当前 `rkFlowTeamMessage` JSON block 会从最终正文中剥离，并写入 TeamBus。

新增展示规则：

- 不在 assistant 正文中展示 JSON block
- 在当前 turn 中插入 `team_bus` item
- UI 显示为：“已发送 TeamBus 消息给 spec-debugger / spec-tester”
- 展开后显示 subject、body、requiresResponse、artifacts

### 3.6 Timeline 存储

新增文件：

```text
{specDir}/agent-timeline.jsonl
```

写入策略：

- 每个 `RoleTimelineItem` 一行
- 所有 item 包含 `turnId`、`role`、`timestamp`
- raw event 仍写入 `logs/agent-events.jsonl`
- `agent-chat.jsonl` 继续写最终用户/Agent 私聊消息，保障兼容

读取策略：

1. 如果存在 `agent-timeline.jsonl`，优先读取 timeline
2. 如果不存在，读取旧 `agent-chat.jsonl` 并转换为基础 timeline
3. 旧数据转换只生成 `user_message`、`assistant_message`、`error`

### 3.7 Markdown 与安全渲染

MVP 不引入外部 Markdown 依赖，先实现 `renderSafeMarkdown()`：

支持：

- 段落
- 无序/有序列表
- blockquote
- inline code
- fenced code block
- 简单表格保持等宽文本展示

安全规则：

- 所有文本先 escape HTML
- 不支持 raw HTML
- 链接只允许 `http:`、`https:`、`file path` 识别由 Webview command 处理
- 代码块提供 copy 按钮，但不执行内容

### 3.8 工具调用组件

工具卡片默认折叠。

通用展示结构：

```text
Tool: Bash
Title: Ran npm test
Status: success
Summary: 12 passing
[展开详情]
```

不同工具摘要：

| 工具 | 摘要 |
------|------|
| Bash | 命令、cwd、exit code、stdout/stderr 前 N 行 |
| Read | 文件路径、读取范围 |
| Grep/Glob | pattern、匹配数量 |
| Edit/Write | 文件路径、diff/变更摘要 |
| TodoWrite | 步骤数量、完成数量、当前步骤 |
| Task/Subagent | 子任务标题、目标角色、完成状态 |

### 3.9 Artifact 与文件打开

文件路径识别：

- 从 tool input/output 中提取 path
- 从 assistant markdown 中识别 workspace 相对路径
- 从 artifact 字段中读取

Webview 点击文件路径时发送：

```ts
{ command: "openFile", path: "rk-flow-vscode-extension/src/extension.ts", line?: 123 }
```

Extension 侧处理：

- 解析为 workspace 内绝对路径
- 验证路径不越界
- `vscode.window.showTextDocument`

### 3.10 大输出策略

默认限制：

- 单个 tool output preview 最多 120 行或 12KB
- 超出后显示“已截断，可展开 raw summary / 打开日志”
- stderr 优先显示错误前后文
- 对疑似 secret 做脱敏

脱敏规则 MVP：

- `sk-ant-...`
- `sk-...`
- `ANTHROPIC_API_KEY=...`
- `OPENAI_API_KEY=...`
- `token=...`
- `Authorization: Bearer ...`

### 3.11 Webview UI 结构

Role Chat 布局：

```text
Header
  Role selector / model / session status

Toolbar
  Filter chips: All / Replies / Tools / Errors / Files / TeamBus
  Jump to bottom

Timeline
  Turn group
    User message
    Status items
    Tool cards
    TeamBus cards
    Assistant final message

Composer
  textarea
  Send
  Retry / Continue
```

本轮实现：

- Filter chips 只做前端过滤，不改数据
- Jump to bottom
- Enter 发送，Shift+Enter 换行
- Retry 使用上一条 user message 重新发送
- Continue 发送固定提示 `继续`

Stop/cancel 暂不作为强制项，因为当前 `ClaudeCodeAdapter.stop()` 尚未持有进程句柄。保留 UI 状态位，不在本轮实现强制 kill。

### 3.12 与现有代码的集成点

`AgentChatViewProvider.refresh()`：

- 改为读取 timeline
- 无 timeline 时从 `agent-chat.jsonl` 兼容转换

`sendRoleMessage()`：

- 创建 `turnId`
- 写入 `turn_start`、`user_message`
- 继续写 `agent-chat.jsonl` 以兼容

`runAgentMessage()`：

- 每个 `AgentEvent` 先写 raw log
- 再通过 `timelineMapper` 生成 item
- 写入 `agent-timeline.jsonl`
- postMessage 增量推送给 Webview
- `agentDone` 时 upsert final assistant item，不重复追加

`renderAgentChatHtml()`：

- 移动到 `src/roleChat/renderRoleChatHtml.ts`
- 输入从 `PrivateRoleChatMessage[]` 改为 `RoleTimelineItem[]`

### 3.13 兼容策略

旧 Spec 中没有 `agent-timeline.jsonl`：

- 仍可读取 `agent-chat.jsonl`
- 生成基础 turn：每对 user/assistant 尽量合并；无法配对时单独成 turn
- 不回写旧 timeline，除非新消息产生

## 4. 执行模式

### 执行模式选择

**推荐模式**：单 Agent

**选择理由**：

- 本次改动集中在同一 VS Code 扩展和同一 Role Chat 显示链路
- 多文件之间类型、mapper、renderer、provider 需要保持一致
- 并行修改容易造成 Webview 消息协议不一致
- 测试阶段可由 spec-tester 独立验证，但实现应由单 Agent 串行完成

## 5. 实现步骤

### 步骤 A：补齐当前 debug 前置修复

当前工作区已有 `debug-001` 修复：

- 抑制 Claude Code `type === "result"` 聚合事件重复显示
- 新增 `readableEventText` 回归测试
- 打包 `0.0.9`

本 Spec 实现前应将该修复作为 baseline，避免 timeline 设计再次引入重复展示。

### 步骤 B：新增 roleChat 类型模块

新增：

```text
src/roleChat/timelineTypes.ts
```

内容：

- `RoleTimelineItem` union
- 各 item interface
- turn/status/tool/artifact 枚举
- 序列化兼容字段

### 步骤 C：新增 timeline store

新增：

```text
src/roleChat/timelineStore.ts
```

职责：

- `appendTimelineItem(spec, item)`
- `readTimelineItems(spec)`
- `readTimelineForRole(spec, role)`
- `convertPrivateMessagesToTimeline(messages)`
- JSONL 读写错误处理

### 步骤 D：新增 timeline mapper

新增：

```text
src/roleChat/timelineMapper.ts
```

职责：

- raw `AgentEvent` 到 `RoleTimelineItem[]`
- tool_use / tool_result 解析
- `system/init`、`system/api_retry` 解析
- TeamBus JSON block 转换为 `team_bus`
- result 聚合事件去重
- 大输出摘要和脱敏

### 步骤 E：新增安全渲染工具

新增：

```text
src/roleChat/markdown.ts
src/roleChat/sanitize.ts
```

职责：

- `escapeHtml`
- `renderSafeMarkdown`
- `redactSensitiveText`
- `truncateOutput`
- 文件路径识别

### 步骤 F：拆分 Role Chat Webview renderer

新增：

```text
src/roleChat/renderRoleChatHtml.ts
src/roleChat/renderers.ts
```

迁移：

- HTML shell
- CSS
- Webview JS
- timeline item renderer
- filter / collapse / jump-to-bottom / keyboard handling

### 步骤 G：改造 AgentChatViewProvider

修改 `extension.ts`：

- 使用 `readTimelineForRole()`
- `sendRoleMessage()` 创建 turn 和 timeline items
- `runAgentMessage()` 写入 timeline items
- Webview postMessage 从 `agentEvent` 文本模式升级为 `timelineItems`
- 保留旧消息 postMessage 兼容逻辑，逐步移除
- 新增 `openFile` message handler

### 步骤 H：保留 agent-chat 兼容写入

继续保留：

- 用户消息写入 `agent-chat.jsonl`
- 最终 Agent 回复写入 `agent-chat.jsonl`

新增：

- 同步写入 `agent-timeline.jsonl`

### 步骤 I：UI 体验细节

实现：

- Role header 更紧凑
- session 状态清晰显示
- timeline turn 分组
- assistant final message 样式突出
- tool card 默认折叠
- error card 高亮
- TeamBus card 结构化显示
- Enter / Shift+Enter
- Retry / Continue
- Jump to bottom
- Filter chips

### 步骤 J：文档和版本

- 更新 `summary.md`
- 如需要 bump VSIX 版本
- 不提交忽略的 VSIX 二进制，除非用户明确要求

## 6. 风险和依赖

### 风险

> [!warning]
> Claude Code `stream-json` event schema 可能变化。必须将 mapper 写成容错解析：识别不到的 event 作为 `system_status` 或 raw fallback，不应让 Webview 崩溃。

> [!warning]
> Markdown 渲染存在 XSS 风险。默认不支持 raw HTML，所有内容必须先 escape。

> [!warning]
> 大输出如果直接渲染会造成 Webview 卡顿。工具输出必须默认截断和折叠。

> [!warning]
> Timeline 与 agent-chat 双写可能产生不一致。`agent-chat` 只保留最终私聊语义，`agent-timeline` 保留 UI 展示语义，不要互相替代。

### 依赖

- 现有 `ClaudeCodeAdapter`
- 现有 `AgentEvent`
- 现有 `FileTeamBus`
- 现有 `appendJsonLine`
- 现有 Spec / Git binding 机制

### 兼容性要求

- 没有 `agent-timeline.jsonl` 的旧 Spec 必须仍能展示历史私聊
- Team Chatroom 不受本次改造影响
- Canvas 点击 Role 后仍能切换 Role Chat
- Codex 不重新出现

## 7. 文档关联

- 探索报告: [[exploration-report|探索报告]]
- 测试计划: [[test-plan|测试计划]] (待创建，由 spec-tester 创建)
- 实现总结: [[summary|实现总结]] (待创建)
- 经验记忆: [[../../context/experience/exp-002-Agent私聊与团队通信日志分离|Agent私聊与团队通信日志分离]]
- 经验记忆: [[../../context/experience/exp-003-第三方扩展不可作为编排协议|第三方扩展不可作为编排协议]]
- 知识记忆: [[../../context/knowledge/know-002-RKFlowRoleChat显示管线与Timeline方向|RKFlowRoleChat显示管线与Timeline方向]]
