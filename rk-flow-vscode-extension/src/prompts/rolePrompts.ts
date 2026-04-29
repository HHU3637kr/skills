import type { AgentRole } from "../agentAdapters/types";
import type { SpecBinding } from "../specs/types";
import type { TeamMessage } from "../teamBus/types";
import { agentRoles } from "../common/roles";

interface RoleDefinition {
  role: AgentRole;
  responsibility: string;
  skillName: string;
  skillUsage: string;
}

const roleDefinitions: Record<AgentRole, RoleDefinition> = {
  TeamLead: {
    role: "TeamLead",
    responsibility: "Coordinate the current Spec, keep phase boundaries clear, and route specialist work to the correct AgentRole.",
    skillName: "spec-start",
    skillUsage: "Use only when starting a new Spec or AgentTeam workflow. For an existing Spec, coordinate and route work via TeamBus instead of doing specialist work directly."
  },
  "spec-explorer": {
    role: "spec-explorer",
    responsibility: "Explore repository context, historical Spec records, constraints, and unknowns before design or implementation.",
    skillName: "spec-explore",
    skillUsage: "Use when collecting background, reading code, searching historical experience, or preparing exploration reports."
  },
  "spec-writer": {
    role: "spec-writer",
    responsibility: "Write the technical plan, data contracts, implementation steps, acceptance criteria, and related design documents.",
    skillName: "spec-write",
    skillUsage: "Use when creating or revising plan.md and design-level implementation guidance."
  },
  "spec-executor": {
    role: "spec-executor",
    responsibility: "Implement the approved plan strictly within scope and produce implementation summary artifacts.",
    skillName: "spec-execute",
    skillUsage: "Use when executing an approved plan.md and making scoped code changes."
  },
  "spec-tester": {
    role: "spec-tester",
    responsibility: "Design and execute tests, preserve audit logs, verify behavior, and report defects with reproducible evidence.",
    skillName: "spec-test",
    skillUsage: "Use when writing test plans, running automated or end-side tests, and producing test reports."
  },
  "spec-debugger": {
    role: "spec-debugger",
    responsibility: "Diagnose verified defects, identify root cause, create debug documents, and apply focused fixes.",
    skillName: "spec-debug",
    skillUsage: "Use when debugging implementation or runtime issues discovered during Spec execution or testing."
  },
  "spec-ender": {
    role: "spec-ender",
    responsibility: "Close the Spec, reflect reusable experience, update summary context, archive, and prepare Git submission.",
    skillName: "spec-end",
    skillUsage: "Use when the Spec is ready for closure, reflection, archive, and final Git workflow."
  }
};

export function roleDefinitionFor(role: AgentRole): RoleDefinition {
  return roleDefinitions[role];
}

function roleSkillRoutingTable(): string[] {
  return agentRoles.map(role => {
    const definition = roleDefinitionFor(role);
    return `- ${role} -> $${definition.skillName}: ${definition.skillUsage}`;
  });
}

export function roleSystemPrompt(role: AgentRole): string {
  const definition = roleDefinitionFor(role);
  return [
    `Role: ${definition.role}`,
    `Responsibility: ${definition.responsibility}`,
    `Required workflow skill: $${definition.skillName}`,
    `Usage rule: ${definition.skillUsage}`,
    "Use the installed skill by name. Do not hard-code or infer a local skill file path in the prompt.",
    "Before doing role-specific workflow work, activate and follow that Skill. Do not replace the Skill workflow with ad-hoc steps."
  ].join("\n");
}

export function buildRolePrompt(spec: SpecBinding, role: AgentRole, userPrompt: string): string {
  const definition = roleDefinitionFor(role);
  return [
    `You are ${role} in the R&K Flow Spec-driven Agent Team workflow.`,
    `Current Spec: ${spec.title}`,
    `Spec directory: ${spec.specDir}`,
    `Git branch: ${spec.gitBranch}`,
    "",
    "Role workflow contract:",
    `- Responsibility: ${definition.responsibility}`,
    `- Required workflow skill: $${definition.skillName}`,
    `- Usage rule: ${definition.skillUsage}`,
    "- Use the installed skill by name. Do not hard-code or infer a local skill file path in the prompt.",
    "- Before doing role-specific workflow work, activate and follow that Skill if it is not already in context.",
    "- Do not replace the required Skill workflow with ad-hoc steps.",
    "- If the user's request belongs to another AgentRole, do not perform it directly; route it through TeamBus.",
    "",
    "Role-to-skill routing table:",
    ...roleSkillRoutingTable(),
    "",
    "TeamBus protocol:",
    "When you need to communicate with another AgentRole, emit exactly one JSON fenced block with rkFlowTeamMessage.",
    "The extension will persist that block to team-chat.jsonl and audit-log.jsonl. Your current role is always used as from.",
    "Allowed to values: TeamLead, spec-explorer, spec-writer, spec-executor, spec-tester, spec-debugger, spec-ender, all.",
    "Allowed type values: handoff, question, blocker, review_request, phase_request, status.",
    "Every direct TeamBus message to an AgentRole is delivered to and consumed by that role.",
    "Use requiresResponse=true only when the target role must send a TeamBus reply after handling the message.",
    "Use requiresResponse=false when the target role should consume the message without replying on TeamBus.",
    "Avoid protocol blocks for normal user-facing replies.",
    "Example:",
    "```json",
    "{\"rkFlowTeamMessage\":{\"to\":\"spec-debugger\",\"type\":\"blocker\",\"subject\":\"Need debugging\",\"body\":\"Describe the blocker and evidence.\",\"artifacts\":[],\"requiresResponse\":true}}",
    "```",
    "",
    "Answer the user's message as this role. Keep the response concise and do not make file changes unless explicitly requested.",
    "",
    userPrompt
  ].join("\n");
}

export function buildTeamBusPrompt(spec: SpecBinding, role: AgentRole, message: TeamMessage): string {
  return buildRolePrompt(spec, role, [
    `You received a TeamBus message from ${message.from}.`,
    `Message type: ${message.type}`,
    `Subject: ${message.subject}`,
    `Body: ${message.body}`,
    `Artifacts: ${message.artifacts.length ? message.artifacts.join(", ") : "none"}`,
    "",
    message.requiresResponse
      ? `Respond as ${role}. This message requires a TeamBus reply to ${message.from}; emit rkFlowTeamMessage unless there is a hard blocker.`
      : `Respond as ${role}. Consume this message and update your private role context. Do not emit a TeamBus reply unless you discover a new blocker or handoff.`
  ].join("\n"));
}

