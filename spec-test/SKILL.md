---
disable-model-invocation: true
name: spec-test
description: >
  当角色 spec-tester 需要为 Spec 撰写 tester/test-plan.html、在实现完成后执行测试并产出 tester/test-report.html，
  或在 spec-debugger 修复后重新验证时使用。若测试对象属于 Web 前端、端侧应用、API、CLI 等具体场景，
  先选择对应 references 测试策略；不要用于普通代码实现或 bug 修复。
---

# Spec Test

## 运行契约

> 进入核心原则前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | `explorer/exploration-report.html`、`writer/plan.html`、`executor/summary.html`、命中的场景测试策略、`html-report` skill 的报告契约 |
| 权限 | 写 `tester/test-plan.html` / `tester/test-report.html`、采集 `tester/artifacts/` 证据、可调整测试脚本/配置；不直接修复 bug、不改业务实现 |
| 验证 | 验收标准具体可判定、关键路径有可审计证据、证据由测试运行自动生成且已脱敏、报告 HTML 符合 `html-report` 规范 |
| 停止 | 测试计划/报告定稿且通过用户确认即停止；修复循环受「修复循环预算」约束，触发 「最大轮数」 或 「最大无进展轮数」 时停止发起新一轮 handoff |
| 升级 | 发现 bug 时向 TeamLead 提交 handoff（不自行修复）；修复循环触上限或证据无法采集时，交回 TeamLead 由用户决策 |

## 核心原则

1. **两个阶段，两个产出**：Spec 创建阶段 → `tester/test-plan.html`；测试执行阶段 → `tester/test-report.html`
2. **不直接修复 bug**：发现 bug 时向 TeamLead 提交 bug handoff，由 TeamLead 启动 spec-debugger
3. **通过 TeamLead 与 spec-writer 协作**：Spec 阶段需讨论接口边界和异常情况，确保测试覆盖完整
4. **关键路径可观测**：测试必须验证系统关键路径有日志、trace id、事件或其他可审计证据
5. **证据归属 tester**：端侧测试和关键路径测试的审计日志必须保存在当前 Spec 目录的 `tester/artifacts/test-logs/<run-id>/`（原始格式，不转 HTML）
6. **证据必须自动采集**：`tester/artifacts/test-logs/<run-id>/` 下的日志、JSON、trace、录屏和截图必须由测试脚本、浏览器自动化、服务日志采集或命令输出生成；Agent 不得手写、补写或伪造这些证据文件内容
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

### 步骤 3：撰写 tester/test-plan.html

撰写前先读 `html-report` skill（骨架、frontmatter 双轨等价字段、双向关联、修订标记与 Decision Log 联动规范）。在当前 Spec 目录下创建 `tester/test-plan.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>测试计划 - {任务描述}</title>

<!-- 原 frontmatter 的机器可读等价物，字段一一对应，不可省略 -->
<meta name="rk:title"       content="测试计划">
<meta name="rk:type"        content="test-plan">
<meta name="rk:spec-dir"    content="spec/{分类目录}/{YYYYMMDD-HHMM-中文任务描述}">
<meta name="rk:role"        content="spec-tester">
<meta name="rk:status"      content="未确认">
<meta name="rk:created"     content="YYYY-MM-DD">
<meta name="rk:updated"     content="YYYY-MM-DD">
<meta name="rk:revision"    content="1">
<meta name="rk:git-branch"  content="{git_branch}">
<meta name="rk:base-branch" content="main">
<meta name="rk:pr-url"      content="">
<meta name="rk:tags"        content="spec,test-plan">
<!-- 关联声明，等价原 frontmatter 的 plan: 字段 -->
<link rel="rk-plan"   href="../writer/plan.html">
<link rel="rk-ledger" href="../../lead/team-context.md">

<link rel="stylesheet" href="../../../../html-report/assets/rk-report.css">
<script defer src="../../../../html-report/assets/rk-report.js"></script>
</head>
<body>

<header class="rk-head">
  <h1>测试计划：{任务描述}</h1>
  <!-- 人可读镜像，字段与上方 meta 一致 -->
  <div class="rk-meta">
    <span><b>类型</b> test-plan</span>
    <span><b>Spec</b> <code>spec/{分类目录}/{YYYYMMDD-HHMM-中文任务描述}</code></span>
    <span><b>角色</b> spec-tester</span>
    <span><b>状态</b> 未确认</span>
    <span><b>分支</b> <code>{git_branch}</code> ← <code>main</code></span>
    <span><b>PR</b> —</span>
    <span><b>创建</b> YYYY-MM-DD</span>
    <span><b>修订</b> r1（YYYY-MM-DD）</span>
  </div>
</header>

<nav class="rk-revbar"></nav>

<section class="rk-verdict">
  <div class="rk-verdict-label">验收判定口径</div>
  <p>{一句话说清本 Spec 什么条件算通过、什么条件算不通过}</p>
</section>

<!-- 修订历史固定 5 列。「原因」列源于实质取舍时引用账本 Decision Log 编号（如：按 D-003 ⋯⋯）；
     纯笔误/措辞/补充直接写清，不要编造决策编号。决策过程正文留在账本，不复制进报告。 -->
<h2>修订历史</h2>
<table class="rk-revs">
  <thead><tr><th>修订</th><th>日期</th><th>修改人</th><th>改了什么</th><th>原因</th></tr></thead>
  <tbody>
    <tr><td>r1</td><td>YYYY-MM-DD</td><td>spec-tester</td><td>初版</td><td>—</td></tr>
    <tr><td>r2</td><td>YYYY-MM-DD</td><td>spec-tester</td><td>{补 TC-0XX 并发用例}</td><td>{按 D-003（多实例部署需共享缓存）}</td></tr>
  </tbody>
</table>
```

