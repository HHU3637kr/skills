---
disable-model-invocation: true
name: spec-explore
description: >
  Spec 创建前的信息收集与探索。由角色 spec-explorer 调用。
  触发条件：(1) 角色 spec-explorer 需要在 Spec 创建前收集背景信息，
  (2) 需要检索历史经验（exp-search），
  (3) 需要探索项目代码库、外部文档或第三方库，
  (4) TeamLead 通知 spec-explorer 开始工作。
---

# Spec Explore

## 运行契约

> 进入工作流程前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | TeamLead 的任务描述与探索范围、`exp-search` 检索结果、项目代码、外部库/文档 |
| 权限 | 只读探索（Read/Glob/Grep）+ 探索新内容后调用 exp-reflect 沉淀知识；不改业务代码、不写 plan、不建测试 |
| 验证 | `explorer/exploration-report.html` 含历史经验、项目现状、外部知识、对下游的建议与已知风险 |
| 停止 | 报告四个章节齐备且足以让 spec-writer/spec-tester 开工即停止，不为"探索更全"无限扩大范围 |
| 升级 | 探索发现需求本身存在矛盾、范围远超任务、或触及权限/安全/数据风险时，停止探索并交回 TeamLead 由用户决策 |

## 核心原则

1. **探索在先**：在 spec-writer 撰写 `writer/plan.html` 之前完成，为 spec-writer 和 spec-tester 提供充分背景
2. **条件性 exp-reflect**：仅探索新内容时才调用 exp-reflect，纯检索已有经验时不调用
3. **explorer 目录归属**：探索产物固定写入当前 Spec 目录的 `explorer/exploration-report.html`，遵循 html-report 契约（HTML + 共享样式表 + `rk:*` meta 双轨元信息 + `data-rev` 修订标记）

## exp-reflect 触发条件

| 情况 | 是否触发 exp-reflect |
|------|---------------------|
| 调用 exp-search 检索已有经验 | ❌ 不触发 |
| 探索项目现有代码库 | ✅ 触发（知识记忆） |
| 探索外部代码库（如第三方库） | ✅ 触发（知识记忆） |
| 阅读外部技术文档 | ✅ 触发（知识记忆） |

## 工作流程

### 步骤 1：接收任务

从 TeamLead 的启动指令中获取：
- 当前任务描述
- 需要探索的范围（项目代码、外部库、文档等）
- 当前 Spec 目录
- `explorer/exploration-report.html` 的保存路径

### 步骤 2：检索历史经验

```bash
/exp-search <关键词>
```

以任务关键词检索，阅读相关经验，记录可参考的历史解决方案。

### 步骤 3：探索项目现状

根据任务需要，探索相关代码：
- 使用 `Grep` 查找相关代码模式
- 使用 `Read` 阅读关键文件
- 使用 `Glob` 了解目录结构

**探索完成后触发 exp-reflect**：探索项目代码后，将新发现调用 exp-reflect 沉淀为知识记忆（记忆文件保持 `.md`）。

### 步骤 4：探索外部资源（如需要）

探索外部代码库（如 AgentScope、第三方库）或技术文档。

**探索完成后触发 exp-reflect**：探索外部资源后，调用 exp-reflect 将关键发现沉淀为知识记忆（记忆文件保持 `.md`）。

### 步骤 5：产出 explorer/exploration-report.html

在当前 Spec 目录下创建 `explorer/exploration-report.html`，遵循 html-report skill 的固定骨架。要求：

- 元信息双轨保留：`<head>` 的 `rk:*` meta / `rk-*` link 机器可读，`.rk-meta` 人可读镜像（含基准分支与 PR）
- 结论用 `rk-verdict` 一句话前置：探索是否足以支撑 spec-writer 开工
- 每条已知风险用 `rk-cal risk` 单独成块，不要埋在正文段落里；关键取舍用 `rk-cal key`，需 spec-tester 重点覆盖的边界用 `rk-cal warn`
- 代码位置用 `<span class="rk-ref">path:line</span>`
- 关联产物双向：`rk-links` 写本报告引用的经验/知识与账本，`rk-backlinks` 写引用本报告的 plan / test-plan（尚未产出时在 `rk-links` 标注（待创建），产出后补齐反链）
- 修订历史表保持 5 列（修订/日期/修改人/改了什么/原因），不新增列；「原因」列源于实质取舍时引用账本「决策记录」的决策编号（如 `按 D-002（…）`），纯笔误/措辞/补充说明直接写清，不编造编号；决策过程正文留在 `lead/team-context.md` 的「决策记录」，不复制进报告

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>探索报告 - {任务描述}</title>

<meta name="rk:type"        content="exploration-report">
<meta name="rk:spec-dir"    content="spec/{XX-分类}/{YYYYMMDD-HHMM-任务描述}">
<meta name="rk:role"        content="spec-explorer">
<meta name="rk:created"     content="{YYYY-MM-DD}">
<meta name="rk:updated"     content="{YYYY-MM-DD}">
<meta name="rk:revision"    content="1">
<meta name="rk:git-branch"  content="{git_branch}">
<meta name="rk:base-branch" content="{base_branch}">
<meta name="rk:pr-url"      content="{pr_url，未创建留空}">
<meta name="rk:tags"        content="spec,exploration">
<link rel="rk-ledger" href="../../lead/team-context.md">
<link rel="rk-plan"   href="../writer/plan.html">

