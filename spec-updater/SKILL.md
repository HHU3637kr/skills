---
name: spec-updater
description: Execute feature updates based on update-xxx.md documents. Use when modifying existing features that already have plan.md and summary.md. Creates update documents in the SAME directory as original plan.md, maintains complete history. Does NOT archive after completion.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, LSP
---

# Spec Updater

## 概述

这个 Skill 专门用于对已完成功能进行更新和迭代。当需要修改已有 `plan.md` 和 `summary.md` 的功能时，使用此 Skill 创建 `update-xxx.md` 并执行更新。

**与 spec-executor 的区别**：
- `spec-executor`：用于新功能开发，基于 `plan.md` 实现，完成后归档
- `spec-updater`：用于功能更新，基于 `update-xxx.md` 实现，**不归档**

## 适用场景

### 使用 spec-updater 的情况

- ✅ 已有功能需要修改或增强
- ✅ 已有功能存在 Bug 需要修复
- ✅ 已有功能需要性能优化
- ✅ 已有功能需要适配新需求
- ✅ 目录下已存在 `plan.md` 和 `summary.md`

### 不使用 spec-updater 的情况

- ❌ 全新功能开发（使用 spec-executor）
- ❌ 目录下没有 `summary.md`（说明原功能未完成）
- ❌ 与原功能无关的新需求（创建新 Spec）

## 核心原则

### 1. 同目录原则

**必须遵守**：
- ✅ 更新文档必须放在原 `plan.md` 的同一目录下
- ✅ 保持功能的完整历史记录
- ✅ 更新总结文档也放在同一目录

**禁止操作**：
- ❌ 不要为更新创建新的 Spec 目录
- ❌ 不要将更新文档放到其他位置
- ❌ 不要删除原有的 plan.md 和 summary.md

### 2. 不归档原则

**重要**：功能更新完成后**不归档**，保留在原目录以便后续更新。

只有当功能完全稳定、确定不再需要更新时，才由用户手动决定归档。

### 3. 编号递增原则

更新文档按顺序编号：
```
update-001.md    # 第一次更新
update-002.md    # 第二次更新
update-003.md    # 第三次更新
...
```

## 文档结构

### 更新前的目录结构

```
spec/03-功能实现/20251231-专业评价Agent设计/
├── plan.md          # 原始设计方案
└── summary.md       # 原始实现总结
```

### 更新后的目录结构

```
spec/03-功能实现/20251231-专业评价Agent设计/
├── plan.md              # 原始设计方案（保持不变）
├── summary.md           # 原始实现总结（保持不变）
├── update-001.md        # 第一次更新方案
├── update-001-summary.md # 第一次更新总结
├── review-001.md        # 第一次更新审查报告
├── update-002.md        # 第二次更新方案
├── update-002-summary.md # 第二次更新总结
└── review-002.md        # 第二次更新审查报告
```

## Frontmatter 规范

### 文档 Frontmatter 要求

所有更新相关文档必须包含 YAML frontmatter，用于文档管理和索引。

#### update-xxx.md Frontmatter

```yaml
---
title: 功能名称-更新XXX
type: update
update_number: 1
category: 03-功能实现
status: 进行中
update_type: 功能增强
created: YYYY-MM-DD
plan: "[[plan]]"
tags:
  - spec
  - update
---
```

#### update-xxx-summary.md Frontmatter

```yaml
---
title: 功能名称-更新XXX-实现总结
type: update-summary
update_number: 1
category: 03-功能实现
status: 已完成
created: YYYY-MM-DD
plan: "[[plan]]"
update: "[[update-XXX]]"
tags:
  - spec
  - update
  - summary
---
```

### Frontmatter 字段说明

| 字段 | update-xxx.md | update-xxx-summary.md | 说明 |
|------|---------------|----------------------|------|
| `title` | 必填 | 必填 | 文档标题，格式：`功能名称-更新XXX` / `功能名称-更新XXX-实现总结` |
| `type` | `update` | `update-summary` | 文档类型标识 |
| `update_number` | 必填 | 必填 | 更新编号，与文件名一致（如 001） |
| `category` | 必填 | 必填 | 分类目录，继承自原 plan.md |
| `status` | `进行中` → `已完成` | `已完成` | 更新状态 |
| `update_type` | 必填 | - | 更新类型：`功能增强`/`Bug修复`/`性能优化`/`重构` |
| `created` | 必填 | 必填 | 创建日期，`YYYY-MM-DD` 格式 |
| `plan` | 必填 | 必填 | 链接到原 plan.md，使用 `[[plan]]` |
| `update` | - | 必填 | 链接到对应的 update-xxx.md |
| `tags` | 必填 | 必填 | 标签列表，必须包含 `spec` 和 `update` |

