# Spec 文档模板

本文档提供了各种类型 Spec 文档的标准模板。

---

## 1. 功能设计模板

```markdown
# [功能名称]设计方案

## 文档信息

- **创建日期**: YYYY-MM-DD
- **文档类型**: 功能设计
- **相关模块**: [模块名称]
- **优先级**: 高/中/低

---

## 1. 概述

### 1.1 背景

[描述为什么需要这个功能，解决什么问题]

### 1.2 目标

[明确列出功能要达到的目标]

1. 目标 1
2. 目标 2
3. 目标 3

### 1.3 范围

**包含**：
- 功能点 1
- 功能点 2

**不包含**：
- 不在此次实现的功能

---

## 2. 需求分析

### 2.1 功能需求

#### FR-001: [需求名称]

**描述**：[详细描述]

**输入**：
- 输入项 1
- 输入项 2

**输出**：
- 输出项 1
- 输出项 2

**业务规则**：
1. 规则 1
2. 规则 2

### 2.2 非功能需求

- **性能要求**：[响应时间、吞吐量等]
- **可靠性要求**：[可用性、容错性等]
- **安全性要求**：[权限控制、数据保护等]

---

## 3. 设计方案

### 3.1 架构设计

[描述整体架构，可以包含架构图]

### 3.2 数据模型

```python
class ModelName(BaseModel):
    """模型描述"""
    field1: str = Field(description="字段1描述")
    field2: int = Field(description="字段2描述")
```

### 3.3 接口设计

#### 接口 1：[接口名称]

**方法签名**：
```python
def method_name(param1: Type1, param2: Type2) -> ReturnType:
    """方法描述"""
    pass
```

**参数说明**：
- `param1`: 参数1描述
- `param2`: 参数2描述

**返回值**：
- 返回值描述

**异常**：
- `ExceptionType`: 异常情况描述

---

## 4. 实现步骤

### 阶段 1：基础实现

- [ ] 步骤 1.1：[具体任务]
- [ ] 步骤 1.2：[具体任务]

### 阶段 2：功能完善

- [ ] 步骤 2.1：[具体任务]
- [ ] 步骤 2.2：[具体任务]

### 阶段 3：测试和优化

- [ ] 步骤 3.1：单元测试
- [ ] 步骤 3.2：集成测试
- [ ] 步骤 3.3：性能优化

---

## 5. 测试计划

### 5.1 单元测试

| 测试用例 | 输入 | 预期输出 | 状态 |
|---------|------|---------|------|
| TC-001 | [输入] | [输出] | 待测试 |

### 5.2 集成测试

[描述集成测试场景]

---

## 6. 风险和依赖

### 6.1 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 风险1 | 高/中/低 | 高/中/低 | [措施] |

### 6.2 依赖

- 依赖项 1：[描述]
- 依赖项 2：[描述]

---

## 7. 后续工作

- [ ] 任务 1
- [ ] 任务 2

---

## 8. 参考资料

- [相关文档链接]
- [参考资料]
```

---

## 2. API 规范模板

```markdown
# [API 名称] 接口规范

## 文档信息

- **创建日期**: YYYY-MM-DD
- **文档类型**: API 规范
- **API 版本**: v1.0
- **基础路径**: `/api/v1`

---

## 1. 概述

### 1.1 API 描述

[描述 API 的用途和功能]

### 1.2 认证方式

[描述认证机制，如 JWT、API Key 等]

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

### 2.1 [端点名称]

#### 基本信息

- **路径**: `/resource/{id}`
- **方法**: `GET` / `POST` / `PUT` / `DELETE`
- **描述**: [端点功能描述]
- **认证**: 需要 / 不需要

#### 请求参数

**路径参数**：

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| id | string | 是 | 资源ID |

**查询参数**：

| 参数名 | 类型 | 必需 | 默认值 | 描述 |
|--------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| size | integer | 否 | 20 | 每页数量 |

**请求体**：

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**字段说明**：

| 字段名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| field1 | string | 是 | 字段1描述 |
| field2 | string | 否 | 字段2描述 |

#### 响应

**成功响应** (200 OK)：

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": "123",
    "name": "Example"
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
      "field": "field1",
      "message": "Field is required"
    }
  ]
}
```

#### 状态码

| 状态码 | 描述 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

#### 示例

**请求示例**：

```bash
curl -X POST https://api.example.com/api/v1/resource \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "field1": "value1",
    "field2": "value2"
  }'
```

