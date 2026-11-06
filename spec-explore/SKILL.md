---
disable-model-invocation: false
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

### 步骤 1：接收任务并获取 AWR 聚焦上下文

从 TeamLead 的启动指令中获取任务描述、范围与 Spec 目录。开工前先通过辅助脚本完成首发会话启动与独占租约锁定，再准备聚焦上下文：

```bash
# 首发角色自动启动会话并认领独占租约
AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
bash "$AWR_CP" --work <SPEC-ID> --agent spec-explorer --digest "启动背景探索" --next-action "探索代码库与可行性分析"
# 使用上一步输出中的 Session ID 准备聚焦上下文（若提示超预算可追加 --budget <N>）
awr work prepare <SPEC-ID> --session <SESSION-ID> --response-view summary
```
从 AWR 准备输出中提取当前目标、已知约束、未完成事项与相关源文件指针（若提示超预算可追加 `--budget <N>`）；若 AWR 未就绪或报错，则按 `lead/team-context.md` 与项目落盘文档作为权威来源继续，不阻塞探索流程。
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
- **必需图**（机检强制）：探索报告要有 **2 张图**，都放在结论块之后——
  1. `figure.rk-fig` 结构图：现状模块与调用链，改动用 `c-blue`，风险点用 `c-red`；
  2. `ol.rk-flow` 问题状态图：每个 Q 一个节点，`is-done` 已决 / `is-warn` 部分 / `is-blocked` 待决，节点里带依据编号。
  首屏再配 `rk-kpis` 四个数（证据项 / 已知风险 / 待决问题 / 可开工）。
- **文字预算**：正文按语义分段，建议全篇叙述文字 ≤ 6000 字；按内容需要配图，不按字数凑图，也不为压缩篇幅删减证据或边界。
- **形态对应**：关系用图（结构图）、顺序用图（flow）、罗列一律用表（经验 / 改动点 / 度量 / 断言 / 风险 / 建议清单），判断用一句话（结论块、每节首句、`rk-cal key`）。枚举类内容（码值、校验规则、文案映射）**只能进表，不画图**。
- **每节写法**：先一句结论，再表格或图；E 类度量节文字 ≤ 300 字，其余进表。
- **已知风险固定 6 列表格**（编号 / 现象 / 触发 / 要求 / 验收 / 等级），等级用 `rk-tag is-fail|is-warn`；阻塞项在结构图上用 `c-red` 标位置，不在正文重复描述。
- **可判定验收断言单独成表**（断言 / 判定方式 / 预期），供 test-plan 直接引用。
- 写完按 html-report「结构机检」一节的命令运行 `check-report.js`，退出码为 0 才算完成
- 修订历史表保持 5 列（修订/日期/修改人/改了什么/原因），不新增列；「原因」列源于实质取舍时引用账本「决策记录」的决策编号（如 `按 D-002（…）`），纯笔误/措辞/补充说明直接写清，不编造编号；决策过程正文留在 `lead/team-context.md` 的「决策记录」，不复制进报告

### 审核关注点（作者自检与 Reviewer 都按这张表看）

报告篇幅再短，也必须让审核者能在这四处做出判定。审查看的是判定依据，不是文笔。

| 关注点 | 看哪里 | 合格标准 | 不合格信号 |
|--------|--------|----------|-----------|
| 事实还是推断 | 改动点清单的「依据」列、E 表「口径/出处」 | 每条结论都能追到 `rk-ref` 行号、命令输出或 E 编号 | 只有结论没有出处；推断未标 |
| 缺口完整性 | 结构图的 `c-blue` 与 `c-red`、风险表 | 每个改动点的上下游都有对应风险行；连带影响写在表里 | 图上的改动点与风险表编号对不上 |
| 可判定性 | 验收断言表 | 每条断言能用命令或 DOM 断言判真假，带具体预期值 | 出现「表现正常」「体验良好」这类不可判定的表述 |
| 范围诚实 | 建议的 flow 与模块表 | Spec 范围被拆到可独立交付；接口细节留给 plan 定 | 把实现细节提前定死，或范围大到无法一次交付 |
| 待决项 | 问题状态图 | 每个 Q 有结论或明确挂起；挂起项写明谁能定、阻塞什么 | 有 Q 没有结论，也没说是谁阻塞 |

审核动作：先看首屏三块（结论、指标卡、结构图），再扫一遍风险表和问题状态图；只有需要核实时才读正文段落。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>探索报告 - {任务描述}</title>

