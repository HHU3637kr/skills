---
disable-model-invocation: false
name: spec-test
description: 当角色 spec-tester 需要为 Spec 撰写 tester/test-plan.html、在实现完成后执行测试并产出 tester/test-report.html，或在 spec-debugger 修复后重新验证时使用。若测试对象属于 Web 前端、端侧应用、API、CLI 等具体场景，先选择对应 references 测试策略。也用于核对用例与证据是否真跑过：校验测试是否在当前工作树实际运行、证据是否由测试运行自动生成（禁止事后手写补写）、识别假测试假绿与测试有效性、评估 spec-executor 的单元测试质量。不要用于普通代码实现、bug 修复，或审查实现是否符合 Spec（后者归 spec-review）。
---

# Spec Test

## 运行契约

> 进入核心原则前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | `explorer/exploration-report.html`、`writer/plan.html`、`executor/summary.html`、命中的场景测试策略、`html-report` skill 的报告契约 |
| 权限 | 写 `tester/test-plan.html` / `tester/test-report.html`、采集 `tester/artifacts/` 证据、可调整测试脚本/配置，但 `spec-executor` 拥有的单元/聚焦测试文件只读不改；发现其测试无效时记入测试报告的质量评估，交回 TeamLead，不直接改写；不直接修复 bug、不改业务实现 |
| 验证 | 验收标准具体可判定、关键路径有可审计证据、证据由测试运行自动生成且已脱敏、报告 HTML 符合 `html-report` 规范。**最终测试结论必须基于本轮在当前工作树上的实际运行**，不得引用上一轮的测试结果，也不得引用 `spec-executor` 的自测结论 |
| 停止 | 测试计划/报告定稿且「已确认」即停止：`gated` 模式下用当前运行环境的确认方式向用户确认 `tester/test-report.html`；`autopilot` 模式下由「`spec-reviewer` 强制介入并产出 `reviewer/review.html`」替代该确认——自动驾驶下 reviewer 是唯一独立视角，因此不再可选。修复循环受「修复循环预算」约束，触发 「最大轮数」 或 「最大无进展轮数」 时停止发起新一轮 handoff |
| 升级 | 发现 bug 时向 TeamLead 提交 handoff（不自行修复）；修复循环触上限或证据无法采集时，交回 TeamLead 由用户决策 |
| 参考 | 评估 `spec-executor` 的单元测试质量 → 必读 `../spec-execute/references/tdd-discipline.md`（含测试有效性门函数与假测试形态，是评估依据） |

## 核心原则

1. **两个阶段，两个产出**：Spec 创建阶段 → `tester/test-plan.html`；测试执行阶段 → `tester/test-report.html`
2. **不直接修复 bug**：发现 bug 时向 TeamLead 提交 bug handoff，由 TeamLead 启动 spec-debugger
3. **通过 TeamLead 与 spec-writer 协作**：Spec 阶段需讨论接口边界和异常情况，确保测试覆盖完整
4. **关键路径可观测**：测试必须验证系统关键路径有日志、trace id、事件或其他可审计证据
5. **证据归属 tester**：端侧测试和关键路径测试的审计日志必须保存在当前 Spec 目录的 `tester/artifacts/test-logs/<run-id>/`（原始格式，不转 HTML）
6. **证据必须自动采集**：`tester/artifacts/test-logs/<run-id>/` 下的日志、JSON、trace、录屏和截图必须由测试脚本、浏览器自动化、服务日志采集或命令输出生成；Agent 不得手写、补写或伪造这些证据文件内容。同一规则同样适用于 `executor/artifacts/`：评估 `spec-executor` 的测试质量时以 `executor/artifacts/` 里的实际运行输出为准，不以 `executor/summary.html` 的自然语言描述为准
7. **策略按场景加载**：不同开发场景的测试策略沉淀在 `references/`，命中场景时先读取对应策略
8. **策略在 spec-test 内沉淀**：测试过程中发现跨项目可复用的测试方法时，更新本 Skill 的 `references/` 和策略表；不要写入当前项目的 `AGENTS.md` 或 `.agents/rules/`
9. **修复循环受预算约束**：重验属于 spec-tester ↔ spec-debugger 修复循环的一环，受 `lead/team-context.md` 的「修复循环预算」约束。每轮重验后更新「修复循环预算」进展信号；触发 「最大轮数」 或 「最大无进展轮数」 时停止发起新一轮 handoff，转为通知 TeamLead 升级给用户。

## 测试策略库

根据当前 Spec 的技术栈和交付形态选择测试策略。只读取命中的策略文件，避免把无关测试细节塞进上下文。

| 场景 | 何时读取 | 策略文件 |
|------|----------|----------|
| Web 端侧 E2E | 涉及 Web 页面、用户路径、浏览器交互、前端控制台、网络请求、后端日志联动验证 | [references/web-e2e-testing.md](references/web-e2e-testing.md) |

新增策略时放入 `spec-test/references/<场景>-testing.md`，并在上表补一行。策略文件只写长期可复用的测试方法，不写某个项目的一次性细节。

### 策略撰写标准

新增或修改 `references/*-testing.md` 时必须遵守：

1. **文件命名**：`<场景>-testing.md`，英文小写短横线，如 `web-e2e-testing.md`
2. **开头先写路由条件**：第一节必须是 `## 何时使用`，说明什么时候读这个策略、什么时候不要读
3. **必须给 test-plan 要求**：明确该策略要求 `tester/test-plan.html` 增补哪些章节、表格或字段
4. **必须给执行流程**：按可操作步骤描述如何执行测试，包含环境、数据、工具、日志和失败处理
5. **必须给 test-report 要求**：明确 `tester/test-report.html` 中如何呈现证据、结论和失败信息
6. **必须给证据与脱敏规则**：说明证据保存路径、日志类型、截图/trace/录屏要求，以及不能保存的敏感信息
7. **必须给证据生成规则**：明确证据文件只能由测试运行自动生成，禁止 Agent 事后手写日志、JSON 或 trace
8. **必须给常见陷阱**：列出该场景最容易漏掉或误判的点
9. **禁止写项目一次性细节**：具体账号、真实 URL、业务私有数据、临时 workaround 不写入策略文件

推荐结构：

```markdown
# 场景名测试策略

## 何时使用
## tester/test-plan.html 必须补充
## 执行流程
## tester/test-report.html 必须补充
## 证据与脱敏
## 常见陷阱
```

### 策略沉淀时机

策略沉淀发生在 `spec-test` 内部，不等到 Spec 收尾阶段。

在完成测试执行并产出 `tester/test-report.html` 后，必须做一次轻量判断：

| 判断问题 | 是 | 否 |
|----------|----|----|
| 本次是否形成了某类开发场景可复用的测试方法？ | 新增或更新 `references/*-testing.md` | 不沉淀 |
| 本次是否补齐了现有策略缺失的证据、日志、断言或失败处理要求？ | 更新对应策略文件 | 只保留在 `tester/test-report.html` |
| 本次经验是否跨项目有效，而不是当前项目的一次性约束？ | 可进入策略库 | 留在当前 Spec 文档或项目规则中 |

需要沉淀时：
1. 先向用户说明拟新增或修改的策略文件
2. 得到确认后编辑 `spec-test/references/<场景>-testing.md`
3. 如果是新增策略，同步更新上方「测试策略库」表格
4. 只写长期可复用的测试方法，不写当前项目的账号、URL、业务私有规则或临时 workaround

## 阶段一：撰写测试计划（Spec 创建阶段）

### 步骤 1：读取探索报告

读取当前 Spec 目录下的 `explorer/exploration-report.html`，了解：
- 现有代码结构和接口
- 历史经验和已知的边界情况
- 外部依赖和限制条件

### 步骤 2：通过 TeamLead 与 spec-writer 协作讨论

通过 TeamLead 中转，与 spec-writer 讨论：
- 接口设计（参数类型、返回值、异常情况）
- 验收边界（何时算通过、何时算失败）
- 边界条件（空值、极端输入、并发场景）
- 关键路径日志点（状态流转、权限边界、数据写入、异步任务、外部 API、错误恢复）
- 端侧审计证据（控制台日志、网络摘要、截图/录屏、设备/浏览器/App 版本）
- 命中的场景测试策略（如 Web 端侧 E2E 的用户使用场景、浏览器自动化、前后端日志联动）

