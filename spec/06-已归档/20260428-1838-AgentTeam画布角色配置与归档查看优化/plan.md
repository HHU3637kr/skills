---
title: AgentTeam画布角色配置与归档查看优化
type: plan
category: 02-技术设计
status: 未确认
priority: 中
created: 2026-04-28
updated: 2026-04-29
execution_mode: single-agent
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
pr_url:
tags:
  - spec
  - plan
  - vscode-extension
  - agent-team-canvas
  - archive-viewer
related:
  - "[[exploration-report|探索报告]]"
  - "[[test-plan|测试计划]]"
---

# AgentTeam画布角色配置与归档查看优化

## 1. 背景

R&K Flow VS Code 扩展已经具备 AgentTeam Canvas、Role Chat、Team Chatroom、Spec Directory 和 Runtime 生命周期能力。但当前交互边界仍存在几处不符合产品语义的问题：

1. 右侧 Role Chat 底部仍包含 Role 选择器和 Model 选择器。
2. Role 是画布中的 Agent 节点，当前聊天对象应由画布选中节点决定，而不是在聊天区重复选择。
3. Model/backend/system prompt 是 Role 节点的配置属性，应在画布节点配置区编辑，类似 Dify 节点配置，而不是混在聊天 composer 内。
4. 已归档 Spec 在产品语义上应作为只读历史快照被查看，而不是从 UI 中消失。
5. `spec-update` 仅适用于未归档且已完成的 Spec；归档 Spec 的后续动作应是“基于归档启动新 Spec”，而不是更新旧 Spec。
6. 当前 Spec Directory 以 `plan.md` 为唯一扫描入口，导致部分已存在但文档不完整的 Spec 目录没有展示出来。
7. Role Chat 当前仍偏“控制台/表单”，需要向 VS Code / Windsurf Chat 的简单输入体验收敛。

本 Spec 由原 `画布效果优化` 草稿重命名而来，用于完整承接上述需求。

## 2. 目标

### 2.1 产品目标

- 在 Spec Directory 中明确区分 Active Spec 与 Archived Spec。
- Spec Directory 展示所有规范目录下的 Spec，而不是只展示存在 `plan.md` 的 Spec。
- 对缺少核心文档的 Spec 显示 `incomplete` / `missing plan` 等状态，避免静默丢失。
- 打开 Active Spec 时进入可执行 AgentTeam Workspace。
- 打开 Archived Spec 时进入只读 Archive Viewer。
- Role Chat 只负责“用户与当前选中 Role 对话”。
- Role Chat 视觉布局向简单聊天界面收敛：对话流居中、输入框固定底部、常用操作内收，不把控制按钮铺满界面。
- Role Chat 顶部 Header 必须低占用，只承担上下文提示，不作为大块信息面板。
- 当前 Role 由 AgentTeam Canvas 选中节点驱动。
- Role 的 backend/model/system prompt/config 在 Canvas 侧节点配置面板中展示和编辑。
- Archived Spec 中的 Role 配置、Role Chat、Team Chatroom、audit/runtime 文件只读展示。

### 2.2 工程目标

- 为 `SpecBinding` 增加生命周期语义：`active | archived`。
- 将 Spec 扫描数据源从 `spec/**/plan.md` 升级为按 Spec 目录扫描。
- 为 `SpecBinding` 增加健康状态语义：`complete | incomplete`，并记录缺失文档。
- Spec Directory Tree 支持 Active / Archived 分组。
- Canvas Webview 支持选中 Role 后展示节点配置面板。
- Role Chat Webview 移除 Role 选择器和 Model 选择器。
- Role Chat Webview 将过滤、跳底、状态、运行信息重新分布为低占用控件。
- Role Chat 发送消息继续使用扩展侧当前 activeRole，不再从 Webview 表单读取 role/model。
- Archived Spec 禁止发送 Role Chat、TeamBus phase request 和配置保存。
- 自动化测试覆盖 UI 字符串、生命周期分组和消息协议。

## 3. 非目标

