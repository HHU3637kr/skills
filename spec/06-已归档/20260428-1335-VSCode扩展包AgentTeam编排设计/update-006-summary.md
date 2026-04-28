---
title: Canvas与聊天视图分区调整总结
type: update-summary
status: 已完成
created: 2026-04-28
update: "[[update-006]]"
tags:
  - spec/更新
  - summary
  - layout
---

# Canvas与聊天视图分区调整总结

> [!success]
> 已将 Canvas、Role Chat、Team Chatroom 从单个 Webview 中拆开，形成更接近 VS Code / Windsurf 的工作区结构。

## 完成内容

- `AgentTeam.canvas` 现在只显示中间可拖拽画布、Spec/Git Binding 信息和阶段按钮
- 新增 `TeamChatroomViewProvider`，Team Chatroom 贡献到底部 `R&K Team` Panel
- `AgentChatViewProvider` 加载 `agent-chat.jsonl`，按 Role 展示私聊历史
- 点击 Canvas Agent 节点会选择 Role，并尝试打开 `Role Chat`
- `package.json` 新增 `R&K Agent` 侧边栏容器和 `R&K Team` 底部面板容器
- 补充 manifest 回归测试，确认 Role Chat / Team Chatroom 贡献点存在
- 扩展版本升到 `0.0.6`

## 新 VSIX

```text
C:\Users\18735\.claude\skills\rk-flow-vscode-extension\rk-flow-vscode-extension-0.0.6.vsix
```

## 布局约束

VS Code 默认不允许扩展直接指定 Secondary Sidebar 初始位置。安装后可以将 `R&K Agent / Role Chat` 移到右侧 Secondary Sidebar；之后 VS Code 会记住该布局。

## 文档关联

- 更新方案: [[update-006|update-006]]
- 更新审查: [[update-006-review|update-006-review]]
