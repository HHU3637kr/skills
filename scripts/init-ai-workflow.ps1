<#
.SYNOPSIS
    Enterprise AI Coding Workflow 一键初始化脚本 (Windows 原生 PowerShell 版本)
    基于 R&K Flow 规范 (HHU3637kr/skills) 与 AWR (Agent Work Runtime ≥0.5.0)
    CLI 中立架构：根目录 AGENTS.md + .agents/roles/ 权威源 + 参数化运行时适配

.DESCRIPTION
    适用于 Windows 10/11 (Windows PowerShell 5.1 或 PowerShell 7+)。
    采用免管理员权限、免开启开发者模式的 NTFS Junction 目录联接技术。

.PARAMETER TargetDir
    目标项目根目录，默认当前目录。

.PARAMETER SkillsRepoUrl
    规范库 Git 地址，支持环境变量 SKILLS_REPO_URL 覆盖。

.PARAMETER Runtime
    客户端运行时适配类型：none (默认纯中立)、omp、claude、codex。
#>
[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [string]$TargetDir = (Get-Location).Path,

    [Parameter(Position = 1)]
    [string]$SkillsRepoUrl = $(if ($env:SKILLS_REPO_URL) { $env:SKILLS_REPO_URL } else { "https://github.com/HHU3637kr/skills.git" }),

    [ValidateSet("none", "omp", "claude", "codex")]
    [string]$Runtime = "none"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PSScriptRoot }
$ErrorActionPreference = "Stop"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# 预先确保目标目录存在，避免 Resolve-Path 抛出异常
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
}

# 解析绝对路径
$TargetDir = (Resolve-Path -Path $TargetDir).Path
$ProjectName = Split-Path -Leaf $TargetDir
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " 🚀 初始化企业 AI Coding 规范体系 (Windows PowerShell / CLI 中立)" -ForegroundColor Cyan
Write-Host " 目标目录: $TargetDir"
Write-Host " 项目名称: $ProjectName"
Write-Host " Skills源: $SkillsRepoUrl"
Write-Host " 运行时:   $Runtime"
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. 依赖检测
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "❌ 错误: 系统未安装或未将 git.exe 加入 PATH。"
    exit 1
}

$HasAwr = $false
if (Get-Command awr -ErrorAction SilentlyContinue) {
    $HasAwr = $true
} else {
    Write-Host "⚠️ 提示: 系统尚未检测到 awr 命令 (建议全局安装最新版: npm install -g @originoneai/agent-work-runtime@latest 或 cargo install)" -ForegroundColor Yellow
}

Set-Location -Path $TargetDir

# 2. 检查或初始化 Git 仓库
if (-not (Test-Path ".git")) {
    Write-Host "📦 正在初始化 Git 仓库 (默认分支: dev)..." -ForegroundColor Green
    git init -b dev | Out-Null
}

# 3. 克隆或增量拉取 Skills 规范库
Write-Host "📥 正在配置 Skills 依赖库 (.agents\skills)..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path ".agents" | Out-Null
if (Test-Path ".agents\skills\.git") {
    Write-Host "🔄 .agents\skills 已存在且为 Git 仓库，执行增量更新..." -ForegroundColor Green
    git -C ".agents\skills" pull --ff-only 2>$null
} else {
    $skillsBak = $null
    if (Test-Path ".agents\skills") {
        $skillsBak = ".agents\skills.bak-" + (Get-Date).ToString("yyyyMMdd-HHmmss")
        Write-Host "⚠️ 警告: 检测到 .agents\skills 已存在但不是 Git 仓库，正在安全备份至 $skillsBak..." -ForegroundColor Yellow
        Move-Item -Path ".agents\skills" -Destination $skillsBak -Force
    }
    git clone --depth=1 $SkillsRepoUrl ".agents\skills"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 错误: 克隆规范库失败 ($SkillsRepoUrl)" -ForegroundColor Red
        if ($skillsBak -and (Test-Path $skillsBak)) {
            Write-Host "🔄 正在自动回滚还原既有 .agents\skills..." -ForegroundColor Yellow
            if (Test-Path ".agents\skills") { Remove-Item -Recurse -Force ".agents\skills" }
            Move-Item -Path $skillsBak -Destination ".agents\skills" -Force
        }
        exit 1
    }
}

# 4. 建立免管理员权限的 NTFS Junction (目录联接)
Write-Host "🔗 正在创建免提权 NTFS Junction 目录联接..." -ForegroundColor Green

