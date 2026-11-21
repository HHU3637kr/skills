# 项目本体 Schema 规范（v1.0）

`spec/context/ontology/ontology.json` 是项目内视角的唯一结构化真源（Single Source of Truth），面向人阅读的 `spec/context/ontology/index.html` 与面向 Agent 根因分析的子图查询均从该文件派生。

---

## 1. 顶层结构

```json
{
  "schema_version": "1.0",
  "project": {
    "name": "项目名称",
    "summary": "一句话定位：输入什么、处理什么、产出什么",
    "key_facts": ["关键架构事实 1", "关键架构事实 2"]
  },
  "version": {
    "last_verified_commit": "6dfc23d",
    "commit_summary": "最近一次已同步本体的业务提交摘要",
    "synced_prs": ["!14"],
    "updated_at": "2026-11-21 09:30"
  },
  "flow": [
    {
      "nodes": [
        { "id": "flow-ingest", "label": "入口适配", "desc": "接收原始请求与鉴权", "style": "default" }
      ],
      "arrow_after": "结构化上下文进入核心管线"
    }
  ],
  "modules": [ ],
  "invariants": [ ],
  "relations": [ ],
  "experience_refs": [ ]
}
```

### 字段说明

| 字段 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `schema_version` | 是 | `"1.0"` | 固定版本标识 |
| `project.name` | 是 | string | 项目名称 |
| `project.summary` | 是 | string | 一句话定位 |
| `project.key_facts` | 是 | string[] | 关键事实列表（可为空数组） |
| `version.last_verified_commit` | 是 | string | 最近对齐的 Git commit SHA（7~40 位 hex）；初始化草稿可先填当前 HEAD |
| `version.commit_summary` | 是 | string | 该 commit 的摘要 |
| `version.synced_prs` | 否 | string[] | 已同步口径变更的 PR/MR 编号列表 |
| `version.updated_at` | 是 | string | 最近更新时间（`YYYY-MM-DD HH:MM` 或 ISO8601） |
| `flow` | 是 | array | 全景数据流层定义；每组含 `nodes`（`style` 取 `"default" \| "hl" \| "dim"`）与可选 `arrow_after` |
| `experience_refs` | 否 | array | 可选第三层历史经验挂接索引（缺省按 `[]`） |

---

## 2. 模块、单元与契约字段（`modules[]`）

本体节点分三级：**Module（模块） → Unit（处理单元/中间产物） → Field（契约字段/指标）**。

```json
{
  "id": "mod-pipeline",
  "name": "核心分析管线",
  "dirs": ["src/pipeline/"],
  "entry_anchors": ["src/pipeline/runner.ts#runPipeline"],
  "kind": "internal",
  "summary": "接收标准化事件，依次完成抽取、聚合与评分",
  "todos": [],
  "units": [
    {
      "id": "unit-scorer",
      "name": "综合评分单元",
      "producer_type": "mix",
      "summary": "合并规则分与 LLM 语义分，输出总分与分项明细",
      "code_anchors": ["src/pipeline/scorer.ts#computeScore"],
      "detail_mode": "metrics",
      "hint": "当 LLM 超时时降级为仅规则分权重 1.0",
      "fields": [
        {
          "id": "field-score-total",
          "name": "score_total",
          "product_name": "综合教学质量分",
          "product_source": "报告总览页顶部评分卡",
          "producer_type": "mix",
          "formula_and_deps": "0.6 * rule_score + 0.4 * llm_score；缺 llm_score 时回退 rule_score",
          "code_anchors": ["src/pipeline/scorer.ts#calcTotal"],
          "invariants": ["INV-001"],
          "known_diff": "PRD 原写权重 0.5/0.5，当前实现按 MR !12 为 0.6/0.4"
        }
      ]
    }
  ]
}
```

### 约束规则

1. **全局 ID 唯一**：所有 `module.id`、`unit.id`、`field.id`、`invariant.id`、`experience_refs[].exp_id` 必须在同一份 `ontology.json` 内全局唯一，禁止重复。
2. **`module.id` 与 `module.kind` 规范**：
   - `module.id` 必须匹配 `/^[a-z0-9][a-z0-9_-]*$/`（直接映射为 HTML `data-tab` 与 `#tab-<id>`，不可使用 `overview` 或 `ontology` 两个保留 Tab 名）。
   - `module.kind` 为可选字段，取值 `"internal" | "external"`（省略默认 `"internal"`）。`external` 用于外部上游服务、第三方 API、外部 MQ 或下游消费者边界，允许 `dirs: []` 并跳过本地目录 Git 漂移检查；与内部模块之间建议用 `maps_to` 边对齐语义。
