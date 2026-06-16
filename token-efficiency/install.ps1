# Install token-efficiency skill globally (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Py = "python"
if (-not (Get-Command $Py -ErrorAction SilentlyContinue)) { $Py = "py" }
& $Py "-3" "$Root\scripts\install_skill.py" --write @args
