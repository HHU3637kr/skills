---
disable-model-invocation: true
name: spec-end
description: >
  当一个完整 Spec 的计划、实现、测试阶段都已完成，且角色 spec-ender 进入阶段五收尾时使用：
  收集角色经验、触发 exp-reflect、审查项目规范、询问归档，并完成提交、推送、创建 PR。
  不要用于功能实现中途、测试未完成时，或 spec-update 的小迭代收尾。
---

# Spec End

## 运行契约

> 进入核心原则前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 当前 Spec 全部角色产物、`lead/team-context.md`（含 Git 元数据）、TeamLead 转回的各角色经验素材 |
| 权限 | 写 `ender/end-report.html`、调用 exp-reflect 分流、归档目录、git commit/push/创建 PR（`autopilot` 下可自主执行这些可逆动作）；维护 AGENTS.md/rules 属永远门禁，任何模式下都必须先经用户确认；合并、改动远程默认分支不在本 Skill 权限内；force push **仅豁免**收尾时对自己刚推送的 Spec 分支做 amend（`git commit --amend` + `git push --force-with-lease`，让 PR URL 等收尾写回并入同一次提交），其余 force push 不在权限内 |
| 验证 | 各阶段已完成、经验已分流沉淀、规范审查有结论；归档前必须在当前工作树上跑一次全量测试并观察输出（新鲜验证，引用历史测试结论、「刚才是绿的」都不算）；合并完成后必须在**合并结果**上再跑一次全量测试——合并可能引入语义冲突，两个分支各自绿不代表合并后绿；归档前当前分支等于 `git_branch`，且不等于远程默认分支（用 `git symbolic-ref refs/remotes/origin/HEAD` 读出，不假定分支名） |
| 停止 | 收尾确认方式随模式（见核心原则 4）；两项永远门禁——合并分支、直接改动远程默认分支——任何模式下都必须停下等用户，`autopilot` 遇到时就地降级为门禁模式；丢弃改动、删除分支必须拿到用户键入的精确确认词才执行；force push 仅收尾 amend 场景豁免（对刚推送的 Spec 分支 `--amend` + `--force-with-lease`），其余 force push 仍是门禁并需精确确认词；用户选"暂不归档"则只产出报告即停止 |
| 升级 | 阶段未真正完成、全量测试未绿、规范变更影响面大、或 Git 状态异常（分支不符、在远程默认分支上提交）时，停止并交回用户决策 |

## 核心原则

1. **多角色视角**：通过 TeamLead 收集各角色视角的经验素材，不只是 spec-ender 的独角戏
2. **分流沉淀**：调用 exp-reflect 按权重分流（重大经验 → exp-write，轻量 → Auto Memory）
3. **规范维护审查**：判断本次 Spec 是否产生需要长期遵守的项目规范，必要时更新 AGENTS.md 或 .agents/rules/
4. **确认方式随模式**：`gated` 模式下归档、提交、推送、创建 PR 前都必须用当前运行环境的确认方式询问用户；`autopilot` 模式下可自主 push 工作分支并创建 PR（两者可逆，且 PR 本身就是给人审的入口），但合并分支、直接改动远程默认分支这两项是永远门禁，任何模式下都必须停下等人；force push 仅收尾 amend 场景豁免（对刚推送的 Spec 分支做 `git commit --amend` + `git push --force-with-lease`，这是让收尾只提交一次的既定动作），其余 force push 仍是门禁
5. **GitHub Flow 收尾**：先跑全量测试，绿了之后才出收尾菜单——测试还红着的时候不要问用户「要不要归档」；放行后调用 git-work 提交、推送当前 Spec 分支并创建 PR
6. **报告用 HTML，记忆用 Markdown**：`ender/end-report.html` 遵循 html-report 契约（`rk:*` meta + `.rk-meta` 双轨元信息、`rk-links` / `rk-backlinks` 双向关联、`data-rev` 修订标记）；`spec/context/experience/*.md`、`knowledge/*.md` 保持 Markdown 不变；账本 `.md` / `.html` 皆可

## 工作流程

### 步骤 1：接收任务与接力 AWR 会话

1. 执行 AWR 会话接力与上下文准备：
   ```bash
   # 自动接力上游 spec-reviewer 的会话并转移任务租约（Claim Transfer）
   AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
   bash "$AWR_CP" --work <SPEC-ID> --agent spec-ender --digest "接力开工准备归档" --next-action "执行归档与结项门禁"
   # 绑定当前会话提取全景上下文
   awr work prepare <SPEC-ID> --session <SESSION-ID> --response-view summary
   ```
