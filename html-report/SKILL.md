---
name: html-report
description: >
  当需要产出或修改 R&K Flow 的 Spec 报告（exploration-report / plan / test-plan /
  test-report / summary / debug / review / update / end-report）时使用。
  定义 HTML 报告的固定结构、固定样式和可追溯修订标记规范。
  典型信号：要写某个 Spec 阶段的报告、要修订已有报告、要让用户看清两版之间改了什么。
  不要用于记忆库文件（`spec/context/**/*.md`，保持 Markdown 供 `exp-search` 检索）。
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
| 停止 | 报告写完并在运行账本（`lead/team-context.md` 或 `.html`）登记产物路径 |
| 升级 | 需要改动已确认报告的结论时，先交 TeamLead 走门禁，不自行改写 |

## 边界：什么用 HTML，什么保持 Markdown

| 产物 | 格式 | 原因 |
|------|------|------|
| `spec/versions/<version>/plan.html` | HTML | 版本规划报告（大盘、目标、Spec清单与验收条件） |
| `spec/versions/<version>/releases/<tag>/release-report.html` | HTML | 版本发版报告（实际纳入Spec、全量测试证据与部署记录） |
| `spec/versions/<version>/end-report.html` | HTML | 版本复盘与归档报告（目标达成率、遗留风险与经验去向） |
| `explorer/exploration-report.html` | HTML | Spec 探索报告，人读 |
| `writer/plan.html` | HTML | Spec 方案报告，人读 + 反复修订 |
| `tester/test-plan.html`、`tester/test-report.html` | HTML | Spec 测试报告，重点突出 |
| `executor/summary.html` | HTML | Spec 实现总结报告 |
| `debugger/debug-*.html`、`debugger/debug-*-fix.html` | HTML | Spec 调试报告 |
| `reviewer/review.html`、`reviewer/update-*-review.html` | HTML | Spec 审查报告 |
| `updater/update-*.html`、`updater/update-*-summary.html` | HTML | Spec 更新报告 |
| `ender/end-report.html` | HTML | Spec 收尾报告 |
| `lead/team-context.md` / `lead/team-context.html` | 两者皆可 | 运行账本。用 HTML 时复用同一套样式与导航树，但**豁免修订标记**（不需 `data-rev` / `ins` / `del`）——账本是高频追写的运行流水，不是「定稿后修订」的报告，强制修订标记只会让它膨胀 |
| `spec/context/experience/*.md`、`knowledge/*.md` | **Markdown** | 记忆库，被 `exp-search` 检索，跨版本共享 |
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
     元数据分两轨：
     1) Spec 级报告必填：rk:type, rk:version, rk:category, rk:spec-dir, rk:role, rk:mode, rk:git-branch, rk:base-branch, rk:pr-url
     2) Version 级报告必填：rk:type, rk:version, rk:role, rk:created, rk:updated, rk:revision, rk:base-branch（豁免 spec-dir 与 category）
     导航树、检索与工具化处理靠这些 meta 读取，等同于原 YAML frontmatter。 -->
<meta name="rk:type"        content="{version-plan|release-report|version-end-report|plan|test-plan|test-report|summary|debug|debug-fix|review|update|update-summary|exploration-report|end-report}">
<meta name="rk:version"     content="{vX.Y，所属版本号}">
<meta name="rk:category"    content="{feat|tech|debt|fix；Spec 级必填，Version 级豁免}">
<meta name="rk:spec-dir"    content="{spec/versions/<v>/specs/<spec-dir>；Spec 级必填，Version 级豁免}">
<meta name="rk:role"        content="{spec-writer|spec-tester|TeamLead...}">
<meta name="rk:mode"        content="{gated|autopilot；Spec 级必填}">
<meta name="rk:created"     content="{YYYY-MM-DD}">
<meta name="rk:updated"     content="{YYYY-MM-DD}">
<meta name="rk:revision"    content="{N}">
<meta name="rk:git-branch"  content="{git_branch；Spec 级必填}">
<meta name="rk:base-branch" content="{base_branch；常规 Spec 为 dev，发版为 release/<v> 或 master}">
<meta name="rk:pr-url"      content="{pr_url，未创建留空}">
<meta name="rk:tags"        content="{spec,plan；逗号分隔，等价原 tags}">
<!-- 文档关联，等价原 frontmatter 的 plan: / update: / debug: 字段 -->
<link rel="rk-plan"   href="../writer/plan.html">
<link rel="rk-ledger" href="../lead/team-context.md">
<!-- 样式表与脚本相对路径：按报告实际所处的物理深度准确计算，禁止硬编码固定层数 -->
<link rel="stylesheet" href="../../../../../../html-report/assets/rk-report.css">
<script defer src="../rk-manifest.js"></script>
<script defer src="../../../../../../html-report/assets/rk-report.js"></script>
</head>
<body>

<nav class="rk-nav"></nav>

