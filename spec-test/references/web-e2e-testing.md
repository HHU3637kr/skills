# Web 端侧 E2E 测试策略

## 何时使用

当 Spec 涉及 Web 页面、浏览器交互、前端路由、表单、登录态、权限、前后端联动、异步任务或用户可见工作流时使用本策略。

不要用于纯后端 API、纯 CLI、纯文档变更；这些场景应使用对应测试策略或常规测试计划。

## tester/test-plan.html 必须补充

### 用户使用场景

用真实用户目标组织 E2E 用例，而不是只列接口或组件：

| 场景编号 | 用户角色 | 业务目标 | 前置数据 | 操作路径 | 关键断言 |
|---------|----------|----------|----------|----------|----------|
| US-001 | 普通用户/管理员 | 完成某业务动作 | 测试账号、初始数据 | 打开页面 → 点击 → 输入 → 提交 → 查看结果 | UI 状态、数据变化、日志证据 |

要求：
- 至少覆盖 1 条主成功路径
- 至少覆盖 1 条失败/拒绝路径
- 涉及权限时覆盖不同角色
- 涉及异步任务时覆盖提交后状态刷新或轮询结果

### 浏览器自动化计划

按 `spec-test`「推荐并确认测试方式」执行：提供常规浏览器自动化、agent-qa 辅助、组合使用三个选项，说明真实适用条件及推荐，由用户选择；未确认不得擅自切换。常规方式优先复用项目已有 E2E 工具（Playwright / Cypress / Vitest browser 等），没有现成框架时使用当前运行环境可用的浏览器自动化能力。

计划中写清：
- 启动前端和后端的命令
- 测试 URL、浏览器类型、视口尺寸
- 测试账号和角色（脱敏）
- 需要预置的数据
- 稳定选择器策略（优先 `data-testid` / role / label）
- 截图、trace、录屏是否启用
- 选择的方式、各方式负责的场景 / 用例、推荐依据和用户确认；agent-qa 所需模型、数据发送边界、成本、工具/浏览器版本和证据能力中未知项写「待核实」
- 每个场景的可观察断言与预期值；常规测试与 agent-qa 的职责划分，不减少既定单元、API、权限和回归测试

### agent-qa 可选执行

仅在用户选了「agent-qa 辅助」或「组合使用」后执行；选择常规方式不安装、不调用 agent-qa。它只负责选定的 Web 用户旅程，不替代项目原有的确定性测试或 tester/reviewer 的放行判断。

