<#
.SYNOPSIS
    R&K Flow -> AWR 0.5.0 会话检查点记录辅助工具 (PowerShell 跨平台版)
.DESCRIPTION
    解决各角色在阶段交接时无法获取 Session ID 与 CAS 锁版本的问题。
    支持 Windows 原生 PowerShell 5.1 与 PowerShell Core 7+。
#>
[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$Work,

    [Parameter(Mandatory = $true)]
    [string]$Agent,

    [Parameter(Mandatory = $true)]
    [string]$Digest,

    [Parameter(Mandatory = $false)]
    [string]$NextAction = "推进下一步",

    [Parameter(Mandatory = $false)]
    [string]$OpenLoop = "",

    [Parameter(Mandatory = $false)]
    [switch]$End
)

$ErrorActionPreference = "Stop"

# 在 PowerShell 7.3+ 下禁用原生命令非零退出直接抛异常，避免提前终止降级逻辑
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

if (-not (Get-Command awr -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ awr 未安装，跳过会话检查点记录" -ForegroundColor Yellow
    exit 0
}

# 向上定位最近的 AWR 项目根目录（包含 .awr/project.toml），支持 monorepo 与深层子目录执行
$currentDir = $PWD.Path
while ($currentDir -and (Test-Path $currentDir)) {
    if (Test-Path "$currentDir/.awr/project.toml") {
        Set-Location -Path $currentDir
        break
    }
    $parent = Split-Path $currentDir -Parent
    if ($parent -eq $currentDir) { break }
    $currentDir = $parent
}

# 1. 获取当前 project_revision
$statusJson = awr status --json 2>$null
$statusObj = $null
if ($statusJson) {
    try { $statusObj = ($statusJson -join "`n") | ConvertFrom-Json } catch { }
}

$rev = if ($statusObj) { $statusObj.project_revision } else { $null }

if (-not $rev) {
    Write-Host "❌ 错误: 无法获取 AWR 项目版本号，请确认处于有效 AWR 项目根目录下" -ForegroundColor Red
    exit 1
}

# 2. 获取当前工作项内部 ID 并查找匹配的活动会话（传 --limit 100 防分页截断）
$workShowJson = awr work show $Work --json 2>$null
$workObj = $null
$workUlid = $null
if ($workShowJson) {
    try {
        $workObj = ($workShowJson -join "`n") | ConvertFrom-Json
        if ($workObj -and $workObj.work -and $workObj.work.id) {
            $workUlid = $workObj.work.id
        }
    } catch { }
}

if (-not $workUlid) {
    Write-Host "❌ 错误: 无法解析工作项 [$Work] 的内部 ID，拒绝在未知工作项上执行会话接力或认领！" -ForegroundColor Red
    exit 1
}
$sessionsJson = awr session list --active --limit 100 --json 2>$null
$sessionId = $null

if ($sessionsJson) {
    try {
        $sessionsObj = ($sessionsJson -join "`n") | ConvertFrom-Json
        if ($sessionsObj.sessions) {
            $matched = $sessionsObj.sessions | Where-Object {
                $_.agent_id -eq $Agent -and $_.status -eq "active" -and ((-not $workUlid -and -not $_.work_item_id) -or ($workUlid -and $_.work_item_id -eq $workUlid))
            } | Select-Object -First 1
            if ($matched) {
                $sessionId = $matched.id
            }
        }
    } catch { }
}
# 3. 检查会话建立方式：
# 若无本角色活跃会话，但存在属于该工作项的其他前驱活跃会话，自动通过 session resume 完成租约平滑转交（Claim Transfer）
# 若完全无前驱活跃会话，则通过 session start --claim 首发认领
if (-not $sessionId) {
    $prevSessionId = $null
    if ($sessionsObj -and $sessionsObj.sessions) {
        $prevMatched = $sessionsObj.sessions | Where-Object {
            $_.status -eq "active" -and ((-not $workUlid -and -not $_.work_item_id) -or ($workUlid -and $_.work_item_id -eq $workUlid))
        } | Select-Object -First 1
        if ($prevMatched) { $prevSessionId = $prevMatched.id }
    }

    $resumeErrFile = [System.IO.Path]::GetTempFileName()
    $startErrFile = [System.IO.Path]::GetTempFileName()
    if ($prevSessionId) {
        $resumeOut = & awr session resume --from-session $prevSessionId --work $Work --agent $Agent --provider omp --model default --claim --expected-revision $rev --json 2>$resumeErrFile
        if ($resumeOut) {
            try {
                $resumeObj = ($resumeOut -join "`n") | ConvertFrom-Json
                $sessionId = if ($resumeObj.resumed -and $resumeObj.resumed.session) { $resumeObj.resumed.session.id } elseif ($resumeObj.session) { $resumeObj.session.id } else { $resumeObj.id }
            } catch { }
        }
    }

    $resumeErr = if (Test-Path $resumeErrFile) { Get-Content $resumeErrFile -Raw -ErrorAction SilentlyContinue } else { "" }
    Remove-Item -Force $resumeErrFile -ErrorAction SilentlyContinue

    if ($prevSessionId -and -not $sessionId) {
        Write-Host "❌ 错误: AWR 会话接力 (resume) 失败！" -ForegroundColor Red
        if ($resumeErr) { Write-Host "AWR 详情: $resumeErr" -ForegroundColor Yellow }
        Remove-Item -Force $startErrFile -ErrorAction SilentlyContinue
        exit 1
    }

    if (-not $sessionId) {
        $startOut = & awr session start --work $Work --agent $Agent --provider omp --model default --claim --ttl-ms 3600000 --expected-revision $rev --json 2>$startErrFile
        if ($startOut) {
            try {
                $startObj = ($startOut -join "`n") | ConvertFrom-Json
                $sessionId = if ($startObj.session) { $startObj.session.id } else { $startObj.id }
                if ($startObj.project_revision) { $rev = $startObj.project_revision }
            } catch { }
        }
    }

    $startErr = if (Test-Path $startErrFile) { Get-Content $startErrFile -Raw -ErrorAction SilentlyContinue } else { "" }
    Remove-Item -Force $startErrFile -ErrorAction SilentlyContinue
}

# 4. 显式失败阻断，绝不假兜底
if (-not $sessionId) {
    Write-Host "❌ 错误: 无法获取、接力或启动 AWR 会话！" -ForegroundColor Red
    if ($startErr) { Write-Host "AWR 错误: $startErr" -ForegroundColor Yellow }
    exit 1
}

# 4.1 检查工作项状态：若为 ready，自动通过 awr work progress 推进至 in_progress (消灭 P0-1 状态机断裂)
# 执行前先刷新一次 rev 防止并发或 resume 抬高版本冲突
$freshStatusJson = awr status --json 2>$null
if ($freshStatusJson) {
    try {
        $freshStatusObj = ($freshStatusJson -join "`n") | ConvertFrom-Json
        if ($freshStatusObj.project_revision) { $rev = $freshStatusObj.project_revision }
    } catch { }
}

$workRawStatus = $null
$workStatus = $null
if ($workObj -and $workObj.work) {
    $workRawStatus = $workObj.work.raw_status
    $workStatus = $workObj.work.status
}

if (-not $workRawStatus -and -not $workStatus) {
    Write-Host "❌ 错误: 无法解析工作项 [$Work] 的当前状态 (raw_status 与 status 均为空)，拒绝盲目执行！" -ForegroundColor Red
    exit 1
}

if ($workRawStatus -eq "ready" -or $workStatus -eq "ready") {
    $progressErrFile = [System.IO.Path]::GetTempFileName()
    $nextActionVal = if ($NextAction) { $NextAction } else { "推进下一步工作" }
    $progressOut = & awr work progress $Work --summary "开工推进：状态转入进行中" --next-action $nextActionVal --session $sessionId --reason "开工自动推进状态" --expected-revision $rev --json 2>$progressErrFile
    $progressErr = if (Test-Path $progressErrFile) { Get-Content $progressErrFile -Raw -ErrorAction SilentlyContinue } else { "" }
    Remove-Item -Force $progressErrFile -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 错误: 自动推进工作项 [$Work] 状态 (ready -> in_progress) 失败！" -ForegroundColor Red
        if ($progressErr) { Write-Host "AWR 错误: $progressErr" -ForegroundColor Yellow }
        exit 1
    }
}