2. 从 TeamLead 的启动指令中获取：
   - 当前 Spec 的目录路径
   - 确认所有阶段（计划/实现/测试）已完成
   - 当前工作分支（应与 `lead/team-context.md` 的 `git_branch` 一致）
   - base 分支（用 `git symbolic-ref refs/remotes/origin/HEAD` 读远程默认分支，不要假定分支名；`lead/team-context.md` 的 `base_branch` 与之不符时以远程为准并向用户说明）

### 步骤 2：扫描 Spec 目录

读取当前 spec 目录下的所有角色产物：
- `lead/team-context.md`：团队运行上下文（Markdown 运行账本）
- `explorer/exploration-report.html`：探索阶段发现
- `writer/plan.html`：设计方案
- `tester/test-plan.html`：测试策略
- `executor/summary.html`：实现细节
- `tester/test-report.html`：测试过程和结果
- `reviewer/review.html` / `reviewer/update-xxx-review.html`：审查报告（如有）
- `updater/update-xxx.html` / `updater/update-xxx-summary.html`：更新方案和总结（如有）
- `debugger/debug-xxx.html` / `debugger/debug-xxx-fix.html`：问题和修复（如有）

同时读取 `lead/team-context.md` 的运行账本：
- frontmatter 的 `git_branch` / `base_branch` / `pr_url`
- 「决策记录」：本次所有实质取舍及理由——end-report 的「关键决策」小结直接来自此表，无需重新回忆；用 `rk-cal key` 承载
- 「问题闭环记录」：本次遇到并解决的 bug 与过程性问题，供 exp-reflect 分流沉淀

如果 `git_branch` 为空或为 `none`，说明本 Spec 没有使用 GitHub Flow 分支；收尾时仍可归档文档，但提交/PR 步骤需要先询问用户。

### 步骤 3：通过 TeamLead 收集团队成员素材

向 TeamLead 请求恢复或转询相关角色，收集本次开发的经验素材：

```text
询问 spec-writer：本次撰写 writer/plan.html 时遇到的困难、踩过的坑、值得记录的发现？
询问 spec-tester：本次测试过程中的发现、边界情况、改进建议？
询问 spec-executor：本次实现过程中遇到的技术挑战、解决方案、值得复用的模式？
询问 spec-debugger：本次调试的根因分析、修复思路、预防建议？（如有 debug 文档）
询问 spec-reviewer：本次审查中发现的完成度风险、测试缺口或规范建议？（如有 review 文档）
```

等待 TeamLead 转回各角色回复，汇总讨论结果。若运行环境无法恢复角色线程，则基于当前 Spec 目录文档补足对应视角。

### 步骤 4：调用 exp-reflect 分流沉淀

以当前 Spec 目录文档为素材（exp-reflect 会直接读取文档，无需手动整理素材），调用 `/exp-reflect` 并传递目录路径：

```bash
/exp-reflect spec/当前任务目录路径
```

exp-reflect 会根据经验的重要性分流：
- 重大经验（解决了重要问题、有高复用价值）→ `exp-write` 写入正式经验文件
- 轻量知识（小技巧、上下文记忆）→ Auto Memory
- 项目规范、项目偏好或规则变化 → 建议更新 `AGENTS.md` / `.agents/rules/`（这些文件保持 Markdown）

### 步骤 5：项目规范维护审查

归档前轻量审查本次 Spec 是否产生长期规则或长期项目偏好。`AGENTS.md` 保持入口清单定位；只在命中明确、长期有效的变化时更新，不为了“有动作”而改规范。

| 发现内容 | 维护位置 |
|----------|----------|
| 项目名称/一句话身份、核心技术栈摘要、AGENTS 路由或 import 变化 | `AGENTS.md` |
| 启动/部署方式、开发流程细则、长期编码约定、安全规则、日志/审计要求、测试约束、目录/命名规范、产品/前端偏好 | `.agents/rules/*.md` |
| 可复用操作流程（部署、发布、迁移等） | `.agents/skills/sop-xxx/SKILL.md` |
| 项目架构、数据流、模块理解 | `spec/context/knowledge/`（保持 `.md`，被 exp-search 检索） |
| 困境-策略、踩坑经验 | `spec/context/experience/`（保持 `.md`，被 exp-search 检索） |

