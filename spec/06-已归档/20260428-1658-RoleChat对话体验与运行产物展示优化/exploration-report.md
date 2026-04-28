---
title: RoleChat对话体验与运行产物展示优化探索报告
type: exploration-report
status: 已完成
created: 2026-04-28
spec: "[[README]]"
tags:
  - spec/exploration
  - vscode-extension
  - role-chat
  - agent-timeline
  - claude-code
---

# RoleChat对话体验与运行产物展示优化探索报告

## 探索目标

为后续 `plan.md` 提供背景：如何将 R&K Flow Role Chat 从“纯文本 transcript”升级为“结构化 Agent Timeline”，让用户获得接近 Claude / Claude Code 的对话体验，同时保持 R&K Flow 自有编排、审计和 TeamBus 边界。

探索范围：

- 历史经验检索
- 当前项目代码结构
- Claude Code 官方文档中可依赖的公开接口
- GitHub / 社区 Claude Code 解析项目中的产品与架构启发

## 检索到的历史经验

### EXP-002 Agent私聊与团队通信日志分离

可复用结论：

- 用户与单个 AgentRole 的私聊进入 `agent-chat.jsonl`
- AgentRole 间通信进入 `team-chat.jsonl`
- 审计进入 `audit-log.jsonl`
- Team Chatroom 不展示用户私聊

对本 Spec 的约束：

- Role Chat 可以展示 TeamBus 协议块的“发送事件”，但不能把 Team Chatroom 变成用户私聊区
- 任何 timeline 数据模型都必须继续区分 private chat、team message、audit event

### EXP-003 第三方扩展不可作为编排协议

可复用结论：

- 可以参考 Claude Code 的体验和社区分析
- 不能复制或依赖 Claude Code 私有源码、官方 Webview DOM、内部 bundle 或本地 transcript 格式
- R&K Flow 必须保留自己的消息协议、审计和会话边界

对本 Spec 的约束：

- 只使用 Claude Code CLI 的公开输出能力作为输入源
- UI 事件模型必须是 R&K 自己定义的稳定模型
- 第三方分析只能作为产品/架构启发，不作为运行时依赖

### KNOW-001 RKFlowVSCode扩展MVP架构

现有架构基础：

- `Spec Explorer` 扫描 Spec
- `AgentTeam Canvas` 负责可视化 AgentRole
- `Role Chat` 是用户与单个 AgentRole 的私聊入口
- `TeamBus` 是 AgentRole 间通信边界
- `ClaudeCodeAdapter` 是当前唯一默认后端

## 项目现状分析

### 当前 Role Chat 数据流

关键文件：

- `rk-flow-vscode-extension/src/extension.ts`
- `rk-flow-vscode-extension/src/agentAdapters/cliAdapters.ts`
- `rk-flow-vscode-extension/src/agentAdapters/types.ts`

当前流程：

1. 用户在 Role Chat 中提交消息
2. `AgentChatViewProvider.sendRoleMessage()` 将用户消息写入 `agent-chat.jsonl`
3. `runAgentMessage()` 调用 `ClaudeCodeAdapter.start()` 或 `resume()`
4. `ClaudeCodeAdapter` 使用 `claude --print --output-format stream-json --verbose`
5. CLI stdout 每行 JSON 被转换为 `AgentEvent`
6. 原始事件写入 `logs/agent-events.jsonl`
7. `readableEventText()` 抽取可见文本
8. Webview 通过 `agentEvent` 追加普通气泡
9. 最终回复写入 `agent-chat.jsonl`

### 当前数据结构

`PrivateRoleChatMessage` 当前是纯消息结构：

```ts
{
  id: string;
  specId: string;
  from: AgentRole | "user";
  to: AgentRole | "user";
  direction: "user_to_agent" | "agent_to_user";
  body: string;
  model: string;
  artifacts: string[];
  isError: boolean;
  timestamp: string;
}
```

`AgentEvent` 已经具备更丰富的类型入口：

