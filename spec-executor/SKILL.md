---
name: spec-executor
description: >
  执行基于 plan.md 的新功能开发。支持双轨工作流：根据 plan.md 的 execution_mode 字段
  自动选择单 Agent（路径 A）或 Agent Teams（路径 B）执行。
  触发条件：(1) 用户要求根据 plan.md 实现功能，(2) 用户说"执行 Spec"，
  (3) spec/ 目录下存在 plan.md 但没有 summary.md。
  仅用于新功能首次实现。如果目录下已有 summary.md，应使用 spec-updater。
---

# Spec Executor

根据 `spec/` 目录中的 `plan.md` 执行新功能开发，严格遵循已批准的设计方案，不添加额外功能。完成后创建 `summary.md`，归档到 `06-已归档`。

## 核心原则

1. **Spec 优先**：只实现 plan.md 中明确定义的功能，不添加、不偏离、不"优化"
2. **用户确认必须执行**：完成 summary.md 后必须使用 `AskUserQuestion` 工具向用户确认
3. **经验反思必须执行**：归档前必须调用 `/exp-reflect` 进行经验反思

## 工作流程

### 步骤 1：读取并理解 plan.md

1. 使用 `Read` 工具读取 plan.md
2. 理解目标、范围、设计方案、数据模型、接口定义
3. 记录 Spec 所在的分类目录（用于归档）

### 步骤 1.5：读取执行模式

从 plan.md 的 frontmatter 读取 `execution_mode` 字段：
- `agent-teams` → 进入**路径 B**
- `single-agent` 或字段不存在 → 进入**路径 A**（默认）

---

## 路径 A：单 Agent 工作流

适用于 `execution_mode: single-agent` 或字段不存在的情况。

### 步骤 A2：验证 plan.md 完整性

检查 plan.md 是否包含：目标和范围、设计方案、数据模型、接口签名、实现步骤、测试计划。

如果不完整，停止执行并告知用户缺少哪些内容。

### 步骤 A3：确定开发阶段

根据 plan.md 内容判断当前阶段，检查前置依赖是否已完成。如果前置阶段未完成，停止并提醒用户。

### 步骤 A4：检索历史经验

根据 plan.md 的功能关键词，调用 `/exp-search <关键词>` 检索相关经验，在实现时参考。

### 步骤 A5：创建任务清单

根据 plan.md 的"实现步骤"章节，使用 `TaskCreate` 创建任务清单并标记依赖关系。

### 步骤 A6：按顺序实现功能

按任务清单顺序逐个实现，严格遵循 plan.md 的设计：
- 使用 plan.md 中定义的类名、方法名、数据结构
- 在代码注释中引用 plan.md 路径和章节

### 步骤 A7：编写测试

使用 plan.md 中的测试用例编写单元测试，确保覆盖率 > 80%。

### 步骤 A8：运行测试验证

运行测试，修复失败项，确认全部通过。

### 步骤 A9：创建 summary.md

在 plan.md 同目录下创建 summary.md。格式模板见 [references/summary-template.md](references/summary-template.md)。

撰写时直接应用 Obsidian 格式：
- 使用 Callout 标注关键信息（`> [!success]`、`> [!warning]`、`> [!note]`）
- 使用双链建立文档关联：`[[plan|设计方案]]`
- 添加标签：`#spec/已完成` `#summary`

### 步骤 A10：等待用户确认

使用 `AskUserQuestion` 工具向用户确认 summary.md：

```python
AskUserQuestion(
    questions=[{
        "question": "summary.md 已创建完成，请确认是否可以继续归档？",
        "header": "确认归档",
        "multiSelect": false,
        "options": [
            {
                "label": "确认，继续归档",
                "description": "summary.md 内容正确，可以归档到 06-已归档"
            },
            {
                "label": "需要修改",
                "description": "summary.md 需要调整，请说明修改要求"
            }
        ]
    }]
)
```

响应处理：
- 用户选择"确认，继续归档" → 继续归档
- 用户选择"需要修改"或"Other" → 根据用户反馈修复后重新确认

### 步骤 A11：经验反思与沉淀

调用 `/exp-reflect`，以 summary.md 中的「遇到的问题」和「解决方案」为反思素材。如有值得沉淀的经验，按 exp-reflect 流程完成写入。

