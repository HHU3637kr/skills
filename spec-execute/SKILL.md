---
disable-model-invocation: true
name: spec-execute
description: >
  严格按 writer/plan.html 执行新功能开发。由角色 spec-executor 调用。
  触发条件：(1) 角色 spec-executor 需要按 writer/plan.html 实现代码，
  (2) 用户说"执行 Spec"/"开始实现"，
  (3) 当前 Spec 目录下存在 writer/plan.html 但没有 executor/summary.html。
  注意：v2.0 起移除路径 B（agent-teams）和测试步骤，spec-execute 只有单一职责：
  按 writer/plan.html 实现代码，产出 executor/summary.html，并交接给测试阶段。
  如果目录下已有 executor/summary.html，应使用 spec-update。
---

# Spec Execute

根据当前 Spec 目录中的 `writer/plan.html` 执行新功能开发，严格遵循已批准的设计方案，不添加额外功能。完成后创建 `executor/summary.html`（HTML 报告，契约见 `html-report` skill），并通知 TeamLead 进入测试阶段。

## 运行契约

> 进入核心原则前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 已确认的 `writer/plan.html`、`exp-search` 检索结果、TeamLead 提供的 Git 元数据 |
| 权限 | 按 plan 实现代码 + 写 `executor/summary.html`；不写测试、不修 bug、不归档、不提交或推送 |
| 验证 | 只实现 plan 中明确定义的功能，使用 plan 的类名/方法名/数据结构，代码注释引用 plan 章节 |
| 停止 | plan 定义的实现步骤全部完成且 summary 通过用户确认即停止，不"优化"、不加 plan 未定义的功能 |
| 升级 | plan 不完整、前置阶段未完成、或实现中发现 plan 设计有误时，停止实现并交回 TeamLead 由用户决策 |

## 核心原则

1. **Spec 优先**：只实现 `writer/plan.html` 中明确定义的功能，不添加、不偏离、不"优化"
2. **用户确认必须执行**：完成 `executor/summary.html` 后必须使用当前运行环境的确认方式向用户确认
3. **交接清晰**：实现完成后只交接给 TeamLead，不执行测试、不归档、不提交或推送

### v2.0 变更

spec-execute 移除路径 B（agent-teams）和测试步骤（A7/A8）。
测试由 spec-tester 负责，bug 修复由 spec-debugger 负责。
spec-execute 只负责：实现代码 → 产出 `executor/summary.html` → 通知 TeamLead。

## 工作流程

### 步骤 1：读取并理解 writer/plan.html

1. 使用 `Read` 工具读取 `writer/plan.html`
2. 理解目标、范围、设计方案、数据模型、接口定义
3. 记录 Spec 所在目录（用于创建 `executor/summary.html` 和后续交接）
4. 读取并保留 `rk:git-branch` / `rk:base-branch` / `rk:pr-url`，`executor/summary.html` 必须继承这些字段

### 步骤 2：验证 writer/plan.html 完整性

检查 `writer/plan.html` 是否包含：目标和范围、设计方案、数据模型、接口签名、实现步骤。

如果不完整，停止执行并告知用户缺少哪些内容。

### 步骤 3：确定开发阶段

根据 `writer/plan.html` 内容判断当前阶段，检查前置依赖是否已完成。如果前置阶段未完成，停止并提醒用户。

### 步骤 4：检索历史经验

根据 `writer/plan.html` 的功能关键词，调用 `/exp-search <关键词>` 检索相关经验，在实现时参考。

### 步骤 5：创建任务清单

根据 `writer/plan.html` 的"实现步骤"章节，创建任务清单并标记依赖关系。

### 步骤 6：按顺序实现功能

按任务清单顺序逐个实现，严格遵循 `writer/plan.html` 的设计：
- 使用 `writer/plan.html` 中定义的类名、方法名、数据结构
- 在代码注释中引用 `writer/plan.html` 路径和章节

### 步骤 7：创建 executor/summary.html

撰写报告前先读 `html-report` skill，确认最新的骨架、修订规范和禁止事项。

在当前 Spec 目录下创建 `executor/summary.html`。格式模板见 [references/summary-template.html](references/summary-template.html)。