审查问题：
- 本次是否形成了以后都要遵守的编码/安全/测试/日志/审计规则？
- 本次是否改变了项目身份摘要、AGENTS 入口路由、目录结构、模块边界、启动或部署方式？
- 本次是否形成了长期产品体验、前端样式或协作偏好，需要写入 `.agents/rules/project-preferences.md` 或相关 rules？
- 本次是否暴露了反复出现的问题，需要写入 rules 防止复发？
- 本次是否形成了可机械复用的 SOP，应创建或更新 Skill？

如需更新，先向用户说明将修改哪些规范文件，得到确认后再编辑。

### 步骤 6：创建 ender/end-report.html 并按模式确认归档创建 PR

在当前 Spec 目录下创建 `ender/end-report.html`，按 html-report skill 的固定骨架承载：

- `<head>` 写全 `rk:*` meta（`rk:type=end-report`、`rk:spec-dir`、`rk:role=spec-ender`、`rk:created`、`rk:updated`、`rk:revision`、`rk:mode`、`rk:git-branch`、`rk:base-branch`、`rk:pr-url`、`rk:tags`），并用 `<link rel="rk-plan|rk-summary|rk-test-report|rk-review|rk-ledger" href="...">` 声明关联；`.rk-meta` 人可读镜像同样字段（含运行模式、基准分支与 PR）
- `rk-verdict`（`is-pass` / `is-fail`）一句话给出本次 Spec 的完成结论
- 「修订历史」表固定 5 列（修订/日期/修改人/改了什么/原因），不新增列；后续补 PR URL 等修改时修订号 +1、追加修订历史行、正文用 `data-rev` 标记，不静默改写；「原因」列源于实质取舍时引用账本「决策记录」的决策编号（如 `按 D-003（…）`），纯笔误/措辞/补充直接写清，不编造编号
- 正文章节：完成状态、本轮全量测试的命令与退出码（新鲜验证证据）、已扫描的角色产物路径、经验沉淀结果或无需沉淀的说明、规范维护结果或无需维护的说明、归档/提交/推送/PR 的确认状态（写明按哪种模式放行）、待用户处理的永远门禁项（合并/默认分支改动；force push 仅收尾 amend 场景豁免）
- 关键决策用 `rk-cal key` 小结（取自账本「决策记录」，只写结论与一句话理由并标注 `D-xxx`，决策过程正文不复制进报告），遗留风险用 `rk-cal risk`，需后续观察项用 `rk-cal warn`
- 末尾「关联产物」拆两个 `h3`：「本报告引用」用 `<ul class="rk-links">` + `data-rk-link` 列出全部角色产物（`.html`）与 `<a href="../lead/team-context.md">运行账本</a>`、沉淀的经验/知识 `.md`；「引用本报告」用 `<ul class="rk-backlinks">` + `data-rk-backlink` 列出引用方；本报告新建的每条关联都要到对侧报告的 `rk-backlinks` 补反链，对侧未产出时先标注（待创建）

然后跑一次全量测试并观察输出。**测试全绿之后才出收尾菜单**——红着的时候先把它变绿或交回用户决策，不要问用户「要不要归档」。

