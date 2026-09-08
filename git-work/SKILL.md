---
disable-model-invocation: true
name: git-work
description: 当 spec-start 需要为新 Spec 创建 GitHub Flow 工作分支，spec-update 需要复用/校验当前 Spec 分支，或 spec-end/spec-update 需要提交、推送、创建 PR、合并后清理分支时使用。也用于发版管理：建立或维护 release 分支、打版本 tag、发补丁版本、把修复 cherry-pick 到多条发布线、核对 tag 与分支是否错位、对齐镜像标签与 git tag、清理带版本号的旧分支。不要用于单次查看 git 状态、普通 diff 查询，或用户明确要求不走 GitHub Flow 的临时操作。
---

# Git 工作流 SOP（dev + release 发版管理）

详细示例见 [examples.md](examples.md)，命令速查见 [reference.md](reference.md)。

两块正交内容：

- **模式一~五**：Spec 工作分支生命周期（短分支 → PR → 合并即删）
- **模式六**：发版分支与 tag 管理（长期 release 分支 + 版本 tag）

## 核心约定

R&K Flow 采用 **`dev + release` 集成与发版工作流**，并对合并审查进行平台中立的 **PR/MR** 抽象：

1. **主干分支（`<main>`）**：始终保持生产就绪与已发布状态，默认读取 `git symbolic-ref refs/remotes/origin/HEAD`（常见为 `master` 或 `main`），严禁直接在主干上实现。
2. **日常集成开发分支（`dev`）**：在研 Spec 的日常集成线。所有常规 Spec 分支均从 `dev` 切出，并通过 PR/MR 合入 `dev`。
3. **版本提测集成分支（`release/<version>`）**：版本提测冻结时从 `dev` 切出，只接收该版本的缺陷修复（`fix/*`），完成全量集成验证。
4. **版本发版**：`release/<version>` 通过 PR/MR 合入 `<main>`，打正式发布 Tag（`vX.Y.Z`），并**强制反向合流回 `dev`**。
5. **线上热修（`hotfix/*`）**：严格从对应生产环境的发布 Tag 切出，验证通过后合入 `<main>` 打 Patch Tag，并**强制双向回流 `dev` 与当前在研的 `release/*` 分支**。
6. **长期支持线命名**：长期定制或客户维护线统一命名为 `support/<line>`，不使用 `release/*`，避免与临时提测分支冲突。
7. **PR / MR 平台中立**：GitHub 称为 PR，GitLab 称为 MR。元数据统一记录请求类型、URL、源分支、目标分支与审查结果。
## 在 Spec 生命周期中的位置

```text
spec-start
  → git-work：从 `dev` 创建 Spec 工作分支（base_branch: dev）
  → plan.html 记录 git_branch、base_branch: dev、pr_url

spec-update
  → git-work：确认当前分支与 plan.html 的 git_branch 一致
  → update-xxx.html 继承 plan.html 的 git_branch、base_branch、pr_url

开发与测试阶段
  → 始终留在当前 Spec 分支
  → 必要时推送远程分支，方便团队协作

spec-end / spec-update 收尾
  → git-work：提交、推送当前 Spec 分支
  → 面向 `dev` 创建 PR/MR；spec-update 仅在 Spec 准备整体交付时创建/更新 PR/MR
  → 记录 PR/MR URL，并通过 amend 并入同一次提交

PR/MR 合并后
  → git-work：同步 `dev`，删除本地和远程工作分支
```

## 分支命名

格式：

```text
<type>/spec-<YYYYMMDD-HHMM>-<ascii-slug>
```

示例：

```text
feat/spec-20260428-1430-user-auth
fix/spec-20260428-1530-login-timeout
docs/spec-20260428-1600-rk-flow-docs
refactor/spec-20260428-1700-db-layer
test/spec-20260428-1800-audit-log
```

类型映射：

| 类型 | 何时使用 |
|------|----------|
| `feat` | 新功能、新接口、新页面、新集成 |
| `fix` | Bug、回归、安全修复 |
| `docs` | 纯文档、规则、Skill 文案 |
| `refactor` | 不改变行为的重构、技术债 |
| `test` | 测试覆盖、测试基础设施、审计证据 |
| `chore` | 构建、依赖、配置、仓库维护 |

