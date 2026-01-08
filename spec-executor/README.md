# Spec Executor 使用说明

## 📋 概述

**Spec Executor** 是一个专门用于根据 Spec 文档执行开发任务的 Claude Code Skill。它确保所有开发工作严格遵循已批准的 `plan.md`，不添加任何额外功能，并在完成后创建 `summary.md` 总结文档，最后将整个 Spec 文件夹移动到 `06-已归档` 目录。

## 🎯 核心功能

1. **Spec 优先**：只实现 plan.md 中明确定义的功能
2. **开发顺序控制**：强制按照 Framework 服务层 → Agent 层 → API 层的顺序开发
3. **依赖检查**：自动验证前置阶段是否已完成
4. **可追溯性保证**：确保每个功能都能追溯到 plan.md 中的具体章节
5. **测试驱动**：自动创建测试任务并验证测试通过
6. **自动总结**：完成后自动创建 summary.md 记录实现过程
7. **自动归档**：执行完成后将 Spec 文件夹移动到 `06-已归档`

## 📁 分类目录结构

### 目录说明

| 目录 | 名称 | 用途 |
|------|------|------|
| `01-项目规划` | 项目规划 | 项目整体规划、PRD、流程设计 |
| `02-架构设计` | 架构设计 | 系统架构、数据模型、服务层设计 |
| `03-功能实现` | 功能实现 | 具体功能的实现方案 |
| `04-问题修复` | 问题修复 | Bug 修复、问题解决方案 |
| `05-测试文档` | 测试文档 | 测试计划、测试报告、测试总结 |
| `06-已归档` | 已归档 | **执行完成后的 Spec 会被移动到这里** |

### 归档流程示意

```
执行前：
spec/03-功能实现/20251231-专业评价Agent设计/
├── plan.md

执行后（创建 summary.md）：
spec/03-功能实现/20251231-专业评价Agent设计/
├── plan.md
└── summary.md

归档后（移动到 06-已归档）：
spec/06-已归档/20251231-专业评价Agent设计/
├── plan.md
└── summary.md
```

## 🚀 快速开始

### 1. 激活 Skill

当你需要根据 plan.md 实现功能时，Skill 会自动激活。你也可以明确提及：

```
请根据 spec/03-功能实现/20251231-xxx/plan.md 实现功能
```

### 2. 触发关键词

以下关键词会触发此 Skill：

- "根据 plan.md 实现"
- "按照 spec/xxx/plan.md 开发"
- "实现 plan.md 中的功能"
- "执行 Spec"
- "开发 xxx（当 plan.md 存在时）"

### 3. 基本使用

**示例 1：实现 Framework 服务层**

```
用户：根据 spec/02-架构设计/20251231-framework-service-design/plan.md 实现 Framework 服务

Claude：我将使用 spec-executor 执行这个任务。

[执行流程：]
1. ✓ 读取 plan.md 文档
2. ✓ 验证 plan.md 完整性
3. ✓ 确定开发阶段：Framework 服务层
4. ✓ 创建任务清单
5. → 开始实现...

[实现完成后：]
✓ 所有功能已按 plan.md 实现
✓ 单元测试通过（覆盖率 94%）
✓ 无额外功能添加
✓ 已创建 summary.md 总结文档
✓ 已将 Spec 文件夹移动到 06-已归档
```

**示例 2：实现 Agent 层**

```
用户：根据 spec/03-功能实现/20251231-专业评价Agent设计/plan.md 实现评价 Agent

Claude：我将使用 spec-executor 执行这个任务。

[检查依赖：]
✓ Framework 服务层已实现
✓ 所有依赖满足

[执行流程：]
1. ✓ 读取 plan.md 文档
2. ✓ 验证 plan.md 完整性
3. ✓ 确定开发阶段：Agent 层
4. ✓ 创建任务清单
5. → 开始实现...

[实现完成后：]
✓ 已创建 summary.md
✓ 已将 Spec 移动到：spec/06-已归档/20251231-专业评价Agent设计/
```

## 📝 工作流程

### 标准执行流程

