#!/usr/bin/env node
/**
 * 项目本体局部子图查询与 Git 新鲜度校验（project-ontology skill）
 *
 * 用法：
 *   node query-ontology.js <ontology.json> [--target <keyword|id>] [--direction upstream|downstream|both] [--depth 2]
 *     [--mode browse|resolve] [--max-nodes 30] [--include-retracted] [--impact-of <id>]
 *     [--freshness] [--repo .] [--format md|json]
 *
 * 零外部依赖，仅需 Node >= 14。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { buildNodeIndex, GIT_SHA_RE } = require("./check-ontology.js");

function parseArgs(argv) {
  const opts = {
    jsonPath: null,
    target: null,
    direction: "both",
    depth: 2,
    mode: "resolve",
    maxNodes: 30,
    includeRetracted: false,
    impactOf: null,
    freshness: false,
    repo: ".",
    format: "md",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") opts.target = argv[++i] || "";
    else if (a === "--direction") opts.direction = (argv[++i] || "both").toLowerCase();
    else if (a === "--depth") opts.depth = Math.max(0, parseInt(argv[++i] || "2", 10) || 0);
    else if (a === "--mode") opts.mode = (argv[++i] || "resolve").toLowerCase();
    else if (a === "--max-nodes") {
      const raw = argv[++i];
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n < 1) {
        throw new Error(`--max-nodes 非法: "${raw}"（须为 >= 1 的整数）`);
      }
      opts.maxNodes = n;
    } else if (a === "--include-retracted") opts.includeRetracted = true;
    else if (a === "--impact-of") opts.impactOf = argv[++i] || "";
    else if (a === "--freshness") opts.freshness = true;
    else if (a === "--repo") opts.repo = argv[++i] || ".";
    else if (a === "--format") opts.format = (argv[++i] || "md").toLowerCase();
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (!opts.jsonPath) opts.jsonPath = a;
    else throw new Error(`未知参数: ${a}`);
  }
  if (!["upstream", "downstream", "both"].includes(opts.direction)) {
    throw new Error(`--direction 非法: ${opts.direction}（允许 upstream|downstream|both）`);
  }
  if (!["browse", "resolve"].includes(opts.mode)) {
    throw new Error(`--mode 非法: ${opts.mode}（允许 browse|resolve）`);
  }
  if (!["md", "json"].includes(opts.format)) {
    throw new Error(`--format 非法: ${opts.format}（允许 md|json）`);
  }
  return opts;
}

function normSlash(p) {
  return String(p || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function anchorFilePart(anchor) {
  return normSlash(String(anchor || "").split("#")[0]);
}

function runGit(repoDir, args) {
  return execFileSync("git", args, {
    cwd: repoDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function checkFreshness(data, repoDir) {
  const sha = data.version && data.version.last_verified_commit ? data.version.last_verified_commit.trim() : "";
  const result = {
    verified_commit: sha,
    status: "unknown",
    warnings: [],
    changed_files: [],
    recent_commits: [],
    drifted_modules: [],
    clean_modules: [],
    external_modules: [],
  };

  for (const mod of data.modules || []) {
    if (mod && mod.kind === "external") {
      result.external_modules.push({ module_id: mod.id, module_name: mod.name });
    }
  }

  try {
    const inside = runGit(repoDir, ["rev-parse", "--is-inside-work-tree"]);
    if (inside !== "true") {
      result.status = "not_git_repo";
      result.warnings.push("目标目录不是 Git 仓库，跳过新鲜度校验。");
      return result;
    }
  } catch (err) {
    result.status = "not_git_repo";
    result.warnings.push("无法运行 git rev-parse（非 Git 仓库或 git 不可用），跳过新鲜度校验。");
    return result;
  }

  if (!GIT_SHA_RE.test(sha)) {
    result.status = "invalid_sha";
    result.warnings.push(`last_verified_commit ("${sha}") 非有效 Git SHA，按参考骨架使用。`);
    return result;
  }

  try {
    runGit(repoDir, ["rev-parse", "--verify", `${sha}^{commit}`]);
  } catch (err) {
    result.status = "missing_commit";
    result.warnings.push(`仓库中未找到基准提交 "${sha}"（可能历史浅克隆或占位 SHA），跳过 diff 校验。`);
    return result;
  }

  const headSha = runGit(repoDir, ["rev-parse", "--short", "HEAD"]);
  result.head_commit = headSha;

  const excludeSpecs = [":(exclude)spec/", ":(exclude)docs/"];
  const diffRaw = runGit(repoDir, ["diff", "--name-status", `${sha}..HEAD`, "--", ...excludeSpecs]);
  const logRaw = runGit(repoDir, ["log", "--oneline", "-n", "20", `${sha}..HEAD`, "--", ...excludeSpecs]);

  if (!diffRaw) {
    result.status = "fresh";
    result.clean_modules = (data.modules || []).filter((m) => m && m.kind !== "external").map((m) => m.id);
    return result;
  }

  result.status = "drifted";
  result.changed_files = diffRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      return { change: parts[0], file: normSlash(parts[parts.length - 1]) };
    });

  result.recent_commits = logRaw ? logRaw.split(/\r?\n/).filter(Boolean) : [];

  for (const mod of data.modules || []) {
    if (!mod || mod.kind === "external") continue;

    const modFiles = new Set((mod.entry_anchors || []).map(anchorFilePart));
    for (const u of mod.units || []) {
      for (const a of u.code_anchors || []) modFiles.add(anchorFilePart(a));
      for (const f of u.fields || []) {
        for (const a of f.code_anchors || []) modFiles.add(anchorFilePart(a));
      }
    }
    const dirPrefixes = (mod.dirs || []).map((d) => normSlash(d).replace(/\/+$/, "") + "/");

    const hits = result.changed_files
      .filter((cf) => {
        if (modFiles.has(cf.file)) return true;
        return dirPrefixes.some((prefix) => cf.file.startsWith(prefix) || cf.file === prefix.slice(0, -1));
      })
      .map((cf) => `${cf.change} ${cf.file}`);

    if (hits.length > 0) {
      result.drifted_modules.push({ module_id: mod.id, module_name: mod.name, matched_changes: hits });
    } else {
      result.clean_modules.push(mod.id);
    }
  }

  return result;
}

function tokenizeQuery(keyword) {
  const raw = String(keyword || "").trim().toLowerCase();
  if (!raw) return { full: "", tokens: [] };
  const parts = raw
    .split(/[\s,，、/|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 || /^[a-z0-9]$/i.test(s));
  const tokens = Array.from(new Set(parts.length > 0 ? parts : [raw]));
  return { full: raw, tokens };
}

function scoreNodeTerm(node, term) {
  const idLower = node.id.toLowerCase();
  const nameLower = String(node.name || "").toLowerCase();
  if (idLower === term || nameLower === term) {
    return { score: 100, reason: `节点精确匹配(${term})` };
  }
  if (node.kind === "field" && String(node.data.product_name || "").toLowerCase() === term) {
    return { score: 95, reason: `产品指标精确匹配(${term})` };
  }
  if (idLower.includes(term) || nameLower.includes(term)) {
    return { score: 70, reason: `ID/名称包含(${term})` };
  }
  if (node.kind === "field") {
    const pn = String(node.data.product_name || "").toLowerCase();
    const ps = String(node.data.product_source || "").toLowerCase();
    if (pn.includes(term) || ps.includes(term)) {
      return { score: 65, reason: `产品指标/出处命中(${term})` };
    }
  }
  const anchors = [
    ...(node.data.code_anchors || []),
    ...(node.data.entry_anchors || []),
    ...(node.data.dirs || []),
  ];
  if (anchors.some((a) => String(a).toLowerCase().includes(term))) {
    return { score: 50, reason: `代码锚点/目录命中(${term})` };
  }
  if (node.kind === "field") {
    if (String(node.data.null_and_default_semantics || "").toLowerCase().includes(term)) {
      return { score: 45, reason: `空值/默认语义命中(${term})` };
    }
    if (String(node.data.state_scope || "").toLowerCase().includes(term)) {
      return { score: 45, reason: `状态作用域命中(${term})` };
    }
    if (
      Array.isArray(node.data.confused_with) &&
      node.data.confused_with.some(
        (cw) =>
          cw &&
          (String(cw.term || "").toLowerCase().includes(term) ||
            String(cw.diff || "").toLowerCase().includes(term))
      )
    ) {
      return { score: 40, reason: `易混淆概念命中(${term})` };
    }
  }
  if (String(node.data.known_diff || "").toLowerCase().includes(term)) {
    return { score: 35, reason: `文档/实现差异命中(${term})` };
  }
  if (String(node.data.summary || "").toLowerCase().includes(term)) {
    return { score: 30, reason: `摘要命中(${term})` };
  }
  if (String(node.data.formula_and_deps || "").toLowerCase().includes(term)) {
    return { score: 25, reason: `口径与依赖命中(${term})` };
  }
  return { score: 0, reason: "" };
}

function matchTerms(text, full, tokens) {
  const s = String(text || "").toLowerCase();
  if (!s) return [];
  if (s.includes(full)) return [full];
  return tokens.filter((t) => s.includes(t));
}

function findAnchors(nodes, keyword, data = null, opts = {}) {
  const { full, tokens } = tokenizeQuery(keyword);
  if (!full) return [];
  const includeRetracted = Boolean(opts && opts.includeRetracted);

  const hitMap = new Map();
  function addHit(nodeId, pts, reason) {
    const node = nodes.get(nodeId);
    if (!node || pts <= 0) return;
    let entry = hitMap.get(nodeId);
    if (!entry) {
      entry = { node, score: 0, hitReasons: [] };
      hitMap.set(nodeId, entry);
    }
    entry.score += pts;
    if (reason && !entry.hitReasons.includes(reason)) {
      entry.hitReasons.push(reason);
    }
  }

  for (const node of nodes.values()) {
    if (tokens.length <= 1) {
      const m = scoreNodeTerm(node, full);
      if (m.score > 0) addHit(node.id, m.score, m.reason);
    } else {
      let matchedTokCount = 0;
      const fullM = scoreNodeTerm(node, full);
      if (fullM.score >= 70) addHit(node.id, fullM.score, fullM.reason);
      for (const tok of tokens) {
        const tm = scoreNodeTerm(node, tok);
        if (tm.score > 0) {
          matchedTokCount += 1;
          addHit(node.id, tm.score, tm.reason);
        }
      }
      if (matchedTokCount >= 2) {
        addHit(node.id, matchedTokCount * 20, `多词联合命中(${matchedTokCount}/${tokens.length})`);
      }
    }
  }

  // 跨层索引入口：invariants[] / relations[] / experience_refs[]
  if (data) {
    // pre-index fields referencing each invariant ID
    const invToFields = new Map();
    for (const node of nodes.values()) {
      if (node.kind === "field" && Array.isArray(node.data.invariants)) {
        for (const invId of node.data.invariants) {
          if (!invToFields.has(invId)) invToFields.set(invId, []);
          invToFields.get(invId).push(node.id);
        }
      }
    }

    for (const inv of data.invariants || []) {
      if (!inv) continue;
      if (!includeRetracted && inv.status === "retracted") continue;
      const idExact = String(inv.id || "").toLowerCase() === full;
      const symHits = matchTerms(inv.violation_symptom, full, tokens);
      const stmtHits = matchTerms(
        `${inv.id} ${inv.statement} ${inv.applicable_when || ""}`,
        full,
        tokens
      );
      if (idExact || symHits.length > 0 || stmtHits.length > 0) {
        const ownerPts = idExact ? 95 : symHits.length > 0 ? 60 * symHits.length : 40 * stmtHits.length;
        const reason = symHits.length > 0
          ? `不变量[${inv.id}]违背症状命中(${symHits.join("+")})`
          : `不变量[${inv.id}]规则命中(${idExact ? inv.id : stmtHits.join("+")})`;
        addHit(inv.owner_node, ownerPts, reason);
        for (const fid of invToFields.get(inv.id) || []) {
          if (fid !== inv.owner_node) addHit(fid, Math.round(ownerPts * 0.7), reason);
        }
      }
    }

    for (const rel of data.relations || []) {
      if (!rel) continue;
      if (!includeRetracted && rel.status === "retracted") continue;
      const relHits = matchTerms(`${rel.type} ${rel.note || ""}`, full, tokens);
      if (relHits.length > 0) {
        const pts = 35 * relHits.length;
        const reason = `关系边[${rel.from} --${rel.type}--> ${rel.to}]命中(${relHits.join("+")})`;
        addHit(rel.from, pts, reason);
        addHit(rel.to, pts, reason);
      }
    }

    for (const exp of data.experience_refs || []) {
      if (!exp) continue;
      if (!includeRetracted && exp.status === "retracted") continue;
      const expText = `${exp.exp_id} ${exp.risk_summary} ${exp.applicable_when || ""}`;
      const expHits = matchTerms(expText, full, tokens);
      if (expHits.length > 0) {
        const reason = `历史经验[${exp.exp_id}]命中(${expHits.join("+")})`;
        const bonusMap = new Map();
        const setMax = (nid, base) => {
          if (!nid) return;
          bonusMap.set(nid, Math.max(bonusMap.get(nid) || 0, base * expHits.length));
        };
        for (const nid of exp.nodes || []) setMax(nid, 50);
        setMax(exp.patch_node, 55);
        setMax(exp.root_cause_node, 65);
        setMax(exp.symptom_node, 70);
        for (const [nid, pts] of bonusMap.entries()) {
          addHit(nid, pts, reason);
        }
      }
    }
  }

  const scored = Array.from(hitMap.values());
  scored.sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));
  if (scored.length === 0) return [];

  const decorate = (x) => ({
    ...x.node,
    score: x.score,
    hitReasons: x.hitReasons,
  });

  if (scored[0].score >= 95) {
    return scored.filter((x) => x.score >= 95).slice(0, 8).map(decorate);
  }
  return scored.slice(0, 5).map(decorate);
}

function stepNeighbors(curId, relations, mode, opts = {}) {
  const includeRetracted = Boolean(opts && opts.includeRetracted);
  const neighbors = [];
  for (const rel of relations) {
    if (!rel) continue;
    if (!includeRetracted && rel.status === "retracted") continue;

    if (rel.type === "shared_state") {
      if (rel.from === curId) neighbors.push({ nextId: rel.to, rel, edgeDir: "shared" });
      else if (rel.to === curId) neighbors.push({ nextId: rel.from, rel, edgeDir: "shared" });
      continue;
    }

    if (mode === "upstream") {
      if ((rel.type === "produces" || rel.type === "propagates_to" || rel.type === "maps_to") && rel.to === curId) {
        neighbors.push({ nextId: rel.from, rel, edgeDir: "incoming" });
      } else if (
        (rel.type === "consumes" ||
          rel.type === "depends_on" ||
          rel.type === "backfills_from" ||
          rel.type === "fallback_to") &&
        rel.from === curId
      ) {
        neighbors.push({ nextId: rel.to, rel, edgeDir: "outgoing_dep" });
      }
    } else if (mode === "downstream") {
      if ((rel.type === "produces" || rel.type === "propagates_to" || rel.type === "maps_to") && rel.from === curId) {
        neighbors.push({ nextId: rel.to, rel, edgeDir: "outgoing" });
      } else if (
        (rel.type === "consumes" ||
          rel.type === "depends_on" ||
          rel.type === "backfills_from" ||
          rel.type === "fallback_to") &&
        rel.to === curId
      ) {
        neighbors.push({ nextId: rel.from, rel, edgeDir: "incoming_consumer" });
      }
    }
  }
  return neighbors;
}

function traverse(seedIds, relations, nodes, mode, maxDepth, opts = {}) {
  const maxNodes = opts && Number.isFinite(opts.maxNodes) ? Math.max(1, opts.maxNodes) : Infinity;
  const includeRetracted = Boolean(opts && opts.includeRetracted);

  const visitedDepth = new Map();
  const queue = [];
  const edges = [];
  const seenEdgeKeys = new Set();
  const skippedIds = new Set();

  for (const id of seedIds) {
    visitedDepth.set(id, 0);
    queue.push({ id, depth: 0 });
  }

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    // 锚点本身（depth 0）的所属单元/模块上下文边也纳入 1 跳扩展起点
    const lookupIds = [id];
    if (depth === 0) {
      const n = nodes.get(id);
      if (n && n.unitId && n.unitId !== id) lookupIds.push(n.unitId);
      if (n && n.moduleId && n.moduleId !== id) lookupIds.push(n.moduleId);
    }

    for (const lid of lookupIds) {
      const steps = stepNeighbors(lid, relations, mode, { includeRetracted });
      for (const s of steps) {
        if (!visitedDepth.has(s.nextId)) {
          if (visitedDepth.size >= maxNodes) {
            skippedIds.add(s.nextId);
            continue;
          }
          visitedDepth.set(s.nextId, depth + 1);
          queue.push({ id: s.nextId, depth: depth + 1 });
        }
        const key = `${s.rel.from}|${s.rel.type}|${s.rel.to}`;
        if (!seenEdgeKeys.has(key)) {
          seenEdgeKeys.add(key);
          edges.push({ hop: depth + 1, via: lid, rel: s.rel });
        }
      }
    }
  }

  const reachedNodes = [];
  for (const [id, hop] of visitedDepth.entries()) {
    if (hop === 0) continue;
    const n = nodes.get(id);
    if (n) reachedNodes.push({ hop, node: n });
  }
  reachedNodes.sort((a, b) => a.hop - b.hop || a.node.id.localeCompare(b.node.id));
  return {
    edges,
    reachedNodes,
    truncated: skippedIds.size > 0,
    skippedNodes: skippedIds.size,
    maxNodes: Number.isFinite(maxNodes) ? maxNodes : null,
  };
}

function expandRelevantIds(relevantIds, nodes) {
  const expanded = new Set(relevantIds);
  for (const id of relevantIds) {
    const n = nodes.get(id);
    if (n && n.unitId) expanded.add(n.unitId);
    if (n && n.moduleId) expanded.add(n.moduleId);
  }
  return expanded;
}

function collectRelevantInvariants(relevantIds, data, nodes, includeRetracted = false) {
  const hits = new Map();
  const expanded = expandRelevantIds(relevantIds, nodes);
  for (const inv of data.invariants || []) {
    if (!inv) continue;
    if (!includeRetracted && inv.status === "retracted") continue;
    if (expanded.has(inv.owner_node)) {
      hits.set(inv.id, inv);
    }
  }
  for (const id of expanded) {
    const n = nodes.get(id);
    if (n && n.kind === "field" && Array.isArray(n.data.invariants)) {
      for (const invId of n.data.invariants) {
        const inv = (data.invariants || []).find((x) => x && x.id === invId);
        if (inv && (includeRetracted || inv.status !== "retracted")) {
          hits.set(inv.id, inv);
        }
      }
    }
  }
  return Array.from(hits.values());
}

function collectRelevantExperiences(relevantIds, data, nodes, includeRetracted = false) {
  const hits = [];
  const seen = new Set();
  const expanded = expandRelevantIds(relevantIds, nodes);

  for (const exp of data.experience_refs || []) {
    if (!exp || seen.has(exp.exp_id)) continue;
    if (!includeRetracted && exp.status === "retracted") continue;
    const refNodes = [
      ...(exp.nodes || []),
      exp.symptom_node,
      exp.root_cause_node,
      exp.patch_node,
    ].filter(Boolean);
    if (refNodes.some((nid) => expanded.has(nid))) {
      seen.add(exp.exp_id);
      hits.push(exp);
    }
  }
  return hits;
}

function collectRetractedItems(relevantIds, data, nodes) {
  const expanded = expandRelevantIds(relevantIds, nodes);
  const items = [];

  for (const inv of data.invariants || []) {
    if (!inv || inv.status !== "retracted") continue;
    const referencedByField = Array.from(expanded).some((id) => {
      const n = nodes.get(id);
      return n && n.kind === "field" && Array.isArray(n.data.invariants) && n.data.invariants.includes(inv.id);
    });
    if (expanded.has(inv.owner_node) || referencedByField) {
      items.push({
        kind: "invariant",
        id: inv.id,
        label: `${inv.id} @ ${inv.owner_node}: ${inv.statement}`,
        retracted_reason: inv.retracted_reason || "未填原因",
      });
    }
  }

  for (const rel of data.relations || []) {
    if (!rel || rel.status !== "retracted") continue;
    if (expanded.has(rel.from) || expanded.has(rel.to)) {
      items.push({
        kind: "relation",
        id: `${rel.from}->${rel.to}`,
        label: `${rel.from} --${rel.type}--> ${rel.to}: ${rel.note || "—"}`,
        retracted_reason: rel.retracted_reason || "未填原因",
      });
    }
  }

  for (const exp of data.experience_refs || []) {
    if (!exp || exp.status !== "retracted") continue;
    const refNodes = [
      ...(exp.nodes || []),
      exp.symptom_node,
      exp.root_cause_node,
      exp.patch_node,
    ].filter(Boolean);
    if (refNodes.some((nid) => expanded.has(nid))) {
      items.push({
        kind: "experience",
        id: exp.exp_id,
        label: `${exp.exp_id} (${exp.path}): ${exp.risk_summary}`,
        retracted_reason: exp.retracted_reason || "未填原因",
      });
    }
  }

  return items;
}

function analyzeImpact(targetId, data, nodes, relations, maxDepth = 3, maxNodes = 30, includeRetracted = false) {
  const id = String(targetId || "").trim();
  const invTarget = (data.invariants || []).find((x) => x && x.id === id);
  const expTarget = (data.experience_refs || []).find((x) => x && x.exp_id === id);

  let targetKind = null;
  let targetMeta = null;
  const seedSet = new Set();

  if (nodes.has(id)) {
    targetKind = "node";
    targetMeta = nodes.get(id);
    seedSet.add(id);
  } else if (invTarget) {
    targetKind = "invariant";
    targetMeta = invTarget;
    if (nodes.has(invTarget.owner_node)) seedSet.add(invTarget.owner_node);
    for (const n of nodes.values()) {
      if (n.kind === "field" && Array.isArray(n.data.invariants) && n.data.invariants.includes(id)) {
        seedSet.add(n.id);
      }
    }
  } else if (expTarget) {
    targetKind = "experience";
    targetMeta = expTarget;
    for (const nid of [...(expTarget.nodes || []), expTarget.symptom_node, expTarget.root_cause_node, expTarget.patch_node]) {
      if (nid && nodes.has(nid)) seedSet.add(nid);
    }
  } else {
    return { found: false, targetId: id };
  }

  const seedIds = Array.from(seedSet);
  const downstream = traverse(seedIds, relations, nodes, "downstream", maxDepth, { maxNodes, includeRetracted });
  const affectedIds = new Set(seedIds);
  for (const rn of downstream.reachedNodes) affectedIds.add(rn.node.id);

  const affectedInvariants = collectRelevantInvariants(affectedIds, data, nodes, includeRetracted);
  const affectedExperiences = collectRelevantExperiences(affectedIds, data, nodes, includeRetracted);
  const retractedItems = collectRetractedItems(affectedIds, data, nodes);

  return {
    found: true,
    targetId: id,
    targetKind,
    targetMeta,
    seedNodes: seedIds.map((sid) => nodes.get(sid)).filter(Boolean),
    downstream,
    affectedInvariants,
    affectedExperiences,
    retractedItems,
  };
}

function getExternalModuleIds(data) {
  return new Set((data.modules || []).filter((m) => m && m.kind === "external").map((m) => m.id));
}

function formatNodeBrief(node, driftedModIds = null, externalModIds = null) {
  const anchors =
    (node.data.code_anchors && node.data.code_anchors.length > 0 && node.data.code_anchors) ||
    (node.data.entry_anchors && node.data.entry_anchors.length > 0 && node.data.entry_anchors) ||
    node.data.dirs ||
    [];
  const anchorStr = anchors.length > 0 ? ` · 锚点: ${anchors.join(", ")}` : "";
  const prodStr =
    node.kind === "field" && node.data.product_name
      ? ` · 产品指标: ${node.data.product_name}${node.data.product_source ? `（${node.data.product_source}）` : ""}`
      : "";
  const extTag = externalModIds && externalModIds.has(node.moduleId) ? " [外部边界]" : "";
  const driftTag = driftedModIds && driftedModIds.has(node.moduleId) ? " 🔥 [近期变更]" : "";
  return `\`${node.id}\` [${node.kind}] **${node.name}**（模块: ${node.moduleName}${extTag}）${prodStr}${anchorStr}${driftTag}`;
}

function edgeSemanticTag(r) {
  const tags = [];
  if (r.type === "backfills_from") tags.push("[回填源]");
  else if (r.type === "fallback_to") tags.push("[降级兜底-防吞错]");
  else if (r.type === "shared_state") tags.push("[共享状态-Phase 4.5]");
  else if (r.type === "maps_to") tags.push("[跨边界映射]");
  if (r.status === "inferred") tags.push("[推断待实证]");
  else if (r.status === "retracted") tags.push("[已撤回]");
  return tags.length > 0 ? " " + tags.join(" ") : "";
}

function appendChecklist(lines, queryResult, nodes) {
  lines.push("### 排查 / 验证核对清单（防读过未落实）");
  if (queryResult.suspectDrifts && queryResult.suspectDrifts.length > 0) {
    for (const dm of queryResult.suspectDrifts) {
      lines.push(
        `- [ ] 优先核对上游嫌疑变更 \`${dm.module_id}\` (${dm.module_name})：${dm.matched_changes.join(", ")}`
      );
    }
  }
  for (const inv of queryResult.invariants) {
    const cond = inv.applicable_when ? `（前提：${inv.applicable_when}）` : "";
    const ver = inv.verification ? ` · 验证入口：\`${inv.verification}\`` : "";
    lines.push(`- [ ] 核对不变量 **${inv.id}**${cond}：是否守住「${inv.statement}」${ver}`);
  }
  const hasInferred =
    queryResult.invariants.some((x) => x.status === "inferred") ||
    queryResult.experiences.some((x) => x.status === "inferred") ||
    [...(queryResult.upstream ? queryResult.upstream.edges : []), ...(queryResult.downstream ? queryResult.downstream.edges : [])].some(
      (e) => e.rel.status === "inferred"
    );
  if (hasInferred) {
    lines.push("- [ ] 实测验证子图中标记 `[推断待实证]`（`status=" + "inferred`）的条目，实测后升级为 `verified` 或 `retracted`");
  }
  for (const r of queryResult.fallbacks) {
    lines.push(`- [ ] 核对降级路径 \`${r.from}\` → \`${r.to}\`：主路径异常时是否按预期降级且未静默吞错`);
  }
  for (const r of queryResult.sharedStates) {
    lines.push(`- [ ] 核对共享可变状态 \`${r.from}\` ⇄ \`${r.to}\`：并发/重入/缓存下是否出现跨作用域串台或脏覆盖`);
  }
  const diffNodes = new Map();
  for (const a of queryResult.anchors) {
    if (a.data && a.data.known_diff) diffNodes.set(a.id, a);
  }
  for (const dirRes of [queryResult.upstream, queryResult.downstream]) {
    if (!dirRes) continue;
    for (const rn of dirRes.reachedNodes) {
      if (rn.node.data && rn.node.data.known_diff) diffNodes.set(rn.node.id, rn.node);
    }
  }
  for (const dn of diffNodes.values()) {
    lines.push(`- [ ] 核对 \`${dn.id}\` 已知文档/实现差异：${dn.data.known_diff}`);
  }
  for (const exp of queryResult.experiences) {
    lines.push(
      `- [ ] 对照历史经验 **${exp.exp_id}**（适用：${exp.applicable_when || "未限定"}；不适用：${exp.not_applicable_when || "未限定"}）决定沿用或排除：\`${exp.path}\``
    );
  }
  lines.push("- [ ] 收口时逐条记录归因结论（`已遵守` / `确认为根因` / `前提不适用` / `本体过时需更正或撤回`）并视需同步本体");
}

function formatImpactSection(lines, impactResult, driftedModIds, externalModIds) {
  lines.push(`## 更正级联影响反查（--impact-of \`${impactResult.targetId}\`）`);
  if (!impactResult.found) {
    lines.push(`- ❌ 未在本体节点、不变量或经验索引中找到 ID \`${impactResult.targetId}\`。`);
    return;
  }
  lines.push(`- 目标类型: **${impactResult.targetKind}** · 种子节点数: **${impactResult.seedNodes.length}**`);
  for (const sn of impactResult.seedNodes) {
    lines.push(`  - 种子: ${formatNodeBrief(sn, driftedModIds, externalModIds)}`);
  }
  lines.push("### 受波及下游节点与边");
  if (impactResult.downstream.reachedNodes.length === 0) {
    lines.push("- 暂未发现受波及的下游节点。");
  } else {
    for (const item of impactResult.downstream.edges) {
      const r = item.rel;
      lines.push(`- [第 ${item.hop} 跳] \`${r.from}\` --**${r.type}**${edgeSemanticTag(r)}--> \`${r.to}\`：${r.note || "—"}`);
    }
    for (const rn of impactResult.downstream.reachedNodes) {
      lines.push(`- (${rn.hop}跳) ${formatNodeBrief(rn.node, driftedModIds, externalModIds)}`);
    }
    if (impactResult.downstream.truncated) {
      lines.push(
        `- ⚠ **已按 \`--max-nodes ${impactResult.downstream.maxNodes}\` 截断**（另有 ${impactResult.downstream.skippedNodes} 个新节点未展开，可调大 \`--max-nodes\` 查看全量）。`
      );
    }
  }
  lines.push("### 受波及不变量与验证入口");
  if (impactResult.affectedInvariants.length === 0) {
    lines.push("- 无受波及不变量。");
  } else {
    for (const inv of impactResult.affectedInvariants) {
      const ver = inv.verification ? ` · 验证入口: \`${inv.verification}\`` : "";
      const cond = inv.applicable_when ? ` · 前提: ${inv.applicable_when}` : "";
      lines.push(`- **${inv.id}** [${inv.enforcement_layer} @ \`${inv.owner_node}\`]: ${inv.statement}${cond}${ver}`);
    }
  }
  if (impactResult.affectedExperiences.length > 0) {
    lines.push("### 关联历史经验（更正时需同步复核）");
    for (const exp of impactResult.affectedExperiences) {
      lines.push(`- **${exp.exp_id}** (\`${exp.path}\`): ${exp.risk_summary}`);
    }
  }
  if (impactResult.retractedItems.length > 0) {
    lines.push("### 关联已撤回/证伪记录");
    for (const ri of impactResult.retractedItems) {
      lines.push(`- [${ri.kind}] ${ri.label} — 撤回原因: ${ri.retracted_reason}`);
    }
  }
  lines.push("");
}

function formatMarkdownReport(data, nodes, freshness, queryResult, opts, impactResult = null) {
  const lines = [];
  const externalModIds = getExternalModuleIds(data);
  const driftedModIds =
    freshness && freshness.status === "drifted"
      ? new Set((freshness.drifted_modules || []).map((d) => d.module_id))
      : null;

  lines.push(`# 本体子图查询报告 — ${data.project.name}`);
  lines.push("");

  if (freshness) {
    lines.push("## 1. Git 新鲜度校验");
    lines.push(
      `- 基准提交: \`${freshness.verified_commit}\`${freshness.head_commit ? ` → HEAD \`${freshness.head_commit}\`` : ""} · 状态: **${freshness.status}**`
    );
    if (freshness.external_modules && freshness.external_modules.length > 0) {
      lines.push(
        `- ⏭ 已豁免外部边界模块（无本地目录漂移检查）: ${freshness.external_modules.map((m) => `\`${m.module_id}\``).join(", ")}`
      );
    }
    for (const w of freshness.warnings) lines.push(`- ⚠ ${w}`);
    if (freshness.status === "fresh") {
      lines.push("- ✅ 业务代码自基准提交以来无变更（已排除 `spec/` 与 `docs/`），本体拓扑可信度高。");
    } else if (freshness.status === "drifted") {
      if (freshness.drifted_modules.length > 0) {
        lines.push("- **以下模块存在未同步到本体的业务代码变更（优先列为嫌疑变更）**：");
        for (const dm of freshness.drifted_modules) {
          lines.push(`  - \`${dm.module_id}\` (${dm.module_name}): ${dm.matched_changes.join(", ")}`);
        }
      } else {
        lines.push(`- 共有 ${freshness.changed_files.length} 个非 spec/docs 文件改动，暂未命中已登记模块路径前缀。`);
      }
      if (opts.mode !== "browse" && freshness.recent_commits.length > 0) {
        lines.push("- **近期非文档提交摘要**：");
        for (const c of freshness.recent_commits.slice(0, 10)) lines.push(`  - \`${c}\``);
      }
    }
    lines.push("");
  }

  if (impactResult) {
    formatImpactSection(lines, impactResult, driftedModIds, externalModIds);
  }

  if (queryResult) {
    lines.push(
      `## 2. 现象锚定与子图推理（target=\`${opts.target}\`, mode=\`${opts.mode}\`, direction=\`${opts.direction}\`, depth=${opts.depth}, max-nodes=${opts.maxNodes}）`
    );
    if (queryResult.anchors.length === 0) {
      lines.push(`- 未在本体中命中与 \`${opts.target}\` 相关的节点（提示：可尝试报错关键词、模块名、代码文件名、字段名或产品指标名）。`);
      return lines.join("\n");
    }

    if (queryResult.suspectDrifts && queryResult.suspectDrifts.length > 0) {
      lines.push("- 🔥 **头号嫌疑变更（位于上游溯源链且存在未同步代码改动）**：");
      for (const dm of queryResult.suspectDrifts) {
        lines.push(`  - \`${dm.module_id}\` (${dm.module_name}): ${dm.matched_changes.join(", ")}`);
      }
    }

    lines.push("### 锚定节点");
    for (const a of queryResult.anchors) {
      const scoreStr = a.score !== undefined ? `（匹配分 ${a.score}）` : "";
      lines.push(`- ${formatNodeBrief(a, driftedModIds, externalModIds)}${scoreStr}`);
      if (a.hitReasons && a.hitReasons.length > 0) {
        lines.push(`  - 命中原因: ${a.hitReasons.join("；")}`);
      }
      if (a.kind === "field") {
        lines.push(`  - 口径与依赖: ${a.data.formula_and_deps}`);
        if (a.data.state_scope) lines.push(`  - 状态作用域: ${a.data.state_scope}`);
        if (a.data.null_and_default_semantics) {
          lines.push(`  - 空值与默认语义: ${a.data.null_and_default_semantics}`);
        }
        if (opts.mode !== "browse" && Array.isArray(a.data.confused_with) && a.data.confused_with.length > 0) {
          const cwStr = a.data.confused_with.map((c) => `\`${c.term}\`（${c.diff}）`).join("；");
          lines.push(`  - 易混淆区分: ${cwStr}`);
        }
        if (a.data.known_diff) lines.push(`  - ⚠ **文档/实现差异**: ${a.data.known_diff}`);
      } else if (a.data.summary) {
        lines.push(`  - 职责: ${a.data.summary}`);
      }
    }
    lines.push("");

    if (opts.mode === "browse") {
      const seenOneHop = new Set();
      const oneHopHighRisk = [
        ...(queryResult.upstream ? queryResult.upstream.edges : []),
        ...(queryResult.downstream ? queryResult.downstream.edges : []),
      ].filter((e) => {
        if (
          e.hop !== 1 ||
          !["fallback_to", "shared_state", "backfills_from", "maps_to", "propagates_to"].includes(e.rel.type)
        ) {
          return false;
        }
        const key = `${e.rel.from}|${e.rel.type}|${e.rel.to}`;
        if (seenOneHop.has(key)) return false;
        seenOneHop.add(key);
        return true;
      });
      lines.push("### 1 跳高危边与关键摘要（browse 概览模式）");
      lines.push(
        `- 上游边数: ${queryResult.upstream ? queryResult.upstream.edges.length : 0} · 下游边数: ${queryResult.downstream ? queryResult.downstream.edges.length : 0}`
      );
      for (const e of oneHopHighRisk) {
        const r = e.rel;
        lines.push(`- [高危边] \`${r.from}\` --**${r.type}**${edgeSemanticTag(r)}--> \`${r.to}\`：${r.note || "—"}`);
      }
      for (const inv of queryResult.invariants) {
        const cond = inv.applicable_when ? `（适用: ${inv.applicable_when}）` : "";
        lines.push(`- [不变量 ${inv.id}] ${inv.statement}${cond}`);
      }
      for (const exp of queryResult.experiences) {
        lines.push(`- [经验 ${exp.exp_id}] ${exp.risk_summary}（适用: ${exp.applicable_when || "未限定"}）`);
      }
      if (queryResult.retractedItems.length > 0) {
        lines.push(`- ⛔ 相关已撤回条目: ${queryResult.retractedItems.length} 条（请切 \`resolve\` 查看详情与原因）`);
      }
      lines.push("");
      lines.push("### 下一步精确钻取命令");
      const topId = queryResult.anchors[0].id;
      lines.push(
        `\`\`\`bash\nnode project-ontology/scripts/query-ontology.js ${normSlash(opts.jsonPath)} --mode resolve --target "${topId}" --direction both --depth 2 --freshness\n\`\`\``
      );
      return lines.join("\n");
    }

    if (queryResult.upstream) {
      lines.push("### 上游根因溯源链（Upstream）");
      if (queryResult.upstream.edges.length === 0) {
        lines.push("- 无更多上游依赖边（当前锚点已位于源头或未登记上游边）。");
      } else {
        for (const item of queryResult.upstream.edges) {
          const r = item.rel;
          lines.push(
            `- [第 ${item.hop} 跳] \`${r.from}\` --**${r.type}**${edgeSemanticTag(r)}--> \`${r.to}\`：${r.note || "—"}`
          );
        }
        lines.push("- **涉及上游节点详情**：");
        for (const rn of queryResult.upstream.reachedNodes) {
          lines.push(`  - (${rn.hop}跳) ${formatNodeBrief(rn.node, driftedModIds, externalModIds)}`);
        }
        if (queryResult.upstream.truncated) {
          lines.push(
            `- ⚠ **上游遍历已按 \`--max-nodes ${queryResult.upstream.maxNodes}\` 截断**（省略 ${queryResult.upstream.skippedNodes} 个新节点，可传入更高 \`--max-nodes\` 或聚焦锚点继续下钻）。`
          );
        }
      }
      lines.push("");
    }

    if (queryResult.downstream) {
      lines.push("### 下游爆炸半径（Downstream / 定向回归范围）");
      if (queryResult.downstream.edges.length === 0) {
        lines.push("- 暂未发现下游消费或传播边。");
      } else {
        for (const item of queryResult.downstream.edges) {
          const r = item.rel;
          lines.push(
            `- [第 ${item.hop} 跳] \`${r.from}\` --**${r.type}**${edgeSemanticTag(r)}--> \`${r.to}\`：${r.note || "—"}`
          );
        }
        lines.push("- **受波及模块与展示位清单（建议交给 spec-tester 回归）**：");
        for (const rn of queryResult.downstream.reachedNodes) {
          lines.push(`  - (${rn.hop}跳) ${formatNodeBrief(rn.node, driftedModIds, externalModIds)}`);
        }
        if (queryResult.downstream.truncated) {
          lines.push(
            `- ⚠ **下游遍历已按 \`--max-nodes ${queryResult.downstream.maxNodes}\` 截断**（省略 ${queryResult.downstream.skippedNodes} 个新节点，可传入更高 \`--max-nodes\` 查看全量爆炸半径）。`
          );
        }
      }
      lines.push("");
    }

    lines.push("### 核心不变量与风险预警");
    if (queryResult.invariants.length === 0) {
      lines.push("- 关联不变量: 暂无登记");
    } else {
      for (const inv of queryResult.invariants) {
        const cond = inv.applicable_when ? ` · 适用前提: ${inv.applicable_when}` : "";
        const stTag = inv.status && inv.status !== "verified" ? ` [${inv.status}]` : "";
        lines.push(
          `- **${inv.id}**${stTag} [${inv.enforcement_layer} @ \`${inv.owner_node}\`]: ${inv.statement}（违背症状: ${inv.violation_symptom}${cond}）`
        );
      }
    }
    if (queryResult.sharedStates.length > 0) {
      lines.push("- 🚨 **Phase 4.5 架构耦合预警（命中 shared_state 共享可变状态边）**：");
      for (const r of queryResult.sharedStates) {
        lines.push(`  - \`${r.from}\` ⇄ \`${r.to}\`: ${r.note}`);
      }
    }
    if (queryResult.fallbacks.length > 0) {
      lines.push("- ⚠ **防吞错审计提醒（命中 fallback_to 降级路径）**：");
      for (const r of queryResult.fallbacks) {
        lines.push(`  - \`${r.from}\` → \`${r.to}\`: ${r.note}（排查时核对主路径异常是否被静默降级掩盖）`);
      }
    }
    lines.push("");

    lines.push("### 关联历史经验（第三层，experience_refs）");
    if (queryResult.experiences.length === 0) {
      lines.push("- 暂未命中关联历史经验。");
    } else {
      for (const exp of queryResult.experiences) {
        const stTag = exp.status && exp.status !== "verified" ? ` [${exp.status}]` : "";
        const roleLinks = [
          exp.symptom_node ? `症状=\`${exp.symptom_node}\`` : null,
          exp.root_cause_node ? `根因=\`${exp.root_cause_node}\`` : null,
          exp.patch_node ? `收敛=\`${exp.patch_node}\`` : null,
        ].filter(Boolean);
        lines.push(`- **${exp.exp_id}**${stTag}（\`${exp.path}\`）：${exp.risk_summary}`);
        if (roleLinks.length > 0) lines.push(`  - 故障位点: ${roleLinks.join(" → ")}`);
        if (exp.applicable_when) lines.push(`  - ✅ 适用条件: ${exp.applicable_when}`);
        if (exp.not_applicable_when) lines.push(`  - ❌ 不适用条件: ${exp.not_applicable_when}`);
      }
    }
    lines.push("");

    if (queryResult.retractedItems.length > 0) {
      lines.push("### 已撤回/证伪警示（防重踩旧坑）");
      for (const ri of queryResult.retractedItems) {
        lines.push(`- ⛔ [${ri.kind}] ${ri.label} — **撤回原因**: ${ri.retracted_reason}`);
      }
      lines.push("");
    }

    appendChecklist(lines, queryResult, nodes);
  }

  return lines.join("\n");
}

if (require.main === module) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
  if (opts.help || !opts.jsonPath || (!opts.target && !opts.freshness && !opts.impactOf)) {
    console.log(
      "用法: node query-ontology.js <ontology.json> [--target <keyword|id>] [--direction upstream|downstream|both] [--depth 2] [--mode browse|resolve] [--max-nodes 30] [--include-retracted] [--impact-of <id>] [--freshness] [--repo .] [--format md|json]"
    );
    process.exit(opts.help ? 0 : 1);
  }

  const jsonAbs = path.resolve(opts.jsonPath);
  if (!fs.existsSync(jsonAbs)) {
    console.error(`❌ 找不到本体文件: ${jsonAbs}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonAbs, "utf8"));
  } catch (err) {
    console.error(`❌ ontology.json 解析失败: ${err.message}`);
    process.exit(1);
  }

  const { nodes } = buildNodeIndex(data);
  const relations = Array.isArray(data.relations) ? data.relations : [];
  const repoAbs = path.resolve(opts.repo);

  const freshness = opts.freshness ? checkFreshness(data, repoAbs) : null;
  const impactResult = opts.impactOf
    ? analyzeImpact(
        opts.impactOf,
        data,
        nodes,
        relations,
        Math.max(opts.depth, 3),
        opts.maxNodes,
        opts.includeRetracted
      )
    : null;

  let queryResult = null;
  if (opts.target) {
    const anchors = findAnchors(nodes, opts.target, data, {
      includeRetracted: opts.includeRetracted,
    });
    const seedIds = anchors.map((a) => a.id);
    const travDepth = opts.mode === "browse" ? Math.min(opts.depth, 1) : opts.depth;
    const travOpts = { maxNodes: opts.maxNodes, includeRetracted: opts.includeRetracted };
    const upstream =
      opts.direction === "upstream" || opts.direction === "both"
        ? traverse(seedIds, relations, nodes, "upstream", travDepth, travOpts)
        : null;
    const downstream =
      opts.direction === "downstream" || opts.direction === "both"
        ? traverse(seedIds, relations, nodes, "downstream", travDepth, travOpts)
        : null;

    const relevantIds = new Set(seedIds);
    const touchedEdges = [];
    for (const dirRes of [upstream, downstream]) {
      if (!dirRes) continue;
      for (const rn of dirRes.reachedNodes) relevantIds.add(rn.node.id);
      for (const e of dirRes.edges) touchedEdges.push(e.rel);
    }

    const upstreamModIds = new Set(anchors.map((a) => a.moduleId));
    if (upstream) {
      for (const rn of upstream.reachedNodes) upstreamModIds.add(rn.node.moduleId);
    }
    const suspectDrifts =
      freshness && freshness.status === "drifted"
        ? (freshness.drifted_modules || []).filter((dm) => upstreamModIds.has(dm.module_id))
        : [];

    const dedupEdges = (type) => {
      const seen = new Set();
      return touchedEdges.filter((r) => {
        if (r.type !== type) return false;
        const k = `${r.from}|${r.to}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    };

    queryResult = {
      anchors,
      upstream,
      downstream,
      suspectDrifts,
      invariants: collectRelevantInvariants(relevantIds, data, nodes, opts.includeRetracted),
      experiences: collectRelevantExperiences(relevantIds, data, nodes, opts.includeRetracted),
      retractedItems: collectRetractedItems(relevantIds, data, nodes),
      sharedStates: dedupEdges("shared_state"),
      fallbacks: dedupEdges("fallback_to"),
    };
  }

  if (opts.format === "json") {
    console.log(JSON.stringify({ freshness, query: queryResult, impact: impactResult }, null, 2));
  } else {
    console.log(formatMarkdownReport(data, nodes, freshness, queryResult, opts, impactResult));
  }
}

module.exports = {
  checkFreshness,
  tokenizeQuery,
  findAnchors,
  traverse,
  collectRelevantInvariants,
  collectRelevantExperiences,
  collectRetractedItems,
  analyzeImpact,
};