# progress 推进后台账重写且 project_revision 递增，必须再次现读最新版本号

# 5. 二次刷新 project_revision 防止并发冲突
$latestJson = awr status --json 2>$null
if ($latestJson) {
    try {
        $latestObj = ($latestJson -join "`n") | ConvertFrom-Json
        if ($latestObj.project_revision) { $rev = $latestObj.project_revision }
    } catch { }
}
# 6. 获取上下文哈希（优先消费官方 work_context.context_hash）
$compileErrFile = [System.IO.Path]::GetTempFileName()
$compileOut = & awr context compile --work $Work --session $sessionId --budget 4000 --json 2>$compileErrFile
$compileErr = if (Test-Path $compileErrFile) { Get-Content $compileErrFile -Raw -ErrorAction SilentlyContinue } else { "" }
Remove-Item -Force $compileErrFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误: AWR 上下文编译失败 (存在阻断缺口或不完整上下文，拒绝未认证盖章)！" -ForegroundColor Red
    if ($compileErr) { Write-Host "AWR 编译错误详情: $compileErr" -ForegroundColor Yellow }
    if ($compileOut) { Write-Host "AWR 编译输出: $compileOut" -ForegroundColor Yellow }
    exit 1
}

$ctxHash = $null
if ($compileOut) {
    try {
        $compileObj = ($compileOut -join "`n") | ConvertFrom-Json
        if ($compileObj.work_context -and $compileObj.work_context.context_hash) {
            $ctxHash = $compileObj.work_context.context_hash
        }
    } catch { }
}

