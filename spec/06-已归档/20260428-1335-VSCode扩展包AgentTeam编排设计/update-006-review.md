---
title: Canvas与聊天视图分区调整审查
type: update-review
status: 通过
created: 2026-04-28
update: "[[update-006]]"
tags:
  - spec/更新
  - review
---

# Canvas与聊天视图分区调整审查

## 审查结论

> [!success]
> 通过。布局职责已经拆分：Canvas 负责可视化编排，Role Chat 负责用户与单个 AgentRole 私聊，Team Chatroom 负责 AgentRole 之间的 TeamBus 消息。

## 审查项

| 审查项 | 结果 |
|--------|------|
| Canvas 移除内嵌聊天 UI | 通过 |
| Role Chat 独立为侧边栏 View | 通过 |
| Team Chatroom 独立为底部 Panel View | 通过 |
| Canvas 节点点击可路由到 Role Chat | 通过 |
| 私聊历史按 Role 隔离展示 | 通过 |
| Team Chatroom 不混入用户私聊 | 通过 |
| 回归测试 | 通过 |

## 风险

- Role Chat 默认位置受 VS Code Workbench 布局限制，不能由扩展强制初始放到 Secondary Sidebar。
- 当前仍保留轻量 Webview 实现，后续若需要更复杂布局和状态恢复，应进一步抽离前端组件。

## 文档关联

- 更新方案: [[update-006|update-006]]
- 更新总结: [[update-006-summary|update-006-summary]]
