---
name: skill-creator
description: 创建有效 Skill 的指南。当用户想要创建新 Skill（或更新现有 Skill）以扩展 Claude 的能力时使用，包括专业知识、工作流程或工具集成。
license: 完整条款见 LICENSE.txt
---

# Skill 创建器

本 Skill 提供创建有效 Skill 的指导。

## 关于 Skill

Skill 是模块化、自包含的包，通过提供专业知识、工作流程和工具来扩展 Claude 的能力。可以将它们视为特定领域或任务的"入职指南"——它们将 Claude 从通用 Agent 转变为配备程序性知识的专业 Agent，而这些知识是任何模型都无法完全具备的。

### Skill 提供什么

1. 专业工作流程 - 特定领域的多步骤流程
2. 工具集成 - 处理特定文件格式或 API 的说明
3. 领域专业知识 - 公司特定知识、模式、业务逻辑
4. 捆绑资源 - 用于复杂和重复任务的脚本、参考资料和资产

## 核心原则

### 简洁是关键

上下文窗口是公共资源。Skill 与 Claude 需要的所有其他内容共享上下文窗口：系统提示、对话历史、其他 Skill 的元数据以及实际用户请求。

**默认假设：Claude 已经非常智能。** 只添加 Claude 尚未具备的上下文。对每条信息提出质疑："Claude 真的需要这个解释吗？"以及"这段内容值得消耗这些 token 吗？"

优先使用简洁的示例而非冗长的解释。

### 设置适当的自由度

根据任务的脆弱性和可变性匹配具体程度：

**高自由度（基于文本的说明）**：当多种方法都有效、决策取决于上下文或启发式方法指导方法时使用。

**中等自由度（伪代码或带参数的脚本）**：当存在首选模式、可接受一定变化或配置影响行为时使用。

**低自由度（特定脚本，少量参数）**：当操作脆弱且容易出错、一致性至关重要或必须遵循特定顺序时使用。

将 Claude 想象为探索路径：悬崖边的窄桥需要特定护栏（低自由度），而开阔的田野允许多条路线（高自由度）。

### Skill 的结构

每个 Skill 由必需的 SKILL.md 文件和可选的捆绑资源组成：

```
skill-name/
├── SKILL.md（必需）
│   ├── YAML frontmatter 元数据（必需）
│   │   ├── name:（必需）
│   │   └── description:（必需）
│   └── Markdown 说明（必需）
└── 捆绑资源（可选）
    ├── scripts/          - 可执行代码（Python/Bash 等）
    ├── references/       - 需要时加载到上下文的文档
    └── assets/           - 用于输出的文件（模板、图标、字体等）
```

#### SKILL.md（必需）

每个 SKILL.md 包含：

- **Frontmatter**（YAML）：包含 `name` 和 `description` 字段。这是 Claude 用来确定何时使用该 Skill 的唯一字段，因此清晰全面地描述 Skill 是什么以及何时应该使用它非常重要。
- **正文**（Markdown）：使用 Skill 的说明和指导。仅在 Skill 触发后（如果触发）才加载。

#### 捆绑资源（可选）

##### 脚本（`scripts/`）

用于需要确定性可靠性或重复编写的任务的可执行代码（Python/Bash 等）。

- **何时包含**：当相同代码被重复编写或需要确定性可靠性时
- **示例**：用于 PDF 旋转任务的 `scripts/rotate_pdf.py`
- **优点**：节省 token、确定性、可以在不加载到上下文的情况下执行
- **注意**：脚本可能仍需要被 Claude 读取以进行修补或环境特定调整

##### 参考资料（`references/`）

旨在根据需要加载到上下文中以指导 Claude 流程和思考的文档和参考材料。

- **何时包含**：用于 Claude 在工作时应参考的文档
- **示例**：用于财务模式的 `references/finance.md`、用于公司 NDA 模板的 `references/mnda.md`、用于公司政策的 `references/policies.md`、用于 API 规范的 `references/api_docs.md`
- **用例**：数据库模式、API 文档、领域知识、公司政策、详细工作流程指南
- **优点**：保持 SKILL.md 精简，仅在 Claude 确定需要时加载
- **最佳实践**：如果文件较大（>10k 字），在 SKILL.md 中包含 grep 搜索模式
- **避免重复**：信息应该存在于 SKILL.md 或参考文件中，而不是两者都有。除非信息确实是 Skill 的核心，否则优先使用参考文件存放详细信息——这样可以保持 SKILL.md 精简，同时使信息可发现而不占用上下文窗口。仅在 SKILL.md 中保留基本的程序性说明和工作流程指导；将详细的参考材料、模式和示例移至参考文件。

