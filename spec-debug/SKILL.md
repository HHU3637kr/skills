---
disable-model-invocation: true
name: spec-debug
description: >
  诊断并修复 Spec 执行过程中发现的问题。由角色 spec-debugger 调用。
  触发条件：(1) 角色 spec-debugger 接收到 TeamLead 转交的 bug handoff，
  (2) spec-executor 执行后出现 bug 或 writer/plan.html 中未考虑到的情况，
  (3) 运行时出现问题、依赖环境或配置问题。
  不修改已确认的 writer/plan.html，而是在 debugger/ 下创建独立的诊断文档（debug-xxx.html）和修复总结（debug-xxx-fix.html）。
  修复完成后向 TeamLead 提交重新验证请求，由 TeamLead 启动 spec-tester。
---

# Spec Debug

## 运行契约

> 进入核心原则前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | TeamLead 转交的 bug handoff（含复现步骤）、`writer/plan.html`、`executor/summary.html`、`tester/test-report.html`、`exp-search` 结果 |
| 权限 | 写 `debugger/debug-xxx.html` / `debug-xxx-fix.html` + 最小化修复代码；不改已确认的 `writer/plan.html`、不加新功能、不自行判定修复成功 |
| 验证 | 诊断含根因分析、修复总结含前后对比与本轮进展（新增根因/缩小范围/新增证据），由 spec-tester 重新验证 |
| 停止 | 受「修复循环预算」约束：「已用轮数」 达 「最大轮数」 或 「连续无进展」 达 「最大无进展轮数」 时停止修复 |
| 升级 | 预算未确认、触发预算上限、或根因涉及权限/计费/数据迁移/需绕过测试时，停止并交回 TeamLead 由用户决策 |

## 核心原则

1. **不修改已确认的 writer/plan.html**：通过创建 debug 文档记录问题，保持设计的可追溯性
2. **闭环协作**：接收 TeamLead 转交的 bug handoff → 修复 → 向 TeamLead 请求重新验证
3. **用户确认诊断**：创建 debug-xxx.html 后，由 TeamLead 向用户确认诊断结果
4. **受预算约束**：修复循环受 `lead/team-context.md` 的「修复循环预算」约束（「最大轮数」 / 「最大无进展轮数」，由用户在进入循环前确认）。每轮修复后必须更新 「已用轮数」 和 「连续无进展」，触发上限时停止并交还 TeamLead，不自行无限重试。

## 协作闭环

```
spec-tester 发现 bug
    → 向 TeamLead 提交 bug handoff（含复现步骤）
    → TeamLead 启动 spec-debugger
    → spec-debugger 调用 spec-debug
    → 诊断 → debugger/debug-xxx.html
    → TeamLead 向用户确认诊断
    → 修复 → debugger/debug-xxx-fix.html
    → spec-debugger 向 TeamLead 请求 spec-tester 重新验证
    → TeamLead 启动 spec-tester 重新验证
    → spec-tester 验证通过 → 记录到 tester/test-report.html
```

## 工作流程

### 步骤 1：收集问题信息

从 TeamLead 转交的 bug handoff 中获取：
- 问题现象和复现步骤
- 预期行为 vs 实际行为
- 相关测试用例编号

读取相关文档：`writer/plan.html`、`executor/summary.html`、`tester/test-report.html`（草稿）。

### 步骤 2：检索历史经验

```bash
/exp-search <关键词>
```

以问题关键词检索，参考历史解决方案。

### 步骤 3：复现并定位问题

尝试复现问题，使用日志、调试工具定位问题代码，确认边界条件。

### 步骤 4：分析根因

| 类型 | 说明 |
|------|------|
| 设计遗漏 | `writer/plan.html` 未考虑的边界情况 |
| 实现偏差 | 实现与 `writer/plan.html` 不一致 |
| 环境问题 | 依赖、配置、版本问题 |
| 集成问题 | 模块间交互问题 |

### 步骤 5：创建 debug-xxx.html 诊断文档

撰写报告前先读 `html-report` skill，确认最新的骨架、修订规范和禁止事项。

**命名规范**：`debugger/debug-001.html`（按发现顺序编号）