<meta name="rk:type"        content="exploration-report">
<meta name="rk:version"     content="{vX.Y，所属版本号}">
<meta name="rk:category"    content="{feat|tech|debt|fix}">
<meta name="rk:spec-dir"    content="spec/versions/{version}/specs/{YYYYMMDD-HHMM-属性-任务描述}">
<meta name="rk:role"        content="spec-explorer">
<meta name="rk:mode"        content="{gated|autopilot}">
<meta name="rk:created"     content="{YYYY-MM-DD}">
<meta name="rk:updated"     content="{YYYY-MM-DD}">
<meta name="rk:revision"    content="1">
<meta name="rk:git-branch"  content="{git_branch}">
<meta name="rk:base-branch" content="{base_branch}">
<meta name="rk:pr-url"      content="{pr_url，未创建留空}">
<meta name="rk:tags"        content="spec,exploration">
<link rel="rk-ledger" href="../lead/team-context.md">
<link rel="rk-plan"   href="../writer/plan.html">

<link rel="stylesheet" href="../../../../../../html-report/assets/rk-report.css">
<script defer src="../rk-manifest.js"></script>
<script defer src="../../../../../../html-report/assets/rk-report.js"></script>
</head>
<body>

<nav class="rk-nav"></nav>

<header class="rk-head">
  <h1>探索报告：{任务描述}</h1>
  <div class="rk-meta">
    <span><b>类型</b> exploration-report</span>
    <span><b>版本</b> <code>{version}</code></span>
    <span><b>属性</b> <code>{category}</code></span>
    <span><b>Spec</b> <code>spec/versions/{version}/specs/{spec_dir}</code></span>
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

<!-- 首屏：四个数说清取证规模，一张图说清改哪里、风险在哪 -->
<div class="rk-kpis">
  <div class="rk-kpi"><div class="k">证据项</div><div class="v">{E-01…E-n}</div></div>
  <div class="rk-kpi is-warn"><div class="k">已知风险</div><div class="v">{n}</div></div>
  <div class="rk-kpi"><div class="k">待决问题</div><div class="v">{n}</div></div>
  <div class="rk-kpi is-pass"><div class="k">可开工</div><div class="v">{是/否}</div><div class="n">{一句话条件}</div></div>
</div>

<figure class="rk-fig">
  <svg viewBox="0 0 560 120" role="img" aria-label="{一句话说明：现状结构或调用链，标出要改的位置与风险点}">
    <defs><marker id="ah1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path class="arrow" d="M0 0 L8 4 L0 8 z"/></marker></defs>
    <rect class="node" x="10" y="34" width="140" height="44" rx="8"/>
    <text x="80" y="60" text-anchor="middle">{现状模块 A}</text>
    <path class="edge" d="M150 56 H208" marker-end="url(#ah1)"/>
    <rect class="c-blue" x="210" y="34" width="140" height="44" rx="8"/>
    <text x="280" y="60" text-anchor="middle">{要改的位置}</text>
    <path class="edge" d="M350 56 H408" marker-end="url(#ah1)"/>
    <rect class="node" x="410" y="34" width="140" height="44" rx="8"/>
    <text x="480" y="60" text-anchor="middle">{下游模块 B}</text>
    <rect class="c-red" x="210" y="88" width="140" height="26" rx="6"/>
    <text class="lbl" x="280" y="105" text-anchor="middle">{风险点}</text>
  </svg>
  <figcaption>{图 1：现状调用链——c-blue 为本次要改的位置，c-red 为风险点；编号对应下方 R-xx 表}</figcaption>
</figure>

<!-- 问题状态图：每个 Q 一个节点，状态色即结论。已决 is-done / 待决 is-blocked / 部分结论 is-warn -->
<ol class="rk-flow">
  <li class="is-done"><b>Q-001</b><span>{结论，8 字内}｜依据 E-03 / D-002</span></li>
  <li class="is-blocked"><b>Q-002</b><span>{卡在哪、谁能定}</span></li>
  <li class="is-warn"><b>Q-003</b><span>{已有部分结论 + 剩余待定}</span></li>
</ol>

<h2>修订历史</h2>
<table class="rk-revs">
  <thead><tr><th>修订</th><th>日期</th><th>修改人</th><th>改了什么</th><th>原因</th></tr></thead>
  <tbody>
    <tr><td>r1</td><td>{YYYY-MM-DD}</td><td>spec-explorer</td><td>初版</td><td>—</td></tr>
    <tr><td>r2</td><td>{YYYY-MM-DD}</td><td>spec-explorer</td><td>{哪句改成了什么}</td><td>按 <code>D-002</code>（{一句话决策摘要}）／或直接写清非决策性原因</td></tr>
  </tbody>
</table>

<h2>检索到的历史经验</h2>
<table>
  <thead><tr><th>经验</th><th>适用的部分</th><th>与本 Spec 的差异</th></tr></thead>
  <tbody>
    <tr><td>{exp-search 命中的经验标题}</td><td>{适用到哪个模块}</td><td>{为什么不能直接照搬}</td></tr>
  </tbody>
