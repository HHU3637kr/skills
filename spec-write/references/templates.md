# Spec 文档模板

`writer/plan.html` 的正文片段模板。按文档类型选一个，填具体信息，删掉不需要的部分。

- 完整 HTML 骨架（DOCTYPE、`<meta name="rk:*">` frontmatter 等价字段、`<link rel="rk-*">` 关联声明、样式引用、`rk-head` 报告头、`rk-revbar`、修订历史表）见 [plan-template.html](plan-template.html)，直接复制该文件再替换正文。
- 组件、frontmatter 双轨等价与双向关联规范以 `html-report` skill 为唯一权威源，写之前先读。
- 下面每段都是插进骨架 `<body>` 里的正文片段，不要在报告里写 `<style>` 或行内 `style=`。
- 每个片段末尾的「关联产物」是双向的：正向写进 `rk-links`（同时在 `<head>` 补 `<link rel="rk-*">`），反向写进 `rk-backlinks`；对侧报告未创建就标注（待创建），等它产出后补齐反链。

---

## 1. 功能设计模板

```html
<h1>{功能名称}设计方案</h1>

<h2>1. 概述</h2>
<h3>1.1 背景</h3>
<p>{为什么需要这个功能}</p>
<h3>1.2 目标</h3>
<ol><li>{目标 1}</li><li>{目标 2}</li></ol>
<h3>1.3 范围</h3>
<p><b>包含</b></p>
<ul><li>{功能点 1}</li></ul>
<p><b>不包含</b></p>
<ul><li>{不在此次实现的功能}</li></ul>

<h2>2. 需求分析</h2>
<h3>2.1 功能需求</h3>
<table>
  <thead><tr><th>编号</th><th>需求</th><th>输入</th><th>输出</th><th>业务规则</th></tr></thead>
  <tbody><tr><td>FR-001</td><td>{需求名称}</td><td>{输入项}</td><td>{输出项}</td><td>{规则 1}</td></tr></tbody>
</table>
<h3>2.2 非功能需求</h3>
<ul>
  <li><b>性能要求</b>{响应时间、吞吐量}</li>
  <li><b>可靠性要求</b>{可用性、容错性}</li>
</ul>

<h2>3. 设计方案</h2>
<h3>3.1 架构设计</h3>
<p>{整体架构描述}</p>
<h3>3.2 数据模型</h3>
<pre><code>{Pydantic/数据库模型定义}</code></pre>
<h3>3.3 接口设计</h3>
<p>{方法签名、参数、返回值、异常}，代码位置写 <span class="rk-ref">src/path/file.ts:88</span>。</p>
<div class="rk-cal key"><div class="t">关键决策</div><p>{选了哪个方案、被否决项、理由}</p></div>

<h2>4. 执行模式</h2>
<p><b>推荐模式</b>单 Agent（single-agent）</p>
<p><b>选择理由</b>{具体理由}</p>

<h2>5. 实现步骤</h2>
<ol>
  <li>{阶段 1：基础实现}</li>
  <li>{阶段 2：功能完善}</li>
  <li>{阶段 3：测试和优化}</li>
</ol>

<h2>6. 验收关注点</h2>
<ul>
  <li>{需要 spec-tester 在 tester/test-plan.html 中覆盖的关键验收点}</li>
  <li>{关键边界条件、失败路径、日志/审计要求}</li>
</ul>

<h2>7. 风险和依赖</h2>
<table>
  <thead><tr><th>风险</th><th>影响</th><th>概率</th><th>缓解措施</th></tr></thead>
  <tbody><tr><td>{风险 1}</td><td>高/中/低</td><td>高/中/低</td><td>{措施}</td></tr></tbody>
</table>
<div class="rk-cal risk"><div class="t">风险</div><p>{最需要用户提前知情的一条}</p></div>

<!-- 关联产物：双向。head 里同步 <link rel="rk-*"> 声明 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../explorer/exploration-report.html" data-rk-link="exploration">探索报告</a></li>
  <li><a href="../tester/test-plan.html" data-rk-link="test-plan">测试计划</a>（待创建）</li>
  <li><a href="../executor/summary.html" data-rk-link="summary">实现总结</a>（待创建）</li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../tester/test-plan.html" data-rk-backlink="test-plan">测试计划</a>（待创建）</li>
  <li><a href="../executor/summary.html" data-rk-backlink="summary">实现总结</a>（待创建）</li>
  <li><a href="../reviewer/review.html" data-rk-backlink="review">审查报告</a>（待创建）</li>
</ul>
```

