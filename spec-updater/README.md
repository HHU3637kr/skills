# Spec Updater 使用说明

## 📋 概述

**Spec Updater** 是一个专门用于对已完成功能进行更新和迭代的 Claude Code Skill。当需要修改已有 `plan.md` 和 `summary.md` 的功能时，使用此 Skill。

**与 spec-executor 的区别**：

| 特性 | spec-executor | spec-updater |
|------|---------------|--------------|
| 用途 | 新功能开发 | 功能更新/迭代 |
| 基于文档 | plan.md | update-xxx.md |
| 完成后 | 归档到 06-已归档 | **不归档** |
| 前提条件 | plan.md 存在 | plan.md + summary.md 存在 |

## 🎯 核心功能

1. **同目录管理**：更新文档放在原 plan.md 的同一目录
2. **编号递增**：update-001.md → update-002.md → update-003.md
3. **历史保留**：保持功能的完整更新历史
4. **回归测试**：确保原有功能不受影响
5. **不归档**：更新完成后保留在原目录

## 🚀 快速开始

### 1. 触发关键词

以下关键词会触发此 Skill：

- "更新 xxx 功能"
- "修改已有功能"
- "根据 update-xxx.md 执行"
- "对 xxx 进行迭代"

### 2. 基本使用

**示例：更新已有功能**

```
用户：需要更新专业评价Agent，添加权重验证功能

Claude：我将使用 spec-updater 执行这个任务。

[检查原 Spec]
✓ 找到原 Spec 目录：spec/03-功能实现/20251231-专业评价Agent设计/
✓ plan.md 存在
✓ summary.md 存在
✓ 确定更新编号：update-001

[执行流程]
1. ✓ 创建 update-001.md（由 spec-writer 完成）
2. → 等待用户确认...
3. → 执行更新...
4. → 创建 update-001-summary.md
5. → 审查更新
6. ✓ 完成（不归档）
```

## 📁 文档结构

### 更新前

```
spec/03-功能实现/20251231-专业评价Agent设计/
├── plan.md          # 原始设计方案
└── summary.md       # 原始实现总结
```

### 多次更新后

```
spec/03-功能实现/20251231-专业评价Agent设计/
├── plan.md                  # 原始设计方案（保持不变）
├── summary.md               # 原始实现总结（保持不变）
├── review.md                # 原始审查报告
├── update-001.md            # 第一次更新方案
├── update-001-summary.md    # 第一次更新总结
├── review-001.md            # 第一次更新审查报告
├── update-002.md            # 第二次更新方案
├── update-002-summary.md    # 第二次更新总结
└── review-002.md            # 第二次更新审查报告
```

## 📝 工作流程

```
1. 确认原 Spec 目录位置
   ↓
2. 检查现有更新文档，确定编号
   ↓
3. 创建 update-xxx.md（由 spec-writer 完成）
   ↓
4. 等待用户确认更新方案
   ↓
5. 读取并理解 update-xxx.md 文档
   ↓
6. 创建任务清单
   ↓
7. 按方案实现更新
   ↓
8. 编写/更新测试（包括回归测试）
   ↓
9. 运行测试验证
   ↓
10. 创建 update-xxx-summary.md 总结文档
   ↓
11. 使用 spec-reviewer 审查更新
   ↓
12. 等待用户确认审查报告
   ↓
13. 完成（不归档）
```

## ⚠️ 重要约束

### 1. 同目录原则

```
✅ 正确：更新文档放在原 plan.md 同一目录
spec/03-功能实现/20251231-xxx/
├── plan.md
├── summary.md
└── update-001.md    ← 正确位置

❌ 错误：创建新目录
spec/03-功能实现/20251231-xxx-update/    ← 错误！
└── update-001.md
```

### 2. 不归档原则

```
❌ 错误：更新完成后归档
mv "spec/03-功能实现/20251231-xxx" "spec/06-已归档/"

✅ 正确：保留在原目录，不执行任何移动操作
```

### 3. 回归测试必须通过

