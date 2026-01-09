---
name: json-canvas
description: 创建和编辑 JSON Canvas 文件（.canvas），包括节点、边、分组和连接。用于处理 .canvas 文件、创建可视化画布、思维导图、流程图，或当用户提到 Obsidian 中的 Canvas 文件时使用。
---

# JSON Canvas 技能

本技能使 Claude Code 能够创建和编辑有效的 JSON Canvas 文件（`.canvas`），适用于 Obsidian 和其他应用程序。

## 概述

JSON Canvas 是一种用于无限画布数据的开放文件格式。Canvas 文件使用 `.canvas` 扩展名，包含遵循 [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/) 规范的有效 JSON。

## 文件结构

Canvas 文件包含两个顶级数组：

```json
{
  "nodes": [],
  "edges": []
}
```

- `nodes`（可选）：节点对象数组
- `edges`（可选）：连接节点的边对象数组

## 节点

节点是放置在画布上的对象。有四种节点类型：
- `text` - 带 Markdown 的文本内容
- `file` - 文件/附件引用
- `link` - 外部 URL
- `group` - 其他节点的可视容器

### Z-Index 排序

节点按数组中的 z-index 排序：
- 第一个节点 = 底层（显示在其他节点下方）
- 最后一个节点 = 顶层（显示在其他节点上方）

### 通用节点属性

所有节点共享以下属性：

| 属性 | 必需 | 类型 | 描述 |
|------|------|------|------|
| `id` | 是 | string | 节点的唯一标识符 |
| `type` | 是 | string | 节点类型：`text`、`file`、`link` 或 `group` |
| `x` | 是 | integer | X 坐标位置（像素） |
| `y` | 是 | integer | Y 坐标位置（像素） |
| `width` | 是 | integer | 宽度（像素） |
| `height` | 是 | integer | 高度（像素） |
| `color` | 否 | canvasColor | 节点颜色（见颜色章节） |

### 文本节点

文本节点包含 Markdown 内容。

```json
{
  "id": "6f0ad84f44ce9c17",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 200,
  "text": "# 你好世界\n\n这是 **Markdown** 内容。"
}
```

| 属性 | 必需 | 类型 | 描述 |
|------|------|------|------|
| `text` | 是 | string | 带 Markdown 语法的纯文本 |

### 文件节点

文件节点引用文件或附件（图片、视频、PDF、笔记等）。

```json
{
  "id": "a1b2c3d4e5f67890",
  "type": "file",
  "x": 500,
  "y": 0,
  "width": 400,
  "height": 300,
  "file": "Attachments/diagram.png"
}
```

```json
{
  "id": "b2c3d4e5f6789012",
  "type": "file",
  "x": 500,
  "y": 400,
  "width": 400,
  "height": 300,
  "file": "Notes/项目概述.md",
  "subpath": "#实现"
}
```

| 属性 | 必需 | 类型 | 描述 |
|------|------|------|------|
| `file` | 是 | string | 系统内文件的路径 |
| `subpath` | 否 | string | 链接到标题或块（以 `#` 开头） |

### 链接节点

链接节点显示外部 URL。

```json
{
  "id": "c3d4e5f678901234",
  "type": "link",
  "x": 1000,
  "y": 0,
  "width": 400,
  "height": 200,
  "url": "https://obsidian.md"
}
```

| 属性 | 必需 | 类型 | 描述 |
|------|------|------|------|
| `url` | 是 | string | 外部 URL |

### 分组节点

分组节点是用于组织其他节点的可视容器。

```json
{
  "id": "d4e5f6789012345a",
  "type": "group",
  "x": -50,
  "y": -50,
  "width": 1000,
  "height": 600,
  "label": "项目概述",
  "color": "4"
}
```

```json
{
  "id": "e5f67890123456ab",
  "type": "group",
  "x": 0,
  "y": 700,
  "width": 800,
  "height": 500,
  "label": "资源",
  "background": "Attachments/background.png",
  "backgroundStyle": "cover"
}
```