### 步骤 2.1：推荐并确认测试方式

在编写测试计划时，根据探索报告、变更范围、项目现有测试、运行环境和验收风险提出建议；通过 TeamLead 向用户说明**适用场景、推荐理由、覆盖范围、耗时/模型成本、数据出境与依赖限制**，由用户选择。用户已对本 Spec 的同一范围明确选过方式时沿用，不重复询问；选择记录在测试计划和账本，变更范围或可用条件发生实质变化时重新确认。

涉及 Web 用户路径时至少提供以下可执行选择；以下是 **Web E2E 的执行方式**，不是替代单元、API、安全及其他验收测试的开关：

| 选项 | 适用与取舍 |
|---|---|
| 项目现有 / 常规浏览器自动化 | 有成熟的 Playwright、Cypress 等测试或需要稳定、精确的回归；优先复用现有测试，没有框架时使用运行环境已有浏览器能力。 |
| agent-qa 辅助 | Web 用户旅程复杂、需要辅助探索和可视化证据，且模型、费用与数据处理条件允许；模型判断需独立复核，不替代必需的确定性断言与其他测试。 |
| 组合使用 | 关键路径需要稳定回归，同时希望 agent-qa 补充界面探索；两者分配各自用例，代价是更高耗时与可能的模型费用。 |

推荐按事实选择：现有自动化已覆盖、敏感数据不允许发送模型或环境缺少 agent-qa 时，推荐常规方式；路径复杂且条件满足时可推荐辅助或组合。版本、凭据、环境、费用或证据能力尚未确认时明确标「待核实」，不得当成已就绪。纯 API、CLI 等不涉及 Web 的任务不把 agent-qa 当成适用选项；按现有场景策略向用户说明实际可用的测试方式和推荐，只有一个可行方式时说明原因。

无论 `gated` 还是 `autopilot`，用户尚未选择时都通过 TeamLead 提请选择；在结果明确前可以写明未决项并完成其他准备，但不得执行需要该决策的测试或把推荐当作用户确认。遇到用户选定方式不可用，不静默安装、切换或降低覆盖：报告原因和替代方案，取得用户同意后更新计划，再继续。其他不依赖该选择的必要测试可按已确认范围进行。

### 步骤 3：撰写 tester/test-plan.html

撰写前先读 `html-report` skill（骨架、frontmatter 双轨等价字段、双向关联、修订标记与 Decision Log 联动规范）。在当前 Spec 目录下创建 `tester/test-plan.html`：

- **首屏决策结构**：`rk-verdict` 一句话写清通过与不通过的条件，紧跟适用的计划分布图或阶段流程。指标卡仅放已有的计划口径数字，如用例数或优先级分布；不得把覆盖率、通过率、失败数等尚未运行的结果冒充实测。
- **图按内容选型**（机检要求 kpis / chart / flow 三者之一，是下限而非目标）：
  - 关系与追溯链（需求 → 验收标准 → 用例 → 证据）用 `figure.rk-fig` 内联 SVG，断链处用 `c-red` 标出；
  - 先后顺序（准入 → 冒烟 → 边界 → 证据 → 判定）或测试阶段用 `rk-flow`；
  - 用例按类型/优先级/模块的**计划分布**用 `rk-kpis` 或 `rk-chart`；
  - 枚举与精确契约（输入、预期、边界、证据路径、准入条件）用表格或 `<pre><code>`，不要画成图。
- **何时不画图**：内容只是并列枚举、精确字段或长证据清单时，画图只会丢信息——用表格。没有真实关系、对比或顺序时宁可不画；**不得为凑图文比新增无信息量的图，也不得为了图面简洁裁剪用例、边界或证据**。
- **篇幅**：单个段落建议只表达一个要点；证据与长清单可用表格、`<pre><code>` 或证据目录清单承载，不截断证据。图文比及段落长度不设机检硬限制。
- **写清四件事**：需求→用例→证据的追溯矩阵、测试环境与数据、边界与异常矩阵、准入条件与未验证风险。无法验证的项必须显式登记为未验证风险，不得默认通过。
- **开发者审核关注点**：单独成节，按实际适用范围列判定口径、数据可复现性、边界可注入性及日志/trace 证据；未确认项记录影响并按既有门禁处理。
- 写完按 html-report「结构机检」一节的命令运行 `check-report.js`，退出码为 0 才算完成；机检不通过时补结构或拆表格，不删证据。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>测试计划 - {任务描述}</title>

<!-- 原 frontmatter 的机器可读等价物，字段一一对应，不可省略 -->
<meta name="rk:title"       content="测试计划">
<meta name="rk:type"        content="test-plan">
<meta name="rk:version"     content="{version}">
<meta name="rk:category"    content="{feat|tech|debt|fix}">
<meta name="rk:spec-dir"    content="spec/versions/<version>/specs/<YYYYMMDD-HHMM-属性-任务描述>">
<meta name="rk:role"        content="spec-tester">
<meta name="rk:mode"        content="{gated|autopilot}">
<meta name="rk:status"      content="未确认">
<meta name="rk:created"     content="YYYY-MM-DD">
<meta name="rk:updated"     content="YYYY-MM-DD">
<meta name="rk:revision"    content="1">
<meta name="rk:git-branch"  content="{git_branch}">
<meta name="rk:base-branch" content="dev">
<meta name="rk:pr-url"      content="">
<meta name="rk:tags"        content="spec,test-plan">
<!-- 关联声明，等价原 frontmatter 的 plan: 字段 -->
<link rel="rk-plan"   href="../writer/plan.html">
<link rel="rk-ledger" href="../lead/team-context.md">

<link rel="stylesheet" href="../../../../../../html-report/assets/rk-report.css">
<script defer src="../rk-manifest.js"></script>
<script defer src="../../../../../../html-report/assets/rk-report.js"></script>
</head>
<body>

<nav class="rk-nav"></nav>

<header class="rk-head">
  <h1>测试计划：{任务描述}</h1>
  <!-- 人可读镜像，字段与上方 meta 一致 -->
  <div class="rk-meta">
    <span><b>类型</b> test-plan</span>
    <span><b>版本</b> <code>{version}</code></span>
    <span><b>属性</b> <code>{category}</code></span>
    <span><b>Spec</b> <code>spec/versions/<version>/specs/<YYYYMMDD-HHMM-属性-任务描述></code></span>
    <span><b>角色</b> spec-tester</span>
    <span><b>状态</b> 未确认</span>
    <span><b>分支</b> <code>{git_branch}</code> ← <code>dev</code></span>
    <span><b>PR</b> —</span>
    <span><b>创建</b> YYYY-MM-DD</span>
    <span><b>修订</b> r1（YYYY-MM-DD）</span>
  </div>
</header>

<nav class="rk-revbar"></nav>

<section class="rk-verdict">
  <div class="rk-verdict-label">验收判定口径</div>
  <p>{一句话：P0 是否必须全过、允许带风险放行的类型、什么情况直接判不通过；只写判定条件，不写运行结果}</p>
</section>

<!-- 指标卡只放计划口径的数字：尚无运行结果，不得填写覆盖率或通过率 -->
<div class="rk-kpis">
  <div class="rk-kpi"><div class="k">计划用例</div><div class="v">{N}</div><div class="n">P0 {n} / P1 {n} / P2 {n}</div></div>
  <div class="rk-kpi"><div class="k">待验证需求</div><div class="v">{N}</div><div class="n">均有对应用例</div></div>
  <div class="rk-kpi"><div class="k">可自动化</div><div class="v">{N}</div><div class="n">计划数，非实测覆盖</div></div>
  <div class="rk-kpi"><div class="k">环境/数据缺口</div><div class="v">{N}</div><div class="n">见「准入条件」</div></div>
</div>