更新完成后必须确保：
- ✅ 新增功能测试通过
- ✅ 修改功能测试通过
- ✅ **原有功能回归测试通过**

## 📊 使用场景

### 场景 1：功能增强

```
用户：给专业评价Agent添加并发评估支持

Claude：
[检查] ✓ 原 Spec 存在，summary.md 存在
[编号] update-001
[执行] 创建更新方案 → 用户确认 → 实现 → 测试 → 总结
[完成] 不归档
```

### 场景 2：Bug 修复

```
用户：修复评分精度问题

Claude：
[检查] ✓ 原 Spec 存在，summary.md 存在
[编号] update-002（已有 update-001）
[执行] 创建修复方案 → 用户确认 → 修复 → 测试 → 总结
[完成] 不归档
```

### 场景 3：性能优化

```
用户：优化材料分析的响应速度

Claude：
[检查] ✓ 原 Spec 存在，summary.md 存在
[编号] update-003
[执行] 创建优化方案 → 用户确认 → 优化 → 测试 → 总结
[完成] 不归档
```

## 🔧 错误处理

### 错误 1：原功能未完成

```
❌ 错误：原功能未完成
状态：存在 plan.md，但缺少 summary.md

解决方案：
1. 先使用 spec-executor 完成原功能
2. 确认 summary.md 已创建
3. 再使用 spec-updater 进行更新
```

### 错误 2：回归测试失败

```
❌ 错误：回归测试失败
失败测试：test_original_functionality

解决方案：
1. 分析失败原因
2. 修复导致回归的代码
3. 重新运行测试
4. 确保所有测试通过后再继续
```

## 🎓 最佳实践

### 1. 代码注释

在修改的代码中添加更新引用：

```python
class IndicatorParser:
    """评估指标解析器

    根据 Spec: spec/03-功能实现/20251231-专业评价Agent设计/plan.md

    更新记录:
    - update-001: 添加权重验证逻辑
    - update-002: 修复精度问题
    """

    def parse_framework(self, framework: dict):
        """解析评估指标体系

        更新 update-001: 添加权重总和验证
        更新 update-002: 使用 Decimal 提高精度
        """
        pass
```

### 2. 测试组织

```python
class TestIndicatorParserOriginal:
    """原有功能测试（回归测试）"""
    pass

class TestIndicatorParserUpdate001:
    """update-001 新增功能测试"""
    pass

class TestIndicatorParserUpdate002:
    """update-002 新增功能测试"""
    pass
```

### 3. 确定更新编号

```bash
# 列出现有更新文档数量
ls spec/03-功能实现/20251231-xxx/update-*.md 2>/dev/null | wc -l

# 根据数量确定新编号
# 0 个 → update-001.md
# 1 个 → update-002.md
# 2 个 → update-003.md
```

## 📖 参考文档

| 文档 | 说明 |
|------|------|
| SKILL.md | 主 Skill 文件，包含完整工作流程和模板 |
| README.md | 本文件，使用说明 |

## 🔍 常见问题

### Q1: 什么时候用 spec-executor，什么时候用 spec-updater？

**A**:
- **spec-executor**：新功能开发，目录下只有 plan.md
- **spec-updater**：功能更新，目录下已有 plan.md + summary.md

### Q2: 更新完成后需要归档吗？

**A**: 不需要。功能更新完成后保留在原目录，以便后续继续更新。只有当功能完全稳定、确定不再需要更新时，才由用户决定是否归档。

### Q3: 如何处理多次更新？

**A**: 每次更新使用递增编号：
- 第一次：update-001.md, update-001-summary.md
- 第二次：update-002.md, update-002-summary.md
- 第三次：update-003.md, update-003-summary.md

所有文件都放在同一目录下，保持完整历史。

### Q4: 回归测试失败怎么办？

**A**:
1. 分析失败原因
2. 修复导致回归的代码
3. 重新运行测试
4. 确保所有测试通过后再继续
5. 在 summary 中记录遇到的问题和解决方案

---

**版本**：1.0
**创建日期**：2026-01-06
**维护者**：AI+专业评估系统项目组
