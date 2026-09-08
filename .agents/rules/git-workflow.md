# Git 工作流

- 采用 `dev + release` 集成与发布分支流；合并审查统一为平台中立的 PR/MR
- 默认主干为 `master`（或动态读取 `origin/HEAD`），日常开发集成为 `dev` 分支
- 新 Spec 从 `dev` 创建工作分支（`<type>/spec-<slug>`），完工后通过 PR/MR 合入 `dev`
- 版本提测时从 `dev` 拉出临时集成分支 `release/<version>` 进行冻结与集成验证，提测修复切 `fix/*` 合回该分支
- 版本发布（`version-release`）将 `release/<version>` 合入主干，打正式 Tag（`vX.Y.Z`），并强制反向合流回 `dev`
- 线上热修从对应发布 Tag 切出 `hotfix/*` 分支，验证通过后合入主干打 Patch Tag，并强制回流 `dev` 及在研版本分支
- 版本收尾归档（`version-end`）将复盘报告提交合入主干，清理 `release/<version>` 临时分支与对应 worktree
- 客户/长期定制维护线命名为 `support/<line>`，不与提测分支混淆