**HTML 骨架**（完整模板见 [references/debug-template.html](references/debug-template.html)）：
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>问题诊断 - {问题简述}</title>
<meta name="rk:type"         content="debug">
<meta name="rk:spec-dir"     content="spec/{分类目录}/{YYYYMMDD-HHMM-任务描述}">
<meta name="rk:role"         content="spec-debugger">
<meta name="rk:title"        content="问题诊断-{简述}">
<meta name="rk:debug-number" content="001">
<meta name="rk:category"     content="{与 writer/plan.html 相同}">
<meta name="rk:status"       content="未确认">
<meta name="rk:severity"     content="{高|中|低}">
<meta name="rk:created"      content="{YYYY-MM-DD}">
<meta name="rk:updated"      content="{YYYY-MM-DD}">
<meta name="rk:revision"     content="1">
<meta name="rk:git-branch"   content="{git_branch}">
<meta name="rk:base-branch"  content="{base_branch}">
<meta name="rk:pr-url"       content="{pr_url，创建前留空}">
<meta name="rk:tags"         content="spec,debug">
<link rel="rk-plan"    href="../writer/plan.html">
<link rel="rk-summary" href="../executor/summary.html">
<link rel="rk-fix"     href="debug-001-fix.html">
<link rel="rk-ledger"  href="../../lead/team-context.md">
<link rel="stylesheet" href="../../../../html-report/assets/rk-report.css">
<script defer src="../../../../html-report/assets/rk-report.js"></script>
</head>
```

`<header class="rk-head">` 里的 `.rk-meta` 镜像同样字段（含 `base_branch` 与 `pr_url`），机器可读与人可读两轨缺一不可。

**必须包含**：问题现象（`rk-cal risk`）、复现步骤、根因分析（`rk-cal key`）、修复方案、与 `writer/plan.html` 的关系（`rk-cal key` 设计关联）、结论块 `<section class="rk-verdict is-fail">`、修订历史表、双向关联产物（`rk-links` / `rk-backlinks`）。

代码位置一律用 `<span class="rk-ref">src/x.ts:88</span>`。

### 步骤 6：通知 TeamLead 等待用户确认诊断

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「问题闭环记录」中追加或更新对应问题行
- 「分类」一般为 `bug`；若根因是环境/依赖/流程问题，用对应 `category`
- `owner` 写 `spec-debugger`
- 「关联产物」 指向 `debugger/debug-xxx.html`
- 「状态」标记为 `diagnosed`
- 「更新者」 写 `spec-debugger`
- 若存在多个修复路径且做了取舍（如最小补丁 vs 重构、降级 vs 报错），在「决策记录」记一行，「拍板者」 写 `spec-debugger` 或 `user`
- 只修改「问题闭环记录」/「决策记录」，不要修改 TeamLead 控制面区块

```text
通知 TeamLead：debugger/debug-001.html 已创建，请向用户确认诊断结果。路径：{路径}
```

TeamLead 使用当前运行环境的确认方式向用户确认。等待确认通过后继续修复。

### 步骤 7：检查修复循环预算

开始本轮修复前，读取 `lead/team-context.md` 的「修复循环预算」（`test-debug` 行）：

1. 如果 「最大轮数」 / 「最大无进展轮数」 仍为「待确认」，说明 TeamLead 尚未与用户确认预算，**先停止并请 TeamLead 用 `intent-confirmation` 确认预算**（建议默认 3 轮 / 连续 2 轮无进展），不要在无预算的情况下进入修复。
2. 如果 「已用轮数」 已达到 「最大轮数」，或 「连续无进展」 已达到 「最大无进展轮数」，**不要再修复**，直接向 TeamLead 升级，由用户决定继续加预算、改方案还是暂停。
3. 预算未触上限时，继续步骤 8 的修复。

### 步骤 8：执行修复

按照确认的修复方案修改代码：
- 最小化修改范围
- 不借机添加新功能
- 在代码注释中引用 debug 文档：`# 修复: debugger/debug-001.html`

### 步骤 9：创建 debug-xxx-fix.html 修复总结