规则：
- 分支名必须 ASCII，中文任务名保留在 Spec 目录名
- slug 使用小写短横线，不能包含空格
- 同一个活跃 Spec 的所有提交和 update 留在同一分支
- 如果原 Spec 分支已合并/删除，后续需求默认新建 Spec；只有用户明确要求独立 PR 时才创建新分支承接 update

### 分支命名反例（禁止把版本号塞入分支名）

| 错误写法 | 为什么错 | 正确做法 |
|----------|----------|----------|
| `feat/v1.6-user-auth` | 分支是一次性的短生命周期开发流，版本号由 `release/<version>` 分支与不可变 Git Tag 管理 | `feat/spec-20260428-1430-user-auth` |
| `fix/v2.0-login-bug` | 版本号写进分支名会导致多分支并行版本混乱，难以追溯时间戳 | `fix/spec-20260428-1530-login-timeout` |
| `spec-20260428-auth` | 缺少类型前缀（feat/fix/docs/refactor/test/chore） | `feat/spec-20260428-1430-user-auth` |
| `feat/用户认证` | 包含非 ASCII 字符，部分 CI/CD 工具与 Git 钩子无法处理 | `feat/spec-20260428-1430-user-auth` |

### 版本号与分支关系规则表

| 维度 | Spec 工作分支 | 版本提测分支 | 长期维护分支 | 正式发版点 |
|------|---------------|--------------|--------------|------------|
| 命名格式 | `<type>/spec-<YYYYMMDD-HHMM>-<slug>` | `release/<version>` | `support/<line>` | `vX.Y.Z`（Git Tag） |
| 生命周期 | 瞬态（合并后删除） | 提测期（发版合入 master 后保留或归档） | 长期维护线（长期存续） | 永久不可变 |
| 基线/目标 | 起于 `dev`，合入 `dev` | 起于 `dev`，合入 `master` 并回流 `dev` | 历史发版点拉出，合入主干并打 patch tag | 钉在 `master` 或 `support/<line>` 提交上 |
| 承载内容 | 单个原子 Spec 实现与报告 | 版本大盘、发版报告、提测期 bugfix | 历史主版本严重缺陷补丁 | 生产部署产物基准 |

## 模式一：启动 Spec 分支

由 `spec-start` 在正式写文档前调用。`spec-update` 默认不调用本模式，除非用户明确要求为该 update 创建独立 PR。

### 1. 检查仓库

```bash
git rev-parse --is-inside-work-tree
git remote -v
git status --short
```

如果不是 Git 仓库：向用户说明无法执行 GitHub Flow，询问是否继续无分支模式。

如果工作区不干净：
- 若改动属于当前即将启动的 Spec，先让用户确认是否纳入本分支
- 若改动无关，先提交、stash 或切换到干净工作区
- 不要在脏工作区直接切换到 `dev`

### 2. 同步日常开发集成线 `dev`

日常在研 Spec 默认以 `dev` 分支为开发起点与合并目标：

```bash
git switch dev
git pull --ff-only origin dev
```

如果仓库尚未创建 `dev`，先从主干分支（由 `git symbolic-ref refs/remotes/origin/HEAD` 读取，记作 `<main>`）创建 `dev`：
```bash
git switch -c dev
git push -u origin dev
```

### 3. 创建工作分支

```bash
git switch -c <branch-name>
```

团队协作或并发开发时，立即推送远程分支：

```bash
git push -u origin <branch-name>
```

### 4. 输出给 Spec 文档

把以下元数据传给 `spec-write`：

```yaml
git_branch: <branch-name>
base_branch: dev
pr_url:
```

`base_branch` 统一记录为 `dev`。

## 模式二：并发开发使用 worktree

当同一仓库需要同时开发多个 Spec，不要在同一个 working tree 里来回切分支。使用 worktree：

```bash
git switch dev
git pull --ff-only origin dev
git worktree add ../<repo>-<spec-slug> -b <branch-name> dev
```

进入新 worktree 后再运行对应的 Spec 流程。每个并行 Spec 独占一个目录和一条分支。

## 模式三：复用 Spec 分支

由 `spec-update` 在创建 update 文档前调用。

