---
name: spec-executor
description: Execute NEW feature development based on plan.md documents. Use ONLY for initial implementation of features that don't have summary.md yet. Creates summary.md after completion, then moves Spec folder to 06-已归档. For feature UPDATES (when summary.md exists), use spec-updater instead. Follow development order - Framework Service Layer → Agent Layer → API Layer.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, LSP
---

# Spec Executor

## 概述

这个 Skill 专门用于根据 `spec/` 目录中的 `plan.md` 文档执行**新功能开发**任务。它确保所有开发工作严格遵循已批准的 `plan.md`，不添加任何额外功能，并在完成后创建 `summary.md` 总结文档，最后将整个 Spec 文件夹移动到 `06-已归档` 目录。

**重要**：此 Skill 仅用于新功能开发。如果需要对已完成的功能进行更新（目录下已有 `summary.md`），请使用 `spec-updater` Skill。

## 适用场景

### 使用 spec-executor 的情况

- ✅ 新功能开发
- ✅ 目录下只有 `plan.md`，没有 `summary.md`
- ✅ 首次实现某个功能

### 不使用 spec-executor 的情况

- ❌ 功能更新/迭代（使用 `spec-updater`）
- ❌ 目录下已有 `summary.md`（使用 `spec-updater`）
- ❌ Bug 修复已完成功能（使用 `spec-updater`）

## 分类目录结构

### 目录说明

| 目录 | 名称 | 用途 |
|------|------|------|
| `01-项目规划` | 项目规划 | 项目整体规划、PRD、流程设计 |
| `02-架构设计` | 架构设计 | 系统架构、数据模型、服务层设计 |
| `03-功能实现` | 功能实现 | 具体功能的实现方案 |
| `04-问题修复` | 问题修复 | Bug 修复、问题解决方案 |
| `05-测试文档` | 测试文档 | 测试计划、测试报告、测试总结 |
| `06-已归档` | 已归档 | **执行完成后的 Spec 会被移动到这里** |

### 归档流程

```
初始创建：
spec/03-功能实现/20251231-专业评价Agent设计/
├── plan.md

首次执行后（由 spec-executor 完成）：
spec/03-功能实现/20251231-专业评价Agent设计/
├── plan.md
└── summary.md

归档后（移动到 06-已归档）：
spec/06-已归档/20251231-专业评价Agent设计/
├── plan.md
└── summary.md
```

**注意**：功能更新（update-xxx.md）由 `spec-updater` Skill 处理，不在本 Skill 范围内。

## 核心原则

### 1. Spec 优先

**必须遵守**：
- ✅ 只实现 plan.md 中明确定义的功能
- ✅ 严格按照 plan.md 的设计方案执行
- ✅ 遵循 plan.md 中的数据结构定义
- ✅ 使用 plan.md 中指定的技术栈

**禁止操作**：
- ❌ 不要添加 plan.md 中未定义的功能
- ❌ 不要偏离 plan.md 的设计方案
- ❌ 不要修改 plan.md 中的数据结构（除非创建新 Spec）
- ❌ 不要"优化"或"改进"plan.md 中未提及的部分

### 2. 开发顺序

根据 `CLAUDE.md` 的要求，必须按照以下顺序开发：

```
1. Framework 服务层 (Framework Service Layer)
   ↓
2. Agent 层 (Agent Layer)
   ↓
3. API 层 (API Layer)
```

**说明**：
- 每个阶段完成后进行单元测试和集成测试
- 测试通过后进行文档完善和代码优化
- 不允许跳过任何阶段

### 3. 可追溯性

在实现过程中，必须确保：
- 每个功能都能追溯到 Spec 中的具体章节
- 数据结构明确标注哪些是系统预设，哪些是 Agent 填写
- 评分过程可追溯到具体的评估标准和材料

## 工作流程

### 流程类型判断

首先判断当前任务类型：

