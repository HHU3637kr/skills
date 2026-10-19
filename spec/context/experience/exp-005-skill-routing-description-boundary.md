---
type: experience
id: EXP-005
title: SKILL.md frontmatter description 边界重叠导致 Skill 路由错判
date: 2026-09-23
source_spec: spec/versions/v2.11/specs/20260923-1335-fix-Skill路由边界句修补
keywords: skill-routing, description, frontmatter, folded-scalar, yaml, 边界重叠
weight: major
---

# SKILL.md frontmatter description 边界重叠导致 Skill 路由错判

## 困境

22 个核心流程 skill 的路由实测（14 条中文请求）只有 11/14 正确，3 个 miss 全部落在
**边界重叠 skill** 上：

| 请求 | 应走 | 实判 |
|---|---|---|
| 改 writer/plan.html 漏的分页参数 | spec-update | html-report |
| 把 AWR 踩坑沉淀到记忆 | exp-write | exp-reflect |
| 核对 tester 用例是否真跑过 | spec-test | spec-review |

扩展实测又发现同型第 4 例：「线上分页接口偶发 500，帮我诊断并修复」→ spec-start（应 spec-debug）。
同一条 gold 基准下总体命中 18/26。

## 根因（不是模型能力问题）

两类伪根因已被实测排除：

1. ❌ **roster 截断**：220 字符截断版与完整 description 版跑同一批请求结果完全一致。
2. ❌ **judge 后端能力**：同一后端只改 description 文本，18/26 → 25/26。

真因是**宽口径 skill 的 description 缺显式边界句**，四组重叠各有固定形态：

| 边界 | 宽口径方（缺「不越界」） | 窄口径方（缺用户向触发词） |
|---|---|---|
| 报告格式 vs 报告内容 | html-report 自称「产出或修改 Spec 报告…plan/update」 | spec-update 只有「修正方案」，全文不提「改 writer/plan.html」 |
| 识别分类 vs 落盘写入 | exp-reflect 含原词「沉淀」 | exp-write 是角色自述，触发条件全是内部调用 |
| 审查符合性 vs 核对证据真假 | spec-review 触发词「检查实现」 | spec-test 不提「核对是否真跑/假测试假绿」（body 里有这些硬规则） |
| 主动迭代 vs 被动修复 | spec-start「开始新的开发任务」 | spec-debug 触发条件全是角色内部 handoff |

## 策略（可复用）

1. **边界必须成对写**：每侧都要显式点名对侧 skill，并说明「什么归我、什么归你」。只给一方加负面句会造成新的不对称（实测 spec-test 首轮就因只补自己触发面、未点名 spec-review 而 TC-04 FAIL）。
2. **窄口径方补用户向触发词**：不要只写「由角色 X 调用」，要写真实用户会说的原话（「改 plan.html 里漏的参数」「写成知识记忆」「偶发 500」）。
3. **格式/契约类 skill 必须声明「我只规定长什么样，不决定写什么」**，并明确「请求里出现 report/plan/html 等文件名不构成触发条件」——否则任何提到文件名的请求都会被它吞掉。
4. **验收用 gold 基准 + RED/GREEN**：26 条中文请求 gold 写死，修补前必须 RED（≥3 miss 且必含目标错判），修补后 GREEN（≥25/26），再复跑一次验 flap。基准脚本随 Spec 归档可复用（见该 Spec `tester/artifacts/test-logs/`）。
5. **静态契约断言同步做**：frontmatter 可解析、name 不变、description ≤1024、diff 文件集恰为目标集合。机械断言抓到了纯文本评审会漏的问题。

## 附带的第二个坑：frontmatter 折叠标量解析

同一次实测中，基准脚本用行内正则解析 frontmatter，导致所有 `description: >` 折叠标量 22/22 解析失败。

**规则：解析 SKILL.md frontmatter 必须先按 `---` 截取 frontmatter 块，再在块内用 `re.S|re.M` 匹配 `description`；
不能对全文用行内正则。** 替换 description 时同理——按 frontmatter 块内 key 区间替换，正文 `---` 之后逐字节保持不动
（幂等脚本 + `assert 正文未变` 可机械化保证）。

## 适用范围

- 任何「多个 skill/manual/scaffold 条目共享同一入口信号」的 repo 整理 description。
- 任何需要机械解析/改写 frontmatter 的工具脚本（init 脚本、脚手架、门禁校验）。
