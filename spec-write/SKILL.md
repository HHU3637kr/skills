---
disable-model-invocation: true
name: spec-write
description: >
  撰写代码实现计划（writer/plan.html）。由角色 spec-writer 调用。
  触发条件：(1) 角色 spec-writer 需要创建设计方案、API 规范、数据模型、架构设计、重构方案，
  (2) 用户说"创建 Spec"/"撰写设计文档"/"写技术规格"/"设计方案"，
  (3) 当前 Spec 目录下需要新建 writer/plan.html。
  注意：v2.0 起 writer/plan.html 不含测试计划章节（由 spec-tester 用 spec-test 单独创建），
  execution_mode 固定为 single-agent，且仅表示实现阶段执行模式，不否定项目级角色协作。
  如果目录下已有 executor/summary.html 且仍在该 Spec 的活跃分支内，应使用 spec-update 而非本 Skill；若原分支已合并/关闭，后续需求默认新建 Spec。
---

# Spec Write

## 运行契约

> 进入核心规则前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | `explorer/exploration-report.html`、与 spec-tester 讨论的接口边界、TeamLead 提供的 Git 元数据、`html-report` skill 的报告契约 |
| 权限 | 只写 `writer/plan.html`（设计方案）；不写测试计划、不实现代码、不归档、不提交；目录分类错误时通过 TeamLead 请求修正 |
| 验证 | plan 含 7 个必需章节、版本目录归属正确、命名为 `YYYYMMDD-HHMM-属性-任务描述`（中文任务描述）、分支字段与当前分支一致、HTML 骨架与修订标记符合 `html-report` 规范；plan 必须含接口签名、数据结构、文件清单、每个任务的验证命令，缺任一项不得进入实现 |
| 停止 | plan 定稿且通过确认即停止，不在确认前编写代码、不"顺手"加 Spec 未要求的设计 |
| 升级 | 探索背景不足、接口边界与 spec-tester 无法对齐、或需求超出当前 Spec 范围时，交回 TeamLead 由用户决策 |
| 参考 | plan 定稿前 → 必读 `references/plan-quality.md` |

## 核心规则

### 确认方式随模式（必须执行）

**确认方式随模式**：`gated` 模式下完成 `writer/plan.html` 撰写后必须用当前运行环境的确认方式向用户确认；`autopilot` 模式下由「plan 完备度闸门（接口签名/数据结构/文件清单/每任务验证命令四项齐备）+ Spec 自审四问全部通过」替代该确认，两者缺一不可放行。四项与四问的细则见 [references/plan-quality.md](references/plan-quality.md)。

`gated` 模式的确认话术：

```text
确认目标：writer/plan.html 已创建完成，请确认设计方案是否可以开始实现？
确认选项：
- 确认，开始实现
- 需要修改（请说明修改要求）
```

`autopilot` 模式下把闸门四项与自审四问的逐条结论写入账本，任一项不齐或任一问未过即停止，不得放行到实现阶段。

### 需求性质与命名规范

在「项目 → Version → Spec」架构中，彻底取消原 `01-产品规划` 到 `05-验证工程` 的数字流程目录，Spec 统一归属到具体版本目录下（`spec/versions/<version>/specs/<spec-dir>/`）。

需求性质通过 `category` 字段明确，分为四类，享受平等管理地位：

| 属性 | 定义与适用场景 | 范例 |
|------|----------------|------|
| `feat` | 新增业务或产品功能：用户可感知功能、新业务接口、新页面、新业务工作流 | 用户报告中心、多租户看板、新评分维度配置 |
| `tech` | 技术底座与 AI 核心能力建设：Prompt 工程、Agent Trace、RAG Eval、ASR、模型路由与降级治理 | Agent 追踪埋点、Prompt 评测流水线、音频流式分段 |
| `debt` | 技术债治理、代码重构与性能优化：架构边界解耦、慢查询治理、类型补全、死代码清理 | 数据库连接池重构、状态机解耦、前端虚拟滚动性能优化 |
| `fix` | 缺陷与安全性修复：Bug 修复、回归问题处置、安全漏洞修补、异常处理增强 | 跨租户数据隔离防线加固、并发写死锁修复、空指针异常兜底 |
#### 容易误判的边界

