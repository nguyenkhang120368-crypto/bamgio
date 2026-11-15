import { PersonalRecordItem, PuzzleType, Session, SessionStats, SolveRecord } from '../types/cube';
import { getEffectiveTimeMs } from './timeFormat';

/**
 * Calculates WCA Trimmed Average of N (drops 1 best and 1 worst).
 * If >= 2 DNFs are in the window, returns 'DNF'.
 */
export function calculateTrimmedAverage(windowSolves: SolveRecord[]): number | 'DNF' {
  if (windowSolves.length < 3) return 'DNF';
  const times = windowSolves.map(getEffectiveTimeMs);
  const dnfCount = times.filter((t) => t === null).length;
  if (dnfCount >= 2) return 'DNF';

  const numericValues = times.map((t) => (t === null ? Infinity : t)).sort((a, b) => a - b);
  const trimmed = numericValues.slice(1, numericValues.length - 1);
  const sum = trimmed.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / trimmed.length / 10) * 10;
}

/**
 * Calculates Best of N (Bo5 = fastest single solve inside the 5-solve window).
 */
export function calculateBestOfN(windowSolves: SolveRecord[]): number | 'DNF' {
  const valid = windowSolves
    .map(getEffectiveTimeMs)
    .filter((t): t is number => t !== null);
  if (valid.length === 0) return 'DNF';
  return Math.min(...valid);
}

/**
 * Calculates Mean of 3 (Mo3): if any DNF, returns 'DNF'.
 */
export function calculateMo3(windowSolves: SolveRecord[]): number | 'DNF' {
  if (windowSolves.length < 3) return 'DNF';
  const times = windowSolves.map(getEffectiveTimeMs);
  if (times.some((t) => t === null)) return 'DNF';
  const sum = (times as number[]).reduce((acc, v) => acc + v, 0);
  return Math.round(sum / 3 / 10) * 10;
}

function isBetterResult(
  candidate: number | 'DNF',
  currentBest: number | 'DNF' | null
): boolean {
  if (candidate === 'DNF') return false;
  if (currentBest === null || currentBest === 'DNF') return true;
  return candidate < currentBest;
}

export interface SolveTrendPoint {
  index: number;
  solve: SolveRecord;
  effectiveMs: number | null;
  ao5: number | 'DNF' | null;
  ao12: number | 'DNF' | null;
}

export function buildSolveTrend(solves: SolveRecord[]): SolveTrendPoint[] {
  // Solves are stored oldest-first or newest-first? We normalize chronological order by createdAt
  const ordered = [...solves].sort((a, b) => a.createdAt - b.createdAt);
  return ordered.map((solve, idx) => {
    const ao5 = idx >= 4 ? calculateTrimmedAverage(ordered.slice(idx - 4, idx + 1)) : null;
    const ao12 = idx >= 11 ? calculateTrimmedAverage(ordered.slice(idx - 11, idx + 1)) : null;
    return {
      index: idx + 1,
      solve,
      effectiveMs: getEffectiveTimeMs(solve),
      ao5,
      ao12,
    };
  });
}

