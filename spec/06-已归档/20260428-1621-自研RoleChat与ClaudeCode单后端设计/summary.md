---
title: 自研RoleChat与ClaudeCode单后端设计实现总结
type: summary
status: 已完成
created: 2026-04-28
spec: "[[README]]"
plan: "[[plan]]"
tags:
  - spec/summary
  - vscode-extension
  - claude-code
---

# 自研RoleChat与ClaudeCode单后端设计实现总结

## 实现结论

本次方向从“Claude Code 官方扩展接管 Role Chat”调整为“R&K Flow 自研 Role Chat + Claude Code 单后端”。

已完成：

- 保留 R&K Flow 自研 `Role Chat` Webview
- 保留 Canvas 点击 AgentRole 后切换 Role Chat 当前角色
- 默认 Adapter 注册只保留 `ClaudeCodeAdapter`
- 所有 AgentRole 默认后端统一为 `claude-code`
- 移除 Codex UI 选项、Codex 默认路由、Codex Extension Host 测试依赖
- 移除源码中已暴露的 CodexAdapter 实现，仅保留通用 `AgentAdapter` 扩展接口
- `AgentEngine` 保留 `external-cli` 扩展位，后续新增 CLI 时再实现具体 Adapter
- VSIX 版本升级到 `0.0.8`

## 代码变更

主要修改：

- `rk-flow-vscode-extension/src/extension.ts`
  - Adapter 注册改为只注册 `ClaudeCodeAdapter`
  - Canvas 所有角色显示 `Claude Code`
  - Role Chat 模型选择移除 Codex 选项
  - `defaultEngineForRole()` 统一返回 `claude-code`
  - `normalizeModelForEngine()` 在 MVP 中统一返回 `default`
  - external session id 提取只保留 Claude Code `session_id`
- `rk-flow-vscode-extension/src/agentAdapters/cliAdapters.ts`
  - 移除 CodexAdapter 和 Codex 参数构造逻辑
- `rk-flow-vscode-extension/src/agentAdapters/types.ts`
  - `AgentEngine` 调整为 `claude-code | external-cli`
- `rk-flow-vscode-extension/src/test/suite/extension.test.ts`
  - 移除 CodexAdapter 检测和 Codex resume 参数测试
- `rk-flow-vscode-extension/package.json`
  - 描述改为 Claude Code 单后端
  - 版本升级到 `0.0.8`

## 产物

打包产物：

```text
rk-flow-vscode-extension/rk-flow-vscode-extension-0.0.8.vsix
```

## 边界

- 当前 MVP 不支持 Codex CLI
- 当前 MVP 不依赖 Claude Code 官方 VS Code 扩展
- Claude Code 官方本地 transcript/session 不作为 R&K Flow 的实时协议来源
- Team Chatroom 只承载 AgentRole 之间的 TeamBus 消息
- 用户与 Role 的私聊仍由 `agent-chat.jsonl` 承载

## 后续建议

- 端侧继续验证 Role Chat 多轮 resume 是否符合预期
- 后续需要新 CLI 时，通过新增 Adapter 实现接入，不直接污染当前 Claude Code 单后端路径
- 可增加显式 UI 标识：当前 MVP 后端为 Claude Code，其他 CLI 暂未启用