| 任务类型 | 判断依据 | 使用 Skill |
|----------|----------|------------|
| 新功能开发 | 目录下只有 `plan.md`，没有 `summary.md` | `spec-executor` |
| 功能更新 | 目录下已有 `summary.md` | `spec-updater` |

**重要**：如果目录下已有 `summary.md`，说明功能已完成，应使用 `spec-updater` 进行更新，而不是 `spec-executor`。

### 新功能开发流程

使用此检查清单跟踪进度：

```
新功能开发流程：
- [ ] 步骤 1：读取并理解 plan.md 文档
- [ ] 步骤 2：验证 plan.md 的完整性
- [ ] 步骤 3：确定当前开发阶段
- [ ] 步骤 4：创建任务清单
- [ ] 步骤 5：按顺序实现功能
- [ ] 步骤 6：编写单元测试
- [ ] 步骤 7：运行测试验证
- [ ] 步骤 8：创建 summary.md 总结文档
- [ ] 步骤 9：使用 spec-reviewer 审查实现
- [ ] 步骤 10：等待用户确认审查报告
- [ ] 步骤 11：用户确认后，将 Spec 文件夹移动到 06-已归档
```

### 步骤详解

#### 步骤 1：读取并理解 plan.md 文档

**操作**：
1. 使用 `Read` 工具读取指定的 plan.md 文档
2. 理解 plan.md 的目标、范围和设计方案
3. 识别所有需要实现的功能点
4. 理解数据模型和接口定义
5. 记录 Spec 所在的分类目录（用于后续归档）

**示例**：
```bash
# 读取 plan.md 文档（注意分类目录路径）
Read(file_path="spec/03-功能实现/20251231-专业评价Agent设计/plan.md")
```

#### 步骤 2：验证 plan.md 的完整性

**检查项**：
- [ ] plan.md 包含明确的目标和范围
- [ ] 设计方案清晰完整
- [ ] 数据模型定义明确
- [ ] 接口签名完整
- [ ] 实现步骤具体可执行
- [ ] 测试计划完整

**如果 plan.md 不完整**：
- 停止执行
- 告知用户 plan.md 缺少哪些内容
- 建议用户完善 plan.md 后再执行

#### 步骤 3：确定当前开发阶段

**判断标准**：

| 阶段 | 特征 | 目录位置 |
|------|------|---------|
| Framework 服务层 | 数据模型、业务逻辑、服务接口 | `src/services/` |
| Agent 层 | AI Agent、评估逻辑、意见生成 | `src/agents/` |
| API 层 | REST API、路由、请求处理 | `src/api/` |

**操作**：
1. 根据 Spec 的文档类型判断阶段
2. 检查依赖的前置阶段是否已完成
3. 如果前置阶段未完成，提醒用户

#### 步骤 4：创建任务清单

**操作**：
1. 根据 Spec 的"实现步骤"章节创建任务清单
2. 使用 `TodoWrite` 工具记录所有任务
3. 标记任务的优先级和依赖关系

**示例**：
```python
TodoWrite(todos=[
    {
        "content": "实现 IndicatorParser 类",
        "activeForm": "实现 IndicatorParser 类",
        "status": "pending"
    },
    {
        "content": "实现 MaterialAnalyzer 类",
        "activeForm": "实现 MaterialAnalyzer 类",
        "status": "pending"
    }
])
```

#### 步骤 5：按顺序实现功能

**操作**：
1. 按照任务清单的顺序逐个实现
2. 每完成一个任务，标记为 completed
3. 实现过程中严格遵循 plan.md 的设计

**代码规范**：
- 使用 plan.md 中定义的类名、方法名
- 遵循 plan.md 中的数据结构
- 添加必要的类型注解
- 添加文档字符串（docstring）
- 在注释中引用 plan.md 的路径