**响应示例**：

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": "123",
    "name": "Example"
  }
}
```

---

## 3. 数据模型

### 3.1 [模型名称]

```json
{
  "id": "string",
  "name": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**字段说明**：

| 字段名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| id | string | 是 | 唯一标识符 |
| name | string | 是 | 名称 |
| created_at | datetime | 是 | 创建时间 |
| updated_at | datetime | 是 | 更新时间 |

---

## 4. 错误码

| 错误码 | 描述 | 解决方案 |
|--------|------|---------|
| E001 | 参数缺失 | 检查必需参数 |
| E002 | 参数格式错误 | 检查参数类型 |

---

## 5. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2025-12-31 | 初始版本 |
```

---

## 3. 数据模型设计模板

```markdown
# [模型名称]数据模型设计

## 文档信息

- **创建日期**: YYYY-MM-DD
- **文档类型**: 数据模型设计
- **相关模块**: [模块名称]

---

## 1. 概述

### 1.1 模型用途

[描述数据模型的用途和应用场景]

### 1.2 设计原则

1. 原则 1
2. 原则 2
3. 原则 3

---

## 2. 数据模型定义

### 2.1 核心模型

#### Model1: [模型名称]

**描述**：[模型描述]

**Pydantic 定义**：

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Model1(BaseModel):
    """模型描述"""

    # 系统预设字段
    id: str = Field(description="唯一标识符，系统生成")
    created_at: datetime = Field(description="创建时间，系统生成")
    updated_at: datetime = Field(description="更新时间，系统生成")

    # Agent 填写字段
    name: str = Field(description="名称，Agent填写")
    description: Optional[str] = Field(None, description="描述，Agent填写")

    # 业务字段
    status: str = Field(description="状态：pending/in_progress/completed")
    score: Optional[float] = Field(None, ge=0, le=100, description="分数，0-100")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "eval_001",
                "name": "示例评估",
                "status": "pending",
                "score": 85.5
            }
        }
```

**字段说明**：

| 字段名 | 类型 | 必需 | 默认值 | 填写方 | 描述 |
|--------|------|------|--------|--------|------|
| id | str | 是 | - | 系统 | 唯一标识符 |
| name | str | 是 | - | Agent | 名称 |
| status | str | 是 | pending | 系统 | 状态 |
| score | float | 否 | None | Agent | 分数 |

**约束条件**：

- `id` 必须唯一
- `score` 范围：0-100
- `status` 枚举值：pending, in_progress, completed

**数据流转**：

```
创建 → 系统生成 id, created_at, updated_at
     → Agent 填写 name, description
     → 系统设置 status = pending

更新 → Agent 填写 score
     → 系统更新 updated_at
     → 系统更新 status = completed
```

---

## 3. 关系模型

### 3.1 模型关系图

```
Model1 (1) ----< (N) Model2
  |
  |
  v
Model3 (1) ----< (N) Model4
```

### 3.2 关系说明

- **Model1 → Model2**: 一对多关系，一个 Model1 可以有多个 Model2
- **Model1 → Model3**: 一对一关系，一个 Model1 对应一个 Model3

---

## 4. 数据验证规则

### 4.1 字段验证

```python
from pydantic import validator