```ts
type AgentEventType =
  | "message"
  | "tool_call"
  | "tool_result"
  | "permission_request"
  | "error"
  | "done";
```

但 UI 层没有使用这些类型做结构化展示，所有可见文本都被压成 `.bubble`。

### 当前 UI 实现

`renderAgentChatHtml()` 当前特点：

- Webview HTML、CSS、JS 全部内嵌在 `extension.ts`
- transcript 是一个普通滚动区域
- 历史消息全量重新渲染
- 消息只区分 user / assistant / system / error
- 不支持 Markdown 渲染
- 不支持代码块、diff、文件链接、命令块专用组件
- 不支持 tool call / tool result 折叠
- 不支持 plan / todo 状态展示
- 不支持 turn grouping
- 不支持搜索、过滤、虚拟滚动、跳到底部
- 没有 stop / retry / continue 等运行控制

### 当前已知缺口

| 缺口 | 影响 |
|------|------|
| 缺少 turn 模型 | 同一轮用户输入、工具调用、最终回复无法聚合 |
| 缺少 timeline event 模型 | UI 只能追加文本，不能表达工具、计划、文件、错误 |
| 缺少事件去重策略 | stream-json 的聚合/增量事件容易重复显示 |
| 缺少 Markdown/代码渲染 | Agent 回复阅读体验弱 |
| 缺少工具调用组件 | shell/read/edit/test 等运行过程不可审计或容易刷屏 |
| 缺少大输出策略 | 大日志可能卡顿或淹没最终回答 |
| 缺少文件引用组件 | 用户不能快速定位 Agent 涉及的文件 |
| 缺少安全脱敏 | 命令输出可能泄露 token/env/path 敏感信息 |
| 缺少端侧 UI 测试 | Webview 体验回归难发现 |

## 外部知识

### Claude Code 官方公开接口

官方 CLI 文档说明：

- `--output-format` 支持 `text`、`json`、`stream-json`
- `stream-json` 是 newline-delimited JSON，用于实时 streaming
- `--verbose` 会输出 turn-by-turn 信息
- `--include-partial-messages` 可以输出 token partial event
- `--include-hook-events` 可以输出 hook lifecycle event
- `system/api_retry` event 可用于显示重试进度
- `system/init` event 包含 session metadata、model、tools、MCP servers、plugins
- `--resume` 支持按 session ID 继续会话

参考：

- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference)
- [Run Claude Code programmatically](https://code.claude.com/docs/en/headless)

对本 Spec 的启发：

- R&K Flow 应该把 Claude Code stream-json 当作“原始事件源”，而不是直接把文本塞进气泡
- 可以引入 `--include-partial-messages` 作为后续流式体验增强，但 MVP 可先基于完整 message event
- `system/init`、`system/api_retry`、hook event 应映射为 system/status timeline item
- session metadata 可以用于 Role Chat 顶部状态和运行详情

### Claude Code Output Styles

官方 Output Styles 文档说明：输出风格会修改系统提示词，影响 Claude 的格式、语气和结构，但不改变能力本身。

参考：

- [Claude Code Output styles](https://code.claude.com/docs/en/output-styles)

对本 Spec 的启发：

- UI 不能只靠 prompt 要求 Agent 输出漂亮格式；应该由 UI 对事件做结构化渲染
- 但可以在 `buildRolePrompt()` 中轻量约束：普通回复保持 Markdown，计划使用明确列表，TeamBus JSON block 只用于角色间通信

### Yuyz0112/claude-code-reverse

该项目强调通过运行时 API 请求/响应和日志可视化理解 Claude Code，而不是复制内部实现。它的可视化工具会识别公共 prompt、工具定义、任务流程、压缩、Todo 和 Sub Agent。

参考：

- [Yuyz0112/claude-code-reverse](https://github.com/Yuyz0112/claude-code-reverse)

对本 Spec 的启发：

- 重点不是复刻源码，而是从 event/log 中恢复“用户能理解的执行过程”
- Timeline 应支持区分：核心对话、工具调用、压缩/上下文、Todo、Sub Agent/Team
- 可视化层要从 raw JSON 中提炼摘要，并允许展开 raw details

### VILA-Lab/Dive-into-Claude-Code

该项目把 Claude Code 归纳为“模型决策 + 大量确定性基础设施”。其结论强调复杂度主要在权限、上下文、工具路由和恢复逻辑，而不是模型循环本身。

参考：

- [VILA-Lab/Dive-into-Claude-Code](https://github.com/VILA-Lab/Dive-into-Claude-Code)

对本 Spec 的启发：

- Role Chat 体验优化不能只做视觉层，必须把工具路由、权限、错误、恢复、上下文状态都展示出来
- UI 要明确区分“模型说了什么”和“系统执行了什么”
- 权限/阻塞/失败应是一等 timeline item，而不是普通文本

### claude-code-ultimate-guide

该文档强调来源透明度：官方文档优先，社区逆向和推断需要标注可信度；并总结 Claude Code 的核心工具形态包括 Bash、Read、Edit、Write、Grep、Glob、Task、TodoWrite。

参考：

- [claude-code-ultimate-guide architecture](https://github.com/FlorianBruniaux/claude-code-ultimate-guide/blob/main/guide/core/architecture.md)

对本 Spec 的启发：

- 设计文档必须区分“官方稳定接口”和“社区观察”
- 工具展示组件可先围绕 Bash / Read / Edit / Write / Grep / Glob / Task / TodoWrite 建模
- Todo/Plan 不应只是文本，而应有状态化展示

### claude-code-log

该项目将 Claude Code transcript JSONL 转换为可读 HTML/Markdown，并支持项目层级处理、单 session 页面、TUI 浏览。

参考：

- [daaain/claude-code-log](https://github.com/daaain/claude-code-log)

对本 Spec 的启发：

- R&K Flow 的 `agent-chat.jsonl` 也需要从纯文本日志走向可读的结构化 timeline
- 历史会话应考虑按 Spec / Role / Session 分组
- 需要兼容“当前实时聊天”和“历史可读回放”

### claude-devtools

该工具强调 Claude Code 终端摘要会隐藏细节，开发者需要看到文件路径、工具调用、token、context、subagent 和团队协作树；其功能包含 Tool Call Inspector、Context Reconstruction、Team/Subagent Trees。

参考：

- [claude-devtools](https://www.claude-dev.tools/)

对本 Spec 的启发：

- 工具调用默认摘要，展开后显示输入、输出、文件路径、diff、耗时和错误
- Team / Subagent 信息应树形或分组展示，避免混在主回复正文中
- 上下文/成本/token 是后续增强项，MVP 可预留字段

## 对 Spec 创建的建议

### 建议目标定义

将 Role Chat 从纯文本聊天框升级为结构化 Agent Timeline，统一展示对话、计划、工具调用、文件变更、测试结果、错误、TeamBus 事件和最终回复。

### 建议核心设计

1. 新增内部 UI 事件模型

建议定义 `RoleTimelineItem`：

```ts
type RoleTimelineItem =
  | UserMessageItem
  | AssistantMessageItem
  | PlanItem
  | ToolCallItem
  | ToolResultItem
  | ArtifactItem
  | TeamBusItem
  | SystemStatusItem
  | ErrorItem;
```

2. 引入 turn grouping

每轮用户输入生成一个 `turnId`，该 turn 下聚合：

- user message
- assistant streaming text
- plan/todo
- tool calls/results
- team bus events
- final answer
- errors/status

3. 保留 raw event log，新增结构化 timeline

建议保留：

- `logs/agent-events.jsonl`：原始 Claude Code event
- `agent-chat.jsonl`：兼容旧私聊消息

新增或扩展：

- `agent-timeline.jsonl`：结构化 UI timeline

4. 拆分 Webview 代码

当前 HTML/JS/CSS 全在 `extension.ts`，后续维护成本高。建议拆为：

```text
src/roleChat/
  timelineTypes.ts
  timelineMapper.ts
  renderRoleChatHtml.ts
  renderer.test.ts
```

MVP 可以仍用静态 Webview 字符串，但不要继续把复杂 UI 堆进 `extension.ts`。

5. Markdown 与代码块

建议支持：

- Markdown 段落、列表、引用、表格
- fenced code block
- inline code
- 代码块复制
- 文件路径识别并支持打开文件

安全要求：

- 不直接渲染 raw HTML
- 所有内容默认 escape
- 如引入 Markdown 库，必须禁用 HTML 或做 sanitizer

6. 工具调用展示

建议 MVP 组件：

| 工具/事件 | 展示方式 |
|-----------|----------|
| Bash/shell | 命令、cwd、耗时、exit code、stdout/stderr 摘要，详情折叠 |
| Read/Grep/Glob | 文件路径、匹配行、结果数量 |
| Edit/Write | 文件路径、diff 摘要、变更行数 |
| Todo/Plan | 步骤列表，当前步骤高亮 |
| Test/build | pass/fail、失败用例、日志入口 |
| TeamBus | “已发送给 X”的结构化卡片，隐藏 JSON block |
| api_retry/system | 重试/初始化/会话状态 |

7. 输入体验

建议纳入 plan：

- Enter 发送，Shift+Enter 换行
- 发送中禁用或显示 stop
- retry / continue
- 跳到底部
- 当前 Role 和 session 状态更明确
- 支持展开历史工具详情，但最终回答保持清爽

8. 性能

必须考虑：

- 大日志默认折叠和截断
- stdout/stderr 只展示摘要，详情按需展开
- 长会话不要无限增量 DOM
- 后续可引入虚拟滚动，本轮至少避免全量重渲染每个 token

9. 测试策略

建议至少覆盖：

- Claude Code raw event -> RoleTimelineItem 的单元测试
- `result` 聚合事件不重复展示
- tool_call/tool_result 渲染为折叠组件
- TeamBus JSON block 不裸露显示
- Markdown escaping 防 XSS
- 大输出截断策略
- Webview contribution 仍正常

## 建议阶段划分

### MVP 阶段

- 建立 `RoleTimelineItem` 类型和 mapper
- 重构 Role Chat renderer 到独立模块
- 支持 turn grouping
- 支持 Markdown 基础渲染
- 支持 tool call / tool result 折叠
- 支持 system/error/status 专用 item
- 保留旧 `agent-chat.jsonl` 兼容读取

### 增强阶段

- 文件路径点击打开
- diff viewer
- plan/todo 进度组件
- 搜索/过滤
- stop/retry/continue
- 虚拟滚动
- token/context/cost 展示

## 风险与边界

- 不依赖 Claude Code 私有源码或本地 transcript 格式
- 不把 TeamBus 与用户私聊混在一起
- 不把 raw HTML 直接插入 Webview
- 不把所有工具输出直接渲染为正文
- 不在本轮重新设计后端 Adapter 协议
- 不引入 Codex

## 给 spec-writer 的建议

`plan.md` 应重点设计：

- timeline 数据模型
- raw AgentEvent 到 timeline item 的映射
- Webview renderer 拆分方案
- 旧数据兼容策略
- Markdown/代码/工具块安全渲染方案
- 最小可交付范围，避免一次性做完整 IDE 级观察器

## 给 spec-tester 的建议

`test-plan.md` 应重点覆盖：

- 事件映射单元测试
- 重复消息回归
- Markdown 安全渲染
- 工具调用折叠/展开
- TeamBus JSON block 友好展示
- 大输出性能边界
- 端侧 Role Chat 交互验证

## 通知

spec-explorer 已完成探索。请 spec-writer 阅读本报告后开始撰写 `plan.md`，请 spec-tester 阅读本报告后准备与 spec-writer 协作制定 `test-plan.md`。
