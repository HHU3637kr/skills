---
name: obsidian-bases
description: 创建和编辑 Obsidian Bases（.base 文件），包括视图、过滤器、公式和汇总。用于处理 .base 文件、创建笔记的数据库式视图，或当用户提到 Obsidian 中的 Bases、表格视图、卡片视图、过滤器或公式时使用。
---

# Obsidian Bases 技能

本技能使 Claude Code 能够创建和编辑有效的 Obsidian Bases（`.base` 文件），包括视图、过滤器、公式和所有相关配置。

## 概述

Obsidian Bases 是基于 YAML 的文件，用于定义 Obsidian 库中笔记的动态视图。Base 文件可以包含多个视图、全局过滤器、公式、属性配置和自定义汇总。

## 文件格式

Base 文件使用 `.base` 扩展名，包含有效的 YAML。它们也可以嵌入到 Markdown 代码块中。

## 完整架构

```yaml
# 全局过滤器应用于 base 中的所有视图
filters:
  # 可以是单个过滤器字符串
  # 或带有 and/or/not 的递归过滤器对象
  and: []
  or: []
  not: []

# 定义可在所有视图中使用的公式属性
formulas:
  formula_name: 'expression'

# 配置属性的显示名称和设置
properties:
  property_name:
    displayName: "显示名称"
  formula.formula_name:
    displayName: "公式显示名称"
  file.ext:
    displayName: "扩展名"

# 定义自定义汇总公式
summaries:
  custom_summary_name: 'values.mean().round(3)'

# 定义一个或多个视图
views:
  - type: table | cards | list | map
    name: "视图名称"
    limit: 10                    # 可选：限制结果数量
    groupBy:                     # 可选：分组结果
      property: property_name
      direction: ASC | DESC
    filters:                     # 视图特定的过滤器
      and: []
    order:                       # 按顺序显示的属性
      - file.name
      - property_name
      - formula.formula_name
    summaries:                   # 将属性映射到汇总公式
      property_name: Average
```

## 过滤器语法

过滤器用于缩小结果范围。可以全局应用或按视图应用。

### 过滤器结构

```yaml
# 单个过滤器
filters: 'status == "done"'

# AND - 所有条件必须为真
filters:
  and:
    - 'status == "done"'
    - 'priority > 3'

# OR - 任一条件为真即可
filters:
  or:
    - 'file.hasTag("book")'
    - 'file.hasTag("article")'

# NOT - 排除匹配项
filters:
  not:
    - 'file.hasTag("archived")'

# 嵌套过滤器
filters:
  or:
    - file.hasTag("tag")
    - and:
        - file.hasTag("book")
        - file.hasLink("Textbook")
    - not:
        - file.hasTag("book")
        - file.inFolder("Required Reading")
```

### 过滤器运算符

| 运算符 | 描述 |
|--------|------|
| `==` | 等于 |
| `!=` | 不等于 |
| `>` | 大于 |
| `<` | 小于 |
| `>=` | 大于等于 |
| `<=` | 小于等于 |
| `&&` | 逻辑与 |
| `\|\|` | 逻辑或 |
| `!` | 逻辑非 |

## 属性

### 三种属性类型

1. **笔记属性** - 来自 frontmatter：`note.author` 或直接 `author`
2. **文件属性** - 文件元数据：`file.name`、`file.mtime` 等
3. **公式属性** - 计算值：`formula.my_formula`

### 文件属性参考

| 属性 | 类型 | 描述 |
|------|------|------|
| `file.name` | String | 文件名 |
| `file.basename` | String | 不带扩展名的文件名 |
| `file.path` | String | 文件完整路径 |
| `file.folder` | String | 父文件夹路径 |
| `file.ext` | String | 文件扩展名 |
| `file.size` | Number | 文件大小（字节） |
| `file.ctime` | Date | 创建时间 |
| `file.mtime` | Date | 修改时间 |
| `file.tags` | List | 文件中的所有标签 |
| `file.links` | List | 文件中的内部链接 |
| `file.backlinks` | List | 链接到此文件的文件 |
| `file.embeds` | List | 笔记中的嵌入 |
| `file.properties` | Object | 所有 frontmatter 属性 |

### `this` 关键字

- 在主内容区域：指 base 文件本身
- 嵌入时：指嵌入文件
- 在侧边栏：指主内容中的活动文件

## 公式语法

公式从属性计算值。在 `formulas` 部分定义。

```yaml
formulas:
  # 简单算术
  total: "price * quantity"

  # 条件逻辑
  status_icon: 'if(done, "✅", "⏳")'

  # 字符串格式化
  formatted_price: 'if(price, price.toFixed(2) + " 元")'

  # 日期格式化
  created: 'file.ctime.format("YYYY-MM-DD")'

  # 复杂表达式
  days_old: '((now() - file.ctime) / 86400000).round(0)'
```