function New-JunctionSafely {
    param (
        [string]$Path,
        [string]$Target
    )
    if (Test-Path $Path) {
        $item = Get-Item $Path -Force
        if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            $item.Delete()
        } else {
            $timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
            $backupPath = "$Path.bak-$timestamp"
            Write-Host "⚠️ 警告: 检测到 $Path 为普通物理目录，正在安全备份至 $backupPath..." -ForegroundColor Yellow
            Move-Item -Path $Path -Destination $backupPath -Force
        }
    }
    New-Item -ItemType Junction -Path $Path -Target $Target | Out-Null
}

$SkillsAbsPath = Join-Path $TargetDir ".agents\skills"
$HtmlReportAbsPath = Join-Path $SkillsAbsPath "html-report"

New-JunctionSafely -Path (Join-Path $TargetDir "html-report") -Target $HtmlReportAbsPath

# 5. 落地项目级企业治理规则 (.agents\rules\)
Write-Host "📜 正在固化企业治理规则 (.agents\rules\)..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path ".agents\rules" | Out-Null
if (Test-Path ".agents\skills\.agents\rules") {
    Get-ChildItem -Path ".agents\skills\.agents\rules" -File | ForEach-Object {
        $destFile = Join-Path ".agents\rules" $_.Name
        if (-not (Test-Path $destFile)) {
            Copy-Item -Path $_.FullName -Destination $destFile -Force
        }
    }
}

# 6. 落地 CLI 中立角色权威定义 (.agents\roles\)
Write-Host "🎭 正在固化 CLI 中立角色权威定义 (.agents\roles\)..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path ".agents\roles" | Out-Null
$rolesSource = if (Test-Path ".agents\skills\.agents\roles") {
    ".agents\skills\.agents\roles"
} elseif ($ScriptDir -and (Test-Path (Join-Path $ScriptDir "..\.agents\roles"))) {
    Join-Path $ScriptDir "..\.agents\roles"
} else { $null }

if ($rolesSource) {
    Get-ChildItem -Path $rolesSource -File | ForEach-Object {
        $destFile = Join-Path ".agents\roles" $_.Name
        if (-not (Test-Path $destFile)) {
            Copy-Item -Path $_.FullName -Destination $destFile -Force
        }
    }
}

$RequiredSkillMap = @{
    "spec-explorer" = "spec-explore"
    "spec-writer"   = "spec-write"
    "spec-tester"   = "spec-test"
    "spec-executor" = "spec-execute"
    "spec-debugger" = "spec-debug"
    "spec-reviewer" = "spec-review"
    "spec-ender"    = "spec-end"
}

function Get-CanonicalRoleContent {
    param ([string]$Role)
    $skill = if ($RequiredSkillMap.ContainsKey($Role)) { $RequiredSkillMap[$Role] } else { $Role -replace '^spec-', 'spec-' }
    $inPlaceNote = if ($Role -eq "spec-ender") { "`n  - in-place archived Spec directory" } else { "" }
@"
---
role_id: $Role
required_skill: $skill
purpose: R&K Flow $Role 专职角色定义
activation: TeamLead 按阶段流转驱动
communication: TeamLead-mediated
inputs:
  - task_description
  - spec_dir
outputs:
  - status$inPlaceNote
rules:
  - 遵循 R&K Flow 对应 Skill 规约执行。
---

# $Role

负责 R&K Flow 工作流中 $Role 阶段的职责履行与产物交付。
"@
}

$Roles = @("spec-explorer", "spec-writer", "spec-tester", "spec-executor", "spec-debugger", "spec-reviewer", "spec-ender")
foreach ($role in $Roles) {
    $roleFile = Join-Path ".agents\roles" "$role.md"
    if (-not (Test-Path $roleFile)) {
        $roleContent = Get-CanonicalRoleContent -Role $role
        [System.IO.File]::WriteAllText((Join-Path $TargetDir $roleFile), $roleContent, $Utf8NoBom)
    }
}