##### 资产（`assets/`）

不打算加载到上下文中，而是在 Claude 生成的输出中使用的文件。

- **何时包含**：当 Skill 需要在最终输出中使用的文件时
- **示例**：用于品牌资产的 `assets/logo.png`、用于 PowerPoint 模板的 `assets/slides.pptx`、用于 HTML/React 样板的 `assets/frontend-template/`、用于排版的 `assets/font.ttf`
- **用例**：模板、图片、图标、样板代码、字体、被复制或修改的示例文档
- **优点**：将输出资源与文档分开，使 Claude 能够使用文件而无需将其加载到上下文中

#### Skill 中不应包含的内容

Skill 应该只包含直接支持其功能的必要文件。不要创建无关的文档或辅助文件，包括：

- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md
- 等等

Skill 应该只包含 AI Agent 完成手头工作所需的信息。它不应包含关于创建过程、设置和测试程序、面向用户的文档等辅助上下文。创建额外的文档文件只会增加混乱和困惑。

### 渐进式披露设计原则

Skill 使用三级加载系统来高效管理上下文：

1. **元数据（name + description）** - 始终在上下文中（约 100 字）
2. **SKILL.md 正文** - 当 Skill 触发时（<5k 字）
3. **捆绑资源** - 根据 Claude 需要（无限制，因为脚本可以在不读入上下文窗口的情况下执行）

#### 渐进式披露模式

保持 SKILL.md 正文精简，控制在 500 行以内以最小化上下文膨胀。接近此限制时将内容拆分到单独的文件中。拆分内容到其他文件时，务必从 SKILL.md 引用它们并清楚描述何时读取它们，以确保 Skill 的读者知道它们的存在以及何时使用它们。

**关键原则**：当 Skill 支持多种变体、框架或选项时，仅在 SKILL.md 中保留核心工作流程和选择指导。将特定变体的详细信息（模式、示例、配置）移至单独的参考文件。

**模式 1：带参考的高级指南**

```markdown
# PDF 处理

## 快速开始

使用 pdfplumber 提取文本：
[代码示例]

## 高级功能

- **表单填写**：完整指南见 [FORMS.md](FORMS.md)
- **API 参考**：所有方法见 [REFERENCE.md](REFERENCE.md)
- **示例**：常见模式见 [EXAMPLES.md](EXAMPLES.md)
```

Claude 仅在需要时加载 FORMS.md、REFERENCE.md 或 EXAMPLES.md。

**模式 2：按领域组织**

对于具有多个领域的 Skill，按领域组织内容以避免加载无关上下文：

```
bigquery-skill/
├── SKILL.md（概述和导航）
└── reference/
    ├── finance.md（收入、计费指标）
    ├── sales.md（机会、管道）
    ├── product.md（API 使用、功能）
    └── marketing.md（活动、归因）
```

当用户询问销售指标时，Claude 只读取 sales.md。

类似地，对于支持多个框架或变体的 Skill，按变体组织：

```
cloud-deploy/
├── SKILL.md（工作流程 + 提供商选择）
└── references/
    ├── aws.md（AWS 部署模式）
    ├── gcp.md（GCP 部署模式）
    └── azure.md（Azure 部署模式）
```

当用户选择 AWS 时，Claude 只读取 aws.md。

**模式 3：条件详情**

显示基本内容，链接到高级内容：

```markdown
# DOCX 处理

## 创建文档

使用 docx-js 创建新文档。见 [DOCX-JS.md](DOCX-JS.md)。

## 编辑文档

对于简单编辑，直接修改 XML。

**对于修订跟踪**：见 [REDLINING.md](REDLINING.md)
**对于 OOXML 详情**：见 [OOXML.md](OOXML.md)
```

Claude 仅在用户需要这些功能时读取 REDLINING.md 或 OOXML.md。

**重要指南**：

- **避免深层嵌套引用** - 保持引用从 SKILL.md 只有一层深度。所有参考文件应直接从 SKILL.md 链接。
- **结构化较长的参考文件** - 对于超过 100 行的文件，在顶部包含目录，以便 Claude 在预览时可以看到完整范围。

## Skill 创建流程

Skill 创建涉及以下步骤：

1. 通过具体示例理解 Skill
2. 规划可重用的 Skill 内容（脚本、参考资料、资产）
3. 初始化 Skill（运行 init_skill.py）
4. 编辑 Skill（实现资源并编写 SKILL.md）
5. 打包 Skill（运行 package_skill.py）
6. 基于实际使用迭代

按顺序执行这些步骤，仅在有明确理由说明不适用时才跳过。

### 步骤 1：通过具体示例理解 Skill

