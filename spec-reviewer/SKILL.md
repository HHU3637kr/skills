---
name: spec-reviewer
description: 审查 Spec 执行完成情况，检验实现是否严格按照 Spec 执行，识别未完成项和不符项，生成审查报告（review.md）。在 spec-executor 完成 summary.md 后、用户确认归档前使用。触发词：审查 Spec、检查实现、Spec Review。
---

# Spec Reviewer

## 核心规则

### MCP 确认工具（必须使用）

> [!important] 完成审查报告后，**必须**调用 `spec_confirm` MCP 工具等待用户确认，不要直接询问用户。

```python
mcp__obsidian-spec-confirm__spec_confirm(
    file_path="spec/分类目录/YYYYMMDD-HHMM-任务描述/review.md",
    doc_type="review",
    title="Spec 审查报告 - 功能名称"
)
```

### 审查文件命名

| 场景 | 文件名 |
|------|--------|
| 新功能审查 | `review.md` |
| 更新审查 | `update-001-review.md`（编号与 update 对应） |

## 审查维度

| 维度 | 检查内容 | 标记 |
|------|----------|------|
| 完成度 | Spec 定义的功能是否全部实现（功能点、数据模型、API、测试） | ✅ 已完成 / ❌ 未完成 |
| 一致性 | 实现是否与 Spec 设计一致（接口签名、数据结构、业务逻辑、命名） | ⚠️ 不符 |
| 额外实现 | 是否有 Spec 未定义的额外功能、字段、参数 | ➕ 额外 |

### 审查严格程度

**严格模式（默认）**：所有功能必须实现、签名完全一致、不允许额外实现

**宽松模式**（用户指定时使用）：核心功能必须实现、允许小的接口差异和合理的额外实现

## 工作流程

| 步骤 | 操作 | 要点 |
|------|------|------|
| 1 | 读取 Spec 文档 | 读取 `plan.md` 或 `update-xxx.md`，提取功能点、数据模型、接口定义 |
| 2 | 读取实现总结 | 读取 `summary.md` 或 `update-xxx-summary.md`，了解已完成功能和修改文件 |
| 3 | 建立检查清单 | 从 Spec 提取所有需实现的功能点、模型、接口、测试 |
| 4 | 检查代码实现 | 根据 summary 文件列表读取实际代码，逐项核对 |
| 5 | 对比分析 | 按三个维度（完成度、一致性、额外实现）识别差异 |
| 6 | 生成审查报告 | 在 Spec 目录下创建 review.md，模板见 [references/review-template.md](references/review-template.md) |
| 7 | MCP 确认 | **必须**调用 `spec_confirm` 等待用户确认 |

### 步骤 5：对比分析要点

问题按优先级分类：
- **🔴 高优先级**：核心功能未实现、数据模型严重不符
- **🟡 中优先级**：接口参数不一致、测试缺失
- **🟢 低优先级**：命名差异、额外实现

### 步骤 6：审查报告要求

- Frontmatter 和正文模板详见 [references/review-template.md](references/review-template.md)
- 每个检查项必须标注具体的 Spec 位置和代码位置（`file:line`）
- 使用 Obsidian Callout 标注结果：`> [!success]`、`> [!failure]`、`> [!warning]`、`> [!tip]`
- 使用 `[[]]` 双链关联 plan.md 和 summary.md

### 步骤 7：MCP 确认响应处理

| 响应 | 含义 | 后续操作 |
|------|------|----------|
| `action: "continue"` | 用户确认 | 审查通过 → 可归档；需修复 → 等待修复后重新审查 |
| `action: "modify"` | 需要修改 | 根据 `userMessage` 调整审查报告 |

## 审查结果与后续

| result 值 | 后续操作 |
|-----------|----------|
| `通过` | 新功能 → 归档到 `06-已归档`；更新 → 保留原目录 |
| `需修复` | 列出问题清单 → 等待修复 → 重新审查 |
| `严重不符` | 需要重新实现 |

## 禁止与推荐

**禁止**：
- ❌ 只检查完成度，忽略一致性和额外实现检查
- ❌ 审查报告缺少具体代码位置引用
- ❌ 跳过 MCP 确认步骤

**推荐**：
- ✅ 每个检查项标注 Spec 位置 + 代码位置
- ✅ 问题按优先级分类（🔴🟡🟢）
- ✅ 发现常见实现偏差模式时记录到经验库