**示例**：
```python
from pydantic import BaseModel, Field
from typing import List

class IndicatorParser:
    """评估指标解析器

    根据 plan.md: spec/20251231-专业评价Agent设计/plan.md
    章节: 3.2 数据模型 - IndicatorParser
    """

    def parse_framework(self, framework: dict) -> List[EvaluationIndicator]:
        """解析评估指标体系

        Args:
            framework: 评估指标体系 JSON

        Returns:
            List[EvaluationIndicator]: 结构化的评估指标列表

        Raises:
            InvalidFrameworkError: 评估指标体系无效
        """
        # 实现逻辑
        pass
```

#### 步骤 6：编写单元测试

**操作**：
1. 为每个类和方法编写单元测试
2. 使用 plan.md 中的测试用例
3. 确保测试覆盖率 > 80%

**测试文件位置**：
```
tests/
├── test_services/      # Framework 服务层测试
├── test_agents/        # Agent 层测试
└── test_api/           # API 层测试
```

**示例**：
```python
import pytest
from src.agents.indicator_parser import IndicatorParser

class TestIndicatorParser:
    """测试 IndicatorParser

    根据 plan.md: spec/20251231-专业评价Agent设计/plan.md
    章节: 5.1 单元测试
    """

    def test_parse_valid_framework(self):
        """测试用例 TC-001: 解析有效的 Framework"""
        parser = IndicatorParser()
        framework = {
            "indicators": [
                {"id": "ind_001", "name": "师资队伍", "weight": 0.2}
            ]
        }
        result = parser.parse_framework(framework)
        assert len(result) == 1
        assert result[0].id == "ind_001"
```

#### 步骤 7：运行测试验证

**操作**：
1. 运行单元测试
2. 运行集成测试（如果适用）
3. 检查测试覆盖率
4. 修复失败的测试

**命令**：
```bash
# 运行单元测试
pytest tests/ -v

# 检查测试覆盖率
pytest tests/ --cov=src --cov-report=html

# 运行特定测试
pytest tests/test_agents/test_indicator_parser.py -v
```

#### 步骤 8：创建 summary.md 总结文档

**操作**：
1. 在与 plan.md 相同的目录下创建 summary.md
2. 记录实现总结、测试结果、遇到的问题和解决方案
3. 使用 `Write` 工具保存文件

**summary.md 必须包含**：
- 实现总结（完成了哪些功能）
- 测试结果（测试覆盖率、通过率）
- 遇到的问题（实现过程中的困难）
- 解决方案（如何解决问题）
- 与 plan.md 的差异（如果有）
- 后续建议（优化方向、待完成事项）

**示例**：
```bash
# 保存 summary.md（注意分类目录路径）
Write(file_path="spec/03-功能实现/20251231-专业评价Agent设计/summary.md", content="...")
```

#### 步骤 9：等待用户确认

**操作**：
1. 告知用户 summary.md 已创建
2. 使用 spec-reviewer 审查实现
3. 生成 review.md 审查报告
4. 提示用户阅读 review.md 确认实现是否符合预期
5. 等待用户确认没有问题后，再进行归档

**示例对话**：
```
Claude: 实现已完成，summary.md 已创建。

现在使用 spec-reviewer 进行审查...

审查完成，review.md 已创建在 spec/03-功能实现/20260104-1713-专业评价Agent设计/review.md

审查结果摘要：
- ✅ 已完成：8/8 项功能
- ❌ 未完成：0 项
- ⚠️ 不符项：0 项

请阅读 review.md 确认实现是否符合预期。
确认没有问题后，我将把 Spec 文件夹归档到 06-已归档 目录。
```

**注意**：
- 必须先运行 spec-reviewer 生成审查报告
- 必须等待用户明确确认后才能归档
- 如果审查发现问题，需要先修复再重新审查

#### 步骤 10：用户确认后，将 Spec 文件夹移动到 06-已归档

**前提条件**：用户已确认 review.md 审查报告无误

**操作**：
1. 确认用户已审核并同意归档
2. 将整个 Spec 文件夹从当前分类目录移动到 `06-已归档`
3. 验证移动成功

**命令**：
```bash
# 移动 Spec 文件夹到归档目录
mv "spec/03-功能实现/20251231-专业评价Agent设计" "spec/06-已归档/"

# 验证移动成功
ls "spec/06-已归档/20251231-专业评价Agent设计/"
```

