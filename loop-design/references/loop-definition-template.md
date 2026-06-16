# Loop 定义模板

> 用于 `loop-design` 引导用户产出一份有边界的 loop 定义。
> 六要素（目标/输入/权限/验证/停止/升级）与各 Skill 头部的「运行契约」表同构，便于和 R&K Flow 衔接。
> **停止和升级是必填项**，没有停止条件的 loop 不允许产出。

---

## 自定义 loop 定义模板

```markdown
---
type: loop-definition
loop_name: <英文短横线 id，如 daily-digest>
title: <一句话描述这个 loop>
category: rk-flow | custom
created: <YYYY-MM-DD>
status: draft | confirmed
---

# <loop 标题>

## 运行契约

| 项 | 约定 |
|----|------|
| 目标 | 每轮要达成什么 / 整个 loop 的最终目标 |
| 输入 | 每轮读什么、依赖什么上游产物或数据 |
| 权限 | 允许动什么、禁止动什么 |
| 验证 | 如何判断一轮成功，谁来验证（最好非执行者自己） |
| 停止 | 满足什么条件停止（见下方预算） |
| 升级 | 什么情况必须停下来交还给人 |

## 预算（停止条件量化）

| 指标 | 值 | 说明 |
|------|----|------|
| max_rounds | <如 3> | 最多执行多少轮 |
| max_no_progress_rounds | <如 2> | 连续多少轮无进展就停止并升级 |
| max_duration | <可选> | 最大时长 |
| max_cost | <可选> | 最大 token / 金额 |

## 进展的定义

一轮算"有进展"当且仅当出现以下至少一项：
- <如：新增通过的检查项>
- <如：缩小了问题范围>
- <如：产生了新的可验证证据>

仅产出了新内容但以上都没动，记为"无进展"，no_progress_streak 加一。

## 每轮记账

| 字段 | 含义 |
|------|------|
| rounds_used | 已执行轮数 |
| no_progress_streak | 连续无进展轮数 |
| status | running / passed / stopped-budget / stopped-no-progress / escalated |

## 执行方

- 由谁执行这个 loop：<用户 / 某个 Skill / 某个外部流程>
- 注：loop-design 只产出本定义，不负责执行。
```

---

## R&K Flow 内 loop 的落点

R&K Flow 内的 loop 不另建独立文档，而是写入对应 Spec 的 `lead/team-context.md`：

### 修复循环预算 → `Loop Budget` 区块

```markdown
## Loop Budget

| loop | max_rounds | max_no_progress_rounds | rounds_used | no_progress_streak | status | confirmed_by_user | updated_at |
|------|-----------|------------------------|-------------|--------------------|--------|-------------------|------------|
| test-debug | <用户确认值> | <用户确认值> | 0 | 0 | not-started | yes | <ISO8601> |
```

### 自定义阶段路径 → `Current Run Path` 区块

如果用户想裁剪本次 Spec 走哪几个阶段（如跳过可选审查），在 `Current Run Path` 中明确列出实际要走的阶段序列，并由 TeamLead 在门禁处对齐用户。

---

## 填写检查清单

产出前自检：
- [ ] 目标具体，不是"做得更好"这种无法判定的表述
- [ ] 验证方式独立于执行者（避免自写自审）
- [ ] 停止条件至少包含 max_rounds 和 max_no_progress_rounds
- [ ] 升级条件明确了"什么情况交还给人"
- [ ] "进展"判据具体，能挡住空转
- [ ] 已注明执行方，且 loop-design 自身不执行