1. **检查条件**：先读取项目已有的 agent-qa 配置、测试及其版本，查阅对应版本的 [官方快速开始](https://vostride.com/docs/agent-qa/quickstart) 和 [运行证据查看](https://vostride.com/docs/agent-qa/guides/review-a-run)。确认 Node、浏览器、模型、授权、网络、目标测试环境和成本；不要将 Codex 视为唯一模型。缺依赖需说明拟安装内容并取得必要授权，优先隔离环境，不覆盖已有配置或修改项目依赖而不告知用户。
2. **确认数据边界**：默认使用隔离测试环境、测试账号和测试数据。说明截图、页面内容等可能发送到所选模型服务；在用户授权的数据与服务范围内执行。不要输出、提交凭据或把真实用户敏感数据发送给未经批准的服务；授权不可用或范围不明时停止该工具路径并交回 TeamLead。
3. **准备并运行**：按测试计划编写或复用用户旅程，断言可观察的业务状态与精确预期，不以点击成功代替断言。按已安装版本的 CLI 或 MCP 校验并执行测试；记录工具版本、模型、测试目标、命令、耗时、退出码、agent-qa run ID 与 Spec run ID 的映射。
4. **取证并复核**：通过官方 CLI/MCP 查看 `runs overview`、`runs evidence`、`digest` 等，按需要导出截图、console 和 network；不得读取其内部数据库来推断状态。逐条检查预期与实际及 console/network，结合本策略的后端日志、数据状态和必要的确定性断言；agent-qa 的 PASS、自动摘要和自我修复不自动构成 Spec 通过。
5. **归档与缺口**：将工具自动生成或官方命令导出的证据按本策略归档到 `tester/artifacts/test-logs/<RUN_ID>/`；保留对应的用例、步骤与 agent-qa run ID。导出前确认截图、请求头、日志及模型输入不含敏感信息，确需脱敏时由工具或可复现脚本生成脱敏副本并记录方法；不得将含敏感信息的原件放入报告产物或版本库。缺少后端日志、trace、截图或其他必需证据时记录缺口和影响，不伪造，不以其他工具已通过掩盖未验证项。
6. **处理失败与限制**：区分应用缺陷、测试断言错误、环境/模型故障和错误判定，按现有 bug handoff 处理。曾在 Windows 的 agent-qa 0.3.4 试用中观察到 `fsync` 的 `EPERM` 导致运行后 analysis/curation 未入队；遇到同类告警时如实记录并检查运行证据及分析状态，不声称记忆或自我改进成功，也不将其误判为业务缺陷。所选方式不可用时按 `spec-test` 的选择流程征得用户同意后调整。

### 前后端可观测点

每条用户场景必须至少绑定以下证据：

| 证据 | 要求 |
|------|------|
| 前端控制台 | 捕获 `console.error`、未处理异常、关键业务日志 |
| 网络请求 | 记录关键请求的 method、url、status、耗时、错误摘要；禁止保存 token |
| 后端日志 | 用 run id / trace id / request id 关联本次测试操作 |
| 页面截图 | 成功关键状态、失败状态、异常状态都要截图 |
| trace/录屏 | 复杂交互、偶发失败、端侧 bug 必须保留 |

## 执行流程

### 1. 创建 run id 和日志目录

```text
RUN_ID=YYYYMMDD-HHMM-web-e2e-XXX
tester/artifacts/test-logs/<RUN_ID>/
├── audit.log
├── browser-console.ndjson
├── network-summary.json
├── backend.log
├── user-flow.md
├── screenshots/
├── recordings/
└── traces/
```

所有日志、截图、trace 都写入当前 Spec 目录下的 tester run 目录。

证据文件必须由测试运行自动生成：
- `browser-console.ndjson` 由浏览器自动化监听 console、pageerror、unhandled rejection 后逐行写入
- `network-summary.json` 由请求/响应监听器、代理、HAR 转换或测试框架 reporter 生成
- `screenshots/`、`traces/`、`recordings/` 由浏览器自动化工具在执行过程中保存
- `backend.log` 由服务日志按 RUN_ID / trace id 过滤导出，或由测试命令启动服务时重定向生成
- `audit.log` 由测试 runner 记录 run id、用例编号、时间戳和执行状态

禁止 Agent 在测试结束后手写或编辑这些日志、JSON、trace、录屏和截图内容。Agent 只可以在 `tester/test-report.html` 中总结测试结论并引用证据路径。若无法自动采集某项证据，必须在 `tester/test-report.html` 说明缺失原因，不得伪造或补写证据文件。

### 2. 启动并标记测试

- 启动前端、后端、依赖服务
- 使用测试账号和测试数据
- 在请求 header、query、表单备注或可控输入中注入 `RUN_ID`（如果系统支持）
- 如果系统支持 trace id，请记录 trace id 和 RUN_ID 的映射

### 3. 浏览器自动化模拟用户

按 `tester/test-plan.html` 的用户场景执行：

1. 打开入口页面
2. 按用户可见控件点击、输入、提交
3. 等待页面状态变化，不用固定 sleep 代替状态等待
4. 断言 UI 文案、URL、数据列表、按钮状态、错误提示
5. 截图关键状态
6. 记录失败时的页面 HTML 摘要、截图、console、network

### 4. 捕获前端控制台

必须记录：
- `console.error`
- unhandled promise rejection
- uncaught exception
- 关键业务日志（如提交、保存、状态流转）

测试结论：
- 主成功路径不允许出现未解释的 console error
- 失败路径允许预期错误提示，但不能出现未处理异常

### 5. 捕获网络摘要

记录关键请求：

```json
{
  "run_id": "YYYYMMDD-HHMM-web-e2e-001",
  "case_id": "US-001",
  "requests": [
    {
      "method": "POST",
      "url": "/api/orders",
      "status": 201,
      "duration_ms": 123,
      "request_id": "req_xxx",
      "error": null
    }
  ]
}
```

脱敏规则：
- 不保存 Authorization、Cookie、token、password、secret、完整手机号、身份证号
- 请求/响应 body 只保留必要摘要

### 6. 关联后端日志

从后端日志中提取与 RUN_ID / trace id / request id 相关的片段，保存到 `backend.log`。

验证点：
- 成功路径有状态流转日志
- 失败路径有明确拒绝/校验/回滚日志
- 数据写入、外部 API、异步任务有可追踪 id
- 后端没有未处理异常或 5xx（除非该用例预期如此）

### 7. 失败处理

发现 bug 时通知 spec-debugger，必须附：
- 用户场景编号
- 操作步骤
- 预期与实际
- 截图路径
- console 摘要
- network 摘要
- 后端日志片段或 trace id

## tester/test-report.html 必须补充

### 用户场景执行结果

```html
<h3>用户场景执行结果</h3>
<table>
  <thead><tr><th>场景编号</th><th>结果</th><th>UI 证据</th><th>Console</th><th>Network</th><th>后端日志</th><th>备注</th></tr></thead>
  <tbody>
    <tr><td>US-001</td><td>通过/失败</td><td>screenshots/...</td><td>browser-console.ndjson</td><td>network-summary.json</td><td>backend.log / trace id</td><td></td></tr>
  </tbody>
</table>
```

### Web E2E 审计结论

```html
<h3>Web E2E 审计结论</h3>
<ul>
  <li>控制台错误：无 / 有，说明</li>
  <li>网络失败：无 / 有，说明</li>
  <li>后端异常：无 / 有，说明</li>
  <li>截图/trace/录屏：已归档到 <code>tester/artifacts/test-logs/&lt;RUN_ID&gt;/</code></li>
</ul>
<div class="rk-cal ok"><div class="t">脱敏检查</div><p>已确认未保存敏感信息。</p></div>
```

失败场景在报告里用 `rk-verdict is-fail` 标结论，并按 `html-report` 的修订规范记录复验前后的变化（`del`/`ins` + `data-rev`）。

## 证据与脱敏

证据统一保存在当前 Spec 目录的 tester 子目录：

```text
tester/artifacts/test-logs/<RUN_ID>/
```

必须保留：
- `audit.log`：测试 run id、用例编号、测试账号角色（脱敏）、时间戳
- `browser-console.ndjson`：console error、未处理异常、关键业务日志
- `network-summary.json`：关键请求摘要
- `backend.log`：与 RUN_ID / trace id / request id 关联的后端日志片段
- `screenshots/`：关键成功、失败、异常状态截图
- `traces/` 或 `recordings/`：复杂交互或失败复现证据

禁止保存：
- token、Cookie、Authorization header
- 密码、密钥、私钥
- 完整手机号、身份证号、银行卡号
- 真实用户隐私数据
- 完整请求/响应 body（除非已脱敏且确有必要）

## 常见陷阱

- 只调用接口，不模拟用户真实点击路径
- 只看页面成功，不检查 console/network/backend log
- Agent 手写 `network-summary.json`、`browser-console.ndjson` 或 `backend.log` 充当证据，而不是让测试脚本和运行时自动采集
- 使用固定 sleep 导致测试不稳定
- 没有 run id，无法把前端操作和后端日志关联
- 保存了 token、Cookie 或真实用户隐私