**注意事项**：
- **必须等待用户确认后才能归档**
- 归档后原目录中不应再有该 Spec 文件夹
- 如果 `06-已归档` 中已存在同名文件夹，需要先处理冲突

**归档示例**：
```
# 归档前
spec/
├── 03-功能实现/
│   └── 20251231-专业评价Agent设计/
│       ├── plan.md
│       └── summary.md
└── 06-已归档/
    └── ...

# 归档后
spec/
├── 03-功能实现/
│   └── （文件夹已移走）
└── 06-已归档/
    └── 20251231-专业评价Agent设计/
        ├── plan.md
        └── summary.md
```

**summary.md 模板**：
```markdown
# 实现总结

## 文档信息

- **创建日期**: YYYY-MM-DD
- **对应 plan.md**: spec/20251231-任务描述/plan.md
- **实施人员**: Claude Code
- **实施时间**: X 小时

---

## 1. 实现总结

### 1.1 完成的功能

- [x] 功能 1：描述
- [x] 功能 2：描述
- [x] 功能 3：描述

### 1.2 实现的文件

```
src/
├── services/
│   └── framework_service.py
├── agents/
│   └── evaluation_agent.py
└── api/
    └── routers/evaluations.py

tests/
├── test_services/
│   └── test_framework_service.py
└── test_agents/
    └── test_evaluation_agent.py
```

---

## 2. 测试结果

### 2.1 单元测试

- **测试用例数**: 15
- **通过率**: 100%
- **测试覆盖率**: 87%

### 2.2 集成测试

- **测试场景数**: 5
- **通过率**: 100%

---

## 3. 遇到的问题

### 问题 1：描述

**解决方案**：描述如何解决

### 问题 2：描述

**解决方案**：描述如何解决

---

## 4. 与 plan.md 的差异

### 4.1 设计调整

- 调整 1：原因和影响
- 调整 2：原因和影响

### 4.2 未实现的功能

- 功能 X：原因

---

## 5. 后续建议

### 5.1 优化方向

1. 建议 1
2. 建议 2

### 5.2 待完成事项

- [ ] 事项 1
- [ ] 事项 2

---

## 6. 参考资料

- plan.md: spec/20251231-任务描述/plan.md
- 相关代码: src/xxx
- 测试文件: tests/xxx
```

## 重要约束

### ⚠️ 严格遵循 Spec

**示例场景**：

**场景 1：Spec 中定义了数据模型**

Spec 定义：
```python
class EvaluationResult(BaseModel):
    id: str
    score: float
    evaluation_basis: str
```

✅ **正确实现**：
```python
class EvaluationResult(BaseModel):
    id: str = Field(description="评估结果ID")
    score: float = Field(description="分数", ge=0, le=100)
    evaluation_basis: str = Field(description="评价依据")
```

❌ **错误实现**（添加了 Spec 中没有的字段）：
```python
class EvaluationResult(BaseModel):
    id: str
    score: float
    evaluation_basis: str
    created_by: str  # ❌ Spec 中没有定义
    tags: List[str]  # ❌ Spec 中没有定义
```

**场景 2：Spec 中定义了接口**

Spec 定义：
```python
def evaluate_major(framework: Framework, materials: List[Material]) -> EvaluationReport:
    """评估专业"""
    pass
```

✅ **正确实现**：
```python
def evaluate_major(
    framework: Framework,
    materials: List[Material]
) -> EvaluationReport:
    """评估专业

    根据 Spec: spec/20251231-专业评价Agent设计.md
    """
    # 严格按照 Spec 实现
    pass
```

❌ **错误实现**（修改了接口签名）：
```python
def evaluate_major(
    framework: Framework,
    materials: List[Material],
    options: dict = {}  # ❌ Spec 中没有这个参数
) -> EvaluationReport:
    pass
```

### ⚠️ 开发顺序约束

**示例**：