export function computeSessionStats(solves: SolveRecord[]): SessionStats {
  const ordered = [...solves].sort((a, b) => a.createdAt - b.createdAt);
  const count = ordered.length;

  if (count === 0) {
    return {
      count: 0,
      validCount: 0,
      dnfCount: 0,
      plusTwoCount: 0,
      currentSingle: null,
      bestSingle: null,
      currentBo5: null,
      bestBo5: null,
      currentAo5: null,
      bestAo5: null,
      currentAo12: null,
      bestAo12: null,
      currentMo3: null,
      bestMo3: null,
      sessionMean: null,
      stdDev: null,
    };
  }

  let validCount = 0;
  let dnfCount = 0;
  let plusTwoCount = 0;
  const validTimes: number[] = [];

  let bestSingle: number | 'DNF' | null = null;
  let bestBo5: number | 'DNF' | null = null;
  let bestAo5: number | 'DNF' | null = null;
  let bestAo12: number | 'DNF' | null = null;
  let bestMo3: number | 'DNF' | null = null;

  for (let i = 0; i < count; i++) {
    const s = ordered[i];
    if (s.penalty === '+2') plusTwoCount++;
    const t = getEffectiveTimeMs(s);
    if (t === null) {
      dnfCount++;
      if (bestSingle === null) bestSingle = 'DNF';
    } else {
      validCount++;
      validTimes.push(t);
      if (isBetterResult(t, bestSingle)) bestSingle = t;
    }

    if (i >= 2) {
      const mo3 = calculateMo3(ordered.slice(i - 2, i + 1));
      if (bestMo3 === null || isBetterResult(mo3, bestMo3)) {
        if (mo3 !== 'DNF' || bestMo3 === null) bestMo3 = mo3;
      }
    }

    if (i >= 4) {
      const w5 = ordered.slice(i - 4, i + 1);
      const bo5 = calculateBestOfN(w5);
      const ao5 = calculateTrimmedAverage(w5);
      if (bestBo5 === null || isBetterResult(bo5, bestBo5)) {
        if (bo5 !== 'DNF' || bestBo5 === null) bestBo5 = bo5;
      }
      if (bestAo5 === null || isBetterResult(ao5, bestAo5)) {
        if (ao5 !== 'DNF' || bestAo5 === null) bestAo5 = ao5;
      }
    }

    if (i >= 11) {
      const ao12 = calculateTrimmedAverage(ordered.slice(i - 11, i + 1));
      if (bestAo12 === null || isBetterResult(ao12, bestAo12)) {
        if (ao12 !== 'DNF' || bestAo12 === null) bestAo12 = ao12;
      }
    }
  }

  const latestSolve = ordered[count - 1];
  const latestEff = getEffectiveTimeMs(latestSolve);
  const currentSingle: number | 'DNF' = latestEff === null ? 'DNF' : latestEff;
  const currentMo3 = count >= 3 ? calculateMo3(ordered.slice(count - 3)) : null;
  const currentBo5 = count >= 5 ? calculateBestOfN(ordered.slice(count - 5)) : null;
  const currentAo5 = count >= 5 ? calculateTrimmedAverage(ordered.slice(count - 5)) : null;
  const currentAo12 = count >= 12 ? calculateTrimmedAverage(ordered.slice(count - 12)) : null;

  let sessionMean: number | 'DNF' | null = null;
  let stdDev: number | null = null;

  if (validTimes.length > 0) {
    const meanRaw = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
    sessionMean = Math.round(meanRaw / 10) * 10;
    const variance =
      validTimes.reduce((acc, v) => acc + Math.pow(v - meanRaw, 2), 0) / validTimes.length;
    stdDev = Math.round(Math.sqrt(variance) / 10) * 10;
  } else {
    sessionMean = 'DNF';
  }

  return {
    count,
    validCount,
    dnfCount,
    plusTwoCount,
    currentSingle,
    bestSingle,
    currentBo5,
    bestBo5,
    currentAo5,
    bestAo5,
    currentAo12,
    bestAo12,
    currentMo3,
    bestMo3,
    sessionMean,
    stdDev,
  };
}

export function computePersonalRecords(sessions: Session[]): PersonalRecordItem[] {
  const puzzles: PuzzleType[] = ['3x3', '2x2', '4x4', '5x5', 'pyraminx', 'skewb'];

  return puzzles
    .map((puzzle) => {
      const matchingSessions = sessions.filter((s) => s.puzzle === puzzle);
      let bestSingle: PersonalRecordItem['bestSingle'] = null;
      let bestBo5: PersonalRecordItem['bestBo5'] = null;
      let bestAo5: PersonalRecordItem['bestAo5'] = null;
      let bestAo12: PersonalRecordItem['bestAo12'] = null;
      let bestMo3: PersonalRecordItem['bestMo3'] = null;
      let totalSolves = 0;

      for (const sess of matchingSessions) {
        const ordered = [...sess.solves].sort((a, b) => a.createdAt - b.createdAt);
        totalSolves += ordered.length;

        for (let i = 0; i < ordered.length; i++) {
          const solve = ordered[i];
          const t = getEffectiveTimeMs(solve);
          if (t !== null && (!bestSingle || t < bestSingle.value)) {
            bestSingle = { value: t, solve, sessionName: sess.name };
          }

          if (i >= 2) {
            const mo3 = calculateMo3(ordered.slice(i - 2, i + 1));
            if (mo3 !== 'DNF' && (!bestMo3 || mo3 < bestMo3.value)) {
              bestMo3 = { value: mo3, sessionName: sess.name, at: solve.createdAt };
            }
          }

          if (i >= 4) {
            const w5 = ordered.slice(i - 4, i + 1);
            const bo5 = calculateBestOfN(w5);
            const ao5 = calculateTrimmedAverage(w5);
            if (bo5 !== 'DNF' && (!bestBo5 || bo5 < bestBo5.value)) {
              bestBo5 = { value: bo5, sessionName: sess.name, at: solve.createdAt };
            }
            if (ao5 !== 'DNF' && (!bestAo5 || ao5 < bestAo5.value)) {
              bestAo5 = { value: ao5, sessionName: sess.name, at: solve.createdAt };
            }
          }

          if (i >= 11) {
            const ao12 = calculateTrimmedAverage(ordered.slice(i - 11, i + 1));
            if (ao12 !== 'DNF' && (!bestAo12 || ao12 < bestAo12.value)) {
              bestAo12 = { value: ao12, sessionName: sess.name, at: solve.createdAt };
            }
          }
        }
      }

      return {
        puzzle,
        bestSingle,
        bestBo5,
        bestAo5,
        bestAo12,
        bestMo3,
        totalSolves,
      };
    })
    .filter((item) => item.totalSolves > 0 || item.puzzle === '3x3');
}