```
1. 读取并理解 plan.md 文档
   ↓
2. 验证 plan.md 的完整性
   ↓
3. 确定当前开发阶段
   ↓
4. 检查依赖是否满足
   ↓
5. 创建任务清单
   ↓
6. 按顺序实现功能
   ↓
7. 编写单元测试
   ↓
8. 运行测试验证
   ↓
9. 创建 summary.md 总结文档
   ↓
10. 将 Spec 文件夹移动到 06-已归档
   ↓
11. 完成报告
```

### 检查清单

在开始实现前：

- [ ] Spec 文档存在且完整
- [ ] 理解了 Spec 的目标和范围
- [ ] 确定了当前开发阶段
- [ ] 检查了依赖的前置阶段
- [ ] 创建了任务清单
- [ ] 准备好了测试环境
- [ ] 记录了 Spec 所在的分类目录

在完成实现后：

- [ ] 所有功能都按 Spec 实现
- [ ] 没有添加额外功能
- [ ] 单元测试通过
- [ ] 测试覆盖率 > 80%
- [ ] 代码符合规范
- [ ] 文档已更新
- [ ] 可追溯性得到保证
- [ ] summary.md 已创建
- [ ] Spec 文件夹已移动到 `06-已归档`

## ⚠️ 重要约束

### 1. Spec 优先原则

**必须遵守**：
- ✅ 只实现 Spec 中明确定义的功能
- ✅ 严格按照 Spec 的设计方案执行
- ✅ 遵循 Spec 中的数据结构定义
- ✅ 使用 Spec 中指定的技术栈

**禁止操作**：
- ❌ 不要添加 Spec 中未定义的功能
- ❌ 不要偏离 Spec 的设计方案
- ❌ 不要修改 Spec 中的数据结构
- ❌ 不要"优化"或"改进"Spec 中未提及的部分

### 2. 开发顺序约束

必须按照以下顺序开发：

```
1. Framework 服务层 (Framework Service Layer)
   - 数据模型
   - 业务逻辑
   - 服务接口
   ↓
2. Agent 层 (Agent Layer)
   - AI Agent
   - 评估逻辑
   - 意见生成
   ↓
3. API 层 (API Layer)
   - REST API
   - 路由
   - 请求处理
```

**说明**：
- 每个阶段完成后进行单元测试和集成测试
- 测试通过后进行文档完善和代码优化
- 不允许跳过任何阶段

### 3. 归档约束

**必须遵守**：
- ✅ 只有在 summary.md 创建成功后才能归档
- ✅ 归档时将整个 Spec 文件夹移动到 `06-已归档`
- ✅ 归档后验证移动成功

**禁止操作**：
- ❌ 不要在实现未完成时归档
- ❌ 不要在 summary.md 未创建时归档
- ❌ 不要手动删除原目录中的 Spec（应该是移动）

### 4. 可追溯性约束

在实现过程中，必须确保：

```python
# ✅ 正确：包含可追溯性信息
class IndicatorEvaluation(BaseModel):
    """单个指标的评估结果

    根据 Spec: spec/03-功能实现/20251231-专业评价Agent设计/plan.md
    章节: 3.2 数据模型 - IndicatorEvaluation
    """

    # 系统预设字段
    indicator_id: str = Field(description="指标ID，系统生成")

    # Agent 填写字段
    score: float = Field(description="分数，Agent填写")
    evaluation_basis: str = Field(description="评价依据，Agent填写")

    # 可追溯性字段
    material_references: List[dict] = Field(
        description="材料引用，包含来源、页码、内容"
    )
```

```python
# ❌ 错误：缺少可追溯性
class IndicatorEvaluation(BaseModel):
    indicator_id: str
    score: float
    # ❌ 缺少 evaluation_basis
    # ❌ 缺少 material_references
```

## 📚 使用场景

### 场景 1：实现 Framework 服务层

**适用情况**：
- Spec 类型：数据模型设计、服务层设计
- Spec 位置：`spec/02-架构设计/`
- 目录位置：`src/services/`
- 前置条件：无

**使用方法**：

```
用户：根据 spec/02-架构设计/20251231-framework-service-design/plan.md 实现 Framework 服务

Claude：
[执行流程]
1. 读取 Spec
2. 实现数据模型（Pydantic）
3. 实现服务类
4. 编写单元测试
5. 运行测试验证
6. 创建 summary.md
7. 移动到 06-已归档
8. 完成报告
```