**AWR 零缺口硬门禁（Zero-Gap Gate）**：
在提请归档前，执行 AWR 静态结构与组织状态完整性检查：
- **Linux / macOS / Git Bash 环境**：
  ```bash
  if ! command -v awr >/dev/null 2>&1; then
      echo "⚠️ 未安装 awr 命令，跳过 AWR 结构缺口检查"
  elif ! inspect_out=$(awr intake inspect --json 2>/dev/null); then
      echo "❌ AWR 诊断命令执行失败，请检查 .awr/ 配置与源文件语法"
      exit 1
  elif command -v python3 >/dev/null 2>&1; then
      if ! printf "%s" "$inspect_out" | python3 -c 'import sys, json
try:
    data = json.load(sys.stdin)
except Exception as e:
    sys.stderr.write(f"❌ 无法解析 AWR 诊断输出: {e}\n")
    sys.exit(1)

org = data.get("organization")
if not isinstance(org, dict):
    sys.stderr.write("❌ AWR 诊断响应缺少 organization 组织节点\n")
    sys.exit(1)

all_gaps = org.get("gaps", [])
# 过滤阻断性结构缺口（目标未关联、验收项缺失、状态机断裂等）
# 白名单排除项：
# 1. completion_not_checked（未传 --source-sha 时对历史已完成项的审计提示）
# 2. intake_work_only / business_work_missing（项目初始仅有 INTAKE-001 时的脚手架组织提示）
IGNORABLE_CODES = {"completion_not_checked", "intake_work_only", "business_work_missing"}
blocking_gaps = [g for g in all_gaps if g.get("code") not in IGNORABLE_CODES]

if len(blocking_gaps) > 0:
    for bg in blocking_gaps:
        code = bg.get("code", "unknown")
        target = bg.get("target", "-")
        detail = bg.get("detail", "")
        sys.stderr.write(f"   - [{code}] {target}: {detail}\n")
    sys.exit(1)

print("✅ AWR 结构缺口检查通过 (0 Blocking Gaps)")'; then
          exit 1
      fi
  elif command -v jq >/dev/null 2>&1; then
      if ! printf "%s" "$inspect_out" | jq -e '.organization' >/dev/null 2>&1; then
          echo "❌ AWR 诊断响应缺少 organization 组织节点"
          exit 1
      fi
      blocking_count=$(printf "%s" "$inspect_out" | jq -r '[.organization.gaps[]? | select(.code != "completion_not_checked" and .code != "intake_work_only" and .code != "business_work_missing")] | length' 2>/dev/null || echo "error")
      if [ "$blocking_count" = "error" ]; then
          echo "❌ 无法解析 AWR 诊断响应"
          exit 1
      elif [ "$blocking_count" -gt 0 ]; then
          echo "❌ 存在 $blocking_count 个 AWR 阻塞性结构缺口，禁止结项归档！"
          exit 1
      fi
      echo "✅ AWR 结构缺口检查通过 (0 Blocking Gaps)"
  else
      echo "❌ 门禁阻断: 系统未检测到 python3 或 jq 解析器，无法完成 AWR 结构缺口严格审计，拒绝归档！"
      exit 1
  fi
  ```
- **Windows 原生 PowerShell 环境**：
  ```powershell
  if (-not (Get-Command awr -ErrorAction SilentlyContinue)) {
      Write-Host "⚠️ 未安装 awr 命令，跳过 AWR 结构缺口检查" -ForegroundColor Yellow
  } else {
      $errFile = [System.IO.Path]::GetTempFileName()
      $rawJson = & awr intake inspect --json 2>$errFile
      $rawErr = if (Test-Path $errFile) { Get-Content $errFile -Raw -ErrorAction SilentlyContinue } else { "" }
      Remove-Item -Force $errFile -ErrorAction SilentlyContinue
      if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($rawJson)) {
          Write-Host "❌ AWR 诊断命令执行失败，请检查 .awr/ 配置与源文件" -ForegroundColor Red
          if ($rawErr) { Write-Host "AWR 错误: $rawErr" -ForegroundColor Yellow }
          exit 1
      }
      $inspect = $null
      try { $inspect = ($rawJson -join "`n") | ConvertFrom-Json } catch { }
      if (-not $inspect -or -not $inspect.organization) {
          Write-Host "❌ AWR 诊断响应解析失败或缺少 organization 节点" -ForegroundColor Red
          exit 1
      }
      $allGaps = @($inspect.organization.gaps)
      $ignorable = @("completion_not_checked", "intake_work_only", "business_work_missing")
      $blockingGaps = @($allGaps | Where-Object { $ignorable -notcontains $_.code })
      if ($blockingGaps.Count -gt 0) {
          Write-Host "❌ 存在 $($blockingGaps.Count) 个 AWR 阻塞性结构缺口，禁止结项归档！详情:" -ForegroundColor Red
          foreach ($bg in $blockingGaps) {
              Write-Host "   - [$($bg.code)] $($bg.target): $($bg.detail)" -ForegroundColor Red
          }
          exit 1
      }
      Write-Host "✅ AWR 结构缺口检查通过 (0 Blocking Gaps)" -ForegroundColor Green
  }
  ```

若返回非 0 退出码，必须回退排查并闭环工作项的目标关联、验收准则或测试证据，严禁带缺口归档。

**报告契约与测试证据机检（Report Contract & Evidence Gate）**：
零缺口门禁只管 AWR 结构，不管产物形态。以下机检覆盖 html-report 契约与 tdd-discipline 证据三要素，与零缺口门禁同为归档前置硬门禁（依据 2026-09-22 四场景并发实测：tech 7/7 报告违约、debt 7/7 缺反链+11 处行内样式、3/4 场景证据缺退出码/时间戳；本仓历史交付物中亦有同类先例，如 20260917-1600 Spec 的 test-report 8 处行内样式、20260916-2200 tech Spec 全部报告缺 manifest 脚本——全部由此类机检捕获）。

范围声明：**本门禁只扫描本次收尾的 `<SPEC-DIR>`**，历史归档 Spec 的既有偏差不追溯、不阻断；修历史报告属另一件工作，不在本门禁职责内。另注意本门禁只能校验产物**形态**，无法识别事后补写的伪造证据行——产出时效约束（证据必须由测试运行自身产出、禁止手写补写）仍以 `spec-execute/references/tdd-discipline.md` 为准。

- **Linux / macOS / Git Bash 环境**：
  ```bash
  # <SPEC-DIR> 为本 Spec 物理目录，如 spec/versions/v0.1/specs/20260923-1000-feat-示例
  if ! command -v python3 >/dev/null 2>&1; then
      echo "❌ 门禁阻断: 系统缺少 python3，无法执行报告契约机检，拒绝归档！"
      exit 1
  fi
  if ! python3 - "<SPEC-DIR>" <<'PYEOF'
