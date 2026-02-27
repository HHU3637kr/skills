---
name: spec-init
description: >
  初始化 Spec 驱动开发的 Agent Teams 工作流。当用户开始一个新的开发任务、需要创建结构化的
  多角色协作团队时使用。触发条件：(1) 用户说"开始新任务"/"创建开发团队"/"初始化工作流"，
  (2) 需要启动完整的 Spec 驱动开发流程（含探索→撰写→实现→测试→收尾），
  (3) 用户希望使用 Agent Teams 架构管理一个开发任务。
---

# Spec Init

## 核心原则

1. **当前 Agent 即是 TeamLead**：调用本 Skill 的 Agent 本身就承担 TeamLead 职责，无需创建额外的 TeamLead 角色
2. **Teams 贯穿整个周期**：创建后不提前销毁，所有角色随时可被唤起
3. **角色 vs Skill 区分**：角色（spec-writer）是 Who，Skill（spec-write）是 How
4. **TeamLead 统一协调**：所有阶段转换和用户确认节点均由 TeamLead（当前 Agent）主导

## 角色总览

| 角色 | 调用的 Skill | 产出物 | 活跃阶段 |
|------|------------|--------|---------|
| **TeamLead（当前 Agent）** | `intent-confirmation` | 无 | 全程 |
| spec-explorer | `spec-explore` | `exploration-report.md` | 阶段二（前置） |
| spec-writer | `spec-write` | `plan.md` | 阶段二 |
| spec-tester | `spec-test` | `test-plan.md`, `test-report.md` | 阶段二 + 阶段四 |
| spec-executor | `spec-execute` | `summary.md` | 阶段三 |
| spec-debugger | `spec-debug` | `debug-xxx.md`, `debug-xxx-fix.md` | 阶段三/四（按需） |
| spec-ender | `spec-end` | 无（写入 context/ + git 提交） | 阶段五 |

## 工作流程

### 步骤 1：澄清任务需求

使用 `intent-confirmation` 与用户对齐：
- 任务目标和范围
- 是否需要完整的 5 阶段流程，还是部分阶段
- 是否有已有的 Spec（若有，直接进入对应阶段）

### 步骤 2：创建 Agent Teams 并初始化 6 个专职角色

```python
TeamCreate(
    team_name="spec-{YYYYMMDD-HHMM}-{任务简称}",
    description="Spec 驱动开发: {任务描述}"
)
```

### 步骤 3：初始化各专职角色

按以下 prompt 模板创建 6 个专职角色，各角色通过调用对应 Skill 完成工作：

**spec-explorer**：
```
你是 spec-explorer，负责 Spec 创建前的信息收集。
调用 spec-explore Skill 完成工作。
产出：exploration-report.md
等待 TeamLead 的 SendMessage 后开始工作。
```

**spec-writer**：
```
你是 spec-writer，负责撰写代码实现计划。
调用 spec-write Skill 完成工作。
产出：plan.md（纯代码实现计划，不含测试计划）
注意：plan.md 的 execution_mode 固定为 single-agent
等待 spec-explorer 完成后开始，与 spec-tester 协作讨论接口设计。
```

**spec-tester**：
```
你是 spec-tester，负责测试策略设计（Spec 阶段）和测试执行（测试阶段）。
调用 spec-test Skill 完成工作。
产出：test-plan.md（Spec 阶段）、test-report.md（测试阶段）
Spec 阶段：与 spec-writer 协作讨论接口边界和验收标准
测试阶段：发现 bug 时通知 spec-debugger，等待修复后重新验证
```

**spec-executor**：
```
你是 spec-executor，负责严格按 plan.md 实现代码。
调用 spec-execute Skill 完成工作。
产出：summary.md
禁止：添加 plan.md 未定义的功能；编写测试（由 spec-tester 负责）
完成后通过 SendMessage 通知 TeamLead。
```

**spec-debugger**：
```
你是 spec-debugger，负责诊断和修复 bug。
调用 spec-debug Skill 完成工作。
产出：debug-xxx.md, debug-xxx-fix.md
接收 spec-tester 的 bug 通知后开始工作。
修复完成后通知 spec-tester 重新验证。
```

**spec-ender**：
```
你是 spec-ender，负责整个 Spec 完成后的收尾工作。
调用 spec-end Skill 完成工作。
工作：向各角色发起讨论 → 汇总素材 → 调用 exp-reflect → 询问用户是否归档 → 调用 git-workflow-sop 提交
完成后通知 TeamLead，Teams 进入待机状态。
```

### 步骤 4：启动阶段一（需求对齐）

作为 TeamLead，直接使用 `intent-confirmation` 与用户确认需求，完成后通知 spec-explorer 开始阶段二。

## 完整协作时序

```
阶段一：需求对齐
  TeamLead（当前 Agent）→ intent-confirmation → 用户确认

阶段二：Spec 创建
  TeamLead → spec-explorer 开始
  spec-explorer → exploration-report.md → 通知 spec-writer + spec-tester
  spec-writer ↔ spec-tester 协作讨论
  两者完成 → 通知 TeamLead
  TeamLead → AskUserQuestion → 用户确认 plan.md + test-plan.md

阶段三：实现
  TeamLead → spec-executor 开始
  spec-executor → summary.md → 通知 TeamLead
  TeamLead → AskUserQuestion → 用户确认 summary.md

阶段四：测试
  TeamLead → spec-tester 开始执行
  [如有 bug] spec-tester → spec-debugger → 修复 → 验证 → test-report.md
  spec-tester → test-report.md → 通知 TeamLead
  TeamLead → AskUserQuestion → 用户确认 test-report.md

阶段五：收尾
  TeamLead → spec-ender 开始
  spec-ender → 多角色讨论 + exp-reflect → 询问用户归档 → git 提交 → 通知 TeamLead
  TeamLead → 通知用户完成，Teams 进入待机
```

## 用户确认节点

| 节点 | 由谁发起 | 确认内容 |
|------|---------|---------|
| 需求对齐 | TeamLead | 需求理解正确 |
| Spec 审阅 | TeamLead | plan.md + test-plan.md |
| 实现确认 | TeamLead | summary.md |
| 诊断确认 | TeamLead | debug-xxx.md（如有） |
| 测试报告确认 | TeamLead | test-report.md |
| 归档确认 | spec-ender | 是否归档 + git 提交 |

## 后续动作

初始化完成后确认：
1. TeamCreate 已成功执行
2. 6 个专职角色已创建（spec-explorer/writer/tester/executor/debugger/ender）
3. 阶段一（需求对齐）已启动
4. 用户已了解整体流程

### 常见陷阱
- 创建角色时混淆角色名（spec-writer）和 Skill 名（spec-write）
- 尝试创建 TeamLead 角色（当前 Agent 本身就是 TeamLead）
- 阶段转换时未等待用户确认就继续
