# 报告画图指南

报告是给人快速做判断的。读者先看图，看不懂才去读字。所以**先决定画什么图，再写字**，文字只补图里表达不了的原因、限制和下一步。

本文是 `check-report.js`「少字多图」检查的配套说明：哪类报告必须有什么图、每种信息该用哪种图、怎么画、怎么写短。

## 1. 机检硬规则

| 规则 | 阈值 | 不满足时 |
|------|------|----------|
| 必需图 | 按 `rk:type` 见第 2 节 | 退出码 1 |
| 图文比 | 正文每 800 字至少 1 张图 | 退出码 1 |
| 单段长度 | 单个 `<p>` / `<li>` ≤ 150 字 | 退出码 1 |

- **哪些算「图」**：`rk-kpis`、`rk-flow`、`figure.rk-chart`、`figure.rk-fig`、表格里的 `rk-barcell`。每个容器算一张。
- **哪些算「正文字数」**：`<p>`、`<li>` 等叙述文字。表格、代码块、图本身、修订历史、关联产物不算。所以把罗列改成表格，正文就短了，这是允许的。
- **生效范围**：`rk:created` 在 2026-11-05 及之后的报告。历史报告不追溯，下次修订时顺手补图即可。

## 2. 每类报告画什么

先画「必需图」（机检强制），再按「常加」补充。

| 报告 | 必需图 | 画的内容 | 常加 |
|------|--------|----------|------|
| exploration-report | fig | 现状模块和调用链。要改的位置用 `c-blue`，风险点用 `c-red` | kpis：涉及文件数、风险数 |
| plan | fig + flow | fig：方案结构或数据流，新增部分用 `c-blue`；flow：实施顺序 | 改动前后对比两张 fig |
| test-plan | kpis 或 chart 或 flow | 用例按优先级或类型的分布，或测试阶段 | barcell：各模块用例数 |
| test-report | kpis + (chart 或 barcell) | kpis：通过 / 失败 / 跳过 / 覆盖率；chart：按模块的通过率或覆盖率 | fig：失败用例所在链路 |
| summary | kpis 或 flow | 任务完成数，或任务进度 | fig：最终落地结构 |
| debug | fig 或 flow | 故障链路，故障点用 `c-red`；或复现时序 | kpis：影响范围 |
| debug-fix | fig 或 flow 或 kpis | 修复前后对比，或复验结果 | — |
| review | kpis | 通过 / 不符 / 风险项计数 | barcell：每个任务的符合度 |
| update | fig 或 flow | 变更前后结构，或变更步骤 | — |
| update-summary | kpis 或 flow | 完成项与回归结果 | — |
| end-report | flow | 各阶段完成情况 | kpis：测试数、PR 状态 |
| version-plan | flow + kpis | flow：批次或里程碑；kpis：Spec 数按 feat / tech / debt / fix 分类 | fig：Spec 依赖关系 |
| release-report | kpis | 纳入 Spec 数、回归通过数、失败数 | flow：发版步骤 |
| version-end-report | kpis + (chart 或 barcell) | kpis：交付 / 延期 / 遗留；chart：目标达成率 | — |

## 3. 信息 → 图的选法

| 你想说的 | 用 | 不要用 |
|----------|----|--------|
| 3–6 个关键数字 | `rk-kpis` | 写成一句「共 42 项，通过 41 项，失败 1 项……」 |
| 几项之间比大小（通过率、耗时、覆盖率） | `rk-bar` 柱状条 | 只列数字的表格 |
| 表格里某一列是进度或占比 | `rk-barcell` 迷你条 | 新开一张图 |
| 先后顺序（阶段、批次、步骤） | `rk-flow` | 编号列表 |
| 谁调用谁、数据怎么流、模块怎么分 | `figure.rk-fig` SVG | 大段文字描述关系 |
| 改动前后对比 | 两张并排的 fig，或一张 fig 里用颜色区分 | 先写旧的再写新的两段文字 |
| 多个对象的多维属性 | 表格 | 图（图的维度不够） |
| 原因、限制、取舍 | 文字，一句一个点 | 图 |

## 4. 组件写法

所有颜色只通过 class 设置：不写行内 `style=`，SVG 里不写 `fill="#…"` / `stroke="#…"`（机检拦截）。颜色语义固定：

