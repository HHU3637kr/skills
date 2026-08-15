---
name: project-overview
version: 1.2.0
description: "整理项目全链路结构与流程，生成单文件 HTML 总览（tab 分模块、字段级折叠明细、记录 git 版本）。当用户要求整理项目结构/梳理全链路流程/生成或更新项目总览 HTML、或代码改动后要同步总览口径时使用。"
metadata:
  requires:
    bins: ["git"]
---

# 项目全链路总览（project-overview）

把「从输入到产出的全链路流程与细节」整理成单文件 HTML 总览。**产出物**：
`docs/全链路流程总览.html`（或用户指定路径）。

**skill 自带三件套（在本 skill 目录的 `assets/` 下），新建报告直接用，
不要从零写样式或交互**：

| 文件 | 作用 | 缺了会怎样 |
|---|---|---|
| `assets/skeleton.html` | HTML 骨架（页眉/tab/折叠表/占位块示例） | 手写易错 `tab-` 前缀与折叠行顺序 |
| `assets/overview.css` | 全部样式 | 无样式裸页 |
| `assets/overview.js` | tab 切换 + hash 同步 + 行内折叠 | **点折叠行无反应、tab 点不动** |

起步：`cp assets/skeleton.html <目标路径>` → 把 `assets/overview.css` 与
`assets/overview.js` 全文粘进骨架对应的 `<style>` / `<script>`（骨架里已标注
粘贴位置）→ 按实际模块替换 tab 与内容。本规范任何项目通用，
**不预设模块清单**，模块以扫描结果和用户确认为准。

## 核心流程（每轮都先问，不擅自推进）

```
① 扫模块 → ② 问：初版总览 or 深挖某模块 → ③ 生成/填充 → ④ 展示等确认 → 回到 ②，直到无占位块
```

- **第 ② 步是硬规则**：每次完成一轮后，列出剩余未填充模块，问
  「继续深挖哪个模块 / 直接出初版」，不要自作主张一路填完。
- 用户确认某模块细节已够（或要求调整）后才进入下一模块。
- 全部填充完毕后做一次**残留检查**（见「完成检查」），再向用户交付。

## ① 扫描项目模块（通用方法，不预设清单）

1. `read` 项目根目录 + `glob` 各目录结构，读项目说明文件
   （`CLAUDE.md` / `AGENTS.md` / `README.md`）与各模块入口文件确认职责边界。
2. 按**数据流**组织模块划分：入口（消息/请求接收与适配）→ 核心管线各阶段
   （按产物流拆分）→ 汇总/产出层 → 支撑素材与知识库 → 基础设施（存储、
   外部服务、契约、工具）。
3. **模块命名与划分口径先问用户确认**，不自己发明——命名返工成本高
   （实例：曾把「维度分析」当主管线、把编排单位和功能单位混在一起，用户
   纠正后才定稿）。划分结果若用户有既定口径（如「层1/层2/层3」），一律
   沿用用户口径。

**内容权威源**：产物契约 / schema 是层间协议的权威源；实现文件确认实际
行为；文档注释与实现冲突时以契约为准并**在总览里标注差异**。

## ② 交互决策（每轮生成前先问）

- 首轮：问「生成初版总览（大流程），还是直接深挖某个模块？」
- 后续每轮：展示当前成果 + 剩余模块清单，问「继续哪个 / 收尾？」
- 用户说「先出初版」→ 只填大流程（模块职责表 + 流程框图），每页留
  `.todo` 占位块；用户说「深挖 X」→ 填 X 的指标/字段级明细。

## ③ 生成 HTML 的规范（骨架 + 三件套）

- **起步用 `assets/skeleton.html`**，不从空文件写。CSS/JS 取本 skill 的
  `assets/overview.css` / `assets/overview.js`，**内联**进 `<style>` / `<script>`
  （保持单文件离线可开）。样式或交互要改只改 skill `assets/` 里这两个文件，
  不在报告里派生第二份。
- **单文件**：无外部依赖，离线可开；`<meta charset="utf-8">`。
- **JS 必带**：折叠与 tab 全靠 `overview.js`，漏了页面看着正常但点不动
  ——交付前必须实际点一次验证。
- **Tab 栏**：`nav.tabs` + `section.tab-page`，URL hash 记录当前 tab
  （`location.hash`，刷新/分享停在原页）。
- **页眉 `header.site`**：渐变蓝底。**必须含 git 版本行**（见下节）。
- **每页结构**：`h2` 模块标题（带目录 code 标注）→ `card` 概览/流程框图 →
  职责表 → 明细。流程用纯 CSS 框图（`.flow` / `.fnode` / `.farrow`），不用图片。
- **明细统一用「表格行内折叠」**：主行 `tr.gx-row`（点击展开）+ 紧跟的
  `tr.gx-detail hidden`（明细表）。样式已内联在 overview.css，直接复用：
  - 指标级明细 4 列：**名称（字段）| 需求/产品对应名 | 产出 | 依赖与口径**
  - 中间产物明细 3 列：**字段 | 产出 | 说明**
  - 折叠行样式：`▸` 指示符、`table-layout: fixed` 固定列宽（长字段名
    `word-break: break-all`，**否则长名会撑爆表格**）。
- **徽标**：`.badge code|llm|mix` 标注每个指标/维度的产出方式
  （CODE / LLM / CODE+LLM）——没有 LLM 的项目删掉对应徽标用法即可。
- **占位块**：未填充细节用 `.todo` 块（橙虚线「待填充细节」），逐条列深挖
  方向；填充后必须删除对应占位块。
