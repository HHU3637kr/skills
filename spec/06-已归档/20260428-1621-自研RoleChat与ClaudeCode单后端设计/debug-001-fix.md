---
title: 修复总结-ClaudeCode回复重复显示
type: debug-fix
category: 02-技术设计
status: 已完成
created: 2026-04-28
plan: "[[plan]]"
debug: "[[debug-001]]"
tags:
  - spec
  - debug-fix
  - vscode-extension
---

# 修复总结-ClaudeCode回复重复显示

## 修改文件

- `rk-flow-vscode-extension/src/extension.ts`
- `rk-flow-vscode-extension/src/test/suite/extension.test.ts`
- `rk-flow-vscode-extension/package.json`
- `rk-flow-vscode-extension/package-lock.json`

## 关键修改

### 修改前

`readableEventText()` 会从 payload 的 `result` 字段提取文本。

Claude Code stream-json 中：

- `assistant` event 提供一次正文
- `result` event 再提供一次聚合正文

因此 Role Chat 会收到两次相同 `agentEvent`。

### 修改后

`readableEventText()` 先判断 payload：

```ts
if (isClaudeCodeResultPayload(event.payload)) {
  return "";
}
```

当 Claude Code 输出 `type === "result"` 的最终聚合事件时，不再把其中的 `result` 字段渲染为聊天气泡。

## 回归测试

新增测试：

```text
suppresses Claude Code result aggregate text to avoid duplicate Role Chat bubbles
```

验证内容：

- `assistant` event 的正文仍会显示
- `result` event 的聚合正文被抑制，避免重复气泡

## 验证结果

执行命令：

```powershell
npm.cmd --prefix rk-flow-vscode-extension test
```

结果：

```text
12 passing
```

打包结果：

```text
rk-flow-vscode-extension/rk-flow-vscode-extension-0.0.9.vsix
```

## 通知 spec-tester

请重新验证：

- Role Chat 发送普通消息后，Claude Code 回复只出现一次
- `agent-chat.jsonl` 中最终 Agent 回复只落盘一次
- TeamBus 消息解析不受影响
