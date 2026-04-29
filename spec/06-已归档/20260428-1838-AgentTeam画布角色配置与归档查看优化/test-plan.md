---
title: AgentTeam画布角色配置与归档查看优化测试计划
type: test-plan
category: 02-技术设计
status: 未确认
created: 2026-04-28
updated: 2026-04-29
plan: "[[plan]]"
tags:
  - spec
  - test-plan
  - vscode-extension
  - agent-team-canvas
  - archive-viewer
related:
  - "[[plan|实现计划]]"
---

# 测试计划

## 1. 测试目标

验证本次 AgentTeam Canvas 与归档查看体验优化满足以下要求：

- Spec Directory 明确展示 Active / Archived。
- Spec Directory 展示所有符合命名规范的 Spec 目录，不因缺少 `plan.md` 静默漏掉。
- 文档不完整的 Spec 显示 incomplete 状态。
- Archived Spec 可见但只读。
- Role Chat composer 不再放置 Role/Model 选择器。
- Role Chat 采用简单聊天布局：底部 composer、少量常用入口、低占用状态栏。
- Role Chat 顶部 Header 低占用，不挤压聊天内容。
- Canvas 选中 Role 后可配置 backend/model/system prompt。
- 原有 Role Chat、Team Chatroom、Runtime、TeamBus 行为不回归。

## 2. 自动化测试

### 2.1 Spec Repository

- [ ] `SpecRepository.listSpecs()` 能返回 active 与 archived 生命周期。
- [ ] `SpecRepository.listSpecs()` 以 Spec 目录为数据源，而不是仅以 `plan.md` 为数据源。
- [ ] `spec/06-已归档/<Spec目录>` 被识别为 `lifecycle: "archived"`。
- [ ] 非归档 Spec 目录被识别为 `lifecycle: "active"`。
- [ ] 缺少 `plan.md` 的 Spec 目录仍会出现在结果中。
- [ ] 缺少 `plan.md` 的 Spec 标记为 `health: "incomplete"`，且 `missingFiles` 包含 `plan.md`。
- [ ] 存在 `README.md` 或 `team-context.md` 时，可作为标题和状态的 fallback 元数据来源。

### 2.2 Spec Directory

- [ ] Tree Provider root 层包含 `Active` 和 `Archived` 分组。
- [ ] Active 分组下展示未归档 Spec。
- [ ] Archived 分组下展示已归档 Spec。
- [ ] incomplete Spec 不被过滤，展示为 `incomplete · missing plan`。
- [ ] 点击二级 Spec Item 仍能打开 AgentTeam Canvas。

### 2.3 Canvas Webview

- [ ] `renderCanvasHtml()` 输出 `Selected Role` 配置面板。
- [ ] 配置面板包含 Backend、Model、System Prompt。
- [ ] Active Spec 输出 `Save Role Config` / editable 状态。
- [ ] Archived Spec 输出 `Snapshot Config` / read-only 状态。
- [ ] Archived Spec 不显示可执行 phase request 行为，或对应按钮 disabled。
- [ ] 点击 Agent 节点的脚本仍发送 `selectAgent` 消息。

### 2.4 Role Chat Webview

- [ ] `renderRoleChatHtml()` 不再包含 `aria-label="Agent Role"`。
- [ ] `renderRoleChatHtml()` 不再包含 `Default model` select。
- [ ] composer 仍包含 textarea 和 send button。
- [ ] composer 中有轻量操作入口，但没有铺开的 Role/Model 控件。
- [ ] timeline filters 不再作为常驻大 toolbar 占据顶部空间。
- [ ] header 不再渲染大号 Role 标题、多行 Spec 信息和状态卡片。
- [ ] header 高度控制在约 44px - 56px。
- [ ] runtime 状态在 composer 附近以低占用状态条展示。
- [ ] 无 timeline item 时渲染 empty state。
- [ ] `roleSelected` message 仍能切换 timeline 当前 Role。
- [ ] 发送消息时 payload 包含 `role` 与 `body`，`model` 可选。

### 2.5 回归测试

- [ ] Role Chat timeline 分组正常。
- [ ] Tool call 与 tool result 仍合并展示。
- [ ] Claude Code result aggregate 仍不会产生重复回复。
- [ ] Team Chatroom 继续只读展示 TeamBus。
- [ ] Runtime mailbox backlog 展示不回归。

## 3. 端侧测试

### 3.1 安装与打开

1. 打包 VSIX。
2. 安装到 VS Code / Windsurf。
3. 打开 `C:\Users\18735\.claude\skills` 工作区。
4. 打开 R&K Flow 侧边栏。

### 3.2 Active Spec 验证

- [ ] 左侧 Spec Directory 能看到 Active 分组。
- [ ] 左侧 Spec Directory 能看到所有当前工作区下符合命名规范的 Spec 目录。
- [ ] 对缺少核心文档的 Spec，列表展示 incomplete 状态，而不是不显示。
- [ ] 打开 active Spec 后 Canvas 展示 AgentTeam。
- [ ] 点击不同 Role 节点，右侧 Role Chat 切换到对应 Role。
- [ ] Canvas 中 Selected Role 配置面板同步变化。
- [ ] Role Chat composer 中没有 Role/Model 下拉框。
- [ ] Role Chat 的发送按钮在输入框右下角，其他操作不抢占主输入区。
- [ ] Role Chat 顶部 Header 不占据明显垂直空间。
- [ ] 过滤/视图入口是次级控件，不常驻展开。
- [ ] 可以正常发送 Role Chat 消息。

### 3.3 Archived Spec 验证

- [ ] 左侧 Spec Directory 能看到 Archived 分组。
- [ ] 打开 archived Spec 后 Canvas 可查看。
- [ ] Role Chat 历史可查看。
- [ ] Team Chatroom 历史可查看。
- [ ] 输入框和发送按钮禁用或只读。
- [ ] Role 配置面板显示 snapshot/read-only。
- [ ] 无法触发旧 AgentTeam 继续执行。

### 3.4 文件树验证

- [ ] Current Spec Files 在 active Spec 下展示当前目录。
- [ ] Current Spec Files 在 archived Spec 下展示归档目录。
- [ ] 点击 `summary.md`、`test-report.md`、`audit-log.jsonl` 能正常打开。

## 4. 审计日志

端侧测试日志保留在当前 Spec 目录：

```text
spec/02-技术设计/20260428-1838-AgentTeam画布角色配置与归档查看优化/logs/
```

建议文件：

- `extension-build.log`
- `extension-test.log`
- `extension-package.log`
- `end-side-archive-viewer.log`

## 5. 验收标准

- [ ] 自动化测试全部通过。
- [ ] 端侧测试通过。
- [ ] 归档 Spec 不再从 UI 消失。
- [ ] 文档不完整的 Spec 不再从 UI 消失。
- [ ] Role/Model 选择逻辑从聊天区迁移到 Canvas Role 配置区。
- [ ] 聊天区布局接近 VS Code / Windsurf Chat 的简洁底部输入体验。
- [ ] 没有破坏既有 Role Chat、Runtime、TeamBus 行为。
