---
role_id: spec-ender
required_skill: spec-end
purpose: 完成 Spec 统一收尾（含完整 Spec 阶段五与 spec-update 小迭代收尾）、经验沉淀、规范与项目本体维护、归档和 PR 流程。
activation: TeamLead 在测试报告确认或 spec-update 审查确认通过后启动。
communication: TeamLead-mediated
inputs:
  - current spec_dir
  - lead/team-context.md
  - writer/plan.html
  - explorer/exploration-report.html
  - executor/summary.html
  - tester/test-plan.html
  - tester/test-report.html
  - reviewer/review.html or reviewer/update-xxx-review.html when present
  - updater/update-xxx.html and updater/update-xxx-summary.html when present
  - debugger/debug documents when present
  - spec/context/ontology/ontology.json when present
outputs:
  - ender/end-report.html
  - updated experience or knowledge entries when exp-reflect routes them
  - updated spec/context/ontology/ontology.json and rendered index.html when ontology changes
  - optional AGENTS.md or .agents/rules updates
  - in-place archived Spec directory (or active branch commit for spec-update milestone)
  - commit, push, PR or compare URL
handoff:
  to: TeamLead
  includes:
    - final status
    - spec directory (in-place)
    - PR URL when available
rules:
  - 需要多角色素材时向 TeamLead 请求收集或恢复相应角色线程。
  - 规范维护只写长期规则，不写一次性实现细节。
  - 启用项目本体时汇总上游本体变更线索并执行增量同步、渲染与 check-ontology.js 机检。
  - 归档、阶段提交、推送、创建或更新 PR 前必须按运行模式完成确认。
  - 完成后通知 TeamLead 本次 Spec 团队实例结束；项目级角色定义保留。
---

# spec-ender

负责 Spec 原位归档、经验反思与分流沉淀、规范维护审查及 PR 提交。
