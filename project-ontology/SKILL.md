---
name: project-ontology
version: 2.0.0
description: "构建、查询与增量维护项目内视角领域本体（模块边界、跨模块契约字段血缘、业务口径、核心不变量 INV、降级/回填与共享状态边）。以 spec/context/ontology/ontology.json 为唯一真源，自动渲染单文件离线 HTML 总览并提供面向根因分析的局部子图查询与 Git 新鲜度校验。当初次梳理项目全链路本体、代码/Spec 收尾同步本体口径，或诊断/探索需要抽取上下文子图时使用。"
disable-model-invocation: false
metadata:
  requires:
    bins: ["git", "node"]
---

# 项目本体建模与图谱管理（project-ontology）

把项目的「跨模块契约、数据血缘、业务口径、核心不变量、降级与隐式耦合」沉淀为结构化领域本体，既为人提供离线可看的单文件全景视图，也为 `spec-debug`（OB-RCA 根因定位）、`spec-explore`、`spec-write` 提供低 Token、可遍历的因果子图。

## 运行契约

> 本 Skill 以机器可检的唯一真源为核心，兼顾人类审阅与 Agent 推理。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 项目源码、契约/Schema 定义、需求文档、`git log` / `git diff`、上游 Spec 产物中的本体变更线索（`plan.html` / `debug-xxx-fix.html` / `update-xxx*.html`） |
| 权限 | 读写 `spec/context/ontology/ontology.json`（或用户指定路径）并运行脚本生成同目录 `index.html`；不修改业务代码；不越权提交/推送 Git（入库随 `spec-end` 或经用户批准） |
| 验证 | 每次写入后必须运行 `render-ontology.js` 同步 `index.html`，并通过 `check-ontology.js`（交付前或终态收尾需加 `--strict`，无悬空边、无重复 ID、无残留 `todos`、HTML SHA-256 指纹同步） |
| 停止 | 初次建图按轮次停下向用户确认模块口径与深挖方向；增量同步在命中变更的节点/边更新并机检通过后即停止 |
| 升级 | 模块划分口径与现有业务术语冲突、实现与需求文档口径不一致且无法判断权威方时，在图谱中通过 `known_diff` 标注并交由用户拍板 |
| 参考 | Schema 与关系边语义 → 必读 `references/schema.md` |

## 架构与产出物（方案 B：真源与视图分离）

- **唯一真源**：`spec/context/ontology/ontology.json`（结构化 JSON，Git diff 清晰，Agent 查询零噪声）
- **离线人可读视图**：`spec/context/ontology/index.html`（由脚本内联 `assets/ontology.css` + `assets/ontology.js` 自动生成，**严禁手工直接编辑 HTML**）
- **配套工具链**（位于本 Skill `scripts/` 目录，零外部依赖，仅需 Node >= 14）：

| 脚本 | 职责 | 常用命令 |
|---|---|---|
| `render-ontology.js` | 校验并渲染单文件离线 `index.html` | `node .agents/skills/project-ontology/scripts/render-ontology.js spec/context/ontology/ontology.json` |
| `check-ontology.js` | 校验 ID 唯一、引用完整性、边枚举、HTML 指纹与配对 | `node .agents/skills/project-ontology/scripts/check-ontology.js spec/context/ontology/ontology.json [--strict]` |
| `query-ontology.js` | 按现象/字段/ID 抽局部子图、影响反查与 Git 新鲜度校验 | `node .agents/skills/project-ontology/scripts/query-ontology.js spec/context/ontology/ontology.json --target <词> [--mode browse\|resolve] [--max-nodes 30] [--impact-of <id>] --freshness` |

> **启用判定铁律**：项目是否启用本体，一律以 **`spec/context/ontology/ontology.json` 文件是否存在** 为准，不得以目录是否存在判定。完整示范见 `example/ontology.json` 与 `example/index.html`。

---