<header class="rk-head">
  <h1>{报告标题}</h1>
  <!-- 人可读镜像，字段与上方 meta 保持一致 -->
  <div class="rk-meta">
    <span><b>类型</b> {type}</span>
    <span><b>Spec</b> <code>{spec_dir}</code></span>
    <span><b>角色</b> {role}</span>
    <span><b>模式</b> {mode}</span>
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
  <li><a href="../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../reviewer/review.html" data-rk-backlink="review">审查报告</a></li>
</ul>

</body>
</html>
```

### 报告相对路径深度表（禁止硬编码单一常量）

由于三级架构引入了 `versions/<version>/` 与 `specs/` 目录，不同位置报告回到项目根目录的相对层级不同，必须严格对应：

| 报告类型与位置 | 相对项目根深度 | 引用 assets 相对路径 | 基准分支（base-branch）典型取值 |
|---|---|---|---|
| 版本级规划/归档报告（`spec/versions/<v>/plan.html`、`end-report.html`） | **3 层** | `../../../html-report/assets/` | 规划为 `dev`，归档为 `master` |
| 版本级发版交付报告（`spec/versions/<v>/releases/<tag>/release-report.html`） | **5 层** | `../../../../../html-report/assets/` | 发版提测分支 `release/<v>`（目标为 `master`） |
| 原子 Spec 各角色报告（`spec/versions/<v>/specs/<spec-dir>/<role>/*.html`） | **6 层** | `../../../../../../html-report/assets/` | 常规 Spec 统一为 `dev` |

务必保证在目标层级下 `file://` 本地直接打开报告时样式与脚本正常加载。

## 导航树（左侧文件树）

报告左侧渲染一列本 Spec 内的文档导航，可在同一 Spec 的各角色报告之间直接跳转。
渐进增强：清单缺失时导航区不渲染，正文阅读完全不受影响。

### 为什么不用 `fetch` 探测

`file://` 下 `fetch` 被浏览器安全策略直接拒绝——**同级已存在的文件也会返回 `Failed to fetch`**，
所以「逐个探测哪些报告存在」这条路在本地直开场景下走不通（已实测）。`<script src>` 不受这条限制，
因此改用声明式清单：Spec 目录根放一份 `rk-manifest.js`，各报告用 `<script src>` 载入。
### `rk-manifest.js` 结构

位置：`spec/versions/<version>/specs/<spec-dir>/rk-manifest.js`（Spec 目录根，与各角色目录同级）。

```js
window.RK_SPEC_TREE = {
  specDir: "spec/versions/<version>/specs/<spec-dir>",
  docs: [
    { role: "lead", path: "lead/team-context.html", title: "运行账本", type: "team-context" }
  ]
};
```

`path` 一律相对 Spec 目录根；报告位于角色目录内，渲染时前缀 `../` 即可。
`type` 与 `rk:type` 同一套枚举（账本用 `team-context`）。

各报告在 `<head>` 里加载，放在 `rk-report.js` **之前**（两者都 `defer`，按文档顺序执行）：

```html
<script defer src="../rk-manifest.js"></script>
```

### 维护责任与高亮

| 项 | 约定 |
|----|------|
| 谁更新 manifest | **TeamLead**，在新增报告落盘后统一更新——各角色并发写各自报告，manifest 单点维护才不会互相覆盖 |
| 当前页高亮 | 比对 `<meta name="rk:spec-dir">` 与自身路径，定位到 manifest 中对应条目，命中项加 `is-current` |
| manifest 缺失 | `window.RK_SPEC_TREE` 未定义时不渲染任何节点，`.rk-nav:empty` 使导航区隐藏，正文不受影响 |
| 窄屏 / 打印 | 由 `rk-report.css` 处理：≤900px 隐藏，打印 `display: none` |

渲染由共享脚本 `rk-report.js` 负责（读 `window.RK_SPEC_TREE`，按 `role` 分组写入 `.rk-nav`），
报告本身只放一个空的 `<nav class="rk-nav"></nav>` 挂载点，**不手写节点**。渲染结果的结构约定：

```html
<nav class="rk-nav">
  <div class="rk-nav-title">本 Spec 文档</div>
  <ul class="rk-nav-tree">
    <li class="rk-nav-group">
      <span class="rk-nav-role">lead</span>
      <ul>
        <li><a href="../lead/team-context.html">运行账本</a></li>
      </ul>
    </li>
    <li class="rk-nav-group">
      <span class="rk-nav-role">writer</span>
      <ul>
        <li><a href="../writer/plan.html" class="is-current">设计方案</a></li>
      </ul>
    </li>
  </ul>
</nav>
```

## 功能等价：原 Markdown 能力必须一一保留

换成 HTML 不等于砍功能。原模板的每项能力都要有等价物，**不允许只保留"看起来像"的部分**。

### frontmatter → `<meta name="rk:*">` + `.rk-meta`（双轨）

原 YAML frontmatter 有两个作用：机器可读（导航树、检索与工具化处理）和人可读。所以要双轨保留，缺一不可。

| 原 frontmatter 字段 | HTML 机器可读 | HTML 人可读 |
|---------------------|---------------|-------------|
| `type` | `<meta name="rk:type">` | `.rk-meta` 类型 |
| `mode`（账本 frontmatter） | `<meta name="rk:mode">` | `.rk-meta` 模式 |
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

**布局容器不要直接套语义类**：`.rk-kpis` 这类带 `display: grid` 的容器，不要把 `rk-added`/`rk-removed` 加在同一个元素上（`<div class="rk-kpis rk-added">`），语义类会覆盖容器的布局。要标记「新增了一组卡片」，用嵌套：

```html
<div class="rk-added" data-rev="2">
  <div class="rk-kpis">…</div>
</div>
```

共享样式对 `.rk-kpis.rk-added` 有兜底覆盖（恢复 grid、去块级装饰），但那是防误用，不是推荐写法。

### 表格行修订

```html
<tr><td><del class="rk-del" data-rev="3">旧值</del>
        <ins class="rk-ins" data-rev="3">新值</ins></td></tr>
```

**整行新增 / 删除**：改的是「新增一整行」或「删掉一整行」时，把 `rk-added` / `rk-removed` 加在 `<tr>` 上（`data-rev` 同本轮修订号）。共享样式已对 `<tr>` 单独覆盖：保持 `table-row` 布局、高亮落到单元格背景、不显示 `rN` 角标（第一列「修订」列已承载修订号）：

```html
<tr class="rk-added" data-rev="2"><td>r2</td><td>…</td><td>…</td></tr>
<tr class="rk-removed" data-rev="2"><td>旧行</td><td>…</td><td>…</td></tr>
```

**单元格内改值**：只改某行里的一个值，用上面 `<td>` 内的 `<del>` / `<ins>`。不要给 `<tr>` 套 `rk-added`/`rk-removed` 后又在单元格里塞 `<del>`/`<ins>`——二选一。

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

## 用户批注（人写，Agent 读）

用户可以直接在报告 HTML 里写批注，表达评审意见。这是**人写给 Agent** 的通道，与 Agent 自己的 `rk-cal` 区分开（橙色虚线框 + 「批注」角标）。
```html
<!-- 块级未处理批注：人写，整段意见 -->
<div class="rk-note">这个方案没考虑离线场景，补一下。</div>

<!-- 处理完成闭环 Callout：Agent 重写时插入，必须完整保留用户原文与决策 -->
<div class="rk-note is-done" data-note-id="NOTE-01" data-rk-heading="2. 核心方案" data-rk-quote="方案未考虑离线场景">
  <div class="rk-note-badge-bar">
    <span class="rk-note-badge-main">用户批注</span>
    <span class="rk-note-badge-status">NOTE-01 · 已决策</span>
  </div>
  <div class="rk-note-quote-box">
    「这个方案没考虑离线场景，补一下。」
  </div>
  <div class="rk-note-body">
    <b>采纳：补充离线持久化与断网重试队列。</b><br>
    引入 IndexedDB 本地暂存机制，并在网络恢复时触发批量补发，详见 §2.3 异常流。
  </div>
</div>

<!-- 行内批注：附在任意元素上，用于细粒度意见 -->
<td data-rk-note="这里的退出码应该是 1">exit 0</td>
```
**Agent 侧义务**（详见 `.agents/rules/spec-workflow.md`「报告批注」）：接手报告前必须全文搜 `rk-note`，把每条登记进账本「问题闭环记录」（分类 `review`，状态 `pending`）。漏读批注等同于漏读用户指令。

批注是短期沟通载体，Agent 重写报告时会被覆盖，不需要长期保留——但账本里的登记必须留下。所以批注**不受修订规范约束**，写批注不必加 `data-rev`。

## 禁止事项

- 禁止 Obsidian 专有语法：`[[wikilink]]`、`> [!note]` Callout、`#tag`、Bases、Canvas
- 禁止在报告 HTML 里写 `<style>` 或行内 `style=`（样式只在 `rk-report.css`，改样式即全局改版）
- 禁止外部 CDN / 网络字体（报告必须离线可读）
- 禁止直接覆盖已确认报告的结论而不留修订痕迹
- 禁止把记忆库文件（`spec/context/**/*.md`）改成 HTML——`exp-search` 依赖 Markdown 文本检索
- 禁止给账本补修订标记（`data-rev` / `ins` / `del`）：账本豁免修订规范

## 常见陷阱

- 改了内容但忘记递增修订号 → 用户无法分辨版本
- 加了 `ins`/`del` 但漏 `data-rev` → 视图切换和角标失效
- 修订历史表没追加行 → 有标记但说不清为什么改
- 账本相对路径多算一层（写成两级 `..`）→ 从角色目录出发上一级就是 Spec 目录，正确是 `../lead/team-context.md`
- 其它相对路径层数算错 → `file://` 打开丢样式
- 用 `<b>`/`<i>` 假冒修订标记 → 必须用 `ins`/`del` 语义标签
- 新增报告后忘记更新 `rk-manifest.js` → 导航树里看不到新文件（由 TeamLead 统一更新）
- 用 `fetch` 探测同级报告是否存在 → `file://` 下必然失败，只能读 `window.RK_SPEC_TREE`