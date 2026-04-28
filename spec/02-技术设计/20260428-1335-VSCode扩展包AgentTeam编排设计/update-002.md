---
title: Canvas角色点击反馈与聊天室布局调整
type: update
status: 已完成
created: 2026-04-28
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec/更新
  - vscode-extension
  - canvas
  - agent-chat
---

# Canvas角色点击反馈与聊天室布局调整

## 更新背景

用户自测 VSIX 后发现：

- 点击 Canvas 中的角色节点没有明显反应
- Team Chatroom 放在 Canvas 右侧，与“右侧用于和当前 Role 私聊”的产品心智冲突
- 左侧 Activity Bar 下方的 Agent Chat View 也容易造成混淆

## 更新目标

- 点击角色节点时，Canvas 内必须有明确选中态和右侧 Role Chat 标题变化
- Canvas 右侧改为当前 Role 的私聊面板
- Team Chatroom 移到 Canvas 底部
- Canvas 右侧 Role Chat 发送消息时，继续调用真实 Claude/Codex CLI Adapter
- 移除左侧 Activity Bar 中的 Agent Chat View 入口，避免 “no data provider” 的混乱观感

## 范围边界

- 不重做视觉设计
- 不引入新依赖
- 不新增多 Agent 自主唤醒
- 不改变 Team Bus / audit-log 的落盘格式

## 验收标准

- Extension Host 回归测试通过
- VSIX 打包通过
- Canvas 角色点击不被拖拽事件吞掉
- Canvas 右侧显示当前 Role Chat
- Team Chatroom 位于 Canvas 底部
- Agent Chat View 不再作为左侧 Activity Bar 的独立视图出现

## 执行结果

- 已完成，见 [[update-002-summary|更新总结]]
- 已审查，见 [[update-002-review|更新审查]]
