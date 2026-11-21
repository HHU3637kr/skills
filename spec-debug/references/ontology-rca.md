# 基于本体的根因分析（OB-RCA）协议

当项目存在 `spec/context/ontology/ontology.json` 时，`spec-debugger` 在进入代码排查前必读本协议。

> **渐进增强原则**：未检测到 `spec/context/ontology/ontology.json`（注意以文件存在为准，不以目录存在为准）时，本协议自动跳过，无缝沿用 `root-cause-tracing.md` 与 `defense-in-depth.md` 的常规流程，不阻塞排查。

---

## 1. 四步本体溯源法

```text
现象关键字 ─▶ ① Git 新鲜度校验 ─▶ ② 现象锚定与子图抽取 ─▶ ③ 逆向溯源与层级判定 ─▶ ④ 爆炸半径与定向回归
```

### 第一步：先查本体新鲜度，锁定未同步嫌疑提交

运行：
```bash
# 若对报错位点尚不确定或图谱较大，先用 --mode browse 概览再切 --mode resolve
node .agents/skills/project-ontology/scripts/query-ontology.js \
  spec/context/ontology/ontology.json \
  --target "<报错现象关键字/字段名/模块或文件名，支持空格多词>" \
  --mode resolve \
  --direction both \
  --depth 2 \
  --max-nodes 30 \
  --freshness \
  --repo .
```

- **若状态为 `fresh`**：业务代码与本体一致，可直接高置信度沿图谱推理（已标记 `kind: "external"` 的外部边界模块默认豁免本地 Git 漂移检查）。
- **若状态为 `drifted`**：脚本会自动列出 `last_verified_commit..HEAD` 期间（排除 `spec/` 与 `docs/`）触及各模块目录或代码锚点的改动与最近提交；若漂移模块同时落入当前上游溯源链，报告会标出 **`🔥 头号嫌疑变更`**，应优先核查其 diff。对其余漂移模块保持“参考骨架 + 核实源码”态度，防止被旧口径误导。

### 第二步：将用户现象锚定到本体节点与第三层经验

不要一上来就全仓 `Grep` 盲搜。`--target` 支持**报错现象直达与多词联合检索**（如 `"NaN"`、`"除零"`、`"score_total 串台"`），会自动扫描字段语义微结构、不变量 `violation_symptom`、关系边与 `experience_refs[]`：
- **锚定节点与命中理由**：查看 `code_anchors`、`state_scope`、`null_and_default_semantics` 与 `confused_with`，先排除状态作用域混淆或空值默认语义误读。
- **已知差异提醒**：若锚点带有 `known_diff`，先核实是否属于需求文档与实现口径的既定差异，避免把已知口径变化误修回旧逻辑。
- **第三层经验与已撤回警示**：对照命中的 `experience_refs` 的 **✅ 适用条件** 与 **❌ 不适用条件**，避免机械套用旧补丁；若命中有 `⛔ 已撤回/证伪警示`，切勿重走已被否决的历史假设（需审查全部历史记录时加 `--include-retracted`）。

### 第三步：沿 `upstream` 逆向追溯根因层（防下游打补丁）

结合 `root-cause-tracing.md` 与 `defense-in-depth.md` 的「修在哪一层」，重点沿以下四类结构排查：

1. **`INV-xxx` 不变量违背点核查**：结合 `applicable_when` 前提检查上游哪一个 `owner_node` 应该守卫该不变量（`root` 根因层 vs `boundary` 边界层）却被绕过。
2. **`backfills_from`（跨模块回填源头）**：很多“本地数据没问题但展示异常”的 bug，根因在远端回填源头的数据结构或默认值变化，直接沿 `backfills_from` 跳到上游源验证。
3. **`fallback_to`（降级兜底防吞错）**：凡是子图命中 `fallback_to` 边，必须先做实验确认主路径是否抛错后被静默降级掩盖——**修复优先解决主路径报错或让边界层 Fail-Fast，严禁在下游加新兜底掩盖问题**。
4. **`maps_to`（外部系统与跨边界映射）**：排查第三方服务（`external`）或跨模块接口边界是否因字段改名、单位换算或静音/空值语义映射失真导致脏数据透传。

