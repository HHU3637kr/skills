# Spec 文档示例

本文档提供了实际的 Spec 文档示例，展示如何应用模板。

---

## 示例 1：功能设计 - 专业评价 Agent

**文件名**: `spec/20251231-专业评价Agent设计.md`

```markdown
# 专业评价 Agent 设计方案

## 文档信息

- **创建日期**: 2025-12-31
- **文档类型**: 功能设计
- **相关模块**: Agent Layer
- **优先级**: 高

---

## 1. 概述

### 1.1 背景

当前专业评估工作需要人工逐项对照评估标准进行打分和评价，效率低且一致性难以保证。需要开发一个 AI Agent 来自动化这个过程。

### 1.2 目标

1. 实现基于评估指标体系的自动化打分
2. 生成可追溯的评价意见
3. 支持单专业和多专业并行评估
4. 确保评分过程的透明性和可解释性

### 1.3 范围

**包含**：
- 评估指标解析
- 材料分析和匹配
- 自动打分
- 评价意见生成
- 改进建议生成

**不包含**：
- 评估报告的格式化输出（由报告 Agent 负责）
- 材料的上传和管理（由材料管理模块负责）

---

## 2. 需求分析

### 2.1 功能需求

#### FR-001: 评估指标解析

**描述**：解析评估指标体系，提取评分标准和权重

**输入**：
- Framework JSON（评估指标体系）

**输出**：
- 结构化的评估指标列表
- 每个指标的评分规则和权重

**业务规则**：
1. 必须支持多层级指标体系
2. 权重总和必须为 1.0
3. 评分规则必须明确可执行

#### FR-002: 材料分析和匹配

**描述**：分析专业材料，匹配到相应的评估指标

**输入**：
- 专业自评报告
- 专业支撑材料
- 评估指标列表

**输出**：
- 指标与材料的匹配关系
- 每个指标对应的材料片段

**业务规则**：
1. 必须记录材料来源（文件名、页码、段落）
2. 支持多个材料支撑同一指标
3. 标记缺失材料的指标

#### FR-003: 自动打分

**描述**：基于评分规则和匹配的材料进行自动打分

**输入**：
- 评估指标
- 匹配的材料
- 评分规则

**输出**：
- 每个指标的分数
- 打分依据

**业务规则**：
1. 分数必须在规定范围内（如 0-100）
2. 必须记录打分依据
3. 缺失材料的指标给予最低分或标记为"无法评分"

#### FR-004: 评价意见生成

**描述**：为每个指标生成结构化的评价意见

**输入**：
- 指标分数
- 打分依据
- 材料内容

**输出**：
- 评价结果（分数）
- 评价依据（引用具体材料）
- 改进建议

**业务规则**：
1. 评价依据必须引用具体材料
2. 改进建议必须具体可行
3. 语言专业、客观

### 2.2 非功能需求

- **性能要求**：
  - 单个专业评估时间 < 5 分钟
  - 支持 10 个专业并行评估

- **可靠性要求**：
  - 评分过程可追溯
  - 支持中断恢复

- **安全性要求**：
  - 评估数据加密存储
  - 访问权限控制

---

## 3. 设计方案

### 3.1 架构设计

```
专业评价 Agent
├── 指标解析器 (IndicatorParser)
├── 材料分析器 (MaterialAnalyzer)
├── 评分引擎 (ScoringEngine)
└── 意见生成器 (OpinionGenerator)
```

### 3.2 数据模型

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class EvaluationIndicator(BaseModel):
    """评估指标"""
    id: str = Field(description="指标ID")
    name: str = Field(description="指标名称")
    weight: float = Field(description="权重", ge=0, le=1)
    scoring_rule: dict = Field(description="评分规则")

class MaterialMatch(BaseModel):
    """材料匹配"""
    indicator_id: str = Field(description="指标ID")
    material_source: str = Field(description="材料来源")
    content: str = Field(description="材料内容")
    relevance_score: float = Field(description="相关性分数", ge=0, le=1)

class EvaluationResult(BaseModel):
    """评估结果"""
    indicator_id: str = Field(description="指标ID")
    score: float = Field(description="分数")
    evaluation_basis: str = Field(description="评价依据")
    improvement_suggestions: List[str] = Field(description="改进建议")
```