仅当 Skill 的使用模式已经清楚理解时才跳过此步骤。即使在处理现有 Skill 时，此步骤仍然有价值。

要创建有效的 Skill，需要清楚理解 Skill 将如何使用的具体示例。这种理解可以来自直接的用户示例或经过用户反馈验证的生成示例。

例如，在构建图像编辑器 Skill 时，相关问题包括：

- "图像编辑器 Skill 应该支持什么功能？编辑、旋转，还有其他吗？"
- "你能给一些这个 Skill 将如何使用的示例吗？"
- "我可以想象用户会要求'去除这张图片的红眼'或'旋转这张图片'。还有其他你想象的使用方式吗？"
- "用户说什么应该触发这个 Skill？"

为避免让用户不堪重负，避免在单条消息中问太多问题。从最重要的问题开始，根据需要跟进以获得更好的效果。

当对 Skill 应支持的功能有清晰认识时，结束此步骤。

### 步骤 2：规划可重用的 Skill 内容

要将具体示例转化为有效的 Skill，通过以下方式分析每个示例：

1. 考虑如何从头执行该示例
2. 识别在重复执行这些工作流程时哪些脚本、参考资料和资产会有帮助

示例：在构建 `pdf-editor` Skill 以处理"帮我旋转这个 PDF"等查询时，分析显示：

1. 旋转 PDF 每次都需要重写相同的代码
2. 在 Skill 中存储 `scripts/rotate_pdf.py` 脚本会有帮助

示例：在设计 `frontend-webapp-builder` Skill 以处理"给我构建一个待办应用"或"给我构建一个跟踪步数的仪表板"等查询时，分析显示：

1. 编写前端 webapp 每次都需要相同的样板 HTML/React
2. 在 Skill 中存储包含样板 HTML/React 项目文件的 `assets/hello-world/` 模板会有帮助

示例：在构建 `big-query` Skill 以处理"今天有多少用户登录？"等查询时，分析显示：

1. 查询 BigQuery 每次都需要重新发现表模式和关系
2. 在 Skill 中存储记录表模式的 `references/schema.md` 文件会有帮助

要确定 Skill 的内容，分析每个具体示例以创建要包含的可重用资源列表：脚本、参考资料和资产。

### 步骤 3：初始化 Skill

此时，是时候实际创建 Skill 了。

仅当正在开发的 Skill 已经存在且需要迭代或打包时才跳过此步骤。在这种情况下，继续下一步。

从头创建新 Skill 时，始终运行 `init_skill.py` 脚本。该脚本方便地生成一个新的模板 Skill 目录，自动包含 Skill 所需的一切，使 Skill 创建过程更加高效和可靠。