### 1. 读取 plan.html Git 元数据

报告是 HTML，Git 元数据在 `<head>` 的 `<meta name="rk:*">` 里（`.rk-meta` 是同字段的人可读镜像）：

```html
<meta name="rk:git-branch"  content="<branch-name>">
<meta name="rk:base-branch" content="{base_branch}">
<meta name="rk:pr-url"      content="">
```

### 2. 校验当前分支

```bash
git branch --show-current
git status --short
```

规则：
- 当前分支必须等于 plan.html 的 `rk:git-branch`
- 如果当前分支是 `dev` 或主干分支，停止并切回 Spec 分支
- 如果原分支已合并或不存在，默认不继续 spec-update；应新建 Spec 或让用户明确选择独立 update 分支
- update-xxx.html 继承 plan.html 的 `rk:git-branch` / `rk:base-branch` / `rk:pr-url`

## 模式四：完成 Spec 分支

由 `spec-end` 或 `spec-update` 收尾时调用。

### 1. 确认当前分支

```bash
git branch --show-current
git status --short
```

禁止直接在 `dev` 或主干分支上提交 Spec 成果。若当前分支不是 plan/update 文档记录的 `git_branch`，先确认原因。

### 2. 审查变更

```bash
git diff --stat
git diff
```

确认包含：
- 代码实现
- 测试与日志/审计证据
- Spec 文档、summary/test-report/review/debug/update 文档
- 必要的 `AGENTS.md` / `.agents/rules/` 规范更新
- 归档目录移动（新 Spec 完成时）

### 3. 提交

```bash
git add .
git commit -m "<type>: <summary>"
```