### 3.3 接口设计

#### 接口 1：evaluate_major

**方法签名**：
```python
async def evaluate_major(
    framework: Framework,
    self_report: str,
    materials: List[Material]
) -> EvaluationReport:
    """评估专业

    Args:
        framework: 评估指标体系
        self_report: 专业自评报告
        materials: 支撑材料列表

    Returns:
        EvaluationReport: 评估报告
    """
    pass
```

**参数说明**：
- `framework`: 评估指标体系对象
- `self_report`: 专业自评报告文本
- `materials`: 支撑材料列表

**返回值**：
- `EvaluationReport`: 包含所有指标的评估结果

**异常**：
- `InvalidFrameworkError`: 评估指标体系无效
- `MaterialNotFoundError`: 缺少必要材料

---

## 4. 实现步骤

### 阶段 1：基础实现

- [ ] 步骤 1.1：实现 IndicatorParser，解析评估指标体系
- [ ] 步骤 1.2：实现 MaterialAnalyzer，分析和匹配材料
- [ ] 步骤 1.3：实现 ScoringEngine，基础打分逻辑
- [ ] 步骤 1.4：实现 OpinionGenerator，生成评价意见

### 阶段 2：功能完善

- [ ] 步骤 2.1：优化材料匹配算法，提高准确性
- [ ] 步骤 2.2：增强评价意见的可读性
- [ ] 步骤 2.3：添加并发评估支持
- [ ] 步骤 2.4：实现评估进度跟踪

### 阶段 3：测试和优化

- [ ] 步骤 3.1：单元测试（覆盖率 > 80%）
- [ ] 步骤 3.2：集成测试（真实数据）
- [ ] 步骤 3.3：性能优化（评估时间 < 5 分钟）
- [ ] 步骤 3.4：可追溯性验证

---

## 5. 测试计划

### 5.1 单元测试

| 测试用例 | 输入 | 预期输出 | 状态 |
|---------|------|---------|------|
| TC-001 | 有效的 Framework | 解析成功 | 待测试 |
| TC-002 | 无效的 Framework | 抛出异常 | 待测试 |
| TC-003 | 完整的材料 | 匹配成功 | 待测试 |
| TC-004 | 缺失材料 | 标记缺失 | 待测试 |

### 5.2 集成测试

**场景 1：完整评估流程**
- 输入：完整的评估指标体系和材料
- 预期：生成完整的评估报告，所有指标都有评分和意见

**场景 2：材料不足**
- 输入：部分材料缺失
- 预期：标记缺失材料的指标，给出提示

---

## 6. 风险和依赖

### 6.1 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Claude API 调用失败 | 高 | 中 | 实现重试机制和降级方案 |
| 材料匹配不准确 | 中 | 中 | 人工审核机制 |
| 评估时间过长 | 中 | 低 | 优化算法，增加缓存 |

### 6.2 依赖

- LangChain: Agent 框架
- Claude API: AI 能力
- Framework Service: 评估指标体系管理
- Material Service: 材料管理

---

## 7. 后续工作

- [ ] 开发专业综合分析报告 Agent
- [ ] 优化评价意见的生成质量
- [ ] 增加评估结果的可视化展示
- [ ] 支持自定义评估模板

---

## 8. 参考资料

- CLAUDE.md: 项目开发指南
- Framework 服务层设计.md: Framework 服务接口
- 专业评价-数据结构接口-v2.md: 数据结构定义
```

---

## 示例 2：API 规范 - 评估任务 API

**文件名**: `spec/20251231-evaluation-task-api.md`

```markdown
# 评估任务 API 规范

## 文档信息

- **创建日期**: 2025-12-31
- **文档类型**: API 规范
- **API 版本**: v1.0
- **基础路径**: `/api/v1`

---

## 1. 概述

### 1.1 API 描述

评估任务 API 提供创建、查询、更新和删除评估任务的功能。

### 1.2 认证方式

使用 JWT Token 认证：
```
Authorization: Bearer <token>
```

### 1.3 通用响应格式

```json
{
  "code": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2025-12-31T12:00:00Z"
}
```

