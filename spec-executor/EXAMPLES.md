# Spec Executor 实现示例

本文档提供了根据 Spec 执行开发任务的完整示例。

---

## 示例 1：根据 Framework 服务层 Spec 实现

### Spec 文档

**文件**: `spec/20251231-framework-service-design.md`

**关键内容**：

```markdown
## 3.2 数据模型

### Framework 模型

```python
class Framework(BaseModel):
    id: str
    name: str
    version: str
    indicators: List[Indicator]
```

## 3.3 接口设计

### create_framework

```python
def create_framework(framework: Framework) -> Framework:
    """创建 Framework"""
    pass
```
```

### 执行过程

#### 步骤 1：读取 Spec

```
用户：根据 spec/20251231-framework-service-design.md 实现 Framework 服务

Claude：我将使用 spec-executor 执行这个任务。

[读取 Spec]
✓ Spec 文档存在
✓ Spec 包含完整的设计方案
✓ 当前阶段：Framework 服务层
✓ 无前置依赖
```

#### 步骤 2：创建任务清单

```
任务清单：
- [ ] 创建目录结构
- [ ] 实现 Indicator 模型
- [ ] 实现 Framework 模型
- [ ] 实现 FrameworkService 类
- [ ] 编写单元测试
- [ ] 运行测试验证
```

#### 步骤 3：实现数据模型

```python
# src/services/models/framework.py

from pydantic import BaseModel, Field, validator
from typing import List
from datetime import datetime

class Indicator(BaseModel):
    """评估指标

    根据 Spec: spec/20251231-framework-service-design.md
    章节: 3.2 数据模型 - Indicator
    """

    id: str = Field(description="指标ID")
    name: str = Field(description="指标名称")
    weight: float = Field(description="权重", ge=0, le=1)
    scoring_rule: dict = Field(description="评分规则")

    @validator('weight')
    def validate_weight(cls, v):
        if v < 0 or v > 1:
            raise ValueError('权重必须在 0-1 之间')
        return v

class Framework(BaseModel):
    """评估指标体系

    根据 Spec: spec/20251231-framework-service-design.md
    章节: 3.2 数据模型 - Framework
    """

    id: str = Field(description="Framework ID")
    name: str = Field(description="Framework 名称")
    version: str = Field(description="版本号")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    indicators: List[Indicator] = Field(description="评估指标列表")

    @validator('indicators')
    def validate_weights_sum(cls, v):
        if v:
            total = sum(ind.weight for ind in v)
            if abs(total - 1.0) > 0.01:
                raise ValueError(f'权重总和必须为 1.0，当前为 {total}')
        return v
```

#### 步骤 4：实现服务类

```python
# src/services/framework_service.py

import json
import os
from typing import List, Optional
from pathlib import Path
from .models.framework import Framework

class FrameworkService:
    """Framework 服务

    根据 Spec: spec/20251231-framework-service-design.md
    章节: 3.3 接口设计
    """

    def __init__(self, storage_path: str = "data/frameworks"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def create_framework(self, framework: Framework) -> Framework:
        """创建 Framework

        根据 Spec: 章节 3.3.1 - create_framework
        """
        # 验证
        framework.dict()  # 触发 Pydantic 验证

        # 保存
        file_path = self.storage_path / f"{framework.id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(framework.dict(), f, ensure_ascii=False, indent=2)

        return framework

    def get_framework(self, framework_id: str) -> Optional[Framework]:
        """获取 Framework

        根据 Spec: 章节 3.3.2 - get_framework
        """
        file_path = self.storage_path / f"{framework_id}.json"

        if not file_path.exists():
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return Framework(**data)

    def list_frameworks(self) -> List[Framework]:
        """列出所有 Frameworks

        根据 Spec: 章节 3.3.3 - list_frameworks
        """
        frameworks = []

        for file_path in self.storage_path.glob("*.json"):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            frameworks.append(Framework(**data))

        return frameworks
```

