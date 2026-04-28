---
title: 修复总结-工具结果重复显示且未与工具调用成组
type: debug-fix
category: 06-已归档
status: 已完成
created: 2026-04-28
plan: "[[plan]]"
debug: "[[debug-001]]"
tags:
  - spec
  - debug-fix
  - role-chat
  - agent-timeline
---

# 修复总结-工具结果重复显示且未与工具调用成组

## 修改文件

- `rk-flow-vscode-extension/src/extension.ts`
- `rk-flow-vscode-extension/src/roleChat/timelineTypes.ts`
- `rk-flow-vscode-extension/src/roleChat/timelineMapper.ts`
- `rk-flow-vscode-extension/src/roleChat/renderers.ts`
- `rk-flow-vscode-extension/src/roleChat/renderRoleChatHtml.ts`
- `rk-flow-vscode-extension/src/test/suite/extension.test.ts`
- `rk-flow-vscode-extension/package.json`
- `rk-flow-vscode-extension/package-lock.json`

## 关键修改

### 1. 阻止 tool_result 变成 assistant_message

`extractText()` 现在跳过以下非回复内容：

- `tool_use`
- `tool_result`
- `thinking`

这样 Claude Code 的工具结果事件只会映射为 `tool_result`，不会再额外生成 TeamLead 回复气泡。

### 2. 增加工具调用关联 ID

`ToolCallItem` 和 `ToolResultItem` 新增可选字段：

```ts
toolUseId?: string
```

mapper 从 Claude Code 的 `tool_use.id` 和 `tool_result.tool_use_id` 中提取该字段。

### 3. 工具调用和结果合并渲染

静态渲染和 Webview 动态渲染都新增 pairing 逻辑：

- 优先按 `toolUseId` 匹配。
- 没有 `toolUseId` 时，fallback 到相邻同名工具。
- 匹配成功后渲染为一个工具卡片，内部包含 `Input` 和 `Output` 两段。

### 4. 版本与打包

扩展版本从 `0.0.10` 升级到 `0.0.11`，已生成：

```text
rk-flow-vscode-extension/rk-flow-vscode-extension-0.0.11.vsix
```

## 回归测试

新增/更新测试覆盖：

- `tool_result` 不再生成 `assistant_message`。
- `readableEventText()` 不再把工具结果纳入最终私聊正文。
- `tool_use.id` 与 `tool_result.tool_use_id` 能被保留为 `toolUseId`。
- 成对工具调用与结果渲染为一个工具卡片。

## 验证结果

执行命令：

```powershell
npm.cmd --prefix rk-flow-vscode-extension test
npm.cmd --prefix rk-flow-vscode-extension run package
```

结果：

- 自动化测试：19 passing
- VSIX 打包：通过，生成 `rk-flow-vscode-extension-0.0.11.vsix`

## 通知 spec-tester

请重新验证：

- Bash 工具输出只以工具结果出现，不再重复为 TeamLead 回复。
- 工具调用和工具结果在同一个工具卡片中展示。
- 普通 assistant 回复、TeamBus 展示和旧历史读取不受影响。
