# Spec Executor 工作流程

本文档详细说明了根据不同类型的 Spec 文档执行开发任务的具体工作流程。

---

## 工作流程 1：实现 Framework 服务层

### 适用场景

- Spec 类型：数据模型设计、服务层设计
- 开发阶段：Framework Service Layer
- 目录位置：`src/services/`

### 详细步骤

#### 1. 读取和分析 Spec

```python
# 读取 Spec 文档
spec_path = "spec/20251231-framework-service-design.md"
spec_content = Read(file_path=spec_path)

# 提取关键信息
- 数据模型定义
- 服务接口定义
- 业务规则
- 验证规则
```

#### 2. 创建目录结构

```bash
src/services/
├── __init__.py
├── framework_service.py      # Framework 服务
├── material_service.py        # 材料服务
└── models/
    ├── __init__.py
    ├── framework.py           # Framework 模型
    └── material.py            # Material 模型
```

#### 3. 实现数据模型

**按照 Spec 的顺序实现**：

```python
# src/services/models/framework.py

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime

class Indicator(BaseModel):
    """评估指标

    根据 Spec: spec/20251231-framework-service-design.md
    章节: 3.2 数据模型 - Indicator
    """

    # 系统预设字段
    id: str = Field(description="指标ID，系统生成")
    name: str = Field(description="指标名称，系统预设")
    weight: float = Field(description="权重，系统预设", ge=0, le=1)

    # 评分规则
    scoring_rule: dict = Field(description="评分规则")

    @validator('weight')
    def validate_weight(cls, v):
        """验证权重范围"""
        if v < 0 or v > 1:
            raise ValueError('权重必须在 0-1 之间')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "id": "ind_001",
                "name": "师资队伍",
                "weight": 0.2,
                "scoring_rule": {
                    "min": 0,
                    "max": 100,
                    "levels": ["Poor", "Fair", "Good", "Excellent"]
                }
            }
        }

class Framework(BaseModel):
    """评估指标体系

    根据 Spec: spec/20251231-framework-service-design.md
    章节: 3.2 数据模型 - Framework
    """

    # 系统预设字段
    id: str = Field(description="Framework ID，系统生成")
    name: str = Field(description="Framework 名称")
    version: str = Field(description="版本号")
    created_at: datetime = Field(description="创建时间，系统生成")
    updated_at: datetime = Field(description="更新时间，系统生成")

    # 指标列表
    indicators: List[Indicator] = Field(description="评估指标列表")

    @validator('indicators')
    def validate_weights_sum(cls, v):
        """验证权重总和为 1.0"""
        if v:
            total_weight = sum(ind.weight for ind in v)
            if abs(total_weight - 1.0) > 0.01:
                raise ValueError(f'指标权重总和必须为 1.0，当前为 {total_weight}')
        return v
```

#### 4. 实现服务类

```python
# src/services/framework_service.py

from typing import List, Optional
from .models.framework import Framework, Indicator

class FrameworkService:
    """Framework 服务

    根据 Spec: spec/20251231-framework-service-design.md
    章节: 3.3 接口设计
    """

    def __init__(self, storage_path: str = "data/frameworks"):
        """初始化服务

        Args:
            storage_path: 存储路径
        """
        self.storage_path = storage_path

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
        # 验证 Framework
        framework.validate()

        # 保存到存储
        self._save_framework(framework)

        return framework

    def get_framework(self, framework_id: str) -> Optional[Framework]:
        """获取 Framework

        根据 Spec: 章节 3.3.2 - get_framework

        Args:
            framework_id: Framework ID

        Returns:
            Optional[Framework]: Framework 对象，不存在则返回 None
        """
        return self._load_framework(framework_id)

    def list_frameworks(self) -> List[Framework]:
        """列出所有 Frameworks

        根据 Spec: 章节 3.3.3 - list_frameworks

        Returns:
            List[Framework]: Framework 列表
        """
        return self._load_all_frameworks()

    def _save_framework(self, framework: Framework) -> None:
        """保存 Framework 到存储"""
        # 实现存储逻辑
        pass

    def _load_framework(self, framework_id: str) -> Optional[Framework]:
        """从存储加载 Framework"""
        # 实现加载逻辑
        pass

    def _load_all_frameworks(self) -> List[Framework]:
        """从存储加载所有 Frameworks"""
        # 实现加载逻辑
        pass
```

#### 5. 编写单元测试

