export interface Cuboid {
  id: number;
  row: number;
  column: number;
  worldX: number;
  worldZ: number;
  baseHeight: number;
  currentHeight: number;
  targetHeight: number;
  initialScale: number;
  preFinalScale: number;
  targetScale: number;
  currentScale: number;
  horizontalScale?: number;
  propagationDelay: number;
  isLogo: boolean;
  logoType: number; // 0 = non-logo, 1 = white left stem, 2 = electric blue right stem/crossbar
  layerMetric: number; // Layered floor metric for architectural construction wave
  outerEdges?: number[]; // [left, right, top, bottom] outer boundary indicators (1 = outer edge, 0 = inner)
  offsetX?: number;
  offsetZ?: number;
  hasFinalLocking: boolean;
  startDelay: number;
  duration: number;
}

export type HoverMode = 'elevate' | 'ripple' | 'dent' | 'pulse';
export type ColorTheme = 'cyber-blue' | 'synthwave' | 'matrix-green' | 'amber-gold' | 'neon-purple' | 'ice-white';

export interface MatrixSettings {
  gridCols: number;
  gridRows: number;
  cubeSize: number;
  cubeGap: number;
}

export interface ShowcaseSubmission {
  id?: string;
  createdAt?: string;
  submittedAt?: string;

  // SECTION: TEAM
  teamName: string;
  teamMembers: string;
  organization: string;
  teamRepresentative: string;
  contactEmail: string;
  socialHandles?: string;

  // SECTION: PROJECT
  projectName: string;
  shortDescription: string;
  problemStatement: string;
  solutionApproach: string;
  techStack: string;

  // SECTION: PROJECT LINKS
  repositoryUrl?: string;
  prototypeUrl?: string;
  demoVideoUrl?: string;
  documentationUrl?: string;

  // SECTION: SHOWCASE
  consentGiven: boolean;
}

export type ShowcaseFormErrors = Partial<Record<keyof ShowcaseSubmission | 'form', string>>;