import os, re, sys
spec_dir = sys.argv[1]
if not os.path.isdir(spec_dir):
    sys.stderr.write(f"❌ Spec 目录不存在: {spec_dir}\n"); sys.exit(1)
violations = []
evidence_violations = 0
need_meta = ["rk:type","rk:version","rk:spec-dir","rk:category","rk:role","rk:mode",
             "rk:git-branch","rk:base-branch","rk:created","rk:updated","rk:revision","rk:pr-url"]
need_cls = ["rk-verdict","rk-meta","rk-revs","rk-links","rk-backlinks"]
CODE_SPAN = re.compile(r"(?s)<pre>.*?</pre>|<code>.*?</code>")
def lineno(text, needle):
    i = text.find(needle)
    return text[:i].count("\n") + 1 if i >= 0 else 1
html_count = 0
for root, _, files in os.walk(spec_dir):
    for fn in sorted(files):
        if not fn.endswith(".html"):
            continue
        html_count += 1
        p = os.path.join(root, fn)
        t = open(p, encoding="utf-8").read()
        depth = "../" * os.path.relpath(p, ".").count("/")
        for m in need_meta:
            if f'name="{m}"' not in t:
                violations.append(f"{p}:{lineno(t, '<meta')}: 缺 <meta name=\"{m}\">（<head> 内补齐，Spec 级报告必填）")
        for c in need_cls:
            if c not in t:
                violations.append(f"{p}:{lineno(t, '<body')}: 缺 .{c} 区块（按 html-report 骨架补；rk-backlinks 只要求节存在，无对侧引用时保留空节并标（待创建））")
        css = re.findall(r'href="((?:\.\./)+)html-report/assets/rk-report\.css"', t)
        if not css or css[0] != depth:
            violations.append(f"{p}:{lineno(t, 'rk-report.css')}: assets 相对深度应为 {depth}html-report/assets/，实得 {css}")
        mi, ji = t.find("rk-manifest.js"), t.find("rk-report.js")
        if ji != -1 and (mi == -1 or mi > ji):
            violations.append(f"{p}:{lineno(t, 'rk-report.js')}: rk-manifest.js 必须排在 rk-report.js 之前（defer 按文档序执行，反序则 file:// 导航树为空）")
        # 行内样式/禁 fetch 检查前先剔除 <pre>/<code> 内容：报告在代码引用里讨论这些模式（如修复 HTML 契约的 Spec）是合规叙述，不算违规
        t_visible = CODE_SPAN.sub("", t)
        if 'style="' in t_visible or re.search(r"<style[\s>]", t_visible):
            violations.append(f"{p}:{lineno(t_visible, 'style=')}: 禁止行内样式/<style> 块（样式只改 html-report/assets/rk-report.css）")
        if "fetch(" in t_visible:
            violations.append(f"{p}:{lineno(t_visible, 'fetch(')}: 禁止 fetch 探测同级文件（file:// 必失败，用 rk-manifest.js）")
