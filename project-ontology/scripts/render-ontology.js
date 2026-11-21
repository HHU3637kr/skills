#!/usr/bin/env node
/**
 * 将 ontology.json 渲染为单文件离线 HTML 视图（project-ontology skill）
 *
 * 用法：
 *   node render-ontology.js <ontology.json> [--out <output.html>]
 *
 * 零外部依赖，仅需 Node >= 14。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const {
  validateOntology,
  buildNodeIndex,
  computeSourceHash,
} = require("./check-ontology.js");

function escapeHtml(val) {
  return String(val == null ? "" : val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function producerBadge(type) {
  const map = { code: "CODE", llm: "LLM", mix: "CODE+LLM" };
  const label = map[type] || String(type || "CODE").toUpperCase();
  const cls = ["code", "llm", "mix"].includes(type) ? type : "code";
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderAnchors(anchors) {
  if (!Array.isArray(anchors) || anchors.length === 0) return "";
  return (
    `<div class="anchor-list">` +
    anchors.map((a) => `<code>${escapeHtml(a)}</code>`).join("") +
    `</div>`
  );
}

function renderRelChip(edge, direction, nodes) {
  const peerId = direction === "out" ? edge.to : edge.from;
  const peer = nodes.get(peerId);
  const peerLabel = peer ? `${peer.name} (${peerId})` : peerId;
  const arrow = direction === "out" ? "→" : "←";
  const titleAttr = edge.note ? ` title="${escapeHtml(edge.note)}"` : "";
  return `<span class="rel-chip rel-${escapeHtml(edge.type)}"${titleAttr}>${arrow} ${escapeHtml(
    edge.type
  )}: ${escapeHtml(peerLabel)}</span>`;
}

function renderOverviewTab(data, stats, nodes) {
  const keyFactsHtml = (data.project.key_facts || [])
    .map((f) => `<li>${escapeHtml(f)}</li>`)
    .join("\n      ");

  const flowHtml = (data.flow || [])
    .map((row) => {
      const nodesHtml = (row.nodes || [])
        .map((n) => {
          const styleCls = n.style && n.style !== "default" ? ` ${escapeHtml(n.style)}` : "";
          return `<div class="fnode${styleCls}"><b>${escapeHtml(n.label)}</b>${escapeHtml(
            n.desc || ""
          )}</div>`;
        })
        .join("\n      ");
      const arrowHtml = row.arrow_after
        ? `\n    <div class="farrow">↓<small>${escapeHtml(row.arrow_after)}</small></div>`
        : "";
      return `    <div class="flow-row">\n      ${nodesHtml}\n    </div>${arrowHtml}`;
    })
    .join("\n");

  const modRowsHtml = (data.modules || [])
    .map((m) => {
      const isExt = m.kind === "external";
      const dirs =
        (m.dirs || []).map((d) => `<code>${escapeHtml(d)}</code>`).join(" ") ||
        (isExt ? "外部系统边界" : "—");
      const anchors = renderAnchors(m.entry_anchors) || "—";
      const extBadge = isExt ? ' <span class="badge ext">EXTERNAL</span>' : "";
      return `      <tr>
        <td><b>${escapeHtml(m.name)}</b>${extBadge}<div class="meta-sub"><code>${escapeHtml(m.id)}</code></div></td>
        <td>${dirs}</td>
        <td>${anchors}</td>
        <td>${escapeHtml(m.summary)}</td>
      </tr>`;
    })
    .join("\n");

  const sharedWarnCls = stats.sharedStates > 0 ? " danger" : "";
  const fallbackWarnCls = stats.fallbacks > 0 ? " warn" : "";
  const expKpiCard =
    stats.experienceRefs > 0
      ? `\n    <div class="kpi-card"><div class="k">关联历史经验</div><div class="v">${stats.experienceRefs}</div><div class="n">第三层故障索引</div></div>`
      : "";

  return `<section class="tab-page active" id="tab-overview">
  <div class="kpi-grid">
    <div class="kpi-card"><div class="k">模块数</div><div class="v">${stats.modules}</div><div class="n">单元 ${stats.units} 个</div></div>
    <div class="kpi-card"><div class="k">契约字段</div><div class="v">${stats.fields}</div><div class="n">跨模块接口/指标</div></div>
    <div class="kpi-card"><div class="k">核心不变量</div><div class="v">${stats.invariants}</div><div class="n">INV 约束守卫</div></div>
    <div class="kpi-card${fallbackWarnCls}"><div class="k">关系边</div><div class="v">${stats.relations}</div><div class="n">降级路径 ${stats.fallbacks} 条</div></div>
    <div class="kpi-card${sharedWarnCls}"><div class="k">共享状态边</div><div class="v">${stats.sharedStates}</div><div class="n">${
    stats.sharedStates > 0 ? "⚠ Phase 4.5 高优排查点" : "无已知隐式共享状态"
  }</div></div>${expKpiCard}
  </div>

  <h2>项目定位</h2>
  <div class="card">
    <p><b>${escapeHtml(data.project.name)}</b>：${escapeHtml(data.project.summary)}</p>
    ${keyFactsHtml ? `<ul class="tight">\n      ${keyFactsHtml}\n    </ul>` : ""}
  </div>

  <h2>全景数据流</h2>
  <div class="flow">
${flowHtml}
  </div>

  <h2>模块导航</h2>
  <table>
    <thead><tr><th>模块</th><th>覆盖目录</th><th>入口锚点</th><th>职责</th></tr></thead>
    <tbody>
${modRowsHtml}
    </tbody>
  </table>
</section>`;
}

function renderStatusTag(status) {
  if (!status || status === "verified") return "";
  if (status === "inferred") return ` <span class="status-tag st-inferred">inferred</span>`;
  if (status === "retracted") return ` <span class="status-tag st-retracted">retracted</span>`;
  return ` <span class="status-tag">${escapeHtml(status)}</span>`;
}

function renderFieldDetailCell(field, nodes, edgesByNode) {
  const parts = [`<div>${escapeHtml(field.formula_and_deps)}</div>`];

  const semRows = [];
  if (field.state_scope) {
    semRows.push(`<div class="sem-row"><b>状态作用域：</b>${escapeHtml(field.state_scope)}</div>`);
  }
  if (field.null_and_default_semantics) {
    semRows.push(
      `<div class="sem-row"><b>空值/默认语义：</b>${escapeHtml(field.null_and_default_semantics)}</div>`
    );
  }
  if (Array.isArray(field.confused_with) && field.confused_with.length > 0) {
    const cwHtml = field.confused_with
      .map((cw) => `<code>${escapeHtml(cw.term)}</code>（${escapeHtml(cw.diff)}）`)
      .join("；");
    semRows.push(`<div class="sem-row"><b>易混淆区分：</b>${cwHtml}</div>`);
  }
  if (semRows.length > 0) {
    parts.push(`<div class="sem-meta">\n${semRows.join("\n")}\n</div>`);
  }

  if (Array.isArray(field.invariants) && field.invariants.length > 0) {
    parts.push(
      `<div>${field.invariants
        .map((id) => `<span class="inv-tag">${escapeHtml(id)}</span>`)
        .join("")}</div>`
    );
  }

  const rels = edgesByNode.get(field.id) || [];
  if (rels.length > 0) {
    parts.push(
      `<div>${rels
        .map((r) => renderRelChip(r.edge, r.direction, nodes))
        .join("")}</div>`
    );
  }

  if (Array.isArray(field.code_anchors) && field.code_anchors.length > 0) {
    parts.push(renderAnchors(field.code_anchors));
  }

  if (field.known_diff) {
    parts.push(`<div class="diff-warn"><b>实现与文档差异：</b>${escapeHtml(field.known_diff)}</div>`);
  }

  return parts.join("\n");
}

function renderModuleTab(mod, nodes, edgesByNode, invByOwner) {
  const isExternal = mod.kind === "external";
  const dirsHtml =
    (mod.dirs || []).map((d) => `<code>${escapeHtml(d)}</code>`).join(" ") ||
    (isExternal ? "外部系统边界" : "<code>—</code>");
  const modAnchorsHtml = renderAnchors(mod.entry_anchors);
  const modEdges = edgesByNode.get(mod.id) || [];
  const modInvs = invByOwner.get(mod.id) || [];

  const unitRowsHtml = (mod.units || [])
    .map((unit) => {
      const unitEdges = edgesByNode.get(unit.id) || [];
      const unitInvs = invByOwner.get(unit.id) || [];

      const detailTableHeader =
        unit.detail_mode === "artifact"
          ? `<thead><tr><th>字段</th><th>产出</th><th>说明、锚点与关系</th></tr></thead>`
          : `<thead><tr><th>字段</th><th>需求/产品对应名</th><th>产出</th><th>依赖、不变量与口径</th></tr></thead>`;

      const fieldsHtml = (unit.fields || [])
        .map((field) => {
          const detailCell = renderFieldDetailCell(field, nodes, edgesByNode);
          if (unit.detail_mode === "artifact") {
            return `            <tr>
              <td>${escapeHtml(field.name)}<div class="meta-sub">${escapeHtml(field.id)}</div></td>
              <td>${producerBadge(field.producer_type)}</td>
              <td>${detailCell}</td>
            </tr>`;
          }
          const prdName = field.product_name
            ? `<span class="prd-name">${escapeHtml(field.product_name)}</span>`
            : `<span class="prd-name">—</span>`;
          const prdSrc = field.product_source
            ? `<span class="prd">${escapeHtml(field.product_source)}</span>`
            : "";
          return `            <tr>
              <td>${escapeHtml(field.name)}<div class="meta-sub">${escapeHtml(field.id)}</div></td>
              <td>${prdName}${prdSrc}</td>
              <td>${producerBadge(field.producer_type)}</td>
              <td>${detailCell}</td>
            </tr>`;
        })
        .join("\n");

      const unitMetaBits = [];
      if (unitInvs.length > 0) {
        unitMetaBits.push(unitInvs.map((inv) => `<span class="inv-tag">${escapeHtml(inv.id)}</span>`).join(""));
      }
      if (unitEdges.length > 0) {
        unitMetaBits.push(unitEdges.map((r) => renderRelChip(r.edge, r.direction, nodes)).join(""));
      }
      if (unit.code_anchors && unit.code_anchors.length > 0) {
        unitMetaBits.push(renderAnchors(unit.code_anchors));
      }

      const unitHintHtml = unit.hint ? `\n        <p class="hint">${escapeHtml(unit.hint)}</p>` : "";
      const unitExtrasHtml = unitMetaBits.length > 0 ? `\n        <div>${unitMetaBits.join("")}</div>` : "";

      return `      <tr class="gx-row">
        <td><b>${escapeHtml(unit.name)}</b><div class="meta-sub"><code>${escapeHtml(unit.id)}</code></div></td>
        <td>${producerBadge(unit.producer_type)}</td>
        <td>${escapeHtml(unit.summary)}${renderAnchors(unit.code_anchors)}</td>
      </tr>
      <tr class="gx-detail" hidden><td colspan="3">
        ${
          fieldsHtml
            ? `<table>
          ${detailTableHeader}
          <tbody>
${fieldsHtml}
          </tbody>
        </table>`
            : `<p class="hint">本单元暂无字段级契约登记。</p>`
        }${unitExtrasHtml}${unitHintHtml}
      </td></tr>`;
    })
    .join("\n");

  const modRelCard =
    modEdges.length > 0 || modInvs.length > 0
      ? `\n  <h3>模块级约束与跨模块边</h3>
  <div class="card">
    ${modInvs.length > 0 ? `<div><b>守卫不变量：</b>${modInvs.map((i) => `<span class="inv-tag">${escapeHtml(i.id)}</span>`).join("")}</div>` : ""}
    ${modEdges.length > 0 ? `<div><b>关系边：</b>${modEdges.map((r) => renderRelChip(r.edge, r.direction, nodes)).join("")}</div>` : ""}
  </div>`
      : "";

  const todosHtml =
    Array.isArray(mod.todos) && mod.todos.length > 0
      ? `\n  <div class="todo">\n    <ul>\n      ${mod.todos
          .map((t) => `<li>${escapeHtml(t)}</li>`)
          .join("\n      ")}\n    </ul>\n  </div>`
      : "";

  return `<section class="tab-page" id="tab-${escapeHtml(mod.id)}">
  <h2>${escapeHtml(mod.name)}${isExternal ? ' <span class="badge ext">EXTERNAL</span>' : ""}（${dirsHtml}）</h2>

  <div class="card">
    <p>${escapeHtml(mod.summary)}</p>
    ${modAnchorsHtml}
  </div>${modRelCard}

  <h3>职责与契约明细</h3>
  <table>
    <thead><tr><th>单元</th><th>产出方式</th><th>说明</th></tr></thead>
    <tbody>
${unitRowsHtml}
    </tbody>
  </table>${todosHtml}
</section>`;
}

function renderOntologyTab(data, nodes) {
  const sharedEdges = (data.relations || []).filter((r) => r.type === "shared_state");
  const fallbackEdges = (data.relations || []).filter((r) => r.type === "fallback_to");

  const bannerHtml =
    sharedEdges.length > 0 || fallbackEdges.length > 0
      ? `<div class="risk-banner">
    <b>根因高危热点提示：</b>当前本体共登记 <code>${sharedEdges.length}</code> 条隐式共享状态边（<code>shared_state</code>，命中即触发 Phase 4.5 架构警惕）与 <code>${fallbackEdges.length}</code> 条降级边（<code>fallback_to</code>，排查需核对是否悄悄吞掉上游错误）。
  </div>`
      : "";

  const invRows = (data.invariants || [])
    .map((inv) => {
      const owner = nodes.get(inv.owner_node);
      const ownerLabel = owner ? `${owner.name} (${inv.owner_node})` : inv.owner_node;
      const layerCls = inv.enforcement_layer === "root" ? "layer-root" : "layer-boundary";
      const layerText = inv.enforcement_layer === "root" ? "根因层 (root)" : "边界层 (boundary)";
      const condHtml = inv.applicable_when
        ? `<div class="meta-sub">适用前提：${escapeHtml(inv.applicable_when)}</div>`
        : "";
      const retractHtml =
        inv.status === "retracted" && inv.retracted_reason
          ? `<div class="diff-warn"><b>撤回原因：</b>${escapeHtml(inv.retracted_reason)}</div>`
          : "";
      return `      <tr>
        <td><span class="inv-tag">${escapeHtml(inv.id)}</span>${renderStatusTag(inv.status)}</td>
        <td>${escapeHtml(inv.statement)}${condHtml}${retractHtml}</td>
        <td><code>${escapeHtml(ownerLabel)}</code></td>
        <td><span class="${layerCls}">${layerText}</span></td>
        <td>${escapeHtml(inv.violation_symptom)}</td>
        <td>${escapeHtml(inv.verification || "—")}</td>
      </tr>`;
    })
    .join("\n");

  const relRows = (data.relations || [])
    .map((rel) => {
      const fromNode = nodes.get(rel.from);
      const toNode = nodes.get(rel.to);
      const fromText = fromNode ? `${fromNode.name} (${rel.from})` : rel.from;
      const toText = toNode ? `${toNode.name} (${rel.to})` : rel.to;
      const retractHtml =
        rel.status === "retracted" && rel.retracted_reason
          ? `<div class="diff-warn"><b>撤回原因：</b>${escapeHtml(rel.retracted_reason)}</div>`
          : "";
      return `      <tr>
        <td><code>${escapeHtml(fromText)}</code></td>
        <td><span class="rel-chip rel-${escapeHtml(rel.type)}">${escapeHtml(rel.type)}</span>${renderStatusTag(rel.status)}</td>
        <td><code>${escapeHtml(toText)}</code></td>
        <td>${escapeHtml(rel.note || "—")}${retractHtml}</td>
      </tr>`;
    })
    .join("\n");

  const expList = Array.isArray(data.experience_refs) ? data.experience_refs : [];
  const expSectionHtml =
    expList.length > 0
      ? `\n\n  <h3>关联历史经验（第三层，experience_refs）</h3>
  <table>
    <thead><tr><th>编号</th><th>风险摘要与故障位点</th><th>关联节点</th><th>适用 / 不适用条件</th><th>经验文档</th></tr></thead>
    <tbody>
${expList
  .map((exp) => {
    const sites = [
      exp.symptom_node ? `症状 <code>${escapeHtml(exp.symptom_node)}</code>` : null,
      exp.root_cause_node ? `根因 <code>${escapeHtml(exp.root_cause_node)}</code>` : null,
      exp.patch_node ? `收敛 <code>${escapeHtml(exp.patch_node)}</code>` : null,
    ].filter(Boolean);
    const siteHtml = sites.length > 0 ? `<div class="meta-sub">${sites.join(" → ")}</div>` : "";
    const retractHtml =
      exp.status === "retracted" && exp.retracted_reason
        ? `<div class="diff-warn"><b>撤回原因：</b>${escapeHtml(exp.retracted_reason)}</div>`
        : "";
    const nodeChips = (exp.nodes || []).map((nid) => `<code>${escapeHtml(nid)}</code>`).join(" ");
    const condLines = [];
    if (exp.applicable_when) condLines.push(`<div><b>适用：</b>${escapeHtml(exp.applicable_when)}</div>`);
    if (exp.not_applicable_when) {
      condLines.push(`<div><b>不适用：</b>${escapeHtml(exp.not_applicable_when)}</div>`);
    }
    const condHtml = condLines.length > 0 ? `<div class="exp-cond">${condLines.join("")}</div>` : "—";
    return `      <tr>
        <td><span class="inv-tag">${escapeHtml(exp.exp_id)}</span>${renderStatusTag(exp.status)}</td>
        <td>${escapeHtml(exp.risk_summary)}${siteHtml}${retractHtml}</td>
        <td>${nodeChips}</td>
        <td>${condHtml}</td>
        <td><code>${escapeHtml(exp.path)}</code></td>
      </tr>`;
  })
  .join("\n")}
    </tbody>
  </table>`
      : "";

  return `<section class="tab-page" id="tab-ontology">
  <h2>本体关系与不变量总览</h2>
  ${bannerHtml}

  <h3>核心不变量（Invariants）</h3>
  <table>
    <thead><tr><th>编号</th><th>规则声明</th><th>守卫节点</th><th>强制层级</th><th>违背现象</th><th>验证方式</th></tr></thead>
    <tbody>
${invRows || '      <tr><td colspan="6">暂无登记不变量</td></tr>'}
    </tbody>
  </table>

  <h3>因果与依赖关系边（Relations）</h3>
  <table>
    <thead><tr><th>源节点 (from)</th><th>关系类型</th><th>目标节点 (to)</th><th>条件与根因语义说明</th></tr></thead>
    <tbody>
${relRows || '      <tr><td colspan="4">暂无登记关系边</td></tr>'}
    </tbody>
  </table>${expSectionHtml}
</section>`;
}

function renderHtml(data, rawJsonText, cssText, jsText) {
  const { stats } = validateOntology(data, rawJsonText, { noHtmlCheck: true });
  const { nodes } = buildNodeIndex(data);
  const sourceHash = computeSourceHash(rawJsonText);

  const edgesByNode = new Map();
  for (const edge of data.relations || []) {
    if (!edgesByNode.has(edge.from)) edgesByNode.set(edge.from, []);
    edgesByNode.get(edge.from).push({ edge, direction: "out" });
    if (!edgesByNode.has(edge.to)) edgesByNode.set(edge.to, []);
    edgesByNode.get(edge.to).push({ edge, direction: "in" });
  }

  const invByOwner = new Map();
  for (const inv of data.invariants || []) {
    if (!invByOwner.has(inv.owner_node)) invByOwner.set(inv.owner_node, []);
    invByOwner.get(inv.owner_node).push(inv);
  }

  const prsText =
    Array.isArray(data.version.synced_prs) && data.version.synced_prs.length > 0
      ? ` · 已同步 PR/MR ${data.version.synced_prs.join("/")}`
      : "";

  const headerSub = `${data.project.summary} · 按功能模块划分 · 更新于 ${data.version.updated_at}（代码 ${data.version.last_verified_commit} · ${data.version.commit_summary}${prsText}）`;

  const navButtons = [
    `<button data-tab="overview" class="active">总览</button>`,
    ...(data.modules || []).map(
      (m) => `<button data-tab="${escapeHtml(m.id)}">${escapeHtml(m.name)}</button>`
    ),
    `<button data-tab="ontology">本体关系与不变量</button>`,
  ].join("\n  ");

  const overviewSection = renderOverviewTab(data, stats, nodes);
  const moduleSections = (data.modules || [])
    .map((m) => renderModuleTab(m, nodes, edgesByNode, invByOwner))
    .join("\n\n");
  const ontologySection = renderOntologyTab(data, nodes);

  const safeJs = jsText.replace(/<\/script>/gi, "<\\/script>");
  const safeCss = cssText.replace(/<\/style>/gi, "");

  return `<!DOCTYPE html>
<!-- 由 project-ontology/scripts/render-ontology.js 从 ontology.json 自动生成，请勿直接手工改 HTML -->
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="po:schema-version" content="1.0">
<meta name="po:verified-commit" content="${escapeHtml(data.version.last_verified_commit)}">
<meta name="po:source-sha256" content="${sourceHash}">
<title>${escapeHtml(data.project.name)} 项目本体与全链路总览</title>
<style>
${safeCss}
</style>
</head>
<body>

<header class="site">
  <h1>${escapeHtml(data.project.name)} 项目本体与全链路总览</h1>
  <p>${escapeHtml(headerSub)}</p>
</header>

<nav class="tabs" id="tabs">
  ${navButtons}
</nav>

<main>

${overviewSection}

${moduleSections}

${ontologySection}

</main>

<script>
${safeJs}
</script>

</body>
</html>
`;
}

function parseArgs(argv) {
  const opts = { jsonPath: null, outPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") opts.outPath = argv[++i] || null;
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (!opts.jsonPath) opts.jsonPath = a;
    else throw new Error(`未知参数: ${a}`);
  }
  return opts;
}

if (require.main === module) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
  if (opts.help || !opts.jsonPath) {
    console.log("用法: node render-ontology.js <ontology.json> [--out <output.html>]");
    process.exit(opts.help ? 0 : 1);
  }

  const jsonAbs = path.resolve(opts.jsonPath);
  if (!fs.existsSync(jsonAbs)) {
    console.error(`❌ 找不到本体文件: ${jsonAbs}`);
    process.exit(1);
  }

  const rawText = fs.readFileSync(jsonAbs, "utf8");
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    console.error(`❌ ontology.json 解析失败: ${err.message}`);
    process.exit(1);
  }

  const checkRes = validateOntology(data, rawText, { noHtmlCheck: true });
  for (const w of checkRes.warnings) console.warn(`⚠️  ${w}`);
  if (checkRes.errors.length > 0) {
    console.error(`❌ 本体基础校验未通过，中止渲染（${checkRes.errors.length} 项错误）：`);
    for (const e of checkRes.errors) console.error(`   - ${e}`);
    process.exit(1);
  }

  const assetsDir = path.resolve(__dirname, "..", "assets");
  const cssText = fs.readFileSync(path.join(assetsDir, "ontology.css"), "utf8");
  const jsText = fs.readFileSync(path.join(assetsDir, "ontology.js"), "utf8");

  const outAbs = opts.outPath
    ? path.resolve(opts.outPath)
    : path.join(path.dirname(jsonAbs), "index.html");

  const html = renderHtml(data, rawText, cssText, jsText);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, html, "utf8");

  console.log(
    `✅ 已渲染离线本体视图: ${outAbs}（${checkRes.stats.modules} 模块 / ${checkRes.stats.fields} 字段 / ${checkRes.stats.relations} 关系边）`
  );
}

module.exports = { renderHtml };
