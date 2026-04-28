---
title: 私聊日志隔离与Windows CLI启动修复总结
type: update-summary
status: 已完成
created: 2026-04-28
update: "[[update-003]]"
tags:
  - spec/更新
  - summary
---

# 私聊日志隔离与Windows CLI启动修复总结

> [!success]
> 已修复用户自测发现的聊天报错，并将用户↔Agent 私聊从 Team Chatroom 中隔离出去。

## 完成内容

- 修复 Claude Code 非 UUID `--session-id` 报错
- 修复 Windows shell 将 `R&K Flow` 中 `&` 解析为命令分隔符的问题
- 用户↔Agent 私聊落盘到 `agent-chat.jsonl`
- Team Chatroom 只展示团队消息，不再追加私聊响应
- 保留 `audit-log.jsonl` 审计记录
- 生成新版 VSIX：`rk-flow-vscode-extension-0.0.3.vsix`

## 证据

- `logs/real-agent-claude-adapter-shellfix.log`
- `logs/extension-host.log`
- `logs/vsce-package.log`

## 后续建议

> [!warning]
> `agent-chat.jsonl` 后续可以按 Role 分 session 展示，目前 UI 只保留本次 Webview 会话内的 transcript。
