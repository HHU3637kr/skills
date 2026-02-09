---
name: spec-updater
description: 执行已有功能的更新迭代。支持双轨工作流——根据 update-xxx.md 的 execution_mode 字段选择单 Agent（路径 A）或 Agent Teams（路径 B）。触发条件：(1) 修改已有功能（目录下已有 plan.md + summary.md），(2) 根据 update-xxx.md 执行更新，(3) 功能迭代/Bug修复/性能优化。与 spec-executor 的区别：spec-executor 用于新功能开发并归档，spec-updater 用于功能更新且不归档。
---

# Spec Updater

## 核心原则

1. **同目录原则**：update 文档必须放在原 plan.md 的同一目录下，禁止创建新目录
2. **不归档原则**：更新完成后不归档，保留在原目录以便后续更新
3. **编号递增**：update-001.md → update-002.md → update-003.md（三位数，不跳号）
4. **严格遵循方案**：只实现 update-xxx.md 定义的修改，不添加方案之外的内容
5. **回归测试必须通过**：新增测试 + 修改测试 + 原有功能回归测试全部通过

## 用户确认（必须执行）

在以下两个节点**必须**使用 `AskUserQuestion` 工具：

**节点 1 — 更新方案确认**（创建 update-xxx.md 后）：
```python
AskUserQuestion(
    questions=[{
        "question": "update-xxx.md 已创建完成，更新方案是否可以开始执行？",
        "header": "确认方案",
        "multiSelect": false,
        "options": [
            {
                "label": "确认，开始执行",
                "description": "更新方案正确，可以开始实现"
            },
            {
                "label": "需要修改",
                "description": "更新方案需要调整，请说明修改要求"
            }
        ]
    }]
)
```

**节点 2 — 审查报告确认**（生成 update-xxx-review.md 后）：
```python
AskUserQuestion(
    questions=[{
        "question": "update-xxx-review.md 已创建完成，审查结果是否通过？",
        "header": "确认审查",
        "multiSelect": false,
        "options": [
            {
                "label": "审查通过",
                "description": "更新实现符合要求，审查通过"
            },
            {
                "label": "需要修复",
                "description": "存在问题需要修复，请说明问题"
            }
        ]
    }]
)
```

响应处理：选择确认选项 → 继续；选择修改/修复或"Other" → 根据用户反馈调整后重新确认。

## 文档模板

- **update-xxx.md 模板**：见 [references/update-template.md](references/update-template.md)（含 frontmatter 字段说明）
- **update-xxx-summary.md 模板**：见 [references/summary-template.md](references/summary-template.md)（含 frontmatter 字段说明）

撰写 summary 时应用 Obsidian 格式：`[[plan|设计方案]]` 双链、`> [!success]` / `> [!warning]` Callout、`#spec/更新` 标签。

## 工作流程

### 公共步骤（步骤 1-4.5）

1. **确认原 Spec 目录**：找到目录，确认 `plan.md` 和 `summary.md` 都存在。若缺少 summary.md，先用 spec-executor 完成原功能
2. **确定更新编号**：检查目录下已有的 `update-*.md`，确定下一个编号
3. **创建 update-xxx.md**：由 spec-writer 在同一目录创建，参照 update-template.md
4. **等待用户确认**：使用 `AskUserQuestion` 工具（节点 1）
5. **读取 execution_mode**：
   - `single-agent` 或字段不存在 → **路径 A**
   - `agent-teams` → **路径 B**

### 路径 A：单 Agent 工作流

| 步骤 | 操作 | 要点 |
|------|------|------|
| A5 | 读取理解 update-xxx.md | 识别修改文件和功能范围 |
| A6 | 检索历史经验 | 调用 `/exp-search <关键词>` |
| A7 | 创建任务清单 | 根据"实现步骤"章节创建 |
| A8 | 按方案实现更新 | 严格遵循方案，不修改方案之外的代码 |
| A9 | 编写/更新测试 | 新增测试 + 修改测试 + 回归测试 |
| A10 | 运行测试验证 | 全部通过才能继续 |
| A11 | 创建 update-xxx-summary.md | 参照 summary-template.md，应用 Obsidian 格式 |
| A12 | 使用 spec-reviewer 审查 | 生成 update-xxx-review.md |
| A13 | 等待用户确认审查报告 | 使用 `AskUserQuestion` 工具（节点 2），完成后不归档 |

### 路径 B：Agent Teams 工作流

| 步骤 | 操作 | 要点 |
|------|------|------|
| B1 | 读取执行模式详情 | 从 update-xxx.md 获取队友名称、职责、任务拆分、依赖关系 |
| B2 | 检索历史经验 | 同路径 A 步骤 A6，将关键经验纳入队友 prompt |
| B3 | 创建团队 | `TeamCreate(team_name="update-{YYYYMMDD-HHMM}-{任务简称}")` |
| B4 | 创建任务列表 | TaskCreate + TaskUpdate 设置依赖关系 |
| B5 | 生成队友并分配任务 | 队友 prompt 必须包含：update-xxx.md 路径、plan.md/summary.md 路径、职责边界、回归测试要求 |
| B6 | 监控执行进度 | 接收队友消息，检查 TaskList，协调问题 |
| B7 | 汇总结果，运行回归测试 | 全量测试，失败则通知队友修复 |
| B8 | 创建 update-xxx-summary.md | 同路径 A 步骤 A11，额外记录 Agent Teams 模式和各队友完成情况 |
| B9 | 使用 spec-reviewer 审查 | 同路径 A 步骤 A12 |
| B10 | 等待用户确认审查报告 | 同路径 A 步骤 A13，使用 `AskUserQuestion` 工具 |
| B11 | 经验反思与沉淀 | 调用 `/exp-reflect`，以 summary 中的问题和方案为素材 |
| B12 | 关闭团队 | SendMessage shutdown_request → TeamDelete |
| B13 | 完成 | 不归档 |

## 错误处理

| 场景 | 解决方案 |
|------|----------|
| 原 Spec 目录不存在 | 确认路径；若为新功能，用 spec-writer + spec-executor |
| 缺少 summary.md | 先用 spec-executor 完成原功能 |
| 回归测试失败 | 分析原因 → 修复回归代码 → 重新测试 → 全部通过后才能继续 |

## 后续动作

完成更新后：
1. 调用 `/exp-reflect` 进行经验反思
2. 如有经验沉淀，更新 summary 添加经验引用
3. **不归档**，保留在原目录