### update_type 可选值

| 值 | 使用场景 |
|----|----------|
| `功能增强` | 添加新功能或扩展现有功能 |
| `Bug修复` | 修复已知问题 |
| `性能优化` | 优化性能，不改变功能 |
| `重构` | 代码结构重构，不改变功能 |
| `安全修复` | 修复安全漏洞 |

## 工作流程

### 流程概览

```
1. 确认原 Spec 目录位置
   ↓
2. 检查现有更新文档，确定编号
   ↓
3. 创建 update-xxx.md（由 spec-writer 完成）
   ↓
4. 等待用户确认更新方案
   ↓
5. 读取并理解 update-xxx.md 文档
   ↓
6. 创建任务清单
   ↓
7. 按方案实现更新
   ↓
8. 编写/更新测试
   ↓
9. 运行测试验证
   ↓
10. 创建 update-xxx-summary.md 总结文档
   ↓
11. 使用 spec-reviewer 审查更新
   ↓
12. 等待用户确认审查报告
   ↓
13. 完成（不归档）
```

### 检查清单

```
功能更新流程：
- [ ] 步骤 1：确认原 Spec 目录位置
- [ ] 步骤 2：检查现有更新文档，确定编号
- [ ] 步骤 3：创建 update-xxx.md（由 spec-writer 完成）
- [ ] 步骤 4：等待用户确认更新方案
- [ ] 步骤 5：读取并理解 update-xxx.md 文档
- [ ] 步骤 6：创建任务清单
- [ ] 步骤 7：按方案实现更新
- [ ] 步骤 8：编写/更新测试
- [ ] 步骤 9：运行测试验证
- [ ] 步骤 10：创建 update-xxx-summary.md 总结文档
- [ ] 步骤 11：使用 spec-reviewer 审查更新
- [ ] 步骤 12：等待用户确认审查报告
```

## 步骤详解

### 步骤 1：确认原 Spec 目录位置

**操作**：
1. 找到需要更新功能的原 Spec 目录
2. 确认目录下已有 `plan.md` 和 `summary.md`
3. 记录目录路径

**示例**：
```bash
# 查找原 Spec 目录
ls spec/03-功能实现/20251231-专业评价Agent设计/
# 应该看到: plan.md, summary.md
```

**验证条件**：
- `plan.md` 存在
- `summary.md` 存在（说明原功能已完成）

如果 `summary.md` 不存在，说明原功能未完成，应该先使用 `spec-executor` 完成原功能。

### 步骤 2：检查现有更新文档，确定编号

**操作**：
1. 检查目录下是否已有 `update-xxx.md` 文件
2. 确定新更新文档的编号

**示例**：
```bash
# 列出现有更新文档
ls spec/03-功能实现/20251231-专业评价Agent设计/update-*.md 2>/dev/null

# 如果没有更新文档，新编号为 001
# 如果已有 update-001.md，新编号为 002
# 如果已有 update-001.md 和 update-002.md，新编号为 003
```

**编号规则**：
- 三位数字，从 001 开始
- 递增编号，不跳号
- 格式：`update-XXX.md`

### 步骤 3：创建 update-xxx.md

**操作**：
1. 使用 `spec-writer` 创建更新文档
2. 更新文档必须放在原 `plan.md` 的同一目录下
3. 文档命名格式：`update-XXX.md`

**重要**：不要在新目录创建更新文档！

**update-xxx.md 模板**：