<!-- 追溯链：每条需求都要能走完这条链；断链用 c-red 标出，计入未覆盖 -->
<figure class="rk-fig">
  <svg viewBox="0 0 620 90" role="img" aria-label="需求经验收标准、用例、运行到证据的追溯链">
    <defs><marker id="tp1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path class="arrow" d="M0 0 L8 4 L0 8 z"/></marker></defs>
    <rect class="c-blue" x="1" y="20" width="140" height="50" rx="8"/>
    <text x="71" y="50" text-anchor="middle">需求 / 验收标准</text>
    <path class="edge" d="M141 45 H187" marker-end="url(#tp1)"/>
    <rect class="node" x="189" y="20" width="120" height="50" rx="8"/>
    <text x="249" y="50" text-anchor="middle">用例 TC / US</text>
    <path class="edge" d="M309 45 H355" marker-end="url(#tp1)"/>
    <rect class="node" x="357" y="20" width="110" height="50" rx="8"/>
    <text x="412" y="50" text-anchor="middle">本轮运行</text>
    <path class="edge" d="M467 45 H513" marker-end="url(#tp1)"/>
    <rect class="node" x="515" y="20" width="104" height="50" rx="8"/>
    <text x="567" y="50" text-anchor="middle">证据</text>
  </svg>
  <figcaption>图 1：需求 → 用例 → 运行 → 证据；缺任一环即计为未覆盖，不得默认通过。</figcaption>
</figure>

<!-- 阶段门禁顺序。计划阶段全部为未开始，不要标成已完成 -->
<ol class="rk-flow">
  <li><b>准入</b><span>环境与数据就绪</span></li>
  <li><b>冒烟</b><span>P0 主路径</span></li>
  <li><b>边界</b><span>异常 / 并发 / 权限</span></li>
  <li><b>证据</b><span>日志 / trace / 截图</span></li>
  <li><b>判定</b><span>对照验收口径</span></li>
</ol>

<!-- 修订历史固定 5 列。「原因」列源于实质取舍时引用账本 Decision Log 编号（如：按 D-003 ⋯⋯）；
     纯笔误/措辞/补充直接写清，不要编造决策编号。决策过程正文留在账本，不复制进报告。 -->
<h2>修订历史</h2>
<table class="rk-revs">
  <thead><tr><th>修订</th><th>日期</th><th>修改人</th><th>改了什么</th><th>原因</th></tr></thead>
  <tbody>
    <tr><td>r1</td><td>YYYY-MM-DD</td><td>spec-tester</td><td>初版</td><td>—</td></tr>
  </tbody>
</table>
```

**必须包含的章节**（接在骨架 `<body>` 里）：

```html
<h2>测试方式与选择</h2>
<table>
  <thead><tr><th>场景 / 用例</th><th>可选方式与取舍</th><th>Agent 推荐及依据</th><th>用户选择 / 状态</th></tr></thead>
  <tbody><tr><td>{场景编号与范围}</td><td>{适用选项、依赖、成本和数据边界}</td><td>{推荐、理由、证据路径或待核实}</td><td>{用户选择及确认依据 / 待选择}</td></tr></tbody>
</table>
<p>{所选方式分别覆盖的用例；其余必需单元、API、权限等测试及未决条件}</p>

<h2>验收标准</h2>
<p>{判定规则：P0 是否全过、P1/P2 的容错范围、未执行如何计数；只写条件，不写结果}</p>
<table>
  <thead><tr><th>标准编号</th><th>关联需求</th><th>通过条件（可判定）</th><th>不通过条件</th><th>证据类型</th></tr></thead>
  <tbody>
    <tr><td>AC-001</td><td>{需求编号 / 验收条目}</td><td>{可观察、可量化的结果}</td><td>{明确的反例、阈值或异常表现}</td><td>{日志 / trace / 截图 / 断言输出}</td></tr>
  </tbody>
</table>
<div class="rk-cal key"><div class="t">计划口径</div><p>覆盖率、通过率等实测数字只写在 <code>tester/test-report.html</code>；本报告不得预先填写或估算。</p></div>

<h2>需求 → 用例 → 证据追溯</h2>
<p>每条需求必须能沿「验收标准 → 用例 → 运行 → 证据」走通；断链或只有用例没有证据的条目计为未覆盖。</p>
<table>
  <thead><tr><th>需求/验收条目</th><th>验收标准</th><th>用例</th><th>执行方式</th><th>证据类型与路径</th><th>覆盖状态</th></tr></thead>
  <tbody>
    <tr><td>{需求编号}</td><td>AC-001</td><td>TC-001</td><td>自动 / 手工</td><td><code>tester/artifacts/test-logs/&lt;run-id&gt;/...</code></td><td>已覆盖 / 部分 / 未覆盖</td></tr>
  </tbody>
</table>

<h2>测试用例</h2>
<table>
  <thead><tr><th>用例编号</th><th>优先级</th><th>描述</th><th>输入/前置</th><th>预期输出</th><th>边界条件</th><th>关联需求</th></tr></thead>
  <tbody>
    <tr><td>TC-001</td><td>P0</td><td>{描述}</td><td>{输入与前置状态}</td><td>{可判定的预期}</td><td>{空值 / 极值 / 并发 / 权限}</td><td>{AC-001}</td></tr>
  </tbody>
</table>

<h2>用户使用场景（端侧/E2E 适用）</h2>
<table>
  <thead><tr><th>场景编号</th><th>用户角色</th><th>业务目标</th><th>操作路径</th><th>关键断言</th><th>证据</th></tr></thead>
  <tbody>
    <tr><td>US-001</td><td>{角色}</td><td>{目标}</td><td>{点击/输入/跳转路径}</td><td>{UI/数据/日志断言}</td><td>{截图/console/network/backend log}</td></tr>
  </tbody>
</table>

<h2>边界与异常矩阵</h2>
<p>逐维度列出必须覆盖的边界与异常；没有对应用例的格子就是覆盖缺口，需登记到未验证风险。</p>
<table>
  <thead><tr><th>维度</th><th>边界/异常</th><th>用例</th><th>预期行为</th><th>判定依据</th></tr></thead>
  <tbody>
    <tr><td>空值 / 极值</td><td>{空输入、最大长度、超大数值}</td><td>TC-XXX</td><td>{降级、拒绝或报错}</td><td>{状态码 / 提示 / 日志}</td></tr>
    <tr><td>并发 / 重复提交</td><td>{多实例、重试、竞争}</td><td>TC-XXX</td><td>{幂等或明确冲突}</td><td>{数据库状态 / trace}</td></tr>
    <tr><td>权限 / 未授权</td><td>{越权、过期凭证、只读角色}</td><td>TC-XXX</td><td>{拒绝且不泄露数据}</td><td>{审计日志 / 响应}</td></tr>
    <tr><td>外部依赖失败</td><td>{超时、错误码、断网}</td><td>TC-XXX</td><td>{重试、降级或回滚}</td><td>{错误日志 / 任务记录}</td></tr>
  </tbody>
</table>

<h2>开发者审核关注点</h2>
<p>按实际适用范围逐条检查；未确认项记录影响并按既有门禁处理。</p>
<table>
  <thead><tr><th>关注点</th><th>为什么要确认</th><th>审核方式</th><th>确认结果</th></tr></thead>
  <tbody>
    <tr><td>P0 判定口径</td><td>口径模糊时无法判定失败</td><td>对照 <code>writer/plan.html</code> 验收条目</td><td>待确认 / 已确认</td></tr>
    <tr><td>测试数据可复现性</td><td>数据不可复现则证据不可审计</td><td>按本计划构造一次</td><td>待确认 / 已确认</td></tr>
    <tr><td>边界可注入性</td><td>无法制造并发/超时会导致用例阻塞</td><td>检查配置开关或依赖桩</td><td>待确认 / 已确认</td></tr>
    <tr><td>日志与 trace 埋点</td><td>无观测点则关键路径无法证明</td><td>列出日志点、字段与 trace id 来源</td><td>待确认 / 已确认</td></tr>
  </tbody>
</table>

<h2>覆盖率要求</h2>
<p>只定义口径、阈值与测量方式；实测值与缺口写进测试报告。</p>
<table>
  <thead><tr><th>对象</th><th>口径</th><th>目标</th><th>测量方式</th><th>不达标时的处理</th></tr></thead>
  <tbody>
    <tr><td>代码</td><td>行 / 分支</td><td>&gt; 80%</td><td>{coverage 工具与命令}</td><td>{补用例或登记覆盖缺口}</td></tr>
    <tr><td>功能</td><td>验收条目</td><td>{N}/{N} 条有对应用例</td><td>核对追溯矩阵</td><td>未覆盖需求不得判定通过</td></tr>
  </tbody>
