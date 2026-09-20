#!/usr/bin/env bash
# ==============================================================================
# Enterprise AI Coding Workflow 一键初始化脚本
# 基于 R&K Flow 规范 (HHU3637kr/skills) 与 AWR (Agent Work Runtime 0.4.0)
# ==============================================================================
set -euo pipefail

SKILLS_REPO_URL="${SKILLS_REPO_URL:-https://github.com/HHU3637kr/skills.git}"
TARGET_DIR="${1:-$PWD}"
mkdir -p "$TARGET_DIR"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
PROJECT_NAME="$(basename "$TARGET_DIR")"

echo "================================================================="
echo " 🚀 初始化企业 AI Coding 规范体系"
echo " 目标目录: $TARGET_DIR"
echo " 项目名称: $PROJECT_NAME"
echo " Skills源: $SKILLS_REPO_URL"
echo "================================================================="

# 1. 前置依赖检查
command -v git >/dev/null 2>&1 || { echo "❌ 错误: 未安装 git 命令"; exit 1; }

HAS_AWR=true
command -v awr >/dev/null 2>&1 || {
    HAS_AWR=false
    echo "⚠️ 提示: 系统尚未检测到 awr 命令 (建议全局安装: npm install -g @originoneai/agent-work-runtime@0.4.0 或 cargo install)"
}

cd "$TARGET_DIR"

# 2. 检查或初始化 Git 仓库
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "📦 正在初始化 Git 仓库 (默认分支: dev)..."
    git init -b dev
fi

# 3. 克隆或增量拉取 Skills 规范库
echo "📥 正在配置 Skills 依赖库 (.agents/skills)..."
mkdir -p .agents
if [ -d ".agents/skills/.git" ]; then
    echo "🔄 .agents/skills 已存在，执行增量更新..."
    git -C .agents/skills pull --ff-only || true
else
    rm -rf .agents/skills
    git clone --depth=1 "$SKILLS_REPO_URL" .agents/skills
fi

# 4. 建立运行时软链接（Windows Git Bash 下优先采用免提权 NTFS Junction）
echo "🔗 正在创建运行时与报告样式软链接..."
mkdir -p .omp

# 安全处理已有普通物理目录，防止破坏用户既有数据或产生嵌套软链接
if [ -d ".omp/skills" ] && [ ! -L ".omp/skills" ]; then
    BACKUP_PATH=".omp/skills.bak-$(date +%Y%m%d-%H%M%S)"
    echo "⚠️ 警告: 检测到 .omp/skills 为普通物理目录，正在备份至 $BACKUP_PATH..."
    mv .omp/skills "$BACKUP_PATH"
fi
if [ -d "html-report" ] && [ ! -L "html-report" ]; then
    BACKUP_PATH="html-report.bak-$(date +%Y%m%d-%H%M%S)"
    echo "⚠️ 警告: 检测到 html-report 为普通物理目录，正在备份至 $BACKUP_PATH..."
    mv html-report "$BACKUP_PATH"
fi

IS_WINDOWS_BASH=false
case "$(uname -s 2>/dev/null || true)" in
    CYGWIN*|MINGW*|MSYS*) IS_WINDOWS_BASH=true ;;
esac

if [ "$IS_WINDOWS_BASH" = true ] && command -v cmd.exe >/dev/null 2>&1; then
    # Windows Git Bash: 移除旧链接，利用 cmd.exe /c mklink /J 免提权创建目录联接
    rm -rf .omp/skills html-report 2>/dev/null || true
    cmd.exe /c "mklink /J .omp\\skills .agents\\skills" >/dev/null 2>&1 || ln -sfn ../.agents/skills .omp/skills
    cmd.exe /c "mklink /J html-report .agents\\skills\\html-report" >/dev/null 2>&1 || ln -sfn .agents/skills/html-report html-report
else
    ln -sfn ../.agents/skills .omp/skills
    ln -sfn .agents/skills/html-report html-report
fi