如果 Spec 是关于 Agent 层的，但 Framework 服务层还未实现：

```python
# ❌ 错误：直接实现 Agent 层
class EvaluationAgent:
    def __init__(self):
        # 依赖 Framework Service，但还未实现
        self.framework_service = FrameworkService()  # 报错！
```

**正确做法**：
1. 停止执行
2. 告知用户："Agent 层依赖 Framework 服务层，请先实现 Framework 服务层"
3. 建议用户先创建 Framework 服务层的 Spec

### ⚠️ 可追溯性约束

在实现评价 Agent 时，必须确保可追溯性：

✅ **正确实现**：
```python
class IndicatorEvaluation(BaseModel):
    """单个指标的评估结果"""

    indicator_id: str = Field(description="指标ID")
    score: float = Field(description="分数")
    evaluation_basis: str = Field(description="评价依据")

    # 可追溯性字段
    material_references: List[dict] = Field(
        description="材料引用，包含来源、页码、内容"
    )
```

❌ **错误实现**（缺少可追溯性）：
```python
class IndicatorEvaluation(BaseModel):
    indicator_id: str
    score: float
    # ❌ 缺少 evaluation_basis
    # ❌ 缺少 material_references
```

## 错误处理

### 场景 1：Spec 不存在

```python
# 用户请求：根据 spec/20251231-xxx.md 实现功能

# 检查 Spec 是否存在
if not os.path.exists("spec/20251231-xxx.md"):
    print("❌ 错误：Spec 文档不存在")
    print("请先使用 spec-writer 创建 Spec 文档")
    return
```

### 场景 2：Spec 不完整

```python
# 读取 Spec 后检查
spec_content = read_spec("spec/20251231-xxx.md")

if "## 3. 设计方案" not in spec_content:
    print("❌ 错误：Spec 缺少设计方案章节")
    print("请完善 Spec 后再执行")
    return
```

### 场景 3：依赖未满足

```python
# 检查依赖
if spec_type == "Agent Layer":
    if not framework_service_exists():
        print("❌ 错误：Agent 层依赖 Framework 服务层")
        print("请先实现 Framework 服务层")
        return
```

### 场景 4：测试失败

```python
# 运行测试
result = run_tests()

if result.failed > 0:
    print(f"❌ 错误：{result.failed} 个测试失败")
    print("请修复测试后再继续")
    return
```

## 快速参考

### 读取 Spec

```python
Read(file_path="spec/20251231-xxx.md")
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
pytest tests/ -v
```

### 检查代码

```bash
# 类型检查
mypy src/

# 代码风格
flake8 src/

# 格式化
black src/
```

## 高级功能

**详细工作流程**：参见 [WORKFLOWS.md](WORKFLOWS.md)
**实现示例**：参见 [EXAMPLES.md](EXAMPLES.md)
**最佳实践**：参见 [BEST-PRACTICES.md](BEST-PRACTICES.md)

## 检查清单

在开始实现前，确认：

- [ ] Spec 文档存在且完整
- [ ] 理解了 Spec 的目标和范围
- [ ] 确定了当前开发阶段
- [ ] 检查了依赖的前置阶段
- [ ] 创建了任务清单
- [ ] 准备好了测试环境
- [ ] 记录了 Spec 所在的分类目录

在完成实现后，确认：

- [ ] 所有功能都按 Spec 实现
- [ ] 没有添加额外功能
- [ ] 单元测试通过
- [ ] 测试覆盖率 > 80%
- [ ] 代码符合规范
- [ ] 文档已更新
- [ ] 可追溯性得到保证
- [ ] summary.md 已创建
- [ ] **review.md 审查报告已生成**
- [ ] **已等待用户确认审查报告无误**
- [ ] 用户确认后，Spec 文件夹已移动到 `06-已归档`

## 与其他 Skill 的协作

### 新功能开发流程：spec-writer → spec-executor → spec-reviewer