### 第四步：沿 `downstream` 评估爆炸半径

从准备修改的节点出发，收集子图报告中的「下游爆炸半径」清单（沿 `produces`、`propagates_to` 及所有指向该节点的 `consumes` / `depends_on` / `backfills_from`）：
- 将受波及的模块、字段、界面展示位写入 `debugger/debug-xxx.html` 第 4 节「风险评估」；
- 在向 TeamLead 提交复验请求时，**不仅列出原失败用例 `TC-XXX`，还必须附上受波及下游的定向回归范围**，由 `spec-tester` 一并验证，杜绝“修 A 坏 B”。

---

## 2. Phase 4.5 本体提前预警信号

对照 `defense-in-depth.md` 的 Phase 4.5（有进展的死循环），以下任一信号出现时，**立即停止逐个打补丁，就地升级给 TeamLead 讨论架构**：

1. 子图查询直接命中 `shared_state`（隐式可变共享状态边），且当前 bug 正是由多个单元读写同一全局/单例/缓存状态引发的串台、竞态或测试污染；
2. 实测定位到的真实因果路径**绕开了本体中所有显式数据流边**（说明存在未登记的隐式跨层副作用或需要“改一处必须记得同时改另一处”的暗耦合）。

---

## 3. 缺陷驱动本体演进（消费核对与三路归因）

每次 bug 定位与修复本身都在校验本体的真实性。修复完成撰写 `debugger/debug-xxx-fix.html` 时，必须先逐条落实 `query-ontology.js` 末尾输出的「排查 / 验证核对清单」，再填写「6. 本体同步检查」：

1. **本体消费处置结论（防“读过未落实”）**：对子图实际命中的每条 `INV-xxx`、高危边（`shared_state` / `fallback_to` / `maps_to`）与 `experience_refs`，写明逐条结论：`已遵守` / `确认为根因` / `前提不适用` / `本体过时需更正或撤回`。
2. **更正前影响反查**：若结论认为某条既有 `INV`、边或经验已过时或被证伪，先运行 `node .agents/skills/project-ontology/scripts/query-ontology.js spec/context/ontology/ontology.json --impact-of <id>` 核对下游受波及模块与测试入口。
3. **EvoOntology 三路归因分流**：当发现本体未命中或给出错误指引时，在第 6 节明确标注归因类型：
   - **Content**：本体节点/口径/边/`experience_refs` 遗漏、过时或需改为 `status: "retracted"`；
   - **Tool**：`query-ontology.js` 关键词分词、跨层打分或遍历预算（`--max-nodes` / `--depth`）需要调优；
   - **Schema**：现有 `1.0` 字段与 8 类边语义确有表达盲区，需提出结构增强提案。

| 情景 | 记录与处理方式 |
|---|---|
| 纯实现笔误、未改契约/血缘/口径，且未发现漏记依赖 | 逐条记完核对结论后记为「无需变更本体」 |
| 本次 bug 暴露了**未登记的外部边界、隐式共享状态、降级路径、回填/映射依赖、语义歧义**或**可复用重大故障经验** | 在第 6 节登记「Content 待补充节点/边/`experience_refs` 摘要」 |
| 本次修复调整或证伪了**既有契约口径、不变量 `INV-xxx` 或历史边** | 先附 `--impact-of` 影响摘要，再登记「待更正或 `retracted` 条目」 |

- **处于完整 Spec / `spec-update` 流程内**：第 6 节线索交由 `spec-end` 统一审查并写回 `spec/context/ontology/ontology.json` 与 `index.html`（不打断当前调试闭环）。
- **独立线上热修（不走 `spec-end`）**：在 `spec-tester` 复验通过后，提醒用户确认并调用 `project-ontology` 按「场景二」增量同步 `ontology.json` 与 `index.html`。
