---
name: spec-reviewer
description: 审查 Spec 执行完成情况，检验实现是否严格按照 Spec 执行，识别未完成项和不符项，生成审查报告。在 spec-executor 完成后、用户确认归档前使用。
allowed-tools: Read, Grep, Glob, Write(spec/**), Bash, LSP
---

# Spec Reviewer

## 概述

这个 Skill 用于审查 `spec-executor` 的执行结果，检验实现是否严格按照 Spec 文档执行。审查完成后在 Spec 目录下生成审查报告（`review.md` 或 `update-xxx-review.md`），作为用户确认归档前的质量把关环节。

## 使用时机

```
spec-writer 创建 plan.md
       ↓
用户确认 Spec
       ↓
spec-executor 执行实现
       ↓
spec-executor 创建 summary.md
       ↓
【spec-reviewer 审查实现】 ← 当前 Skill
       ↓
生成 review.md
       ↓
用户阅读审查报告
       ↓
用户确认后归档
```

## 审查范围

### 1. 完成度检查

检查 Spec 中定义的所有功能是否都已实现：

| 检查项 | 说明 |
|--------|------|
| 功能点 | plan.md 中列出的每个功能是否都已实现 |
| 数据模型 | 定义的数据结构是否都已创建 |
| API 接口 | 定义的接口是否都已实现 |
| 测试用例 | 计划的测试是否都已编写和通过 |

### 2. 一致性检查

检查实现是否与 Spec 设计一致：

| 检查项 | 说明 |
|--------|------|
| 接口签名 | 函数/方法签名是否与 Spec 一致 |
| 数据结构 | 字段名、类型是否与 Spec 一致 |
| 业务逻辑 | 实现逻辑是否符合 Spec 描述 |
| 命名规范 | 类名、变量名是否与 Spec 一致 |

### 3. 额外实现检查

检查是否有 Spec 中未定义的额外实现：

| 检查项 | 说明 |
|--------|------|
| 额外功能 | 是否添加了 Spec 未定义的功能 |
| 额外字段 | 数据模型是否有额外字段 |
| 额外参数 | 接口是否有额外参数 |

## 工作流程

```
Spec 审查流程：
- [ ] 步骤 1：读取 Spec 文档（plan.md 或 update-xxx.md）
- [ ] 步骤 2：读取实现总结（summary.md 或 update-xxx-summary.md）
- [ ] 步骤 3：分析 Spec 中的功能清单
- [ ] 步骤 4：检查代码实现
- [ ] 步骤 5：对比分析，识别差异
- [ ] 步骤 6：生成审查报告
- [ ] 步骤 7：告知用户审查结果
```

### 步骤详解

#### 步骤 1：读取 Spec 文档

**操作**：
1. 读取 `plan.md` 或 `update-xxx.md`
2. 提取所有功能点、数据模型、接口定义
3. 建立检查清单

**示例**：
```bash
Read(file_path="spec/03-功能实现/20260104-1713-专业评价Agent设计/plan.md")
```

#### 步骤 2：读取实现总结

**操作**：
1. 读取 `summary.md` 或 `update-xxx-summary.md`
2. 了解已完成的功能和修改的文件
3. 获取测试结果

**示例**：
```bash
Read(file_path="spec/03-功能实现/20260104-1713-专业评价Agent设计/summary.md")
```

#### 步骤 3：分析 Spec 中的功能清单

**操作**：
1. 从 Spec 中提取所有需要实现的功能点
2. 提取数据模型定义
3. 提取 API 接口定义
4. 提取测试计划

**输出格式**：
```
功能清单：
- [ ] 功能 1：描述
- [ ] 功能 2：描述
- [ ] 功能 3：描述

数据模型：
- [ ] Model1：字段列表
- [ ] Model2：字段列表

API 接口：
- [ ] GET /api/xxx
- [ ] POST /api/xxx
```

#### 步骤 4：检查代码实现

**操作**：
1. 根据 summary.md 中的文件列表，读取实际代码
2. 检查每个功能点的实现情况
3. 检查数据模型的字段定义
4. 检查 API 接口的实现

**工具使用**：
```bash
# 读取实现文件
Read(file_path="backend/agents/xxx/xxx.py")

# 搜索特定实现
Grep(pattern="class ModelName", path="backend/")

# 查找文件
Glob(pattern="backend/**/*_service.py")
```

#### 步骤 5：对比分析，识别差异

**检查维度**：

1. **已完成项** ✅
   - Spec 中定义且已正确实现的功能

2. **未完成项** ❌
   - Spec 中定义但未实现的功能

3. **不符项** ⚠️
   - 已实现但与 Spec 定义不一致的功能

4. **额外项** ➕
   - Spec 中未定义但已实现的功能

#### 步骤 6：生成审查报告

**操作**：
1. 在 Spec 目录下创建 `review.md`（新功能）或 `update-xxx-review.md`（更新）
2. 记录所有检查结果
3. 给出审查结论和建议
4. **撰写时直接应用 Obsidian 格式优化**

**Obsidian 格式优化（撰写时应用）**：

1. **文档关联（必须）**：使用双链建立文档间的关系
   - **review.md**：必须链接到 plan.md 和 summary.md
   - **update-xxx-review.md**：必须链接到 update-xxx.md 和 update-xxx-summary.md
   - 示例：`设计文档: [[plan|设计方案]]`、`实现总结: [[summary|实现总结]]`

2. **使用 Callout 标注审查结果**：
   - `> [!success]` 标注审查通过的部分
   - `> [!failure]` 标注未完成或不符项
   - `> [!warning]` 标注需要关注的风险点
   - `> [!tip]` 标注改进建议

3. **添加标签**：便于后续检索
   - 示例：`#spec/审查` `#review`
   - 如有问题：`#spec/待修复`

**相关 Skill**：
- 详细 Obsidian Markdown 语法：使用 `obsidian-markdown` Skill
- 创建审查结果可视化：使用 `json-canvas` Skill 展示问题分布
- 更新 Spec 索引：使用 `obsidian-bases` Skill 更新索引状态

**文件命名**：
- 新功能审查：`review.md`
- 更新审查：`review-001.md`、`review-002.md`（与 update 编号对应）

**示例**：
```bash
Write(file_path="spec/03-功能实现/20260104-1713-专业评价Agent设计/review.md", content="...")
```

#### 步骤 7：告知用户审查结果

**操作**：
1. 总结审查结果
2. 列出关键问题（如有）
3. 给出建议

**示例对话**：
```
Claude: Spec 审查已完成，报告已保存到 review.md

审查结果摘要：
- ✅ 已完成：8/10 项功能
- ❌ 未完成：2 项功能
- ⚠️ 不符项：1 项
- ➕ 额外项：0 项

主要问题：
1. 功能 X 未实现
2. 接口 Y 的参数与 Spec 不一致

建议：请先修复以上问题后再确认归档。
```

## Frontmatter 规范

### 文档 Frontmatter 要求

审查报告文档必须包含 YAML frontmatter，用于文档管理和索引。

#### review.md Frontmatter（新功能审查）

```yaml
---
title: 功能名称-审查报告
type: review
category: 03-功能实现
status: 未确认
result: 通过/需修复/严重不符
created: YYYY-MM-DD
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec
  - review
---
```

#### update-xxx-review.md Frontmatter（更新审查）

```yaml
---
title: 功能名称-更新XXX-审查报告
type: review
update_number: 1
category: 03-功能实现
status: 未确认
result: 通过/需修复/严重不符
created: YYYY-MM-DD
plan: "[[plan]]"
update: "[[update-XXX]]"
update_summary: "[[update-XXX-summary]]"
tags:
  - spec
  - review
---
```

### Frontmatter 字段说明

| 字段 | review.md | update-xxx-review.md | 说明 |
|------|-----------|---------------|------|
| `title` | 必填 | 必填 | 文档标题，格式：`功能名称-审查报告` / `功能名称-更新XXX-审查报告` |
| `type` | `review` | `review` | 文档类型标识 |
| `update_number` | - | 必填 | 更新编号，与 update 文档一致 |
| `category` | 必填 | 必填 | 分类目录，继承自原 plan.md |
| `status` | `未确认`/`已确认`/`已归档` | `未确认`/`已确认`/`已归档` | 审查状态（见下方状态变更规则） |
| `result` | 必填 | 必填 | 审查结果：`通过`/`需修复`/`严重不符` |
| `created` | 必填 | 必填 | 审查日期，`YYYY-MM-DD` 格式 |
| `plan` | 必填 | 必填 | 链接到 plan.md |
| `summary` | 必填 | - | 链接到 summary.md |
| `update` | - | 必填 | 链接到 update-xxx.md |
| `update_summary` | - | 必填 | 链接到 update-xxx-summary.md |
| `tags` | 必填 | 必填 | 标签列表，必须包含 `spec` 和 `review` |

**status 状态变更规则**：

```
┌─────────────┐    用户确认    ┌─────────────┐    归档完成    ┌─────────────┐
│   未确认    │ ────────────→ │   已确认    │ ────────────→ │   已归档    │
└─────────────┘               └─────────────┘               └─────────────┘
       ↑                             │
       │      用户修改文档内容        │
       └─────────────────────────────┘
```

| 触发条件 | 状态变更 | 操作说明 |
|----------|----------|----------|
| 创建 review.md | → `未确认` | 初始状态 |
| 用户确认审查报告 | `未确认` → `已确认` | 用户确认审查报告无误时，更新 frontmatter |
| 用户修改文档 | `已确认` → `未确认` | 文档内容被修改后，需重新确认 |
| 归档完成 | `已确认` → `已归档` | 归档时更新 |

### result 可选值

| 值 | 使用场景 |
|----|----------|
| `通过` | 所有功能已完成，无不符项，可以归档 |
| `需修复` | 存在未完成或不符项，需要修复后再归档 |
| `严重不符` | 实现与 Spec 严重不符，需要重新实现 |

## 审查报告模板

```markdown
---
title: 功能名称-审查报告
type: review
category: 03-功能实现
status: 未确认
result: 需修复
created: YYYY-MM-DD
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec
  - review
---

# Spec 审查报告

## 文档信息

- **审查日期**: YYYY-MM-DD HH:MM
- **审查对象**: plan.md / update-xxx.md
- **Spec 路径**: spec/分类目录/YYYYMMDD-HHMM-任务描述/

---

## 1. 审查摘要

| 类别 | 数量 | 状态 |
|------|------|------|
| 已完成 | X | ✅ |
| 未完成 | X | ❌ |
| 不符项 | X | ⚠️ |
| 额外项 | X | ➕ |

**总体评价**：通过 / 需修复 / 严重不符

---

## 2. 详细检查结果

### 2.1 功能完成度

#### ✅ 已完成

| 功能 | Spec 位置 | 实现位置 | 说明 |
|------|-----------|----------|------|
| 功能 1 | plan.md 3.1 | xxx.py:50 | 符合预期 |
| 功能 2 | plan.md 3.2 | xxx.py:100 | 符合预期 |

#### ❌ 未完成

| 功能 | Spec 位置 | 说明 |
|------|-----------|------|
| 功能 X | plan.md 3.5 | 未找到实现 |

#### ⚠️ 不符项

| 功能 | Spec 定义 | 实际实现 | 差异说明 |
|------|-----------|----------|----------|
| 接口 Y | `def foo(a, b)` | `def foo(a)` | 缺少参数 b |

#### ➕ 额外项

| 功能 | 实现位置 | 说明 |
|------|----------|------|
| （无） | - | - |

---

### 2.2 数据模型检查

#### Spec 定义

```python
class ModelName(BaseModel):
    field1: str
    field2: int
    field3: Optional[str]
```

#### 实际实现

```python
class ModelName(BaseModel):
    field1: str
    field2: int
    # field3 未实现
```

#### 差异分析

- ❌ `field3` 未实现

---

### 2.3 API 接口检查

| 接口 | Spec 定义 | 实现状态 | 说明 |
|------|-----------|----------|------|
| GET /api/xxx | 返回列表 | ✅ | 符合 |
| POST /api/xxx | 创建资源 | ✅ | 符合 |

---

### 2.4 测试检查

| 测试项 | 计划 | 实际 | 状态 |
|--------|------|------|------|
| 单元测试 | 10 | 10 | ✅ |
| 集成测试 | 5 | 3 | ⚠️ 缺少 2 个 |

---

## 3. 问题清单

### 高优先级 🔴

1. **问题描述**
   - Spec 位置：plan.md 3.5
   - 问题：功能 X 未实现
   - 建议：需要补充实现

### 中优先级 🟡

1. **问题描述**
   - Spec 位置：plan.md 4.2
   - 问题：接口参数不一致
   - 建议：修改接口签名

### 低优先级 🟢

（无）

---

## 4. 审查结论

### 4.1 是否可以归档

- [ ] 可以归档（所有功能已完成，无不符项）
- [x] 需要修复后再归档（存在未完成或不符项）
- [ ] 严重不符，需要重新实现

### 4.2 修复建议

1. 补充实现功能 X
2. 修复接口 Y 的参数问题
3. 补充缺少的集成测试

### 4.3 后续步骤

1. 根据问题清单修复问题
2. 修复完成后重新运行 spec-reviewer
3. 确认无问题后再归档

---

## 5. 文档关联

- 设计文档: [[plan|设计方案]]
- 实现总结: [[summary|实现总结]]

---

## 6. 审查人

- **审查工具**: Claude Code (spec-reviewer)
- **审查时间**: YYYY-MM-DD HH:MM
```

## 审查严格程度

### 严格模式（默认）

- 所有 Spec 定义的功能必须实现
- 接口签名必须完全一致
- 数据模型字段必须完全一致
- 不允许额外实现

### 宽松模式

- 核心功能必须实现
- 允许小的接口差异（如额外的可选参数）
- 允许数据模型有额外字段
- 允许合理的额外实现

**切换方式**：用户可以在调用时指定模式

## 与其他 Skill 的协作

### 完整工作流

```
1. spec-writer 创建 plan.md
   ↓
2. 用户确认 Spec
   ↓
3. spec-executor 执行实现
   ↓
4. spec-executor 创建 summary.md
   ↓
5. spec-reviewer 审查实现 ← 当前 Skill
   ↓
6. spec-reviewer 创建 review.md
   ↓
7. 用户阅读 review.md
   ↓
8. 如有问题 → 修复 → 重新审查
   ↓
9. 用户确认无问题
   ↓
10. 归档到 06-已归档
```

### 更新流程

```
1. spec-writer 创建 update-xxx.md
   ↓
2. 用户确认更新 Spec
   ↓
3. spec-executor 执行更新
   ↓
4. spec-executor 创建 update-xxx-summary.md
   ↓
5. spec-reviewer 审查更新 ← 当前 Skill
   ↓
6. spec-reviewer 创建 update-xxx-review.md
   ↓
7. 用户阅读 update-xxx-review.md
   ↓
8. 如有问题 → 修复 → 重新审查
   ↓
9. 用户确认无问题
```

## Spec 目录结构（含审查报告）

```
spec/03-功能实现/20260104-1713-专业评价Agent设计/
├── plan.md                  # 初始设计
├── summary.md               # 实现总结
├── review.md                # 审查报告
├── update-001.md            # 第一次更新
├── update-001-summary.md    # 第一次更新总结
└── review-001.md            # 第一次更新审查报告
```

## 检查清单

审查前确认：
- [ ] Spec 文档存在（plan.md 或 update-xxx.md）
- [ ] 实现总结存在（summary.md 或 update-xxx-summary.md）
- [ ] 了解 Spec 的目标和范围

审查后确认：
- [ ] 已检查所有功能点
- [ ] 已检查数据模型
- [ ] 已检查 API 接口
- [ ] 已检查测试情况
- [ ] 已生成审查报告
- [ ] 已告知用户审查结果

## 快速参考

### 常用命令

```bash
# 读取 Spec
Read(file_path="spec/03-功能实现/xxx/plan.md")

# 读取实现总结
Read(file_path="spec/03-功能实现/xxx/summary.md")

# 搜索实现代码
Grep(pattern="class ClassName", path="backend/")

# 查找文件
Glob(pattern="backend/**/*.py")

# 保存审查报告
Write(file_path="spec/03-功能实现/xxx/review.md", content="...")
```

### 审查结果标记

| 标记 | 含义 |
|------|------|
| ✅ | 已完成，符合 Spec |
| ❌ | 未完成 |
| ⚠️ | 已实现但与 Spec 不符 |
| ➕ | Spec 未定义的额外实现 |
| 🔴 | 高优先级问题 |
| 🟡 | 中优先级问题 |
| 🟢 | 低优先级问题 |

---

## 后续动作（工具记忆）

完成 Spec 审查后，你应该：

### 后续流程

**如果审查通过**：
1. 告知用户可以归档
2. 新功能：使用 `spec-executor` 的归档流程移动到 `06-已归档`
3. 功能更新：保留在原目录，不归档

**如果审查发现问题**：
1. 列出需要修复的问题清单
2. 等待开发者修复
3. 修复完成后重新运行 `spec-reviewer`

### 记忆更新提示
如果在审查过程中发现了常见的实现偏差模式，考虑使用 `/memory` Skill 将其记录到 CLAUDE.md 的战略记忆章节，帮助后续开发避免类似问题。

### 常见陷阱
- 只检查功能完成度，忽略一致性检查
- 未检查是否有额外实现
- 审查报告缺少具体的代码位置引用
- 未区分高/中/低优先级问题