# 6.1 固化 AWR 检查点自动化脚本 (scripts\rk-awr-checkpoint.{ps1,sh})
New-Item -ItemType Directory -Force -Path "scripts" | Out-Null
if (Test-Path ".agents\skills\scripts\rk-awr-checkpoint.ps1") {
    Copy-Item -Path ".agents\skills\scripts\rk-awr-checkpoint.ps1" -Destination "scripts\rk-awr-checkpoint.ps1" -Force
} elseif ($ScriptDir -and (Test-Path (Join-Path $ScriptDir "rk-awr-checkpoint.ps1"))) {
    Copy-Item -Path (Join-Path $ScriptDir "rk-awr-checkpoint.ps1") -Destination "scripts\rk-awr-checkpoint.ps1" -Force
}
if (Test-Path ".agents\skills\scripts\rk-awr-checkpoint.sh") {
    Copy-Item -Path ".agents\skills\scripts\rk-awr-checkpoint.sh" -Destination "scripts\rk-awr-checkpoint.sh" -Force
} elseif ($ScriptDir -and (Test-Path (Join-Path $ScriptDir "rk-awr-checkpoint.sh"))) {
    Copy-Item -Path (Join-Path $ScriptDir "rk-awr-checkpoint.sh") -Destination "scripts\rk-awr-checkpoint.sh" -Force
}

