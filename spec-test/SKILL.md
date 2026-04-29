---
name: spec-test
description: >
  当角色 spec-tester 需要为 Spec 撰写 test-plan.md、在实现完成后执行测试并产出 test-report.md，
  或在 spec-debugger 修复后重新验证时使用。若测试对象属于 Web 前端、端侧应用、API、CLI 等具体场景，
  先选择对应 references 测试策略；不要用于普通代码实现或 bug 修复。
---

# Spec Test

## 核心原则

1. **两个阶段，两个产出**：Spec 创建阶段 → test-plan.md；测试执行阶段 → test-report.md
2. **不直接修复 bug**：发现 bug 时向 TeamLead 提交 bug handoff，由 TeamLead 启动 spec-debugger
3. **通过 TeamLead 与 spec-writer 协作**：Spec 阶段需讨论接口边界和异常情况，确保测试覆盖完整
4. **关键路径可观测**：测试必须验证系统关键路径有日志、trace id、事件或其他可审计证据
5. **证据同目录归档**：端侧测试和关键路径测试的审计日志必须保存在当前 Spec 目录的 `artifacts/test-logs/<run-id>/`
6. **策略按场景加载**：不同开发场景的测试策略沉淀在 `references/`，命中场景时先读取对应策略
7. **策略在 spec-test 内沉淀**：测试过程中发现跨项目可复用的测试方法时，更新本 Skill 的 `references/` 和策略表；不要写入当前项目的 `AGENTS.md` 或 `.agents/rules/`

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
3. **必须给 test-plan 要求**：明确该策略要求 test-plan.md 增补哪些章节、表格或字段
4. **必须给执行流程**：按可操作步骤描述如何执行测试，包含环境、数据、工具、日志和失败处理
5. **必须给 test-report 要求**：明确测试报告中如何呈现证据、结论和失败信息
6. **必须给证据与脱敏规则**：说明证据保存路径、日志类型、截图/trace/录屏要求，以及不能保存的敏感信息
7. **必须给常见陷阱**：列出该场景最容易漏掉或误判的点
8. **禁止写项目一次性细节**：具体账号、真实 URL、业务私有数据、临时 workaround 不写入策略文件

推荐结构：

```markdown
# 场景名测试策略

## 何时使用
## test-plan.md 必须补充
## 执行流程
## test-report.md 必须补充
## 证据与脱敏
## 常见陷阱
```

### 策略沉淀时机

策略沉淀发生在 `spec-test` 内部，不等到 Spec 收尾阶段。

在完成测试执行并产出 test-report.md 后，必须做一次轻量判断：

| 判断问题 | 是 | 否 |
|----------|----|----|
| 本次是否形成了某类开发场景可复用的测试方法？ | 新增或更新 `references/*-testing.md` | 不沉淀 |
| 本次是否补齐了现有策略缺失的证据、日志、断言或失败处理要求？ | 更新对应策略文件 | 只保留在 test-report.md |
| 本次经验是否跨项目有效，而不是当前项目的一次性约束？ | 可进入策略库 | 留在当前 Spec 文档或项目规则中 |

需要沉淀时：
1. 先向用户说明拟新增或修改的策略文件
2. 得到确认后编辑 `spec-test/references/<场景>-testing.md`
3. 如果是新增策略，同步更新上方「测试策略库」表格
4. 只写长期可复用的测试方法，不写当前项目的账号、URL、业务私有规则或临时 workaround

## 阶段一：撰写测试计划（Spec 创建阶段）

### 步骤 1：读取探索报告

读取同目录下的 `exploration-report.md`，了解：
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

### 步骤 3：撰写 test-plan.md

在 plan.md 同目录下创建 `test-plan.md`：

```yaml
---
title: 测试计划
type: test-plan
status: 未确认
created: YYYY-MM-DD
plan: "[[plan]]"
tags:
  - spec
  - test-plan
---
```

**必须包含的章节**：

```markdown
# 测试计划

## 验收标准
[通过/不通过的判定标准，要具体可衡量]

## 测试用例

| 用例编号 | 描述 | 输入 | 预期输出 | 边界条件 |
|---------|------|------|---------|---------|
| TC-001 | [描述] | [输入] | [预期] | [边界] |

## 用户使用场景（端侧/E2E 适用）

| 场景编号 | 用户角色 | 业务目标 | 操作路径 | 关键断言 | 证据 |
|---------|----------|----------|----------|----------|------|
| US-001 | [角色] | [目标] | [点击/输入/跳转路径] | [UI/数据/日志断言] | [截图/console/network/backend log] |

## 覆盖率要求
- 代码覆盖率：> 80%
- 功能覆盖率：[具体要求]

## 日志与审计要求

### 关键路径可观测性
- 必须验证以下关键路径是否留下可追溯证据：[列出状态流转/权限边界/数据写入/异步任务/外部 API/错误恢复]
- 每个关键路径至少保留一种证据：日志片段、trace id、事件记录、数据库审计字段或任务执行记录
- 日志断言应覆盖成功、失败和拒绝/回滚路径

### 端侧审计日志
- 端侧测试必须保留审计日志目录：`artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/`
- 审计日志至少包含：测试 run id、时间戳、测试账号/角色（脱敏）、设备/浏览器/App 版本、操作路径、控制台日志、网络请求摘要、截图或录屏路径、失败堆栈、关联用例编号
- 不得保存 token、密码、密钥、完整手机号、身份证号或真实用户隐私

## 测试环境要求
[依赖、配置、数据准备]
```

### 步骤 4：通知 TeamLead 完成

```text
通知 TeamLead：test-plan.md 已完成，等待用户确认。
```

---

## 阶段二：执行测试（测试执行阶段）

