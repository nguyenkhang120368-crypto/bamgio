import { Award } from 'lucide-react';
import { Session, SolveRecord } from '../types/cube';
import { computePersonalRecords } from '../utils/cubeStats';
import { PUZZLE_LABELS } from '../utils/scrambleGenerator';
import { formatTimeMs } from '../utils/timeFormat';

interface RecordsViewProps {
  sessions: Session[];
  onInspectSolve: (solve: SolveRecord) => void;
}

export function RecordsView({ sessions, onInspectSolve }: RecordsViewProps) {
  const records = computePersonalRecords(sessions);
  const totalAllSolves = sessions.reduce((acc, s) => acc + s.solves.length, 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <div className="cosmic-panel flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-100">Kỷ lục cá nhân (PB)</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Tổng hợp thành tích tốt nhất qua mọi phiên giải · {totalAllSolves} lần giải đã lưu
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-slate-300">
          <Award className="h-4 w-4" style={{ color: 'var(--accent-color)' }} />
          <span>Tự động cập nhật theo chuẩn WCA</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {records.map((item) => (
          <div key={item.puzzle} className="cosmic-panel rounded-xl border p-5">
            <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
              <h2 className="font-display text-lg font-bold text-slate-100">
                {PUZZLE_LABELS[item.puzzle]}
              </h2>
              <span className="font-mono-tabular text-xs text-slate-400">
                {item.totalSolves} lần giải
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-6 sm:grid-cols-3">
              <div>
                <p className="text-[11px] text-slate-400">PB Đơn (Single)</p>
                {item.bestSingle ? (
                  <button
                    type="button"
                    onClick={() => onInspectSolve(item.bestSingle!.solve)}
                    className="font-mono-tabular mt-0.5 text-left text-xl font-bold hover:underline"
                    style={{ color: 'var(--accent-color)' }}
                  >
                    {formatTimeMs(item.bestSingle.value)}
                  </button>
                ) : (
                  <p className="font-mono-tabular mt-0.5 text-xl font-bold text-slate-500">—</p>
                )}
                {item.bestSingle && (
                  <p className="truncate text-[11px] text-slate-500">
                    {item.bestSingle.sessionName}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] text-slate-400">PB Bo5</p>
                <p className="font-mono-tabular mt-0.5 text-xl font-bold text-slate-100">
                  {item.bestBo5 ? formatTimeMs(item.bestBo5.value) : '—'}
                </p>
                {item.bestBo5 && (
                  <p className="truncate text-[11px] text-slate-500">{item.bestBo5.sessionName}</p>
                )}
              </div>

              <div>
                <p className="text-[11px] text-slate-400">PB Mo3</p>
                <p className="font-mono-tabular mt-0.5 text-xl font-bold text-slate-100">
                  {item.bestMo3 ? formatTimeMs(item.bestMo3.value) : '—'}
                </p>
                {item.bestMo3 && (
                  <p className="truncate text-[11px] text-slate-500">{item.bestMo3.sessionName}</p>
                )}
              </div>

              <div>
                <p className="text-[11px] text-slate-400">PB Ao5</p>
                <p className="font-mono-tabular mt-0.5 text-xl font-bold text-slate-100">
                  {item.bestAo5 ? formatTimeMs(item.bestAo5.value) : '—'}
                </p>
                {item.bestAo5 && (
                  <p className="truncate text-[11px] text-slate-500">{item.bestAo5.sessionName}</p>
                )}
              </div>

              <div>
                <p className="text-[11px] text-slate-400">PB Ao12</p>
                <p className="font-mono-tabular mt-0.5 text-xl font-bold text-slate-100">
                  {item.bestAo12 ? formatTimeMs(item.bestAo12.value) : '—'}
                </p>
                {item.bestAo12 && (
                  <p className="truncate text-[11px] text-slate-500">{item.bestAo12.sessionName}</p>
                )}
              </div>
            </div>

            {item.bestSingle && (
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-[11px] text-slate-400">Scramble của PB Đơn:</p>
                <p className="font-mono-tabular mt-1 text-xs leading-relaxed text-slate-300">
                  {item.bestSingle.solve.scramble}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