---

## 2. 端点定义

### 2.1 创建评估任务

#### 基本信息

- **路径**: `/evaluation-tasks`
- **方法**: `POST`
- **描述**: 创建新的评估任务
- **认证**: 需要

#### 请求体

```json
{
  "name": "2025年度专业评估",
  "framework_id": "framework_001",
  "major_ids": ["major_001", "major_002"],
  "deadline": "2025-12-31T23:59:59Z"
}
```

**字段说明**：

| 字段名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| name | string | 是 | 任务名称 |
| framework_id | string | 是 | 评估指标体系ID |
| major_ids | array | 是 | 专业ID列表 |
| deadline | datetime | 否 | 截止时间 |

#### 响应

**成功响应** (201 Created)：

```json
{
  "code": 201,
  "message": "Task created successfully",
  "data": {
    "task_id": "task_001",
    "name": "2025年度专业评估",
    "status": "pending",
    "created_at": "2025-12-31T10:00:00Z"
  }
}
```

**错误响应** (400 Bad Request)：

```json
{
  "code": 400,
  "message": "Invalid request",
  "errors": [
    {
      "field": "framework_id",
      "message": "Framework not found"
    }
  ]
}
```

#### 示例

```bash
curl -X POST https://api.example.com/api/v1/evaluation-tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "2025年度专业评估",
    "framework_id": "framework_001",
    "major_ids": ["major_001", "major_002"]
  }'
```

### 2.2 查询评估任务

#### 基本信息

- **路径**: `/evaluation-tasks/{task_id}`
- **方法**: `GET`
- **描述**: 查询评估任务详情
- **认证**: 需要

#### 路径参数

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| task_id | string | 是 | 任务ID |

#### 响应

**成功响应** (200 OK)：

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "task_id": "task_001",
    "name": "2025年度专业评估",
    "framework_id": "framework_001",
    "major_ids": ["major_001", "major_002"],
    "status": "in_progress",
    "progress": 0.5,
    "created_at": "2025-12-31T10:00:00Z",
    "updated_at": "2025-12-31T11:00:00Z"
  }
}
```

---

## 3. 数据模型

### 3.1 EvaluationTask

```json
{
  "task_id": "string",
  "name": "string",
  "framework_id": "string",
  "major_ids": ["string"],
  "status": "string",
  "progress": "number",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**字段说明**：

| 字段名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| task_id | string | 是 | 任务唯一标识符 |
| name | string | 是 | 任务名称 |
| framework_id | string | 是 | 评估指标体系ID |
| major_ids | array | 是 | 专业ID列表 |
| status | string | 是 | 状态：pending/in_progress/completed/failed |
| progress | number | 是 | 进度：0-1 |
| created_at | datetime | 是 | 创建时间 |
| updated_at | datetime | 是 | 更新时间 |

---

## 4. 错误码

| 错误码 | 描述 | 解决方案 |
|--------|------|---------|
| E001 | 参数缺失 | 检查必需参数 |
| E002 | Framework 不存在 | 检查 framework_id |
| E003 | Major 不存在 | 检查 major_ids |
| E004 | 任务不存在 | 检查 task_id |

---

## 5. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2025-12-31 | 初始版本 |
```

---

## 示例 3：数据模型设计 - 评估结果模型

**文件名**: `spec/20251231-evaluation-result-model.md`

```markdown
# 评估结果数据模型设计

## 文档信息

- **创建日期**: 2025-12-31
- **文档类型**: 数据模型设计
- **相关模块**: Agent Layer, Data Layer

---

## 1. 概述

### 1.1 模型用途

评估结果模型用于存储专业评价 Agent 生成的评估结果，包括各项指标的分数、评价依据和改进建议。

### 1.2 设计原则

1. **可追溯性**：每个评分都必须有明确的依据
2. **结构化**：数据结构清晰，便于查询和分析
3. **扩展性**：支持未来添加新字段

---

## 2. 数据模型定义

### 2.1 核心模型

#### EvaluationResult: 评估结果

**描述**：单个专业的完整评估结果

**Pydantic 定义**：

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class IndicatorEvaluation(BaseModel):
    """单个指标的评估结果"""

    # 系统预设字段
    indicator_id: str = Field(description="指标ID，系统生成")
    indicator_name: str = Field(description="指标名称，系统生成")
    weight: float = Field(description="权重，系统生成", ge=0, le=1)

    # Agent 填写字段
    score: float = Field(description="分数，Agent填写", ge=0, le=100)
    evaluation_basis: str = Field(description="评价依据，Agent填写")
    improvement_suggestions: List[str] = Field(
        default_factory=list,
        description="改进建议列表，Agent填写"
    )

    # 可追溯性字段
    material_references: List[dict] = Field(
        default_factory=list,
        description="材料引用，Agent填写"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "indicator_id": "ind_001",
                "indicator_name": "师资队伍",
                "weight": 0.2,
                "score": 85.5,
                "evaluation_basis": "根据提供的师资名单...",
                "improvement_suggestions": [
                    "增加高级职称教师比例",
                    "加强青年教师培养"
                ],
                "material_references": [
                    {
                        "source": "师资名单.xlsx",
                        "page": 1,
                        "content": "教授10人，副教授20人"
                    }
                ]
            }
        }