## 函数参考

### 全局函数

| 函数 | 签名 | 描述 |
|------|------|------|
| `date()` | `date(string): date` | 将字符串解析为日期。格式：`YYYY-MM-DD HH:mm:ss` |
| `duration()` | `duration(string): duration` | 解析持续时间字符串 |
| `now()` | `now(): date` | 当前日期和时间 |
| `today()` | `today(): date` | 当前日期（时间 = 00:00:00） |
| `if()` | `if(condition, trueResult, falseResult?)` | 条件判断 |
| `min()` | `min(n1, n2, ...): number` | 最小数字 |
| `max()` | `max(n1, n2, ...): number` | 最大数字 |
| `number()` | `number(any): number` | 转换为数字 |
| `link()` | `link(path, display?): Link` | 创建链接 |
| `list()` | `list(element): List` | 如果不是列表则包装为列表 |
| `file()` | `file(path): file` | 获取文件对象 |
| `image()` | `image(path): image` | 创建用于渲染的图片 |
| `icon()` | `icon(name): icon` | 按名称获取 Lucide 图标 |
| `html()` | `html(string): html` | 渲染为 HTML |
| `escapeHTML()` | `escapeHTML(string): string` | 转义 HTML 字符 |

### Any 类型函数

| 函数 | 签名 | 描述 |
|------|------|------|
| `isTruthy()` | `any.isTruthy(): boolean` | 强制转换为布尔值 |
| `isType()` | `any.isType(type): boolean` | 检查类型 |
| `toString()` | `any.toString(): string` | 转换为字符串 |

### 日期函数和字段

**字段：** `date.year`、`date.month`、`date.day`、`date.hour`、`date.minute`、`date.second`、`date.millisecond`

| 函数 | 签名 | 描述 |
|------|------|------|
| `date()` | `date.date(): date` | 移除时间部分 |
| `format()` | `date.format(string): string` | 使用 Moment.js 模式格式化 |
| `time()` | `date.time(): string` | 获取时间字符串 |
| `relative()` | `date.relative(): string` | 人类可读的相对时间 |
| `isEmpty()` | `date.isEmpty(): boolean` | 对于日期始终为 false |

### 日期算术

```yaml
# 持续时间单位：y/year/years, M/month/months, d/day/days,
#              w/week/weeks, h/hour/hours, m/minute/minutes, s/second/seconds

# 加减持续时间
"date + \"1M\""           # 加 1 个月
"date - \"2h\""           # 减 2 小时
"now() + \"1 day\""       # 明天
"today() + \"7d\""        # 一周后

# 日期相减得到毫秒差
"now() - file.ctime"

# 复杂持续时间算术
"now() + (duration('1d') * 2)"
```

### 字符串函数

**字段：** `string.length`

| 函数 | 签名 | 描述 |
|------|------|------|
| `contains()` | `string.contains(value): boolean` | 检查子字符串 |
| `containsAll()` | `string.containsAll(...values): boolean` | 所有子字符串都存在 |
| `containsAny()` | `string.containsAny(...values): boolean` | 任一子字符串存在 |
| `startsWith()` | `string.startsWith(query): boolean` | 以 query 开头 |
| `endsWith()` | `string.endsWith(query): boolean` | 以 query 结尾 |
| `isEmpty()` | `string.isEmpty(): boolean` | 为空或不存在 |
| `lower()` | `string.lower(): string` | 转为小写 |
| `title()` | `string.title(): string` | 转为标题大小写 |
| `trim()` | `string.trim(): string` | 移除空白 |
| `replace()` | `string.replace(pattern, replacement): string` | 替换模式 |
| `repeat()` | `string.repeat(count): string` | 重复字符串 |
| `reverse()` | `string.reverse(): string` | 反转字符串 |
| `slice()` | `string.slice(start, end?): string` | 子字符串 |
| `split()` | `string.split(separator, n?): list` | 分割为列表 |

### 数字函数

| 函数 | 签名 | 描述 |
|------|------|------|
| `abs()` | `number.abs(): number` | 绝对值 |
| `ceil()` | `number.ceil(): number` | 向上取整 |
| `floor()` | `number.floor(): number` | 向下取整 |
| `round()` | `number.round(digits?): number` | 四舍五入到指定位数 |
| `toFixed()` | `number.toFixed(precision): string` | 定点表示法 |
| `isEmpty()` | `number.isEmpty(): boolean` | 不存在 |