class Model1(BaseModel):
    score: Optional[float] = None

    @validator('score')
    def validate_score(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('分数必须在 0-100 之间')
        return v
```

### 4.2 业务规则验证

1. 规则 1：[描述]
2. 规则 2：[描述]

---

## 5. 数据库映射

### 5.1 表结构

```sql
CREATE TABLE model1 (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    score DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

### 5.2 索引设计

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| idx_status | status | 普通索引 | 状态查询 |
| idx_created_at | created_at | 普通索引 | 时间排序 |

---

## 6. 数据迁移

### 6.1 迁移脚本

```python
# migrations/001_create_model1.py

def upgrade():
    """创建 model1 表"""
    pass

def downgrade():
    """删除 model1 表"""
    pass
```

---

## 7. 测试数据

### 7.1 示例数据

```json
{
  "id": "eval_001",
  "name": "计算机科学与技术专业评估",
  "description": "2025年度专业评估",
  "status": "pending",
  "score": null,
  "created_at": "2025-12-31T10:00:00Z",
  "updated_at": "2025-12-31T10:00:00Z"
}
```

---

## 8. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2025-12-31 | 初始版本 |
```

---

## 4. 架构设计模板

```markdown
# [系统/模块]架构设计

## 文档信息

- **创建日期**: YYYY-MM-DD
- **文档类型**: 架构设计
- **相关模块**: [模块名称]

---

## 1. 概述

### 1.1 背景

[描述架构设计的背景和动机]

### 1.2 目标

[列出架构设计要达到的目标]

### 1.3 设计原则

1. 原则 1
2. 原则 2
3. 原则 3

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────┐
│           API Layer (FastAPI)           │
├─────────────────────────────────────────┤
│           Agent Layer                   │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Evaluation   │  │ Report       │    │
│  │ Agent        │  │ Agent        │    │
│  └──────────────┘  └──────────────┘    │
├─────────────────────────────────────────┤
│        Framework Service Layer          │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Framework    │  │ Material     │    │
│  │ Service      │  │ Service      │    │
│  └──────────────┘  └──────────────┘    │
├─────────────────────────────────────────┤
│           Data Layer                    │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Database     │  │ File Storage │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
```

### 2.2 层次说明

#### API Layer
- **职责**：[描述]
- **技术栈**：FastAPI, Pydantic
- **主要接口**：[列出]

#### Agent Layer
- **职责**：[描述]
- **技术栈**：LangChain, Claude API
- **主要组件**：[列出]

#### Framework Service Layer
- **职责**：[描述]
- **技术栈**：Python, Pydantic
- **主要服务**：[列出]

#### Data Layer
- **职责**：[描述]
- **技术栈**：SQLite, File System
- **存储方案**：[描述]

---

## 3. 组件设计

### 3.1 组件 1

**职责**：[描述组件职责]

**接口**：

```python
class Component1:
    def method1(self, param: Type) -> ReturnType:
        """方法描述"""
        pass
```

**依赖**：
- 依赖项 1
- 依赖项 2

---

## 4. 数据流

### 4.1 主要数据流

```
用户请求 → API Layer → Agent Layer → Service Layer → Data Layer
                                                        ↓
                                                    持久化
                                                        ↓
响应 ← API Layer ← Agent Layer ← Service Layer ← Data Layer
```

### 4.2 数据流说明

1. 步骤 1：[描述]
2. 步骤 2：[描述]
3. 步骤 3：[描述]

---

## 5. 技术选型

| 技术领域 | 选型 | 理由 |
|---------|------|------|
| Web 框架 | FastAPI | 高性能、类型安全 |
| AI 框架 | LangChain | Agent 开发便捷 |
| 数据库 | SQLite | 轻量级、易部署 |

---

## 6. 部署架构

### 6.1 部署方案

[描述部署方案]

### 6.2 环境配置

- **开发环境**：[配置]
- **测试环境**：[配置]
- **生产环境**：[配置]

---

## 7. 性能考虑

### 7.1 性能目标

- 响应时间：< 2s
- 并发支持：100 并发
- 吞吐量：1000 req/min

### 7.2 优化策略

1. 策略 1
2. 策略 2

---

## 8. 安全考虑

### 8.1 安全措施

1. 措施 1
2. 措施 2

---

## 9. 监控和日志

### 9.1 监控指标

- 指标 1
- 指标 2

### 9.2 日志策略

[描述日志策略]

---

## 10. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2025-12-31 | 初始版本 |
```

---

## 5. 重构方案模板

```markdown
# [模块/功能]重构方案

## 文档信息

- **创建日期**: YYYY-MM-DD
- **文档类型**: 重构方案
- **相关模块**: [模块名称]
- **优先级**: 高/中/低

---

## 1. 概述

### 1.1 重构背景

[描述为什么需要重构]

### 1.2 当前问题

1. 问题 1：[描述]
2. 问题 2：[描述]
3. 问题 3：[描述]

### 1.3 重构目标

1. 目标 1
2. 目标 2
3. 目标 3

---

## 2. 现状分析

### 2.1 当前实现

[描述当前的实现方式]

```python
# 当前代码示例
class OldImplementation:
    pass
```

### 2.2 存在的问题

| 问题 | 影响 | 严重程度 |
|------|------|---------|
| 问题1 | [影响] | 高/中/低 |

---

## 3. 重构方案

### 3.1 目标架构

[描述重构后的架构]

```python
# 重构后代码示例
class NewImplementation:
    pass
```

### 3.2 改进点

1. 改进点 1：[描述]
2. 改进点 2：[描述]

---

## 4. 实施计划

### 4.1 重构步骤

- [ ] 阶段 1：准备工作
  - [ ] 步骤 1.1：[具体任务]
  - [ ] 步骤 1.2：[具体任务]

- [ ] 阶段 2：核心重构
  - [ ] 步骤 2.1：[具体任务]
  - [ ] 步骤 2.2：[具体任务]

- [ ] 阶段 3：测试验证
  - [ ] 步骤 3.1：单元测试
  - [ ] 步骤 3.2：集成测试

- [ ] 阶段 4：部署上线
  - [ ] 步骤 4.1：[具体任务]
  - [ ] 步骤 4.2：[具体任务]

### 4.2 回滚方案

[描述如果重构失败如何回滚]

---

## 5. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 风险1 | 高/中/低 | 高/中/低 | [措施] |

---

## 6. 测试计划

### 6.1 测试范围

- 测试项 1
- 测试项 2

### 6.2 测试用例

| 用例ID | 描述 | 预期结果 | 状态 |
|--------|------|---------|------|
| TC-001 | [描述] | [结果] | 待测试 |

---

## 7. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2025-12-31 | 初始版本 |
```

---

## 使用说明

1. 根据文档类型选择合适的模板
2. 复制模板内容
3. 填写具体信息，删除不需要的部分
4. 保存到 `spec/` 目录，文件名格式：`YYYYMMDD-文档作用.md`
5. 等待用户确认后再进行开发