</table>

<h2>改动点清单</h2>
<p>{一句结论：本次要动 N 处，其中 M 处有连带影响}；位置见图 1。</p>
<table>
  <thead><tr><th>位置</th><th>现状</th><th>要改成什么</th><th>连带影响</th><th>依据</th></tr></thead>
  <tbody>
    <tr><td><span class="rk-ref">src/xxx/yyy.ts:120</span></td><td>{现状一句话}</td><td>{目标一句话}</td><td>{会连带哪里}</td><td>{E-02 或实测}</td></tr>
  </tbody>
</table>

<h2>E-01 {度量主题}</h2>
<p>{一句结论：量到了什么、决定了哪条实现口径}</p>
<table>
  <thead><tr><th>项</th><th>实测值</th><th>口径 / 出处</th></tr></thead>
  <tbody>
    <tr><td>{测得的东西}</td><td class="num">{数值}</td><td>{怎么量的}</td></tr>
  </tbody>
</table>
<h3>可判定验收断言（test-plan 可直接引用）</h3>
<table>
  <thead><tr><th>断言</th><th>判定方式</th><th>预期</th></tr></thead>
  <tbody>
    <tr><td>{能直接判真假的一句话}</td><td>{命令 / DOM 断言}</td><td>{具体值}</td></tr>
  </tbody>
</table>

<h2>对外部知识的结论</h2>
<p>{结论一句话}；来源：{链接或文档名}。只写影响实现口径的结论，不复述原文。</p>

<h2>对 Spec 创建的建议</h2>
<!-- 顺序用 flow，清单用表；文字只写取舍理由 -->
<ol class="rk-flow">
  <li><b>{第 1 步}</b><span>{交付物}</span></li>
  <li><b>{第 2 步}</b><span>{交付物}</span></li>
  <li><b>{第 3 步}</b><span>{交付物}</span></li>
</ol>
<table>
  <thead><tr><th>模块 / 文件</th><th>职责</th><th>复用来源</th></tr></thead>
  <tbody>
    <tr><td>{新文件或改动文件}</td><td>{一句话职责}</td><td>{既有组件或新写}</td></tr>
  </tbody>
</table>

<div class="rk-cal key"><div class="t">关键决策</div><p>{建议下游采纳的方向及理由}（≤ 100 字）</p></div>

<h2>已知风险与边界情况</h2>
<p>{一句总述：共 N 条，其中 {等级} 会阻塞开工}；风险在结构上的位置见图 1 的 <code>c-red</code>。</p>
<table>
  <thead><tr><th>编号</th><th>现象</th><th>触发</th><th>要求</th><th>验收</th><th>等级</th></tr></thead>
  <tbody>
    <tr><td>R-01</td><td>{现象一句话}</td><td>{什么操作会触发}</td><td>{必须做到什么}</td><td>{怎么判定}</td><td><span class="rk-tag is-fail">阻塞</span></td></tr>
    <tr><td>R-02</td><td>{…}</td><td>{…}</td><td>{…}</td><td>{…}</td><td><span class="rk-tag is-warn">需覆盖</span></td></tr>
  </tbody>
</table>
<div class="rk-cal warn"><div class="t">需要 spec-tester 特别覆盖</div><p>{只列测试要专门覆盖的边界}（≤ 100 字）</p></div>

<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../../../context/experience/{经验文件}.md" data-rk-link="experience">{经验标题}</a></li>
  <li><a href="../../../context/knowledge/{知识文件}.md" data-rk-link="knowledge">{知识标题}</a></li>
  <li><a href="../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../writer/plan.html" data-rk-backlink="plan">设计方案</a>（待创建）</li>
  <li><a href="../tester/test-plan.html" data-rk-backlink="test-plan">测试计划</a>（待创建）</li>
</ul>

</body>
</html>
```

### 步骤 6：更新运行账本与向 TeamLead 提交通知

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-explorer 自己的任务行
- 「状态」标记为 `done`
- 「产物」指向 `explorer/exploration-report.html`

### 步骤 7：沉淀 AWR 会话检查点（Session Checkpoint）

更新账本后，向 AWR 提交本阶段会话检查点：

```bash
AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
bash "$AWR_CP" --work <SPEC-ID> --agent spec-explorer --digest "spec-explorer: 完成背景探索与可行性分析，产出 exploration-report.html" --next-action "spec-writer: 撰写设计方案 writer/plan.html"
```

记录探索阶段的关键发现、识别的风险项、下游 spec-writer 与 spec-tester 的输入指针。
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
