import * as fs from "fs/promises";
import * as path from "path";

export const specCategories = [
  "02-技术设计",
  "03-功能实现",
  "04-Bug修复",
  "05-测试验证"
] as const;

export interface CreateSpecInput {
  workspaceRootFsPath: string;
  title: string;
  category: string;
  gitBranch: string;
  baseBranch: string;
  now?: Date;
}

export interface CreatedSpec {
  id: string;
  title: string;
  category: string;
  specDir: string;
  specDirFsPath: string;
  planPathFsPath: string;
  gitBranch: string;
  baseBranch: string;
}

export async function createSpec(input: CreateSpecInput): Promise<CreatedSpec> {
  const title = normalizeTitle(input.title);
  const category = input.category || specCategories[0];
  const id = createSpecId(input.now ?? new Date());
  const folderName = `${id}-${title}`;
  const specDir = path.join("spec", category, folderName).replace(/\\/g, "/");
  const specDirFsPath = path.join(input.workspaceRootFsPath, "spec", category, folderName);

  await ensureDirectoryDoesNotExist(specDirFsPath);
  await fs.mkdir(path.join(specDirFsPath, "logs"), { recursive: true });
  await fs.mkdir(path.join(specDirFsPath, "agent-sessions"), { recursive: true });

  const createdDate = formatDate(input.now ?? new Date());
  const planPathFsPath = path.join(specDirFsPath, "plan.md");
  const files: Array<[string, string]> = [
    ["README.md", renderReadme({ ...input, title, category, id, specDir, createdDate })],
    ["plan.md", renderPlan({ ...input, title, category, id, createdDate })],
    ["test-plan.md", renderTestPlan({ ...input, title, category, id, createdDate })],
    ["team-context.md", renderTeamContext({ ...input, title, category, id, specDir, createdDate })],
    ["AgentTeam.canvas", renderAgentTeamCanvas(title, specDir)],
    ["team-chat.jsonl", ""],
    ["agent-chat.jsonl", ""],
    ["agent-timeline.jsonl", ""],
    ["audit-log.jsonl", ""]
  ];

  await Promise.all(files.map(([fileName, body]) => fs.writeFile(path.join(specDirFsPath, fileName), body, "utf8")));

  return {
    id,
    title,
    category,
    specDir,
    specDirFsPath,
    planPathFsPath,
    gitBranch: input.gitBranch,
    baseBranch: input.baseBranch
  };
}

export function createSpecBranchName(id: string, title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `feat/spec-${id}-${slug || `spec-${shortHash(title)}`}`;
}

export function validateSpecTitle(value: string): string | undefined {
  const title = value.trim();
  if (!title) {
    return "Spec title is required.";
  }
  if (/[\\/:*?"<>|]/.test(title)) {
    return "Spec title cannot contain path separator or reserved filename characters.";
  }
  if (title.length > 80) {
    return "Spec title must be 80 characters or fewer.";
  }
  return undefined;
}

function normalizeTitle(value: string): string {
  const title = value.trim().replace(/\s+/g, "");
  const error = validateSpecTitle(title);
  if (error) {
    throw new Error(error);
  }
  return title;
}

export function createSpecId(date: Date): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}${month}${day}-${hour}${minute}`;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}

async function ensureDirectoryDoesNotExist(specDirFsPath: string): Promise<void> {
  try {
    await fs.stat(specDirFsPath);
    throw new Error(`Spec directory already exists: ${specDirFsPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function renderReadme(input: CreateSpecInput & { id: string; title: string; category: string; specDir: string; createdDate: string }): string {
  return `---\ntitle: ${input.title}\ntype: spec\ncategory: ${input.category}\nstatus: draft\npriority: 中\ncreated: ${input.createdDate}\ngit_branch: ${input.gitBranch}\nbase_branch: ${input.baseBranch}\ntags:\n  - spec\nrelated:\n  - "[[plan|实现计划]]"\n  - "[[test-plan|测试计划]]"\n---\n\n# ${input.title}\n\n## 背景\n\n待补充。\n\n## 目标\n\n待补充。\n\n## 当前 Spec\n\n- ID: ${input.id}\n- 目录: \`${input.specDir}\`\n- Git 分支: \`${input.gitBranch || "not set"}\`\n\n`;
}

function renderPlan(input: CreateSpecInput & { id: string; title: string; category: string; createdDate: string }): string {
  return `---\ntitle: ${input.title}\ntype: plan\ncategory: ${input.category}\nstatus: 草稿\npriority: 中\ncreated: ${input.createdDate}\nexecution_mode: single-agent\ngit_branch: ${input.gitBranch}\nbase_branch: ${input.baseBranch}\npr_url:\ntags:\n  - spec\n  - plan\nrelated:\n  - "[[test-plan|测试计划]]"\n---\n\n# ${input.title}\n\n## 1. 背景\n\n待补充。\n\n## 2. 目标\n\n待补充。\n\n## 3. 非目标\n\n待补充。\n\n## 4. 实现计划\n\n待补充。\n\n## 5. 验收标准\n\n待补充。\n\n`;
}

function renderTestPlan(input: CreateSpecInput & { id: string; title: string; category: string; createdDate: string }): string {
  return `---\ntitle: ${input.title}测试计划\ntype: test-plan\ncategory: ${input.category}\nstatus: 草稿\ncreated: ${input.createdDate}\nrelated:\n  - "[[plan|实现计划]]"\n---\n\n# Test Plan\n\n## 测试策略\n\n待补充。\n\n## 自动化测试\n\n待补充。\n\n## 端侧测试\n\n待补充。\n\n## 审计日志\n\n测试日志和端侧审计日志应保留在当前 Spec 目录中。\n\n`;
}

function renderTeamContext(input: CreateSpecInput & { id: string; title: string; category: string; specDir: string; createdDate: string }): string {
  return `---\ntitle: ${input.title}团队上下文\ntype: team-context\ncategory: ${input.category}\nstatus: active\ncreated: ${input.createdDate}\n---\n\n# Team Context\n\n## Spec\n\n- ID: ${input.id}\n- Title: ${input.title}\n- Directory: \`${input.specDir}\`\n- Git Branch: \`${input.gitBranch || "not set"}\`\n\n## Roles\n\n- TeamLead\n- spec-explorer\n- spec-writer\n- spec-executor\n- spec-tester\n- spec-debugger\n- spec-ender\n\n`;
}

function renderAgentTeamCanvas(title: string, specDir: string): string {
  return `${JSON.stringify({
    nodes: [
      {
        id: "teamlead",
        type: "text",
        x: 80,
        y: 80,
        width: 260,
        height: 120,
        text: `# TeamLead\n${title}\n\n${specDir}`
      }
    ],
    edges: []
  }, null, 2)}\n`;
}