# 5. 落地项目级企业治理规则 (.agents/rules/)
echo "📜 正在固化企业治理规则 (.agents/rules/)..."
mkdir -p .agents/rules
if [ -d ".agents/skills/.agents/rules" ]; then
    cp -rn .agents/skills/.agents/rules/* .agents/rules/ 2>/dev/null || cp -r .agents/skills/.agents/rules/* .agents/rules/
fi

# 6. 生成标准薄入口 (.omp/AGENTS.md)
if [ ! -f ".omp/AGENTS.md" ]; then
    echo "📝 正在生成标准薄入口 (.omp/AGENTS.md)..."
    cat << EOF > .omp/AGENTS.md
# $PROJECT_NAME — 项目约定

## 项目身份
- **类型**: 企业应用服务
- **运行时**: OMP (Oh My Pi) + AWR (Agent Work Runtime 0.4.0)
- **版本控制**: \`dev + release\` 分支流（PR/MR 审查）

## 规则与技能导入
@import .agents/rules/
@import .agents/skills/

## 文档与架构规约
- **三级架构规范**：遵循 R&K Flow「项目 → Version → Spec」三级架构（详见 \`.agents/rules/spec-workflow.md\`）。
  - 版本空间：\`spec/versions/<version>/\`
  - 经验知识库：\`spec/context/experience/\` 与 \`spec/context/knowledge/\`
- **阶段与提交门禁**：
  - \`spec → plan → 执行\`，每个阶段边界必须取得人的确认；\`git commit\`、\`git push\`、开 MR 一律先经人确认。
EOF
fi

# 7. 搭建三级架构空间与经验知识库
echo "🏗️ 正在构建三级架构与经验库骨架 (spec/)..."
mkdir -p spec/versions spec/context/experience spec/context/knowledge

if [ ! -f "spec/versions/README.md" ]; then
    cat << EOF > spec/versions/README.md
# 架构与版本空间 (Versions Space)
遵循 R&K Flow 三级架构（\`Project → Version → Spec\`），后续版本规划与 Spec 均在此目录下建立。
EOF
fi

if [ ! -f "spec/context/experience/index.md" ]; then
    cat << EOF > spec/context/experience/index.md
# 经验记忆索引 (Experience Index)
记录开发中沉淀的重大「困境-策略对」经验。每次开始复杂任务前，由 \`exp-search\` 先读本表，命中后再按需加载对应详情文件。

| ID | 标题 | 关键词 | 适用场景 | 一句话策略 | 详情文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| EXP-001 | 占位示例 | 经验, 样例 | 项目初始化 | 遇到复杂技术陷阱时通过 exp-reflect 沉淀到此处 | - |
EOF
fi

if [ ! -f "spec/context/knowledge/index.md" ]; then
    cat << EOF > spec/context/knowledge/index.md
# 知识记忆索引 (Knowledge Index)
记录项目全局架构、核心数据流分析与重大技术调研结论。

| ID | 标题 | 类型 | 关键词 | 一句话概述 | 详情文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| KNOW-001 | 系统核心架构与数据流 | 项目理解 | 架构, 数据流 | 系统端到端核心数据流转链路说明 | - |
EOF
fi

# 8. 基础目标与工作台账 (AWR 核心源)
if [ ! -f "GOALS.md" ]; then
    cat << EOF > GOALS.md
# Project goal {#intake-goal status=active}

$PROJECT_NAME 业务开发、特性演进与代码质量保障。
- **范围**：核心业务模块及相关接口。
- **验收准则**：系统架构稳定，代码规范统一，功能满足业务诉求。
EOF
fi

if [ ! -f "work-ledger.yaml" ]; then
    cat << EOF > work-ledger.yaml
work_items:
  - id: INTAKE-001
    kind: intake
    title: 核实项目目标、现状与下一步交付
    status: ready
    priority: P0
    required: true
    depends_on: []
    acceptance:
      - 逐项确认目标、已有实现、未完成工作和阻塞，保留来源引用。
      - 将不能确定的进度标记待核实，形成下一项可执行工作的验收条件。
    next_action: 运行 awr intake inspect，按缺项读取原始资料；补齐目标引用、验收和下一步后再次复检。
    summary: 这是新建的接入工作；不代表已有项目功能尚未实现或已经通过验收。
EOF
fi

# 9. 配置与初始化 AWR 运行时
if [ "$HAS_AWR" = true ]; then
    echo "⚙️ 正在初始化 AWR 运行时状态机..."
    mkdir -p .awr
    TMP_MANIFEST="$(mktemp /tmp/awr-manifest-XXXXXX.toml)"
    cat << EOF > "$TMP_MANIFEST"
[project]
name = "$PROJECT_NAME"
authority_mode = "source_first"
authorized_roots = []
context_profile = "minimal"

[[sources]]
domain = "goal"
role = "primary"
path = "GOALS.md"
adapter = "markdown-heading-v1"
[sources.options]
status = "active"

[[sources]]
domain = "ledger"
role = "primary"
path = "work-ledger.yaml"
adapter = "yaml-ledger-v1"
[sources.options]

[[sources]]
domain = "rules"
role = "primary"
path = ".agents/rules/spec-workflow.md"
adapter = "markdown-rules-v1"
[sources.options]
EOF
    awr init --project . --manifest "$TMP_MANIFEST" --accept >/dev/null 2>&1 || true
    rm -f "$TMP_MANIFEST"
    awr source reindex >/dev/null 2>&1 || true
fi

# 10. 更新 .gitignore（幂等）
echo "🛡️ 正在更新 .gitignore 过滤规则..."
touch .gitignore
cat << 'EOF' >> .gitignore

# ==============================================================================
# AI Coding Workflow 忽略规则
# ==============================================================================
# AWR 本地运行时状态数据库
.awr/state.db
.awr/state.db-*
.awr/artifacts/
.awr/mutations/
.awr/cache/
.awr/clients/
.awr/executions/

# Skills 单版本源与运行时软链接
.agents/skills/
html-report
.omp/skills
EOF

# 对 .gitignore 进行去重收敛
awk '!seen[$0]++' .gitignore > .gitignore.tmp && mv .gitignore.tmp .gitignore

echo "================================================================="
echo " 🎉 AI Coding 工作流初始化成功！"
echo " 已就绪组件:"
echo "  - 规范库与软链接: .agents/skills/ -> .omp/skills"
echo "  - 企业治理规范:   .agents/rules/"
echo "  - 入口与路由定义: .omp/AGENTS.md"
echo "  - 三级架构空间:   spec/versions/ & spec/context/"
echo "  - AWR 目标与台账: GOALS.md & work-ledger.yaml"
echo "================================================================="