| 用户说法/任务 | 正确属性 | 判定理由 |
|---------------|----------|----------|
| “修一下登录失败问题” | `fix` | 修复已有能力异常，不是重构也不是新增能力 |
| “优化列表加载速度与慢查” | `debt` | 性能改进与技术债治理，目标是让现有能力更稳更快 |
| “重构认证模块但不改变功能” | `debt` | 无新增业务能力，属于内部架构边界解耦与技术债治理 |
| “设计新的通用权限校验中间件” | `tech` | 技术底座与工程公共能力建设 |
| “实现权限模型里的具体角色管理界面” | `feat` | 新增具体用户可感知业务功能 |
| “为系统新增 Prompt 评测与断言套件” | `tech` | AI 基础设施与评测能力建设 |
| “为支付流程新增用户审计日志查看页面” | `feat` | 新增面向业务的使用功能 |
| “修复生产环境支付审计日志偶发丢失” | `fix` | 已有系统能力不正确，缺陷修复 |

**文件夹命名**：`YYYYMMDD-HHMM-属性-任务描述`（任务描述**必须中文**）

**路径示例**：
```text
✅ spec/versions/v1.6/specs/20260908-0900-feat-专业评价Agent设计/writer/plan.html
✅ spec/versions/v1.6/specs/20260908-1030-fix-登录超时错误修复/writer/plan.html
✅ spec/versions/v1.6/specs/20260908-1100-tech-AgentTrace链路追踪/writer/plan.html
✅ spec/versions/v1.6/specs/20260908-1400-debt-权限模型重构与慢查治理/writer/plan.html
❌ spec/03-能力交付/20260104-design/plan.html          （已废弃旧分类目录）
❌ spec/versions/v1.6/specs/20260104-feature/writer/plan.html  （任务描述必须中文，且须带属性前缀）
```

## 工作流程

| 步骤 | 操作 | 要点 |
|------|------|------|
| 1 | 读取 `html-report` skill | **撰写报告前必读**：HTML 骨架、frontmatter 双轨等价字段、双向关联、修订标记规范 |
| 2 | 接力 AWR 会话并准备上下文 | 执行 `awr session resume --from-session <EXPLORER-SESSION-ID> --agent spec-writer --expected-revision <REV>` 接棒认领，随后执行 `awr work prepare <SPEC-ID> --session <SESSION-ID> --response-view summary` 提取聚焦上下文，结合探索报告了解背景、现状与依赖 |
| 3 | 通过 TeamLead 与 spec-tester 讨论接口边界 | 确认异常处理、验收边界 |
| 4 | 复核当前 Spec 属性归属 | 检查 category（feat/tech/debt/fix）是否准确，发现偏差通过 TeamLead 修正账本与目录前缀 |
| 5 | 复核文件夹命名 | `YYYYMMDD-HHMM-属性-任务描述` |
| 6 | 确认 writer 目录存在 | `writer/` 应由 spec-start 创建；缺失时创建，不重建整个 Spec 目录 |
| 7 | 选择正文模板 | 详见 [references/templates.md](references/templates.md) |
| 8 | 撰写 `writer/plan.html` | 复制 [references/plan-template.html](references/plan-template.html) 骨架，写入 TeamLead 提供的 Git 元数据 |
| 9 | 验证路径和命名 | 版本目录与属性前缀正确、日期时间当前、任务描述中文 |
| 10 | 自检 HTML | 浏览器能打开且样式生效、`rk-meta` 与 `<meta name="rk:*">` 字段一致、`rk-links` 有对应反链登记、无 `<style>` 与行内 `style=` |
| 11 | 保存文件 | `Write` 工具保存到目标路径 |
| 12 | 等待确认 | `gated`：**必须**使用当前运行环境的确认方式；`autopilot`：以 plan 完备度闸门四项齐备 + Spec 自审四问全部通过替代，逐条结论落账本 |

### 步骤 7：writer/plan.html 内容要求（v2.0）

**v2.0 变更：移除测试计划章节**
`writer/plan.html` **不再包含**测试计划章节（由 spec-tester 用 spec-test 单独创建 `tester/test-plan.html`）。
`execution_mode` **固定为 `single-agent`**，仅表示 spec-executor 的实现阶段执行模式；项目级角色协作由 spec-init/spec-start 管理。