## 粒度红线（避免维护地狱）

严格控制本体粒度，**只建低频高杠杆的架构与契约骨架**：

- **✅ 必须入本体**：模块划分与目录边界（内部模块 + `kind: "external"` 外部系统边界）、跨模块流转的契约字段（含产品展示名与出处）、计算公式/阈值常量、8 类强语义边（含 `backfills_from`、`fallback_to`、`shared_state`、`maps_to`）、核心不变量（`INV-xxx`）、文档与实现的已知差异（`known_diff`）、稳定代码入口锚点（文件路径或 `file#symbol`，**不写行号**）。
- **✅ 按需选填的高杠杆增强（仅高风险/高频易错节点填写，普通节点可全省略）**：字段语义微结构（`null_and_default_semantics` / `state_scope` / `confused_with`）、不变量条件与置信状态（`applicable_when` / `status: verified|inferred|retracted`）、第三层历史经验挂接索引（`experience_refs[]` 指针，不复制长篇正文）。
- **❌ 坚决不入本体**：模块内部私有函数实现细节、易失效的源码行号、纯文案或样式调整、未跨越模块边界的局部重构。

---

## 场景一：初次建图与分轮深挖（每轮先问，不擅自推进）

```text
① 扫模块 → ② 问用户：先出初版骨架 or 深挖某模块 → ③ 写 ontology.json + 渲染 index.html → ④ 展示等确认 → 回到 ②，直到 todos 清空
```

1. **扫描项目模块**：
   - 读根目录 `AGENTS.md` / `CLAUDE.md` / `README.md` 与目录结构，按**数据流**（入口适配 → 核心管线 → 汇总输出 → 支撑知识库 → 基础设施）归纳模块边界与入口锚点。
   - 产物契约 / Schema 是层间协议权威源；文档与实现不一致时以契约为准，并在字段 `known_diff` 中如实标注差异。
   - **先问用户确认模块划分与命名口径**，严禁自造与业务脱节的模块名。
2. **分轮决策（硬规则）**：
   - 首轮询问用户：「先产出初版骨架（模块导航 + 全景数据流，各模块留 `todos`），还是直接深挖某个模块？」
   - 每轮只落盘用户选定模块的高保真契约、不变量（`INV-xxx`）与关系边（`relations[]`），清掉对应模块 `todos`，展示当前成果与剩余模块后再次询问下一步，不擅自一路填完。
3. **落盘与双检**：
   - 写入 `spec/context/ontology/ontology.json`（`version.last_verified_commit` 填入 `git rev-parse --short HEAD`）。
   - 执行 `render-ontology.js` 生成 `index.html`，再用 `check-ontology.js`（全部填完时加 `--strict`）校验通过。

---

## 场景二：开发过程中与 `spec-end` 的增量维护

本体不在编写实现代码的中途高频修改，而是通过 **“上游留痕、单点写回、Git 防漂移”** 保持鲜活：

1. **何时触发增量更新**：
   - **主入口 `spec-end`**：任何新 Spec 归档或 `spec-update` 小迭代统一收尾时，先检查是否存在 `spec/context/ontology/ontology.json`；
   - **独立线上热修 `spec-debug`**：若修复未走完整 Spec 流程且改变了契约/口径/不变量或暴露了隐式共享状态/降级路径，在用户确认后触发本步同步；
   - **无变更 0 成本跳过**：若本次代码变更未触及跨模块契约、数据血缘、业务口径/阈值、核心不变量、降级或共享状态，直接跳过，不改动本体。
