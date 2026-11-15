import { Plus, Trash2 } from 'lucide-react';
import { Session, SessionStats, SolveRecord } from '../types/cube';
import { calculateTrimmedAverage } from '../utils/cubeStats';
import { PUZZLE_LABELS } from '../utils/scrambleGenerator';
import { formatSolve, formatTimeMs } from '../utils/timeFormat';

interface StatsSidebarProps {
  sessions: Session[];
  activeSession: Session;
  stats: SessionStats;
  onSelectSession: (id: string) => void;
  onQuickCreateSession: () => void;
  onSelectSolve: (solve: SolveRecord, numberInSession: number) => void;
  onClearSessionSolves: () => void;
  dimmed: boolean;
}

export function StatsSidebar({
  sessions,
  activeSession,
  stats,
  onSelectSession,
  onQuickCreateSession,
  onSelectSolve,
  onClearSessionSolves,
  dimmed,
}: StatsSidebarProps) {
  const orderedChrono = [...activeSession.solves].sort((a, b) => a.createdAt - b.createdAt);
  const newestFirst = [...orderedChrono].reverse();

  // Precompute Ao5 for each chronological index
  const ao5BySolveId = new Map<string, number | 'DNF'>();
  for (let i = 4; i < orderedChrono.length; i++) {
    ao5BySolveId.set(
      orderedChrono[i].id,
      calculateTrimmedAverage(orderedChrono.slice(i - 4, i + 1))
    );
  }

  const statRows: {
    label: string;
    current: number | 'DNF' | null;
    best: number | 'DNF' | null;
    highlight?: boolean;
  }[] = [
    { label: 'Đơn', current: stats.currentSingle, best: stats.bestSingle },
    { label: 'Bo5', current: stats.currentBo5, best: stats.bestBo5 },
    { label: 'Ao5', current: stats.currentAo5, best: stats.bestAo5, highlight: true },
    { label: 'Ao12', current: stats.currentAo12, best: stats.bestAo12, highlight: true },
    { label: 'Mo3', current: stats.currentMo3, best: stats.bestMo3 },
  ];

  return (
    <aside
      className={`cosmic-panel flex h-full flex-col rounded-xl border transition-opacity duration-200 ${
        dimmed ? 'pointer-events-none opacity-15' : 'opacity-100'
      }`}
    >
      {/* Session Selector Header */}
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="session-select" className="text-xs font-medium text-slate-400">
            Phiên giải hiện tại
          </label>
          <button
            type="button"
            onClick={onQuickCreateSession}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Phiên mới</span>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <select
            id="session-select"
            value={activeSession.id}
            onChange={(e) => onSelectSession(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm font-medium text-slate-100 focus:border-cyan-400 focus:outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                {s.name} ({PUZZLE_LABELS[s.puzzle]} · {s.solves.length})
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            Loại: <strong className="font-medium text-slate-200">{PUZZLE_LABELS[activeSession.puzzle]}</strong>
          </span>
          <span className="font-mono-tabular">
            {stats.validCount}/{stats.count} hợp lệ
          </span>
        </div>
      </div>

      {/* WCA Metrics Table (Ao5, Bo5, Ao12, Mean, PB) */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="mb-2 grid grid-cols-3 text-[11px] font-medium text-slate-400">
          <span>Chỉ số</span>
          <span className="text-right">Hiện tại</span>
          <span className="text-right">Kỷ lục phiên</span>
        </div>
        <div className="divide-y divide-white/5">
          {statRows.map((row) => (
            <div key={row.label} className="grid grid-cols-3 items-center py-1.5 text-sm">
              <span className={row.highlight ? 'font-semibold text-slate-100' : 'text-slate-300'}>
                {row.label}
              </span>
              <span
                className="font-mono-tabular text-right font-medium"
                style={{
                  color:
                    row.current === 'DNF'
                      ? '#F87171'
                      : row.highlight && row.current !== null
                      ? 'var(--accent-color)'
                      : '#F1F5F9',
                }}
              >
                {formatTimeMs(row.current)}
              </span>
              <span className="font-mono-tabular text-right font-medium text-slate-200">
                {formatTimeMs(row.best)}
              </span>
            </div>
          ))}
        </div>

        {/* Mean & StdDev summary strip */}
        <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
          <div>
            <span className="text-slate-400">Mean: </span>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {formatTimeMs(stats.sessionMean)}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Độ lệch σ: </span>
            <span className="font-mono-tabular font-medium text-slate-300">
              {stats.stdDev !== null ? formatTimeMs(stats.stdDev) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Solve History List */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <h3 className="text-xs font-semibold text-slate-300">
            Thời gian các lần giải ({activeSession.solves.length})
          </h3>
          {activeSession.solves.length > 0 && (
            <button
              type="button"
              onClick={onClearSessionSolves}
              className="inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-rose-400"
              title="Xóa toàn bộ lần giải trong phiên này"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Xóa hết</span>
            </button>
          )}
        </div>

        {newestFirst.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
            <p className="text-sm font-medium text-slate-300">Chưa có lần giải nào</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Nhấn giữ phím Space hoặc chạm vào đồng hồ để bắt đầu lượt giải đầu tiên.
            </p>
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-1.5">
            <div className="grid grid-cols-[44px_1fr_1fr] px-2 py-1 text-[11px] font-medium text-slate-500">
              <span>#</span>
              <span className="text-right">Thời gian</span>
              <span className="text-right">Ao5</span>
            </div>
            <div className="divide-y divide-white/5">
              {newestFirst.map((solve, idx) => {
                const numberInSession = newestFirst.length - idx;
                const ao5 = ao5BySolveId.get(solve.id);
                const isBestSingle =
                  stats.bestSingle !== null &&
                  stats.bestSingle !== 'DNF' &&
                  solve.penalty !== 'DNF' &&
                  Math.floor(solve.timeMs / 10) * 10 + (solve.penalty === '+2' ? 2000 : 0) ===
                    stats.bestSingle;

                return (
                  <button
                    key={solve.id}
                    type="button"
                    onClick={() => onSelectSolve(solve, numberInSession)}
                    className="grid w-full grid-cols-[44px_1fr_1fr] items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    <span className="font-mono-tabular text-xs text-slate-400">
                      {numberInSession}
                    </span>
                    <span
                      className={`font-mono-tabular text-right font-semibold ${
                        solve.penalty === 'DNF'
                          ? 'text-rose-400'
                          : isBestSingle
                          ? 'text-emerald-400'
                          : solve.penalty === '+2'
                          ? 'text-amber-300'
                          : 'text-slate-100'
                      }`}
                    >
                      {formatSolve(solve)}
                    </span>
                    <span className="font-mono-tabular text-right text-xs text-slate-400">
                      {ao5 !== undefined ? formatTimeMs(ao5) : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