if (-not $ctxHash) {
    Write-Host "❌ 错误: 未能从 AWR 编译输出中获取官方权威 context_hash，拒绝提交伪造哈希！" -ForegroundColor Red
    if ($compileErr) { Write-Host "AWR 编译错误详情: $compileErr" -ForegroundColor Yellow }
    exit 1
}
# 7. 提交会话检查点（显式传递 --work 强约束）
$cpArgs = @(
    "session", "checkpoint",
    "--session", $sessionId,
    "--work", $Work,
    "--context-hash", $ctxHash,
    "--digest", $Digest,
    "--next-action", $NextAction,
    "--expected-revision", $rev,
    "--json"
)

if ($OpenLoop) {
    $cpArgs += @("--open-loop", $OpenLoop)
}

$cpErrFile = [System.IO.Path]::GetTempFileName()
$cpOut = & awr @cpArgs 2>$cpErrFile
$cpObj = $null
if ($cpOut) {
    try { $cpObj = ($cpOut -join "`n") | ConvertFrom-Json } catch { }
}
$cpErr = if (Test-Path $cpErrFile) { Get-Content $cpErrFile -Raw -ErrorAction SilentlyContinue } else { "" }
Remove-Item -Force $cpErrFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0 -or -not $cpObj -or -not $cpObj.checkpoint -or -not $cpObj.checkpoint.id) {
    Write-Host "❌ 错误: AWR 会话检查点保存失败！" -ForegroundColor Red
    if ($cpErr) { Write-Host "AWR 错误: $cpErr" -ForegroundColor Yellow }
    if ($cpOut) { Write-Host "AWR 响应: $cpOut" -ForegroundColor Yellow }
    exit 1
}

$cpId = $cpObj.checkpoint.id
Write-Host "✅ AWR 会话检查点保存成功: $cpId (Session: $sessionId, Rev: $rev)" -ForegroundColor Green

# 8. 如果指定了 -End，正常关闭当前会话，避免产生 orphan_session
if ($End) {
    $currStatusJson = awr status --json 2>$null
    $currRev = $rev
    if ($currStatusJson) {
        try {
            $currObj = ($currStatusJson -join "`n") | ConvertFrom-Json
            if ($currObj.project_revision) { $currRev = $currObj.project_revision }
        } catch { }
    }
    $endErrFile = [System.IO.Path]::GetTempFileName()
    & awr session end --session $sessionId --work $Work --outcome ended --expected-revision $currRev --json 2>$endErrFile | Out-Null
    $endErr = if (Test-Path $endErrFile) { Get-Content $endErrFile -Raw -ErrorAction SilentlyContinue } else { "" }
    Remove-Item -Force $endErrFile -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 错误: AWR 会话关闭与租约释放失败 (Session: $sessionId)！" -ForegroundColor Red
        if ($endErr) { Write-Host "AWR 详情: $endErr" -ForegroundColor Yellow }
        exit 1
    } else {
        Write-Host "🔒 已正常关闭 AWR 会话并释放租约: $sessionId" -ForegroundColor Cyan
    }
}
