export interface SpecBinding {
  id: string;
  title: string;
  category: string;
  status: string;
  phase: string;
  specDir: string;
  specDirFsPath: string;
  planPathFsPath: string;
  gitBranch: string;
  baseBranch: string;
  prUrl?: string;
}