| 颜色 | class 后缀 | 含义 |
|------|-----------|------|
| 蓝 | `c-blue` / `is-current` / `is-info` | 本次新增或改动、进行中 |
| 绿 | `c-green` / `is-pass` / `is-done` | 通过、已完成、正常 |
| 琥珀 | `c-amber` / `is-warn` | 待定、警告、部分完成 |
| 红 | `c-red` / `is-fail` / `is-blocked` | 失败、故障点、风险 |
| 灰 | `c-muted` / `is-muted` / 默认 | 不变、历史、未开始 |

同一张图最多用 3 种强调色。没有语义的节点用默认的 `node`（白底灰边），不要为了好看上色。

### 4.1 指标卡 `rk-kpis`

```html
<div class="rk-kpis">
  <div class="rk-kpi is-pass"><div class="k">通过</div><div class="v">42</div></div>
  <div class="rk-kpi is-fail"><div class="k">失败</div><div class="v">1</div><div class="n">T-043</div></div>
  <div class="rk-kpi"><div class="k">覆盖率</div><div class="v">96%</div></div>
</div>
```

- `k` 是小标签，`v` 是数值，`n` 是可选注释（≤ 12 字）。
- 3–6 张卡最合适，超过 6 张就拆成两组，或改用柱状条。
- `v` 只放数字和单位，不放句子。

### 4.2 柱状条 `rk-bar` / 迷你条 `rk-barcell`

```html
<figure class="rk-chart">
  <div class="rk-bar"><span class="k">src/auth/token.ts</span><meter class="is-pass" min="0" max="100" value="99"></meter><span class="v">99%</span></div>
  <div class="rk-bar"><span class="k">src/auth/errors.ts</span><meter class="is-warn" min="0" max="100" value="81"></meter><span class="v">81%</span></div>
  <figcaption>行覆盖率，来源：tester/artifacts/test-logs/coverage.txt</figcaption>
</figure>

<!-- 表格单元格里 -->
<td class="rk-barcell"><meter class="is-pass" min="0" max="12" value="7"></meter>7 / 12</td>
```

- 数值写在 `<meter>` 的 `value` / `max` 上，宽度自动算，不要用 `style="width:…"`。
- 按数值从大到小排，读者一眼看出最差的是哪个；有阈值时，低于阈值的用 `is-warn` 或 `is-fail`。
- 超过 10 条时只画最差的几条，其余放进表格。

### 4.3 流程条 `rk-flow`

```html
<ol class="rk-flow">
  <li class="is-done"><b>探索</b><span>exploration-report r1</span></li>
  <li class="is-current"><b>方案</b><span>plan r3 评审中</span></li>
  <li class="is-blocked"><b>实现</b><span>等上游接口</span></li>
  <li><b>测试</b><span>未开始</span></li>
</ol>
```

- 3–7 步。`<b>` 里放 2–6 字的阶段名，`<span>` 里放 ≤ 16 字的状态。
- 窄屏下自动变成竖排，不用另外处理。

### 4.4 结构图 `figure.rk-fig`（内联 SVG）

可用的 class：

| class | 用途 |
|-------|------|
| `node` | 普通节点（白底灰边） |
| `c-blue` / `c-green` / `c-amber` / `c-red` / `c-muted` | 带语义的节点（浅底 + 语义色边） |
| `solid c-…` | 实心填充，用于小圆点、图例色块 |
| `edge` | 连线；`edge dash` 为虚线，表示可选、异步或计划中 |
| `arrow` | 箭头，放在 `<marker>` 里 |
| `lbl` | 次要文字，如连线上的说明、坐标刻度 |
| `axis` / `grid` | 坐标轴、网格线 |