### 场景 2：实现 Agent 层

**适用情况**：
- Spec 类型：Agent 设计、功能设计
- Spec 位置：`spec/03-功能实现/`
- 目录位置：`src/agents/`
- 前置条件：Framework 服务层已实现

**使用方法**：

```
用户：根据 spec/03-功能实现/20251231-专业评价Agent设计/plan.md 实现评价 Agent

Claude：
[检查依赖]
✓ Framework 服务层已实现

[执行流程]
1. 读取 Spec
2. 实现 Agent 组件
3. 实现主 Agent
4. 编写单元测试
5. 运行测试验证
6. 创建 summary.md
7. 移动到 06-已归档
8. 完成报告
```

### 场景 3：实现 Bug 修复

**适用情况**：
- Spec 类型：修复方案
- Spec 位置：`spec/04-问题修复/`
- 前置条件：根据修复内容确定

**使用方法**：

```
用户：根据 spec/04-问题修复/20251231-websocket-fix/plan.md 修复 WebSocket 问题

Claude：
[执行流程]
1. 读取 Spec
2. 定位问题代码
3. 实现修复
4. 编写测试验证修复
5. 运行测试
6. 创建 summary.md
7. 移动到 06-已归档
8. 完成报告
```

## 🔧 错误处理

### 错误 1：Spec 不存在

**症状**：
```
❌ 错误：Spec 文档不存在
文件路径：spec/03-功能实现/20251231-xxx/plan.md
```

**解决方案**：
1. 使用 `spec-writer` 创建 Spec 文档
2. 等待用户确认 Spec
3. 再使用 `spec-executor` 执行实现

### 错误 2：Spec 不完整

**症状**：
```
❌ 错误：Spec 不完整
缺少以下必要章节：
- 3. 设计方案
- 4. 实现步骤
```

**解决方案**：
1. 完善 Spec 文档，添加缺失章节
2. 确保 Spec 包含所有必要信息
3. 重新执行实现

### 错误 3：依赖未满足

**症状**：
```
❌ 错误：依赖未满足
当前阶段：Agent 层
依赖阶段：Framework 服务层

Framework 服务层尚未实现
```

**解决方案**：
1. 先创建 Framework 服务层的 Spec
2. 实现 Framework 服务层
3. 测试通过后再实现 Agent 层

### 错误 4：归档冲突

**症状**：
```
❌ 错误：归档目录已存在同名文件夹
目标路径：spec/06-已归档/20251231-xxx/
```

**解决方案**：
1. 检查是否是重复执行
2. 如果需要重新执行，先备份或删除旧的归档
3. 重新执行归档

## 📊 与其他 Skill 的协作

### spec-writer → spec-executor

完整的开发流程：

```
1. 用户提出需求
   ↓
2. 使用 spec-writer 创建 Spec（放入 01-05 分类目录）
   ↓
3. 用户确认 Spec
   ↓
4. 使用 spec-executor 执行实现
   ↓
5. 测试验证
   ↓
6. 创建 summary.md
   ↓
7. 移动 Spec 文件夹到 06-已归档
   ↓
8. 完成
```

### 归档说明

- **spec-writer** 负责在 `01-05` 分类目录中创建 Spec
- **spec-executor** 负责执行后将 Spec 移动到 `06-已归档`
- 归档是 spec-executor 的最后一步，必须在 summary.md 创建后执行

## 🎓 最佳实践

### 1. 代码注释

每个类和方法都应该包含 Spec 引用：

```python
class FrameworkService:
    """Framework 服务

    根据 Spec: spec/02-架构设计/20251231-framework-service-design/plan.md
    章节: 3.3 接口设计
    """

    def create_framework(self, framework: Framework) -> Framework:
        """创建 Framework

        根据 Spec: 章节 3.3.1 - create_framework

        Args:
            framework: Framework 对象

        Returns:
            Framework: 创建后的 Framework

        Raises:
            ValueError: Framework 数据无效
        """
        pass
```

### 2. 数据模型标注

