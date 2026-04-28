---
title: Canvas与聊天视图分区调整
type: update
status: 已确认
created: 2026-04-28
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec/更新
  - vscode-extension
  - layout
---

# Canvas与聊天视图分区调整

## 更新背景

用户自测 `0.0.5` VSIX 后指出：Team Chatroom 仍嵌在 `AgentTeam.canvas` 内部，不符合 VS Code / Windsurf 类 IDE 的使用习惯；单个 Role 的私聊应该位于右侧侧边栏，团队聊天室应该位于底部 Panel，类似 Terminal 一栏。

## 更新目标

- `AgentTeam.canvas` 只负责中间可拖拽 AgentTeam 画布
- 点击 Canvas 节点时选择对应 Role，并打开 Role Chat 视图
- Role Chat 作为独立 VS Code View 贡献到 `R&K Agent` 容器
- Team Chatroom 作为独立 VS Code Panel View 贡献到底部 `R&K Team`
- Team Chatroom 只显示/发送 AgentRole 之间的 TeamBus 消息
- 私聊历史继续从 `agent-chat.jsonl` 读取，并按 Role 隔离展示

## 非目标

- 不重新实现 VS Code 原生布局系统
- 不强行写入用户 Workbench 布局配置
- 不把 Team Chatroom 放回 Canvas Webview 内部

## 实现步骤

1. 新增 `TeamChatroomViewProvider`
2. 在 `package.json` 贡献 `rkFlow.agentChat` 与 `rkFlow.teamChatroom`
3. 将 Team Chatroom 贡献到底部 Panel View Container
4. 将 Role Chat 贡献到独立 Side View Container
5. 精简 Canvas HTML，仅保留画布、Git Binding 和阶段推进按钮
6. Canvas 节点点击后调用 Role Chat ViewProvider 选择角色
7. Role Chat 从 `agent-chat.jsonl` 加载私聊历史并按 Role 过滤
8. 补充 Extension Host manifest 回归测试
9. 打包 `0.0.6` VSIX

## 验收标准

- 编译通过
- Extension Host 测试通过
- VSIX 打包通过
- Canvas 不再渲染内嵌 Role Chat 和 Team Chatroom
- Team Chatroom 作为底部 Panel View 存在
- Role Chat 作为独立侧边栏 View 存在

## 约束说明

VS Code 官方扩展 API 不允许扩展默认直接把 View 贡献到 Secondary Sidebar；扩展只能贡献到 Primary Sidebar 或 Panel，用户可以把对应 View 拖到 Secondary Sidebar，VS Code 会记住布局。因此本轮将 Role Chat 做成独立侧边栏 View，安装后可移动到右侧 Secondary Sidebar 使用。

## 文档关联

- 更新总结: [[update-006-summary|update-006-summary]]
- 更新审查: [[update-006-review|update-006-review]]