| 属性 | 必需 | 类型 | 描述 |
|------|------|------|------|
| `label` | 否 | string | 分组的文本标签 |
| `background` | 否 | string | 背景图片路径 |
| `backgroundStyle` | 否 | string | 背景渲染样式 |

#### 背景样式

| 值 | 描述 |
|------|------|
| `cover` | 填充节点的整个宽度和高度 |
| `ratio` | 保持背景图片的宽高比 |
| `repeat` | 在两个方向上重复图片作为图案 |

## 边

边是连接节点的线条。

```json
{
  "id": "f67890123456789a",
  "fromNode": "6f0ad84f44ce9c17",
  "toNode": "a1b2c3d4e5f67890"
}
```

```json
{
  "id": "0123456789abcdef",
  "fromNode": "6f0ad84f44ce9c17",
  "fromSide": "right",
  "fromEnd": "none",
  "toNode": "b2c3d4e5f6789012",
  "toSide": "left",
  "toEnd": "arrow",
  "color": "1",
  "label": "导向"
}
```

| 属性 | 必需 | 类型 | 默认值 | 描述 |
|------|------|------|--------|------|
| `id` | 是 | string | - | 边的唯一标识符 |
| `fromNode` | 是 | string | - | 连接起始的节点 ID |
| `fromSide` | 否 | string | - | 边起始的侧面 |
| `fromEnd` | 否 | string | `none` | 边起始端的形状 |
| `toNode` | 是 | string | - | 连接结束的节点 ID |
| `toSide` | 否 | string | - | 边结束的侧面 |
| `toEnd` | 否 | string | `arrow` | 边结束端的形状 |
| `color` | 否 | canvasColor | - | 线条颜色 |
| `label` | 否 | string | - | 边的文本标签 |

### 侧面值

| 值 | 描述 |
|------|------|
| `top` | 节点顶部边缘 |
| `right` | 节点右侧边缘 |
| `bottom` | 节点底部边缘 |
| `left` | 节点左侧边缘 |

### 端点形状

| 值 | 描述 |
|------|------|
| `none` | 无端点形状 |
| `arrow` | 箭头端点 |

## 颜色

`canvasColor` 类型可以通过两种方式指定：

### 十六进制颜色

```json
{
  "color": "#FF0000"
}
```

### 预设颜色

```json
{
  "color": "1"
}
```

| 预设 | 颜色 |
|------|------|
| `"1"` | 红色 |
| `"2"` | 橙色 |
| `"3"` | 黄色 |
| `"4"` | 绿色 |
| `"5"` | 青色 |
| `"6"` | 紫色 |

注意：预设的具体颜色值是故意未定义的，允许应用程序使用自己的品牌颜色。

## 完整示例

### 带文本和连接的简单画布

```json
{
  "nodes": [
    {
      "id": "8a9b0c1d2e3f4a5b",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 300,
      "height": 150,
      "text": "# 主要想法\n\n这是核心概念。"
    },
    {
      "id": "1a2b3c4d5e6f7a8b",
      "type": "text",
      "x": 400,
      "y": -100,
      "width": 250,
      "height": 100,
      "text": "## 支撑点 A\n\n详细内容在这里。"
    },
    {
      "id": "2b3c4d5e6f7a8b9c",
      "type": "text",
      "x": 400,
      "y": 100,
      "width": 250,
      "height": 100,
      "text": "## 支撑点 B\n\n更多详细内容。"
    }
  ],
  "edges": [
    {
      "id": "3c4d5e6f7a8b9c0d",
      "fromNode": "8a9b0c1d2e3f4a5b",
      "fromSide": "right",
      "toNode": "1a2b3c4d5e6f7a8b",
      "toSide": "left"
    },
    {
      "id": "4d5e6f7a8b9c0d1e",
      "fromNode": "8a9b0c1d2e3f4a5b",
      "fromSide": "right",
      "toNode": "2b3c4d5e6f7a8b9c",
      "toSide": "left"
    }
  ]
}
```