if html_count == 0:
    violations.append("<SPEC-DIR> 内未发现任何 HTML 角色报告，请确认目录参数")
# 测试证据三要素（tdd-discipline：缺退出码或缺时间戳的证据视为无效）
for base in ("tester/artifacts", "executor/artifacts"):
    d = os.path.join(spec_dir, base)
    for root, _, files in os.walk(d):
        for fn in sorted(files):
            if not (fn.endswith(".log") or fn.endswith(".txt")):
                continue
            p = os.path.join(root, fn)
            t = open(p, encoding="utf-8", errors="replace").read()
            if not re.search(r"^Command:", t, re.M):
                violations.append(f"{p}:1: 缺 Command: 行（必须能看出跑了什么命令）"); evidence_violations += 1
            if not re.search(r"Exit code|_RC=", t):
                violations.append(f"{p}:1: 缺退出码记录（缺退出码按 tdd-discipline 视为无效证据）"); evidence_violations += 1
            if not re.search(r"\d{4}-\d{2}-\d{2}T", t):
                violations.append(f"{p}:1: 缺时间戳（缺时间戳按 tdd-discipline 视为无效证据）"); evidence_violations += 1
if evidence_violations:
    sys.stderr.write("证据三要素被接受的等价形态：命令=「Command: <原文字符串>」行或 runner/框架原生输出中自带的命令回显；"
                     "退出码=「Exit code: N」「_RC=N」「AUDIT_RC=N」之一；时间戳=ISO8601（YYYY-MM-DDTHH:MM:SS，可用 date -Iseconds 取）。\n")
if violations:
    sys.stderr.write(f"❌ 报告契约/证据机检未通过（{len(violations)} 项），禁止结项归档：\n")
    for v in violations:
        sys.stderr.write(f"   - {v}\n")
    sys.exit(1)
print(f"✅ 报告契约与测试证据机检通过（{html_count} 份报告）")
PYEOF
  then
      exit 1
  fi
  ```
- **Windows 原生 PowerShell 环境**：**ps1 对等实现待补**（本机无 pwsh 不可实测；补齐前由 spec-ender 用 python3 完成等价机检——检项与 bash 分支一致：rk:* 必填 meta 含 rk:version/rk:category、rk-verdict/meta/revs/links/backlinks 区块、assets 相对深度、manifest 先于 rk-report.js、零行内样式（剔除代码引用后判断）、证据三要素——并在 `end-report.html` 注明实测过程与结论）。

`gated` 模式下向用户确认：

```text
确认目标：所有阶段已完成，全量测试本轮已在当前工作树上跑过且全绿，经验沉淀与规范审查也已完成。是否确认本 Spec 原位归档，并提交、推送当前分支、创建向目标分支（dev）的 PR/MR？

