---
disable-model-invocation: true
name: version-update
description: >
  当一个处于「规划中」或「执行中」的 Version 发生需求范围变更（新增 Spec、移出/延期 Spec、
  调整依赖关系、更新冻结或发布排期）时使用。
  不要用于单个 Spec 内部的方案更新（用 spec-update）。
---

# Version Update

## 运行契约

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 目标版本号（如 `v1.6`）、变更诉求（新增 Spec / 移出 Spec / 调整排期 / 依赖变更）、变更动因与依据 |
| 权限 | 修改 `spec/versions/<version>/version-context.md` 与 `plan.html`（递增修订号）；在版本分支上记录范围变更 |
| 验证 | 变更已登记进「范围变更记录（Scope Change Log）」；被移出的 Spec 若已有代码必须明确处理方案（保留在 dev、撤回提交或加功能开关） |
| 停止 | 账本更新完成且用户确认（或 autopilot 下自门禁通过） |
| 升级 | 若版本已处于「验收中」（已冻结）且变更涉及核心范围，强制升级用户决策，必须评估对全量集成测试的影响 |

## 核心原则

1. **变更必须留痕**：不能静默删减或新增 Spec 清单，必须在 `version-context.md` 的 Scope Change Log 登记谁批准、为什么变。
2. **代码与文档联动**：延期或移出一个已经合并了代码的 Spec，绝不能只改文档；必须通过 Git 提交明确处理代码（撤销/feature flag/保留在 dev）。
3. **冻结期加严约束**：一旦版本进入「验收中」（已拉出 `release/<version>` 提测），任何范围变更都属于破例，必须重新跑受影响的组合测试。

## 工作流程

### 步骤 1：定位版本与评估影响

读取 `spec/versions/<version>/version-context.md`，确认版本当前状态：
- 若为 `规划中` 或 `执行中`：按常规流程评估工期与依赖。
- 若为 `验收中`（已提测冻结）：提示用户当前已冻结，任何范围新增都会重置提测基线，需明确授权。

### 步骤 2：记录范围变更

在 `version-context.md` 的「范围变更记录」追加行：

```markdown
| 日期 | 变更类型 | Spec 标识 / 描述 | 动因与依据 | 审批人 |
|---|---|---|---|---|
| YYYY-MM-DD | 延期至下一版 | 20260908-1400-tech-ASR优化 | 上游模型接口延期，避免阻塞本版发布 | user |
```

同步更新「规划 Spec 清单」中的对应行状态（如从 `执行中` 变为 `已延期至 v1.7`）。

### 步骤 3：修订版本规划报告 `plan.html`

按照 `html-report` 的可追溯修订规范：
- 修订号 `+1`，并在修订历史表追加一行（写明改动内容及原因）。
- 正文通过 `<del class="rk-del">` 和 `<ins class="rk-ins">` 标明增删内容。

### 步骤 4：Git 提交文档更新

```bash
git add "spec/versions/<version>"
git commit -m "docs(version): 更新 <version> 范围规划（变更说明）"
```