### 带分组的项目看板

```json
{
  "nodes": [
    {
      "id": "5e6f7a8b9c0d1e2f",
      "type": "group",
      "x": 0,
      "y": 0,
      "width": 300,
      "height": 500,
      "label": "待办",
      "color": "1"
    },
    {
      "id": "6f7a8b9c0d1e2f3a",
      "type": "group",
      "x": 350,
      "y": 0,
      "width": 300,
      "height": 500,
      "label": "进行中",
      "color": "3"
    },
    {
      "id": "7a8b9c0d1e2f3a4b",
      "type": "group",
      "x": 700,
      "y": 0,
      "width": 300,
      "height": 500,
      "label": "已完成",
      "color": "4"
    },
    {
      "id": "8b9c0d1e2f3a4b5c",
      "type": "text",
      "x": 20,
      "y": 50,
      "width": 260,
      "height": 80,
      "text": "## 任务 1\n\n实现功能 X"
    },
    {
      "id": "9c0d1e2f3a4b5c6d",
      "type": "text",
      "x": 370,
      "y": 50,
      "width": 260,
      "height": 80,
      "text": "## 任务 2\n\n审查 PR #123",
      "color": "2"
    },
    {
      "id": "0d1e2f3a4b5c6d7e",
      "type": "text",
      "x": 720,
      "y": 50,
      "width": 260,
      "height": 80,
      "text": "## 任务 3\n\n~~设置 CI/CD~~"
    }
  ],
  "edges": []
}
```

### 流程图

```json
{
  "nodes": [
    {
      "id": "a0b1c2d3e4f5a6b7",
      "type": "text",
      "x": 200,
      "y": 0,
      "width": 150,
      "height": 60,
      "text": "**开始**",
      "color": "4"
    },
    {
      "id": "b1c2d3e4f5a6b7c8",
      "type": "text",
      "x": 200,
      "y": 100,
      "width": 150,
      "height": 60,
      "text": "步骤 1:\n收集数据"
    },
    {
      "id": "c2d3e4f5a6b7c8d9",
      "type": "text",
      "x": 200,
      "y": 200,
      "width": 150,
      "height": 80,
      "text": "**决策**\n\n数据有效吗？",
      "color": "3"
    },
    {
      "id": "d3e4f5a6b7c8d9e0",
      "type": "text",
      "x": 400,
      "y": 200,
      "width": 150,
      "height": 60,
      "text": "处理数据"
    },
    {
      "id": "e4f5a6b7c8d9e0f1",
      "type": "text",
      "x": 0,
      "y": 200,
      "width": 150,
      "height": 60,
      "text": "请求新数据",
      "color": "1"
    },
    {
      "id": "f5a6b7c8d9e0f1a2",
      "type": "text",
      "x": 400,
      "y": 320,
      "width": 150,
      "height": 60,
      "text": "**结束**",
      "color": "4"
    }
  ],
  "edges": [
    {
      "id": "a6b7c8d9e0f1a2b3",
      "fromNode": "a0b1c2d3e4f5a6b7",
      "fromSide": "bottom",
      "toNode": "b1c2d3e4f5a6b7c8",
      "toSide": "top"
    },
    {
      "id": "b7c8d9e0f1a2b3c4",
      "fromNode": "b1c2d3e4f5a6b7c8",
      "fromSide": "bottom",
      "toNode": "c2d3e4f5a6b7c8d9",
      "toSide": "top"
    },
    {
      "id": "c8d9e0f1a2b3c4d5",
      "fromNode": "c2d3e4f5a6b7c8d9",
      "fromSide": "right",
      "toNode": "d3e4f5a6b7c8d9e0",
      "toSide": "left",
      "label": "是",
      "color": "4"
    },
    {
      "id": "d9e0f1a2b3c4d5e6",
      "fromNode": "c2d3e4f5a6b7c8d9",
      "fromSide": "left",
      "toNode": "e4f5a6b7c8d9e0f1",
      "toSide": "right",
      "label": "否",
      "color": "1"
    },
    {
      "id": "e0f1a2b3c4d5e6f7",
      "fromNode": "e4f5a6b7c8d9e0f1",
      "fromSide": "top",
      "fromEnd": "none",
      "toNode": "b1c2d3e4f5a6b7c8",
      "toSide": "left",
      "toEnd": "arrow"
    },
    {
      "id": "f1a2b3c4d5e6f7a8",
      "fromNode": "d3e4f5a6b7c8d9e0",
      "fromSide": "bottom",
      "toNode": "f5a6b7c8d9e0f1a2",
      "toSide": "top"
    }
  ]
}
```