class EvaluationResult(BaseModel):
    """完整的评估结果"""

    # 系统预设字段
    id: str = Field(description="评估结果ID，系统生成")
    task_id: str = Field(description="评估任务ID，系统生成")
    major_id: str = Field(description="专业ID，系统生成")
    framework_id: str = Field(description="评估指标体系ID，系统生成")
    created_at: datetime = Field(description="创建时间，系统生成")
    updated_at: datetime = Field(description="更新时间，系统生成")

    # Agent 填写字段
    indicator_evaluations: List[IndicatorEvaluation] = Field(
        description="各指标评估结果，Agent填写"
    )
    overall_score: float = Field(description="总分，Agent计算", ge=0, le=100)
    overall_comment: str = Field(description="总体评价，Agent填写")

    # 状态字段
    status: str = Field(
        default="draft",
        description="状态：draft/submitted/approved，系统管理"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "result_001",
                "task_id": "task_001",
                "major_id": "major_001",
                "framework_id": "framework_001",
                "indicator_evaluations": [],
                "overall_score": 85.5,
                "overall_comment": "该专业整体表现良好...",
                "status": "draft"
            }
        }
```

**字段说明**：

| 字段名 | 类型 | 必需 | 默认值 | 填写方 | 描述 |
|--------|------|------|--------|--------|------|
| id | str | 是 | - | 系统 | 唯一标识符 |
| task_id | str | 是 | - | 系统 | 评估任务ID |
| major_id | str | 是 | - | 系统 | 专业ID |
| framework_id | str | 是 | - | 系统 | 评估指标体系ID |
| indicator_evaluations | List | 是 | [] | Agent | 各指标评估结果 |
| overall_score | float | 是 | - | Agent | 总分（加权平均） |
| overall_comment | str | 是 | - | Agent | 总体评价 |
| status | str | 是 | draft | 系统 | 状态 |
| created_at | datetime | 是 | - | 系统 | 创建时间 |
| updated_at | datetime | 是 | - | 系统 | 更新时间 |

**约束条件**：

- `id` 必须唯一
- `score` 范围：0-100
- `overall_score` 必须是各指标加权平均值
- `status` 枚举值：draft, submitted, approved
- `material_references` 必须包含 source 字段

**数据流转**：

```
1. 创建评估任务
   → 系统生成 id, task_id, major_id, framework_id
   → 系统设置 status = draft
   → 系统设置 created_at, updated_at

2. Agent 执行评估
   → Agent 填写 indicator_evaluations
   → Agent 计算 overall_score
   → Agent 填写 overall_comment
   → 系统更新 updated_at

3. 提交评估结果
   → 系统更新 status = submitted
   → 系统更新 updated_at

4. 审核通过
   → 系统更新 status = approved
   → 系统更新 updated_at
```

---

## 3. 关系模型

### 3.1 模型关系图

```
EvaluationTask (1) ----< (N) EvaluationResult
                              |
                              |
                              v
                        IndicatorEvaluation (N)
