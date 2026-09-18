<#
.SYNOPSIS
    Enterprise AI Coding Workflow 一键初始化脚本 (Windows 原生 PowerShell 版本)
    基于 R&K Flow 规范 (HHU3637kr/skills) 与 AWR (Agent Work Runtime 0.4.0)

.DESCRIPTION
    适用于 Windows 10/11 (Windows PowerShell 5.1 或 PowerShell 7+)。
    采用免管理员权限、免开启开发者模式的 NTFS Junction 目录联接技术。

.PARAMETER TargetDir
    目标项目根目录，默认当前目录。

.PARAMETER SkillsRepoUrl
    规范库 Git 地址，支持环境变量 SKILLS_REPO_URL 覆盖。
#>
[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [string]$TargetDir = (Get-Location).Path,

    [Parameter(Position = 1)]
    [string]$SkillsRepoUrl = $(if ($env:SKILLS_REPO_URL) { $env:SKILLS_REPO_URL } else { "https://github.com/HHU3637kr/skills.git" })
)

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
Write-Host " 🚀 初始化企业 AI Coding 规范体系 (Windows PowerShell)" -ForegroundColor Cyan
Write-Host " 目标目录: $TargetDir"
Write-Host " 项目名称: $ProjectName"
Write-Host " Skills源: $SkillsRepoUrl"
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
    Write-Host "⚠️ 提示: 系统尚未检测到 awr 命令 (建议全局安装: npm install -g @originoneai/agent-work-runtime@0.4.0 或 cargo install)" -ForegroundColor Yellow
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
    Write-Host "🔄 .agents\skills 已存在，执行增量更新..."
    git -C ".agents\skills" pull --ff-only 2>$null
} else {
    if (Test-Path ".agents\skills") {
        Remove-Item -Recurse -Force ".agents\skills"
    }
    git clone --depth=1 $SkillsRepoUrl ".agents\skills"
}

# 4. 建立免管理员权限的 NTFS Junction (目录联接)
Write-Host "🔗 正在创建免提权 NTFS Junction 目录联接..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path ".omp" | Out-Null

# 辅助函数：安全建立 Junction（防破坏普通目录）
function New-JunctionSafely {
    param (
        [string]$Path,
        [string]$Target
    )
    if (Test-Path $Path) {
        $item = Get-Item $Path -Force
        # 如果已是 Junction 或符号链接，先移除重置
        if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            $item.Delete()
        } else {
            # 普通物理目录：自动重命名备份，严禁硬删除用户既有数据
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

New-JunctionSafely -Path (Join-Path $TargetDir ".omp\skills") -Target $SkillsAbsPath
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

# 6. 生成标准薄入口 (.omp\AGENTS.md)
if (-not (Test-Path ".omp\AGENTS.md")) {
    Write-Host "📝 正在生成标准薄入口 (.omp\AGENTS.md)..." -ForegroundColor Green
    $agentsContent = @"
# $ProjectName — 项目约定

## 项目身份
- **类型**: 企业应用服务
- **运行时**: OMP (Oh My Pi) + AWR (Agent Work Runtime 0.4.0)
- **版本控制**: \`dev + release\` 分支流（PR/MR 审查）

## 规则与技能导入
@import .agents/rules/
@import .agents/skills/

## 文档与架构规约
- **三级架构规范**：遵循 R&K Flow「项目 → Version → Spec」三级架构（详见 \`.agents/rules/spec-workflow.md\`）。
  - 版本空间：\`spec/versions/<version>/\`
  - 经验知识库：\`spec/context/experience/\` 与 \`spec/context/knowledge/\`
- **阶段与提交门禁**：
  - \`spec → plan → 执行\`，每个阶段边界必须取得人的确认；\`git commit\`、\`git push\`、开 MR 一律先经人确认。
"@
    [System.IO.File]::WriteAllText((Join-Path $TargetDir ".omp\AGENTS.md"), $agentsContent, $Utf8NoBom)
}

# 7. 搭建三级架构空间与经验知识库
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

# 8. 基础目标与工作台账 (AWR 核心源)
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

# 9. 配置与初始化 AWR 运行时
if ($HasAwr) {
    Write-Host "⚙️ 正在初始化 AWR 运行时状态机..." -ForegroundColor Green
    New-Item -ItemType Directory -Force -Path ".awr" | Out-Null
    $tmpManifest = [System.IO.Path]::GetTempFileName()
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
"@
    [System.IO.File]::WriteAllText($tmpManifest, $manifestContent, $Utf8NoBom)
    try {
        & awr init --project . --manifest $tmpManifest --accept 2>$null | Out-Null
        & awr source reindex 2>$null | Out-Null
    } finally {
        if (Test-Path $tmpManifest) { Remove-Item -Force $tmpManifest }
    }
}

# 10. 更新 .gitignore（幂等追加）
Write-Host "🛡️ 正在更新 .gitignore 过滤规则..." -ForegroundColor Green
$gitIgnorePath = Join-Path $TargetDir ".gitignore"
if (-not (Test-Path $gitIgnorePath)) {
    New-Item -ItemType File -Path $gitIgnorePath | Out-Null
}

$ignoreEntries = @(
    "# ==============================================================================",
    "# AI Coding Workflow 忽略规则",
    "# ==============================================================================",
    ".awr/state.db",
    ".awr/state.db-*",
    ".awr/artifacts/",
    ".awr/mutations/",
    ".awr/cache/",
    ".awr/clients/",
    ".awr/executions/",
    ".agents/skills/",
    "html-report",
    ".omp/skills"
)

$currentLines = @()
if (Test-Path $gitIgnorePath) {
    $content = Get-Content $gitIgnorePath -Encoding UTF8
    if ($content) { $currentLines = @($content) }
}
$newLines = New-Object 'System.Collections.Generic.List[string]'
foreach ($line in $currentLines) { $newLines.Add($line) }
foreach ($entry in $ignoreEntries) {
    if (-not ($currentLines -contains $entry)) {
        $newLines.Add($entry)
    }
}

    [System.IO.File]::WriteAllLines($gitIgnorePath, $newLines, $Utf8NoBom)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " 🎉 AI Coding 工作流初始化成功！(Windows 原生环境)" -ForegroundColor Green
Write-Host " 已就绪组件:"
Write-Host "  - 规范库与联接点: .agents\skills\ -> .omp\skills (NTFS Junction)"
Write-Host "  - 企业治理规范:   .agents\rules\"
Write-Host "  - 入口与路由定义: .omp\AGENTS.md"
Write-Host "  - 三级架构空间:   spec\versions\ & spec\context\"
Write-Host "  - AWR 目标与台账: GOALS.md & work-ledger.yaml"
Write-Host "=================================================================" -ForegroundColor Cyan