2. **增量同步步骤**：
   1. 汇总 `writer/plan.html` 3.4 节「预期本体变更」、`updater/update-xxx*.html`、`debugger/debug-xxx-fix.html` 第 6 节「本体同步检查」以及 `git diff --name-status <last_verified_commit>..HEAD -- :(exclude)spec/ :(exclude)docs/`。
   2. 若需**更正或撤回**既有口径、`INV` 或关系边，先运行 `query-ontology.js --impact-of <id>` 复核下游受波及节点与测试入口；改用 `status: "retracted"` + `retracted_reason` 保留被推翻假设，避免日后重踩旧坑。
   3. 仅修改受影响模块/单元/字段/不变量/关系边；若 `exp-write` 沉淀了强关联具体节点的重大故障经验，同步向 `experience_refs[]` 挂接 `exp_id`、`path`、`nodes` 与适用/不适用条件。
   4. **EvoOntology 三路归因演进**：当排查或审查发现本体未命中、误判或信息过期时，显式区分三路根因再迭代——**Content 问题**（补写遗漏口径或撤回过时条目） / **Tool 问题**（调优 `query-ontology.js` 分词权重、遍历预算或展示） / **Schema 问题**（仅当现有 1.0 字段与 8 类边无法表达结构性约束时才扩展 `schema.md`）。
   5. 更新 `version.last_verified_commit`（取当前工作树最近一条非纯文档提交或收尾提交前基线 SHA）、`commit_summary`、`synced_prs` 与 `updated_at`。
   6. 运行渲染与严格机检：
      ```bash
      node .agents/skills/project-ontology/scripts/render-ontology.js spec/context/ontology/ontology.json
      node .agents/skills/project-ontology/scripts/check-ontology.js spec/context/ontology/ontology.json --strict
      ```

---

## 场景三：面向下游诊断与探索的子图查询

各工作流角色（`spec-debug` / `spec-explore` / `spec-write` / `spec-update`）不直接把整份 HTML 读入上下文，而是优先调用 `query-ontology.js` 提取紧凑局部子图：

```bash
# 1. 大图先概览（browse 渐进披露）：按报错现象/多关键词先看摘要再下钻
node .agents/skills/project-ontology/scripts/query-ontology.js \
  spec/context/ontology/ontology.json \
  --mode browse \
  --target "<报错现象或关键词，如 'score_total 串台'>" \
  --freshness \
  --repo .

# 2. 精确子图溯源 + 爆炸半径 + 第三层经验 + 核对清单（resolve 默认模式）
node .agents/skills/project-ontology/scripts/query-ontology.js \
  spec/context/ontology/ontology.json \
  --mode resolve \
  --target "<节点ID/字段名/报错关键词>" \
  --direction both \
  --depth 2 \
  --max-nodes 30 \
  --freshness \
  --repo .

# 3. 更正/撤回前反查影响域（node_id / inv_id / exp_id）
node .agents/skills/project-ontology/scripts/query-ontology.js \
  spec/context/ontology/ontology.json \
  --impact-of INV-001

# 4. 仅查发版/探索前的新鲜度漂移（自动排除 spec/ 与 docs/ 目录，跳过 external 模块）
node .agents/skills/project-ontology/scripts/query-ontology.js \
  spec/context/ontology/ontology.json --freshness --repo .
```

- **Windows 路径说明**：`query-ontology.js` 内部通过 `execFileSync("git", [...])` 传参，已原生处理 Windows 下的 `:(exclude)spec/` pathspec，无需额外引号转义。

---

## 完成交付前检查（人类视图与 Git 红线）

1. **脚本双检全绿**：`render-ontology.js` 与 `check-ontology.js --strict` 均返回退出码 `0`。
2. **浏览器实跑核对（首次建图或改样式后必做）**：
   - 打开 `index.html`（可用 `?v=<时间戳>` 绕缓存），点击每个 Tab、展开折叠行、手动改 hash 与点浏览器后退键（验证 `popstate` 与 `hashchange`）；
   - 在 `1440 / 1280 / 1024 / 760` 视口下确认 `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`（无横向撑穿）。
3. **Git 红线**：只读 git 查询可直接运行；若不在 `spec-end` 自动流程内单独建图，提交/推送前必须先展示变更并取得用户批准。