- 不重新接入 Codex CLI。
- 不嵌入 Claude Code 官方 VS Code 扩展 Webview。
- 不实现真实多模型 provider 管理页面。
- 不允许归档 Spec 恢复为可执行旧 AgentTeam。
- 不改变 TeamBus 投递、消费、回复三段语义。
- 不改变当前 Claude Code 后端调用方式。

## 4. 现状分析

### 4.1 Spec 扫描

`src/specs/specRepository.ts` 当前通过 `spec/**/plan.md` 扫描所有 Spec。这带来两个问题：

- 只有存在 `plan.md` 的目录才会进入 Spec Directory。
- 如果某个 Spec 目录只有 `README.md`、`team-context.md`、`AgentTeam.canvas`、`runtime.json` 或历史日志，它会被静默漏掉。

本仓库当前就能观察到该问题：按目录名扫描能看到更多 `YYYYMMDD-...` Spec 目录，而按 `plan.md` 扫描只能看到其中一部分。产品上不应该让用户误以为这些 Spec “不存在”。

因此本次需要把扫描模型改为：

1. 先扫描 `spec/<分类>/<Spec目录>`。
2. 目录名符合 `YYYYMMDD-HHMM-*` 或 `YYYYMMDD-*` 即视为候选 Spec。
3. 再读取目录内的 `plan.md`、`README.md`、`team-context.md`、`runtime.json` 作为元数据来源。
4. 缺少 `plan.md` 时仍展示，但标记为 `incomplete · missing plan`。

### 4.2 Spec Directory

`src/extension.ts` 中 `SpecExplorerProvider` 直接返回 `SpecItem[]`：

```ts
async getChildren(): Promise<SpecItem[]> {
  const specs = await this.repository.listSpecs();
  return specs.map(spec => new SpecItem(spec));
}
```

需要改为分组 TreeItem：Root 层展示 `Active` / `Archived`，二级展示 Spec。

### 4.3 Canvas Webview

`renderCanvasHtml()` 已支持：

- 拖拽画布
- 缩放画布
- 点击 Agent 节点后 `postMessage({ command: "selectAgent", role })`
- `Checkout Spec Branch`
- `Request Implementation Phase`

缺失：

- Selected Role 配置面板
- backend/model/system prompt 展示
- archived 只读状态
- archived 下禁用 phase request

### 4.4 Role Chat Webview

`src/roleChat/renderRoleChatHtml.ts` 当前 composer 中仍有：

```html
<select id="role" class="compactSelect" aria-label="Agent Role">
<select id="model" class="compactSelect" aria-label="Model">
```

发送时读取：

```js
role: selectedRole,
model: document.querySelector("#model").value,
```

需要改为：

- 删除 Role 选择器。
- 删除 Model 选择器。
- 通过 Webview 当前 `selectedRole` 发送消息。
- model 使用扩展侧 Role 配置或默认值。
- `roleSelected` 事件只由 Canvas 或扩展侧触发。

## 5. 详细设计

### 5.1 Spec 数据模型

修改 `src/specs/types.ts`：

```ts
export type SpecLifecycle = "active" | "archived";
export type SpecHealth = "complete" | "incomplete";

export interface SpecBinding {
  lifecycle: SpecLifecycle;
  health: SpecHealth;
  missingFiles: string[];
  ...
}
```

修改 `src/specs/specRepository.ts`：

- 当 `category === "06-已归档"` 或 `specDir` 包含 `/06-已归档/` 时，`lifecycle = "archived"`。
- 其他 Spec 为 `active`。
- `plan.md` 存在时优先从 `plan.md` frontmatter 读取标题、状态、分支。
- `plan.md` 缺失时依次从 `README.md`、`team-context.md`、目录名推断标题。
- `missingFiles` 至少检查 `plan.md`、`test-plan.md`、`summary.md` 是否存在。
- `health = missingFiles.length === 0 ? "complete" : "incomplete"`。
- 对历史运行产物目录也要展示，但在 description 中明确 `incomplete`，避免用户误判为完整可执行 Spec。

### 5.2 Spec Directory 分组

修改 `src/extension.ts`：

- 新增 `SpecGroupItem`。
- `SpecExplorerProvider.getChildren()`：
  - root 层返回 `Active`、`Archived` 分组。
  - 分组下返回对应 `SpecItem[]`。
