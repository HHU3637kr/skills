---
title: extension入口模块化重构测试计划
type: test-plan
category: 02-技术设计
status: 已确认
created: 2026-04-29
related:
  - "[[plan|实现计划]]"
---

# 测试计划

## 验收标准

- `npm run compile` 通过。
- `npm test` 通过，现有 Extension Host 测试不回退。
- `npm run package` 成功生成 VSIX。
- `src/extension.ts` 主要保留激活和依赖装配，Provider/Webview/Controller/Prompt/Command 逻辑迁移到对应目录。

## 测试用例

| 用例编号 | 描述 | 输入 | 预期输出 | 边界条件 |
|---|---|---|---|---|
| TC-001 | TypeScript 编译 | `npm run compile` | 0 exit code | 新模块路径和导出正确 |
| TC-002 | Extension Host 回归 | `npm test` | 全部测试通过 | extension re-export 兼容 |
| TC-003 | VSIX 打包 | `npm run package` | 生成 `.vsix` | package 内容仍从 dist 加载 |
| TC-004 | 入口体积检查 | 查看 `src/extension.ts` | 文件显著缩小 | 不丢失命令注册 |

## 审计日志

测试日志保留在当前 Spec 目录 `logs/` 下。