选项：
- 确认原位归档并创建 PR/MR
- 暂不归档
```

`autopilot` 模式下，由「本轮全量测试的新鲜验证输出 + `ender/end-report.html` 的 `rk-verdict` 完成结论」替代该确认，两者缺一不可放行；自门禁通过的范围只到原位归档状态更新、commit、push 工作分支、创建 PR/MR、以及收尾 amend（`--amend` + `--force-with-lease` 并入 PR/MR URL），触及合并、改动远程默认分支、或非 amend 的 force push 时立即降级为门禁模式等待用户。

### 步骤 7：原位归档（`gated` 用户确认后，`autopilot` 自门禁通过后）

用户选择"确认原位归档并创建 PR/MR"（`autopilot` 下为自门禁通过）：

1. **AWR 机器完工核验与原位归档更新**：
   保留当前 Spec 在所属 Version 的原物理目录（`spec/versions/<version>/specs/<spec-dir>/`），禁止移出目录。
   在 `lead/team-context.md` 中将 `status` 更新为 `archived`，并在所属版本的 `spec/versions/<version>/version-context.md` Spec 清单中将本 Spec 标记为 `done`。
   
   **执行 AWR 官方 0.5.0 机器完工闭环（先 complete 后 end）**：
   当全量测试通过且已通过 `awr evidence add` 注册证据后，在当前活动会话中执行机器完工确认（传入官方三字段 JSON，`source_sha` 必须 40 位，`criterion` 与台账逐字一致）。完工输入按 `<run-id>` 落**项目内**路径，严禁固定共享路径（并发多 Spec 会互相覆盖导致静默错绑）：
   ```bash
   mkdir -p "tester/artifacts/test-logs/<run-id>"
   cat > "tester/artifacts/test-logs/<run-id>/complete-input.json" <<EOF
   {
     "version": 1,
     "source_sha": "$(git rev-parse HEAD)",
     "acceptance": [
       {
         "criterion": "<台账 acceptance 第 1 项原文>",
         "evidence": ["<EVIDENCE-EXTERNAL-KEY>"]
       }
     ]
   }
   EOF
   REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
   awr work complete --session <ENDER_SESSION_ID> --reason "全部验收通过且证据已完整绑定" --input "tester/artifacts/test-logs/<run-id>/complete-input.json" --expected-revision "$REV" <SPEC-ID> --json
   ```
   *注：`work complete` 执行成功后，AWR 会自动向 `work-ledger.yaml` 注入 `verification: {evidence_level: locally_verified}` 属性并将工作项置为终态 `completed`。注意 AWR 只注入终态标记，**不会刷新 `summary` / `next_action`**——收尾时必须手工把这两项更新为结论文案（如「已交付并归档，验收标准逐条达成」），否则终态台账仍停留在开工推进文案，误导后续读者；AWR 回写可能使用带引号键/flow 风格，人工维护时保持 YAML block 风格，勿再制造语法漂移。*

   **释放租约并复核 doctor（支持直接关闭与同角色脚本释放）**：
   **会话释放与接力状态契约**：
   - **推荐主路径（直接关闭会话）**：由当前持有活跃会话的 `spec-ender` 现读 CAS 版本号并直接执行 `awr session end`：
     ```bash
     # work complete 重写台账后 project_revision 会递增，必须现读最新 CAS 版本号
     LATEST_REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
     awr session end --session <ENDER_SESSION_ID> --outcome ended --expected-revision "$LATEST_REV"
     awr doctor  # 终态复核：0 findings
     ```
   - **同角色脚本释放（实测兼容）**：若 `spec-ender` 此前已通过脚本开工并持有该工作项的活动会话，在 `work complete` 之后调用 `rk-awr-checkpoint.sh --end`（或在 `work complete` 遭遇失败需要退出时）脚本会自动复用同角色活跃会话并成功释放租约（退出码为 0，`doctor` 0 findings）。
   - **边界异常防范**：工作项转为终态 `completed` 后，AWR 禁止在其上执行**跨角色接力**（此时尝试 `resume` 会报 `InvalidTransition: resume requires known nonterminal work`）或**新建会话**（此时尝试 `session start` 会报 `DependencyBlocked: source status is completed`）。因此，如果未能直接获取 `<ENDER_SESSION_ID>`，必须确保仅由持有该会话的原角色执行释放。
2. 调用 `/git-work` 的“完成 Spec 分支”模式：
   - 确认当前分支不等于远程默认分支（`git symbolic-ref refs/remotes/origin/HEAD` 读出，不要假定分支名）
   - 确认当前分支等于 `lead/team-context.md` 的 `git_branch`
   - 审查 diff
   - commit
   - push
   - 创建面向 `dev` 的 PR/MR（平台中立）或输出 compare URL
3. 如果获得 PR/MR URL，写回归档后 `lead/team-context.md` 的 `pr_url` 字段，以及 `ender/end-report.html` 的 `<meta name="rk:pr-url">` 与 `.rk-meta` PR 两处（按修订规范修订号 +1、追加修订历史行），然后**并入同一次提交**，不产生第二次提交：

   ```bash
   git add "<spec-docs>"
   git commit --amend --no-edit
   git push --force-with-lease origin "<branch-name>"
   ```

   `--force-with-lease` 只覆盖自己刚推送的 Spec 分支，若远程分支被他人改动会拒绝，不会误覆盖。
4. 合并由用户执行或明确放行；一旦发生合并，必须在合并结果上重跑全量测试并观察输出，绿了才算收尾完成
5. 全过程中若出现需要丢弃改动（`git checkout --` / `reset --hard` / `stash drop`）、删除分支的情形，必须停下并要求用户键入精确确认词（如 `discard` / `delete-branch`）；第 3 步的 amend + force-with-lease 是用户确认过的收尾既定动作，无需逐次确认；其它任何 force push（不是 amend 自己刚推的 Spec 分支）仍是门禁，必须停下并要求精确确认词 `force-push`；「差不多同意」「你看着办」「随你」不构成授权，`autopilot` 模式同样不豁免

用户选择"暂不归档"：
- 跳过归档步骤，直接执行步骤 8

### 步骤 8：通知 TeamLead 完成

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-ender 自己的收尾任务行
- 「产物」指向 `ender/end-report.html`
- 「状态」标记为 `done`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-ender`
- 只修改「任务进度」，不要修改 TeamLead 控制面区块；PR URL 等控制面字段由 TeamLead 更新