- `SpecItem.description`：
  - active complete: `${phase} · ${gitBranch || "no branch"}`
  - active incomplete: `incomplete · missing ${missingFiles[0]}`
  - archived complete: `archived · ${gitBranch || "no branch"}`
  - archived incomplete: `archived · incomplete`
- icon：
  - active 使用 `git-pull-request`
  - archived 使用 `archive`
  - incomplete 可使用 `warning`

### 5.3 Canvas Role 配置面板

修改 `renderCanvasHtml(spec, currentBranch)`：

- 右上保留 Spec/Git 信息卡。
- 在 Spec 信息卡下方新增 `Selected Role` 配置卡。
- 配置卡字段：
  - Role
  - Backend: `Claude Code`
  - Model: `Default model`
  - System Prompt 预览
  - Lifecycle badge: `editable` / `read-only`
- 点击节点后同步：
  - 高亮 Role 节点
  - 更新配置卡 Role 名称
  - 通知 Role Chat 切换当前 Role

Active Spec：

- `Backend` / `Model` 以 select-like 控件呈现。
- `Save Role Config` 按钮可见。
- `Request Implementation Phase` 可用。

Archived Spec：

- 配置卡为 `Snapshot Config`。
- `Request Implementation Phase` 隐藏或禁用。
- 节点显示 `RO`。

### 5.4 Role Chat composer 简化

修改 `src/roleChat/renderRoleChatHtml.ts`：

- 删除 `#role` select。
- 删除 `#model` select。
- 删除 `document.querySelector("#role").value = selectedRole`。
- 删除 `#role change` 事件监听。
- `sendPrompt()` 中不再读取 `#model`。
- composer 固定在底部，采用接近 VS Code / Windsurf Chat 的布局：
  - 上方是大输入框。
  - 输入框底部左侧放轻量操作入口：`+`、当前模式 `Agent`、视图/过滤设置。
  - 输入框底部右侧只放发送按钮。
  - 不在 composer 内放 Role 选择和 Model 选择。
- 当无消息时，对话区中间显示轻量 empty state：当前 Role 名称和“Chat with selected role”。
- runtime 状态不再以大块面板占据顶部，改为 composer 下方一行低对比状态栏：
  - `activity idle/running`
  - `backend claude-code`
  - `lifecycle active/archived`
  - `mailbox n`

发送协议调整：

```js
vscode.postMessage({
  command: "send",
  role: selectedRole,
  body: prompt.trim()
});
```

扩展侧继续允许 `message.model` 可选；为空时使用默认配置。

### 5.5 Role Chat 按钮分布

现有按钮按职责重新分布：

| 现有按钮/控件 | 新位置 | 说明 |
|---------------|--------|------|
| `Role` 下拉 | 移除 | 当前 Role 由 Canvas 节点选择 |
| `Model` 下拉 | 移至 Canvas Role 配置面板 | 属于 Role 配置，不属于聊天输入 |
| `Send` | composer 右下角圆形按钮 | 保持唯一主操作 |
| `All / Replies / Tools / Errors / Files / TeamBus` | 收入 composer 左下角“过滤/视图”按钮或聊天区右上菜单 | 默认不铺开，避免占用垂直空间 |
| `Bottom` | 聊天区滚动时显示悬浮“跳到底部”小按钮 | 不常驻 toolbar |
| runtime pills | composer 下方一行状态栏 | 低对比，仅提供运行状态 |
| Open file / file artifact | 保留在消息卡片内 | 与具体消息绑定 |

这样右侧聊天区的主结构为：

```text
Role Chat header（轻量显示当前 Role / Spec）
Conversation timeline
Bottom composer
  textarea
  + / Agent / filters                      Send
Runtime status strip
```

Header 设计约束：

- 高度目标控制在 `44px - 56px`。
- 不使用大字号 Role 标题。
- 不展示多行状态卡片。
- 当前 Role、Spec、归档/可执行状态用单行或紧凑 breadcrumb 表达。
- 详细 backend/model/prompt/runtime 信息放到 Canvas Role 配置面板或底部状态条，不放在 Header。
- Header 可以在滚动时保持 sticky，但视觉权重要低于消息区和输入框。