<link rel="stylesheet" href="../../../../html-report/assets/rk-report.css">
<script defer src="../../../../html-report/assets/rk-report.js"></script>
</head>
<body>

<header class="rk-head">
  <h1>探索报告：{任务描述}</h1>
  <div class="rk-meta">
    <span><b>类型</b> exploration-report</span>
    <span><b>Spec</b> <code>spec/{XX-分类}/{YYYYMMDD-HHMM-任务描述}</code></span>
    <span><b>角色</b> spec-explorer</span>
    <span><b>分支</b> <code>{git_branch}</code> ← <code>{base_branch}</code></span>
    <span><b>PR</b> {pr_url 或 —}</span>
    <span><b>创建</b> {YYYY-MM-DD}</span>
    <span><b>修订</b> r1（{YYYY-MM-DD}）</span>
  </div>
</header>

<nav class="rk-revbar"></nav>

<section class="rk-verdict">
  <div class="rk-verdict-label">探索结论</div>
  <p>{一句话：探索到什么程度、下游能否直接开工、最大的不确定性是什么}</p>
</section>

<h2>修订历史</h2>
<table class="rk-revs">
  <thead><tr><th>修订</th><th>日期</th><th>修改人</th><th>改了什么</th><th>原因</th></tr></thead>
  <tbody>
    <tr><td>r1</td><td>{YYYY-MM-DD}</td><td>spec-explorer</td><td>初版</td><td>—</td></tr>
    <tr><td>r2</td><td>{YYYY-MM-DD}</td><td>spec-explorer</td><td>{哪句改成了什么}</td><td>按 <code>D-002</code>（{一句话决策摘要}）／或直接写清非决策性原因</td></tr>
  </tbody>
</table>

<h2>检索到的历史经验</h2>
<p>{exp-search 结果摘要}</p>

<h2>项目现状分析</h2>
<p>{相关代码/模块的理解：当前实现、接口、数据结构}</p>
<p>关键位置：<span class="rk-ref">src/xxx/yyy.ts:120</span></p>

<h2>外部知识</h2>
<p>{探索外部库/文档的关键发现}</p>

<h2>对 Spec 创建的建议</h2>
<ul>
  <li>建议的实现方向：{…}</li>
  <li>可复用的现有组件：{…}</li>
</ul>

<div class="rk-cal key"><div class="t">关键决策</div><p>{建议下游采纳的方向及理由}</p></div>

<h2>已知风险与边界情况</h2>
<div class="rk-cal risk"><div class="t">风险</div><p>{风险 1：现象、触发条件、对下游的影响}</p></div>
<div class="rk-cal risk"><div class="t">风险</div><p>{风险 2}</p></div>
<div class="rk-cal warn"><div class="t">注意</div><p>{需要 spec-tester 特别覆盖的边界情况}</p></div>

<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../../../context/experience/{经验文件}.md" data-rk-link="experience">{经验标题}</a></li>
  <li><a href="../../../context/knowledge/{知识文件}.md" data-rk-link="knowledge">{知识标题}</a></li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../writer/plan.html" data-rk-backlink="plan">设计方案</a>（待创建）</li>
  <li><a href="../tester/test-plan.html" data-rk-backlink="test-plan">测试计划</a>（待创建）</li>
</ul>

</body>
</html>
```

### 步骤 6：向 TeamLead 提交探索完成通知

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-explorer 自己的任务行
- 「状态」标记为 `done`
- 「产物」指向 `explorer/exploration-report.html`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-explorer`
- 探索中遇到的过程性问题（代码库缺关键信息、依赖不明、需求与现状冲突）在「问题闭环记录」记一行，「分类」选 `process` / `dependency` / `scope`
- 只修改「任务进度」/「问题闭环记录」，不要修改 TeamLead 控制面区块

```text
通知 TeamLead：
- explorer/exploration-report.html 已完成，路径：{路径}
- 建议下游角色：spec-writer、spec-tester
- 需要传递给下游的重点风险/边界：[简述]
```

## 与其他角色的协作

```
TeamLead → spec-explorer 开始
spec-explorer → exp-search（检索） + 代码探索 + 外部资源探索
spec-explorer → explorer/exploration-report.html
spec-explorer → TeamLead → spec-writer / spec-tester
```

## 后续动作

完成探索后确认：
1. `explorer/exploration-report.html` 已在正确路径创建
2. 探索新内容后已调用 exp-reflect 沉淀知识
3. 已更新 `lead/team-context.md` 的「任务进度」中自己的任务行，必要时补「问题闭环记录」
4. 已向 TeamLead 提交探索完成通知，并声明建议分发给 spec-writer 和 spec-tester
5. 下游 `writer/plan.html` / `tester/test-plan.html` 产出后，已回到本报告 `rk-backlinks` 去掉「待创建」标注，补齐反向关联

### 常见陷阱
- 调用 exp-search 后误触发 exp-reflect（不应触发）
- `explorer/exploration-report.html` 内容太简略，spec-writer 缺少背景信息
- 未在交接中声明 spec-tester，导致 TeamLead 未及时启动测试计划角色
- 只写了正向 `rk-links` 却漏了 `rk-backlinks`，下游报告产出后无法从探索报告发现引用方
- 只填了 `.rk-meta` 却漏了 `<head>` 的 `rk:*` meta（或反之），元信息双轨不完整
- 样式表相对路径层级算错，`file://` 直接打开时丢样式
