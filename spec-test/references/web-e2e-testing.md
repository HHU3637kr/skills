# Web 端侧 E2E 测试策略

## 何时使用

当 Spec 涉及 Web 页面、浏览器交互、前端路由、表单、登录态、权限、前后端联动、异步任务或用户可见工作流时使用本策略。

不要用于纯后端 API、纯 CLI、纯文档变更；这些场景应使用对应测试策略或常规测试计划。

## test-plan.md 必须补充

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

优先使用项目已有 E2E 工具（Playwright / Cypress / Vitest browser 等）。若项目没有现成框架，使用当前运行环境可用的浏览器自动化能力。

计划中写清：
- 启动前端和后端的命令
- 测试 URL、浏览器类型、视口尺寸
- 测试账号和角色（脱敏）
- 需要预置的数据
- 稳定选择器策略（优先 `data-testid` / role / label）
- 截图、trace、录屏是否启用

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
artifacts/test-logs/<RUN_ID>/
├── audit.log
├── browser-console.ndjson
├── network-summary.json
├── backend.log
├── user-flow.md
├── screenshots/
├── recordings/
└── traces/
```

所有日志、截图、trace 都写入当前 Spec 目录下的该 run 目录。

### 2. 启动并标记测试

- 启动前端、后端、依赖服务
- 使用测试账号和测试数据
- 在请求 header、query、表单备注或可控输入中注入 `RUN_ID`（如果系统支持）
- 如果系统支持 trace id，请记录 trace id 和 RUN_ID 的映射

### 3. 浏览器自动化模拟用户

按 test-plan.md 的用户场景执行：

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

## test-report.md 必须补充

### 用户场景执行结果

| 场景编号 | 结果 | UI 证据 | Console | Network | 后端日志 | 备注 |
|---------|------|---------|---------|---------|----------|------|
| US-001 | 通过/失败 | screenshots/... | browser-console.ndjson | network-summary.json | backend.log / trace id | |

### Web E2E 审计结论

- 控制台错误：无 / 有，说明
- 网络失败：无 / 有，说明
- 后端异常：无 / 有，说明
- 截图/trace/录屏：已归档到 `artifacts/test-logs/<RUN_ID>/`
- 脱敏检查：已确认未保存敏感信息

## 证据与脱敏

证据统一保存在当前 Spec 目录：

```text
artifacts/test-logs/<RUN_ID>/
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
- 使用固定 sleep 导致测试不稳定
- 没有 run id，无法把前端操作和后端日志关联
- 保存了 token、Cookie 或真实用户隐私
