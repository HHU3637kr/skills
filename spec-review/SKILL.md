---
disable-model-invocation: true
name: spec-review
description: 审查 Spec 执行完成情况，检验实现是否严格按照 Spec 执行，识别未完成项和不符项，在 reviewer/ 下生成审查报告（review.html）。在 spec-execute 完成 executor/summary.html 后、spec-end 归档前使用。触发词：审查 Spec、检查实现、Spec Review。
---

# Spec Review

## 运行契约

> 进入核心规则前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | `writer/plan.html` 或 `updater/update-xxx.html`、`executor/summary.html` 或 `updater/update-xxx-summary.html`、实际代码 |
| 权限 | 只写 `reviewer/review.html` / `update-xxx-review.html`（审查结论）；只读代码核对，不修改代码、不修 bug、不归档 |
| 验证 | 按完成度/一致性/额外实现三维核对，每个检查项标注 Spec 位置 + 代码位置（file:line） |
| 停止 | 审查报告定稿且通过用户确认即停止；不越界去修复发现的问题（交给 spec-debugger/spec-update） |
| 升级 | 发现核心功能未实现、数据模型严重不符或需重新实现时，在「问题闭环记录」记录并交回 TeamLead 由用户决策 |

## 核心规则

### 用户确认（必须执行）

完成审查报告后，**必须**使用当前运行环境的确认方式等待用户确认。

```text
确认目标：审查报告已创建完成，审查结果是否准确？
确认选项：
- 审查准确
- 需要调整（请说明问题）
```

### 审查文件命名

| 场景 | 文件名 |
|------|--------|
| 新功能审查 | `reviewer/review.html` |
| 更新审查 | `reviewer/update-001-review.html`（编号与 update 对应） |

## 审查维度

| 维度 | 检查内容 | 标记 |
|------|----------|------|
| 完成度 | Spec 定义的功能是否全部实现（功能点、数据模型、API、测试） | ✅ 已完成 / ❌ 未完成 |
| 一致性 | 实现是否与 Spec 设计一致（接口签名、数据结构、业务逻辑、命名） | ⚠️ 不符 |
| 额外实现 | 是否有 Spec 未定义的额外功能、字段、参数 | ➕ 额外 |

### 审查严格程度

**严格模式（默认）**：所有功能必须实现、签名完全一致、不允许额外实现

**宽松模式**（用户指定时使用）：核心功能必须实现、允许小的接口差异和合理的额外实现

## 工作流程

| 步骤 | 操作 | 要点 |
|------|------|------|
| 1 | 读取 Spec 文档 | 读取 `writer/plan.html` 或 `updater/update-xxx.html`，提取功能点、数据模型、接口定义 |
| 2 | 读取实现总结 | 读取 `executor/summary.html` 或 `updater/update-xxx-summary.html`，了解已完成功能和修改文件 |
| 3 | 建立检查清单 | 从 Spec 提取所有需实现的功能点、模型、接口、测试 |
| 4 | 检查代码实现 | 根据 summary 文件列表读取实际代码，逐项核对 |
| 5 | 对比分析 | 按三个维度（完成度、一致性、额外实现）识别差异 |
| 6 | 生成审查报告 | 撰写前先读 `html-report` skill；在 Spec 目录下创建 `reviewer/review.html`，模板见 [references/review-template.html](references/review-template.html) |
| 7 | 用户确认 | **必须**使用当前运行环境的确认方式等待用户确认 |

### 步骤 5：对比分析要点

问题按优先级分类：
- **🔴 高优先级**：核心功能未实现、数据模型严重不符
- **🟡 中优先级**：接口参数不一致、测试缺失
- **🟢 低优先级**：命名差异、额外实现

### 步骤 6：审查报告要求

- 撰写报告前先读 `html-report` skill，确认最新的骨架、修订规范和禁止事项
- 元信息与正文模板详见 [references/review-template.html](references/review-template.html)
- 每个检查项必须标注具体的 Spec 位置和代码位置，代码位置写成 `<span class="rk-ref">src/x.ts:88</span>`
- 审查结果用 `rk-cal` 组件标注：`ok` 已完成 / `risk` 未完成或严重不符 / `warn` 不符项与需关注风险 / `key` 关键决策
- 结论块用 `<section class="rk-verdict is-pass|is-fail">`，与 `rk:result`（`通过`/`需修复`/`严重不符`）保持一致
- 关联 `writer/plan.html`、`executor/summary.html` 用相对链接，分「本报告引用」（`rk-links`）与「引用本报告」（`rk-backlinks`）两向；指向运行账本写 `../../lead/team-context.md`（它保持 Markdown）
- frontmatter 语义双轨保留：`<head>` 内 `<meta name="rk:*">` + `<link rel="rk-*">` 机器可读，`.rk-meta` 人可读镜像，两处字段一致，`git_branch` / `base_branch` / `pr_url` 不可丢
- 修订遵循 `data-rev` 规范：修订号 +1、修订历史表追加一行、正文用 `<ins class="rk-ins" data-rev="N">` / `<del class="rk-del" data-rev="N">` / `<p class="rk-added|rk-removed" data-rev="N">` 标记，永不静默改写

### 步骤 7：用户确认响应处理

用户确认前，先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-reviewer 自己的审查任务行
- 「产物」指向 `reviewer/review.html` 或 `reviewer/update-xxx-review.html`
- 「状态」根据审查结果标记为 `done` / `needs-fix`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-reviewer`
- 若发现阻塞问题，在「问题闭环记录」中追加问题行，「分类」按性质选（`bug` / `scope` / `process` 等），「发现者」 写 `spec-reviewer`，`owner` 建议写 `TeamLead` 或 `spec-debugger`
- 只修改「任务进度」/「问题闭环记录」，不要修改 TeamLead 控制面区块

| 响应 | 含义 | 后续操作 |
|------|------|----------|
| "审查准确" | 用户确认 | 审查通过 → 交给 spec-end 归档；需修复 → 等待修复后重新审查 |
| "需要调整" 或 "Other" | 需要修改 | 根据用户反馈调整审查报告 |

## 审查结果与后续

| result 值 | 后续操作 |
|-----------|----------|
| `通过` | 新功能 → 交给 spec-end 归档；更新 → 保留原目录 |
| `需修复` | 列出问题清单 → 等待修复 → 重新审查 |
| `严重不符` | 需要重新实现 |

## 禁止与推荐

**禁止**：
- ❌ 只检查完成度，忽略一致性和额外实现检查
- ❌ 审查报告缺少具体代码位置引用（`rk-ref`）
- ❌ 跳过用户确认步骤

**推荐**：
- ✅ 每个检查项标注 Spec 位置 + 代码位置
- ✅ 问题按优先级分类（高 / 中 / 低）
- ✅ 发现常见实现偏差模式时记录到经验库