</table>

<h2>日志与审计要求</h2>

<h3>关键路径可观测性</h3>
<ul>
  <li>必须验证以下关键路径是否留下可追溯证据：{列出状态流转/权限边界/数据写入/异步任务/外部 API/错误恢复}</li>
  <li>每个关键路径至少保留一种证据：日志片段、trace id、事件记录、数据库审计字段或任务执行记录</li>
  <li>日志断言应覆盖成功、失败和拒绝/回滚路径</li>
</ul>

<h3>端侧审计日志</h3>
<ul>
  <li>端侧测试必须保留审计日志目录：<code>tester/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/</code>（原始格式，不转 HTML）</li>
  <li>审计日志至少包含：测试 run id、时间戳、测试账号/角色（脱敏）、设备/浏览器/App 版本、操作路径、控制台日志、网络请求摘要、截图或录屏路径、失败堆栈、关联用例编号</li>
</ul>
<div class="rk-cal warn"><div class="t">脱敏</div><p>不得保存 token、密码、密钥、完整手机号、身份证号或真实用户隐私。</p></div>

<h2>测试环境要求</h2>
<p>覆盖依赖、配置与测试数据准备；每项给出就绪状态与补齐方式。</p>
<table>
  <thead><tr><th>项</th><th>要求</th><th>就绪状态</th><th>缺口与补齐方式</th></tr></thead>
  <tbody>
    <tr><td>运行时与依赖版本</td><td>{语言/框架/数据库版本、锁文件}</td><td>就绪 / 待补</td><td>{具体动作与 owner}</td></tr>
    <tr><td>配置与环境变量</td><td>{必需配置项，不含真实密钥}</td><td>就绪 / 待补</td><td>{...}</td></tr>
    <tr><td>测试数据</td><td>{构造方式、量级、脱敏规则、清理方式}</td><td>就绪 / 待补</td><td>{...}</td></tr>
    <tr><td>外部依赖 / 桩</td><td>{真实依赖或 mock/fixture 的口径}</td><td>就绪 / 待补</td><td>{...}</td></tr>
    <tr><td>账号与权限</td><td>{所需角色，脱敏记录方式}</td><td>就绪 / 待补</td><td>{...}</td></tr>
    <tr><td>证据采集能力</td><td>{console/network/trace/日志按 run-id 导出}</td><td>就绪 / 待补</td><td>{先修采集，不得手写替代}</td></tr>
  </tbody>
</table>

<h2>准入条件</h2>
<p>全部满足才开跑；未满足时标阻塞并交回 TeamLead，不得先跑再补条件。</p>
<table>
  <thead><tr><th>条件</th><th>判定方式</th><th>未满足时</th></tr></thead>
  <tbody>
    <tr><td>基线 commit 可构建、可启动</td><td><code>{构建/启动命令}</code> 退出码 0</td><td>阻塞，不开始执行</td></tr>
    <tr><td>环境与测试数据就绪</td><td>冒烟用例通过</td><td>标记阻塞并升级</td></tr>
    <tr><td>日志 / trace 采集可用</td><td>{探针或 run-id 过滤验证}</td><td>先修采集，不得用手写证据替代</td></tr>
    <tr><td>关键路径埋点已就位</td><td>{抽查一条状态流转日志}</td><td>与 <code>spec-executor</code> 对齐后再开跑</td></tr>
  </tbody>
</table>

<h2>未验证风险</h2>
<p>本轮计划无法验证的项必须显式登记；未验证不等于通过。</p>
<table>
  <thead><tr><th>风险</th><th>为何本轮无法验证</th><th>影响</th><th>缓解 / 替代证据</th><th>责任人</th></tr></thead>
  <tbody>
    <tr><td>{真机 / 生产规模 / 特定依赖}</td><td>{环境、权限或数据限制}</td><td>{可能漏掉的问题}</td><td>{后续补测或其他证据}</td><td>{角色}</td></tr>
  </tbody>
</table>
<div class="rk-cal risk"><div class="t">未验证 ≠ 通过</div><p>执行阶段无法验证的项，在测试报告中标为「阻塞」或「未执行」，不得计入通过。</p></div>

<!-- 关联产物：双向。谁新建关联谁负责补对侧反链 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../writer/plan.html" data-rk-link="plan">设计方案</a></li>
  <li><a href="../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="test-report.html" data-rk-backlink="test-report">测试报告</a>（待创建）</li>
  <li><a href="../writer/plan.html" data-rk-backlink="plan">设计方案</a></li>
</ul>
```

### 步骤 4：通知 TeamLead 完成

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-tester 的测试计划任务行
- 「状态」标记为 `done`
- 「产物」指向 `tester/test-plan.html`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-tester`
- 只修改「任务进度」，不要修改 TeamLead 控制面区块

```text
通知 TeamLead：tester/test-plan.html 已完成，等待用户确认。
```

---

## 阶段二：执行测试（测试执行阶段）

### 步骤 1：接力 AWR 会话、准备上下文并读取必要文档

1. 执行 AWR 会话接力与上下文准备：
   ```bash
   # 自动接力上游 spec-executor 的会话并转移任务租约（Claim Transfer）
   AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
   bash "$AWR_CP" --work <SPEC-ID> --agent spec-tester --digest "接力开工进入测试" --next-action "执行全量用例测试"
   # 绑定当前会话准备测试聚焦上下文与最新代码变更基线
   awr work prepare <SPEC-ID> --session <SESSION-ID> --response-view summary
   ```
2. 读取关键业务与规范文档：
   - `writer/plan.html`：了解设计方案
   - `tester/test-plan.html`：测试用例和验收标准
   - `executor/summary.html`：了解实现细节
   - `html-report` skill：报告骨架、frontmatter 双轨等价字段、双向关联、修订标记与 Decision Log 联动规范
### 步骤 2：执行测试用例

按 `tester/test-plan.html` 的用例逐一执行，记录结果。

- 根据步骤 2.1 核对本 Spec 的用户选择和所选方式的当前可用性；旧计划未记录选择时先给出建议并通过 TeamLead 询问，不自行替用户决定。需要变更已确认计划时遵循修订规范和原有确认门禁。
- 若选择 agent-qa 或组合方式，读取 `references/web-e2e-testing.md` 的 agent-qa 小节；非 Web 的用例继续使用其适用策略。
- 先核对「准入条件」，未满足项标阻塞并交回 TeamLead，不先跑再补条件。
- 每条用例记录本轮实际状态：通过 / 失败 / 跳过 / 阻塞 / 未执行 / 已执行但证据不足；不能沿用上一轮或实现者自测。
- 记录每条用例与本轮证据的对应关系（文件路径或 trace id）；没有证据的用例不得标通过。
- 通过 / 失败 / 跳过 / 阻塞 / 未执行 / 已执行但证据不足六类互斥，合计等于报告统计范围内的计划用例总数；新增或调整的用例另列并说明。

每次测试运行先在当前 Spec 目录下创建 tester 审计日志目录：

```text
tester/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/
├── audit.log
├── console.log
├── network-summary.json
├── screenshots/
├── recordings/
└── traces/
```

根据测试类型保留证据：
- 后端/系统关键路径：保留关键日志片段、trace id、任务 id、事件 id 或数据库审计字段
- Web 端测试：保留 console 日志、network 摘要、关键截图，必要时保留 trace/录屏
- Web 端侧 E2E：按 [references/web-e2e-testing.md](references/web-e2e-testing.md) 执行用户场景、浏览器点击、前端控制台/网络请求/后端日志联动验证
- iOS/Android/桌面端测试：保留设备信息、App 版本、操作路径、截图/录屏、崩溃或失败堆栈
- 所有证据必须脱敏，禁止保存 token、密码、密钥和真实用户隐私

证据生成规则：
- 必须通过测试运行自动生成证据文件，例如测试脚本捕获 console/network、Playwright trace/screenshot、后端日志按 RUN_ID 过滤导出、CLI 命令输出重定向。
- 允许 Agent 编写或调整测试脚本、测试配置、日志采集命令，让测试执行时自动写入 `tester/artifacts/test-logs/<run-id>/`。
- 禁止 Agent 在测试结束后手工编辑 `audit.log`、`console.log`、`browser-console.ndjson`、`network-summary.json`、`backend.log`、`traces/` 或 `recordings/` 来“补齐证据”。
- 如果某类证据无法自动采集，在 `tester/test-report.html` 记录缺失原因和风险；不要用手写内容替代真实证据。