### 列表函数

**字段：** `list.length`

| 函数 | 签名 | 描述 |
|------|------|------|
| `contains()` | `list.contains(value): boolean` | 元素存在 |
| `containsAll()` | `list.containsAll(...values): boolean` | 所有元素都存在 |
| `containsAny()` | `list.containsAny(...values): boolean` | 任一元素存在 |
| `filter()` | `list.filter(expression): list` | 按条件过滤（使用 `value`、`index`） |
| `map()` | `list.map(expression): list` | 转换元素（使用 `value`、`index`） |
| `reduce()` | `list.reduce(expression, initial): any` | 归约为单个值（使用 `value`、`index`、`acc`） |
| `flat()` | `list.flat(): list` | 展平嵌套列表 |
| `join()` | `list.join(separator): string` | 连接为字符串 |
| `reverse()` | `list.reverse(): list` | 反转顺序 |
| `slice()` | `list.slice(start, end?): list` | 子列表 |
| `sort()` | `list.sort(): list` | 升序排序 |
| `unique()` | `list.unique(): list` | 去重 |
| `isEmpty()` | `list.isEmpty(): boolean` | 无元素 |

### 文件函数

| 函数 | 签名 | 描述 |
|------|------|------|
| `asLink()` | `file.asLink(display?): Link` | 转换为链接 |
| `hasLink()` | `file.hasLink(otherFile): boolean` | 有到文件的链接 |
| `hasTag()` | `file.hasTag(...tags): boolean` | 有任一标签 |
| `hasProperty()` | `file.hasProperty(name): boolean` | 有属性 |
| `inFolder()` | `file.inFolder(folder): boolean` | 在文件夹或子文件夹中 |

### 链接函数

| 函数 | 签名 | 描述 |
|------|------|------|
| `asFile()` | `link.asFile(): file` | 获取文件对象 |
| `linksTo()` | `link.linksTo(file): boolean` | 链接到文件 |

### 对象函数

| 函数 | 签名 | 描述 |
|------|------|------|
| `isEmpty()` | `object.isEmpty(): boolean` | 无属性 |
| `keys()` | `object.keys(): list` | 键列表 |
| `values()` | `object.values(): list` | 值列表 |

### 正则表达式函数

| 函数 | 签名 | 描述 |
|------|------|------|
| `matches()` | `regexp.matches(string): boolean` | 测试是否匹配 |

## 视图类型

### 表格视图

```yaml
views:
  - type: table
    name: "我的表格"
    order:
      - file.name
      - status
      - due_date
    summaries:
      price: Sum
      count: Average
```

### 卡片视图

```yaml
views:
  - type: cards
    name: "画廊"
    order:
      - file.name
      - cover_image
      - description
```

### 列表视图

```yaml
views:
  - type: list
    name: "简单列表"
    order:
      - file.name
      - status
```

### 地图视图

需要经纬度属性和 Maps 插件。

```yaml
views:
  - type: map
    name: "位置"
    # 地图特定的经纬度属性设置
```

## 默认汇总公式

| 名称 | 输入类型 | 描述 |
|------|----------|------|
| `Average` | Number | 数学平均值 |
| `Min` | Number | 最小数字 |
| `Max` | Number | 最大数字 |
| `Sum` | Number | 所有数字之和 |
| `Range` | Number | 最大值 - 最小值 |
| `Median` | Number | 数学中位数 |
| `Stddev` | Number | 标准差 |
| `Earliest` | Date | 最早日期 |
| `Latest` | Date | 最晚日期 |
| `Range` | Date | 最晚 - 最早 |
| `Checked` | Boolean | true 值的计数 |
| `Unchecked` | Boolean | false 值的计数 |
| `Empty` | Any | 空值的计数 |
| `Filled` | Any | 非空值的计数 |
| `Unique` | Any | 唯一值的计数 |

## 完整示例

### 任务跟踪器 Base

```yaml
filters:
  and:
    - file.hasTag("task")
    - 'file.ext == "md"'

formulas:
  days_until_due: 'if(due, ((date(due) - today()) / 86400000).round(0), "")'
  is_overdue: 'if(due, date(due) < today() && status != "done", false)'
  priority_label: 'if(priority == 1, "🔴 高", if(priority == 2, "🟡 中", "🟢 低"))'

properties:
  status:
    displayName: 状态
  formula.days_until_due:
    displayName: "距截止日"
  formula.priority_label:
    displayName: 优先级

views:
  - type: table
    name: "进行中的任务"
    filters:
      and:
        - 'status != "done"'
    order:
      - file.name
      - status
      - formula.priority_label
      - due
      - formula.days_until_due
    groupBy:
      property: status
      direction: ASC
    summaries:
      formula.days_until_due: Average

  - type: table
    name: "已完成"
    filters:
      and:
        - 'status == "done"'
    order:
      - file.name
      - completed_date
```

