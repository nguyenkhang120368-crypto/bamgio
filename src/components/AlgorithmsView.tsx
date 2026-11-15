import {
  BookOpen,
  Check,
  Copy,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  Star,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALGORITHMS,
  AlgCategory,
  AlgMethod,
  AlgorithmItem,
  METHOD_CATEGORIES,
} from '../data/algorithms';
import { invertAlgorithm } from '../utils/cubeState';
import { formatTimeMs } from '../utils/timeFormat';
import { CubeTopDiagram } from './CubeTopDiagram';

export type AlgMastery = 'new' | 'learning' | 'learned';

export interface AlgProgressEntry {
  status: AlgMastery;
  starred?: boolean;
  bestMs?: number;
  reps?: number;
}

const PROGRESS_STORAGE_KEY = 'astrocube_alg_progress_v1';

function loadProgress(): Record<string, AlgProgressEntry> {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore parse error
  }
  return {};
}

const METHODS: AlgMethod[] = ['CFOP', 'Roux', 'ZB', 'Khác'];

const STATUS_LABELS: Record<AlgMastery, string> = {
  new: 'Chưa học',
  learning: 'Đang ôn',
  learned: 'Đã thuộc',
};

export function AlgorithmsView() {
  const [method, setMethod] = useState<AlgMethod>('CFOP');
  const [category, setCategory] = useState<AlgCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AlgMastery | 'STARRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState<Record<string, AlgProgressEntry>>(loadProgress);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drill / Practice Mode State
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillCase, setDrillCase] = useState<AlgorithmItem | null>(null);
  const [drillAuf, setDrillAuf] = useState<string>('');
  const [hideFormula, setHideFormula] = useState(true);
  const [drillRunning, setDrillRunning] = useState(false);
  const [drillElapsedMs, setDrillElapsedMs] = useState(0);
  const drillStartRef = useRef<number>(0);
  const drillRafRef = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage error
    }
  }, [progress]);

  const categoriesForMethod = METHOD_CATEGORIES[method];

  const handleSelectMethod = (m: AlgMethod) => {
    setMethod(m);
    setCategory('ALL');
  };

  const getEntry = useCallback(
    (id: string): AlgProgressEntry => progress[id] ?? { status: 'new', starred: false, reps: 0 },
    [progress]
  );

  const setStatus = (id: string, status: AlgMastery) => {
    setProgress((prev) => ({
      ...prev,
      [id]: { ...getEntry(id), status },
    }));
  };

  const toggleStar = (id: string) => {
    const cur = getEntry(id);
    setProgress((prev) => ({
      ...prev,
      [id]: { ...cur, starred: !cur.starred },
    }));
  };

  const filteredAlgorithms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALGORITHMS.filter((item) => {
      if (item.method !== method) return false;
      if (category !== 'ALL' && item.category !== category) return false;

      const entry = getEntry(item.id);
      if (statusFilter === 'STARRED' && !entry.starred) return false;
      if (
        statusFilter !== 'ALL' &&
        statusFilter !== 'STARRED' &&
        entry.status !== statusFilter
      ) {
        return false;
      }

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.subgroup.toLowerCase().includes(q) ||
        item.alg.toLowerCase().includes(q) ||
        (item.altAlg ?? '').toLowerCase().includes(q) ||
        item.recognition.toLowerCase().includes(q)
      );
    });
  }, [category, getEntry, method, searchQuery, statusFilter]);

  const methodTotal = useMemo(
    () => ALGORITHMS.filter((a) => a.method === method).length,
    [method]
  );
  const methodLearned = useMemo(
    () =>
      ALGORITHMS.filter((a) => a.method === method && getEntry(a.id).status === 'learned').length,
    [getEntry, method]
  );
  const methodLearning = useMemo(
    () =>
      ALGORITHMS.filter((a) => a.method === method && getEntry(a.id).status === 'learning').length,
    [getEntry, method]
  );

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
    } catch {
      // Ignore
    }
  };

  // ==================== Drill Mode Helpers ====================
  const pickRandomAuf = () => {
    const aufs = ['', 'U ', "U' ", 'U2 '];
    return aufs[Math.floor(Math.random() * aufs.length)];
  };

  const startDrillWithCase = (item: AlgorithmItem) => {
    setDrillCase(item);
    setDrillAuf(pickRandomAuf());
    setDrillElapsedMs(0);
    setDrillRunning(false);
    setDrillOpen(true);
  };

  const pickNextDrillCase = useCallback(() => {
    const pool = filteredAlgorithms.length > 0 ? filteredAlgorithms : ALGORITHMS.filter((a) => a.method === method);
    if (pool.length === 0) return;
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && drillCase && next.id === drillCase.id) {
      const altPool = pool.filter((p) => p.id !== drillCase.id);
      next = altPool[Math.floor(Math.random() * altPool.length)];
    }
    setDrillCase(next);
    setDrillAuf(pickRandomAuf());
    setDrillElapsedMs(0);
    setDrillRunning(false);
  }, [drillCase, filteredAlgorithms, method]);

  const toggleDrillTimer = useCallback(() => {
    if (!drillCase) return;
    if (drillRunning) {
      cancelAnimationFrame(drillRafRef.current);
      const finalMs = performance.now() - drillStartRef.current;
      setDrillElapsedMs(finalMs);
      setDrillRunning(false);

      const centiMs = Math.floor(finalMs / 10) * 10;
      setProgress((prev) => {
        const cur = prev[drillCase.id] ?? { status: 'new', reps: 0 };
        const bestMs = cur.bestMs ? Math.min(cur.bestMs, centiMs) : centiMs;
        return {
          ...prev,
          [drillCase.id]: {
            ...cur,
            bestMs,
            reps: (cur.reps ?? 0) + 1,
          },
        };
      });
    } else {
      drillStartRef.current = performance.now();
      setDrillElapsedMs(0);
      setDrillRunning(true);
      const tick = () => {
        setDrillElapsedMs(performance.now() - drillStartRef.current);
        drillRafRef.current = requestAnimationFrame(tick);
      };
      drillRafRef.current = requestAnimationFrame(tick);
    }
  }, [drillCase, drillRunning]);

  useEffect(() => {
    if (!drillOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) toggleDrillTimer();
      } else if (e.code === 'Escape') {
        cancelAnimationFrame(drillRafRef.current);
        setDrillRunning(false);
        setDrillOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drillOpen, toggleDrillTimer]);

  useEffect(() => {
    return () => cancelAnimationFrame(drillRafRef.current);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      {/* Method Header & Progress Summary */}
      <div className="cosmic-panel rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              Thư viện công thức Rubik (CFOP · Roux · ZB)
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Tra cứu sơ đồ nhận diện, kỹ thuật ngón tay, theo dõi tiến độ thuộc bài và luyện tập phản xạ từng thế.
            </p>
          </div>

          <button
            type="button"
            disabled={filteredAlgorithms.length === 0}
            onClick={() => {
              if (filteredAlgorithms.length > 0) {
                startDrillWithCase(filteredAlgorithms[0]);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <Play className="h-3.5 w-3.5" />
            <span>Luyện tập bộ lọc ({filteredAlgorithms.length})</span>
          </button>
        </div>

        {/* Method Tabs & Progress Strip */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-black/40 p-1">
            {METHODS.map((m) => {
              const active = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMethod(m)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  style={active ? { backgroundColor: 'var(--accent-color)' } : undefined}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              Đã thuộc ({method}):{' '}
              <strong className="font-mono-tabular text-emerald-400">
                {methodLearned}/{methodTotal}
              </strong>
            </span>
            <span className="text-slate-400">
              Đang ôn:{' '}
              <strong className="font-mono-tabular text-amber-300">{methodLearning}</strong>
            </span>
            <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-white/10 sm:block">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${methodTotal > 0 ? (methodLearned / methodTotal) * 100 : 0}%`,
                  backgroundColor: 'var(--accent-color)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Category, Status Filter & Search Bar */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                category === 'ALL'
                  ? 'border-white/30 bg-white/15 text-white'
                  : 'border-white/10 bg-black/25 text-slate-400 hover:text-white'
              }`}
            >
              Tất cả nhóm
            </button>
            {categoriesForMethod.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'border-white/30 bg-white/15 text-white'
                      : 'border-white/10 bg-black/25 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'ALL' | AlgMastery | 'STARRED')
              }
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900">
                Mọi trạng thái
              </option>
              <option value="new" className="bg-slate-900">
                Chưa học
              </option>
              <option value="learning" className="bg-slate-900">
                Đang ôn
              </option>
              <option value="learned" className="bg-slate-900">
                Đã thuộc
              </option>
              <option value="STARRED" className="bg-slate-900">
                Đã đánh dấu sao
              </option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên thế, Sune, T-Perm, R U R'..."
                className="w-full rounded-lg border border-white/15 bg-black/40 py-1.5 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Algorithm Cards Grid */}
      {filteredAlgorithms.length === 0 ? (
        <div className="cosmic-panel rounded-xl border p-10 text-center">
          <BookOpen className="mx-auto h-7 w-7 text-slate-500" />
          <p className="mt-2 text-sm font-medium text-slate-300">
            Không có công thức nào khớp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-3 rounded-lg border border-white/15 px-3.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredAlgorithms.map((item) => {
            const entry = getEntry(item.id);
            return (
              <article
                key={item.id}
                className="cosmic-panel flex flex-col justify-between rounded-xl border p-4 sm:p-5"
              >
                <div>
                  {/* Top Row: Diagram + Header + Controls */}
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg border border-white/10 bg-black/45 p-1.5">
                      <CubeTopDiagram alg={item.alg} mode={item.diagramMode} size={78} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="font-display text-base font-bold text-white leading-snug">
                            {item.name}
                          </h2>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.category} · {item.subgroup} · {item.difficulty}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleStar(item.id)}
                          className={`rounded-md p-1.5 transition-colors shrink-0 ${
                            entry.starred
                              ? 'text-amber-400 hover:bg-white/10'
                              : 'text-slate-500 hover:bg-white/10 hover:text-slate-300'
                          }`}
                          title={entry.starred ? 'Bỏ đánh dấu' : 'Đánh dấu để ôn'}
                          aria-label="Đánh dấu công thức"
                        >
                          <Star
                            className="h-4 w-4"
                            fill={entry.starred ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>

                      {/* Main Algorithm Box */}
                      <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/45 px-3 py-2">
                        <code
                          className="font-mono-tabular text-sm font-semibold tracking-wide"
                          style={{ color: 'var(--accent-color)' }}
                        >
                          {item.alg}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.alg)}
                          className="rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white shrink-0"
                          title="Sao chép công thức"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {item.altAlg && (
                        <p className="font-mono-tabular mt-1.5 text-xs text-slate-400">
                          Biến thể: <span className="text-slate-200">{item.altAlg}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Recognition & Fingertrick Notes */}
                  <div className="mt-3.5 space-y-1.5 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-300">
                    <p>
                      <span className="font-medium text-slate-400">Nhận diện: </span>
                      {item.recognition}
                    </p>
                    <p>
                      <span className="font-medium text-slate-400">Kỹ thuật tay: </span>
                      {item.fingertrick}
                    </p>
                  </div>
                </div>

                {/* Bottom Action & Mastery Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-1 rounded-lg bg-black/35 p-0.5">
                    {(['new', 'learning', 'learned'] as AlgMastery[]).map((st) => {
                      const active = entry.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatus(item.id, st)}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                            active
                              ? st === 'learned'
                                ? 'bg-emerald-500 text-slate-950 font-semibold'
                                : st === 'learning'
                                ? 'bg-amber-400 text-slate-950 font-semibold'
                                : 'bg-white/20 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {STATUS_LABELS[st]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {entry.bestMs !== undefined && (
                      <span className="font-mono-tabular text-slate-400">
                        PB: <strong className="text-slate-200">{formatTimeMs(entry.bestMs)}</strong>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startDrillWithCase(item)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 font-medium text-slate-200 transition-colors hover:bg-white/15 whitespace-nowrap"
                    >
                      <Play className="h-3 w-3" />
                      <span>Tập thế này</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Algorithm Practice / Flashcard Trainer Modal */}
      {drillOpen && drillCase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => {
            cancelAnimationFrame(drillRafRef.current);
            setDrillRunning(false);
            setDrillOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Phòng luyện tập công thức"
        >
          <div
            className="cosmic-panel w-full max-w-xl rounded-xl border p-6 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs text-slate-400">
                  Luyện phản xạ · {drillCase.method} · {drillCase.category}
                </p>
                <h2 className="font-display mt-0.5 text-lg font-bold text-white">
                  {drillCase.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  cancelAnimationFrame(drillRafRef.current);
                  setDrillRunning(false);
                  setDrillOpen(false);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Đóng phòng luyện tập"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-4">
              {/* Diagram + Setup Scramble */}
              <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-4 sm:flex-row">
                <CubeTopDiagram alg={drillCase.alg} mode={drillCase.diagramMode} size={96} />
                <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Công thức Setup (xáo từ khối đã giải):
                    </span>
                    <p className="font-mono-tabular mt-0.5 text-sm font-medium text-slate-100">
                      {drillAuf}
                      {invertAlgorithm(drillCase.alg)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">{drillCase.recognition}</p>
                </div>
              </div>

              {/* Hidden/Visible Formula Reveal */}
              <div className="w-full rounded-xl border border-white/10 bg-black/35 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Lời giải</span>
                  <button
                    type="button"
                    onClick={() => setHideFormula((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    {hideFormula ? (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Hiện công thức</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Ẩn để tự nhớ</span>
                      </>
                    )}
                  </button>
                </div>
                {hideFormula ? (
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Đang ẩn công thức — hãy nhìn sơ đồ để tự nhớ lại trước khi bấm giờ
                  </p>
                ) : (
                  <div className="mt-2 text-center">
                    <code
                      className="font-mono-tabular text-base font-bold"
                      style={{ color: 'var(--accent-color)' }}
                    >
                      {drillCase.alg}
                    </code>
                    {drillCase.altAlg && (
                      <p className="font-mono-tabular mt-1 text-xs text-slate-400">
                        Hoặc: {drillCase.altAlg}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Execution Speed Timer */}
              <button
                type="button"
                onClick={toggleDrillTimer}
                className="w-full rounded-xl border border-white/15 bg-black/50 py-6 text-center transition-colors hover:border-white/30"
              >
                <p className="text-xs text-slate-400">
                  {drillRunning
                    ? 'Đang bấm... nhấn Space hoặc chạm để dừng'
                    : 'Nhấn Space hoặc chạm vào đây để đo tốc độ xoay thế này'}
                </p>
                <p
                  className="font-mono-tabular mt-1 text-5xl font-bold tracking-tight"
                  style={{ color: drillRunning ? '#10B981' : 'var(--timer-color)' }}
                >
                  {formatTimeMs(drillElapsedMs)}
                </p>
                {(() => {
                  const e = getEntry(drillCase.id);
                  return (
                    <p className="font-mono-tabular mt-2 text-xs text-slate-400">
                      Kỷ lục thế này: {e.bestMs ? formatTimeMs(e.bestMs) : '—'} · Số lần tập:{' '}
                      {e.reps ?? 0}
                    </p>
                  );
                })()}
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatus(drillCase.id, 'learning');
                    pickNextDrillCase();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-400/20"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Cần ôn thêm</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus(drillCase.id, 'learned');
                    pickNextDrillCase();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Đã thuộc & Tiếp</span>
                </button>
              </div>

              <button
                type="button"
                onClick={pickNextDrillCase}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-slate-950"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>Thế ngẫu nhiên khác</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