**必须包含的章节**（接在骨架 `<body>` 里）：

```html
<h2>验收标准</h2>
<p>{通过/不通过的判定标准，要具体可衡量}</p>

<h2>测试用例</h2>
<table>
  <thead><tr><th>用例编号</th><th>描述</th><th>输入</th><th>预期输出</th><th>边界条件</th></tr></thead>
  <tbody>
    <tr><td>TC-001</td><td>{描述}</td><td>{输入}</td><td>{预期}</td><td>{边界}</td></tr>
  </tbody>
</table>

<h2>用户使用场景（端侧/E2E 适用）</h2>
<table>
  <thead><tr><th>场景编号</th><th>用户角色</th><th>业务目标</th><th>操作路径</th><th>关键断言</th><th>证据</th></tr></thead>
  <tbody>
    <tr><td>US-001</td><td>{角色}</td><td>{目标}</td><td>{点击/输入/跳转路径}</td><td>{UI/数据/日志断言}</td><td>{截图/console/network/backend log}</td></tr>
  </tbody>
</table>

<h2>覆盖率要求</h2>
<ul>
  <li>代码覆盖率：&gt; 80%</li>
  <li>功能覆盖率：{具体要求}</li>
</ul>

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
<p>{依赖、配置、数据准备}</p>

<!-- 关联产物：双向。谁新建关联谁负责补对侧反链 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../writer/plan.html" data-rk-link="plan">设计方案</a></li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
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

### 步骤 1：读取必要文档

- `writer/plan.html`：了解设计方案
- `tester/test-plan.html`：测试用例和验收标准
- `executor/summary.html`：了解实现细节
- `html-report` skill：报告骨架、frontmatter 双轨等价字段、双向关联、修订标记与 Decision Log 联动规范

### 步骤 2：执行测试用例

按 `tester/test-plan.html` 的用例逐一执行，记录结果。

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

### 步骤 3：发现 Bug 时的处理

**重要**：不直接修复，向 TeamLead 提交 bug handoff。

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「问题闭环记录」中追加或更新该问题行
- 「分类」一般为 `bug`；若是测试环境/依赖问题而非产品缺陷，用 `env` / `dependency`
- 「发现者」 写 `spec-tester`
- `owner` 建议写 `spec-debugger`
- `problem` 简述现象，「关联产物」 引用测试证据路径或即将创建的 debug 文档
- 「状态」标记为 `open`
- 「更新者」 写 `spec-tester`
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

在当前 Spec 目录下创建 `tester/test-report.html`。测试报告最需要重点突出，结论用 `rk-verdict is-pass|is-fail`，通过/失败/覆盖率用 `rk-kpis` 指标卡：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>测试报告 - {任务描述}</title>

<!-- 原 frontmatter 的机器可读等价物，字段一一对应，不可省略 -->
<meta name="rk:title"       content="测试报告">
<meta name="rk:type"        content="test-report">
<meta name="rk:spec-dir"    content="spec/{分类目录}/{YYYYMMDD-HHMM-中文任务描述}">
<meta name="rk:role"        content="spec-tester">
<meta name="rk:status"      content="未确认">
<meta name="rk:created"     content="YYYY-MM-DD">
<meta name="rk:updated"     content="YYYY-MM-DD">
<meta name="rk:revision"    content="1">
<meta name="rk:git-branch"  content="{git_branch}">
<meta name="rk:base-branch" content="main">
<meta name="rk:pr-url"      content="">
<meta name="rk:tags"        content="spec,test-report">
<!-- 关联声明，等价原 frontmatter 的 plan: / test-plan: / debug: 字段 -->
<link rel="rk-plan"      href="../writer/plan.html">
<link rel="rk-test-plan" href="test-plan.html">
<link rel="rk-debug"     href="../debugger/debug-001.html">
<link rel="rk-ledger"    href="../../lead/team-context.md">

<link rel="stylesheet" href="../../../../html-report/assets/rk-report.css">
<script defer src="../../../../html-report/assets/rk-report.js"></script>
</head>
<body>

<header class="rk-head">
  <h1>测试报告：{任务描述}</h1>
  <!-- 人可读镜像，字段与上方 meta 一致 -->
  <div class="rk-meta">
    <span><b>类型</b> test-report</span>
    <span><b>Spec</b> <code>spec/{分类目录}/{YYYYMMDD-HHMM-中文任务描述}</code></span>
    <span><b>角色</b> spec-tester</span>
    <span><b>状态</b> 未确认</span>
    <span><b>分支</b> <code>{git_branch}</code> ← <code>main</code></span>
    <span><b>PR</b> —</span>
    <span><b>创建</b> YYYY-MM-DD</span>
    <span><b>修订</b> r1（YYYY-MM-DD）</span>
  </div>
</header>

<nav class="rk-revbar"></nav>

<!-- 测试结论：通过用 is-pass，不通过用 is-fail -->
<section class="rk-verdict is-pass">
  <div class="rk-verdict-label">测试结论</div>
  <p>{一句话结论：X 项用例全部通过 / 仍有 X 项失败及影响范围}</p>
</section>

<!-- 修订历史固定 5 列。「原因」列源于实质取舍时引用账本 Decision Log 编号（如：按 D-003 ⋯⋯）；
     纯笔误/措辞/补充直接写清，不要编造决策编号。决策过程正文留在账本，不复制进报告。 -->
<h2>修订历史</h2>
<table class="rk-revs">
  <thead><tr><th>修订</th><th>日期</th><th>修改人</th><th>改了什么</th><th>原因</th></tr></thead>
  <tbody>
    <tr><td>r1</td><td>YYYY-MM-DD</td><td>spec-tester</td><td>初版</td><td>—</td></tr>
    <tr><td>r2</td><td>YYYY-MM-DD</td><td>spec-tester</td><td>{TC-0XX 由失败改为通过，更新结论}</td><td>{debug-001-fix 修复后复验}</td></tr>
  </tbody>
</table>
```

