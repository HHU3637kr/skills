---
title: 测试计划
type: test-plan
status: 已确认
created: 2026-04-28
plan: "[[plan]]"
tags:
  - spec
  - test-plan
  - vscode-extension
  - role-chat
  - agent-timeline
---

# 测试计划

## 与 spec-writer 对齐的接口边界

本测试计划按 [[plan]] 中的结构化 Agent Timeline 方案制定。测试边界如下：

| 模块/接口 | 测试关注点 | 失败判定 |
|----------|------------|----------|
| `RoleTimelineItem` 类型 | 所有 item 必须包含 `id`、`specId`、`role`、`turnId`、`type`、`timestamp`、`source` | 缺少必填字段、类型不稳定、无法 JSONL 序列化 |
| `mapAgentEventToTimelineItems()` | Claude Code raw event 到 timeline item 的映射、容错、去重 | 映射错误、未知事件导致异常、`result` 聚合事件重复显示 |
| `timelineStore` | `agent-timeline.jsonl` 读写、按 role 过滤、旧 `agent-chat.jsonl` 兼容转换 | JSONL 损坏、Role 串话、旧历史无法展示 |
| `renderSafeMarkdown()` | Markdown 基础渲染、HTML escape、代码块 | XSS 输入被执行、代码块破坏布局、Markdown 丢失关键内容 |
| `redactSensitiveText()` / `truncateOutput()` | 大输出截断、敏感信息脱敏 | token/key 泄露、长日志刷屏或卡顿 |
| `renderRoleChatHtml()` / `renderers` | Timeline 分组、工具卡片、TeamBus 卡片、错误状态、过滤、折叠 | UI 元素缺失、协议 JSON 裸露、交互无效 |
| `AgentChatViewProvider` 集成 | 发送消息、增量 timeline 推送、Role 切换、文件打开、兼容旧消息 | 点击角色无响应、消息重复、文件越界打开、Team Chatroom 混入私聊 |

## 验收标准

1. `npm run compile` 必须通过，TypeScript 无类型错误。
2. `npm test` 必须通过，且新增/更新的单元测试覆盖 timeline mapper、store、markdown、安全脱敏、重复消息回归。
3. `RoleTimelineItem` 可稳定写入并读取 `agent-timeline.jsonl`，每行都是合法 JSON。
4. 没有 `agent-timeline.jsonl` 的旧 Spec 仍能从 `agent-chat.jsonl` 展示历史私聊。
5. Claude Code `type === "result"` 聚合事件不得生成第二条可见回复。
6. `tool_use` / `tool_result` 必须渲染为可折叠工具卡片，默认不刷屏。
7. TeamBus JSON block 不得裸露在 assistant 正文中，必须显示为结构化 TeamBus item，并继续写入 `team-chat.jsonl` / `audit-log.jsonl`。
8. Markdown 渲染不得执行 raw HTML、script、事件属性或危险链接。
9. 大输出必须截断并脱敏，不能显示 token、Authorization、API key、密码等敏感内容。
10. 点击 workspace 内文件路径可以打开文件；越界路径必须被拒绝并记录错误。
11. Role 切换后私聊 timeline 必须隔离，不同 AgentRole 的会话不互相混入。
12. Role Chat 位于右侧侧边栏，Team Chatroom 位于底部 Panel；两者数据边界保持分离。
13. Canvas 点击角色后，右侧 Role Chat 必须切换到对应角色并可发送消息。
14. UI 支持 Enter 发送、Shift+Enter 换行、Jump to bottom、过滤、折叠/展开、Retry、Continue。
15. Codex 不得重新出现在默认 UI 路径或默认 adapter 选择中。
16. 端侧测试证据必须保存在当前 Spec 目录 `artifacts/test-logs/<run-id>/`，并通过脱敏检查。

## 测试用例