```
1. 用户提出需求
   ↓
2. 使用 spec-writer 创建 plan.md（放入 01-05 分类目录）
   ↓
3. 用户确认 Spec
   ↓
4. 使用 spec-executor 执行实现
   ↓
5. 测试验证
   ↓
6. 创建 summary.md
   ↓
7. 使用 spec-reviewer 审查实现
   ↓
8. 生成 review.md 审查报告
   ↓
9. 用户阅读并确认审查报告
   ↓
10. 用户确认后，移动 Spec 文件夹到 06-已归档
   ↓
11. 完成
```

### 功能更新流程：使用 spec-updater

当需要对已完成的功能进行修改/迭代时，**请使用 `spec-updater` Skill**：

```
1. 发现需要修改已有功能（目录下已有 summary.md）
   ↓
2. 使用 spec-updater 执行更新流程
   ↓
3. 完成（不归档，保留在原目录以便后续更新）
```

**关键点**：
- ✅ 如果目录下已有 `summary.md`，使用 `spec-updater`
- ✅ 如果目录下只有 `plan.md`，使用 `spec-executor`
- ❌ 不要用 `spec-executor` 处理功能更新

## 项目特定要求

### 数据结构实现

在实现数据结构时，必须明确标注：

```python
class EvaluationResult(BaseModel):
    """评估结果

    根据 Spec: spec/20251231-evaluation-result-model.md
    """

    # 系统预设字段
    id: str = Field(description="唯一标识符，系统生成")
    created_at: datetime = Field(description="创建时间，系统生成")

    # Agent 填写字段
    score: float = Field(description="分数，Agent填写")
    evaluation_basis: str = Field(description="评价依据，Agent填写")
```

### Agent 实现

实现 Agent 时，必须考虑：

```python
class EvaluationAgent:
    """专业评价 Agent

    根据 Spec: spec/20251231-专业评价Agent设计.md

    核心要求：
    1. 评分过程可追溯
    2. 避免黑盒式评价
    3. 支持并发评估
    """

    async def evaluate(
        self,
        framework: Framework,
        materials: List[Material]
    ) -> EvaluationResult:
        """评估专业

        Returns:
            EvaluationResult: 包含可追溯的评价依据
        """
        pass
```

### 并发支持

实现并发评估时：

```python
import asyncio

async def evaluate_multiple_majors(
    majors: List[Major]
) -> List[EvaluationResult]:
    """并发评估多个专业

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 2.2 非功能需求 - 性能要求
    """
    tasks = [evaluate_major(major) for major in majors]
    results = await asyncio.gather(*tasks)
    return results
```

---

## 后续动作（工具记忆）

完成 Spec 执行后，你应该：

### summary.md 文档优化

由于 Spec 文档使用 Obsidian 维护，创建 summary.md 时可以利用 Obsidian 特性：

1. **添加内部链接**：链接到对应的 plan.md 和相关文档
   - 示例：`对应 Spec：[[plan|设计方案]]`
2. **使用 Callout 标注关键信息**：
   - `> [!success]` 标注成功完成的功能
   - `> [!warning]` 标注遇到的问题和解决方案
   - `> [!note]` 标注与 plan.md 的差异
3. **添加标签**：便于后续检索
   - 示例：`#spec/已完成` `#summary`

**相关 Skill**：
- 详细 Obsidian Markdown 语法：使用 `obsidian-markdown` Skill
- 创建实现架构图：使用 `json-canvas` Skill 可视化模块关系

### 后续流程
1. 创建 summary.md 后，使用 `spec-reviewer` 审查实现
2. 等待用户确认审查报告
3. 用户确认后，将 Spec 文件夹归档到 `06-已归档`

### 记忆更新提示
如果在实现过程中发现了重要的「困境-策略」对（如技术难点的解决方案），考虑使用 `/memory` Skill 将其记录到 CLAUDE.md 的战略记忆章节。

### 常见陷阱
- 忘记创建 summary.md
- 未运行 spec-reviewer 就直接归档
- 添加了 Spec 中未定义的额外功能
- 未等待用户确认就归档