**HTML 骨架**（完整模板见 [references/debug-template.html](references/debug-template.html)）：
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>修复总结 - {问题简述}</title>
<meta name="rk:type"         content="debug-fix">
<meta name="rk:spec-dir"     content="spec/{分类目录}/{YYYYMMDD-HHMM-任务描述}">
<meta name="rk:role"         content="spec-debugger">
<meta name="rk:title"        content="修复总结-{简述}">
<meta name="rk:debug-number" content="001">
<meta name="rk:category"     content="{与 writer/plan.html 相同}">
<meta name="rk:status"       content="未确认">
<meta name="rk:created"      content="{YYYY-MM-DD}">
<meta name="rk:updated"      content="{YYYY-MM-DD}">
<meta name="rk:revision"     content="1">
<meta name="rk:git-branch"   content="{git_branch}">
<meta name="rk:base-branch"  content="{base_branch}">
<meta name="rk:pr-url"       content="{pr_url，创建前留空}">
<meta name="rk:tags"         content="spec,debug-fix">
<meta name="rk:fix-round"    content="{rounds_used}/{max_rounds}">
<link rel="rk-plan"   href="../writer/plan.html">
<link rel="rk-debug"  href="debug-001.html">
<link rel="rk-ledger" href="../../lead/team-context.md">
<link rel="stylesheet" href="../../../../html-report/assets/rk-report.css">
<script defer src="../../../../html-report/assets/rk-report.js"></script>
</head>
```

**必须包含**：修改的文件、关键修改前后对比（`rk-cal key` 说明为什么这样改）、验证结果（`rk-cal ok` 本地自检 + `rk-cal warn` 待 spec-tester 复验）、本轮相对上一轮的进展（新增定位的根因 / 缩小的失败范围 / 新增证据）、修订历史表、双向关联产物。

复验通过后再把结论块改为 `is-pass`，并按修订规范留痕（修订号 +1、修订历史表追加一行、`data-rev` 标记），永不静默改写。

### 步骤 10：更新修复循环记账

更新 `lead/team-context.md` 的「修复循环预算」（`test-debug` 行）：
- 「已用轮数」 加 1
- 判断本轮是否「有进展」：是否定位到此前未知的根因、是否缩小了失败范围、是否产生了新的可验证证据。
  - 有进展：「连续无进展」 归零
  - 无进展（仅写了新总结但根因、范围、证据都没动）：「连续无进展」 加 1
- 若 「已用轮数」 达到 「最大轮数」 或 「连续无进展」 达到 「最大无进展轮数」，把 「状态」标为 `stopped-budget` 或 `stopped-no-progress`，并在通知中要求 TeamLead 升级给用户；否则保持 `status=running`
- `updated_at` 使用当前时间

### 步骤 11：向 TeamLead 提交重新验证请求

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-debugger 自己的调试修复任务行，「产物」指向 `debugger/debug-xxx-fix.html`
- 在「问题闭环记录」中更新对应问题行，「解决方案」 简述修复方案，「关联产物」 包含 `debugger/debug-xxx.html` / `debugger/debug-xxx-fix.html`
- 「状态」标记为 `fixed_pending_verification`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-debugger`
- 只修改「任务进度」/「问题闭环记录」/「决策记录」/「修复循环预算」，不要修改 TeamLead 其他控制面区块

如果预算未触上限：

```text
通知 TeamLead：
- bug 已修复（第 {rounds_used} 轮）
- 本轮进展：[新增根因 / 缩小范围 / 新增证据]
- 请启动 spec-tester 重新验证测试用例 TC-XXX
- 修复详情：debugger/debug-001-fix.html
```

如果触发了预算上限（`stopped-budget` / `stopped-no-progress`）：

```text
通知 TeamLead：修复循环已达预算上限，停止修复并请升级给用户。
- 已用轮数：{rounds_used}/{max_rounds}
- 连续无进展轮数：{no_progress_streak}/{max_no_progress_rounds}
- 当前最接近的根因假设和剩余风险：[简述]
- 建议用户在「继续加预算 / 改方案 / 暂停」中决定下一步
```

## 与其他角色的协作

```
spec-tester → TeamLead → spec-debugger（本角色）
spec-debugger → 诊断 → 通知 TeamLead（用户确认）→ 修复
spec-debugger → TeamLead → spec-tester（重新验证）
```

- 不直接修改 `writer/plan.html`
- 不在修复中添加新功能（使用 spec-update）
- 修复完成后必须向 TeamLead 请求 spec-tester 重新验证，不自行判断修复是否成功
- 不在「修复循环预算」触发上限后继续修复，必须停止并升级给 TeamLead

## 后续动作

完成修复后确认：
1. `debugger/debug-xxx.html` 已创建且用户已确认诊断
2. `debugger/debug-xxx-fix.html` 已创建
3. 已更新 `lead/team-context.md` 的「任务进度」、「问题闭环记录」（含「分类」）、必要的「决策记录」和「修复循环预算」（「已用轮数」 / 「连续无进展」 / `status`）
4. 已向 TeamLead 提交重新验证请求，或在触发预算上限时请求升级
5. 未修改 `writer/plan.html`

### 常见陷阱
- 直接修改 `writer/plan.html` 而不是创建 debug 文档
- 修复后未向 TeamLead 请求 spec-tester 重新验证（破坏闭环）
- 修复时引入了新功能（应使用 spec-update）
- 每轮都写新的 debug 文档但没有实质进展，却不更新 「连续无进展」（loop 在原地打转）
- 在预算未确认或已触上限时仍继续修复（应停止并升级给 TeamLead）
- 撰写诊断或修复总结前没读 `html-report` skill，写成 Markdown 或漏掉 `data-rev` 修订标记
