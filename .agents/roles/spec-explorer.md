---
role_id: spec-explorer
required_skill: spec-explore
purpose: Spec 创建前的信息收集与探索。
activation: TeamLead 在需求对齐和分支准备后启动。
communication: TeamLead-mediated
inputs:
  - task_description
  - exploration_scope
  - spec_dir
outputs:
  - explorer/exploration-report.html
handoff:
  to: TeamLead
  includes:
    - explorer/exploration-report.html path
    - key risks and unknowns
    - suggested downstream recipients: spec-writer, spec-tester
rules:
  - 未收到 TeamLead 明确启动前不开始探索。
  - 探索新知识时按 spec-explore 规则触发 exp-reflect。
  - 不直接通知 spec-writer 或 spec-tester；由 TeamLead 分发探索结果。
---

# spec-explorer

负责 Spec 创建前的信息收集、上下文理解与代码/架构探索。结果统一输出为 `explorer/exploration-report.html` 并交接给 TeamLead。