### 步骤 3：发现 Bug 时的处理（同步创建 AWR Open-Loop）

**重要**：不直接修复，向 TeamLead 提交 bug handoff。

先更新当前 Spec 的 `lead/team-context.md` 共享区与 AWR 任务队列：
- 在「问题闭环记录」中追加或更新该问题行
- 「分类」一般为 `bug`；若是测试环境/依赖问题而非产品缺陷，用 `env` / `dependency`
- 「发现者」 写 `spec-tester`
- `owner` 建议写 `spec-debugger`
- `problem` 简述现象，「关联产物」 引用测试证据路径或即将创建的 debug 文档
- 「状态」标记为 `open`
- 「更新者」 写 `spec-tester`
- 向 AWR 提交会话检查点并登记 open-loop 阻塞项：
  ```bash
  AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
  bash "$AWR_CP" --work <SPEC-ID> --agent spec-tester --digest "spec-tester: 发现用例失败 [TC-XXX]，已登记 open-loop 并交接" --open-loop "TC-XXX 失败待修复并复验" --next-action "spec-debugger: 定位根因并修复 TC-XXX"
  ```
- 只修改「问题闭环记录」，不要修改 TeamLead 控制面区块
```text
通知 TeamLead：
- 现象：[错误描述]
- 复现步骤：[步骤]
- 预期：[期望行为]
- 实际：[实际行为]
- 相关测试用例：TC-XXX
- 建议下游角色：spec-debugger
```

等待 TeamLead 提供 spec-debugger 的修复完成通知后，重新执行相关测试用例。

#### 重验后更新修复循环记账

收到 spec-debugger 的修复完成通知并重新执行相关用例后，更新 `lead/team-context.md` 的「修复循环预算」（`test-debug` 行）：

- **验证通过**：把 「状态」标为 `passed`，在「问题闭环记录」把对应问题行标为 `verified`，结束修复循环。
- **仍然失败**：与 spec-debugger 的本轮记账保持一致，复核 「已用轮数」 和 「连续无进展」 是否已正确递增（重验视角下，本轮是否新增通过用例、是否缩小失败范围）。
  - 若 「已用轮数」 达到 「最大轮数」 或 「连续无进展」 达到 「最大无进展轮数」，把 「状态」标为 `stopped-budget` 或 `stopped-no-progress`，**不再发起下一轮 bug handoff**，转而通知 TeamLead 升级给用户。
  - 若预算未触上限，再向 TeamLead 提交下一轮 bug handoff。

```text
通知 TeamLead（触发预算上限时）：修复循环已达预算上限，停止重验并请升级给用户。
- 已用轮数：{rounds_used}/{max_rounds}
- 连续无进展轮数：{no_progress_streak}/{max_no_progress_rounds}
- 仍未通过的用例：TC-XXX
- 建议用户在「继续加预算 / 改方案 / 暂停」中决定下一步
```

### 步骤 4：记录微小修改

测试过程中如有微小调整（非 bug，如参数调优、配置修正）：
- 直接记录到 `tester/test-report.html` 的「修改记录」表
- 不创建 debug 文档

### 步骤 5：产出 tester/test-report.html

在当前 Spec 目录下创建 `tester/test-report.html`。结论用 `rk-verdict is-pass|is-fail`，首屏区分通过、失败、跳过、阻塞、未执行与已执行但证据不足：

- **首屏决策结构**：一句话给出结论与放行建议；状态分开计数，覆盖率写清行/分支口径与来源；未测量就写「未测量」而非 0%。状态互斥，合计等于报告统计范围内的计划用例总数；新增或调整的用例另列并说明。
- **结论只认本轮运行证据**：每个「通过」必须能指到本轮 `run-id` 下由测试运行自动生成的证据。已执行但证据不足的用例保留实际执行事实并单列，不计入通过；引用上一轮结果或 `spec-executor` 自测结论都不算通过。
- **状态定义**：

  | 状态 | 含义 | 必须能指到 |
  |------|------|------------|
  | 通过 | 本轮执行，断言全部满足 | 输出 / 日志 / trace / 截图 |
  | 失败 | 本轮执行，至少一条断言不满足 | 失败输出、堆栈、截图 |
  | 跳过 | 本轮按规则不执行（不适用、已被其他用例覆盖） | 跳过依据与批准规则 |
  | 阻塞 | 环境、依赖或缺陷导致无法执行 | 阻塞项、owner、关联问题 |
  | 未执行 | 计划内但本轮没有运行 | 原因与补跑计划 |
  | 已执行但证据不足 | 本轮已运行，但证据缺失或不可复核 | 已观察事实、证据缺口及补验计划 |

- **图按内容选型**（机检要求 kpis 加 chart/barcell/flow 之一，是下限而非目标）：
  - 有可比较的实测数据时，按模块/类型的通过率或覆盖率用 `rk-chart`，或表内 `rk-barcell`；
  - 没有可比较实测数据（如全部阻塞、仅状态流转）时，用 `rk-flow` 画本轮真实执行状态（未开始 → 冒烟 → 边界 → 证据 → 判定），不得编造比率；
  - 失败用例所在调用链用 `figure.rk-fig`，故障点用 `c-red`，证据缺口用 `c-amber`；
  - 枚举与精确契约（用例结果、状态定义、证据路径）用表格，不要画图。
- **何时不画图**：没有真实运行数据就不画数据图；并列枚举、逐条证据清单用表格或 `<pre><code>`。**不得为凑图文比编造数值或画占位柱状条，也不得为了图面简洁删掉失败/阻塞证据**。
- **篇幅**：按语义拆分长段落；长输出、堆栈、日志片段可放进 `<pre><code>` 或证据表格，保留必要内容。图文比及段落长度不设机检硬限制，不得编造数值补图或删失败证据。
- **开发者审核关注点**：单独成节，标出哪些失败/阻塞/未执行影响放行、哪些覆盖缺口需开发者确认接受、哪些证据缺失导致结论不可复核。
- 写完按 html-report「结构机检」一节的命令运行 `check-report.js`，退出码为 0 才算完成；机检不通过时补结构或拆表格，不删证据、不改状态口径。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>测试报告 - {任务描述}</title>

<!-- 原 frontmatter 的机器可读等价物，字段一一对应，不可省略 -->
<meta name="rk:title"       content="测试报告">
<meta name="rk:type"        content="test-report">
<meta name="rk:version"     content="{version}">
<meta name="rk:category"    content="{feat|tech|debt|fix}">
<meta name="rk:spec-dir"    content="spec/versions/<version>/specs/<YYYYMMDD-HHMM-属性-任务描述>">
<meta name="rk:role"        content="spec-tester">
<meta name="rk:mode"        content="{gated|autopilot}">
<meta name="rk:status"      content="未确认">
<meta name="rk:created"     content="YYYY-MM-DD">
<meta name="rk:updated"     content="YYYY-MM-DD">
<meta name="rk:revision"    content="1">
<meta name="rk:git-branch"  content="{git_branch}">
<meta name="rk:base-branch" content="dev">
<meta name="rk:pr-url"      content="">
<meta name="rk:tags"        content="spec,test-report">
<!-- 关联声明，等价原 frontmatter 的 plan: / test-plan: / debug: 字段 -->
<link rel="rk-plan"      href="../writer/plan.html">
<link rel="rk-test-plan" href="test-plan.html">
<link rel="rk-debug"     href="../debugger/debug-001.html">
<link rel="rk-ledger"    href="../lead/team-context.md">

<link rel="stylesheet" href="../../../../../../html-report/assets/rk-report.css">
<script defer src="../rk-manifest.js"></script>
<script defer src="../../../../../../html-report/assets/rk-report.js"></script>
</head>
<body>

<nav class="rk-nav"></nav>

