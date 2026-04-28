---
title: Role私聊隔离与CLI多轮会话复用
type: update
status: 已完成
created: 2026-04-28
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec/更新
  - agent-session
  - agent-chat
---

# Role私聊隔离与CLI多轮会话复用

## 更新背景

用户指出：

- 不同 Agent 之间在右侧 Role Chat 中需要会话隔离
- 通过 CLI 启动的 Claude Code / Codex 没有复用历史会话 ID，无法支持多轮对话

## 更新目标

- 每个 Role 拥有独立私聊 transcript
- 打开 Canvas 时从 `agent-chat.jsonl` 加载历史私聊，并按 Role 过滤展示
- 每个 Role 拥有独立 `agent-sessions/<role>.json`
- 发送消息时优先 resume 已有 CLI 会话
- 新会话启动后保存真实外部 session/thread id

## 实现内容

- 新增 Role 私聊历史读取：`agent-chat.jsonl`
- 新增 Role 会话文件：

```text
agent-sessions/
  TeamLead.json
  spec-explorer.json
  spec-writer.json
  spec-executor.json
  spec-tester.json
  spec-debugger.json
  spec-ender.json
```

- Claude Code 新会话使用 UUID 作为 `--session-id`
- Claude Code 后续消息使用 `--resume <session_id>`
- Codex 新会话从 `thread.started.thread_id` 提取真实 thread id
- Codex 后续消息使用 `codex exec resume <thread_id>`
- UI 右侧 Role Chat 标注 `new session` / `resumed`

## 验收标准

- 编译通过
- Extension Host 回归测试通过
- VSIX 打包通过
- `agent-chat.jsonl` 只作为私聊历史入口
- `team-chat.jsonl` 不承担用户私聊存储
- Role 切换后展示对应 Role 的私聊记录

## 文档关联

- 更新总结: [[update-004-summary|update-004-summary]]
- 更新审查: [[update-004-review|update-004-review]]
