---
name: html-report
description: >
  当需要产出或修改 R&K Flow 的 Spec 报告（exploration-report / plan / test-plan /
  test-report / summary / debug / review / update / end-report）时使用。
  定义 HTML 报告的固定结构、固定样式和可追溯修订标记规范。
  典型信号：要写某个 Spec 阶段的报告、要修订已有报告、要让用户看清两版之间改了什么。
  不要用于 lead/team-context.md（运行账本，保持 Markdown）或经验/知识记忆文件。
---

# HTML Report

R&K Flow 的**报告类产物统一用 HTML 承载**，不使用 Obsidian 及其专有格式。目标：
阅读体验好、重点突出、反复修改可追溯。

## 运行契约

| 项 | 内容 |
|----|------|
| 输入 | 报告类型、Spec 目录、本轮内容或修订点 |
| 权限 | 只写当前 Spec 目录下自己角色的 `*.html`；不改他人产物 |
| 验证 | 文件能在浏览器打开；修订标记带 `data-rev`；修订历史表有本轮行 |
| 停止 | 报告写完并在 `lead/team-context.md` 登记产物路径 |
| 升级 | 需要改动已确认报告的结论时，先交 TeamLead 走门禁，不自行改写 |

## 边界：什么用 HTML，什么保持 Markdown

| 产物 | 格式 | 原因 |
|------|------|------|
| `explorer/exploration-report.html` | HTML | 报告，人读 |
| `writer/plan.html` | HTML | 报告，人读 + 反复修订 |
| `tester/test-plan.html`、`tester/test-report.html` | HTML | 报告，重点突出 |
| `executor/summary.html` | HTML | 报告 |
| `debugger/debug-*.html`、`debugger/debug-*-fix.html` | HTML | 报告 |
| `reviewer/review.html`、`reviewer/update-*-review.html` | HTML | 报告 |
| `updater/update-*.html`、`updater/update-*-summary.html` | HTML | 报告 |
| `ender/end-report.html` | HTML | 报告 |
| `lead/team-context.md` | **Markdown** | 运行账本，被 hook 同步脚本解析 |
| `spec/context/experience/*.md`、`knowledge/*.md` | **Markdown** | 记忆库，被 `exp-search` 检索 |
| `tester/artifacts/test-logs/**` | 原始格式 | 测试运行自动产出的证据 |

## 固定骨架

每个报告都是独立可打开的 HTML 文件，`<link>` 引用共享样式：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>{报告标题} - {任务描述}</title>

<!-- 原 frontmatter 的机器可读等价物：字段一一对应，不可省略。
     hook 同步脚本与检索工具靠这些 meta 读取，等同于原 YAML frontmatter。 -->
<meta name="rk:type"        content="{plan|test-plan|test-report|summary|debug|debug-fix|review|update|update-summary|exploration-report|end-report}">
<meta name="rk:spec-dir"    content="{spec/<分类>/<YYYYMMDD-HHMM-任务描述>}">
<meta name="rk:role"        content="{spec-writer|spec-tester|...}">
<meta name="rk:created"     content="{YYYY-MM-DD}">
<meta name="rk:updated"     content="{YYYY-MM-DD}">
<meta name="rk:revision"    content="{N}">
<meta name="rk:git-branch"  content="{git_branch}">
<meta name="rk:base-branch" content="{base_branch}">
<meta name="rk:pr-url"      content="{pr_url，未创建留空}">
<meta name="rk:tags"        content="{spec,plan；逗号分隔，等价原 tags}">
<!-- 文档关联，等价原 frontmatter 的 plan: / update: / debug: 字段 -->
<link rel="rk-plan"   href="../writer/plan.html">
<link rel="rk-ledger" href="../../lead/team-context.md">

<link rel="stylesheet" href="../../../../html-report/assets/rk-report.css">
<script defer src="../../../../html-report/assets/rk-report.js"></script>
</head>
<body>

<header class="rk-head">
  <h1>{报告标题}</h1>
  <!-- 人可读镜像，字段与上方 meta 保持一致 -->
  <div class="rk-meta">
    <span><b>类型</b> {type}</span>
    <span><b>Spec</b> <code>{spec_dir}</code></span>
    <span><b>角色</b> {role}</span>
    <span><b>分支</b> <code>{git_branch}</code> ← <code>{base_branch}</code></span>
    <span><b>PR</b> {pr_url 或 —}</span>
    <span><b>创建</b> {created}</span>
    <span><b>修订</b> r{N}（{updated}）</span>
  </div>