<header class="rk-head">
  <h1>测试报告：{任务描述}</h1>
  <!-- 人可读镜像，字段与上方 meta 一致 -->
  <div class="rk-meta">
    <span><b>类型</b> test-report</span>
    <span><b>版本</b> <code>{version}</code></span>
    <span><b>属性</b> <code>{category}</code></span>
    <span><b>Spec</b> <code>spec/versions/<version>/specs/<YYYYMMDD-HHMM-属性-任务描述></code></span>
    <span><b>角色</b> spec-tester</span>
    <span><b>状态</b> 未确认</span>
    <span><b>分支</b> <code>{git_branch}</code> ← <code>dev</code></span>
    <span><b>PR</b> —</span>
    <span><b>创建</b> YYYY-MM-DD</span>
    <span><b>修订</b> r1（YYYY-MM-DD）</span>
  </div>
</header>

<nav class="rk-revbar"></nav>

<!-- 测试结论：通过用 is-pass，不通过用 is-fail；结论必须与本轮 run-id 的证据一致 -->
<section class="rk-verdict">
  <div class="rk-verdict-label">测试结论</div>
  <p>{一句话：本轮 {run-id} 的状态统计、证据缺口、是否建议放行及影响范围}</p>
</section>

<!-- 六类状态互斥；覆盖率必须是本轮实测值与口径，未测量时写「未测量」 -->
<div class="rk-kpis">
  <div class="rk-kpi is-pass"><div class="k">通过</div><div class="v">{N}</div><div class="n">断言全部满足</div></div>
  <div class="rk-kpi is-fail"><div class="k">失败</div><div class="v">{N}</div><div class="n">{最差模块或用例}</div></div>
  <div class="rk-kpi"><div class="k">跳过</div><div class="v">{N}</div><div class="n">不适用或按规则放弃</div></div>
  <div class="rk-kpi"><div class="k">阻塞</div><div class="v">{N}</div><div class="n">环境/依赖/缺陷</div></div>
  <div class="rk-kpi"><div class="k">未执行</div><div class="v">{N}</div><div class="n">计划内未运行</div></div>
  <div class="rk-kpi"><div class="k">已执行但证据不足</div><div class="v">{N}</div><div class="n">{缺口及补验}</div></div>
  <div class="rk-kpi"><div class="k">覆盖率</div><div class="v">{N}%</div><div class="n">{行/分支，来源}</div></div>
</div>

<!-- 状态口径表：先定义再统计，避免把未执行算进通过 -->
<table>
  <thead><tr><th>状态</th><th>定义</th><th>必须能指到的证据</th></tr></thead>
  <tbody>
    <tr><td><span class="rk-tag is-pass">通过</span></td><td>本轮执行，断言全部满足</td><td>run-id 下的输出 / 日志 / trace / 截图</td></tr>
    <tr><td><span class="rk-tag is-fail">失败</span></td><td>本轮执行，至少一条断言不满足</td><td>失败输出、堆栈、截图</td></tr>
    <tr><td><span class="rk-tag">跳过</span></td><td>本轮按规则不执行（不适用、已被其他用例覆盖）</td><td>跳过依据与批准规则</td></tr>
    <tr><td><span class="rk-tag is-warn">阻塞</span></td><td>环境、依赖或缺陷导致无法执行</td><td>阻塞项、owner、关联问题</td></tr>
    <tr><td><span class="rk-tag is-info">未执行</span></td><td>计划内但本轮没有运行，无结果</td><td>原因与补跑计划</td></tr>
    <tr><td>已执行但证据不足</td><td>本轮已运行，但证据缺失或不可复核</td><td>已观察事实、证据缺口及补验计划</td></tr>
  </tbody>
</table>

<!-- 有真实可比较数据时才用柱状条；全部阻塞/未执行时改用 rk-flow 画执行状态，不得编造比率 -->
<figure class="rk-chart">
  <div class="rk-bar"><span class="k">{模块或类型}</span><meter class="is-pass" min="0" max="100" value="{N}"></meter><span class="v">{N}%</span></div>
  <div class="rk-bar"><span class="k">{模块或类型}</span><meter class="is-warn" min="0" max="100" value="{N}"></meter><span class="v">{N}%</span></div>
  <div class="rk-bar"><span class="k">{模块或类型}</span><meter class="is-fail" min="0" max="100" value="{N}"></meter><span class="v">{N}%</span></div>
  <figcaption>图 1：按模块或类型的实测通过率——数值取自本轮 run-id；is-pass 达标，is-warn 待补测，is-fail 未达标</figcaption>
</figure>

<!-- 无可比较数据时用流程条替代柱状条（机检允许 chart / barcell / flow 之一）：
<ol class="rk-flow">
  <li class="is-done"><b>冒烟</b><span>{N} 项已执行</span></li>
  <li class="is-blocked"><b>边界</b><span>环境未就绪</span></li>
  <li><b>权限</b><span>未执行</span></li>
  <li><b>证据</b><span>待补齐</span></li>
</ol>
-->


<!-- 修订历史固定 5 列。「原因」列源于实质取舍时引用账本 Decision Log 编号（如：按 D-003 ⋯⋯）；
     纯笔误/措辞/补充直接写清，不要编造决策编号。决策过程正文留在账本，不复制进报告。 -->
<h2>修订历史</h2>
<table class="rk-revs">
  <thead><tr><th>修订</th><th>日期</th><th>修改人</th><th>改了什么</th><th>原因</th></tr></thead>
  <tbody>
    <tr><td>r1</td><td>YYYY-MM-DD</td><td>spec-tester</td><td>初版</td><td>—</td></tr>
  </tbody>
</table>
```

**必须包含的章节**（接在骨架 `<body>` 里）：

```html
<h2>测试概况</h2>
<p>计划用例 {N} 项，本轮 run-id 执行 {N} 项；各状态互斥，合计等于本报告统计范围内的计划总数。新增或调整用例另列；执行口径、覆盖率来源与缺口见下方证据表。</p>
<p><b>测试方式：</b>{用户选择及确认依据}；实际使用 {工具、版本与用例范围}；{与计划的偏差和原因，无则写无}。</p>

<h2>用例结果</h2>
<p>逐条记录本轮执行事实与证据；已执行但证据不足时单列缺口，不能计入通过。</p>
<table>
  <thead><tr><th>用例编号</th><th>关联需求</th><th>场景</th><th>状态</th><th>本轮证据</th><th>备注</th></tr></thead>
  <tbody>
    <tr><td>TC-001</td><td>{AC-001}</td><td>{场景}</td><td><span class="rk-tag is-pass">通过</span></td><td><code>tester/artifacts/test-logs/&lt;run-id&gt;/...</code></td><td>—</td></tr>
    <tr><td>TC-002</td><td>{AC-002}</td><td>{场景}</td><td><span class="rk-tag is-fail">失败</span></td><td><code>.../failures/TC-002.log</code></td><td>{断言与现象}</td></tr>
    <tr><td>TC-003</td><td>{AC-003}</td><td>{场景}</td><td><span class="rk-tag">跳过</span></td><td>—</td><td>{跳过依据}</td></tr>
    <tr><td>TC-004</td><td>{AC-004}</td><td>{场景}</td><td><span class="rk-tag is-warn">阻塞</span></td><td><code>.../blocked.md</code></td><td>{阻塞项与 owner}</td></tr>
    <tr><td>TC-005</td><td>{AC-005}</td><td>{场景}</td><td><span class="rk-tag is-info">未执行</span></td><td>—</td><td>{原因与补跑计划}</td></tr>
    <tr><td>TC-006</td><td>{AC-006}</td><td>{场景}</td><td>已执行但证据不足</td><td>缺失</td><td>{实际观察、缺口及补验}</td></tr>
    <tr><td>TC-0XX</td><td>{AC-00X}</td><td>{场景}</td><td><del class="rk-del" data-rev="2">失败</del><ins class="rk-ins" data-rev="2">通过</ins></td><td><code>.../rerun-002/...</code></td><td>{debug-001-fix 复验}</td></tr>
  </tbody>
</table>

<h2>放行判定</h2>
<p>逐条对照测试计划的验收标准给出结果；缺证据的标准不得判通过。</p>
<table>
  <thead><tr><th>验收标准</th><th>结果</th><th>支撑用例</th><th>未通过原因 / 风险</th></tr></thead>
  <tbody>
    <tr><td>AC-001</td><td>满足 / 不满足 / 未验证</td><td>TC-001</td><td>{...}</td></tr>
  </tbody>