---

## 2. API 规范模板

```html
<h1>{API 名称} 接口规范</h1>

<h2>1. 概述</h2>
<ul>
  <li>API 版本：v1.0</li>
  <li>基础路径：<code>/api/v1</code></li>
  <li>认证方式：{JWT/API Key}</li>
</ul>
<h3>通用响应格式</h3>
<pre><code>{"code": 200, "message": "Success", "data": {}, "timestamp": "ISO8601"}</code></pre>

<h2>2. 端点定义</h2>
<h3>2.1 {端点名称}</h3>
<ul>
  <li><b>路径</b><code>/resource/{id}</code></li>
  <li><b>方法</b><code>GET</code>/<code>POST</code>/<code>PUT</code>/<code>DELETE</code></li>
  <li><b>认证</b>需要/不需要</li>
</ul>
<p><b>请求参数</b></p>
<table>
  <thead><tr><th>参数名</th><th>类型</th><th>必需</th><th>描述</th></tr></thead>
  <tbody><tr><td>id</td><td>string</td><td>是</td><td>资源 ID</td></tr></tbody>
</table>
<p><b>成功响应</b></p>
<pre><code>{JSON 示例}</code></pre>
<p><b>错误响应</b></p>
<pre><code>{JSON 示例}</code></pre>

<h2>3. 数据模型</h2>
<p>{模型字段定义表格}</p>

<h2>4. 错误码</h2>
<table>
  <thead><tr><th>错误码</th><th>描述</th><th>解决方案</th></tr></thead>
  <tbody><tr><td>E001</td><td>参数缺失</td><td>检查必需参数</td></tr></tbody>
</table>

<!-- 关联产物：双向。head 里同步 <link rel="rk-*"> 声明 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../executor/summary.html" data-rk-link="summary">实现总结</a>（待创建）</li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../executor/summary.html" data-rk-backlink="summary">实现总结</a>（待创建）</li>
  <li><a href="../reviewer/review.html" data-rk-backlink="review">审查报告</a>（待创建）</li>
</ul>
```

---

## 3. 数据模型设计模板

```html
<h1>{模型名称}数据模型设计</h1>

<h2>1. 概述</h2>
<ul>
  <li>模型用途：{应用场景}</li>
  <li>设计原则：{列出}</li>
</ul>

<h2>2. 数据模型定义</h2>
<h3>2.1 核心模型</h3>
<pre><code>class ModelName(BaseModel):
    id: str = Field(description="唯一标识符，系统生成")
    name: str = Field(description="名称，Agent 填写")</code></pre>
<p><b>字段说明</b></p>
<table>
  <thead><tr><th>字段名</th><th>类型</th><th>必需</th><th>填写方</th><th>描述</th></tr></thead>
  <tbody><tr><td>id</td><td>str</td><td>是</td><td>系统</td><td>唯一标识符</td></tr></tbody>
</table>
<p><b>数据流转</b>{创建 → 更新 → 完成的流转描述}</p>

<h2>3. 关系模型</h2>
<p>{模型关系 + 关系说明}</p>

<h2>4. 数据验证规则</h2>
<p>{字段验证 + 业务规则}</p>

<h2>5. 数据库映射</h2>
<pre><code>{表结构 SQL + 索引设计}</code></pre>

<!-- 关联产物：双向。head 里同步 <link rel="rk-*"> 声明 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../executor/summary.html" data-rk-link="summary">实现总结</a>（待创建）</li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../executor/summary.html" data-rk-backlink="summary">实现总结</a>（待创建）</li>
  <li><a href="../reviewer/review.html" data-rk-backlink="review">审查报告</a>（待创建）</li>
</ul>
```