撰写时应用 html-report 契约：
- 用 `<section class="rk-verdict">` 结论块一句话说清实现结果（全部实现加 `is-pass`，有未实现项加 `is-fail`）
- 用 `rk-cal` 组件标注关键信息：`key` 关键决策 / `warn` 注意 / `risk` 风险 / `ok` 通过
- 代码位置用 `<span class="rk-ref">src/x.ts:88</span>`
- 关联产物用相对链接，分「本报告引用」（`rk-links`）与「引用本报告」（`rk-backlinks`）两向；指向运行账本写 `../../lead/team-context.md`（它保持 Markdown）
- frontmatter 语义双轨保留：`<head>` 内 `<meta name="rk:*">` + `<link rel="rk-*">` 机器可读，`.rk-meta` 人可读镜像，两处字段一致
- 继承 `writer/plan.html` 的 `rk:git-branch` / `rk:base-branch`，`rk:pr-url` 在 PR 创建前留空
- 修订遵循 `data-rev` 规范：修订号 +1、修订历史表追加一行、正文用 `<ins class="rk-ins" data-rev="N">` / `<del class="rk-del" data-rev="N">` / `<p class="rk-added|rk-removed" data-rev="N">` 标记，永不静默改写

### 步骤 8：通知 TeamLead 并等待用户确认

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-executor 自己的任务行
- 「状态」标记为 `done`
- 「产物」指向 `executor/summary.html`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-executor`
- 实现期 plan 未覆盖的取舍（如日志格式、命名、错误处理策略）在「决策记录」记一行，「拍板者」 写 `spec-executor`；若取舍偏离或扩展了 plan，先回报 TeamLead 由用户拍板
- 实现期遇到的过程性问题（环境不一致、依赖缺失、脚本报错、plan 与现状冲突）在「问题闭环记录」记一行，「分类」选 `env` / `dependency` / `process` / `scope`
- 只修改「任务进度」/「决策记录」/「问题闭环记录」，不要修改 TeamLead 控制面区块

```text
通知 TeamLead：executor/summary.html 已完成，请发起用户确认，并在确认后启动 spec-tester 执行测试。
```

TeamLead 使用当前运行环境的确认方式向用户确认。如用户需要修改则根据反馈调整后重新确认。

### 步骤 9：交接测试阶段

用户确认 `executor/summary.html` 后，TeamLead 启动 spec-tester 执行测试。经验反思、归档、提交、推送和 PR 创建由阶段五的 spec-end 统一处理。

## 分类目录

| 目录 | 用途 |
|------|------|
| `01-产品规划` | PRD、路线图、需求拆解、用户流程 |
| `02-技术设计` | 架构、数据模型、模块边界、技术选型 |
| `03-能力交付` | 新增用户可感知能力 |
| `04-系统改进` | Bug、回归、性能/安全问题、配置依赖、无新能力的重构 |
| `05-验证工程` | 独立测试策略、回归验证、覆盖率提升、审计日志方案 |
| `06-已归档` | spec-end 收尾阶段归档 |

## 与其他角色的协作

```
spec-writer → writer/plan.html → spec-executor（本 Skill）→ executor/summary.html
→ 通知 TeamLead → TeamLead 用户确认 → spec-tester 执行测试
```

- 实现完成后不负责测试，通知 TeamLead 触发测试阶段
- 测试阶段发现的 bug 由 spec-debugger 负责，**不是** spec-execute 的职责
- 如果目录下已有 `executor/summary.html`，使用 `spec-update` 而非本 Skill

## 后续动作

完成执行后确认：
1. `executor/summary.html` 已创建并已通知 TeamLead
2. 已更新 `lead/team-context.md` 的「任务进度」中自己的任务行，必要时补「决策记录」/「问题闭环记录」
3. 未执行测试，已等待 TeamLead 启动 spec-tester
4. 未归档、未提交或推送，等待 spec-end 统一收尾

### 常见陷阱
- 添加了 `writer/plan.html` 中未定义的额外功能
- 在 spec-execute 内直接编写和运行测试（应等待 spec-tester）
- 在 spec-execute 内归档、提交或推送（应等待 spec-end）
- `executor/summary.html` 完成后忘记通知 TeamLead
- 撰写 `executor/summary.html` 前没读 `html-report` skill，写成 Markdown 或漏掉修订标记