3. **枚举值**：
   - `producer_type`：`code` | `llm` | `mix`
   - `detail_mode`：`metrics`（渲染 4 列：字段 / 需求对应名 / 产出 / 依赖与口径） | `artifact`（渲染 3 列：字段 / 产出 / 说明）
4. **`fields[]` 可选语义微结构**（仅在高频易错、跨边界易歧义或排查曾踩坑的字段按需填写）：
   - `null_and_default_semantics`（string）：未传、`null`、空集合或默认兜底值在跨模块/跨边界时的准确语义。
   - `state_scope`（string）：状态归属实体层（如请求/会话/租户）、推进者与业务真正完成的证据，明确区分「接口受理」与「最终生效」。
   - `confused_with`（`Array<{ term: string; diff: string }>`）：极易与当前字段混淆的概念名称及核心区分点。
5. **代码锚点规范**：优先写文件路径或 `path/to/file.ts#symbolName`，**不要写易飘移的纯行号**（如 `:88`）。
6. **未完成标记**：`todos` 非空代表该模块尚待深挖；严格检查（`--strict`）要求 `todos` 全部清空，HTML 中不得残留 `.todo` 占位块。

---

## 3. 核心不变量（`invariants[]`）

承接 `spec-write`（`writer/plan.html` 3.1 节）与 `spec-review`（`statechart-review.md`）沉淀的长期硬规则：

