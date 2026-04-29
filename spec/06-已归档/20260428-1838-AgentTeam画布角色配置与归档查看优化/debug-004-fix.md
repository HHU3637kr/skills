---
title: 修复总结-AgentRole未绑定工作流Skill
type: debug-fix
category: 02-技术设计
status: 未确认
created: 2026-04-29
plan: "[[plan]]"
debug: "[[debug-004]]"
tags:
  - spec
  - debug-fix
  - vscode-extension
  - agent-role
  - skill-routing
---

# 修复总结：AgentRole未绑定工作流Skill

## 1. 修改文件

- `rk-flow-vscode-extension/src/extension.ts`
- `rk-flow-vscode-extension/src/test/suite/extension.test.ts`
- `spec/02-技术设计/20260428-1838-AgentTeam画布角色配置与归档查看优化/debug-004.md`

## 2. 修复内容

本次修复将 AgentRole 从“只有角色名”的提示，升级为“角色职责 + workflow Skill 名称 + 使用规则 + 路由表”的运行约束。

关键原则：

- 只绑定 Skill 名称，例如 `$spec-debug`、`$spec-explore`。
- 不硬编码本地 Skill 路径。
- 不在 prompt 中要求读取 `SKILL.md` 文件路径。
- Claude Code / Codex 等后端自行解析已安装 Skill。

## 3. 关键修改

### 修复前

`buildRolePrompt()` 只注入角色名、Spec 信息和 TeamBus 协议。角色不知道自己应该调用哪个工作流 Skill。

### 修复后

新增 `RoleDefinition`：

```ts
{
  role: "spec-debugger",
  responsibility: "Diagnose verified defects...",
  skillName: "spec-debug",
  skillUsage: "Use when debugging implementation or runtime issues..."
}
```

`buildRolePrompt()` 现在注入：

- 当前角色职责。
- `Required workflow skill: $spec-debug`。
- Skill 使用规则。
- 完整 Role-to-Skill 路由表。
- “Use the installed skill by name”的约束。

Canvas 角色配置面板同步展示 `Workflow Skill`，但只展示 `$spec-*` 名称，不展示本地路径。

## 4. 验证结果

已执行：

```text
npm run compile
npm test
npm run package
```

结果：

- TypeScript 编译通过。
- VS Code Extension Host 自动化测试通过：`30 passing`。
- VSIX 已重新打包：`rk-flow-vscode-extension/rk-flow-vscode-extension-0.0.12.vsix`。

新增测试覆盖：

- `spec-debugger` prompt 包含 `$spec-debug`。
- 路由表包含 `spec-debugger -> $spec-debug` 和 `spec-tester -> $spec-test`。
- prompt 不包含 `SKILL.md`、本地 skill 路径或 Windows 绝对路径。
- Canvas HTML 只包含 `skillName` 配置，不包含本地路径。

## 5. 后续验证

请 `spec-tester` 重新验证：

1. 点击不同 AgentRole 后，Canvas 角色配置显示正确的 `$spec-*`。
2. 发送消息给 `spec-debugger` / `spec-explorer` 时，Claude Code 收到的 prompt 中包含对应 Skill 名称。
3. 角色不会再依赖硬编码路径判断工作流。