**必须包含的章节**（接在骨架 `<body>` 里）：

```html
<h2>测试概况</h2>
<div class="rk-kpis">
  <div class="rk-kpi is-pass"><div class="v">{X}</div><div class="k">通过</div></div>
  <div class="rk-kpi is-fail"><div class="v">{X}</div><div class="k">失败</div></div>
  <div class="rk-kpi"><div class="v">{X}</div><div class="k">用例总数</div></div>
  <div class="rk-kpi"><div class="v">{X}%</div><div class="k">覆盖率</div></div>
</div>
<p>失败中已修复：{X}</p>

<h2>用例结果</h2>
<table>
  <thead><tr><th>用例编号</th><th>场景</th><th>结果</th></tr></thead>
  <tbody>
    <tr><td>TC-001</td><td>{场景}</td><td>通过</td></tr>
    <tr><td>TC-0XX</td><td>{场景}</td><td><del class="rk-del" data-rev="2">失败</del><ins class="rk-ins" data-rev="2">通过</ins></td></tr>
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
<ul>
  <li>Run ID：YYYYMMDD-HHMM-run-XXX</li>
  <li>审计日志目录：<code>tester/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/</code>（原始格式）</li>
  <li>测试账号/角色：{脱敏后的账号或角色}</li>
  <li>设备/浏览器/App 版本：{端侧测试必填}</li>
</ul>

<h3>关键路径日志验证</h3>
<table>
  <thead><tr><th>关键路径</th><th>关联用例</th><th>证据类型</th><th>证据位置/trace id</th><th>结果</th></tr></thead>
  <tbody>
    <tr><td>{状态流转/权限边界/数据写入等}</td><td>TC-XXX</td><td>日志/trace/事件/截图</td><td><code>tester/artifacts/test-logs/...</code> 或 trace id</td><td>通过/失败</td></tr>
  </tbody>
</table>

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
  <li><a href="../debugger/debug-001.html" data-rk-link="debug">{Bug 标题}</a> — 已修复并复验通过</li>
</ul>
<div class="rk-cal warn"><div class="t">注意</div><p>{遗留问题、覆盖率缺口、未能自动采集的证据及其风险}</p></div>

<!-- 关联产物：双向。谁新建关联谁负责补对侧反链 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../writer/plan.html" data-rk-link="plan">设计方案</a></li>
  <li><a href="test-plan.html" data-rk-link="test-plan">测试计划</a></li>
  <li><a href="../debugger/debug-001.html" data-rk-link="debug">问题修复 debug-001</a></li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
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

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-tester 的测试执行任务行
- 「状态」标记为 `done` 或 `blocked`（如仍有未解决问题）
- 「产物」指向 `tester/test-report.html`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-tester`
- 若测试过程中发现的问题已验证修复，在「问题闭环记录」中把对应行状态更新为 `verified`
- 只修改「任务进度」/「问题闭环记录」，不要修改 TeamLead 控制面区块