```markdown
---
title: 功能名称-更新XXX
type: update
update_number: 1
category: 03-功能实现
status: 进行中
update_type: 功能增强
created: YYYY-MM-DD
plan: "[[plan]]"
tags:
  - spec
  - update
---

# 功能更新方案

## 文档关联

- 原设计: [[plan|设计方案]]
- 原总结: [[summary|实现总结]]

---

## 1. 更新背景

### 1.1 问题描述

描述需要更新的原因，可能是：
- 发现的 Bug
- 新的需求
- 性能问题
- 用户反馈

### 1.2 影响范围

- 受影响的模块
- 受影响的功能
- 受影响的用户

---

## 2. 更新目标

### 2.1 主要目标

- 目标 1
- 目标 2

### 2.2 非目标（明确不做的事情）

- 非目标 1
- 非目标 2

---

## 3. 更新方案

### 3.1 方案概述

简述更新的整体方案。

### 3.2 详细设计

#### 3.2.1 修改点 1

**文件**：`src/xxx/xxx.py`

**修改内容**：
```python
# 修改前
def old_function():
    pass

# 修改后
def new_function():
    pass
```

**修改原因**：说明为什么要这样修改

#### 3.2.2 修改点 2

...

### 3.3 数据结构变更（如有）

```python
# 新增/修改的字段
class UpdatedModel(BaseModel):
    new_field: str = Field(description="新增字段")
```

### 3.4 接口变更（如有）

| 接口 | 变更类型 | 说明 |
|------|----------|------|
| `/api/xxx` | 新增参数 | 新增 `param` 参数 |

---

## 4. 实现步骤

### 4.1 步骤清单

- [ ] 步骤 1：描述
- [ ] 步骤 2：描述
- [ ] 步骤 3：描述

### 4.2 测试计划

- [ ] 单元测试：描述
- [ ] 集成测试：描述
- [ ] 回归测试：确保原有功能不受影响

---

## 5. 风险评估

### 5.1 潜在风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 风险 1 | 影响描述 | 缓解措施 |

### 5.2 回滚方案

如需回滚，执行以下步骤：
1. 步骤 1
2. 步骤 2

---

## 6. 验收标准

- [ ] 标准 1
- [ ] 标准 2
- [ ] 原有功能正常（回归测试通过）
```

### 步骤 4：等待用户确认更新方案

**操作**：
1. 告知用户 `update-xxx.md` 已创建
2. 请用户审阅更新方案
3. 等待用户确认后再执行

**示例对话**：
```
Claude: 更新方案 update-001.md 已创建在：
spec/03-功能实现/20251231-专业评价Agent设计/update-001.md

请审阅更新方案，确认后我将开始执行更新。
```

### 步骤 5：读取并理解 update-xxx.md 文档

**操作**：
1. 读取更新文档
2. 理解更新的目标、范围和影响
3. 识别需要修改的文件和功能

**示例**：
```bash
Read(file_path="spec/03-功能实现/20251231-专业评价Agent设计/update-001.md")
```

### 步骤 6：创建任务清单

**操作**：
1. 根据更新文档的"实现步骤"章节创建任务清单
2. 使用 `TodoWrite` 工具记录所有任务
3. 标记任务的优先级和依赖关系

**示例**：
```python
TodoWrite(todos=[
    {
        "content": "修改 IndicatorParser 类",
        "activeForm": "修改 IndicatorParser 类",
        "status": "pending"
    },
    {
        "content": "更新单元测试",
        "activeForm": "更新单元测试",
        "status": "pending"
    },
    {
        "content": "运行回归测试",
        "activeForm": "运行回归测试",
        "status": "pending"
    }
])
```

### 步骤 7：按方案实现更新

**操作**：
1. 按照任务清单的顺序逐个实现
2. 每完成一个任务，标记为 completed
3. 实现过程中严格遵循 update-xxx.md 的设计

**代码规范**：
- 在修改的代码中添加更新引用注释
- 保持与原代码风格一致
- 不要修改更新方案之外的代码

**示例**：
```python
class IndicatorParser:
    """评估指标解析器

    根据 Spec: spec/03-功能实现/20251231-专业评价Agent设计/plan.md

    更新记录:
    - update-001: 添加权重验证逻辑
    """

    def parse_framework(self, framework: dict) -> List[EvaluationIndicator]:
        """解析评估指标体系

        更新 update-001: 添加权重总和验证
        """
        # 实现逻辑
        pass
```

### 步骤 8：编写/更新测试

**操作**：
1. 为新增/修改的功能编写测试
2. 更新受影响的现有测试
3. 确保回归测试覆盖原有功能