### 步骤 1：读取必要文档

- `plan.md`：了解设计方案
- `test-plan.md`：测试用例和验收标准
- `summary.md`：了解实现细节

### 步骤 2：执行测试用例

按 test-plan.md 的用例逐一执行，记录结果。

每次测试运行先在当前 Spec 目录下创建审计日志目录：

```text
artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/
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

### 步骤 3：发现 Bug 时的处理

> [!important] 不直接修复，向 TeamLead 提交 bug handoff

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

### 步骤 4：记录微小修改

测试过程中如有微小调整（非 bug，如参数调优、配置修正）：
- 直接记录到 test-report.md 的「修改记录」表
- 不创建 debug 文档

### 步骤 5：产出 test-report.md

在同目录下创建 `test-report.md`：

```yaml
---
title: 测试报告
type: test-report
status: 未确认
created: YYYY-MM-DD
plan: "[[plan]]"
test-plan: "[[test-plan]]"
tags:
  - spec
  - test-report
---
```

**必须包含的章节**：

```markdown
# 测试报告

## 测试概况
- 测试用例总数：X
- 通过：X
- 失败：X（已修复：X）
- 代码覆盖率：X%

## 测试过程中的修改记录

| 修改类型 | 描述 | 关联文档 |
|---------|------|---------|
| 微小调整 | [直接描述] | — |
| Bug 修复 | [问题现象简述] | [[debug-001\|debug-001]] |

## 日志与审计证据

### 测试运行
- Run ID: YYYYMMDD-HHMM-run-XXX
- 审计日志目录: `artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/`
- 测试账号/角色: [脱敏后的账号或角色]
- 设备/浏览器/App 版本: [端侧测试必填]

### 关键路径日志验证

| 关键路径 | 关联用例 | 证据类型 | 证据位置/trace id | 结果 |
|---------|---------|---------|------------------|------|
| [状态流转/权限边界/数据写入等] | TC-XXX | 日志/trace/事件/截图 | `artifacts/test-logs/...` 或 trace id | 通过/失败 |

### 端侧审计留存
- 控制台日志: `artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/console.log`
- 网络摘要: `artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/network-summary.json`
- 截图: `artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/screenshots/`
- 录屏/trace（如有）: `artifacts/test-logs/YYYYMMDD-HHMM-run-XXX/recordings/` / `traces/`
- 脱敏检查: 已确认未保存 token、密码、密钥或真实用户隐私

## 发现的 Bug（如有）
- [[debug-001|Bug 标题]] - 已修复 ✅

## 最终测试结果
[通过/不通过，结论]

## 文档关联
- 设计文档: [[plan|设计方案]]
- 测试计划: [[test-plan|测试计划]]
```

### 步骤 6：测试策略沉淀判断

基于本次 test-plan.md、test-report.md 和测试日志，判断是否需要沉淀或更新测试策略：

- 是否出现了新的可复用测试场景（如移动端真机、API 契约、异步任务、权限矩阵、性能回归）
- 是否发现现有策略漏掉了关键证据（如 console/network/backend log、trace、截图、录屏、审计字段）
- 是否形成了跨项目都适用的执行步骤、断言方式、失败处理或脱敏规则

如果需要沉淀：
1. 暂停通知 TeamLead，先向用户说明拟修改 `spec-test/references/` 的内容
2. 用户确认后，按「策略撰写标准」新增或更新策略文件
3. 如新增策略，同步更新「测试策略库」表格
4. 在 test-report.md 的「文档关联」中补充策略文件引用

如果不需要沉淀，在 test-report.md 中记录：

```markdown
## 测试策略沉淀判断
- 结论：无需新增或更新通用测试策略
- 原因：[本次仅为项目特定验证 / 已被现有策略覆盖 / 无跨项目复用价值]
```

### 步骤 7：通知 TeamLead 完成

```text
通知 TeamLead：test-report.md 已完成，等待用户确认。
```

## 与其他角色的协作

```
阶段二：spec-explorer → (exploration-report.md) → spec-tester
        spec-writer ↔ TeamLead ↔ spec-tester（接口讨论）

阶段四：spec-executor → (summary.md) → spec-tester 执行测试
        spec-tester ↔ TeamLead ↔ spec-debugger（bug 修复闭环）
           发现 bug → 向 TeamLead 提交 bug handoff
           修复完成 → TeamLead 通知 spec-tester 重新验证
```

## 后续动作

阶段一完成后确认：
1. test-plan.md 已在 plan.md 同目录下创建
2. 已与 spec-writer 讨论并对齐接口边界
3. 已通知 TeamLead

阶段二完成后确认：
1. test-report.md 已创建，包含所有测试结果
2. 所有发现的 bug 都已由 spec-debugger 修复并重新验证
3. 关键路径日志验证已记录到 test-report.md
4. 端侧测试审计日志已保存到当前 Spec 目录的 `artifacts/test-logs/<run-id>/`
5. 已完成脱敏检查，未保存 token、密码、密钥或真实用户隐私
6. 已完成测试策略沉淀判断；如需新增或更新策略，已获得用户确认并维护 `references/` 和策略表
7. 已通知 TeamLead

### 常见陷阱
- 直接修复 bug 或绕过 TeamLead 联系 spec-debugger（破坏协作闭环）
- test-plan.md 验收标准不够具体（无法判断通过/失败）
- 忘记在 test-report.md 中引用 debug 文档
- 端侧测试只看界面结果，没有保存 console/network/截图等审计证据
- 关键路径没有日志或 trace id，导致失败后无法复盘
- 审计日志包含未脱敏的 token、密码、密钥或真实用户隐私
- 把可复用测试策略只写在 test-report.md，没有沉淀到 `spec-test/references/`
