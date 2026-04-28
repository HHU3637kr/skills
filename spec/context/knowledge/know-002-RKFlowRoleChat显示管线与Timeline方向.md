---
id: KNOW-002
title: RKFlowRoleChat显示管线与Timeline方向
type: 项目理解
keywords: [R&K Flow, Role Chat, Agent Timeline, Claude Code, tool call, Webview]
created: 2026-04-28
---

# RKFlowRoleChat显示管线与Timeline方向

## 概述

R&K Flow Role Chat 已从纯文本 transcript 升级为结构化 Agent Timeline。用户消息和最终回复仍兼容写入 `agent-chat.jsonl`，Claude Code CLI 的 `stream-json` 事件写入 `logs/agent-events.jsonl`，同时映射为 `agent-timeline.jsonl` 中的稳定 UI item。

当前显示边界是：Role Chat 展示用户与单个 AgentRole 的私聊 timeline，Team Chatroom 只读展示 AgentRole 之间的 TeamBus 日志，审计事件保留在 `audit-log.jsonl`。

## 详细内容

### 当前显示管线

核心代码位于：

- `rk-flow-vscode-extension/src/extension.ts`
- `rk-flow-vscode-extension/src/agentAdapters/cliAdapters.ts`
- `rk-flow-vscode-extension/src/agentAdapters/types.ts`

流程：

1. `AgentChatViewProvider.sendRoleMessage()` 写入用户私聊消息。
2. `runAgentMessage()` 调用 `ClaudeCodeAdapter.start()` 或 `resume()`。
3. `ClaudeCodeAdapter` 用 `claude --print --output-format stream-json --verbose` 读取事件流。
4. `toAgentEvent()` 将每行 JSON 转换为 `AgentEvent`。
5. raw event 写入 `logs/agent-events.jsonl`。
6. `mapAgentEventToTimelineItems()` 将 raw event 转换为 `RoleTimelineItem`。
7. Webview 通过 `timelineItems` 增量展示结构化 timeline。
8. 最终回复兼容写入 `agent-chat.jsonl`，结构化展示写入 `agent-timeline.jsonl`。

### 已实现能力

- `RoleTimelineItem` 覆盖用户消息、Agent 回复、工具调用、工具结果、TeamBus、系统状态、错误和 turn 起止。
- `agent-timeline.jsonl` 支持按 Role 过滤和旧 `agent-chat.jsonl` 兼容转换。
- Claude Code `assistant` / `result` 双事件已在 mapper 边界去重，避免重复回复。
- Markdown、代码块、工具卡片、TeamBus 卡片、大输出截断、敏感信息脱敏已接入 Role Chat Webview。
- Role Chat 输入区按右侧侧边栏 composer 设计，Team Chatroom 改为底部只读日志面板。
- Webview 展示逻辑已拆分到 `src/roleChat/`，降低继续迭代成本。

### 目标方向

当前 `RoleTimelineItem` 内部模型：

- `user_message`
- `assistant_message`
- `plan`
- `tool_call`
- `tool_result`
- `artifact`
- `team_bus`
- `system_status`
- `error`

当前模块：

```text
src/roleChat/
  markdown.ts
  renderers.ts
  sanitize.ts
  timelineTypes.ts
  timelineMapper.ts
  timelineStore.ts
  renderRoleChatHtml.ts
```

### 后续边界

- 当前只保留 Claude Code 单后端，Codex 和其他 CLI 后端需要通过 adapter 扩展点重新接入。
- 不读取 Claude Code 官方 VS Code 扩展私有 Webview、私有状态或本地 transcript 作为主数据源。
- 后续如果新增自主 Agent 间通信，需要把 TeamBus 从持久化日志升级为可通知、可投递的消息路由层。

### 外部参考结论

- Claude Code 官方文档确认 `stream-json` 是实时 newline-delimited JSON event source，`system/init`、`system/api_retry` 等事件可映射为状态 item。
- 社区 Claude Code 可视化项目普遍强调：raw JSON 太噪，需要做工具调用、上下文、Todo、Sub Agent、Team 的结构化可视化。
- 参考 Claude Code 体验时只能学习产品结构，不依赖私有源码、私有 Webview 或本地 transcript 格式。

## 相关文件

- rk-flow-vscode-extension/src/extension.ts
- rk-flow-vscode-extension/src/roleChat/timelineTypes.ts
- rk-flow-vscode-extension/src/roleChat/timelineMapper.ts
- rk-flow-vscode-extension/src/roleChat/timelineStore.ts
- rk-flow-vscode-extension/src/roleChat/renderRoleChatHtml.ts
- rk-flow-vscode-extension/src/agentAdapters/cliAdapters.ts
- rk-flow-vscode-extension/src/agentAdapters/types.ts
- spec/06-已归档/20260428-1658-RoleChat对话体验与运行产物展示优化/exploration-report.md
- spec/06-已归档/20260428-1658-RoleChat对话体验与运行产物展示优化/summary.md
- spec/context/experience/exp-002-Agent私聊与团队通信日志分离.md
- spec/context/experience/exp-003-第三方扩展不可作为编排协议.md

## 参考

- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/headless
- https://github.com/Yuyz0112/claude-code-reverse
- https://github.com/VILA-Lab/Dive-into-Claude-Code
- https://github.com/daaain/claude-code-log
- https://www.claude-dev.tools/