| 用例编号 | 描述 | 输入 | 预期输出 | 边界条件 |
|---------|------|------|----------|----------|
| TC-001 | TypeScript 编译 | 执行 `npm run compile` | 编译通过，无类型错误 | 新增模块必须被 tsconfig 覆盖 |
| TC-002 | 扩展宿主测试基线 | 执行 `npm test` | 所有测试通过 | 不破坏已有 command/view/TeamBus 测试 |
| TC-003 | Timeline item 必填字段 | 构造每种 `RoleTimelineItem` | 每个 item 可 JSON 序列化且字段完整 | `sessionId` / `rawEventId` 可选 |
| TC-004 | system init 映射 | Claude Code `system/init` event | 生成 `system_status(started/resumed)` | session id 缺失时不崩溃 |
| TC-005 | api retry 映射 | Claude Code `system/api_retry` event | 生成 `system_status(retrying)` | retry metadata 不完整 |
| TC-006 | assistant text 映射 | assistant message text content | 生成 `assistant_message(final=false)` | 多段 text content 合并顺序正确 |
| TC-007 | result 聚合去重 | `type: "result"` 且含最终文本 | 不生成可见 assistant item | 回归重复回复问题 |
| TC-008 | tool_use 映射 | Bash/Read/Edit/Grep/Glob/TodoWrite tool_use | 生成 `tool_call`，含工具名和摘要 | unknown tool 也能 fallback 展示 |
| TC-009 | tool_result 映射 | 成功/失败 tool_result | 生成 `tool_result`，含状态、摘要、预览 | stderr 优先显示错误上下文 |
| TC-010 | TeamBus block 转换 | assistant text 含 `rkFlowTeamMessage` JSON block | 生成 `team_bus` item，assistant 正文剥离 JSON | JSON 无效时显示可诊断错误但不崩溃 |
| TC-011 | turn grouping | 一轮用户输入产生 user、status、tool、assistant、done | 所有 item 共享同一 `turnId`，顺序稳定 | 并发/快速连续发送不串 turn |
| TC-012 | timeline JSONL 追加读取 | 写入多条 timeline item 后读取 | 读回数量、顺序、role 过滤正确 | 空文件、末尾换行、非法行 |
| TC-013 | 旧 agent-chat 兼容转换 | 仅存在 `agent-chat.jsonl` | UI 可展示 user/assistant/error 基础 timeline | 奇数条消息、缺失方向字段 |
| TC-014 | Markdown 安全渲染 | `**bold**`、列表、引用、代码块 | 渲染结构正确 | 不支持 raw HTML |
| TC-015 | XSS 防护 | `<script>`、`onerror=`、`javascript:` | 被 escape 或拒绝，不执行 | 大小写混写、实体编码 |
| TC-016 | 大输出截断 | 超过 120 行或 12KB 的 stdout/stderr | 默认展示摘要和截断提示，可展开 | 多字节中文、长单行 |
| TC-017 | 敏感信息脱敏 | API key、Bearer token、password、Cookie | 显示为 `[REDACTED]` 或等效占位 | 混在日志行中 |
| TC-018 | 工具卡片折叠/展开 | Webview 中点击工具卡片 | 默认折叠，展开后可读详情 | 展开状态不破坏布局 |
| TC-019 | TeamBus 卡片展示 | Agent 发送角色间消息 | Role Chat 显示结构化发送事件，Team Chatroom 显示团队消息 | 用户私聊不进入 Team Chatroom |
| TC-020 | Role 切换隔离 | 在 Canvas 点击 TeamLead / spec-tester | 右侧 Role Chat 切换角色，历史按 role 隔离 | 快速切换、多 Spec 切换 |
| TC-021 | 发送输入体验 | Enter、Shift+Enter、空消息 | Enter 发送，Shift+Enter 换行，空消息不发送 | 中文输入法 composition |
| TC-022 | Retry / Continue | 点击 Retry / Continue | Retry 重发上一条用户消息，Continue 发送固定继续提示 | 无上一条消息时禁用 Retry |
| TC-023 | Jump to bottom / filter | 长 timeline、切换 Tools/Errors/Files | 滚动到底部正常，过滤不丢数据 | 过滤后再切回 All |
| TC-024 | 文件打开安全 | 点击 workspace 内/外文件路径 | 内部文件打开，外部路径被拒绝并记录错误 | `..\`、绝对路径、符号链接 |
| TC-025 | Codex 默认路径回归 | 打开扩展 UI 和 adapter 列表 | 默认仅 Claude Code；Codex 不在默认选择中 | 保留后续接入扩展点 |
| TC-026 | VSIX 打包 | 执行 `npm run package` | 生成新版本 VSIX，无打包错误 | VSIX 是否提交由用户另行确认 |

## 用户使用场景（端侧/E2E 适用）

| 场景编号 | 用户角色 | 业务目标 | 前置数据 | 操作路径 | 关键断言 | 证据 |
|---------|----------|----------|----------|----------|----------|------|
| US-001 | 普通开发者 | 与 TeamLead 进行一次真实 Role Chat | 已安装扩展，当前 workspace 有 Spec，Claude Code CLI 可用或使用可控 mock | 打开 R&K Agent 侧边栏 → 点击 Canvas 中 TeamLead → 输入问题 → 发送 → 等待回复 | 右侧显示用户消息、system status、工具卡片、最终回复；无重复回复 | `extension-host.log`、`agent-events.jsonl`、`agent-timeline.jsonl`、截图 |
| US-002 | 普通开发者 | 查看 Agent 发送 TeamBus 消息 | 构造含 `rkFlowTeamMessage` 的 Agent 输出 | 发送触发跨角色协作的提示 → 查看 Role Chat → 切到底部 R&K Team panel | Role Chat 只显示结构化 TeamBus 卡片；Team Chatroom 只显示 AgentRole 间消息；用户私聊不混入 | `team-chat.jsonl`、`audit-log.jsonl`、截图 |
| US-003 | 普通开发者 | 打开旧 Spec 历史私聊 | 旧 Spec 只有 `agent-chat.jsonl`，无 `agent-timeline.jsonl` | 在 Spec Explorer 选择旧 Spec → 点击角色 | 旧消息可读展示；不会创建错误空白气泡；后续新消息写入 timeline | 旧 JSONL 复制件、截图、audit |
| US-004 | 普通开发者 | 安全查看复杂输出 | 构造含 Markdown、代码块、XSS、token、长 stdout 的输出 | 发送测试提示或使用 mock event 注入 | Markdown 可读；XSS 不执行；token 脱敏；长输出折叠 | `webview-console.log`、截图、timeline JSONL |
| US-005 | 普通开发者 | 从工具结果定位文件 | 工具输出含 workspace 内文件路径和越界路径 | 点击文件路径 | workspace 内文件打开；越界路径被拒绝且显示错误状态 | `extension-host.log`、截图、错误 item |

## 覆盖率要求

- 代码覆盖率：新增 `src/roleChat/` 模块行覆盖率 > 80%。
- Mapper 覆盖率：`mapAgentEventToTimelineItems()` 分支覆盖率 > 90%。
- 安全工具覆盖率：Markdown escape、脱敏、截断、路径校验关键分支 100% 覆盖。
- 功能覆盖率：验收标准 1-16 全部有对应自动测试或端侧验证证据。
- 回归覆盖率：现有 12 个扩展测试必须继续通过，并新增重复回复、TeamBus JSON 不裸露、Role 隔离、旧数据兼容测试。

## 日志与审计要求

### 关键路径可观测性

实现和测试必须验证以下关键路径留下可追溯证据：

- 用户发送消息：`agent-chat.jsonl`、`agent-timeline.jsonl`
- Claude Code raw event 接收：`logs/agent-events.jsonl`
- Timeline 映射：`agent-timeline.jsonl`
- TeamBus 发送：`team-chat.jsonl`、`audit-log.jsonl`
- Role 切换：extension host log 或 audit event
- 文件打开：成功/拒绝结果必须有日志或 timeline error item
- 错误恢复：CLI 错误、JSON 解析错误、未知 raw event 必须进入 error/status item

日志断言必须覆盖成功、失败和拒绝路径。

### 端侧审计日志

端侧测试必须保留审计日志目录：

```text
spec/06-已归档/20260428-1658-RoleChat对话体验与运行产物展示优化/artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/
├── audit.log
├── extension-host.log
├── webview-console.log
├── network-summary.json
├── agent-events.jsonl
├── agent-timeline.jsonl
├── team-chat.jsonl
├── screenshots/
├── recordings/
└── traces/
```

要求：

- `audit.log` 记录 run id、时间戳、VS Code 版本、扩展版本、测试用例编号、测试角色。
- `extension-host.log` 记录关键命令、Role 切换、文件打开、错误处理。
- `webview-console.log` 捕获未处理异常、console error、关键 UI 事件。
- `network-summary.json` 如无网络请求，记录 `{ "not_applicable": true, "reason": "VS Code Webview local extension test" }`。
- 截图至少覆盖：Role Chat 正常回复、工具卡片展开、TeamBus 卡片、错误状态、底部 Team Chatroom。
- 不得保存 token、密码、密钥、Cookie、Authorization header、真实用户隐私。

## 测试环境要求

### 自动化测试环境

- Windows PowerShell
- Node.js 与 npm
- VS Code 1.90+ 或当前扩展测试框架可下载的 VS Code
- `rk-flow-vscode-extension` 依赖已安装
- 测试命令：

```powershell
npm --prefix rk-flow-vscode-extension run compile
npm --prefix rk-flow-vscode-extension test
npm --prefix rk-flow-vscode-extension run package
```

### 端侧验证环境

- VS Code 或 Windsurf 中安装打包后的 VSIX
- 当前 workspace 为 `C:\Users\18735\.claude\skills`
- 当前分支为 `feat/spec-20260428-1335-rk-flow-vscode-extension`
- Claude Code CLI 可用；如需避免真实模型调用，可使用可控 mock adapter/event fixture 执行 UI 验证
- 当前 Spec 目录用于保存端侧审计证据

### 测试数据准备

- 构造 Claude Code stream-json fixture：
  - `system/init`
  - `system/api_retry`
  - assistant text
  - `tool_use`
  - `tool_result`
  - `result`
  - unknown event
  - error event
- 构造安全输入 fixture：
  - XSS Markdown
  - 长 stdout/stderr
  - token/API key/password
  - workspace 内文件路径
  - workspace 外越界路径
- 准备旧格式 `agent-chat.jsonl` fixture，用于兼容转换测试。

## 执行顺序建议

1. 先执行纯单元测试：类型、mapper、store、markdown、sanitize。
2. 再执行扩展宿主测试：contribution、view、command、TeamBus、Role 切换。
3. 再执行 Webview 端侧验证：发送消息、折叠展开、过滤、文件打开、TeamBus 底部面板。
4. 最后执行打包与安装自测：生成 VSIX，安装后按 US-001 至 US-005 抽样验证。

## 失败处理

发现 bug 时不直接修复，通知 spec-debugger，并附：

- 用例编号
- 用户场景编号（如适用）
- 复现步骤
- 预期结果
- 实际结果
- 相关日志路径
- 截图路径
- 关联 raw event / timeline item

## 文档关联

- 设计文档: [[plan|设计方案]]
- 探索报告: [[exploration-report|探索报告]]
- 测试报告: [[test-report|测试报告]]（待创建）
