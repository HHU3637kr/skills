export type SpecLifecycle = "active" | "archived";
export type SpecHealth = "complete" | "incomplete";

export interface SpecBinding {
  id: string;
  title: string;
  category: string;
  lifecycle: SpecLifecycle;
  health: SpecHealth;
  missingFiles: string[];
  status: string;
  phase: string;
  specDir: string;
  specDirFsPath: string;
  planPathFsPath?: string;
  gitBranch: string;
  baseBranch: string;
  prUrl?: string;
}