---

## 4. 架构设计模板

```html
<h1>{系统/模块}架构设计</h1>

<h2>1. 概述</h2>
<ul>
  <li>背景：{设计动机}</li>
  <li>目标：{列出}</li>
  <li>设计原则：{列出}</li>
</ul>

<h2>2. 系统架构</h2>
<h3>2.1 整体架构</h3>
<pre><code>{ASCII 架构图}</code></pre>
<h3>2.2 层次说明</h3>
<p>{各层职责、技术栈、主要组件}</p>

<h2>3. 组件设计</h2>
<p>{各组件职责、接口、依赖}</p>

<h2>4. 数据流</h2>
<pre><code>{主要数据流 + 步骤说明}</code></pre>

<h2>5. 技术选型</h2>
<table>
  <thead><tr><th>技术领域</th><th>选型</th><th>理由</th></tr></thead>
  <tbody><tr><td>Web 框架</td><td>FastAPI</td><td>高性能、类型安全</td></tr></tbody>
</table>
<div class="rk-cal key"><div class="t">关键决策</div><p>{选型分叉与被否决项}</p></div>

<h2>6. 性能与安全</h2>
<ul>
  <li>性能目标：{响应时间、并发、吞吐量}</li>
  <li>安全措施：{列出}</li>
</ul>

<!-- 关联产物：双向。head 里同步 <link rel="rk-*"> 声明 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../executor/summary.html" data-rk-link="summary">实现总结</a>（待创建）</li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../executor/summary.html" data-rk-backlink="summary">实现总结</a>（待创建）</li>
  <li><a href="../reviewer/review.html" data-rk-backlink="review">审查报告</a>（待创建）</li>
</ul>
```

---

## 5. 重构方案模板

```html
<h1>{模块/功能}重构方案</h1>

<h2>1. 概述</h2>
<ul>
  <li>重构背景：{为什么需要重构}</li>
  <li>当前问题：{列出}</li>
  <li>重构目标：{列出}</li>
</ul>

<h2>2. 现状分析</h2>
<p>{当前实现描述}</p>
<table>
  <thead><tr><th>问题</th><th>影响</th><th>触发场景</th></tr></thead>
  <tbody><tr><td>{问题}</td><td>{影响}</td><td>{场景}</td></tr></tbody>
</table>

<h2>3. 重构方案</h2>
<p>{目标架构描述}</p>
<pre><code>{代码示例}</code></pre>
<p><b>改进点</b></p>
<ul><li>{改进点}</li></ul>

<h2>4. 实施计划</h2>
<ol>
  <li>{阶段 1：准备工作}</li>
  <li>{阶段 2：核心重构}</li>
  <li>{阶段 3：测试验证}</li>
  <li>{阶段 4：部署上线}</li>
</ol>
<p><b>回滚方案</b>{描述}</p>

<h2>5. 风险评估</h2>
<table>
  <thead><tr><th>风险</th><th>影响</th><th>概率</th><th>缓解措施</th></tr></thead>
  <tbody><tr><td>{风险 1}</td><td>高/中/低</td><td>高/中/低</td><td>{措施}</td></tr></tbody>
</table>
<div class="rk-cal warn"><div class="t">注意</div><p>{兼容性、迁移窗口、需要外部配合的事项}</p></div>

<!-- 关联产物：双向。head 里同步 <link rel="rk-*"> 声明 -->
<h2>关联产物</h2>
<h3>本报告引用</h3>
<ul class="rk-links">
  <li><a href="../executor/summary.html" data-rk-link="summary">实现总结</a>（待创建）</li>
  <li><a href="../../lead/team-context.md" data-rk-link="ledger">运行账本</a></li>
</ul>
<h3>引用本报告</h3>
<ul class="rk-backlinks">
  <li><a href="../executor/summary.html" data-rk-backlink="summary">实现总结</a>（待创建）</li>
  <li><a href="../reviewer/review.html" data-rk-backlink="review">审查报告</a>（待创建）</li>
</ul>
```
