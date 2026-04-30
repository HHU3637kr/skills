# Git 工作流

- R&K Flow 默认采用 GitHub Flow
- 新 Spec 从 `main` 创建短生命周期分支
- 同一活跃 Spec 的 update 复用原 Spec 分支
- 禁止在 `main` 上直接实现、测试或归档 Spec
- 收尾时提交、推送当前分支并创建或更新 PR
- PR 合并后同步 `main` 并清理工作分支