用法：

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```

该脚本：

- 在指定路径创建 Skill 目录
- 生成带有正确 frontmatter 和 TODO 占位符的 SKILL.md 模板
- 创建示例资源目录：`scripts/`、`references/` 和 `assets/`
- 在每个目录中添加可以自定义或删除的示例文件

初始化后，根据需要自定义或删除生成的 SKILL.md 和示例文件。

### 步骤 4：编辑 Skill

编辑（新生成或现有的）Skill 时，请记住该 Skill 是为另一个 Claude 实例使用而创建的。包含对 Claude 有益且非显而易见的信息。考虑什么程序性知识、领域特定细节或可重用资产可以帮助另一个 Claude 实例更有效地执行这些任务。

#### 学习经过验证的设计模式

根据 Skill 的需求查阅这些有用的指南：

- **多步骤流程**：见 references/workflows.md 了解顺序工作流程和条件逻辑
- **特定输出格式或质量标准**：见 references/output-patterns.md 了解模板和示例模式

这些文件包含有效 Skill 设计的既定最佳实践。

#### 从可重用的 Skill 内容开始

要开始实现，从上面确定的可重用资源开始：`scripts/`、`references/` 和 `assets/` 文件。注意此步骤可能需要用户输入。例如，在实现 `brand-guidelines` Skill 时，用户可能需要提供品牌资产或模板存储在 `assets/` 中，或文档存储在 `references/` 中。

添加的脚本必须通过实际运行来测试，以确保没有错误且输出符合预期。如果有许多类似的脚本，只需测试代表性样本以确保它们都能工作，同时平衡完成时间。

任何 Skill 不需要的示例文件和目录都应删除。初始化脚本在 `scripts/`、`references/` 和 `assets/` 中创建示例文件以演示结构，但大多数 Skill 不需要所有这些。

#### 更新 SKILL.md

**编写指南**：始终使用祈使句/不定式形式。

##### Frontmatter

编写带有 `name` 和 `description` 的 YAML frontmatter：

- `name`：Skill 名称
- `description`：这是 Skill 的主要触发机制，帮助 Claude 理解何时使用该 Skill。
  - 包括 Skill 做什么以及何时使用它的具体触发器/上下文。
  - 在此处包含所有"何时使用"信息 - 不要放在正文中。正文仅在触发后加载，因此正文中的"何时使用此 Skill"部分对 Claude 没有帮助。
  - `docx` Skill 的示例描述："全面的文档创建、编辑和分析，支持修订跟踪、评论、格式保留和文本提取。当 Claude 需要处理专业文档（.docx 文件）时使用：(1) 创建新文档，(2) 修改或编辑内容，(3) 处理修订跟踪，(4) 添加评论，或任何其他文档任务"

不要在 YAML frontmatter 中包含任何其他字段。

##### 正文

编写使用 Skill 及其捆绑资源的说明。

### 步骤 4.5：评估是否需要 .claude/rules/ 摘要

如果 Skill 包含应全局遵守的规范（如编码规范、架构约定），需要在 `.claude/rules/` 下创建摘要文件，确保这些规范在每次会话中自动加载。

**判断标准**：

| 条件 | 需要 rules 摘要 | 不需要 |
|------|----------------|--------|
| 包含编码规范 | ✅ 如命名约定、架构约定 | ❌ 纯工作流程 |
| 包含全局约束 | ✅ 如禁止操作、必须遵守的规则 | ❌ 仅限特定场景 |
| 每次会话都需要 | ✅ 如代码风格、提交规范 | ❌ 按需触发即可 |

**如果需要**：
1. 在 `.claude/rules/` 下创建对应的 `.md` 文件
2. 文件名格式：`{skill-name}-rules.md`
3. 内容：仅包含规范摘要（不超过 20 行），引用 Skill 获取详情

**摘要文件示例**：
```markdown
# spec-writer 规范摘要
- Spec 必须放入 01-05 分类目录
- 文件夹命名：YYYYMMDD-HHMM-中文任务描述
- 文件名固定为 plan.md
- 详细规范见 spec-writer Skill
```

**如果不需要**：跳过此步骤，Skill 仅通过触发机制按需加载。

### 步骤 5：打包 Skill

Skill 开发完成后，必须将其打包成可分发的 .skill 文件与用户共享。打包过程会自动先验证 Skill 以确保它满足所有要求：

```bash
scripts/package_skill.py <path/to/skill-folder>
```

可选的输出目录指定：

```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```

打包脚本将：

1. **自动验证** Skill，检查：

   - YAML frontmatter 格式和必需字段
   - Skill 命名约定和目录结构
   - 描述的完整性和质量
   - 文件组织和资源引用

2. 如果验证通过则**打包** Skill，创建以 Skill 命名的 .skill 文件（例如 `my-skill.skill`），包含所有文件并保持正确的目录结构以供分发。.skill 文件是带有 .skill 扩展名的 zip 文件。

如果验证失败，脚本将报告错误并退出而不创建包。修复任何验证错误并再次运行打包命令。

### 步骤 6：迭代

测试 Skill 后，用户可能会请求改进。这通常发生在使用 Skill 后不久，对 Skill 表现有新鲜的上下文。

**迭代工作流程**：

1. 在实际任务中使用 Skill
2. 注意困难或低效之处
3. 确定应如何更新 SKILL.md 或捆绑资源
4. 实施更改并再次测试

---

## 后续动作（工具记忆）

完成 Skill 创建/编辑后，你应该：

### 验证步骤
1. 检查 SKILL.md 的 frontmatter 是否完整（name、description 必填）
2. 确认 description 包含"何时使用"的触发条件
3. 验证所有引用的资源文件（scripts/、references/、assets/）都存在
4. 如有脚本，运行测试确保无错误
5. 如果 Skill 包含全局规范，检查 `.claude/rules/` 下是否有对应摘要文件
6. 如有摘要文件，确认摘要内容与 Skill 正文一致（避免信息不同步）

### 质量检查
1. SKILL.md 正文是否控制在 500 行以内？
2. 是否避免了与 references/ 文件的内容重复？
3. 是否删除了不需要的示例文件和目录？
4. 较长的参考文件是否有目录？

### 打包与分发
1. 运行 `scripts/package_skill.py <skill-folder>` 打包
2. 如验证失败，根据错误信息修复后重新打包
3. 将生成的 `.skill` 文件分享给用户

### 常见陷阱
- description 中遗漏触发条件，导致 Skill 不会被自动调用
- 在正文中写"何时使用此 Skill"（应写在 description 中）
- 创建了 README.md 等不必要的辅助文件
- 脚本未经测试就打包分发