#### 步骤 5：编写测试

```python
# tests/test_services/test_framework_service.py

import pytest
from datetime import datetime
from src.services.framework_service import FrameworkService
from src.services.models.framework import Framework, Indicator

class TestFrameworkService:
    """测试 FrameworkService

    根据 Spec: spec/20251231-framework-service-design.md
    章节: 5.1 单元测试
    """

    @pytest.fixture
    def service(self, tmp_path):
        return FrameworkService(storage_path=str(tmp_path))

    @pytest.fixture
    def sample_framework(self):
        return Framework(
            id="fw_001",
            name="教学质量评估",
            version="1.0",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            indicators=[
                Indicator(
                    id="ind_001",
                    name="师资队伍",
                    weight=0.3,
                    scoring_rule={"min": 0, "max": 100}
                ),
                Indicator(
                    id="ind_002",
                    name="教学条件",
                    weight=0.7,
                    scoring_rule={"min": 0, "max": 100}
                )
            ]
        )

    def test_create_framework(self, service, sample_framework):
        """TC-001: 创建 Framework"""
        result = service.create_framework(sample_framework)
        assert result.id == "fw_001"
        assert result.name == "教学质量评估"

    def test_get_framework(self, service, sample_framework):
        """TC-002: 获取 Framework"""
        service.create_framework(sample_framework)
        result = service.get_framework("fw_001")
        assert result is not None
        assert result.id == "fw_001"

    def test_get_nonexistent_framework(self, service):
        """TC-003: 获取不存在的 Framework"""
        result = service.get_framework("nonexistent")
        assert result is None

    def test_list_frameworks(self, service, sample_framework):
        """TC-004: 列出所有 Frameworks"""
        service.create_framework(sample_framework)
        result = service.list_frameworks()
        assert len(result) == 1
        assert result[0].id == "fw_001"

    def test_invalid_weight_sum(self, service):
        """TC-005: 权重总和不为 1.0"""
        with pytest.raises(ValueError, match="权重总和必须为 1.0"):
            Framework(
                id="fw_002",
                name="测试",
                version="1.0",
                indicators=[
                    Indicator(
                        id="ind_001",
                        name="指标1",
                        weight=0.5,
                        scoring_rule={}
                    ),
                    Indicator(
                        id="ind_002",
                        name="指标2",
                        weight=0.3,  # 总和 0.8，不等于 1.0
                        scoring_rule={}
                    )
                ]
            )
```

#### 步骤 6：运行测试

```bash
$ pytest tests/test_services/test_framework_service.py -v

tests/test_services/test_framework_service.py::TestFrameworkService::test_create_framework PASSED
tests/test_services/test_framework_service.py::TestFrameworkService::test_get_framework PASSED
tests/test_services/test_framework_service.py::TestFrameworkService::test_get_nonexistent_framework PASSED
tests/test_services/test_framework_service.py::TestFrameworkService::test_list_frameworks PASSED
tests/test_services/test_framework_service.py::TestFrameworkService::test_invalid_weight_sum PASSED

====== 5 passed in 0.23s ======

$ pytest tests/test_services/ --cov=src/services --cov-report=term

---------- coverage: platform win32, python 3.11.14 -----------
Name                                    Stmts   Miss  Cover
-----------------------------------------------------------
src/services/__init__.py                    0      0   100%
src/services/framework_service.py          28      2    93%
src/services/models/__init__.py             0      0   100%
src/services/models/framework.py           24      1    96%
-----------------------------------------------------------
TOTAL                                      52      3    94%
```

#### 步骤 7：完成报告

```
✓ Framework 服务层实现完成

实现内容：
- [x] Indicator 数据模型
- [x] Framework 数据模型
- [x] FrameworkService 服务类
- [x] 单元测试（5个测试用例）

测试结果：
- 所有测试通过 ✓
- 测试覆盖率: 94%

文件清单：
- src/services/models/framework.py
- src/services/framework_service.py
- tests/test_services/test_framework_service.py

严格遵循 Spec：
✓ 数据模型与 Spec 一致
✓ 接口签名与 Spec 一致
✓ 验证规则与 Spec 一致
✓ 无额外功能添加
```