### 步骤 A12：更新 summary.md 添加经验引用

如果步骤 A11 沉淀了经验，在 summary.md 的「文档关联」章节添加双链引用：

```markdown
## 文档关联
- 设计文档: [[plan|设计方案]]
- 沉淀经验: [[spec/context/experience/exp-007-异步任务超时处理|EXP-007 异步任务超时处理]]
```

### 步骤 A13：归档

将整个 Spec 文件夹从当前分类目录移动到 `06-已归档`，验证移动成功。

```bash
mv "spec/03-功能实现/20251231-HHMM-任务描述" "spec/06-已归档/"
```

注意：必须等用户确认后才能归档。如果 `06-已归档` 中已存在同名文件夹，先处理冲突。

---

## 路径 B：Agent Teams 工作流

适用于 `execution_mode: agent-teams` 的情况，通过创建团队并行执行子任务。

### 步骤 B1：读取执行模式章节

从 plan.md 的「执行模式」章节获取：队友名称和职责、任务拆分方案、依赖关系。

### 步骤 B2：检索历史经验

同路径 A 步骤 A4，将关键经验信息纳入队友的 prompt 中。

### 步骤 B3：创建团队

```python
TeamCreate(
    team_name="spec-{YYYYMMDD-HHMM}-{任务简称}",
    description="执行 plan.md: {plan路径}"
)
```

### 步骤 B4：创建任务列表

根据 plan.md 的任务拆分方案，使用 TaskCreate 创建任务，使用 TaskUpdate 设置依赖关系。

### 步骤 B5：生成队友并分配任务

```python
Task(
    subagent_type="general-purpose",
    name="implementer",
    team_name="spec-{name}",
    prompt="你是 spec-executor 团队的实现者。请根据以下 plan.md 实现功能...",
    mode="bypassPermissions"
)
```

队友 prompt 要求：
- 包含 plan.md 完整路径
- 明确职责边界
- 包含相关历史经验（如有）
- 说明协作规则

### 步骤 B6：监控执行进度

接收队友完成消息，检查 TaskList 确认进度，处理协调问题。

### 步骤 B7：汇总结果，运行集成测试

所有队友完成后运行完整测试，确认 plan.md 要求都已满足。测试失败则通知相关队友修复。

### 步骤 B8：创建 summary.md

同路径 A 步骤 A9，额外记录：使用了 Agent Teams 模式、各队友完成情况。

### 步骤 B9：等待用户确认

同路径 A 步骤 A10，使用 `AskUserQuestion` 工具向用户确认。

### 步骤 B10：经验反思与沉淀

同路径 A 步骤 A11。

### 步骤 B11：更新 summary.md 添加经验引用

同路径 A 步骤 A12。

### 步骤 B12：关闭团队

```python
SendMessage(type="shutdown_request", recipient="implementer", content="任务完成")
SendMessage(type="shutdown_request", recipient="tester", content="任务完成")
# 等待队友确认关闭后
TeamDelete()
```

### 步骤 B13：归档

同路径 A 步骤 A13。

---

## 分类目录

| 目录 | 用途 |
|------|------|
| `01-项目规划` | 项目整体规划、PRD |
| `02-架构设计` | 系统架构、数据模型 |
| `03-功能实现` | 具体功能实现方案 |
| `04-问题修复` | Bug 修复方案 |
| `05-测试文档` | 测试计划、报告 |
| `06-已归档` | 执行完成后归档 |

## 与其他 Skill 的协作

```
spec-writer 创建 plan.md → spec-executor 执行实现 → 创建 summary.md
→ 用户确认 → exp-reflect 经验反思 → 归档到 06-已归档
```

- 如果目录下已有 `summary.md`，使用 `spec-updater` 而非本 Skill
- 用户可随时调用 `spec-reviewer` 进行审查

## 后续动作

完成执行后确认：
1. summary.md 已创建并经用户确认
2. 已调用 `/exp-reflect` 进行经验反思
3. 如有经验沉淀，已更新 summary.md 添加经验引用
4. Spec 文件夹已归档到 `06-已归档`

### 常见陷阱
- 添加了 plan.md 中未定义的额外功能
- 忘记使用 AskUserQuestion 确认 summary.md
- 未等待用户确认就归档
- 归档前忘记调用 exp-reflect
