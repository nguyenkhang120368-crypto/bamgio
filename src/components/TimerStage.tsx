import { Check, Copy, Edit3, Keyboard, RefreshCw, Timer, Trash2, Volume2, VolumeX } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Penalty, PuzzleType, SolveRecord, ThemeSettings } from '../types/cube';
import { PUZZLE_LABELS } from '../utils/scrambleGenerator';
import { playInspectionCue } from '../utils/sound';
import { formatSolve, formatTimeMs, parseManualTimeInput } from '../utils/timeFormat';
import { ScrambleNet } from './ScrambleNet';

export type TimerPhase = 'idle' | 'inspection' | 'holding' | 'ready' | 'running';

interface TimerStageProps {
  puzzle: PuzzleType;
  scramble: string;
  theme: ThemeSettings;
  latestSolve: SolveRecord | null;
  newRecordBadges: string[];
  phase: TimerPhase;
  onPhaseChange: (phase: TimerPhase) => void;
  onChangePuzzle: (puzzle: PuzzleType) => void;
  onNextScramble: () => void;
  onSetCustomScramble: (scramble: string) => void;
  onFinishSolve: (timeMs: number, autoPenalty: Penalty) => void;
  onApplyPenaltyLatest: (penalty: Penalty) => void;
  onDeleteLatest: () => void;
  onToggleInspection: () => void;
  modalOpen: boolean;
}

const PUZZLE_OPTIONS: PuzzleType[] = ['3x3', '2x2', '4x4', '5x5', 'pyraminx', 'skewb'];