---

## 示例 2：根据 Agent 层 Spec 实现

### Spec 文档

**文件**: `spec/20251231-专业评价Agent设计.md`

**关键内容**：

```markdown
## 3.2 数据模型

### EvaluationResult

```python
class EvaluationResult(BaseModel):
    id: str
    indicator_evaluations: List[IndicatorEvaluation]
    overall_score: float
    overall_comment: str
```

## 3.3 接口设计

### evaluate_major

```python
async def evaluate_major(
    framework: Framework,
    materials: List[Material]
) -> EvaluationResult:
    """评估专业"""
    pass
```
```

### 执行过程

#### 步骤 1：验证依赖

```
用户：根据 spec/20251231-专业评价Agent设计.md 实现评价 Agent

Claude：我将使用 spec-executor 执行这个任务。

[检查依赖]
✓ Framework 服务层已实现
✓ 所有依赖满足
✓ 当前阶段：Agent 层
```

#### 步骤 2：实现 Agent 组件

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
        if not framework.indicators:
            raise InvalidFrameworkError("Framework 没有指标")

        # 验证权重总和
        total_weight = sum(ind.weight for ind in framework.indicators)
        if abs(total_weight - 1.0) > 0.01:
            raise InvalidFrameworkError(
                f"指标权重总和必须为 1.0，当前为 {total_weight}"
            )

        return framework.indicators


# src/agents/components/scoring_engine.py

from typing import List
from pydantic import BaseModel

class MaterialMatch(BaseModel):
    """材料匹配结果"""
    indicator_id: str
    material_source: str
    content: str
    relevance_score: float

class ScoringEngine:
    """评分引擎

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 3.2 数据模型 - ScoringEngine
    """

    def __init__(self, llm_client):
        self.llm_client = llm_client

    async def score_indicator(
        self,
        indicator: Indicator,
        material_matches: List[MaterialMatch]
    ) -> float:
        """为指标评分

        根据 Spec: 章节 3.3.3 - score_indicator

        Args:
            indicator: 评估指标
            material_matches: 匹配的材料列表

        Returns:
            float: 分数（0-100）
        """
        if not material_matches:
            # 缺失材料，给予最低分
            return 0.0

        # 构建评分提示词
        prompt = f"""
        评估指标：{indicator.name}
        权重：{indicator.weight}
        评分规则：{indicator.scoring_rule}

        相关材料：
        {self._format_materials(material_matches)}

        请根据评分规则和材料内容，给出该指标的分数（0-100）。

        输出格式：
        {{
            "score": 85.5,
            "reasoning": "评分理由..."
        }}
        """

        response = await self.llm_client.generate(prompt)

        score = response['score']

        # 验证分数范围
        if score < 0 or score > 100:
            raise ValueError(f"分数必须在 0-100 之间，当前为 {score}")

        return score

    def _format_materials(self, matches: List[MaterialMatch]) -> str:
        """格式化材料内容"""
        formatted = []
        for match in matches:
            formatted.append(
                f"来源：{match.material_source}\n"
                f"内容：{match.content}\n"
                f"相关性：{match.relevance_score}\n"
            )
        return "\n".join(formatted)
```

#### 步骤 3：实现主 Agent

```python
# src/agents/evaluation_agent.py

from typing import List
from datetime import datetime
from pydantic import BaseModel, Field
from src.services.framework_service import FrameworkService
from .components.indicator_parser import IndicatorParser
from .components.material_analyzer import MaterialAnalyzer
from .components.scoring_engine import ScoringEngine
from .components.opinion_generator import OpinionGenerator