## ID 生成

节点和边的 ID 必须是唯一字符串。Obsidian 生成 16 字符的十六进制 ID：

```json
"id": "6f0ad84f44ce9c17"
"id": "a3b2c1d0e9f8g7h6"
"id": "1234567890abcdef"
```

此格式是 16 字符的小写十六进制字符串（64 位随机值）。

## 布局指南

### 定位

- 坐标可以为负数（画布无限延伸）
- `x` 向右增加
- `y` 向下增加
- 位置指节点的左上角

### 推荐尺寸

| 节点类型 | 建议宽度 | 建议高度 |
|----------|----------|----------|
| 小文本 | 200-300 | 80-150 |
| 中等文本 | 300-450 | 150-300 |
| 大文本 | 400-600 | 300-500 |
| 文件预览 | 300-500 | 200-400 |
| 链接预览 | 250-400 | 100-200 |
| 分组 | 根据需要 | 根据需要 |

### 间距

- 在分组内留出 20-50px 的内边距
- 节点之间间隔 50-100px 以提高可读性
- 将节点对齐到网格（10 或 20 的倍数）以获得更整洁的布局

## 验证规则

1. 所有 `id` 值在节点和边之间必须唯一
2. `fromNode` 和 `toNode` 必须引用现有的节点 ID
3. 每种节点类型必须存在必需字段
4. `type` 必须是以下之一：`text`、`file`、`link`、`group`
5. `backgroundStyle` 必须是以下之一：`cover`、`ratio`、`repeat`
6. `fromSide`、`toSide` 必须是以下之一：`top`、`right`、`bottom`、`left`
7. `fromEnd`、`toEnd` 必须是以下之一：`none`、`arrow`
8. 颜色预设必须是 `"1"` 到 `"6"` 或有效的十六进制颜色

## 参考资料

- [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/)
- [JSON Canvas GitHub](https://github.com/obsidianmd/jsoncanvas)

---

## 后续动作（工具记忆）

完成 JSON Canvas 创建/编辑后，你应该：

### 验证步骤
1. 确认所有节点和边的 `id` 唯一（16 字符十六进制）
2. 验证边的 `fromNode` 和 `toNode` 引用的节点 ID 存在
3. 检查节点位置和尺寸是否合理，避免重叠

### 布局优化
1. 对齐节点到网格（10 或 20 的倍数）获得更整洁的布局
2. 节点之间保持 50-100px 间距提高可读性
3. 分组节点内留出 20-50px 内边距
4. 调整 z-index 顺序（数组中靠后的节点显示在上层）

### 关联操作
1. 文件节点可链接到 Obsidian 笔记：`"file": "Notes/笔记.md"`
2. 可链接到笔记的特定标题：`"subpath": "#标题"`
3. 如需创建被引用的笔记，使用 `obsidian-markdown` Skill
4. 复杂数据可考虑用 `obsidian-bases` 创建动态视图

### 常见陷阱
- 忘记为新节点生成唯一 ID
- 边的 `fromSide`/`toSide` 值拼写错误（必须是 top/right/bottom/left）
- 颜色预设使用数字而非字符串（应为 `"1"` 而非 `1`）