```python
# tests/test_services/test_framework_service.py

import pytest
from src.services.framework_service import FrameworkService
from src.services.models.framework import Framework, Indicator

class TestFrameworkService:
    """测试 FrameworkService

    根据 Spec: spec/20251231-framework-service-design.md
    章节: 5.1 单元测试
    """

    @pytest.fixture
    def service(self, tmp_path):
        """创建测试服务"""
        return FrameworkService(storage_path=str(tmp_path))

    @pytest.fixture
    def sample_framework(self):
        """创建示例 Framework"""
        return Framework(
            id="fw_001",
            name="教学质量评估",
            version="1.0",
            indicators=[
                Indicator(
                    id="ind_001",
                    name="师资队伍",
                    weight=0.2,
                    scoring_rule={"min": 0, "max": 100}
                ),
                Indicator(
                    id="ind_002",
                    name="教学条件",
                    weight=0.8,
                    scoring_rule={"min": 0, "max": 100}
                )
            ]
        )

    def test_create_framework(self, service, sample_framework):
        """测试用例 TC-001: 创建 Framework"""
        result = service.create_framework(sample_framework)
        assert result.id == "fw_001"
        assert result.name == "教学质量评估"

    def test_get_framework(self, service, sample_framework):
        """测试用例 TC-002: 获取 Framework"""
        service.create_framework(sample_framework)
        result = service.get_framework("fw_001")
        assert result is not None
        assert result.id == "fw_001"

    def test_get_nonexistent_framework(self, service):
        """测试用例 TC-003: 获取不存在的 Framework"""
        result = service.get_framework("nonexistent")
        assert result is None

    def test_list_frameworks(self, service, sample_framework):
        """测试用例 TC-004: 列出所有 Frameworks"""
        service.create_framework(sample_framework)
        result = service.list_frameworks()
        assert len(result) == 1
        assert result[0].id == "fw_001"
```

#### 6. 运行测试

```bash
# 运行单元测试
pytest tests/test_services/test_framework_service.py -v

# 检查测试覆盖率
pytest tests/test_services/ --cov=src/services --cov-report=html

# 查看覆盖率报告
open htmlcov/index.html
```

#### 7. 更新文档

```markdown
# Framework Service 实现完成

## 实现内容

- [x] Framework 数据模型
- [x] Indicator 数据模型
- [x] FrameworkService 服务类
- [x] 单元测试（覆盖率 85%）

## 文件清单

- src/services/models/framework.py
- src/services/framework_service.py
- tests/test_services/test_framework_service.py

## 测试结果

- 所有测试通过 ✓
- 测试覆盖率: 85%
```

---

## 工作流程 2：实现 Agent 层

### 适用场景

- Spec 类型：Agent 设计、功能设计
- 开发阶段：Agent Layer
- 目录位置：`src/agents/`
- 前置条件：Framework 服务层已实现

### 详细步骤

#### 1. 验证依赖

```python
# 检查 Framework 服务层是否已实现
import os

required_files = [
    "src/services/framework_service.py",
    "src/services/models/framework.py"
]

for file in required_files:
    if not os.path.exists(file):
        print(f"❌ 错误：依赖文件不存在 - {file}")
        print("请先实现 Framework 服务层")
        exit(1)

print("✓ 依赖检查通过")
```

#### 2. 创建目录结构

```bash
src/agents/
├── __init__.py
├── evaluation_agent.py        # 评价 Agent
├── report_agent.py            # 报告 Agent
└── components/
    ├── __init__.py
    ├── indicator_parser.py    # 指标解析器
    ├── material_analyzer.py   # 材料分析器
    ├── scoring_engine.py      # 评分引擎
    └── opinion_generator.py   # 意见生成器
```

#### 3. 实现 Agent 组件

```python
# src/agents/components/indicator_parser.py

from typing import List
from src.services.models.framework import Framework, Indicator

class IndicatorParser:
    """评估指标解析器

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 3.2 数据模型 - IndicatorParser
    """

    def parse_framework(self, framework: Framework) -> List[Indicator]:
        """解析评估指标体系

        根据 Spec: 章节 3.3.1 - parse_framework

        Args:
            framework: 评估指标体系

        Returns:
            List[Indicator]: 结构化的评估指标列表

        Raises:
            InvalidFrameworkError: 评估指标体系无效
        """
        # 验证 Framework
        if not framework.indicators:
            raise InvalidFrameworkError("Framework 没有指标")

        # 提取指标
        indicators = framework.indicators

        # 验证权重总和
        total_weight = sum(ind.weight for ind in indicators)
        if abs(total_weight - 1.0) > 0.01:
            raise InvalidFrameworkError(
                f"指标权重总和必须为 1.0，当前为 {total_weight}"
            )

        return indicators
```

