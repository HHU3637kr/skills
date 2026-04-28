---
name: spec-execute
description: >
  严格按 plan.md 执行新功能开发。由角色 spec-executor 调用。
  触发条件：(1) 角色 spec-executor 需要按 plan.md 实现代码，
  (2) 用户说"执行 Spec"/"开始实现"，
  (3) spec/ 目录下存在 plan.md 但没有 summary.md。
  注意：v2.0 起移除路径 B（agent-teams）和测试步骤，spec-execute 只有单一职责：
  按 plan.md 实现代码，产出 summary.md，并交接给测试阶段。
  如果目录下已有 summary.md，应使用 spec-update。
---

# Spec Execute

根据 `spec/` 目录中的 `plan.md` 执行新功能开发，严格遵循已批准的设计方案，不添加额外功能。完成后创建 `summary.md`，并通知 TeamLead 进入测试阶段。

## 核心原则

1. **Spec 优先**：只实现 plan.md 中明确定义的功能，不添加、不偏离、不"优化"
2. **用户确认必须执行**：完成 summary.md 后必须使用当前运行环境的确认方式向用户确认
3. **交接清晰**：实现完成后只交接给 TeamLead，不执行测试、不归档、不提交或推送

> [!important] v2.0 变更
> spec-execute 移除路径 B（agent-teams）和测试步骤（A7/A8）。
> 测试由 spec-tester 负责，bug 修复由 spec-debugger 负责。
> spec-execute 只负责：实现代码 → 产出 summary.md → 通知 TeamLead。

## 工作流程

### 步骤 1：读取并理解 plan.md

1. 使用 `Read` 工具读取 plan.md
2. 理解目标、范围、设计方案、数据模型、接口定义
3. 记录 Spec 所在目录（用于创建 summary.md 和后续交接）
4. 读取并保留 `git_branch` / `base_branch` / `pr_url`，summary.md 必须继承这些字段

### 步骤 2：验证 plan.md 完整性

检查 plan.md 是否包含：目标和范围、设计方案、数据模型、接口签名、实现步骤。

如果不完整，停止执行并告知用户缺少哪些内容。

### 步骤 3：确定开发阶段

根据 plan.md 内容判断当前阶段，检查前置依赖是否已完成。如果前置阶段未完成，停止并提醒用户。

### 步骤 4：检索历史经验

根据 plan.md 的功能关键词，调用 `/exp-search <关键词>` 检索相关经验，在实现时参考。

### 步骤 5：创建任务清单

根据 plan.md 的"实现步骤"章节，创建任务清单并标记依赖关系。

### 步骤 6：按顺序实现功能

按任务清单顺序逐个实现，严格遵循 plan.md 的设计：
- 使用 plan.md 中定义的类名、方法名、数据结构
- 在代码注释中引用 plan.md 路径和章节

### 步骤 7：创建 summary.md

在 plan.md 同目录下创建 summary.md。格式模板见 [references/summary-template.md](references/summary-template.md)。

撰写时直接应用 Obsidian 格式：
- 使用 Callout 标注关键信息（`> [!success]`、`> [!warning]`、`> [!note]`）
- 使用双链建立文档关联：`[[plan|设计方案]]`
- 添加标签：`#spec/已完成` `#summary`
- 继承 plan.md 的 `git_branch` / `base_branch`，`pr_url` 在 PR 创建前留空

### 步骤 8：通知 TeamLead 并等待用户确认

```text
通知 TeamLead：summary.md 已完成，请发起用户确认，并在确认后启动 spec-tester 执行测试。
```

TeamLead 使用当前运行环境的确认方式向用户确认。如用户需要修改则根据反馈调整后重新确认。

### 步骤 9：交接测试阶段

用户确认 summary.md 后，TeamLead 启动 spec-tester 执行测试。经验反思、归档、提交、推送和 PR 创建由阶段五的 spec-end 统一处理。

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
spec-writer → plan.md → spec-executor（本 Skill）→ summary.md
→ 通知 TeamLead → TeamLead 用户确认 → spec-tester 执行测试
```

- 实现完成后不负责测试，通知 TeamLead 触发测试阶段
- 测试阶段发现的 bug 由 spec-debugger 负责，**不是** spec-execute 的职责
- 如果目录下已有 `summary.md`，使用 `spec-update` 而非本 Skill

## 后续动作

完成执行后确认：
1. summary.md 已创建并已通知 TeamLead
2. 未执行测试，已等待 TeamLead 启动 spec-tester
3. 未归档、未提交或推送，等待 spec-end 统一收尾

### 常见陷阱
- 添加了 plan.md 中未定义的额外功能
- 在 spec-execute 内直接编写和运行测试（应等待 spec-tester）
- 在 spec-execute 内归档、提交或推送（应等待 spec-end）
- summary.md 完成后忘记通知 TeamLead
