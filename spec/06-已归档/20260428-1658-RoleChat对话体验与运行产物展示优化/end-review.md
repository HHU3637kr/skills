---
title: 收尾讨论-RoleChat对话体验与运行产物展示优化
type: end-review
status: 已完成
created: 2026-04-28
plan: "[[plan]]"
summary: "[[summary]]"
test-report: "[[test-report]]"
tags:
  - spec
  - end-review
  - role-chat
---

# 收尾讨论

## 参与角色视角

### spec-writer

- 本次设计重点不是“把聊天气泡做漂亮”，而是定义稳定的 `RoleTimelineItem`，让 Role Chat 能承载工具调用、TeamBus、错误、系统状态和最终回复。
- 数据边界必须明确：`agent-chat.jsonl` 仍是私聊语义，`agent-timeline.jsonl` 是 UI 恢复展示层，`team-chat.jsonl` 是角色间通信，`audit-log.jsonl` 是审计。
- 不依赖 Claude Code 官方扩展私有状态这一点继续成立。

### spec-tester

- 回归测试必须覆盖 Claude Code `assistant` / `result` 双事件导致的重复显示。
- Webview UI 的职责边界需要测试：Role Chat 是用户与单个 Role 的对话，Team Chatroom 只读显示 TeamBus。
- 安全测试不能省略：Markdown escape、token 脱敏、长输出截断是 Webview 展示工具输出的基础要求。

### spec-executor

- 把 Webview 从 `extension.ts` 中拆出到 `src/roleChat/` 明显降低了继续迭代成本。
- 动态新增消息和初始历史渲染必须使用同一套安全展示规则，否则实时回复和刷新后体验会不一致。
- Team Chatroom 手动表单会诱导用户把它当聊天输入区，最终应该移除，保留为日志面板。
- 右侧侧边栏空间有限，输入区要按 IDE Agent composer 设计，而不是表单设计。

### spec-debugger

- duplicate reply 的根因是 Claude Code `stream-json` 的 `result` 聚合事件与 `assistant` 正文重复。
- 修复策略应该放在事件映射边界，而不是只在前端靠 “receivedAgentText” 兜底。
- 后续新增 CLI adapter 时也要定义“哪些事件可见、哪些事件只作为 metadata”。

## 经验沉淀判断

### 需要更新的知识记忆

- `KNOW-002 RKFlowRoleChat显示管线与Timeline方向` 应从“下一阶段方向”更新为“已实现管线与后续边界”。

### 已有经验覆盖

- `EXP-002 Agent私聊与团队通信日志分离` 覆盖本轮数据边界。
- `EXP-003 第三方扩展不可作为编排协议` 覆盖不依赖 Claude Code 官方扩展私有状态。

### 轻量经验

- Webview composer 应按侧边栏空间设计，不要套用传统表单布局。
- Team Chatroom 作为日志面板时，不应该暴露手动发送表单。

## 收尾结论

当前 Spec 可以归档。前置 debug `20260428-1621-自研RoleChat与ClaudeCode单后端设计/debug-001` 也应与本次提交一并纳入，因为它是 Timeline 去重策略的前置 baseline。