```text
通知 TeamLead：tester/test-report.html 已完成，等待用户确认。
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
3. 已更新 `lead/team-context.md` 的「任务进度」中测试计划任务行
4. 已通知 TeamLead

阶段二完成后确认：
1. `tester/test-report.html` 已创建，包含所有测试结果，结论用 `rk-verdict is-pass|is-fail`、概况用 `rk-kpis`
2. 所有发现的 bug 都已由 spec-debugger 修复并重新验证
3. 关键路径日志验证已记录到 `tester/test-report.html`
4. 端侧测试审计日志已保存到当前 Spec 目录的 `tester/artifacts/test-logs/<run-id>/`（原始格式）
5. 已完成脱敏检查，未保存 token、密码、密钥或真实用户隐私
6. 已完成测试策略沉淀判断；如需新增或更新策略，已获得用户确认并维护 `references/` 和策略表
7. 已更新 `lead/team-context.md` 的「任务进度」和必要的「问题闭环记录」
8. `rk-meta` 与 `<meta name="rk:*">` 字段一致、`rk-links` 有对应反链登记、报告内无 `<style>` 与行内 `style=`
9. 已通知 TeamLead

### 常见陷阱
- 直接修复 bug 或绕过 TeamLead 联系 spec-debugger（破坏协作闭环）
- `tester/test-plan.html` 验收标准不够具体（无法判断通过/失败）
- 忘记在 `tester/test-report.html` 中引用 debug 文档
- 端侧测试只看界面结果，没有保存 console/network/截图等审计证据
- 关键路径没有日志或 trace id，导致失败后无法复盘
- 审计日志包含未脱敏的 token、密码、密钥或真实用户隐私
- 把可复用测试策略只写在 `tester/test-report.html`，没有沉淀到 `spec-test/references/`
- 修复循环重验后忘记更新「修复循环预算」，或在触发预算上限后仍发起新一轮 bug handoff（应停止并升级给 TeamLead）
- 迁移 HTML 时丢掉原 frontmatter 字段（必须双轨：`<meta name="rk:*">` + `.rk-meta`），或只写单向链接不补对侧反链
- 改报告忘记递增 `rk:revision` 与追加修订历史行，或漏掉 `ins`/`del` 的 `data-rev`