class IndicatorEvaluation(BaseModel):
    """单个指标的评估结果

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 3.2 数据模型 - IndicatorEvaluation
    """

    # 系统预设字段
    indicator_id: str = Field(description="指标ID，系统生成")
    indicator_name: str = Field(description="指标名称，系统生成")
    weight: float = Field(description="权重，系统生成")

    # Agent 填写字段
    score: float = Field(description="分数，Agent填写")
    evaluation_basis: str = Field(description="评价依据，Agent填写")
    improvement_suggestions: List[str] = Field(description="改进建议，Agent填写")

    # 可追溯性字段
    material_references: List[dict] = Field(description="材料引用，Agent填写")

class EvaluationResult(BaseModel):
    """完整的评估结果

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 3.2 数据模型 - EvaluationResult
    """

    # 系统预设字段
    id: str = Field(description="评估结果ID，系统生成")
    framework_id: str = Field(description="Framework ID，系统生成")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # Agent 填写字段
    indicator_evaluations: List[IndicatorEvaluation] = Field(description="各指标评估结果")
    overall_score: float = Field(description="总分，Agent计算")
    overall_comment: str = Field(description="总体评价，Agent填写")

    # 状态字段
    status: str = Field(default="draft", description="状态：draft/submitted/approved")

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

        # 步骤 4：评分和生成意见
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

            # 创建指标评估结果（包含可追溯性信息）
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

        # 步骤 5：计算总分（加权平均）
        overall_score = sum(
            e.score * e.weight
            for e in indicator_evaluations
        )

        # 步骤 6：生成总体评价
        overall_comment = await self.opinion_generator.generate_overall_comment(
            indicator_evaluations
        )

        # 步骤 7：创建评估结果
        return EvaluationResult(
            id=self._generate_id(),
            framework_id=framework_id,
            indicator_evaluations=indicator_evaluations,
            overall_score=overall_score,
            overall_comment=overall_comment,
            status="draft"
        )

    def _generate_id(self) -> str:
        """生成唯一ID"""
        import uuid
        return f"eval_{uuid.uuid4().hex[:8]}"
```

#### 步骤 4：编写测试

```python
# tests/test_agents/test_evaluation_agent.py

import pytest
from unittest.mock import Mock, AsyncMock
from src.agents.evaluation_agent import EvaluationAgent
from src.services.framework_service import FrameworkService
from src.services.models.framework import Framework, Indicator

class TestEvaluationAgent:
    """测试 EvaluationAgent

    根据 Spec: spec/20251231-专业评价Agent设计.md
    章节: 5.1 单元测试
    """

    @pytest.fixture
    def mock_framework_service(self):
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
        client = Mock()
        client.generate = AsyncMock(return_value={
            "score": 85.5,
            "reasoning": "师资力量较强"
        })
        return client

    @pytest.fixture
    def agent(self, mock_framework_service, mock_llm_client):
        return EvaluationAgent(
            framework_service=mock_framework_service,
            llm_client=mock_llm_client
        )

    @pytest.mark.asyncio
    async def test_evaluate_major(self, agent):
        """TC-001: 评估专业"""
        result = await agent.evaluate_major(
            framework_id="fw_001",
            self_report="专业自评报告内容...",
            materials=["师资名单.xlsx"]
        )

        # 验证结果
        assert result is not None
        assert result.framework_id == "fw_001"
        assert len(result.indicator_evaluations) == 1
        assert 0 <= result.overall_score <= 100
        assert result.status == "draft"

        # 验证可追溯性
        eval_result = result.indicator_evaluations[0]
        assert eval_result.evaluation_basis != ""
        assert len(eval_result.material_references) > 0

    @pytest.mark.asyncio
    async def test_evaluate_with_invalid_framework(
        self,
        agent,
        mock_framework_service
    ):
        """TC-002: 使用无效的 Framework"""
        mock_framework_service.get_framework.return_value = None

        with pytest.raises(InvalidFrameworkError):
            await agent.evaluate_major(
                framework_id="invalid",
                self_report="报告",
                materials=[]
            )