**测试类型**：
- **新增测试**：针对新增功能
- **修改测试**：针对修改的功能
- **回归测试**：确保原有功能不受影响

**示例**：
```python
class TestIndicatorParserUpdate001:
    """测试 IndicatorParser 更新 001

    根据更新文档: update-001.md
    """

    def test_weight_validation(self):
        """测试权重验证（update-001 新增）"""
        parser = IndicatorParser()
        # 测试逻辑
        pass

    def test_original_functionality(self):
        """回归测试：原有功能正常"""
        # 测试原有功能
        pass
```

### 步骤 9：运行测试验证

**操作**：
1. 运行新增/修改的测试
2. 运行回归测试
3. 检查测试覆盖率
4. 修复失败的测试

**命令**：
```bash
# 运行所有测试
pytest tests/ -v

# 运行特定模块测试
pytest tests/test_agents/test_indicator_parser.py -v

# 检查测试覆盖率
pytest tests/ --cov=src --cov-report=html
```

### 步骤 10：创建 update-xxx-summary.md 总结文档

**操作**：
1. 在同一目录下创建 `update-xxx-summary.md`
2. 记录更新内容、测试结果、影响范围
3. **撰写时直接应用 Obsidian 格式优化**

**Obsidian 格式优化（撰写时应用）**：

1. **文档关联（必须）**：使用双链建立文档间的关系
   - **update-xxx.md**：必须链接到原 plan.md 和 summary.md
   - **update-xxx-summary.md**：必须链接到 update-xxx.md、plan.md 和 summary.md
   - 示例：`原设计: [[plan|设计方案]]`、`更新方案: [[update-001|更新001]]`

2. **使用 Callout 标注关键信息**：
   - `> [!success]` 标注成功完成的修改
   - `> [!warning]` 标注回滚方案和风险点
   - `> [!note]` 标注与更新方案的差异
   - `> [!info]` 添加补充说明

3. **添加标签**：便于后续检索
   - 示例：`#spec/更新` `#update-001`

**相关 Skill**：
- 详细 Obsidian Markdown 语法：使用 `obsidian-markdown` Skill
- 更新功能演变图：使用 `json-canvas` Skill 可视化功能迭代历史
- 更新 Spec 索引：使用 `obsidian-bases` Skill 更新索引状态

**示例**：
```bash
Write(file_path="spec/03-功能实现/20251231-专业评价Agent设计/update-001-summary.md", content="...")
```

**update-xxx-summary.md 模板**：

```markdown
---
title: 功能名称-更新XXX-实现总结
type: update-summary
update_number: 1
category: 03-功能实现
status: 已完成
created: YYYY-MM-DD
plan: "[[plan]]"
update: "[[update-XXX]]"
tags:
  - spec
  - update
  - summary
---

# 更新总结

## 文档信息

- **更新编号**: update-XXX
- **创建日期**: YYYY-MM-DD
- **对应更新文档**: update-XXX.md
- **原 plan.md**: spec/XX-分类/YYYYMMDD-功能名称/plan.md
- **实施人员**: Claude Code
- **实施时间**: X 小时

---

## 1. 更新内容

### 1.1 更新目标

简述本次更新要解决的问题或实现的功能。

### 1.2 完成的修改

- [x] 修改 1：描述
- [x] 修改 2：描述
- [x] 修改 3：描述

### 1.3 修改的文件

```
src/
├── services/
│   └── xxx_service.py  # 修改原因
└── agents/
    └── xxx_agent.py    # 修改原因