```python
# src/agents/components/material_analyzer.py

from typing import List, Dict
from pydantic import BaseModel, Field

class MaterialMatch(BaseModel):
    """材料匹配结果

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 3.2 数据模型 - MaterialMatch
    """

    indicator_id: str = Field(description="指标ID")
    material_source: str = Field(description="材料来源")
    content: str = Field(description="材料内容")
    relevance_score: float = Field(description="相关性分数", ge=0, le=1)

class MaterialAnalyzer:
    """材料分析器

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 3.2 数据模型 - MaterialAnalyzer
    """

    def __init__(self, llm_client):
        """初始化材料分析器

        Args:
            llm_client: LLM 客户端（Claude API）
        """
        self.llm_client = llm_client

    async def analyze_and_match(
        self,
        indicators: List[Indicator],
        materials: List[str]
    ) -> Dict[str, List[MaterialMatch]]:
        """分析材料并匹配到指标

        根据 Spec: 章节 3.3.2 - analyze_and_match

        Args:
            indicators: 评估指标列表
            materials: 材料列表

        Returns:
            Dict[str, List[MaterialMatch]]: 指标ID到材料匹配的映射
        """
        matches = {}

        for indicator in indicators:
            # 为每个指标匹配材料
            indicator_matches = await self._match_materials_for_indicator(
                indicator,
                materials
            )
            matches[indicator.id] = indicator_matches

        return matches

    async def _match_materials_for_indicator(
        self,
        indicator: Indicator,
        materials: List[str]
    ) -> List[MaterialMatch]:
        """为单个指标匹配材料"""
        # 使用 LLM 分析材料相关性
        prompt = f"""
        评估指标：{indicator.name}

        请分析以下材料与该指标的相关性，并提取相关内容。

        材料：
        {materials}

        输出格式：
        {{
            "matches": [
                {{
                    "source": "材料来源",
                    "content": "相关内容",
                    "relevance_score": 0.8
                }}
            ]
        }}
        """

        response = await self.llm_client.generate(prompt)

        # 解析响应并创建 MaterialMatch 对象
        matches = []
        for match_data in response['matches']:
            matches.append(MaterialMatch(
                indicator_id=indicator.id,
                material_source=match_data['source'],
                content=match_data['content'],
                relevance_score=match_data['relevance_score']
            ))

        return matches
```

#### 4. 实现主 Agent

```python
# src/agents/evaluation_agent.py

from typing import List
from src.services.models.framework import Framework
from src.services.framework_service import FrameworkService
from .components.indicator_parser import IndicatorParser
from .components.material_analyzer import MaterialAnalyzer
from .components.scoring_engine import ScoringEngine
from .components.opinion_generator import OpinionGenerator

class EvaluationAgent:
    """专业评价 Agent

    根据 Spec: spec/20251231-专业评价Agent设计.md

    核心要求：
    1. 评分过程可追溯
    2. 避免黑盒式评价
    3. 支持并发评估
    """

    def __init__(
        self,
        framework_service: FrameworkService,
        llm_client
    ):
        """初始化 Agent

        Args:
            framework_service: Framework 服务
            llm_client: LLM 客户端
        """
        self.framework_service = framework_service
        self.indicator_parser = IndicatorParser()
        self.material_analyzer = MaterialAnalyzer(llm_client)
        self.scoring_engine = ScoringEngine(llm_client)
        self.opinion_generator = OpinionGenerator(llm_client)

    async def evaluate_major(
        self,
        framework_id: str,
        self_report: str,
        materials: List[str]
    ) -> EvaluationResult:
        """评估专业

        根据 Spec: 章节 3.3 - evaluate_major

        Args:
            framework_id: 评估指标体系ID
            self_report: 专业自评报告
            materials: 支撑材料列表

        Returns:
            EvaluationResult: 评估结果（包含可追溯的评价依据）

        Raises:
            InvalidFrameworkError: 评估指标体系无效
            MaterialNotFoundError: 缺少必要材料
        """
        # 步骤 1：获取 Framework
        framework = self.framework_service.get_framework(framework_id)
        if not framework:
            raise InvalidFrameworkError(f"Framework 不存在: {framework_id}")

        # 步骤 2：解析指标
        indicators = self.indicator_parser.parse_framework(framework)

        # 步骤 3：分析和匹配材料
        all_materials = [self_report] + materials
        material_matches = await self.material_analyzer.analyze_and_match(
            indicators,
            all_materials
        )

        # 步骤 4：评分
        indicator_evaluations = []
        for indicator in indicators:
            matches = material_matches.get(indicator.id, [])

            # 评分
            score = await self.scoring_engine.score_indicator(
                indicator,
                matches
            )

            # 生成评价意见
            opinion = await self.opinion_generator.generate_opinion(
                indicator,
                score,
                matches
            )

            indicator_evaluations.append(IndicatorEvaluation(
                indicator_id=indicator.id,
                indicator_name=indicator.name,
                weight=indicator.weight,
                score=score,
                evaluation_basis=opinion.basis,
                improvement_suggestions=opinion.suggestions,
                material_references=[
                    {
                        "source": m.material_source,
                        "content": m.content,
                        "relevance_score": m.relevance_score
                    }
                    for m in matches
                ]
            ))

        # 步骤 5：计算总分
        overall_score = sum(
            e.score * e.weight
            for e in indicator_evaluations
        )

        # 步骤 6：生成总体评价
        overall_comment = await self.opinion_generator.generate_overall_comment(
            indicator_evaluations
        )

        return EvaluationResult(
            id=generate_id(),
            framework_id=framework_id,
            indicator_evaluations=indicator_evaluations,
            overall_score=overall_score,
            overall_comment=overall_comment,
            status="draft"
        )
```