```

#### 步骤 5：运行测试

```bash
$ pytest tests/test_agents/test_evaluation_agent.py -v

tests/test_agents/test_evaluation_agent.py::TestEvaluationAgent::test_evaluate_major PASSED
tests/test_agents/test_evaluation_agent.py::TestEvaluationAgent::test_evaluate_with_invalid_framework PASSED

====== 2 passed in 0.45s ======
```

#### 步骤 6：完成报告

```
✓ Agent 层实现完成

实现内容：
- [x] IndicatorParser 组件
- [x] MaterialAnalyzer 组件
- [x] ScoringEngine 组件
- [x] OpinionGenerator 组件
- [x] EvaluationAgent 主 Agent
- [x] 单元测试

测试结果：
- 所有测试通过 ✓
- 测试覆盖率: 87%

可追溯性保证：
✓ 每个评分都有评价依据
✓ 每个评价依据都引用具体材料
✓ 材料引用包含来源、内容、相关性分数
✓ 避免黑盒式评价

严格遵循 Spec：
✓ 数据模型与 Spec 一致
✓ 接口签名与 Spec 一致
✓ 工作流程与 Spec 一致
✓ 无额外功能添加
```

---

## 示例 3：错误处理示例

### 场景 1：Spec 不存在

```
用户：根据 spec/20251231-nonexistent.md 实现功能

Claude：
❌ 错误：Spec 文档不存在

文件路径：spec/20251231-nonexistent.md

请先使用 spec-writer 创建 Spec 文档，然后再执行实现。
```

### 场景 2：Spec 不完整

```
用户：根据 spec/20251231-incomplete.md 实现功能

Claude：
[读取 Spec]

❌ 错误：Spec 不完整

缺少以下必要章节：
- 3. 设计方案
- 4. 实现步骤

请完善 Spec 后再执行实现。
```

### 场景 3：依赖未满足

```
用户：根据 spec/20251231-agent-design.md 实现 Agent

Claude：
[检查依赖]

❌ 错误：依赖未满足

当前阶段：Agent 层
依赖阶段：Framework 服务层

Framework 服务层尚未实现，请先实现以下内容：
- src/services/framework_service.py
- src/services/models/framework.py

建议：
1. 先创建 Framework 服务层的 Spec
2. 实现 Framework 服务层
3. 再实现 Agent 层
```

### 场景 4：测试失败

```
用户：根据 spec/20251231-service-design.md 实现服务

Claude：
[实现完成，运行测试]

$ pytest tests/test_services/ -v

tests/test_services/test_framework_service.py::test_create_framework FAILED
tests/test_services/test_framework_service.py::test_get_framework PASSED

====== 1 failed, 1 passed in 0.23s ======

❌ 错误：测试失败

失败的测试：
- test_create_framework: AssertionError: 权重总和不为 1.0

请修复测试失败后再继续。

建议：
1. 检查 Framework 模型的权重验证逻辑
2. 确保测试数据的权重总和为 1.0
3. 重新运行测试
```

---

## 总结

### 成功实现的关键

1. **严格遵循 Spec**
   - 不添加额外功能
   - 不修改设计方案
   - 不偏离数据结构

2. **保证可追溯性**
   - 代码注释引用 Spec
   - 数据模型标注填写方
   - 评分过程记录依据

3. **完整的测试**
   - 单元测试覆盖率 > 80%
   - 测试用例来自 Spec
   - 所有测试必须通过

4. **遵循开发顺序**
   - Framework 服务层 → Agent 层 → API 层
   - 验证依赖满足
   - 逐层实现和测试

### 常见错误

1. ❌ 添加 Spec 中未定义的功能
2. ❌ 修改 Spec 中的数据结构
3. ❌ 跳过测试直接实现
4. ❌ 不验证依赖就开始实现
5. ❌ 测试失败但继续开发