</table>

<h2>阻塞与未执行清单</h2>
<table>
  <thead><tr><th>用例/需求</th><th>状态</th><th>原因</th><th>已尝试</th><th>下一步 / owner</th></tr></thead>
  <tbody>
    <tr><td>TC-004</td><td>阻塞</td><td>{环境/依赖/缺陷}</td><td>{复现步骤与日志路径}</td><td>{补齐条件或升级}</td></tr>
    <tr><td>TC-005</td><td>未执行</td><td>{本轮未运行的原因}</td><td>—</td><td>{补跑时间与责任人}</td></tr>
  </tbody>
</table>

<h2>测试过程中的修改记录</h2>
<table>
  <thead><tr><th>修改类型</th><th>描述</th><th>关联文档</th></tr></thead>
  <tbody>
    <tr><td>微小调整</td><td>{直接描述}</td><td>—</td></tr>
    <tr><td>Bug 修复</td><td>{问题现象简述}</td><td><a href="../debugger/debug-001.html" data-rk-link="debug">debug-001</a></td></tr>
  </tbody>
</table>

<h2>日志与审计证据</h2>

<h3>测试运行</h3>
<table>
  <thead><tr><th>项</th><th>值</th></tr></thead>
  <tbody>
    <tr><td>Run ID</td><td>YYYYMMDD-HHMM-run-XXX</td></tr>
    <tr><td>源码基线</td><td><code>{40 位 commit SHA}</code>（当前工作树，含未提交变更：{是/否}）</td></tr>
    <tr><td>执行命令</td><td><code>{测试命令}</code>，退出码 {N}</td></tr>
    <tr><td>开始 / 结束</td><td>{YYYY-MM-DD HH:MM} / {YYYY-MM-DD HH:MM}</td></tr>
    <tr><td>审计日志目录</td><td><code>tester/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/</code>（原始格式）</td></tr>
    <tr><td>测试账号/角色</td><td>{脱敏后的账号或角色}</td></tr>
    <tr><td>设备/浏览器/App 版本</td><td>{端侧测试必填}</td></tr>
  </tbody>
</table>

<h3>证据清单</h3>
<p>只登记由测试运行自动生成的文件；缺失的证据写缺口与影响，不补写。</p>
<table>
  <thead><tr><th>证据文件</th><th>生成方式</th><th>覆盖用例</th><th>完整性</th></tr></thead>
  <tbody>
    <tr><td><code>.../audit.log</code></td><td>{脚本 / 日志导出命令}</td><td>TC-001…</td><td>完整 / 截断 / 缺失</td></tr>
    <tr><td><code>.../coverage.txt</code></td><td>{coverage 命令}</td><td>—</td><td>完整</td></tr>
    <tr><td><code>.../completion-report.json</code></td><td>{测试脚本派生}</td><td>全部</td><td>完整</td></tr>
  </tbody>
</table>

<h3>关键路径日志验证</h3>
<table>
  <thead><tr><th>关键路径</th><th>关联用例</th><th>证据类型</th><th>证据位置/trace id</th><th>结果</th></tr></thead>
  <tbody>
    <tr><td>{状态流转/权限边界/数据写入等}</td><td>TC-XXX</td><td>日志/trace/事件/截图</td><td><code>tester/artifacts/test-logs/...</code> 或 trace id</td><td>通过 / 失败 / 未验证</td></tr>
  </tbody>
</table>
<p>结果标「未验证」时，必须写明缺的是埋点、采集能力还是运行机会，并在「阻塞与未执行清单」留对应行。</p>

<h3>端侧审计留存</h3>
<ul>
  <li>控制台日志：<code>tester/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/console.log</code></li>
  <li>网络摘要：<code>tester/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/network-summary.json</code></li>
  <li>截图：<code>tester/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/screenshots/</code></li>
  <li>录屏/trace（如有）：<code>tester/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/recordings/</code> / <code>traces/</code></li>
</ul>
<div class="rk-cal ok"><div class="t">脱敏检查</div><p>已确认未保存 token、密码、密钥或真实用户隐私。</p></div>

<h2>发现的 Bug（如有）</h2>
<ul>
  <li><a href="../debugger/debug-001.html" data-rk-link="debug">{Bug 标题}</a> — {状态：已修复并复验 / 待修复 / 已接受风险}，{关联用例与证据}</li>
</ul>
<div class="rk-cal warn"><div class="t">注意</div><p>{遗留问题、覆盖率缺口、未能自动采集的证据及其风险}</p></div>

<h2>开发者审核关注点</h2>
<p>给 <code>spec-executor</code> / <code>spec-reviewer</code> 复核；每项都要能落到上面的用例行或证据文件。</p>
<table>
  <thead><tr><th>关注点</th><th>为什么要关注</th><th>对应用例/证据</th><th>需开发者确认</th></tr></thead>
  <tbody>
    <tr><td>{失败用例}</td><td>直接影响放行</td><td>TC-002 / <code>.../failures/TC-002.log</code></td><td>{是否已修复或接受风险}</td></tr>
    <tr><td>{阻塞与未执行}</td><td>结论覆盖不全</td><td>TC-004、TC-005</td><td>{是否补环境或延后验证}</td></tr>
    <tr><td>{覆盖率缺口}</td><td>关键分支可能未被验证</td><td><code>.../coverage.txt</code></td><td>{是否补测}</td></tr>
    <tr><td>{证据缺失或截断}</td><td>结论不可复核</td><td>{证据清单中的缺口行}</td><td>{是否重新采集}</td></tr>
  </tbody>
</table>

<!-- 关联产物：双向。谁新建关联谁负责补对侧反链 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../writer/plan.html" data-rk-link="plan">设计方案</a></li>
  <li><a href="test-plan.html" data-rk-link="test-plan">测试计划</a></li>
  <li><a href="../debugger/debug-001.html" data-rk-link="debug">问题修复 debug-001</a></li>
  <li><a href="../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../reviewer/review.html" data-rk-backlink="review">审查报告</a>（待创建）</li>
  <li><a href="../ender/end-report.html" data-rk-backlink="end-report">收尾报告</a>（待创建）</li>
</ul>
```

### 步骤 6：测试策略沉淀判断

基于本次 `tester/test-plan.html`、`tester/test-report.html` 和测试日志，判断是否需要沉淀或更新测试策略：

- 是否出现了新的可复用测试场景（如移动端真机、API 契约、异步任务、权限矩阵、性能回归）
- 是否发现现有策略漏掉了关键证据（如 console/network/backend log、trace、截图、录屏、审计字段）
- 是否形成了跨项目都适用的执行步骤、断言方式、失败处理或脱敏规则

如果需要沉淀：
1. 暂停通知 TeamLead，先向用户说明拟修改 `spec-test/references/` 的内容
2. 用户确认后，按「策略撰写标准」新增或更新策略文件
3. 如新增策略，同步更新「测试策略库」表格
4. 在 `tester/test-report.html` 的「关联产物」中补充策略文件引用

如果不需要沉淀，在 `tester/test-report.html` 中记录：

```html
<h2>测试策略沉淀判断</h2>
<ul>
  <li>结论：无需新增或更新通用测试策略</li>
  <li>原因：{本次仅为项目特定验证 / 已被现有策略覆盖 / 无跨项目复用价值}</li>
