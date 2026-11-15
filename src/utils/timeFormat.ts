import { Penalty, SolveRecord } from '../types/cube';

/**
 * Truncate/round raw ms to centiseconds (2 decimal places) per WCA 0.01s display precision.
 */
export function toCentisecondMs(ms: number): number {
  return Math.floor(Math.max(0, ms) / 10) * 10;
}

/**
 * Returns effective solve duration in ms (centisecond-aligned), or null if DNF.
 */
export function getEffectiveTimeMs(solve: Pick<SolveRecord, 'timeMs' | 'penalty'>): number | null {
  if (solve.penalty === 'DNF') return null;
  const base = toCentisecondMs(solve.timeMs);
  return solve.penalty === '+2' ? base + 2000 : base;
}

/**
 * Formats milliseconds to always show 2 decimal places (e.g. "0.00", "12.48", "1:04.23").
 */
export function formatTimeMs(
  ms: number | 'DNF' | null | undefined,
  options?: { penalty?: Penalty; showPlus?: boolean }
): string {
  if (ms === null || ms === undefined) return '—';
  if (ms === 'DNF') return 'DNF';

  const safeMs = Math.max(0, ms);
  const totalCentis = Math.floor(safeMs / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const cc = centis.toString().padStart(2, '0');
  let formatted = '';

  if (hours > 0) {
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    formatted = `${hours}:${mm}:${ss}.${cc}`;
  } else if (totalMinutes > 0) {
    const ss = seconds.toString().padStart(2, '0');
    formatted = `${totalMinutes}:${ss}.${cc}`;
  } else {
    formatted = `${seconds}.${cc}`;
  }

  if (options?.showPlus && options.penalty === '+2') {
    return `${formatted}+`;
  }
  return formatted;
}

export function formatSolve(solve: SolveRecord): string {
  if (solve.penalty === 'DNF') return 'DNF';
  const effective = getEffectiveTimeMs(solve);
  return formatTimeMs(effective, { penalty: solve.penalty, showPlus: true });
}

/**
 * Parses manual time input such as "12.48", "1248", "1:04.23", "10423" into milliseconds.
 */
export function parseManualTimeInput(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!cleaned) return null;

  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length !== 2) return null;
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    if (Number.isNaN(mins) || Number.isNaN(secs) || mins < 0 || secs < 0 || secs >= 60) {
      return null;
    }
    return Math.round((mins * 60 + secs) * 1000);
  }

  if (cleaned.includes('.')) {
    const secs = parseFloat(cleaned);
    if (Number.isNaN(secs) || secs <= 0) return null;
    return Math.round(secs * 1000);
  }

  // Digits only: treat last 2 digits as centiseconds (Stackmat style: 1248 -> 12.48s)
  if (/^\d+$/.test(cleaned)) {
    const num = parseInt(cleaned, 10);
    if (num <= 0) return null;
    if (cleaned.length <= 2) {
      return num * 1000;
    }
    const centis = num % 100;
    const rest = Math.floor(num / 100);
    const secs = rest % 100;
    const mins = Math.floor(rest / 100);
    if (secs >= 60) {
      return Math.round((num / 100) * 1000);
    }
    return (mins * 60 + secs) * 1000 + centis * 10;
  }

  return null;
}