```html
<figure class="rk-fig">
  <svg viewBox="0 0 560 90" role="img" aria-label="登录请求经认证服务写入会话存储">
    <defs><marker id="ah1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path class="arrow" d="M0 0 L8 4 L0 8 z"/></marker></defs>
    <rect class="node" x="1" y="20" width="140" height="50" rx="8"/>
    <text x="71" y="50" text-anchor="middle">浏览器</text>
    <path class="edge" d="M141 45 H207" marker-end="url(#ah1)"/>
    <text class="lbl" x="175" y="36" text-anchor="middle">POST /login</text>
    <rect class="c-blue" x="209" y="20" width="140" height="50" rx="8"/>
    <text x="279" y="50" text-anchor="middle">认证服务</text>
    <path class="edge" d="M349 45 H415" marker-end="url(#ah1)"/>
    <rect class="c-red" x="417" y="20" width="140" height="50" rx="8"/>
    <text x="487" y="50" text-anchor="middle">会话存储</text>
  </svg>
  <figcaption>图 1：蓝色为本次改动，红色为故障点（并发写入覆盖）</figcaption>
</figure>

**SVG 画法要点**

- **网格**：节点宽 140、高 44–50，横向间距 60–70，纵向间距 40。坐标取 10 的倍数，对齐容易，改起来也方便。
- **viewBox**：宽 ≤ 760（样式会把 SVG 限制在 760px 内），高按行数算，约为 `行数 × 90`。不写 `width` / `height` 属性，图会随容器缩放。
- **文字**：字号用默认的 12px，节点文字 ≤ 8 个汉字，放不下就换行写成两个 `<text>`，或者把细节挪进图注。
- **布局方向**：调用链、数据流从左往右；层级（前端 / 服务 / 存储）从上往下；状态机画成环形或网格。
- **marker id**：同一页面有多张图时，id 按 `ah1`、`ah2`… 编号，不要重复。
- **无障碍**：`<svg>` 上必须写 `role="img"` 和 `aria-label`，用一句话说清图在表达什么。
- **复杂度上限**：单张图 ≤ 12 个节点。超过就拆成「总览 + 局部」两张。

常用画法：

| 场景 | 画法 |
|------|------|
| 调用链 / 数据流 | 一行节点 + 箭头，连线上用 `lbl` 写接口名或数据名 |
| 分层架构 | 每层一行，行左边用 `lbl` 写层名；跨层调用画竖向箭头 |
| 改动前后 | 左右两组节点，中间用 `lbl` 写「→」；变化的节点用 `c-blue`，删除的用 `c-muted` 并配 `edge dash` |
| 故障定位 | 正常链路用 `node`，故障点用 `c-red`，在旁边用 `lbl` 写现象 |
| 状态机 | 状态用圆角矩形，转移用箭头；异常转移用 `c-red` 节点 |
| 依赖关系（Spec、模块） | 被依赖方在左或上；阻塞项用 `c-red`，已完成项用 `c-green` |

## 5. 写短的方法

1. **结论先行**：`rk-verdict` 里写一句话结论，紧跟着放必需图。读者看完前两块就能做判断。
2. **数字进指标卡**：一句话里出现 2 个以上的数字，就改成 `rk-kpis` 或柱状条。
3. **罗列进表格**：3 个以上并列对象、每个对象有 2 个以上属性，就改成表格。
4. **顺序进流程条**：「先……再……然后……」改成 `rk-flow`。
5. **关系进结构图**：一段话里出现 3 个以上「调用 / 依赖 / 写入」这类关系，就画 fig。
6. **一段一个点**：每个 `<p>` 只讲一件事，≤ 150 字。超过时拆成要点列表，每条 ≤ 40 字。
7. **不复述图**：图里已经有的数字和关系，文字里不再写。文字只写图表达不了的：为什么、例外、限制、下一步。
8. **证据给路径**：日志、截图、命令输出给出相对路径，或用 `<span class="rk-ref">` 指到文件行号，不要大段粘贴。

**改写示例**

改前（198 字，0 张图）：

> 本轮共执行 43 项用例，其中单元测试 38 项全部通过，集成测试 4 项全部通过，并发复验 1 项在 debug-001-fix 之后通过。行覆盖率方面，token.ts 为 99%，session.ts 为 97%，errors.ts 为 81%，主要缺口在错误分支。测试按照先单元、再集成、最后并发复验的顺序进行，目前等待 spec-reviewer 审查……

改后（1 句话 + 3 张图）：

```html
<section class="rk-verdict is-pass"><div class="rk-verdict-label">测试结论</div><p>43 项全部通过；errors.ts 错误分支覆盖不足，不阻塞归档。</p></section>
<div class="rk-kpis">…通过 43 / 失败 0 / 覆盖率 96%…</div>
<ol class="rk-flow">…单元 → 集成 → 并发复验 → 审查…</ol>
<figure class="rk-chart">…token.ts 99% / session.ts 97% / errors.ts 81%…</figure>
```

## 6. 自查清单

- [ ] 结论块后面紧跟着本类报告的必需图
- [ ] 每 800 字正文至少一张图，单段 ≤ 150 字
- [ ] 图只用 class 上色，同一张图强调色不超过 3 种
- [ ] 每张 `figure` 都有 `figcaption`，写明数据来源或读法
- [ ] SVG 有 `role="img"` 和 `aria-label`，marker id 不重复
- [ ] 文字没有复述图里的数字
- [ ] `node html-report/scripts/check-report.js <报告>` 退出码为 0

完整示例见 [`example/test-report.html`](../example/test-report.html)。