### 5.6 Archived Spec 只读模式

当 `spec.lifecycle === "archived"`：

- Role Chat textarea disabled。
- send button disabled。
- Canvas phase request disabled。
- Role config 保存按钮 disabled 或改为 `Snapshot Config`。
- Team Chatroom 继续只读展示历史 `team-chat.jsonl`。
- Current Spec Files 仍展示归档目录文件。

### 5.7 原型资产处理

保留当前 HTML 原型作为产品参考：

- `prototypes/spec-archive-viewer.html`
- `prototypes/spec-archive-viewer-preview.png`

这两个文件不进入扩展运行时，仅作为设计参考和验收对照。

## 6. 实现步骤

- [ ] 更新 `SpecBinding` 类型和 `SpecRepository` 生命周期推断。
- [ ] 将 `SpecRepository.listSpecs()` 从按 `plan.md` 扫描改为按 Spec 目录扫描。
- [ ] 增加缺失文档检测与 incomplete 状态展示。
- [ ] 改造 `SpecExplorerProvider`，支持 Active / Archived 分组。
- [ ] 改造 `renderCanvasHtml()`，新增 Selected Role 配置面板和 archived 只读状态。
- [ ] 改造 Canvas Webview 消息逻辑，active/archived 下分别处理 phase request 和 role select。
- [ ] 改造 `renderRoleChatHtml()`，移除 Role/Model 选择器。
- [ ] 改造 Role Chat 布局为简单聊天界面：底部 composer、收起过滤按钮、低占用状态栏。
- [ ] 调整 Role Chat 发送协议，model 改为可选并由扩展侧兜底。
- [ ] 更新自动化测试。
- [ ] 运行 `npm run compile`、`npm test`。
- [ ] 打包 VSIX 并记录日志。

## 7. 验收标准

- [ ] Spec Directory 中能看到 Active / Archived 分组。
- [ ] Spec Directory 能展示所有符合命名规范的 Spec 目录，而不只展示存在 `plan.md` 的目录。
- [ ] 缺少 `plan.md` 的 Spec 目录不会消失，而是显示 `incomplete · missing plan`。
- [ ] Archived Spec 不从 UI 消失。
- [ ] 打开 Archived Spec 后 Canvas / Role Chat / Team Chatroom 只读可查看。
- [ ] 右侧 Role Chat composer 中不再出现 Role 选择器。
- [ ] 右侧 Role Chat composer 中不再出现 Model 选择器。
- [ ] Role Chat 过滤按钮不再常驻铺满顶部工具栏。
- [ ] Role Chat 运行状态以底部低占用状态栏展示。
- [ ] Role Chat Header 高度低占用，不再展示大块 Role 信息和状态卡片。
- [ ] 空会话时 Role Chat 显示轻量 empty state，而不是空白控制台。
- [ ] 点击 Canvas Role 节点后，右侧 Role Chat 切换到对应 Role。
- [ ] 点击 Canvas Role 节点后，Canvas 配置面板显示该 Role 的 backend/model/system prompt。
- [ ] Active Spec 中 Role 配置面板显示 editable。
- [ ] Archived Spec 中 Role 配置面板显示 read-only/snapshot。
- [ ] 原有 Role Chat timeline、tool/result 合并、TeamBus 展示不回归。
- [ ] 自动化测试通过。

## 8. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| TreeDataProvider 分组改造影响现有命令参数 | Spec 点击打不开 Canvas | 测试分组节点和 SpecItem 命令参数 |
| Role Chat 移除 model select 后发送协议不兼容 | 消息无法发送 | 扩展侧将 model 字段设为可选并默认兜底 |
| archived 只读状态遗漏 | 用户可继续运行归档 Spec | Canvas、RoleChat、RuntimeManager 多层校验 |
| UI 字符串测试过度脆弱 | 小改文案导致测试失败 | 测关键 DOM/关键文本，不测完整 HTML |

回滚方案：

1. 还原 `SpecBinding` lifecycle 改动。
2. 还原 `SpecExplorerProvider` 分组实现。
3. 还原 `renderCanvasHtml()` 和 `renderRoleChatHtml()` 对应改动。
4. 运行回归测试确认旧行为恢复。
