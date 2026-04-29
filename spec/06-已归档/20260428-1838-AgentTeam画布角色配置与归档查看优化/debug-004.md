---
title: 问题诊断-AgentRole未绑定工作流Skill
type: debug
category: 02-技术设计
status: 已确认
severity: 高
created: 2026-04-29
plan: "[[plan]]"
tags:
  - spec
  - debug
  - vscode-extension
  - agent-role
  - skill-routing
---

# 问题诊断：AgentRole未绑定工作流Skill

## 1. 问题现象

当前 R&K Flow 创建了 `TeamLead`、`spec-explorer`、`spec-writer`、`spec-executor`、`spec-tester`、`spec-debugger`、`spec-ender` 等角色，但角色真正调用 Claude Code 时只知道自己的角色名和 TeamBus 协议。

缺失内容：

- 没有明确告诉 `spec-explorer` 应使用 `$spec-explore`。
- 没有明确告诉 `spec-writer` 应使用 `$spec-write`。
- 没有明确告诉 `spec-executor` 应使用 `$spec-execute`。
- 没有明确告诉 `spec-tester` 应使用 `$spec-test`。
- 没有明确告诉 `spec-debugger` 应使用 `$spec-debug`。
- 没有明确告诉 `spec-ender` 应使用 `$spec-end`。
- `TeamLead` 没有明确的协调边界和路由表。

## 2. 实际行为

`buildRolePrompt()` 当前只注入：

- `You are ${role}`
- 当前 Spec 标题、目录、Git 分支
- TeamBus 协议
- 简单的“按当前角色回答”

这使得角色名只是标签，不是稳定工作流约束。

## 3. 预期行为

每个角色都应有明确的 `RoleDefinition`：

- 角色职责。
- 绑定的工作流 Skill 名称。
- 不硬编码本地 Skill 文件路径；Claude / Codex 等后端负责解析已安装 Skill。
- 何时使用该 Skill。
- 如果请求不属于本角色，应通过 TeamBus 转交对应角色。

真正发送给 Claude Code 的 prompt 必须包含这些信息，而不仅是 Canvas 上展示。

## 4. 根因分析

根因是实现中存在两套分离的“角色提示”：

1. `roleSystemPrompt()`：只用于 Canvas 展示，且内容很短。
2. `buildRolePrompt()`：真正发给 Claude Code，但没有 Skill 绑定。

因此 UI 里看似有角色说明，运行时 Claude Code 并没有收到“必须按某个 Skill 执行”的约束。

## 5. 修复方案

1. 新增 `RoleDefinition` 数据结构。
2. 为每个 AgentRole 定义职责、Skill 名和使用规则。
3. `roleSystemPrompt()` 从 `RoleDefinition` 生成，供 Canvas 展示。
4. `buildRolePrompt()` 注入：
   - 当前角色职责。
   - Required workflow skill。
   - Skill usage rule。
   - 完整角色路由表。
   - “不得绕过 Skill 做 ad-hoc 工作”的约束。
5. 补自动化测试，确保关键角色 prompt 包含对应 Skill 名称，并且不包含本地 Skill 路径。

## 6. 与 plan.md 的关系

- 不修改 `plan.md`。
- 该问题属于 AgentTeam 运行语义的实现缺陷。
- 修复不改变 Claude Code 后端调用方式，只增强 prompt 内容。