# 7. 生成标准根入口 (AGENTS.md)
if (-not (Test-Path "AGENTS.md")) {
    Write-Host "📝 正在生成标准薄入口 (AGENTS.md)..." -ForegroundColor Green
    $agentsContent = @"
# $ProjectName — 项目约定

## 项目身份
- **类型**: 企业应用服务
- **版本控制**: \`dev + release\` 分支流（PR/MR 审查）

## 规则与技能导入
@import .agents/rules/
@import .agents/skills/

## 文档与架构规约
- **三级架构规范**：遵循 R&K Flow「项目 → Version → Spec」三级架构（详见 \`.agents/rules/spec-workflow.md\`）。
  - 角色定义权威源：\`.agents/roles/\`
  - 版本空间：\`spec/versions/<version>/\`
  - 经验知识库：\`spec/context/experience/\` 与 \`spec/context/knowledge/\`
- **阶段与提交门禁**：
  - \`spec → plan → 执行\`，每个阶段边界必须取得人的确认；\`git commit\`、\`git push\`、开 MR 一律先经人确认。
"@
    [System.IO.File]::WriteAllText((Join-Path $TargetDir "AGENTS.md"), $agentsContent, $Utf8NoBom)
}

# 8. 按需生成单一运行时适配
switch ($Runtime) {
    "omp" {
        Write-Host "⚙️ 正在装配 OMP 运行时专属适配 (.omp\agents\)..." -ForegroundColor Green
        New-Item -ItemType Directory -Force -Path ".omp\agents" | Out-Null
        foreach ($role in $Roles) {
            $ompFile = Join-Path ".omp\agents" "$role.md"
            if (-not (Test-Path $ompFile)) {
                $ompContent = @"
---
name: $role
description: R&K Flow $role 角色 OMP 适配
thinkingLevel: high
spawns: ""
---

You are $role in the R&K Flow Spec workflow.
Read \`.agents/roles/$role.md\` and follow the referenced protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
"@
                [System.IO.File]::WriteAllText((Join-Path $TargetDir $ompFile), $ompContent, $Utf8NoBom)
            }
        }
    }
    "claude" {
        Write-Host "⚙️ 正在装配 Claude Code 运行时专属适配 (.claude\)..." -ForegroundColor Green
        New-Item -ItemType Directory -Force -Path ".claude\agents" | Out-Null
        New-JunctionSafely -Path (Join-Path $TargetDir ".claude\skills") -Target $SkillsAbsPath
        foreach ($role in $Roles) {
            $claudeFile = Join-Path ".claude\agents" "$role.md"
            if (-not (Test-Path $claudeFile)) {
                $claudeContent = @"
---
name: $role
description: R&K Flow $role 角色 Claude Code 适配
---

You are $role in the R&K Flow Spec workflow.
First read \`.agents/roles/$role.md\` for your authoritative role definition and rules.
"@
                [System.IO.File]::WriteAllText((Join-Path $TargetDir $claudeFile), $claudeContent, $Utf8NoBom)
            }
        }
    }
    "codex" {
        Write-Host "⚙️ 正在装配 Codex 运行时专属适配 (.codex\)..." -ForegroundColor Green
        New-Item -ItemType Directory -Force -Path ".codex\agents" | Out-Null
        New-JunctionSafely -Path (Join-Path $TargetDir ".codex\skills") -Target $SkillsAbsPath
        if (-not (Test-Path ".codex\config.toml")) {
            $codexConfig = @"
[agents]
max_threads = 7
max_depth = 1
"@
            [System.IO.File]::WriteAllText((Join-Path $TargetDir ".codex\config.toml"), $codexConfig, $Utf8NoBom)
        }
        foreach ($role in $Roles) {
            $codexName = $role -replace '-', '_'
            $codexFile = Join-Path ".codex\agents" "$role.toml"
            if (-not (Test-Path $codexFile)) {
                $codexContent = @"
name = "$codexName"
description = "R&K Flow $role 角色 Codex 适配"
developer_instructions = """
You are $role in the R&K Flow Spec workflow.
First read \`.agents/roles/$role.md\` for your authoritative role definition and rules.
"""
"@
                [System.IO.File]::WriteAllText((Join-Path $TargetDir $codexFile), $codexContent, $Utf8NoBom)
            }
        }
    }
    default {
        Write-Host "ℹ️ 运行模式保持纯中立 (none)，未生成任何特定客户端适配目录。" -ForegroundColor Gray
    }
}

# 9. 搭建三级架构空间与经验知识库
Write-Host "🏗️ 正在构建三级架构与经验库骨架 (spec\)..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path "spec\versions" | Out-Null
New-Item -ItemType Directory -Force -Path "spec\context\experience" | Out-Null
New-Item -ItemType Directory -Force -Path "spec\context\knowledge" | Out-Null

if (-not (Test-Path "spec\versions\README.md")) {
    $versionsReadme = @"
# 架构与版本空间 (Versions Space)
遵循 R&K Flow 三级架构（\`Project → Version → Spec\`），后续版本规划与 Spec 均在此目录下建立。
"@
    [System.IO.File]::WriteAllText((Join-Path $TargetDir "spec\versions\README.md"), $versionsReadme, $Utf8NoBom)
}

if (-not (Test-Path "spec\context\experience\index.md")) {
    $expIndex = @"
# 经验记忆索引 (Experience Index)
记录开发中沉淀的重大「困境-策略对」经验。每次开始复杂任务前，由 \`exp-search\` 先读本表，命中后再按需加载对应详情文件。

| ID | 标题 | 关键词 | 适用场景 | 一句话策略 | 详情文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| EXP-001 | 占位示例 | 经验, 样例 | 项目初始化 | 遇到复杂技术陷阱时通过 exp-reflect 沉淀到此处 | - |
"@
    [System.IO.File]::WriteAllText((Join-Path $TargetDir "spec\context\experience\index.md"), $expIndex, $Utf8NoBom)
}

if (-not (Test-Path "spec\context\knowledge\index.md")) {
    $knowIndex = @"
# 知识记忆索引 (Knowledge Index)
记录项目全局架构、核心数据流分析与重大技术调研结论。

| ID | 标题 | 类型 | 关键词 | 一句话概述 | 详情文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| KNOW-001 | 系统核心架构与数据流 | 项目理解 | 架构, 数据流 | 系统端到端核心数据流转链路说明 | - |
"@
    [System.IO.File]::WriteAllText((Join-Path $TargetDir "spec\context\knowledge\index.md"), $knowIndex, $Utf8NoBom)
}

# 10. 基础目标与工作台账 (AWR 核心源)
if (-not (Test-Path "GOALS.md")) {
    $goalsContent = @"
# Project goal {#intake-goal status=active}

$ProjectName 业务开发、特性演进与代码质量保障。
- **范围**：核心业务模块及相关接口。
- **验收准则**：系统架构稳定，代码规范统一，功能满足业务诉求。
"@
    [System.IO.File]::WriteAllText((Join-Path $TargetDir "GOALS.md"), $goalsContent, $Utf8NoBom)
}

if (-not (Test-Path "work-ledger.yaml")) {
    $ledgerContent = @"
work_items:
  - id: INTAKE-001
    kind: intake
    title: 核实项目目标、现状与下一步交付
    status: ready
    goal: "goal#intake-goal"
    priority: P0
    required: true
    depends_on: []
    acceptance:
      - 逐项确认目标、已有实现、未完成工作和阻塞，保留来源引用。
      - 将不能确定的进度标记待核实，形成下一项可执行工作的验收条件。
    next_action: 运行 awr intake inspect，按缺项读取原始资料；补齐目标引用、验收和下一步后再次复检。
    summary: 这是新建的接入工作；不代表已有项目功能尚未实现或已经通过验收。
"@
    [System.IO.File]::WriteAllText((Join-Path $TargetDir "work-ledger.yaml"), $ledgerContent, $Utf8NoBom)
}

# 11. 配置与初始化 AWR 运行时
if ($HasAwr) {
    Write-Host "⚙️ 正在初始化 AWR 运行时状态机..." -ForegroundColor Green
    New-Item -ItemType Directory -Force -Path ".awr" | Out-Null
    $tmpManifest = [System.IO.Path]::GetTempFileName() + ".toml"
    $manifestContent = @"
[project]
name = "$ProjectName"
authority_mode = "source_first"
authorized_roots = []
context_profile = "minimal"

[[sources]]
domain = "goal"
role = "primary"
path = "GOALS.md"
adapter = "markdown-heading-v1"
[sources.options]
status = "active"
key_prefix = "goal"

[[sources]]
domain = "ledger"
role = "primary"
path = "work-ledger.yaml"
adapter = "yaml-ledger-v1"
[sources.options]

[[sources]]
domain = "rules"
role = "primary"
path = ".agents/rules/spec-workflow.md"
adapter = "markdown-rules-v1"
[sources.options]
severity = "soft"
scope = "project"
value = "*"
"@
    [System.IO.File]::WriteAllText($tmpManifest, $manifestContent, $Utf8NoBom)
    if (-not (Test-Path ".awr/project.toml")) {
        try {
            $initOutput = & awr init --project . --manifest $tmpManifest --accept 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ 错误: AWR 项目初始化失败: $initOutput" -ForegroundColor Red
                Remove-Item -Force $tmpManifest -ErrorAction SilentlyContinue
                exit 1
            }
        } catch {
            Write-Host "❌ 错误: AWR 项目初始化异常: $_" -ForegroundColor Red
            Remove-Item -Force $tmpManifest -ErrorAction SilentlyContinue
            exit 1
        }
    }
    Remove-Item -Force $tmpManifest -ErrorAction SilentlyContinue
    try {
        $reindexOutput = & awr source reindex 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 错误: AWR 源索引 (reindex) 失败: $reindexOutput" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ 错误: AWR 源索引异常: $_" -ForegroundColor Red
        exit 1
    }
}

# 12. 更新 .gitignore（幂等）
Write-Host "🛡️ 正在更新 .gitignore 过滤规则..." -ForegroundColor Green
$gitignorePath = Join-Path $TargetDir ".gitignore"
if (-not (Test-Path $gitignorePath)) {
    New-Item -ItemType File -Path $gitignorePath | Out-Null
}

$ignoreEntries = @(
    "",
    "# ==============================================================================",
    "# AI Coding Workflow 忽略规则",
    "# ==============================================================================",
    "# AWR 本地运行时状态数据库",
    ".awr/state.db",
    ".awr/state.db-*",
    ".awr/artifacts/",
    ".awr/mutations/",
    ".awr/cache/",
    ".awr/clients/",
    ".awr/executions/",
    ".awr-backups/",
    "*.bak-*",
    "",
    "# Skills 单版本源与共享样式",
    ".agents/skills/",
    "html-report",
    "",
    "# 本地 Agent 客户端私有适配（按需本地生成，不污染团队仓库）",
    ".omp/",
    ".claude/",
    ".codex/"
)

$currentContent = Get-Content -Path $gitignorePath -ErrorAction SilentlyContinue
$newContent = [System.Collections.Generic.List[string]]::new()
if ($currentContent) {
    $newContent.AddRange($currentContent)
}

if (-not ($newContent -contains "# AI Coding Workflow 忽略规则")) {
    foreach ($entry in $ignoreEntries) {
        $newContent.Add($entry)
    }
}

[System.IO.File]::WriteAllLines($gitignorePath, $newContent, $Utf8NoBom)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " 🎉 AI Coding 工作流初始化成功！(CLI 中立架构)" -ForegroundColor Cyan
Write-Host " 已就绪组件:"
Write-Host "  - 通用薄入口:     AGENTS.md"
Write-Host "  - 企业治理规范:   .agents\rules\"
Write-Host "  - 中立角色权威源: .agents\roles\"
Write-Host "  - 规范库依赖:     .agents\skills\"
Write-Host "  - 三级架构空间:   spec\versions\ & spec\context\"
Write-Host "  - AWR 目标与台账: GOALS.md & work-ledger.yaml"
Write-Host "  - 客户端适配模式: $Runtime"
Write-Host "=================================================================" -ForegroundColor Cyan
