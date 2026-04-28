---
title: 自研RoleChat与ClaudeCode单后端设计测试计划
type: test-plan
status: 已确认
created: 2026-04-28
spec: "[[README]]"
plan: "[[plan]]"
tags:
  - spec/test-plan
  - vscode-extension
  - claude-code
---

# 自研RoleChat与ClaudeCode单后端设计测试计划

## 测试目标

验证 R&K Flow 在保留自研 Role Chat、移除 Codex 默认支持后，仍能保持 Claude Code 单后端对话、Canvas 角色切换、TeamBus 通信和审计能力。

## 测试范围

### 覆盖

- TypeScript 编译
- Extension Host 集成测试
- VSIX 打包
- Claude Code Adapter 检测
- Role 默认 engine 映射
- Role Chat UI 渲染
- Canvas 点击 Role 后切换 Role Chat 当前角色
- 用户与 Role 的私聊落盘到 `agent-chat.jsonl`
- TeamBus 消息落盘到 `team-chat.jsonl` / `audit-log.jsonl`
- Team Chatroom 只展示 AgentRole 间消息

### 不覆盖

- Claude Code 官方 Webview 内部 DOM
- Claude Code 本地 transcript / session 私有文件解析
- Codex CLI 真实调用
- 多 Agent 无限自治调度

## 测试用例

| ID | 场景 | 预期 |
|----|------|------|
| TC-001 | `npm run compile` | TypeScript 编译通过 |
| TC-002 | Extension Host 启动 | 扩展激活无异常 |
| TC-003 | Public commands 注册 | R&K Flow 命令存在 |
| TC-004 | Claude Code Adapter 检测 | `claude-code` 可检测 |
| TC-005 | Codex 默认移除 | Extension Host 测试不要求 `codex` 可用 |
| TC-006 | Role engine 映射 | 所有 Role 返回 `claude-code` |
| TC-007 | Manifest 贡献点 | Role Chat 为 side webview，Team Chatroom 为 panel webview |
| TC-008 | Canvas Role 点击 | 当前 Role 更新，Role Chat 聚焦并切换 |
| TC-009 | Role 私聊 | 用户消息和 Agent 响应写入 `agent-chat.jsonl` |
| TC-010 | TeamBus 写入 | `team-chat.jsonl` 和 `audit-log.jsonl` 写入成功 |
| TC-011 | Team Chatroom 渲染 | 不混入用户私聊，仅展示 TeamBus |
| TC-012 | VSIX 打包 | 生成新版本 VSIX |

## 端侧验证

手工验证步骤：

1. 安装新 VSIX
2. 重载 VS Code
3. 打开 R&K Flow
4. 选择一个 Spec
5. 打开 `AgentTeam.canvas`
6. 点击 `spec-writer`
7. 确认右侧 Role Chat 切换为 `spec-writer`
8. 发送一条用户消息
9. 确认使用 Claude Code CLI 运行
10. 确认 `agent-chat.jsonl` 更新
11. 在 Team Chatroom 发送 TeamBus 消息
12. 确认 `team-chat.jsonl` / `audit-log.jsonl` 更新
13. 确认 UI 中没有 Codex 选项

## 日志要求

测试期间日志保留在当前 Spec 目录：

```text
spec/02-技术设计/20260428-1621-ClaudeCode官方扩展接管RoleChat设计/logs/
```

建议保留：

- `extension-build.log`
- `extension-host.log`
- `vsce-package.log`
- `manual-e2e.md`

## 通过标准

- 自动化测试全部通过
- VSIX 成功打包
- Claude Code 单后端可用
- Codex CLI 不再是 MVP 支持项
- Role Chat、Team Chatroom、TeamBus 与审计日志边界清晰
$