### 阅读列表 Base

```yaml
filters:
  or:
    - file.hasTag("book")
    - file.hasTag("article")

formulas:
  reading_time: 'if(pages, (pages * 2).toString() + " 分钟", "")'
  status_icon: 'if(status == "reading", "📖", if(status == "done", "✅", "📚"))'
  year_read: 'if(finished_date, date(finished_date).year, "")'

properties:
  author:
    displayName: 作者
  formula.status_icon:
    displayName: ""
  formula.reading_time:
    displayName: "预计时间"

views:
  - type: cards
    name: "书库"
    order:
      - cover
      - file.name
      - author
      - formula.status_icon
    filters:
      not:
        - 'status == "dropped"'

  - type: table
    name: "阅读清单"
    filters:
      and:
        - 'status == "to-read"'
    order:
      - file.name
      - author
      - pages
      - formula.reading_time
```

### 项目笔记 Base

```yaml
filters:
  and:
    - file.inFolder("Projects")
    - 'file.ext == "md"'

formulas:
  last_updated: 'file.mtime.relative()'
  link_count: 'file.links.length'

summaries:
  avgLinks: 'values.filter(value.isType("number")).mean().round(1)'

properties:
  formula.last_updated:
    displayName: "更新时间"
  formula.link_count:
    displayName: "链接数"

views:
  - type: table
    name: "所有项目"
    order:
      - file.name
      - status
      - formula.last_updated
      - formula.link_count
    summaries:
      formula.link_count: avgLinks
    groupBy:
      property: status
      direction: ASC

  - type: list
    name: "快速列表"
    order:
      - file.name
      - status
```

### 每日笔记索引

```yaml
filters:
  and:
    - file.inFolder("Daily Notes")
    - '/^\d{4}-\d{2}-\d{2}$/.matches(file.basename)'

formulas:
  word_estimate: '(file.size / 5).round(0)'
  day_of_week: 'date(file.basename).format("dddd")'

properties:
  formula.day_of_week:
    displayName: "星期"
  formula.word_estimate:
    displayName: "~字数"

views:
  - type: table
    name: "最近笔记"
    limit: 30
    order:
      - file.name
      - formula.day_of_week
      - formula.word_estimate
      - file.mtime
```

## 嵌入 Bases

在 Markdown 文件中嵌入：

```markdown
![[MyBase.base]]

<!-- 特定视图 -->
![[MyBase.base#视图名称]]
```

## YAML 引号规则

- 对包含双引号的公式使用单引号：`'if(done, "Yes", "No")'`
- 对简单字符串使用双引号：`"我的视图名称"`
- 在复杂表达式中正确转义嵌套引号

## 常见模式

### 按标签过滤
```yaml
filters:
  and:
    - file.hasTag("project")
```

### 按文件夹过滤
```yaml
filters:
  and:
    - file.inFolder("Notes")
```

### 按日期范围过滤
```yaml
filters:
  and:
    - 'file.mtime > now() - "7d"'
```

### 按属性值过滤
```yaml
filters:
  and:
    - 'status == "active"'
    - 'priority >= 3'
```

### 组合多个条件
```yaml
filters:
  or:
    - and:
        - file.hasTag("important")
        - 'status != "done"'
    - and:
        - 'priority == 1'
        - 'due != ""'
```

## 参考资料

- [Bases 语法](https://help.obsidian.md/bases/syntax)
- [函数](https://help.obsidian.md/bases/functions)
- [视图](https://help.obsidian.md/bases/views)
- [公式](https://help.obsidian.md/formulas)

---

## 后续动作（工具记忆）

完成 Obsidian Base 创建/编辑后，你应该：

### 验证步骤
1. 确认过滤器语法正确，特别是引号使用（单引号包裹含双引号的表达式）
2. 测试公式是否正确计算，检查日期/数字格式
3. 验证视图中的属性顺序是否符合预期

### 优化建议
1. 如果 Base 较复杂，考虑添加多个视图（表格、卡片、列表）
2. 为常用查询添加 `groupBy` 分组提高可读性
3. 使用 `summaries` 添加汇总统计（Sum、Average、Count 等）

### 关联操作
1. 在相关笔记中嵌入 Base：`![[MyBase.base]]` 或 `![[MyBase.base#视图名称]]`
2. 确保被查询的笔记有正确的 frontmatter 属性和标签
3. 如需创建新笔记模板，使用 `obsidian-markdown` Skill
