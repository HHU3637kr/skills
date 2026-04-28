---
title: 私聊日志隔离与Windows CLI启动修复
type: update
status: 已完成
created: 2026-04-28
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec/更新
  - agent-chat
  - cli-adapter
---

# 私聊日志隔离与Windows CLI启动修复

## 更新背景

用户自测发现：

- Role Chat 调 Claude Code 报错：`Invalid session ID. Must be a valid UUID`，且 `R&K Flow` 中的 `&` 被 Windows shell 拆成命令，出现 `'K' is not recognized`
- Team Chatroom 中出现了用户和 Agent 的私聊记录，不符合“Team Chatroom 只保存 AgentRoles 之间交流”的定位

## 更新内容

- Claude Code 新会话不再传入自定义 `--session-id`
- Windows 下不再通过 `shell: true` 或 `cmd /c` 粗暴启动 CLI
- Claude Code 直接解析 npm shim 后调用 `claude.exe`
- Codex CLI 直接解析 npm shim 后调用 `node.exe + codex.js`
- 用户与 Role 的私聊写入 `agent-chat.jsonl`
- Team Chatroom 过滤并避免展示用户私聊消息
- Agent 私聊响应不再写入 `team-chat.jsonl`
- 扩展版本升到 `0.0.3`

## 验证

- Claude Adapter 真实探测通过，返回 `RK_FLOW_CLAUDE_SHELL_OK`
- `R&K Flow` prompt 不再触发 Windows `K` 命令错误
- `--session-id` 非 UUID 报错已消除

## 文档关联

- 更新总结: [[update-003-summary|update-003-summary]]
