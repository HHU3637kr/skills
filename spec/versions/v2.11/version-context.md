---
version: v2.11
status: 执行中
created: 2026-09-16
updated: 2026-09-16
target_freeze_date: 2026-09-20
target_release_date: 2026-09-22
owner: TeamLead
base_branch: master
---

# Version 运行账本：v2.11

## 1. 版本目标
打造跨平台企业级 AI Coding 工作流一键初始化基建（`scripts/init-ai-workflow.{sh,ps1}`），支持 Linux、macOS 与原生 Windows 环境快速装配 R&K Flow 规范体系与 AWR 运行时，解决多平台环境差异与冷启动痛点。

## 2. 规划 Spec 清单（需求性质平权）

| Spec 标识 | 属性 | 标题 / 目标 | 负责人 | 状态 | 依赖前置 |
|---|---|---|---|---|---|
| `20260916-2200-tech-企业工作流一键初始化脚本` | tech | 研发跨平台一键初始化脚本并实现多端沙箱实测 | TeamLead | 执行中 | - |

## 3. 依赖与风险记录
- **外部依赖**：AWR 0.4.0 CLI 规范、Git、PowerShell 5.1/7+、NTFS 文件系统
- **技术风险**：Windows 下符号链接提权限制（通过 NTFS Junction 绕过解决）；WSL/Git Bash 路径转换兼容性

## 4. 范围变更记录（Scope Change Log）
| 日期 | 变更类型（新增/移出/延期） | Spec | 动因与依据 | 审批人 |
|---|---|---|---|---|
| 2026-09-16 | 初始规划 | `20260916-2200-tech-企业工作流一键初始化脚本` | 迁移并在本仓库落地成熟的一键初始化脚本基建 | user |