**必须包含的章节**：
1. 概述（背景、目标、范围）
2. 需求分析
3. 设计方案
4. 执行模式（固定 single-agent，说明这是实现阶段执行模式）
5. 实现步骤
6. 风险和依赖
7. 关联产物（双向：`rk-links` 正向 + `rk-backlinks` 反向）

原 frontmatter 字段一律双轨保留：机器可读写进 `<head>` 的 `<meta name="rk:*">` / `<link rel="rk-*">`，人可读镜像到 `.rk-meta`。字段清单与对照表详见 [references/plan-template.html](references/plan-template.html)，禁止因为"HTML 里看不见"就删字段。

**GitHub Flow 字段**（双轨保留：`<meta name="rk:*">` + `.rk-meta`）：
- `rk:git-branch`：必须使用 spec-start / git-work 创建的当前分支
- `rk:base-branch`：通常为 `main`
- `rk:pr-url`：创建 PR 前留空，由 spec-end 写回
- 如果项目无 Git 仓库或用户确认无分支模式，`rk:git-branch` 写 `none` 并在风险/依赖中说明

## 禁止与推荐

**禁止**：
- ❌ Spec 确认前开始编写代码
- ❌ 在 `writer/plan.html` 中包含测试计划章节（v2.0 起移除）
- ❌ 将 execution_mode 设为 agent-teams 或把该字段解释为整个工作流不使用角色协作
- ❌ 手写一个未创建的分支名
- ❌ 直接在 `spec/` 下创建文件夹（必须放入所属版本的 `specs/` 目录）
- ❌ 任务描述使用英文
- ❌ 跳过确认步骤（`gated` 下未向用户确认，或 `autopilot` 下未过 plan 完备度闸门与 Spec 自审四问就放行）
- ❌ 在报告 HTML 里写 `<style>`、行内 `style=` 或引用外部 CDN
- ❌ 用 Obsidian 专有语法（`[[wikilink]]`、`> [!note]` Callout、`#tag`）
- ❌ 迁移时丢掉原 frontmatter 字段，或只写单向链接不补反链
- ❌ 静默改写已确认报告内容（必须递增修订号 + 追加修订历史 + `ins`/`del` 标记）

**推荐**：
- ✅ 撰写前先读 `html-report` skill，按其骨架与类名产出
- ✅ 先读取 `explorer/exploration-report.html` 了解背景
- ✅ 通过 TeamLead 与 spec-tester 讨论接口边界
- ✅ 使用 html-report 的 `rk-cal` / `rk-verdict` 组件突出重点，修订遵循 `data-rev` 规范
- ✅ 原 frontmatter 字段双轨保留（`<meta name="rk:*">` + `.rk-meta`），关联产物双向（`rk-links` + `rk-backlinks`）
- ✅ 确认 `writer/plan.html` 的 `rk:git-branch` 与当前分支一致

## 后续流程

1. 更新当前 Spec 的 `lead/team-context.md` 共享区：在「任务进度」中追加或更新 spec-writer 自己的任务行，「产物」指向 `writer/plan.html`，「状态」标记为 `done`，填写 「完成时间」 和 `updated_by: spec-writer`
2. 把 plan 中的关键设计取舍写入「决策记录」：每个方案分叉记一行「议题」/「候选项」（含被否决项）/「结论」/「理由」，「拍板者」写 `spec-writer`（若该取舍由用户拍板则写 `user`）
3. 若写方案时遇到过程性问题（依赖缺失、探索报告信息不足、接口边界未定等），在「问题闭环记录」追加一行，「分类」选 `dependency` / `process` / `scope`
4. 只修改「任务进度」/「决策记录」/「问题闭环记录」，不要修改 TeamLead 控制面区块
5. 向 AWR 提交设计完成会话检查点（使用本角色的 SESSION-ID 与上下文 HASH）：
   ```bash
   awr session checkpoint --session <SESSION-ID> --context-hash <HASH> --digest "spec-writer: plan.html 完成，已记录接口定义、数据结构、实现步骤与决策记录" --next-action "待用户确认 writer/plan.html" --expected-revision <REV>
   ```
6. 等待 `writer/plan.html` 通过确认：`gated` 等用户确认，`autopilot` 以完备度闸门四项 + 自审四问的逐条结论落账本替代
7. 通知 TeamLead，TeamLead 触发实现阶段（spec-execute）
5. 如果是功能更新，使用 `spec-update` 执行