```text
通知 TeamLead：收尾工作完成，本次 Spec 团队实例结束；项目级角色定义保留。
```

## 与其他角色的协作

```
[所有其他阶段完成]
TeamLead → spec-ender 开始
spec-ender → 向 TeamLead 请求各角色经验素材
TeamLead → 恢复/转询各角色 → 回复经验素材
spec-ender → 汇总 + 调用 exp-reflect → 沉淀经验
spec-ender → 规范维护审查 → 必要时更新 AGENTS.md / .agents/rules/
spec-ender → ender/end-report.html
spec-ender → 全量测试绿 → 按模式确认归档（`gated` 问用户 / `autopilot` 凭新鲜验证自门禁）
[如归档] spec-ender → 移动目录 → git-work 提交 + 推送 + 创建 PR
spec-ender → 通知 TeamLead 完成
TeamLead → 通知用户整个流程完成，本次 Spec 团队实例结束
```

## 后续动作

完成收尾后确认：
1. 已通过 TeamLead 收集所有相关角色素材，或在角色线程不可恢复时基于 Spec 文档补足
2. 已调用 exp-reflect 完成分流沉淀
3. 已完成项目规范维护审查；如需更新，已获得用户确认并完成修改
4. 已在当前工作树上跑过全量测试并观察输出，绿了之后才出的收尾菜单
5. 已按模式完成归档确认（`gated` 用户确认 / `autopilot` 新鲜验证 + `rk-verdict`）
6. 如归档：已完成原位归档（保留原物理目录，禁止移出目录）+ 已调用 git-work 提交、推送、创建 PR；合并、改动远程默认分支均留给用户；force push 仅以收尾 amend 形式用于并入 PR URL
7. 如有 PR URL：已写回 `lead/team-context.md` 和 `ender/end-report.html`（含 `rk:pr-url` meta 与 `.rk-meta` 镜像，且留下修订痕迹），并通过 amend + force-with-lease 并入同一次提交（收尾历史只有一次提交）
8. 如已发生合并：已在合并结果上重跑全量测试并观察输出
9. 已更新 `lead/team-context.md` 的「任务进度」中自己的收尾任务行
10. 已通知 TeamLead

### 常见陷阱
- 跳过多角色讨论，只用自己的视角沉淀经验（会遗漏各角色的独特发现）
- 把详细规范或一次性实现细节写进 AGENTS.md，导致入口文件膨胀
- 把一次性实现细节写进 rules，导致长期规范失真
- 本次形成了长期安全/日志/测试约束，却忘记更新 .agents/rules/
- 在远程默认分支上直接提交 Spec 成果，或把默认分支名写死成固定值（应读 `git symbolic-ref refs/remotes/origin/HEAD`）
- 全量测试还红着就出收尾菜单问用户要不要归档
- 合并后不在合并结果上重跑全量测试，拿合并前两边各自的绿当结论
- 把「你看着办」当成丢弃改动、删分支或 force push（非收尾 amend 场景）的授权（必须拿到精确确认词）
- `autopilot` 模式下自行合并分支或改动远程默认分支（永远门禁，必须降级等人）
- 创建 PR 前没有确认当前分支与 `lead/team-context.md` 的 `git_branch` 一致
- `gated` 模式下未询问用户就直接归档；或 `autopilot` 模式下拿不出本轮全量测试输出就自门禁放行
- 沉淀完成后忘记通知 TeamLead
- 归档后没检查报告里 `html-report/assets/` 的相对层级，`file://` 打开丢样式
- 补 PR URL 时直接改写 `end-report.html` 却不递增修订号、不追加修订历史行
- 只更新 `.rk-meta` 却漏了 `<head>` 的 `rk:*` meta（或反之），元信息双轨不完整
- 把经验/知识记忆改成 HTML（必须保持 Markdown 供 `exp-search` 检索；账本不受此限）