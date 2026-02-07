---
name: spec-writer
description: 撰写技术规格文档（Spec）。当需要创建设计方案、API 规范、数据模型、架构设计、重构方案、测试计划等技术文档时使用。触发词：创建 Spec、撰写设计文档、写技术规格、设计方案、API 规范、数据模型设计、架构设计、重构方案。必须在 spec/ 对应分类目录（01-06）下创建文件夹，保存为 plan.md。
---

# Spec Writer

## 核心规则

### MCP 确认工具（必须使用）

> [!important] 完成 plan.md 撰写后，**必须**调用 `spec_confirm` MCP 工具等待用户确认，不要直接询问用户。

```python
mcp__obsidian-spec-confirm__spec_confirm(
    file_path="spec/分类目录/YYYYMMDD-HHMM-任务描述/plan.md",
    doc_type="plan",
    title="文档标题"
)
```

### 分类目录与命名规范

**分类目录**：

| 目录 | 用途 | 适用场景 |
|------|------|----------|
| `01-项目规划` | PRD、流程设计、项目规划 | 新项目启动、功能规划 |
| `02-架构设计` | 架构、数据模型、服务层设计 | 架构设计、数据结构 |
| `03-功能实现` | 功能实现、API、集成方案 | 新功能开发、API 接口 |
| `04-问题修复` | Bug 修复、重构方案 | Bug 修复、代码重构 |
| `05-测试文档` | 测试计划、测试报告 | 测试准备、测试总结 |
| `06-已归档` | 已完成的 Spec（自动移动） | 由 spec-executor 归档 |

**文件夹命名**：`YYYYMMDD-HHMM-任务描述`
- 日期 8 位 + 时间 4 位 + 连字符分隔
- **任务描述必须使用中文**

**文件名**：固定为 `plan.md`（由 spec-writer 创建）、`summary.md`（由 spec-executor 创建）

**路径示例**：
```
✅ spec/03-功能实现/20260104-0900-专业评价Agent设计/plan.md
❌ spec/20260104-design/plan.md          （未放入分类目录）
❌ spec/03-功能实现/20260104-feature/plan.md  （任务描述必须中文）
```

## 工作流程

| 步骤 | 操作 | 要点 |
|------|------|------|
| 1 | 理解需求和背景 | 阅读需求、查看现有代码和文档、参考 CLAUDE.md |
| 2 | 确定文档类型和分类目录 | 根据需求类型选择 01-05 目录 |
| 3 | 确定文件夹命名 | `YYYYMMDD-HHMM-中文任务描述` |
| 4 | 创建文件夹 | `mkdir -p "spec/分类目录/文件夹名"` |
| 5 | 选择模板 | 详见 [references/templates.md](references/templates.md) |
| 5.5 | 评估 Agent Teams 适用性 | 见下方评估维度表 |
| 6 | 撰写 plan.md | Frontmatter + 正文，详见 [references/plan-template.md](references/plan-template.md) |
| 7 | 验证路径和命名 | 分类目录正确、日期时间当前、任务描述中文 |
| 8 | 保存文件 | `Write` 工具保存到目标路径 |
| 9 | 等待用户确认 | **必须**调用 `spec_confirm` MCP 工具 |

### 步骤 5.5：Agent Teams 适用性评估

| 维度 | Agent Teams 适合 | 单 Agent 适合 |
|------|-----------------|--------------|
| 任务可分解性 | 可拆分为 2+ 独立子任务 | 强顺序依赖，无法并行 |
| 子任务独立性 | 子任务间无共享状态 | 子任务间频繁交互 |
| 预估复杂度 | 涉及 3+ 文件/模块 | 单文件或少量修改 |
| 测试独立性 | 各子任务可独立测试 | 需要整体集成才能测试 |

评估结果写入 plan.md 的 frontmatter `execution_mode` 字段和「执行模式」章节。格式详见 [references/plan-template.md](references/plan-template.md)。

### 步骤 6：plan.md 内容要求

**撰写原则**：明确性、完整性、可追溯性、可实施性、中文优先、Obsidian 格式优化

**必须包含的章节**：
1. 概述（背景、目标、范围）
2. 需求分析
3. 设计方案
4. 执行模式（单 Agent / Agent Teams）
5. 实现步骤
6. 测试计划
7. 风险和依赖
8. 文档关联

Frontmatter 格式和字段说明详见 [references/plan-template.md](references/plan-template.md)。

### 步骤 9：MCP 确认响应处理

| 响应 | 含义 | 后续操作 |
|------|------|----------|
| `action: "continue"` | 用户确认 | 可以开始实现 |
| `action: "modify"` | 需要修改 | 根据 `userMessage` 调整 Spec |

## 禁止与推荐

**禁止**：
- ❌ Spec 确认前开始编写代码
- ❌ 直接在 `spec/` 下创建文件夹（必须放入分类目录）
- ❌ 任务描述使用英文
- ❌ 跳过 MCP 确认步骤
- ❌ 手动移动到 `06-已归档`（由 spec-executor 完成）

**推荐**：
- ✅ 先理解需求，再撰写 Spec
- ✅ 使用标准模板确保一致性
- ✅ 包含足够的技术细节和实现步骤
- ✅ 使用 Obsidian Callout 和双链增强文档

## 后续流程

1. 等待用户确认 Spec
2. 用户确认后，使用 `spec-executor` 执行实现
3. 如果是功能更新，使用 `spec-updater` 执行