提交信息规则：
- 使用 `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- 第一行不超过 72 字符
- 正文写清 Spec 路径、测试结果、关键决策

### 4. 推送

```bash
git push -u origin <branch-name>
```

### 5. 创建或更新 Pull Request

`spec-end` 默认创建 PR。`spec-update` 默认只提交并推送当前 Spec 分支；如果该 Spec 已准备整体交付，或用户明确要求，则创建/更新 PR。

如果可用，优先使用 GitHub CLI：

```bash
gh pr create --base dev --head <branch-name> --title "<PR title>" --body-file <pr-body.md>
```

如果没有 `gh`，输出 GitHub compare URL，让用户手动创建 PR：

```text
https://github.com/<owner>/<repo>/compare/dev...<branch-name>
```

PR 内容至少包含：
- Spec 路径
- 实现摘要
- 测试结果
- 风险与回滚方式
- 关联的经验/规范更新

### 6. 记录 PR URL

如果拿到 PR URL，写回对应文档：

```yaml
pr_url: https://github.com/<owner>/<repo>/pull/<number>
```

写回后**并入同一次提交**（spec-end / spec-update 收尾的硬要求：全部处理完只提交一次，不产生第二次提交）：

```bash
git add <spec-docs>
git commit --amend --no-edit
git push --force-with-lease origin <branch-name>
```

说明：
- `--amend --no-edit` 把 `pr_url` 写回并进刚才那次提交，git 历史保持一次提交
- `--force-with-lease` 只允许覆盖自己刚推送的引用；若远程分支已被他人改动会拒绝并报错，不会误覆盖别人的提交
- 仅限「本流程刚创建并推送的 Spec 分支」这一场景；其它任何 force push 仍是门禁（见 spec-end 停止条件）

## 模式五：PR/MR 合并后清理

只有在面向 `dev` 的 PR/MR 已合并后执行：

```bash
git switch dev
git pull --ff-only origin dev
git branch -d <branch-name>
git push origin --delete <branch-name>
```

如果本地分支无法删除，先确认 PR/MR 是否已合并，避免误删未合并成果。

## 模式六：发版管理与版本集成分支（dev + release + support）

### 分支模型矩阵

| 分支 | 生命周期 | 角色与用途 | 合流方向 |
|------|----------|------------|----------|
| `<main>` | 长期 | 生产主干（`master` 或 `main`），始终处于已发布状态 | 仅接收 `release/<v>` 与 `hotfix/*` |
| `dev` | 长期 | 日常开发集成线，所有 Spec 的合并终点 | 作为提测集成分支的基础 |
| `release/<v>` | 临时 | 某个在研 Version 的提测集成分支（冻结期建立） | 验收后合入 `<main>` 并强制回流 `dev`；归档后删除 |
| `support/<line>` | 长期 | 客户定制维护线（如 `support/official`，原 `support/<line>` 重命名），不与提测分支混淆 | 接收特定版本的 cherry-pick |
| `<category>/spec-*` | 短期 | 原子 Spec 工作分支（模式一~五） | 完工后 PR/MR 合入 `dev` |
| `hotfix/*` | 短期 | 线上紧急缺陷热修分支 | 合入 `<main>` 打 Patch Tag，并强制双向回流 `dev` 与在研 `release/*` |

### 临时提测分支 `release/<version>` 生命周期

1. **冻结拉出**：当属于该版本的全部规划 Spec 合入 `dev` 后，由 `version-release` 从 `dev` 拉出 `release/<version>`。
2. **提测修复**：若测试发现集成 Bug，切 `fix/*` 分支直接 PR/MR 合入 `release/<version>`。
3. **发布合流**：整体验收通过后，PR/MR 合入 `<main>` 并打正式不可变 Tag（`vX.Y.Z`），同时强制反向合并回 `dev`。
4. **收尾清理**：版本收尾（`version-end`）交付归档后，删除本地与远程的 `release/<version>` 分支。

## 模式七：线上紧急热修（Hotfix）与强制回流

线上突发严重缺陷时走此紧急通道：

```bash
# 1. 确认线上实际运行的 tag（严禁随意从 HEAD 切热修）
git checkout <production-tag>

# 2. 创建热修分支
git switch -c hotfix/<slug>

# 3. 修复、验证通过后提交
git commit -m "fix(hotfix): 修复线上特定严重缺陷"

# 4. 通过 PR/MR 合入主干 <main>，并打出 Patch Tag（如 v1.6.1）
git checkout master
git pull origin master
git merge hotfix/<slug> --no-ff -m "merge: hotfix/<slug> 紧急修复合入"
git tag -a v1.6.1 -m "hotfix: v1.6.1"
git push origin master v1.6.1

# 5. 强制回流开发线 dev（防止下一个版本带回同一 Bug）
git checkout dev
git pull origin dev
git merge master --no-edit
git push origin dev

# 6. 若存在活跃的在研提测分支 release/<v>，同样合流
git checkout release/<v>
git merge master --no-edit
git push origin release/<v>

# 7. 删除热修临时分支
git branch -d hotfix/<slug>
```
### 发版流程

```bash
# 1. 修复先进主干（master）
git switch master && git commit ... && git push

# 2. cherry-pick 到目标发布线
git switch support/<line>
git cherry-pick <commit>

# 3. 跑测试（定制线注意区分既有失败，见下）
<项目测试命令>

# 4. 打 annotated tag 并推送
git tag -a <version> -m "<说明>"
git push origin support/<line> <version>
```

tag 说明必须写清：改了什么、实测数据、cherry-pick 来源、是否已部署。
**只用 annotated tag**（`-a`），轻量 tag 不带作者、日期和说明。

### tag 指向「发版的代码」，不追 HEAD

release 分支允许存在不产生新版本号的提交：规范、文档、Spec 报告等不改变
运行行为的内容。这类提交后 tag 落后于 HEAD，**属正常状态**。

判断标准：**这笔提交会改变构建出的产物行为吗？**

| 提交内容 | 是否发新 tag |
|----------|--------------|
| 源码、依赖、Dockerfile、数据库迁移 | 是 |
| 规范文件、`AGENTS.md`、Spec 报告 | 否 |
| `.env.example`（仅注释或默认值说明） | 否 |

核对方法：

```bash
git diff --name-only <tag> support/<line>
```

差异只含「否」类文件即正常；混入源码说明**漏打 tag**。

### 镜像标签必须等于 git tag

构建产物（Docker 镜像等）的标签必须与 git tag 同名，不得自行取名：

```bash
git switch --detach <version>
docker build -t <image>:<version> .
# 部署侧 .env: IMAGE_TAG=<version>
```

这样从服务器可直接反查代码：

```bash
ssh <server> "grep '^IMAGE_TAG=' <path>/.env"   # 得到 <version>
git switch --detach <version>                    # 就是线上那份代码
```

实际踩过：生产跑 `IMAGE_TAG=tut-v1.0.5` 但 git 中无此 tag，镜像实际由某个
裸 commit 构建，线上版本与代码彻底失去对应关系，只能靠人工记录。

更强的做法是把 commit 烘进产物：构建时 `--build-arg GIT_COMMIT=$(git rev-parse HEAD)`
写入环境变量，运行时可直接查询，连命名约定都不必依赖。

### 定制线的既有测试失败

定制线常因改了共享文件而让主线的守卫测试恒失败。发版前必须先建立基线：

```bash
# 在 cherry-pick 前的提交上跑一次，记下 failed 数
git switch --detach <cherry-pick 前的 commit>
<测试命令>
```

判据是 **failed 数不增加**，不是「全绿」。把已知恒失败项及其原因记进项目
速查表，否则每次发版都要重新判断哪些失败是无害的。

### 清理带版本号的旧分支

迁移到本模型时，旧的 `release/vX` 分支可以删——但**删前必须逐条验证**每个
分支的 HEAD 提交有 tag 或保留分支覆盖：

```bash
# 该分支是否已被某条保留分支包含
git merge-base --is-ancestor <old-branch> support/<line>

# 独有提交数，必须为 0
git log --oneline <old-branch> --not master support/<line> | wc -l
```

两项都通过才能删。删分支不丢提交的前提是**版本点已被 tag 钉住**，
没有 tag 覆盖的分支删掉就是丢代码。

### 每次发版后更新速查表

在项目的 `AGENTS.md` 维护一张表，记录每条线的当前 tag、部署位置、版本历史。
发版即更新一行。没有这张表，过几周就会出现「哪个版本部署在哪、对应哪份代码」
说不清的情况——这正是本模式要解决的问题。

## 常见阻塞

| 场景 | 处理 |
|------|------|
| 不在 Git 仓库 | 询问是否继续无分支模式，并在 Spec 文档中记录 `git_branch: none` |
| 工作区已有无关改动 | 先提交、stash 或使用 worktree |
| 当前在 `dev` 或主干且已有开发改动 | 立即创建分支承接当前改动，不要继续在基线或主干上开发 |
| 分支落后 `dev` | 在工作分支中合并或 rebase 最新 `dev`，解决冲突后继续 |
| 多个 Spec 并发 | 使用 `git worktree`，每个 Spec 独占分支和目录 |
| 无法创建 PR | 推送分支并给出 compare URL |
| tag 与 release 分支 HEAD 不一致 | 先 `git diff --name-only <tag> support/<line>`；只含文档即正常，含源码说明漏打 tag |
| 服务器拉不到远程（网络隔离/remote 损坏） | 走文件同步 + md5 逐文件对账，同步后在服务器目录内 git 提交留痕并打同名 tag |
| 定制线测试有失败 | 先在 cherry-pick 前的提交上跑一次建立基线，判据是 failed 数不增加 |
| 想删带版本号的旧分支 | 先验证每条分支 HEAD 有 tag 或保留分支覆盖、独有提交数为 0 |

## 禁止事项

- 不要在 `dev` 或主干分支上直接实现 Spec
- 不要在脏工作区切换分支
- 不要把多个无关 Spec 混在同一分支
- 不要在测试失败时创建 PR，除非 PR 明确标记为 Draft
- 不要自动合并 PR，除非用户明确要求

发版相关（模式六）：

- 不要新建带版本号的分支（`release/v1.0.4`、`support/<line>-v1.0.5`）
- 不要用轻量 tag 发版，必须 `git tag -a`
- 不要为纯文档提交打新版本号 tag（适用于业务代码仓库；R&K Flow 本仓库作为工作流与技能规范产品，框架发版时豁免）
- 不要让产物标签与 git tag 不同名
- 不要在没有 tag 覆盖的情况下删分支
- 不要用「全绿」作为定制线的发版判据，用「failed 数不增加」
- 不要移动或复用已推送的 tag（会改变已发布版本的含义）
- push tag 时**必须显式指定 tag 名**（如 `git push origin <tag>`），**严禁使用 `git push --tags`**，避免误推本地临时或脏 Tag
