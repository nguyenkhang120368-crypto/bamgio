export type PuzzleType = '3x3' | '2x2' | '4x4' | '5x5' | 'pyraminx' | 'skewb';

export type Penalty = 'none' | '+2' | 'DNF';

export interface SolveRecord {
  id: string;
  sessionId: string;
  puzzle: PuzzleType;
  timeMs: number; // Raw elapsed time in ms
  penalty: Penalty;
  scramble: string;
  createdAt: number;
  note?: string;
}

export interface Session {
  id: string;
  name: string;
  puzzle: PuzzleType;
  createdAt: number;
  solves: SolveRecord[];
}

export type CosmicBackdropId = 'nebula' | 'galactic' | 'horizon' | 'void';

export interface ThemeSettings {
  backdrop: CosmicBackdropId;
  backdropDim: number; // 20 - 85 (%)
  starfieldEnabled: boolean;
  accentColor: string;
  timerColor: string;
  surfaceTint: 'obsidian' | 'midnight' | 'slate';
  surfaceOpacity: number; // 50 - 95 (%)
  holdToStartMs: number; // 0, 200, 300, 500
  useInspection: boolean;
  inspectionAudio: boolean;
  hideUiWhileTiming: boolean;
}

export interface SessionStats {
  count: number;
  validCount: number;
  dnfCount: number;
  plusTwoCount: number;
  currentSingle: number | 'DNF' | null;
  bestSingle: number | 'DNF' | null;
  currentBo5: number | 'DNF' | null;
  bestBo5: number | 'DNF' | null;
  currentAo5: number | 'DNF' | null;
  bestAo5: number | 'DNF' | null;
  currentAo12: number | 'DNF' | null;
  bestAo12: number | 'DNF' | null;
  currentMo3: number | 'DNF' | null;
  bestMo3: number | 'DNF' | null;
  sessionMean: number | 'DNF' | null;
  stdDev: number | null;
}

export interface PersonalRecordItem {
  puzzle: PuzzleType;
  bestSingle: { value: number; solve: SolveRecord; sessionName: string } | null;
  bestBo5: { value: number; sessionName: string; at: number } | null;
  bestAo5: { value: number; sessionName: string; at: number } | null;
  bestAo12: { value: number; sessionName: string; at: number } | null;
  bestMo3: { value: number; sessionName: string; at: number } | null;
  totalSolves: number;
}