```

### 3.2 关系说明

- **EvaluationTask → EvaluationResult**: 一对多关系，一个评估任务可以有多个评估结果（每个专业一个）
- **EvaluationResult → IndicatorEvaluation**: 一对多关系，一个评估结果包含多个指标评估

---

## 4. 数据验证规则

### 4.1 字段验证

```python
from pydantic import validator

class EvaluationResult(BaseModel):
    overall_score: float
    indicator_evaluations: List[IndicatorEvaluation]

    @validator('overall_score')
    def validate_overall_score(cls, v, values):
        """验证总分是否为加权平均值"""
        if 'indicator_evaluations' in values:
            evaluations = values['indicator_evaluations']
            if evaluations:
                weighted_sum = sum(
                    e.score * e.weight
                    for e in evaluations
                )
                if abs(v - weighted_sum) > 0.01:
                    raise ValueError('总分必须是各指标的加权平均值')
        return v

    @validator('indicator_evaluations')
    def validate_weights(cls, v):
        """验证权重总和为1"""
        if v:
            total_weight = sum(e.weight for e in v)
            if abs(total_weight - 1.0) > 0.01:
                raise ValueError('指标权重总和必须为1.0')
        return v
```

### 4.2 业务规则验证

1. 规则 1：每个指标必须有评价依据
2. 规则 2：评价依据必须引用具体材料
3. 规则 3：改进建议至少包含一条

---

## 5. 数据库映射

### 5.1 表结构

```sql
CREATE TABLE evaluation_results (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL,
    major_id VARCHAR(50) NOT NULL,
    framework_id VARCHAR(50) NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    overall_comment TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES evaluation_tasks(id),
    FOREIGN KEY (major_id) REFERENCES majors(id),
    FOREIGN KEY (framework_id) REFERENCES frameworks(id),
    INDEX idx_task_id (task_id),
    INDEX idx_major_id (major_id),
    INDEX idx_status (status)
);

CREATE TABLE indicator_evaluations (
    id VARCHAR(50) PRIMARY KEY,
    result_id VARCHAR(50) NOT NULL,
    indicator_id VARCHAR(50) NOT NULL,
    indicator_name VARCHAR(255) NOT NULL,
    weight DECIMAL(5,4) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    evaluation_basis TEXT NOT NULL,
    improvement_suggestions JSON,
    material_references JSON,
    FOREIGN KEY (result_id) REFERENCES evaluation_results(id) ON DELETE CASCADE,
    INDEX idx_result_id (result_id),
    INDEX idx_indicator_id (indicator_id)
);
```

### 5.2 索引设计

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| idx_task_id | task_id | 普通索引 | 按任务查询 |
| idx_major_id | major_id | 普通索引 | 按专业查询 |
| idx_status | status | 普通索引 | 按状态查询 |
| idx_result_id | result_id | 普通索引 | 关联查询 |

---

## 6. 测试数据

### 6.1 示例数据

```json
{
  "id": "result_001",
  "task_id": "task_001",
  "major_id": "major_001",
  "framework_id": "framework_001",
  "indicator_evaluations": [
    {
      "indicator_id": "ind_001",
      "indicator_name": "师资队伍",
      "weight": 0.2,
      "score": 85.5,
      "evaluation_basis": "根据提供的师资名单，该专业共有教授10人，副教授20人，师资力量较强。",
      "improvement_suggestions": [
        "增加高级职称教师比例",
        "加强青年教师培养"
      ],
      "material_references": [
        {
          "source": "师资名单.xlsx",
          "page": 1,
          "content": "教授10人，副教授20人"
        }
      ]
    }
  ],
  "overall_score": 85.5,
  "overall_comment": "该专业整体表现良好，师资力量较强，教学条件完善。",
  "status": "draft",
  "created_at": "2025-12-31T10:00:00Z",
  "updated_at": "2025-12-31T10:00:00Z"
}
```

---

## 7. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2025-12-31 | 初始版本 |
```

---

## 使用说明

这些示例展示了如何应用模板创建实际的 Spec 文档。你可以：

1. 参考这些示例的结构和内容
2. 根据实际需求调整细节
3. 保持一致的格式和风格
4. 确保文档的完整性和可读性
