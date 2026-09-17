---
id: EXP-003
title: 跨平台脚本自愈、防破坏备份与 UTF-8 读写防退化闭环
type: experience
created: 2026-09-17
tags: [cross-platform, powershell, encoding, awr, junction, backup]
---

# EXP-003：跨平台脚本自愈、防破坏备份与 UTF-8 读写防退化闭环

## 1. 困境背景
在开发和测试跨平台工作流初始化脚本（Bash + PowerShell）时，发现了三个隐蔽陷阱：
1. **Windows PowerShell 5.1 编码退化陷阱**：PS 5.1 默认 `Get-Content` 在读取无 BOM UTF-8 文件时会回退至系统 ANSI 代码页（如 CP936）。若对 `.gitignore` 等文件执行追加写回，第二次运行时会将文件破坏为乱码。
2. **符号链接/Junction 建立时的破坏性清空**：若目标路径此前已存在普通物理目录且存放了用户文件，简单的覆盖或递归删除（`Remove-Item -Recurse -Force`）会造成严重数据丢失；Linux 下直接 `ln -sfn` 则会产生目录内子链接嵌套。
3. **AWR 0.4.0 状态机悬空边**：在 `work-ledger.yaml` 的 `INTAKE-001` 中显式指定未确认的目标绑定（`goal: intake-goal`）会导致 `awr doctor` 报 `dangling_edge` 错误。

## 2. 核心策略
1. **读写双端显式绑定 UTF-8**：
   - 写出：`$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)`，通过 `[System.IO.File]::WriteAllText($path, $content, $Utf8NoBom)` 统一输出无 BOM。
   - 读取：`Get-Content $path -Encoding UTF8` 显式指定编码，闭环防止二次重跑时的 ANSI 退化。
2. **普通物理目录自动备份防硬删除**：
   - 检查 `Attributes -band ReparsePoint`（Windows）或 `[ ! -L ... ]`（Linux）。
   - 遇到物理目录先执行重命名备份（`$Path.bak-YYYYMMDD-HHMMSS`）并告警，严禁硬删除。
3. **目标路径自愈预建**：
   - 解析绝对路径前先调用 `mkdir -p`（Linux）或 `New-Item -ItemType Directory`（Windows），彻底消除路径未建即解析的崩溃。
4. **AWR 标准 Intake 单独组织任务**：
   - 新建项目的初始组织任务 `INTAKE-001` 不显式绑定 `goal`，保持标准 intake 组织任务语义，使 `awr doctor` 校验为 0 findings 绿灯。
