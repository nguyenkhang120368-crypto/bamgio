import { Check, Copy, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Penalty, SolveRecord } from '../types/cube';
import { PUZZLE_LABELS } from '../utils/scrambleGenerator';
import { formatSolve, formatTimeMs } from '../utils/timeFormat';
import { ScrambleNet } from './ScrambleNet';

interface SolveDetailModalProps {
  solve: SolveRecord | null;
  solveNumber?: number;
  onClose: () => void;
  onChangePenalty: (id: string, penalty: Penalty) => void;
  onUpdateNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

export function SolveDetailModal({
  solve,
  solveNumber,
  onClose,
  onChangePenalty,
  onUpdateNote,
  onDelete,
}: SolveDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!solve) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(solve.scramble);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(solve.createdAt));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="solve-detail-title"
    >
      <div
        className="cosmic-panel w-full max-w-lg rounded-xl border p-6 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs text-slate-400">
              {PUZZLE_LABELS[solve.puzzle]} · Lần giải #{solveNumber ?? '—'} · {formattedDate}
            </p>
            <h2
              id="solve-detail-title"
              className="font-mono-tabular mt-1 text-4xl font-bold tracking-tight"
              style={{ color: solve.penalty === 'DNF' ? '#F87171' : 'var(--timer-color)' }}
            >
              {formatSolve(solve)}
            </h2>
            {solve.penalty === '+2' && (
              <p className="font-mono-tabular mt-1 text-xs text-amber-400">
                Thời gian gốc: {formatTimeMs(solve.timeMs)} (+2.00s phạt)
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            aria-label="Đóng chi tiết"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <span className="mb-2 block text-xs font-medium text-slate-400">Trạng thái phạt</span>
            <div className="grid grid-cols-3 gap-2">
              {(['none', '+2', 'DNF'] as Penalty[]).map((p) => {
                const active = solve.penalty === p;
                const label = p === 'none' ? 'Hợp lệ' : p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChangePenalty(solve.id, p)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'border-transparent text-slate-950 font-semibold'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor:
                              p === 'DNF' ? '#F87171' : p === '+2' ? '#F59E0B' : 'var(--accent-color)',
                          }
                        : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Scramble</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
            <p className="font-mono-tabular rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-relaxed text-slate-200">
              {solve.scramble}
            </p>
          </div>

          <div className="flex justify-center rounded-lg border border-white/10 bg-black/25 py-4">
            <ScrambleNet puzzle={solve.puzzle} scramble={solve.scramble} size="large" />
          </div>

          <div>
            <label htmlFor="solve-note" className="mb-1.5 block text-xs font-medium text-slate-400">
              Ghi chú (tùy chọn)
            </label>
            <input
              id="solve-note"
              type="text"
              value={solve.note ?? ''}
              onChange={(e) => onUpdateNote(solve.id, e.target.value)}
              placeholder="Ví dụ: PLL skip, F2L mượt, khóa tay..."
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => {
              onDelete(solve.id);
              onClose();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            <span>Xóa lần giải</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