#### 5. 编写单元测试

```python
# tests/test_agents/test_evaluation_agent.py

import pytest
from unittest.mock import Mock, AsyncMock
from src.agents.evaluation_agent import EvaluationAgent
from src.services.framework_service import FrameworkService

class TestEvaluationAgent:
    """测试 EvaluationAgent

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 5.1 单元测试
    """

    @pytest.fixture
    def mock_framework_service(self):
        """创建 mock Framework 服务"""
        service = Mock(spec=FrameworkService)
        service.get_framework.return_value = Framework(
            id="fw_001",
            name="教学质量评估",
            version="1.0",
            indicators=[
                Indicator(
                    id="ind_001",
                    name="师资队伍",
                    weight=1.0,
                    scoring_rule={"min": 0, "max": 100}
                )
            ]
        )
        return service

    @pytest.fixture
    def mock_llm_client(self):
        """创建 mock LLM 客户端"""
        client = Mock()
        client.generate = AsyncMock(return_value={
            "matches": [
                {
                    "source": "师资名单.xlsx",
                    "content": "教授10人，副教授20人",
                    "relevance_score": 0.9
                }
            ]
        })
        return client

    @pytest.fixture
    def agent(self, mock_framework_service, mock_llm_client):
        """创建测试 Agent"""
        return EvaluationAgent(
            framework_service=mock_framework_service,
            llm_client=mock_llm_client
        )

    @pytest.mark.asyncio
    async def test_evaluate_major(self, agent):
        """测试用例 TC-001: 评估专业"""
        result = await agent.evaluate_major(
            framework_id="fw_001",
            self_report="专业自评报告内容...",
            materials=["师资名单.xlsx", "教学条件.pdf"]
        )

        assert result is not None
        assert result.framework_id == "fw_001"
        assert len(result.indicator_evaluations) == 1
        assert result.overall_score >= 0
        assert result.overall_score <= 100

    @pytest.mark.asyncio
    async def test_evaluate_with_invalid_framework(self, agent, mock_framework_service):
        """测试用例 TC-002: 使用无效的 Framework"""
        mock_framework_service.get_framework.return_value = None

        with pytest.raises(InvalidFrameworkError):
            await agent.evaluate_major(
                framework_id="invalid",
                self_report="报告",
                materials=[]
            )
```

#### 6. 运行测试

```bash
# 运行 Agent 层测试
pytest tests/test_agents/ -v

# 检查覆盖率
pytest tests/test_agents/ --cov=src/agents --cov-report=html
```

---

## 工作流程 3：实现 API 层

### 适用场景

- Spec 类型：API 规范
- 开发阶段：API Layer
- 目录位置：`src/api/`
- 前置条件：Framework 服务层和 Agent 层已实现

### 详细步骤

#### 1. 验证依赖

