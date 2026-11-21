#!/usr/bin/env node
/**
 * 项目本体结构与一致性机检（project-ontology skill）
 *
 * 用法：
 *   node check-ontology.js <ontology.json> [--strict] [--no-html-check] [--html <index.html>]
 *
 * 零外部依赖，仅需 Node >= 14。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PRODUCER_TYPES = new Set(["code", "llm", "mix"]);
const DETAIL_MODES = new Set(["metrics", "artifact"]);
const MODULE_KINDS = new Set(["internal", "external"]);
const ENFORCEMENT_LAYERS = new Set(["root", "boundary"]);
const CLAIM_STATUSES = new Set(["verified", "inferred", "retracted"]);
const RELATION_TYPES = new Set([
  "produces",
  "consumes",
  "depends_on",
  "backfills_from",
  "fallback_to",
  "shared_state",
  "propagates_to",
  "maps_to",
]);
const FLOW_STYLES = new Set(["default", "hl", "dim"]);
const RESERVED_TABS = new Set(["overview", "ontology"]);
const MODULE_ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
const GIT_SHA_RE = /^[0-9a-f]{7,40}$/i;

function validateClaimStatus(obj, loc, errors, counters) {
  if (!obj || obj.status === undefined) return;
  if (!CLAIM_STATUSES.has(obj.status)) {
    errors.push(`${loc}.status 非法: "${obj.status}"（允许 verified|inferred|retracted）`);
    return;
  }
  if (obj.status === "inferred") counters.inferred += 1;
  if (obj.status === "retracted") {
    counters.retracted += 1;
    if (!isNonEmptyStr(obj.retracted_reason)) {
      errors.push(`${loc}.retracted_reason 在 status="retracted" 时不能为空`);
    }
  }
}

function computeSourceHash(rawText) {
  return crypto.createHash("sha256").update(rawText, "utf8").digest("hex").slice(0, 16);
}

function isNonEmptyStr(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function buildNodeIndex(data) {
  const nodes = new Map();
  const invariants = new Map();

  if (Array.isArray(data && data.modules)) {
    for (const mod of data.modules) {
      if (!mod || !isNonEmptyStr(mod.id)) continue;
      if (!nodes.has(mod.id)) {
        nodes.set(mod.id, {
          id: mod.id,
          kind: "module",
          name: mod.name || mod.id,
          moduleId: mod.id,
          moduleName: mod.name || mod.id,
          parentId: null,
          data: mod,
        });
      }
      if (Array.isArray(mod.units)) {
        for (const unit of mod.units) {
          if (!unit || !isNonEmptyStr(unit.id)) continue;
          if (!nodes.has(unit.id)) {
            nodes.set(unit.id, {
              id: unit.id,
              kind: "unit",
              name: unit.name || unit.id,
              moduleId: mod.id,
              moduleName: mod.name || mod.id,
              unitId: unit.id,
              unitName: unit.name || unit.id,
              parentId: mod.id,
              data: unit,
            });
          }
          if (Array.isArray(unit.fields)) {
            for (const field of unit.fields) {
              if (!field || !isNonEmptyStr(field.id)) continue;
              if (!nodes.has(field.id)) {
                nodes.set(field.id, {
                  id: field.id,
                  kind: "field",
                  name: field.name || field.id,
                  moduleId: mod.id,
                  moduleName: mod.name || mod.id,
                  unitId: unit.id,
                  unitName: unit.name || unit.id,
                  parentId: unit.id,
                  data: field,
                });
              }
            }
          }
        }
      }
    }
  }

  if (Array.isArray(data && data.invariants)) {
    for (const inv of data.invariants) {
      if (inv && isNonEmptyStr(inv.id) && !invariants.has(inv.id)) {
        invariants.set(inv.id, inv);
      }
    }
  }

  return { nodes, invariants };
}

function validateHtmlArtifact(htmlText, rawJsonText, strict) {
  const errors = [];
  const expectedHash = computeSourceHash(rawJsonText);
  const hashMatch = /<meta\s+name="po:source-sha256"\s+content="([^"]+)"/i.exec(htmlText);
  if (!hashMatch) {
    errors.push("HTML 缺少 <meta name=\"po:source-sha256\"> 指纹（请用 render-ontology.js 重新渲染）");
  } else if (hashMatch[1] !== expectedHash) {
    errors.push(
      `HTML 与 ontology.json 不同步（HTML 指纹 ${hashMatch[1]} !== JSON 指纹 ${expectedHash}），请重新运行 render-ontology.js`
    );
  }

  const schemaMatch = /<meta\s+name="po:schema-version"\s+content="([^"]+)"/i.exec(htmlText);
  if (!schemaMatch || schemaMatch[1] !== "1.0") {
    errors.push("HTML 缺少或版本不匹配的 <meta name=\"po:schema-version\" content=\"1.0\">");
  }

  const navTabs = [];
  const secTabs = [];
  const navRe = /data-tab="([\w-]+)"/g;
  const secRe = /<section[^>]*\bid="tab-([\w-]+)"/g;
  let m;
  while ((m = navRe.exec(htmlText))) navTabs.push(m[1]);
  while ((m = secRe.exec(htmlText))) secTabs.push(m[1]);
  if (navTabs.length === 0 || navTabs.join(",") !== secTabs.join(",")) {
    errors.push(`HTML Tab 配对失败：nav=[${navTabs.join(",")}] vs section=[${secTabs.join(",")}]`);
  }

  const gxRows = (htmlText.match(/class="gx-row(?:\s|")/g) || []).length;
  const gxDetails = (htmlText.match(/class="gx-detail(?:\s|")/g) || []).length;
  if (gxRows !== gxDetails) {
    errors.push(`HTML 折叠行配对失败：gx-row=${gxRows}, gx-detail=${gxDetails}`);
  }

  const scriptParts = htmlText.split(/<script\b[^>]*>/i);
  const lastScript = scriptParts.length > 1 ? scriptParts[scriptParts.length - 1] : "";
  if (!lastScript.includes("gx-detail") || !lastScript.includes("popstate")) {
    errors.push("HTML 缺少完整交互脚本（gx-detail / popstate）");
  }

  if (strict) {
    const todoCount = (htmlText.match(/class="todo(?:\s|")/g) || []).length;
    if (todoCount > 0) {
      errors.push(`严格模式阻断：HTML 中仍残留 ${todoCount} 个 .todo 待填充块`);
    }
  }

  return errors;
}

function validateOntology(data, rawText, options = {}) {
  const errors = [];
  const warnings = [];
  const strict = Boolean(options.strict);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { errors: ["ontology.json 根节点必须为 JSON 对象"], warnings, stats: null };
  }

  if (data.schema_version !== "1.0") {
    errors.push(`schema_version 必须为 "1.0"，实际为 ${JSON.stringify(data.schema_version)}`);
  }

  // project
  if (!data.project || typeof data.project !== "object") {
    errors.push("缺少 project 对象");
  } else {
    if (!isNonEmptyStr(data.project.name)) errors.push("project.name 不能为空");
    if (!isNonEmptyStr(data.project.summary)) errors.push("project.summary 不能为空");
    if (!Array.isArray(data.project.key_facts)) errors.push("project.key_facts 必须为数组");
  }

  // version
  if (!data.version || typeof data.version !== "object") {
    errors.push("缺少 version 对象");
  } else {
    if (!isNonEmptyStr(data.version.last_verified_commit)) {
      errors.push("version.last_verified_commit 不能为空");
    } else if (strict && !GIT_SHA_RE.test(data.version.last_verified_commit.trim())) {
      errors.push(
        `严格模式：version.last_verified_commit ("${data.version.last_verified_commit}") 必须是 7~40 位十六进制 commit SHA`
      );
    } else if (!GIT_SHA_RE.test(data.version.last_verified_commit.trim())) {
      warnings.push(
        `version.last_verified_commit ("${data.version.last_verified_commit}") 非标准 Git SHA，--freshness 校验将被跳过`
      );
    }
    if (!isNonEmptyStr(data.version.commit_summary)) errors.push("version.commit_summary 不能为空");
    if (!isNonEmptyStr(data.version.updated_at)) errors.push("version.updated_at 不能为空");
    if (data.version.synced_prs !== undefined && !Array.isArray(data.version.synced_prs)) {
      errors.push("version.synced_prs 若存在则必须为数组");
    }
  }

  // flow
  if (!Array.isArray(data.flow)) {
    errors.push("flow 必须为数组");
  } else {
    data.flow.forEach((row, rIdx) => {
      if (!row || !Array.isArray(row.nodes) || row.nodes.length === 0) {
        errors.push(`flow[${rIdx}].nodes 必须为非空数组`);
        return;
      }
      row.nodes.forEach((fn, nIdx) => {
        if (!fn || !isNonEmptyStr(fn.label)) {
          errors.push(`flow[${rIdx}].nodes[${nIdx}].label 不能为空`);
        }
        if (fn && fn.style !== undefined && !FLOW_STYLES.has(fn.style)) {
          errors.push(`flow[${rIdx}].nodes[${nIdx}].style 非法: "${fn.style}"`);
        }
      });
    });
  }

  // modules / units / fields & global ID uniqueness
  const seenIds = new Map();
  let unitCount = 0;
  let fieldCount = 0;
  let todoCount = 0;
  let externalModules = 0;
  const claimCounters = { inferred: 0, retracted: 0 };

  function registerId(id, loc) {
    if (!isNonEmptyStr(id)) {
      errors.push(`${loc} 缺少非空 id`);
      return false;
    }
    if (seenIds.has(id)) {
      errors.push(`全局 ID 重复: "${id}" 同时出现在 ${seenIds.get(id)} 与 ${loc}`);
      return false;
    }
    seenIds.set(id, loc);
    return true;
  }

  if (!Array.isArray(data.modules)) {
    errors.push("modules 必须为数组");
  } else {
    if (strict && data.modules.length === 0) {
      errors.push("严格模式：modules 不能为空");
    }
    data.modules.forEach((mod, mIdx) => {
      const mLoc = `modules[${mIdx}]`;
      if (!mod || typeof mod !== "object") {
        errors.push(`${mLoc} 必须为对象`);
        return;
      }
      if (registerId(mod.id, mLoc)) {
        if (!MODULE_ID_RE.test(mod.id)) {
          errors.push(`${mLoc}.id ("${mod.id}") 须匹配 /^[a-z0-9][a-z0-9_-]*$/`);
        }
        if (RESERVED_TABS.has(mod.id)) {
          errors.push(`${mLoc}.id ("${mod.id}") 使用了保留 Tab 名称`);
        }
      }
      if (!isNonEmptyStr(mod.name)) errors.push(`${mLoc}.name 不能为空`);
      if (mod.kind !== undefined) {
        if (!MODULE_KINDS.has(mod.kind)) {
          errors.push(`${mLoc}.kind 非法: "${mod.kind}"（允许 internal|external）`);
        } else if (mod.kind === "external") {
          externalModules += 1;
        }
      }
      if (!Array.isArray(mod.dirs)) errors.push(`${mLoc}.dirs 必须为数组`);
      if (!Array.isArray(mod.entry_anchors)) errors.push(`${mLoc}.entry_anchors 必须为数组`);
      if (!isNonEmptyStr(mod.summary)) errors.push(`${mLoc}.summary 不能为空`);
      if (!Array.isArray(mod.todos)) {
        errors.push(`${mLoc}.todos 必须为数组`);
      } else if (mod.todos.length > 0) {
        todoCount += mod.todos.length;
        if (strict) {
          errors.push(`严格模式：${mLoc} (${mod.id}) 仍有 ${mod.todos.length} 条待填充 todos`);
        }
      }
      if (!Array.isArray(mod.units)) {
        errors.push(`${mLoc}.units 必须为数组`);
        return;
      }

      mod.units.forEach((unit, uIdx) => {
        unitCount += 1;
        const uLoc = `${mLoc}.units[${uIdx}]`;
        if (!unit || typeof unit !== "object") {
          errors.push(`${uLoc} 必须为对象`);
          return;
        }
        registerId(unit.id, uLoc);
        if (!isNonEmptyStr(unit.name)) errors.push(`${uLoc}.name 不能为空`);
        if (!PRODUCER_TYPES.has(unit.producer_type)) {
          errors.push(`${uLoc}.producer_type 非法: "${unit.producer_type}"（允许 code|llm|mix）`);
        }
        if (!isNonEmptyStr(unit.summary)) errors.push(`${uLoc}.summary 不能为空`);
        if (!Array.isArray(unit.code_anchors)) errors.push(`${uLoc}.code_anchors 必须为数组`);
        if (!DETAIL_MODES.has(unit.detail_mode)) {
          errors.push(`${uLoc}.detail_mode 非法: "${unit.detail_mode}"（允许 metrics|artifact）`);
        }
        if (!Array.isArray(unit.fields)) {
          errors.push(`${uLoc}.fields 必须为数组`);
          return;
        }

        unit.fields.forEach((field, fIdx) => {
          fieldCount += 1;
          const fLoc = `${uLoc}.fields[${fIdx}]`;
          if (!field || typeof field !== "object") {
            errors.push(`${fLoc} 必须为对象`);
            return;
          }
          registerId(field.id, fLoc);
          if (!isNonEmptyStr(field.name)) errors.push(`${fLoc}.name 不能为空`);
          if (!PRODUCER_TYPES.has(field.producer_type)) {
            errors.push(`${fLoc}.producer_type 非法: "${field.producer_type}"（允许 code|llm|mix）`);
          }
          if (!isNonEmptyStr(field.formula_and_deps)) {
            errors.push(`${fLoc}.formula_and_deps 不能为空`);
          }
          if (!Array.isArray(field.code_anchors)) errors.push(`${fLoc}.code_anchors 必须为数组`);
          if (!Array.isArray(field.invariants)) errors.push(`${fLoc}.invariants 必须为数组`);
          if (
            field.null_and_default_semantics !== undefined &&
            !isNonEmptyStr(field.null_and_default_semantics)
          ) {
            errors.push(`${fLoc}.null_and_default_semantics 若提供则须为非空字符串`);
          }
          if (field.state_scope !== undefined && !isNonEmptyStr(field.state_scope)) {
            errors.push(`${fLoc}.state_scope 若提供则须为非空字符串`);
          }
          if (field.confused_with !== undefined) {
            if (!Array.isArray(field.confused_with)) {
              errors.push(`${fLoc}.confused_with 必须为数组`);
            } else {
              field.confused_with.forEach((cw, cwIdx) => {
                const cLoc = `${fLoc}.confused_with[${cwIdx}]`;
                if (!cw || typeof cw !== "object") {
                  errors.push(`${cLoc} 必须为对象`);
                  return;
                }
                if (!isNonEmptyStr(cw.term)) errors.push(`${cLoc}.term 不能为空`);
                if (!isNonEmptyStr(cw.diff)) errors.push(`${cLoc}.diff 不能为空`);
              });
            }
          }
        });
      });
    });
  }

  // invariants
  const { nodes, invariants } = buildNodeIndex(data);
  if (!Array.isArray(data.invariants)) {
    errors.push("invariants 必须为数组");
  } else {
    data.invariants.forEach((inv, iIdx) => {
      const iLoc = `invariants[${iIdx}]`;
      if (!inv || typeof inv !== "object") {
        errors.push(`${iLoc} 必须为对象`);
        return;
      }
      registerId(inv.id, iLoc);
      if (!isNonEmptyStr(inv.statement)) errors.push(`${iLoc}.statement 不能为空`);
      if (!isNonEmptyStr(inv.owner_node)) {
        errors.push(`${iLoc}.owner_node 不能为空`);
      } else if (!nodes.has(inv.owner_node)) {
        errors.push(`${iLoc}.owner_node ("${inv.owner_node}") 未在任何 module/unit/field 中定义`);
      }
      if (!ENFORCEMENT_LAYERS.has(inv.enforcement_layer)) {
        errors.push(`${iLoc}.enforcement_layer 非法: "${inv.enforcement_layer}"（允许 root|boundary）`);
      }
      if (!isNonEmptyStr(inv.violation_symptom)) errors.push(`${iLoc}.violation_symptom 不能为空`);
      if (inv.applicable_when !== undefined && !isNonEmptyStr(inv.applicable_when)) {
        errors.push(`${iLoc}.applicable_when 若提供则须为非空字符串`);
      }
      validateClaimStatus(inv, iLoc, errors, claimCounters);
    });
  }

  // verify field.invariants referential integrity
  if (Array.isArray(data.modules)) {
    for (const mod of data.modules) {
      if (!mod || !Array.isArray(mod.units)) continue;
      for (const unit of mod.units) {
        if (!unit || !Array.isArray(unit.fields)) continue;
        for (const field of unit.fields) {
          if (!field || !Array.isArray(field.invariants)) continue;
          for (const invId of field.invariants) {
            if (!invariants.has(invId)) {
              errors.push(`字段 "${field.id}" 引用了未定义的不变量 "${invId}"`);
            }
          }
        }
      }
    }
  }

  // relations
  let sharedStateCount = 0;
  let fallbackCount = 0;
  const edgeKeys = new Set();
  if (!Array.isArray(data.relations)) {
    errors.push("relations 必须为数组");
  } else {
    data.relations.forEach((rel, eIdx) => {
      const eLoc = `relations[${eIdx}]`;
      if (!rel || typeof rel !== "object") {
        errors.push(`${eLoc} 必须为对象`);
        return;
      }
      if (!isNonEmptyStr(rel.from)) {
        errors.push(`${eLoc}.from 不能为空`);
      } else if (!nodes.has(rel.from)) {
        errors.push(`悬空边：${eLoc}.from ("${rel.from}") 不存在`);
      }
      if (!isNonEmptyStr(rel.to)) {
        errors.push(`${eLoc}.to 不能为空`);
      } else if (!nodes.has(rel.to)) {
        errors.push(`悬空边：${eLoc}.to ("${rel.to}") 不存在`);
      }
      if (rel.from && rel.to && rel.from === rel.to) {
        errors.push(`非法自环：${eLoc} (${rel.from} -> ${rel.to})`);
      }
      if (!RELATION_TYPES.has(rel.type)) {
        errors.push(`${eLoc}.type 非法: "${rel.type}"`);
      } else {
        if (rel.type === "shared_state") sharedStateCount += 1;
        if (rel.type === "fallback_to") fallbackCount += 1;
      }
      if (typeof rel.note !== "string") errors.push(`${eLoc}.note 必须为字符串`);
      validateClaimStatus(rel, eLoc, errors, claimCounters);
      if (rel.from && rel.to && rel.type) {
        const key = `${rel.from}|${rel.type}|${rel.to}`;
        if (edgeKeys.has(key)) {
          errors.push(`重复关系边: ${rel.from} --[${rel.type}]--> ${rel.to}`);
        }
        edgeKeys.add(key);
      }
    });
  }

  // experience_refs (optional layer 3)
  let experienceRefsCount = 0;
  if (data.experience_refs !== undefined) {
    if (!Array.isArray(data.experience_refs)) {
      errors.push("experience_refs 若提供则必须为数组");
    } else {
      experienceRefsCount = data.experience_refs.length;
      data.experience_refs.forEach((exp, xIdx) => {
        const xLoc = `experience_refs[${xIdx}]`;
        if (!exp || typeof exp !== "object") {
          errors.push(`${xLoc} 必须为对象`);
          return;
        }
        registerId(exp.exp_id, xLoc);
        if (!isNonEmptyStr(exp.path)) errors.push(`${xLoc}.path 不能为空`);
        if (!isNonEmptyStr(exp.risk_summary)) errors.push(`${xLoc}.risk_summary 不能为空`);
        if (!Array.isArray(exp.nodes) || exp.nodes.length === 0) {
          errors.push(`${xLoc}.nodes 必须为非空数组`);
        } else {
          exp.nodes.forEach((nid, nIdx) => {
            if (!isNonEmptyStr(nid)) {
              errors.push(`${xLoc}.nodes[${nIdx}] 不能为空`);
            } else if (!nodes.has(nid)) {
              errors.push(`${xLoc}.nodes[${nIdx}] ("${nid}") 未在任何 module/unit/field 中定义`);
            }
          });
        }
        for (const refKey of ["symptom_node", "root_cause_node", "patch_node"]) {
          if (exp[refKey] !== undefined) {
            if (!isNonEmptyStr(exp[refKey])) {
              errors.push(`${xLoc}.${refKey} 若提供则须为非空字符串`);
            } else if (!nodes.has(exp[refKey])) {
              errors.push(`${xLoc}.${refKey} ("${exp[refKey]}") 未在任何 module/unit/field 中定义`);
            }
          }
        }
        if (exp.applicable_when !== undefined && !isNonEmptyStr(exp.applicable_when)) {
          errors.push(`${xLoc}.applicable_when 若提供则须为非空字符串`);
        }
        if (exp.not_applicable_when !== undefined && !isNonEmptyStr(exp.not_applicable_when)) {
          errors.push(`${xLoc}.not_applicable_when 若提供则须为非空字符串`);
        }
        validateClaimStatus(exp, xLoc, errors, claimCounters);
      });
    }
  }

  if (claimCounters.inferred > 0) {
    warnings.push(
      `存在 ${claimCounters.inferred} 条 status="inferred" 的推断结论尚未实证（不阻断校验，建议尽快实测转为 verified 或撤回）`
    );
  }

  // HTML check when enabled and file exists
  if (!options.noHtmlCheck && options.htmlPath && fs.existsSync(options.htmlPath) && typeof rawText === "string") {
    const htmlText = fs.readFileSync(options.htmlPath, "utf8");
    errors.push(...validateHtmlArtifact(htmlText, rawText, strict));
  }

  return {
    errors,
    warnings,
    stats: {
      modules: Array.isArray(data.modules) ? data.modules.length : 0,
      externalModules,
      units: unitCount,
      fields: fieldCount,
      invariants: Array.isArray(data.invariants) ? data.invariants.length : 0,
      relations: Array.isArray(data.relations) ? data.relations.length : 0,
      experienceRefs: experienceRefsCount,
      sharedStates: sharedStateCount,
      fallbacks: fallbackCount,
      inferredClaims: claimCounters.inferred,
      retractedClaims: claimCounters.retracted,
      todos: todoCount,
    },
  };
}

function parseArgs(argv) {
  const opts = { jsonPath: null, strict: false, noHtmlCheck: false, htmlPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strict") opts.strict = true;
    else if (a === "--no-html-check") opts.noHtmlCheck = true;
    else if (a === "--html") opts.htmlPath = argv[++i] || null;
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
    console.log("用法: node check-ontology.js <ontology.json> [--strict] [--no-html-check] [--html <index.html>]");
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

  const htmlAbs = opts.htmlPath
    ? path.resolve(opts.htmlPath)
    : path.join(path.dirname(jsonAbs), "index.html");

  const res = validateOntology(data, rawText, {
    strict: opts.strict,
    noHtmlCheck: opts.noHtmlCheck,
    htmlPath: htmlAbs,
  });

  for (const w of res.warnings) {
    console.warn(`⚠️  ${w}`);
  }
  if (res.errors.length > 0) {
    console.error(`❌ 本体机检未通过（${res.errors.length} 项错误）：`);
    for (const e of res.errors) {
      console.error(`   - ${e}`);
    }
    process.exit(1);
  }

  const s = res.stats;
  const htmlNote = !opts.noHtmlCheck && fs.existsSync(htmlAbs) ? " · HTML 同步已校验" : "";
  const extraStats = [];
  if (s.externalModules > 0) extraStats.push(`external=${s.externalModules}`);
  if (s.experienceRefs > 0) extraStats.push(`exp=${s.experienceRefs}`);
  if (s.inferredClaims > 0) extraStats.push(`inferred=${s.inferredClaims}`);
  if (s.retractedClaims > 0) extraStats.push(`retracted=${s.retractedClaims}`);
  const extraSuffix = extraStats.length ? `, ${extraStats.join(", ")}` : "";
  console.log(
    `✅ 本体机检通过${opts.strict ? "（严格模式）" : ""}：` +
      `${s.modules} 模块 / ${s.units} 单元 / ${s.fields} 字段 / ` +
      `${s.invariants} 不变量 / ${s.relations} 关系边` +
      `（shared_state=${s.sharedStates}, fallback_to=${s.fallbacks}, todos=${s.todos}${extraSuffix}）${htmlNote}`
  );
}

module.exports = {
  PRODUCER_TYPES,
  DETAIL_MODES,
  MODULE_KINDS,
  ENFORCEMENT_LAYERS,
  CLAIM_STATUSES,
  RELATION_TYPES,
  FLOW_STYLES,
  RESERVED_TABS,
  GIT_SHA_RE,
  computeSourceHash,
  buildNodeIndex,
  validateClaimStatus,
  validateOntology,
};