</ul>
```

### 步骤 7：通知 TeamLead 完成

先更新当前 Spec 的 `lead/team-context.md` 共享区与 AWR 证据链：
- 在「任务进度」中追加或更新 spec-tester 的测试执行任务行
- 「状态」标记为 `done` 或 `blocked`（如仍有未解决问题）
- 「产物」指向 `tester/test-report.html`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-tester`
- **沉淀结构化测试证据到工作台账与机器核验准备**：
  1. **人工可读报告与台账定位符**：在对应工作台账（如 `work-ledger.yaml`）中，为当前 Spec 追加物理测试证据引用（Evidence Locator），指向 `tester/test-report.html`：
     ```yaml
     evidence:
       - locator: "spec/versions/<version>/specs/<spec-dir>/tester/test-report.html"
         summary: "全量测试通过：{通过用例数}/{总用例数}，退出码 0"
     ```
  2. **AWR 0.5.0 机器核验准备（双轨制）**：
     `awr work prepare-completion` 强校验 `completion.report.v1` 机器 JSON 契约（**传 HTML 报告会被拒绝报错**；**传项目外路径会被拒绝**——`--report` 只接受项目根/`authorized_roots` 内路径，`/tmp` 会报 `RuleViolation` rc=1）。测试运行或自动化脚本必须在 `tester/artifacts/test-logs/<run-id>/` 同步自动派生 `completion-report.json`：
     ```json
     {
       "version": 1,
       "work_item": "<SPEC-ID>",
       "source_sha": "<40位完整Git哈希>",
       "command": "测试命令，如 bash tests/run.sh",
       "scope": ["<SPEC-ID>"],
       "verified_at": 1790000000000,
       "checks": [
         {
           "name": "TC-001",
           "passed": true,
           "details": "断言详情",
           "criteria": ["<必须与台账 acceptance 原文逐字一致（按 YAML 解析值比较，AWR 回写台账后的引号转义会使原始子串匹配假阴性）>"]
         }
       ]
     }
     ```
     然后执行机器校验与证据元数据注册（`--source-sha` 必须传 40 位完整 SHA；证据草稿一律落 `<run-id>/evidence-draft.json`，**并发场景下禁止固定共享路径**）：
     ```bash
     # 1. 验证报告契约有效性（--report 必须为项目内路径）
     PREP_OUT=$(awr work prepare-completion --report "tester/artifacts/test-logs/<run-id>/completion-report.json" --evidence-key "<SPEC-ID>/evidence/<KEY>" --source-sha <40-CHAR-SHA> <SPEC-ID> --json)

     # 2. 注册证据元数据：prepare-completion --json 的顶层草稿键名是 evidence，
     #    其中 branch 与 work 是只读回显字段，必须剔除后再传，否则报 unknown evidence input field
     EVIDENCE_DRAFT=$(printf "%s" "$PREP_OUT" | python3 -c "import sys, json
d = json.load(sys.stdin).get('evidence', {})
d.pop('branch', None); d.pop('work', None)
print(json.dumps(d))")
     echo "$EVIDENCE_DRAFT" > "tester/artifacts/test-logs/<run-id>/evidence-draft.json"
     REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
     awr evidence add --input "tester/artifacts/test-logs/<run-id>/evidence-draft.json" --expected-revision "$REV"
     ```
     *重要原则*：`spec-tester` 阶段仅完成报告校验与证据注册，**严禁在测试阶段执行 `awr work complete`**。工作项必须保持 `in_progress` 状态，以便下游 `spec-reviewer` 与 `spec-ender` 能够合法通过检查点脚本接力会话。真正的机器完工与租约释放统一由收尾阶段的 `spec-ender` 执行。
- 向 AWR 提交测试完成会话检查点：
  ```bash
  AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
  bash "$AWR_CP" --work <SPEC-ID> --agent spec-tester --digest "spec-tester: 完成测试执行，测试报告产出在 tester/test-report.html" --next-action "spec-reviewer: 进行代码与状态一致性审查"
  ```
- 若测试过程中发现的问题已验证修复，在「问题闭环记录」中把对应行状态更新为 `verified`
- 只修改「任务进度」/「问题闭环记录」，不要修改 TeamLead 控制面区块

确认方式随模式：
- `gated`：用当前运行环境的确认方式向用户确认 `tester/test-report.html`，得到放行才算完成。
- `autopilot`：由「`spec-reviewer` 强制介入并产出 `reviewer/review.html`」替代用户确认。自动驾驶下 reviewer 是唯一独立视角，因此不再可选；review 未产出前测试结论不放行。

```text
通知 TeamLead：tester/test-report.html 已完成。gated 模式等待用户确认；autopilot 模式请求启动 spec-reviewer 产出 reviewer/review.html。
```

## 与其他角色的协作

```
阶段二：spec-explorer → (explorer/exploration-report.html) → spec-tester
        spec-writer ↔ TeamLead ↔ spec-tester（接口讨论）

阶段四：spec-executor → (executor/summary.html) → spec-tester 执行测试
        spec-tester ↔ TeamLead ↔ spec-debugger（bug 修复闭环）
           发现 bug → 向 TeamLead 提交 bug handoff
           修复完成 → TeamLead 通知 spec-tester 重新验证
```

## 后续动作

阶段一完成后确认：
1. `tester/test-plan.html` 已在正确路径创建，浏览器能打开且样式生效
2. 已与 spec-writer 讨论并对齐接口边界
3. 首屏已给出验收判定口径与计划口径指标卡，**未出现覆盖率/通过率等运行结果**
4. 需求→用例→证据追溯、环境与数据、边界矩阵、准入条件、未验证风险、开发者审核关注点齐全，且图表按内容选型而非凑数
5. 已更新 `lead/team-context.md` 的「任务进度」中测试计划任务行
6. 已通知 TeamLead
7. 已提供适用方式和推荐；用户选择、依据及用例分配已记录，未选择则标明待决

阶段二完成后确认：
1. `tester/test-report.html` 已创建，结论用 `rk-verdict is-pass|is-fail`，首屏状态按统计范围分开计数
2. 每个「通过」都能指到本轮 `run-id` 下自动生成的证据；已执行但证据不足的用例保留执行事实并单列
3. 所有发现的 bug 都已由 spec-debugger 修复并重新验证
4. 关键路径日志验证、证据清单与阻塞/未执行清单已记录到 `tester/test-report.html`
5. 端侧测试审计日志已保存到当前 Spec 目录的 `tester/artifacts/test-logs/<run-id>/`（原始格式）
6. 已完成脱敏检查，未保存 token、密码、密钥或真实用户隐私
7. 已完成测试策略沉淀判断；如需新增或更新策略，已获得用户确认并维护 `references/` 和策略表
8. 已更新 `lead/team-context.md` 的「任务进度」和必要的「问题闭环记录」
9. `rk-meta` 与 `<meta name="rk:*">` 字段一致、`rk-links` 有对应反链登记、报告内无 `<style>` 与行内 `style=`
10. 已通知 TeamLead
11. 最终测试结论基于本轮在当前工作树上的实际运行，未引用上一轮结果或 `spec-executor` 的自测结论
12. 已按模式完成确认：`gated` 得到用户放行；`autopilot` 已由 `spec-reviewer` 产出 `reviewer/review.html`
13. 结论块之后已有 `rk-kpis` 和 chart / barcell / flow 之一；图有真实数据或真实状态支撑，未画占位比率；已按「结构机检」运行 `check-report.js` 退出码为 0
14. 实际测试方式、版本、覆盖范围与计划/用户选择一致；变更和证据缺口已说明

### 常见陷阱
- 直接修复 bug 或绕过 TeamLead 联系 spec-debugger（破坏协作闭环）
- `tester/test-plan.html` 验收标准不够具体（无法判断通过/失败）
- 测试计划预填覆盖率、通过率等尚未运行的结果，或把「计划可自动化数」写成「实测覆盖」
- 测试计划只列用例，没有需求→用例→证据追溯、准入条件或未验证风险，执行时才发现环境不可用
- 测试报告把未执行、阻塞、跳过混进「通过」，或引用上一轮结果充数
- 测试报告只有总数没有证据路径，失败/阻塞无法复核
- 为了满足图文比编造柱状条数值；或为了图面简洁删掉失败日志与边界证据
- 忘记在 `tester/test-report.html` 中引用 debug 文档
- 端侧测试只看界面结果，没有保存 console/network/截图等审计证据
- 关键路径没有日志或 trace id，导致失败后无法复盘
- 审计日志包含未脱敏的 token、密码、密钥或真实用户隐私
- 把可复用测试策略只写在 `tester/test-report.html`，没有沉淀到 `spec-test/references/`
- 修复循环重验后忘记更新「修复循环预算」，或在触发预算上限后仍发起新一轮 bug handoff（应停止并升级给 TeamLead）
- 迁移 HTML 时丢掉原 frontmatter 字段（必须双轨：`<meta name="rk:*">` + `.rk-meta`），或只写单向链接不补对侧反链
- 改报告忘记递增 `rk:revision` 与追加修订历史行，或漏掉 `ins`/`del` 的 `data-rev`