```python
# 检查依赖是否已实现
required_modules = [
    "src.services.framework_service",
    "src.agents.evaluation_agent"
]

for module in required_modules:
    try:
        __import__(module)
    except ImportError:
        print(f"❌ 错误：依赖模块不存在 - {module}")
        exit(1)

print("✓ 依赖检查通过")
```

#### 2. 创建目录结构

```bash
src/api/
├── __init__.py
├── main.py                    # FastAPI 应用
├── routers/
│   ├── __init__.py
│   ├── frameworks.py          # Framework 路由
│   ├── evaluations.py         # 评估路由
│   └── tasks.py               # 任务路由
└── schemas/
    ├── __init__.py
    ├── framework.py           # Framework 请求/响应模型
    └── evaluation.py          # 评估请求/响应模型
```

#### 3. 实现 API 路由

```python
# src/api/routers/evaluations.py

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from ..schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse
)
from src.agents.evaluation_agent import EvaluationAgent
from src.services.framework_service import FrameworkService

router = APIRouter(prefix="/api/v1/evaluations", tags=["evaluations"])

def get_evaluation_agent() -> EvaluationAgent:
    """获取 EvaluationAgent 实例"""
    framework_service = FrameworkService()
    llm_client = get_llm_client()
    return EvaluationAgent(framework_service, llm_client)

@router.post("", response_model=EvaluationResponse, status_code=201)
async def create_evaluation(
    request: EvaluationRequest,
    agent: EvaluationAgent = Depends(get_evaluation_agent)
):
    """创建评估

    根据 Spec: spec/20251231-evaluation-task-api.md
    章节: 2.1 - 创建评估任务
    """
    try:
        result = await agent.evaluate_major(
            framework_id=request.framework_id,
            self_report=request.self_report,
            materials=request.materials
        )

        return EvaluationResponse(
            code=201,
            message="Evaluation created successfully",
            data=result
        )

    except InvalidFrameworkError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### 4. 编写 API 测试

```python
# tests/test_api/test_evaluations.py

import pytest
from fastapi.testclient import TestClient
from src.api.main import app

class TestEvaluationsAPI:
    """测试评估 API

    根据 Spec: spec/20251231-evaluation-task-api.md
    章节: 5.1 - API 测试
    """

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)

    def test_create_evaluation(self, client):
        """测试用例 TC-001: 创建评估"""
        response = client.post(
            "/api/v1/evaluations",
            json={
                "framework_id": "fw_001",
                "self_report": "专业自评报告...",
                "materials": ["师资名单.xlsx"]
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["code"] == 201
        assert "data" in data

    def test_create_evaluation_invalid_framework(self, client):
        """测试用例 TC-002: 使用无效的 Framework"""
        response = client.post(
            "/api/v1/evaluations",
            json={
                "framework_id": "invalid",
                "self_report": "报告",
                "materials": []
            }
        )

        assert response.status_code == 400
```

---

## 通用最佳实践

### 1. 代码注释

每个类和方法都应该包含：
- 功能描述
- Spec 文档引用
- 参数说明
- 返回值说明
- 异常说明

### 2. 错误处理

```python
try:
    # 执行操作
    result = operation()
except SpecificError as e:
    # 处理特定错误
    logger.error(f"操作失败: {e}")
    raise
except Exception as e:
    # 处理未知错误
    logger.error(f"未知错误: {e}")
    raise
```

### 3. 日志记录

```python
import logging

logger = logging.getLogger(__name__)

def some_function():
    logger.info("开始执行操作")
    try:
        # 操作
        logger.debug("操作详情...")
        logger.info("操作成功")
    except Exception as e:
        logger.error(f"操作失败: {e}")
        raise
```

### 4. 类型注解

```python
from typing import List, Optional, Dict

def process_data(
    items: List[str],
    config: Optional[Dict[str, any]] = None
) -> Dict[str, List[str]]:
    """处理数据"""
    pass
```

---

## 检查清单

### Framework 服务层

- [ ] 数据模型已实现
- [ ] 服务类已实现
- [ ] 单元测试已编写
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过

### Agent 层

- [ ] Agent 组件已实现
- [ ] 主 Agent 已实现
- [ ] 可追溯性已保证
- [ ] 单元测试已编写
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过

### API 层

- [ ] API 路由已实现
- [ ] 请求/响应模型已定义
- [ ] API 测试已编写
- [ ] 所有测试通过
- [ ] API 文档已生成
