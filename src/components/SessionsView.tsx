import { Check, Edit2, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PuzzleType, Session } from '../types/cube';
import { computeSessionStats } from '../utils/cubeStats';
import { PUZZLE_LABELS } from '../utils/scrambleGenerator';
import { formatTimeMs } from '../utils/timeFormat';

interface SessionsViewProps {
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: (name: string, puzzle: PuzzleType) => void;
  onRenameSession: (id: string, name: string) => void;
  onChangeSessionPuzzle: (id: string, puzzle: PuzzleType) => void;
  onDeleteSession: (id: string) => void;
}

const PUZZLES: PuzzleType[] = ['3x3', '2x2', '4x4', '5x5', 'pyraminx', 'skewb'];

export function SessionsView({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onChangeSessionPuzzle,
  onDeleteSession,
}: SessionsViewProps) {
  const [newName, setNewName] = useState('');
  const [newPuzzle, setNewPuzzle] = useState<PuzzleType>('3x3');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim() || `Phiên ${PUZZLE_LABELS[newPuzzle]}`;
    onCreateSession(trimmed, newPuzzle);
    setNewName('');
  };

  const startRename = (s: Session) => {
    setEditingId(s.id);
    setEditValue(s.name);
  };

  const submitRename = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) onRenameSession(id, trimmed);
    setEditingId(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      {/* Create New Session Panel */}
      <form onSubmit={handleCreate} className="cosmic-panel rounded-xl border p-5">
        <h1 className="font-display text-xl font-bold text-slate-100">Quản lý nhiều phiên giải</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Tách riêng các buổi luyện tập theo loại Rubik, luyện một tay (OH) hoặc thử nghiệm công thức mới.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên phiên mới (ví dụ: Luyện Lookahead 3x3)..."
            className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <select
            value={newPuzzle}
            onChange={(e) => setNewPuzzle(e.target.value as PuzzleType)}
            className="rounded-lg border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
          >
            {PUZZLES.map((p) => (
              <option key={p} value={p} className="bg-slate-900">
                {PUZZLE_LABELS[p]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <Plus className="h-4 w-4" />
            <span>Tạo phiên</span>
          </button>
        </div>
      </form>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sessions.map((s) => {
          const isActive = s.id === activeSessionId;
          const st = computeSessionStats(s.solves);

          return (
            <div
              key={s.id}
              className="cosmic-panel flex flex-col justify-between rounded-xl border p-5 transition-colors"
              style={isActive ? { borderColor: 'var(--accent-color)' } : undefined}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  {editingId === s.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(s.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full rounded-md border border-white/20 bg-black/50 px-2.5 py-1 text-sm text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => submitRename(s.id)}
                        className="rounded-md bg-white/10 p-1.5 text-emerald-400 hover:bg-white/20"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <h2 className="font-display truncate text-base font-bold text-slate-100">
                        {s.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {isActive ? 'Đang kích hoạt · ' : ''}
                        {s.solves.length} lần giải
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startRename(s)}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      title="Đổi tên phiên"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteSession(s.id)}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                        title="Xóa phiên"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick metrics */}
                <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/10 pt-3 text-xs">
                  <div>
                    <span className="text-slate-400">Đơn PB</span>
                    <p className="font-mono-tabular mt-0.5 font-semibold text-slate-100">
                      {formatTimeMs(st.bestSingle)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Ao5 PB</span>
                    <p className="font-mono-tabular mt-0.5 font-semibold text-slate-100">
                      {formatTimeMs(st.bestAo5)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Ao12 PB</span>
                    <p className="font-mono-tabular mt-0.5 font-semibold text-slate-100">
                      {formatTimeMs(st.bestAo12)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Mean</span>
                    <p className="font-mono-tabular mt-0.5 font-semibold text-slate-100">
                      {formatTimeMs(st.sessionMean)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <select
                  value={s.puzzle}
                  onChange={(e) => onChangeSessionPuzzle(s.id, e.target.value as PuzzleType)}
                  className="rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  {PUZZLES.map((p) => (
                    <option key={p} value={p} className="bg-slate-900">
                      {PUZZLE_LABELS[p]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white/10 text-slate-200'
                      : 'text-slate-950 hover:opacity-90'
                  }`}
                  style={!isActive ? { backgroundColor: 'var(--accent-color)' } : undefined}
                >
                  {isActive ? 'Mở đồng hồ' : 'Chọn phiên này'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