export function TimerStage({
  puzzle,
  scramble,
  theme,
  latestSolve,
  newRecordBadges,
  phase,
  onPhaseChange,
  onChangePuzzle,
  onNextScramble,
  onSetCustomScramble,
  onFinishSolve,
  onApplyPenaltyLatest,
  onDeleteLatest,
  onToggleInspection,
  modalOpen,
}: TimerStageProps) {
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [inspectionSec, setInspectionSec] = useState<number>(15);
  const [inspectionPenalty, setInspectionPenalty] = useState<Penalty>('none');
  const [copiedScramble, setCopiedScramble] = useState(false);
  const [editingScramble, setEditingScramble] = useState(false);
  const [customScrambleInput, setCustomScrambleInput] = useState(scramble);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');

  const phaseRef = useRef<TimerPhase>(phase);
  phaseRef.current = phase;

  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const holdTimeoutRef = useRef<number | null>(null);
  const inspectionStartRef = useRef<number>(0);
  const inspectionIntervalRef = useRef<number | null>(null);
  const inspectionPenaltyRef = useRef<Penalty>('none');
  const cuesPlayedRef = useRef<{ eight: boolean; twelve: boolean; fifteen: boolean }>({
    eight: false,
    twelve: false,
    fifteen: false,
  });
  const ignoreNextKeyUpRef = useRef(false);

  useEffect(() => {
    setCustomScrambleInput(scramble);
  }, [scramble]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }, []);

  const clearInspectionTimer = useCallback(() => {
    if (inspectionIntervalRef.current !== null) {
      window.clearInterval(inspectionIntervalRef.current);
      inspectionIntervalRef.current = null;
    }
  }, []);

  const startInspection = useCallback(() => {
    clearInspectionTimer();
    inspectionStartRef.current = performance.now();
    setInspectionSec(15);
    setInspectionPenalty('none');
    inspectionPenaltyRef.current = 'none';
    cuesPlayedRef.current = { eight: false, twelve: false, fifteen: false };
    onPhaseChange('inspection');

    inspectionIntervalRef.current = window.setInterval(() => {
      const elapsedSec = (performance.now() - inspectionStartRef.current) / 1000;
      const remaining = Math.ceil(15 - elapsedSec);
      setInspectionSec(remaining);

      if (elapsedSec >= 8 && !cuesPlayedRef.current.eight) {
        cuesPlayedRef.current.eight = true;
        if (theme.inspectionAudio) playInspectionCue(8);
      }
      if (elapsedSec >= 12 && !cuesPlayedRef.current.twelve) {
        cuesPlayedRef.current.twelve = true;
        if (theme.inspectionAudio) playInspectionCue(12);
      }
      if (elapsedSec >= 15 && elapsedSec < 17) {
        if (!cuesPlayedRef.current.fifteen) {
          cuesPlayedRef.current.fifteen = true;
          if (theme.inspectionAudio) playInspectionCue(15);
        }
        setInspectionPenalty('+2');
        inspectionPenaltyRef.current = '+2';
      } else if (elapsedSec >= 17) {
        setInspectionPenalty('DNF');
        inspectionPenaltyRef.current = 'DNF';
        clearInspectionTimer();
        onPhaseChange('idle');
        onFinishSolve(0, 'DNF');
      }
    }, 80);
  }, [clearInspectionTimer, onFinishSolve, onPhaseChange, theme.inspectionAudio]);

  const startRunning = useCallback(() => {
    clearHoldTimer();
    clearInspectionTimer();
    startTimeRef.current = performance.now();
    setElapsedMs(0);
    onPhaseChange('running');

    const tick = () => {
      if (phaseRef.current !== 'running') return;
      setElapsedMs(performance.now() - startTimeRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [clearHoldTimer, clearInspectionTimer, onPhaseChange]);

  const stopRunning = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const finalMs = performance.now() - startTimeRef.current;
    setElapsedMs(finalMs);
    onPhaseChange('idle');
    onFinishSolve(finalMs, inspectionPenaltyRef.current);
    inspectionPenaltyRef.current = 'none';
    setInspectionPenalty('none');
  }, [onFinishSolve, onPhaseChange]);

  const beginHold = useCallback(() => {
    if (phaseRef.current === 'holding' || phaseRef.current === 'ready') return;

    if (theme.useInspection && phaseRef.current === 'idle') {
      // First Space press enters 15s inspection; holding during inspection starts solve
      startInspection();
      ignoreNextKeyUpRef.current = true;
      return;
    }

    if (theme.holdToStartMs === 0) {
      onPhaseChange('ready');
      return;
    }

    onPhaseChange('holding');
    clearHoldTimer();
    holdTimeoutRef.current = window.setTimeout(() => {
      if (phaseRef.current === 'holding') {
        onPhaseChange('ready');
      }
    }, theme.holdToStartMs);
  }, [clearHoldTimer, onPhaseChange, startInspection, theme.holdToStartMs, theme.useInspection]);

  const releaseHold = useCallback(() => {
    if (ignoreNextKeyUpRef.current) {
      ignoreNextKeyUpRef.current = false;
      return;
    }
    clearHoldTimer();
    if (phaseRef.current === 'ready') {
      startRunning();
    } else if (phaseRef.current === 'holding') {
      onPhaseChange(theme.useInspection && inspectionIntervalRef.current ? 'inspection' : 'idle');
    }
  }, [clearHoldTimer, onPhaseChange, startRunning, theme.useInspection]);

  // Keyboard listener (Spacebar to arm/start, any key to stop)
  useEffect(() => {
    const isInputFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalOpen || manualMode || editingScramble || isInputFocused()) return;

      if (phaseRef.current === 'running') {
        e.preventDefault();
        stopRunning();
        ignoreNextKeyUpRef.current = true;
        return;
      }

      if (e.code === 'Escape' && phaseRef.current === 'inspection') {
        e.preventDefault();
        clearInspectionTimer();
        setInspectionPenalty('none');
        inspectionPenaltyRef.current = 'none';
        onPhaseChange('idle');
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;
        beginHold();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (modalOpen || manualMode || editingScramble || isInputFocused()) return;
      if (e.code === 'Space') {
        e.preventDefault();
        releaseHold();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    beginHold,
    clearInspectionTimer,
    editingScramble,
    manualMode,
    modalOpen,
    onPhaseChange,
    releaseHold,
    stopRunning,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearHoldTimer();
      clearInspectionTimer();
    };
  }, [clearHoldTimer, clearInspectionTimer]);

  const handlePointerDown = () => {
    if (manualMode || editingScramble || modalOpen) return;
    if (phaseRef.current === 'running') {
      stopRunning();
      return;
    }
    beginHold();
  };

  const handlePointerUp = () => {
    if (manualMode || editingScramble || modalOpen) return;
    releaseHold();
  };

  const handleCopyScramble = async () => {
    try {
      await navigator.clipboard.writeText(scramble);
      setCopiedScramble(true);
      setTimeout(() => setCopiedScramble(false), 1500);
    } catch {
      // Ignore
    }
  };

  const handleScrambleSave = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = customScrambleInput.trim();
    if (cleaned) {
      onSetCustomScramble(cleaned);
    }
    setEditingScramble(false);
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseManualTimeInput(manualInput);
    if (parsed === null) {
      setManualError('Định dạng chưa đúng (ví dụ: 12.48 hoặc 1:04.23 hoặc 1248)');
      return;
    }
    setManualError('');
    setManualInput('');
    onFinishSolve(parsed, 'none');
  };

  const isTimingFocus = phase === 'running' && theme.hideUiWhileTiming;

  // Determine main readout text and color
  let readoutText = '0.00';
  let readoutColor = theme.timerColor;

  if (phase === 'holding') {
    readoutText = formatTimeMs(elapsedMs || 0);
    readoutColor = '#F59E0B';
  } else if (phase === 'ready') {
    readoutText = '0.00';
    readoutColor = '#10B981';
  } else if (phase === 'running') {
    readoutText = formatTimeMs(elapsedMs);
    readoutColor = theme.timerColor;
  } else if (phase === 'inspection') {
    if (inspectionPenalty === '+2') {
      readoutText = '+2';
      readoutColor = '#F59E0B';
    } else {
      readoutText = String(Math.max(0, inspectionSec));
      readoutColor = inspectionSec <= 3 ? '#F43F5E' : inspectionSec <= 7 ? '#F59E0B' : '#F8FAFC';
    }
  } else if (latestSolve) {
    readoutText = formatSolve(latestSolve);
    readoutColor =
      latestSolve.penalty === 'DNF'
        ? '#F87171'
        : latestSolve.penalty === '+2'
        ? '#FBBF24'
        : theme.timerColor;
  }

  return (
    <section className="flex h-full flex-col justify-between gap-4">
      {/* Top Scramble Console */}
      <div
        className={`cosmic-panel rounded-xl border p-4 transition-opacity duration-200 ${
          isTimingFocus ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          {/* Puzzle selector segmented buttons */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-black/35 p-1">
            {PUZZLE_OPTIONS.map((p) => {
              const active = puzzle === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChangePuzzle(p)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  style={active ? { backgroundColor: 'var(--accent-color)' } : undefined}
                >
                  {PUZZLE_LABELS[p]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleInspection}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                theme.useInspection
                  ? 'border-transparent text-slate-950 font-semibold'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
              style={theme.useInspection ? { backgroundColor: 'var(--accent-color)' } : undefined}
              title="Bật/tắt 15 giây quan sát WCA"
            >
              {theme.inspectionAudio ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span>Quan sát 15s</span>
            </button>

            <button
              type="button"
              onClick={() => setManualMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                manualMode
                  ? 'border-transparent text-slate-950 font-semibold'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
              style={manualMode ? { backgroundColor: 'var(--accent-color)' } : undefined}
            >
              {manualMode ? <Timer className="h-3.5 w-3.5" /> : <Keyboard className="h-3.5 w-3.5" />}
              <span>{manualMode ? 'Dùng Space' : 'Nhập tay'}</span>
            </button>
          </div>
        </div>

        {/* Scramble String Area */}
        <div className="mt-3 flex flex-col items-center gap-2 text-center">
          {editingScramble ? (
            <form onSubmit={handleScrambleSave} className="flex w-full max-w-2xl items-center gap-2">
              <input
                type="text"
                value={customScrambleInput}
                onChange={(e) => setCustomScrambleInput(e.target.value)}
                autoFocus
                className="font-mono-tabular flex-1 rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                placeholder="Nhập công thức scramble..."
              />
              <button
                type="submit"
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-950 whitespace-nowrap"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                Áp dụng
              </button>
              <button
                type="button"
                onClick={() => setEditingScramble(false)}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
              >
                Hủy
              </button>
            </form>
          ) : (
            <p className="font-mono-tabular max-w-3xl text-lg font-medium leading-relaxed tracking-wide text-slate-100 sm:text-xl md:text-2xl">
              {scramble}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={onNextScramble}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Scramble mới</span>
            </button>
            <button
              type="button"
              onClick={handleCopyScramble}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors hover:bg-white/10 hover:text-white"
            >
              {copiedScramble ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copiedScramble ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditingScramble(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Sửa scramble</span>
            </button>
          </div>
        </div>
      </div>

      {/* Center Cosmic Timer Stage */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          clearHoldTimer();
          if (phaseRef.current === 'holding') onPhaseChange('idle');
        }}
        className="relative flex flex-1 min-h-[260px] select-none flex-col items-center justify-center rounded-2xl px-4 py-8 text-center touch-none cursor-pointer"
      >
        {manualMode ? (
          <form
            onSubmit={handleManualSubmit}
            onPointerDown={(e) => e.stopPropagation()}
            className="cosmic-panel w-full max-w-md rounded-xl border p-6"
          >
            <label htmlFor="manual-time-input" className="block text-sm font-medium text-slate-300">
              Nhập thời gian thủ công (hỗ trợ 12.48, 1:04.23 hoặc 1248)
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="manual-time-input"
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="12.48"
                autoFocus
                className="font-mono-tabular w-full rounded-lg border border-white/20 bg-black/50 px-4 py-3 text-center text-2xl font-bold text-white focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg px-5 py-3 text-sm font-semibold text-slate-950 whitespace-nowrap"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                Lưu
              </button>
            </div>
            {manualError && <p className="mt-2 text-xs text-rose-400">{manualError}</p>}
          </form>
        ) : (
          <>
            {/* Status instruction line */}
            <div className="mb-2 h-6 text-xs font-medium tracking-wide">
              {phase === 'holding' && (
                <span className="text-amber-400">Đang giữ... chờ tín hiệu xanh</span>
              )}
              {phase === 'ready' && (
                <span className="text-emerald-400">Sẵn sàng — thả ra để bắt đầu</span>
              )}
              {phase === 'inspection' && (
                <span className="text-slate-300">
                  Đang quan sát (15s WCA) · Giữ Space hoặc chạm để bắt đầu giải
                </span>
              )}
              {phase === 'idle' && (
                <span className="text-slate-400">
                  Giữ phím Space hoặc chạm giữ vùng đồng hồ để chuẩn bị
                </span>
              )}
            </div>

            {/* Giant Precision Timer Digits */}
            <div
              className="font-mono-tabular font-bold leading-none tracking-tight transition-colors duration-100"
              style={{
                fontSize: 'clamp(4.25rem, 12vw, 9.25rem)',
                color: readoutColor,
                textShadow: '0 8px 36px rgba(0, 0, 0, 0.65)',
              }}
            >
              {readoutText}
            </div>

            {/* New PB Notification Line */}
            {phase === 'idle' && newRecordBadges.length > 0 && (
              <p
                className="mt-3 text-sm font-semibold"
                style={{ color: 'var(--accent-color)' }}
              >
                Kỷ lục cá nhân mới · {newRecordBadges.join(' · ')}
              </p>
            )}

            {/* Quick Penalty & Delete Controls for Latest Solve */}
            {phase === 'idle' && latestSolve && (
              <div
                className="mt-5 flex items-center gap-2"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() =>
                    onApplyPenaltyLatest(latestSolve.penalty === '+2' ? 'none' : '+2')
                  }
                  className={`rounded-lg border px-3.5 py-1.5 font-mono-tabular text-xs font-semibold transition-colors ${
                    latestSolve.penalty === '+2'
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-white/15 bg-black/40 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  +2
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onApplyPenaltyLatest(latestSolve.penalty === 'DNF' ? 'none' : 'DNF')
                  }
                  className={`rounded-lg border px-3.5 py-1.5 font-mono-tabular text-xs font-semibold transition-colors ${
                    latestSolve.penalty === 'DNF'
                      ? 'border-rose-400 bg-rose-400 text-slate-950'
                      : 'border-white/15 bg-black/40 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  DNF
                </button>
                <button
                  type="button"
                  onClick={onDeleteLatest}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Cube Net & Telemetry Footer */}
      <div
        className={`cosmic-panel flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-opacity duration-200 ${
          isTimingFocus ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="space-y-1 text-xs text-slate-400">
          <p className="font-medium text-slate-200">Mô phỏng trạng thái Rubik ({PUZZLE_LABELS[puzzle]})</p>
          <p>Chuẩn WCA: Mặt trên Trắng · Mặt trước Xanh lá</p>
          <p className="text-[11px] text-slate-500">
            Phím tắt: Space bắt đầu/dừng · Nhấp vào lần giải bên trái để xem chi tiết
          </p>
        </div>

        <div className="flex items-center justify-center rounded-lg bg-black/35 px-3 py-2">
          <ScrambleNet puzzle={puzzle} scramble={scramble} size="compact" />
        </div>
      </div>
    </section>
  );
}