tests/
└── test_xxx.py         # 新增/修改测试
```

---

## 2. 测试结果

### 2.1 新增测试

- **新增测试用例**: X 个
- **通过率**: 100%

### 2.2 回归测试

- **回归测试用例**: X 个
- **通过率**: 100%

### 2.3 测试覆盖率

- **修改前覆盖率**: XX%
- **修改后覆盖率**: XX%

---

## 3. 影响范围

### 3.1 直接影响

- 功能 A：影响描述
- 功能 B：影响描述

### 3.2 间接影响

- 无 / 描述间接影响

### 3.3 兼容性

- **向后兼容**: 是/否
- **API 变更**: 无/描述变更
- **数据迁移**: 无需/描述迁移步骤

---

## 4. 与更新方案的差异

### 4.1 按计划完成

- [x] 计划项 1
- [x] 计划项 2

### 4.2 调整项（如有）

- 调整 1：原因和影响
- 调整 2：原因和影响

### 4.3 未完成项（如有）

- 未完成项 1：原因，后续计划

---

## 5. 回滚方案

如需回滚，执行以下步骤：

1. 步骤 1
2. 步骤 2
3. 步骤 3

**回滚验证**：
- 验证点 1
- 验证点 2

---

## 6. 后续事项

### 6.1 待观察

- 观察点 1
- 观察点 2

### 6.2 后续优化（可选）

- [ ] 优化项 1
- [ ] 优化项 2

---

## 7. 文档关联

- 更新方案: [[update-XXX|更新方案]]
- 原设计: [[plan|设计方案]]
- 原总结: [[summary|实现总结]]
- 审查报告: [[review-XXX|审查报告]] (待生成)

---

## 8. 参考资料

- 原 plan.md: spec/XX-分类/YYYYMMDD-功能名称/plan.md
- 更新文档: update-XXX.md
- 相关代码: src/xxx
- 测试文件: tests/xxx
```

### 步骤 11：使用 spec-reviewer 审查更新

**操作**：
1. 调用 spec-reviewer 审查更新实现
2. 生成 review-xxx.md 审查报告
3. 审查报告放在同一目录下

**示例**：
```
Claude: 更新实现完成，现在使用 spec-reviewer 进行审查...

审查完成，review-001.md 已创建在：
spec/03-功能实现/20251231-专业评价Agent设计/review-001.md
```

### 步骤 12：等待用户确认审查报告

**操作**：
1. 告知用户审查报告已生成
2. 提供审查结果摘要
3. 等待用户确认

**示例对话**：
```
Claude: 更新审查完成，review-001.md 已创建。

审查结果摘要：
- ✅ 已完成：5/5 项修改
- ❌ 未完成：0 项
- ⚠️ 不符项：0 项
- ✅ 回归测试：全部通过

请阅读 review-001.md 确认更新是否符合预期。

注意：功能更新完成后不会归档，保留在原目录以便后续更新。
```

## 重要约束

### ⚠️ 严格遵循更新方案

**示例场景**：

**场景 1：更新方案定义了修改范围**

更新方案定义：
```
修改 IndicatorParser 类的 parse_framework 方法，添加权重验证
```

✅ **正确实现**：
```python
def parse_framework(self, framework: dict) -> List[EvaluationIndicator]:
    """解析评估指标体系

    更新 update-001: 添加权重总和验证
    """
    indicators = self._extract_indicators(framework)

    # update-001: 添加权重验证
    total_weight = sum(ind.weight for ind in indicators)
    if abs(total_weight - 1.0) > 0.01:
        raise ValueError(f"权重总和必须为 1.0，当前为 {total_weight}")

    return indicators
```

❌ **错误实现**（修改了方案之外的内容）：
```python
def parse_framework(self, framework: dict) -> List[EvaluationIndicator]:
    # 添加了方案中没有的缓存功能
    if framework in self._cache:  # ❌ 方案中没有要求添加缓存
        return self._cache[framework]

    indicators = self._extract_indicators(framework)
    total_weight = sum(ind.weight for ind in indicators)
    if abs(total_weight - 1.0) > 0.01:
        raise ValueError(f"权重总和必须为 1.0，当前为 {total_weight}")

    self._cache[framework] = indicators  # ❌ 方案中没有要求添加缓存
    return indicators
```

### ⚠️ 不归档原则

**重要**：功能更新完成后**不归档**！

```
# ❌ 错误：更新完成后归档
mv "spec/03-功能实现/20251231-xxx" "spec/06-已归档/"

# ✅ 正确：保留在原目录
# 不执行任何移动操作
```

**归档时机**：
- 只有当功能完全稳定、确定不再需要更新时
- 由用户明确要求归档
- 使用 spec-executor 的归档流程

### ⚠️ 回归测试必须通过

更新完成后，必须确保：
- 新增功能测试通过
- 修改功能测试通过
- **原有功能回归测试通过**

如果回归测试失败，必须修复后才能完成更新。

## 错误处理

### 场景 1：原 Spec 不存在