```json
{
  "id": "INV-001",
  "statement": "score_total 必须落在 [0, 100] 且在任务终态前不得为 null",
  "owner_node": "field-score-total",
  "enforcement_layer": "root",
  "violation_symptom": "报告详情页评分卡渲染 NaN 或触发前端空值崩溃",
  "verification": "tests/scorer.test.ts 边界与降级单测",
  "applicable_when": "分析任务进入 completed 终态或写入导出快照时",
  "status": "verified"
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 全局唯一编号，推荐 `INV-001` 格式 |
| `statement` | 是 | 不可违背的业务/契约规则（人可读） |
| `owner_node` | 是 | 负责守卫该不变量的节点 ID（module / unit / field） |
| `enforcement_layer` | 是 | `root`（根因层一次保证）或 `boundary`（边界层 Fail-Fast 报错） |
| `violation_symptom` | 是 | 违背时在下游或用户端出现的典型现象 |
| `verification` | 否 | 既有单测、断言脚本或探针入口 |
| `applicable_when` | 否 | 生效前置条件、状态作用域或版本范围；省略表示全局生效 |
| `status` | 否 | 置信状态：`verified`（默认，已实证）/ `inferred`（推断待核实）/ `retracted`（已撤回/证伪） |
| `retracted_reason` | 条件 | 当 `status === "retracted"` 时必填，说明撤回原因及替代口径 |

---

## 4. 因果与依赖关系边（`relations[]`，共 8 类）

每条边结构：`{ "from": "<node_id>", "to": "<node_id>", "type": "<edge_type>", "note": "<条件/触发/风险说明>" }`（支持可选 `status?: "verified" | "inferred" | "retracted"` 与条件必填 `retracted_reason`）。不允许自环（`from === to`）或完全重复边（同 `from + to + type`）。

| `type` | 方向含义（`from → to`） | `upstream`（根因溯源）怎么走 | `downstream`（爆炸半径）怎么走 | 诊断语义 |
|---|---|---|---|---|
| `produces` | A 产出 B | 逆向找谁产出了 B（`to === target` → 追 `from`） | 正向找 A 产出了什么（`from === target` → 扩 `to`） | 正常数据生产血缘 |
| `consumes` | A 消费 B | 正向找 A 依赖哪个上游原料 B（`from === target` → 追 `to`） | 逆向找谁消费了 B（`to === target` → 扩 `from`） | 改 B 必查所有 `consumes` B 的消费方 |
| `depends_on` | A 强依赖 B | 正向找 A 的前置依赖 B（`from === target` → 追 `to`） | 逆向找依赖 B 的下游模块（`to === target` → 扩 `from`） | 配置/服务/上下文前置依赖 |
| `backfills_from` | A 在缺失/为空时从 B 回填 | 正向找跨模块回填来源 B（`from === target` → 追 `to`） | 逆向找依赖 B 做回填的下游（`to === target` → 扩 `from`） | **高危排查点**：下游值异常常源于上游回填源变了 |
| `fallback_to` | A 异常/超时时降级到 B | 正向找降级替代路径 B（`from === target` → 追 `to`） | 逆向找以 B 为兜底的调用方（`to === target` → 扩 `from`） | **防吞错审计点**：检查是否悄悄吞掉了主路径异常 |
| `shared_state` | A 与 B 共享可变状态（无向耦合） | **双向**（A/B 任一变更都互相污染） | **双向**（A/B 任一改动都波及对方） | **Phase 4.5 预警信号**：隐式可变状态/全局副作用 |
| `propagates_to` | A 的异常/脏数据传播至 B | 逆向找故障来源 A（`to === target` → 追 `from`） | 正向找受波及节点 B（`from === target` → 扩 `to`） | 显式故障传播链路 |
| `maps_to` | 跨模块/跨外部系统边界的字段改名、单位换算与语义映射（A 映射为 B） | 逆向找上游映射来源 A（`to === target` → 追 `from`） | 正向找下游映射目标 B（`from === target` → 扩 `to`） | 跨系统与外部边界字段对齐 |

---

## 5. 关联历史经验（`experience_refs[]`，可选第三层）

用于将 `spec/context/experience/*.md` 中与本体节点强相关的踩坑与修复经验挂接到图谱作为第三层指针索引（缺省按 `[]` 处理）。**只挂指针、摘要与条件边界，禁止把长篇排障正文复制进 `ontology.json`**。

```json
{
  "exp_id": "EXP-001",
  "path": "spec/context/experience/exp-001-asr-empty-slice.md",
  "nodes": ["field-transcript-segments", "field-score-total"],
  "symptom_node": "field-score-total",
  "root_cause_node": "field-transcript-segments",
  "patch_node": "unit-scorer",
  "risk_summary": "静音长音频返回空 segments 时若按 length 作分母会触发 NaN 沿评分链路透传",
  "applicable_when": "音频无有效语音片段或 VAD 过滤后 segments.length === 0",
  "not_applicable_when": "上游直接返回 HTTP 5xx/ASR 超时失败（走 fallback_to 规则分兜底）",
  "status": "verified"
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `exp_id` | 是 | 全局唯一经验引用编号（推荐 `EXP-001` 格式） |
| `path` | 是 | 对应的 `spec/context/experience/*.md` 仓库相对路径 |
| `nodes` | 是 | 关联节点 ID 非空数组（module / unit / field） |
| `risk_summary` | 是 | 一句话风险摘要或关键故障机理 |
| `symptom_node` | 否 | 故障表象最先暴露的节点 ID |
| `root_cause_node` | 否 | 根因所属节点 ID |
| `patch_node` | 否 | 实施修复或兜底收敛的节点 ID |
| `applicable_when` | 否 | 该经验适用的条件前提 |
| `not_applicable_when` | 否 | 该经验**不适用**的排除边界（防误套旧方案） |
| `status` | 否 | `verified`（默认）/ `inferred` / `retracted` |
| `retracted_reason` | 条件 | 当 `status === "retracted"` 时必填 |

---

## 6. 粒度红线（什么该进本体，什么坚决不进）

> **轻量渐进原则**：`module.kind`、字段语义微结构（`null_and_default_semantics` / `state_scope` / `confused_with`）、不变量与边的 `applicable_when` / `status` 以及 `experience_refs[]` 均为**严格可选增强**，仅在高频易错、跨边界易歧义或历史已踩坑的高杠杆节点按需填写，不增加普通节点的建图与维护负担。

- **✅ 必须进本体**：
  - 模块划分、目录边界与入口锚点
  - 跨模块流转的契约字段、用户展示指标名及出处
  - 业务计算口径、阈值常量、跨模块回填（`backfills_from`）与降级路径（`fallback_to`）
  - 核心不变量（`INV-xxx`）与已知的隐式共享状态（`shared_state`）
  - 文档与实现的已知差异（`known_diff`，如实标注不擅改）
- **❌ 坚决不进本体**：
  - 模块内部的私有工具函数、局部变量、循环实现细节
  - 易失效的精确源码行号
  - 纯文案调整、CSS 样式细节、未跨越模块边界的内部重构