</header>

<nav class="rk-revbar"></nav>

<section class="rk-verdict">
  <div class="rk-verdict-label">结论</div>
  <p>{一句话结论——最重要的信息放最前面}</p>
</section>

<h2>修订历史</h2>
<table class="rk-revs">
  <thead><tr><th>修订</th><th>日期</th><th>修改人</th><th>改了什么</th><th>原因</th></tr></thead>
  <tbody>
    <tr><td>r1</td><td>{日期}</td><td>{角色}</td><td>初版</td><td>—</td></tr>
  </tbody>
</table>

<!-- 正文章节 -->

<!-- 关联产物：双向。等价 Obsidian 双链的正向跳转 + 反向可发现。 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../writer/plan.html" data-rk-link="plan">设计方案</a></li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../reviewer/review.html" data-rk-backlink="review">审查报告</a></li>
</ul>

</body>
</html>
```

`../../../../html-report/assets/` 是从 `spec/<分类>/<spec目录>/<角色>/` 回到项目根的相对路径（4 层）。
项目实际层级不同就相应调整，务必保证 `file://` 直接打开样式生效。

## 功能等价：原 Markdown 能力必须一一保留

换成 HTML 不等于砍功能。原模板的每项能力都要有等价物，**不允许只保留"看起来像"的部分**。

### frontmatter → `<meta name="rk:*">` + `.rk-meta`（双轨）

原 YAML frontmatter 有两个作用：机器可读（hook 同步脚本、检索）和人可读。所以要双轨保留，缺一不可。

| 原 frontmatter 字段 | HTML 机器可读 | HTML 人可读 |
|---------------------|---------------|-------------|
| `type` | `<meta name="rk:type">` | `.rk-meta` 类型 |
| `created` | `<meta name="rk:created">` | `.rk-meta` 创建 |
| `git_branch` | `<meta name="rk:git-branch">` | `.rk-meta` 分支 |
| `base_branch` | `<meta name="rk:base-branch">` | `.rk-meta` 分支（← 基准） |
| `pr_url` | `<meta name="rk:pr-url">` | `.rk-meta` PR |
| `tags` | `<meta name="rk:tags">` | 不必显示 |
| `plan: "[[../writer/plan\|plan]]"` | `<link rel="rk-plan" href="../writer/plan.html">` | 关联产物列表 |
| `debug: "[[debug-001\|debug-001]]"` | `<link rel="rk-debug" href="debug-001.html">` | 关联产物列表 |
| `update: "[[update-XXX]]"` | `<link rel="rk-update" href="update-XXX.html">` | 关联产物列表 |

规则：原模板有几个 frontmatter 字段，HTML 就要有几个对应的 `<meta>` / `<link>`。**禁止因为"HTML 里看不见"就删字段。**

### 双链 → 双向关联（正向 + 反向都要）

Obsidian 双链的价值不只是跳转，而是**反向可发现**（打开 plan 能看到谁引用了它）。单向 `<a href>` 会丢掉这一半，属于功能退化。等价做法：

| 双链能力 | HTML 等价 |
|----------|-----------|
| 正向跳转 | `<ul class="rk-links">` + `<a href="..." data-rk-link="{类型}">` |
| 反向发现 | `<ul class="rk-backlinks">` + `<a href="..." data-rk-backlink="{类型}">` |
| 关系可查询 | `data-rk-link` / `data-rk-backlink` 属性可被脚本提取，等价双链图谱 |
| 头部关联声明 | `<link rel="rk-*" href="...">` |

规则：报告 A 引用 B 时，**A 的 `rk-links` 加一条，同时 B 的 `rk-backlinks` 补一条**。谁新建关联谁负责补对侧；若对侧报告尚未创建，在自己的 `rk-links` 里标注 `（待创建）`，等对侧产出时补齐反链。

### Callout → `rk-cal`（语义不丢）

| Obsidian | HTML |
|----------|------|
| `> [!important]` / `[!note]` 关键决策 | `<div class="rk-cal key">` |
| `> [!warning]` 注意 | `<div class="rk-cal warn">` |
| `> [!failure]` / 风险 | `<div class="rk-cal risk">` |
| `> [!success]` / `[!tip]` 通过 | `<div class="rk-cal ok">` |

### 其它