```
❌ 错误：原 Spec 目录不存在
路径：spec/03-功能实现/20251231-xxx/

解决方案：
1. 确认目录路径是否正确
2. 如果是新功能，使用 spec-writer 创建新 Spec
3. 使用 spec-executor 实现新功能
```

### 场景 2：原功能未完成

```
❌ 错误：原功能未完成
目录：spec/03-功能实现/20251231-xxx/
状态：存在 plan.md，但缺少 summary.md

解决方案：
1. 先使用 spec-executor 完成原功能
2. 确认 summary.md 已创建
3. 再使用 spec-updater 进行更新
```

### 场景 3：回归测试失败

```
❌ 错误：回归测试失败
失败测试：test_original_functionality

解决方案：
1. 分析失败原因
2. 修复导致回归的代码
3. 重新运行测试
4. 确保所有测试通过后再继续
```

## 与其他 Skill 的协作

### 完整更新流程

```
1. 发现需要修改已有功能
   ↓
2. 找到原 Spec 目录（包含 plan.md 和 summary.md）
   ↓
3. 使用 spec-writer 在【同一目录】创建 update-xxx.md
   ↓
4. 用户确认更新 Spec
   ↓
5. 使用 spec-updater 执行更新
   ↓
6. 测试验证（包括回归测试）
   ↓
7. 在【同一目录】创建 update-xxx-summary.md
   ↓
8. 使用 spec-reviewer 审查更新
   ↓
9. 生成 review-xxx.md 审查报告
   ↓
10. 用户阅读并确认审查报告
   ↓
11. 完成（不归档，保留在原目录以便后续更新）
```

### 多次更新示例

```
spec/03-功能实现/20260104-专业评价Agent设计/
├── plan.md                  # 初始设计（2026-01-04）
├── summary.md               # 初始实现总结
├── review.md                # 初始审查报告
├── update-001.md            # 第一次更新：修复评分精度问题（2026-01-05）
├── update-001-summary.md    # 第一次更新总结
├── review-001.md            # 第一次更新审查报告
├── update-002.md            # 第二次更新：添加并发支持（2026-01-10）
├── update-002-summary.md    # 第二次更新总结
└── review-002.md            # 第二次更新审查报告
```

## 快速参考

### 确定更新编号

```bash
# 列出现有更新文档
ls spec/03-功能实现/20251231-xxx/update-*.md 2>/dev/null | wc -l

# 根据数量确定新编号
# 0 个 → update-001.md
# 1 个 → update-002.md
# 2 个 → update-003.md
```

### 创建任务清单

```python
TodoWrite(todos=[
    {"content": "任务1", "activeForm": "执行任务1", "status": "pending"},
    {"content": "任务2", "activeForm": "执行任务2", "status": "pending"}
])
```

### 运行测试

```bash
# 运行所有测试
pytest tests/ -v

# 运行回归测试
pytest tests/ -v -k "not update"

# 检查覆盖率
pytest tests/ --cov=src --cov-report=html
```

## 检查清单

### 开始更新前

- [ ] 原 Spec 目录存在
- [ ] plan.md 存在
- [ ] summary.md 存在（原功能已完成）
- [ ] 确定了更新编号
- [ ] update-xxx.md 已创建
- [ ] 用户已确认更新方案

### 完成更新后

- [ ] 所有修改都按更新方案实现
- [ ] 没有修改方案之外的代码
- [ ] 新增测试通过
- [ ] 回归测试通过
- [ ] update-xxx-summary.md 已创建
- [ ] review-xxx.md 审查报告已生成
- [ ] 用户已确认审查报告
- [ ] **没有执行归档操作**

---

## 后续动作（工具记忆）

完成功能更新后，你应该：

### 后续流程
1. 创建 update-xxx-summary.md 后，使用 `spec-reviewer` 审查更新
2. 等待用户确认审查报告
3. **不归档**，保留在原目录以便后续更新

### 记忆更新提示
如果在更新过程中发现了重要的「困境-策略」对（如 Bug 根因分析、性能优化方案），考虑使用 `/memory` Skill 将其记录到 CLAUDE.md 的战略记忆章节。

### 常见陷阱
- 忘记创建 update-xxx-summary.md
- 更新完成后错误地执行了归档操作
- 修改了更新方案之外的代码
- 回归测试未通过就完成更新