明确标注哪些字段是系统预设，哪些是 Agent 填写：

```python
class EvaluationResult(BaseModel):
    """评估结果"""

    # 系统预设字段
    id: str = Field(description="唯一标识符，系统生成")
    created_at: datetime = Field(description="创建时间，系统生成")

    # Agent 填写字段
    score: float = Field(description="分数，Agent填写")
    evaluation_basis: str = Field(description="评价依据，Agent填写")
```

### 3. 归档前检查

在归档前确保：

```bash
# 检查 summary.md 是否存在
ls "spec/03-功能实现/20251231-xxx/"
# 应该看到 plan.md 和 summary.md

# 执行归档
mv "spec/03-功能实现/20251231-xxx" "spec/06-已归档/"

# 验证归档成功
ls "spec/06-已归档/20251231-xxx/"
```

## 📖 参考文档

### SKILL.md
主 Skill 文件，包含：
- 核心原则
- 分类目录结构
- 工作流程
- 重要约束
- 归档流程

### WORKFLOWS.md
详细工作流程，包含：
- Framework 服务层实现流程
- Agent 层实现流程
- API 层实现流程
- 归档流程

### EXAMPLES.md
实现示例，包含：
- Framework 服务层实现示例
- Agent 层实现示例
- 归档示例

### README.md（本文件）
使用说明，包含：
- 快速开始
- 分类目录说明
- 使用场景
- 错误处理
- 最佳实践

## 🔍 常见问题

### Q1: 如何判断当前应该实现哪个阶段？

**A**: 根据 Spec 的文档类型和所在目录判断：

- **02-架构设计** 中的数据模型、服务层设计 → Framework 服务层
- **03-功能实现** 中的 Agent 设计、功能设计 → Agent 层
- **03-功能实现** 中的 API 规范 → API 层
- **04-问题修复** 中的修复方案 → 根据修复内容确定

### Q2: 归档后还能修改吗？

**A**:
- 归档后的 Spec 不应该再修改
- 如果需要修改，应该创建新的 Spec
- 新 Spec 应该引用原 Spec 作为背景

### Q3: 如果执行中断了怎么办？

**A**:
1. 检查当前进度（哪些任务已完成）
2. 如果 summary.md 未创建，继续执行剩余任务
3. 如果 summary.md 已创建但未归档，执行归档
4. 如果已归档，检查归档是否完整

### Q4: 测试覆盖率要求是多少？

**A**:
- 最低要求：80%
- 推荐目标：90%+
- 核心功能：100%

## 🎉 总结

**Spec Executor Skill** 帮助你：

1. ✅ 严格按照 Spec 执行开发
2. ✅ 确保开发顺序正确
3. ✅ 自动检查依赖满足
4. ✅ 保证代码可追溯性
5. ✅ 强制测试驱动开发
6. ✅ 自动创建 summary.md
7. ✅ 自动归档到 `06-已归档`

**记住**：
- Spec 优先，不添加额外功能
- 遵循开发顺序
- 验证依赖满足
- 确保测试通过
- 保证可追溯性
- 创建 summary.md 后归档

---

**版本**：2.0
**创建日期**：2025-12-31
**更新日期**：2026-01-04
**维护者**：AI+专业评估系统项目组

## 📞 获取帮助

### 查看 Skill 文档

```bash
# 查看主 Skill 文件
cat .claude/skills/spec-executor/SKILL.md

# 查看工作流程
cat .claude/skills/spec-executor/WORKFLOWS.md

# 查看示例
cat .claude/skills/spec-executor/EXAMPLES.md
```

### 查看分类目录

```bash
# 列出所有分类目录
ls spec/

# 查看待执行的 Spec
ls "spec/02-架构设计/"
ls "spec/03-功能实现/"
ls "spec/04-问题修复/"

# 查看已归档的 Spec
ls "spec/06-已归档/"
```

### 运行测试

```bash
# 运行所有测试
pytest tests/ -v

# 运行特定层的测试
pytest tests/test_services/ -v
pytest tests/test_agents/ -v
pytest tests/test_api/ -v

# 检查测试覆盖率
pytest tests/ --cov=src --cov-report=html
```