| 原能力 | HTML 等价 |
|--------|-----------|
| `#spec/能力交付` 标签 | `<meta name="rk:tags">`，不在正文堆标签 |
| 代码位置引用 | `<span class="rk-ref">src/x.ts:88</span>` |
| 表格、代码块、列表 | 原生 HTML，样式由 `rk-report.css` 统一 |

## 修订规范（核心）

**铁律：修改报告时永不静默改写。原文保留并标记，新内容标记新增。**

每轮修改：
1. 修订号 `+1`（r1 → r2），更新报告头 `修订` 字段
2. 在「修订历史」表**追加一行**，写清改了什么、为什么
3. 正文用语义标签标记，每个标记都带 `data-rev="{本轮修订号}"`

### 行内修订

```html
超时设为 <del class="rk-del" data-rev="2">30s</del>
         <ins class="rk-ins" data-rev="2">10s</ins>
```

### 块级修订

```html
<p class="rk-removed" data-rev="2">删掉的整段旧方案。</p>
<p class="rk-added" data-rev="2">新增的整段新方案。</p>
```

### 表格行修订

```html
<tr><td><del class="rk-del" data-rev="3">旧值</del>
        <ins class="rk-ins" data-rev="3">新值</ins></td></tr>
```

### 三视图

`rk-report.js` 自动在 `.rk-revbar` 渲染切换按钮，无需手写：

| 视图 | 作用 |
|------|------|
| 全部修订 | 所有 `ins`/`del` 全部高亮，带 `rN` 角标——看全部演进 |
| 仅最新修订 | 只高亮最新一轮，旧修订降为正文——看本次改了什么 |
| 终稿 | 隐藏 `del`、`ins` 去高亮——当作干净最终版阅读 |

### 与 Decision Log 联动

`lead/team-context.md` 的 `Decision Log`（v2.6.0 起）记录**决策**（选项 / 结论 / 理由，编号 `D-001`），
报告修订历史记录**文本变更**（哪句改成了什么）。两者互补，必须能互相追溯：

- 修订源于一次实质取舍时，修订历史表的「原因」列写上决策编号，例如：`按 D-003 改用抽公共层方案`
- 纯笔误、措辞、补充说明等非决策性修改，「原因」列直接写清即可，不必编造决策编号
- 决策本身仍记在账本的 `Decision Log`，**不要**把决策过程正文复制进报告

```html
<tr><td>r3</td><td>2026-06-26</td><td>spec-writer</td>
    <td>缓存层从进程内改为 Redis</td>
    <td>按 <code>D-003</code>（多实例部署需共享缓存）</td></tr>
```

## 突出重点的组件

```html
<!-- 结论块：is-pass 绿 / is-fail 红 / 默认蓝 -->
<section class="rk-verdict is-pass">
  <div class="rk-verdict-label">测试结论</div>
  <p>42 项用例全部通过。</p>
</section>

<!-- 指标卡 -->
<div class="rk-kpis">
  <div class="rk-kpi is-pass"><div class="v">42</div><div class="k">通过</div></div>
  <div class="rk-kpi is-fail"><div class="v">1</div><div class="k">失败</div></div>
</div>

<!-- Callout：key 关键决策 / warn 注意 / risk 风险 / ok 通过 -->
<div class="rk-cal key"><div class="t">关键决策</div><p>选 A 方案，因为 B 会引入循环依赖。</p></div>
<div class="rk-cal risk"><div class="t">风险</div><p>并发写入未加锁。</p></div>

<!-- 代码位置引用 -->
<span class="rk-ref">src/auth/token.ts:88</span>
```

## 禁止事项

- 禁止 Obsidian 专有语法：`[[wikilink]]`、`> [!note]` Callout、`#tag`、Bases、Canvas
- 禁止在报告 HTML 里写 `<style>` 或行内 `style=`（样式只在 `rk-report.css`，改样式即全局改版）
- 禁止外部 CDN / 网络字体（报告必须离线可读）
- 禁止直接覆盖已确认报告的结论而不留修订痕迹
- 禁止把 `lead/team-context.md` 或记忆文件改成 HTML

## 常见陷阱

- 改了内容但忘记递增修订号 → 用户无法分辨版本
- 加了 `ins`/`del` 但漏 `data-rev` → 视图切换和角标失效
- 修订历史表没追加行 → 有标记但说不清为什么改
- 相对路径层数算错 → `file://` 打开丢样式
- 用 `<b>`/`<i>` 假冒修订标记 → 必须用 `ins`/`del` 语义标签