- **对齐外部需求文档**（如有）：明细表每行给「需求/产品指标名称」（加粗，
  与文档原文一字不差）+ 展示位/出处（小字）。发现实现与文档不一致时，
  **在文档内标注差异，不擅自改口径**。
- **口径要写「怎么算」**：公式、阈值常量、降级路径、跨模块回填来源，都是
  用户要看的细节。

## git 版本记录（页眉 + 更新流程）

页眉副标题格式：

```
{一句话定位} · 按功能模块划分 · 更新于 {YYYY-MM-DD HH:MM}
（代码 {git rev-parse --short HEAD} · {最近一条 commit 标题摘要} · 已同步 MR !N/!M 的口径变更）
```

- **生成/更新时必做**：`git rev-parse --short HEAD` + `git log --oneline -1`，
  把短 commit 号与摘要写进页眉。没有版本行视为未完成。
- **更新触发**：代码改动（MR 合入、修复提交）后，用户要求同步总览时：
  1. `git log --oneline -10` + 相关 spec/变更记录，盘出本次改了哪些口径；
  2. 在 HTML 里搜对应锚点（字段名/口径描述），逐处更新；
  3. 更新页眉时间戳 + commit 号 + MR 号；
  4. 检查残留旧口径（grep 旧字段名/旧描述确认无漏网）。

## 完成检查（交付前必做，可脚本化）

```python
# 结构自检：三项一次跑完
import re, pathlib
h = pathlib.Path("<报告路径>").read_text(encoding="utf-8")
print("残留占位块:", len(re.findall(r'class="todo[\s"]', h)))          # 须为 0
navs = re.findall(r'data-tab="([\w-]+)"', h)
secs = re.findall(r'id="tab-([\w-]+)"', h)
print("tab 配对:", navs == secs, navs, secs)                          # 须 True
print("折叠行配对:", len(re.findall(r'class="gx-row"', h)) ==
                     len(re.findall(r'class="gx-detail"', h)))        # 须 True
print("含版本行:", bool(re.search(r'代码 [0-9a-f]{7,}', h)))          # 须 True
print("含交互 JS:", "gx-detail" in h.split("<script>")[-1])           # 须 True
```

脚本全绿后**必须用浏览器实跑**——源码检查看不出交互失效与版式溢出：

1. 切 tab、点两个折叠行、改 hash 与按后退键（验证 `hashchange`）；
2. **多视口查横向溢出**（1440/1280/1024/760），任一视口
   `scrollWidth > clientWidth` 即有元素撑穿容器：

```js
// 逐视口跑；overflow 须全为 false
({ scrollW: document.documentElement.scrollWidth,
   clientW: document.documentElement.clientWidth,
   overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 })
// 溢出时定位罪魁：找 scrollWidth 超出自身 clientWidth 的容器
[...document.querySelectorAll('div.card, li, td, .fnode')]
  .filter(el => el.scrollWidth > el.clientWidth + 1)
  .map(el => ({ tag: el.tagName, cls: el.className, sw: el.scrollWidth, cw: el.clientWidth }))
```

3. 验证改动时用 `?v=<时间戳>` 绕缓存，否则跑的是旧 CSS/JS 会误判。

## 常见坑

| 坑 | 处理 |
|---|---|
| 长字段名撑爆表格 | 明细表 `table-layout: fixed` + 首列 `word-break: break-all`（overview.css 已有） |
| **连续 ASCII 长串撑穿整页** | 白名单/路径串（`a/b/c/d…` 200+ 字符）在 CJK 段落里不断行，顶穿容器产生整页横向滚动。`overview.css` 已加 `.card, .card p, .card li, .fnode, td, .hint { overflow-wrap: anywhere; }`；验证必查 `scrollWidth > clientWidth` |
| **只内联 CSS 忘了 JS** | 页面样式正常但 tab 点不动、折叠行无反应。`overview.js` 必带，交付前实点验证 |
| 从空文件手写 HTML | 用 `skeleton.html` 起步；手写易错 `tab-` 前缀、折叠行顺序、`colspan` |
| `gx-detail` 放在 `gx-row` 之前 | 折叠靠 `nextElementSibling`，顺序颠倒即失效 |
| 只在启动时读一次 hash | 手改 `#tab`、站内锚点、后退键都不切内容。必须监听 `hashchange`；点 tab 用 `pushState`（`replaceState` 会让后退键失效）——`overview.js` 已修 |
| 浏览器缓存导致「改了没生效」 | 验证时用 `?v=N` 绕缓存或硬刷新，否则跑的是旧 JS，会误判修复无效 |
| 折叠块新开独立章节（用户明确不喜欢） | 折叠必须做在表格的**行内**，不新开位置 |
| 文档注释与实现/契约冲突 | 以契约 + 实现为准，总览里按实际行为写并标注 |
| 需求/产品指标名对不上 | 从文档原文复制名称，发现命名差异标注出来，不猜 |
| 忘了页眉版本行 | 每次更新总览都必须刷新 commit 号与时间戳 |
| 多轮对话后内容漂移 | 每轮填充完让用户看一遍再继续，口径变更逐处 grep 确认 |
| 模块命名自作主张 | 划分口径先问用户，沿用用户既定叫法（层1/层2…） |

## Git 红线（默认先批准后执行）

- 提交/推送 HTML、`git add` 等一律先展示命令等用户批准；只读（`log`/
  `rev-parse`/`status`）可直接执行。
- 产物默认本地工作文档，是否入库由用户决定（实例：20260813 用户明确说
  「提交吧」后才提交，此前一直未跟踪）。
