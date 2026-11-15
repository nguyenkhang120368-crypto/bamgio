import { Download, Search, Upload } from 'lucide-react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { Session, SessionStats, SolveRecord } from '../types/cube';
import { buildSolveTrend } from '../utils/cubeStats';
import { PUZZLE_LABELS } from '../utils/scrambleGenerator';
import { formatSolve, formatTimeMs, getEffectiveTimeMs } from '../utils/timeFormat';

interface AnalyticsViewProps {
  session: Session;
  stats: SessionStats;
  onSelectSolve: (solve: SolveRecord, numberInSession: number) => void;
  onExportJson: () => void;
  onImportJson: (jsonText: string) => void;
}

export function AnalyticsView({
  session,
  stats,
  onSelectSolve,
  onExportJson,
  onImportJson,
}: AnalyticsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const trend = useMemo(() => buildSolveTrend(session.solves), [session.solves]);

  const chartStats = useMemo(() => {
    const validVals = trend
      .map((p) => p.effectiveMs)
      .filter((v): v is number => v !== null);
    if (validVals.length === 0) return null;
    const min = Math.min(...validVals);
    const max = Math.max(...validVals);
    const pad = Math.max(500, (max - min) * 0.15);
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [trend]);

  const histogram = useMemo(() => {
    const valid = trend
      .map((p) => p.effectiveMs)
      .filter((v): v is number => v !== null);
    if (valid.length === 0) return [];
    const minSec = Math.floor(Math.min(...valid) / 1000);
    const maxSec = Math.ceil(Math.max(...valid) / 1000);
    const span = Math.max(1, maxSec - minSec);
    const step = span <= 6 ? 1 : span <= 15 ? 2 : span <= 30 ? 5 : 10;

    const buckets: { label: string; count: number }[] = [];
    const start = Math.floor(minSec / step) * step;
    for (let s = start; s <= maxSec; s += step) {
      const low = s * 1000;
      const high = (s + step) * 1000;
      const count = valid.filter((t) => t >= low && t < high).length;
      if (count > 0 || buckets.length > 0) {
        buckets.push({ label: `${s}–${s + step}s`, count });
      }
    }
    return buckets.slice(0, 12);
  }, [trend]);

  const filteredSolves = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const reversed = [...trend].reverse();
    if (!q) return reversed;
    return reversed.filter(
      (p) =>
        p.solve.scramble.toLowerCase().includes(q) ||
        formatSolve(p.solve).toLowerCase().includes(q) ||
        (p.solve.note ?? '').toLowerCase().includes(q)
    );
  }, [trend, searchQuery]);

  const handleExportCsv = () => {
    const header = 'STT,Thoi_gian,Phat,Ao5,Ao12,Scramble,Ghi_chu,Thoi_diem\n';
    const rows = trend
      .map((p) => {
        const eff = getEffectiveTimeMs(p.solve);
        const timeStr = eff === null ? 'DNF' : formatTimeMs(eff);
        const ao5Str = p.ao5 !== null ? formatTimeMs(p.ao5) : '';
        const ao12Str = p.ao12 !== null ? formatTimeMs(p.ao12) : '';
        const dateStr = new Date(p.solve.createdAt).toISOString();
        const note = (p.solve.note ?? '').replace(/"/g, '""');
        return `${p.index},"${timeStr}","${p.solve.penalty}","${ao5Str}","${ao12Str}","${p.solve.scramble}","${note}","${dateStr}"`;
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astrocube-${session.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportJson(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Chart SVG dimensions
  const chartW = 860;
  const chartH = 260;
  const padL = 56;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const getX = (idx: number, total: number) => {
    if (total <= 1) return padL + plotW / 2;
    return padL + (idx / (total - 1)) * plotW;
  };

  const getY = (ms: number) => {
    if (!chartStats) return padT + plotH / 2;
    const ratio = (ms - chartStats.min) / Math.max(1, chartStats.max - chartStats.min);
    return padT + plotH - ratio * plotH;
  };

  const buildPolyline = (getter: (idx: number) => number | null) => {
    const pts: string[] = [];
    trend.forEach((_, idx) => {
      const val = getter(idx);
      if (val !== null) {
        pts.push(`${getX(idx, trend.length).toFixed(1)},${getY(val).toFixed(1)}`);
      }
    });
    return pts.join(' ');
  };

  const hoveredPoint = hoverIndex !== null ? trend[hoverIndex] ?? null : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      {/* Header & Export Actions */}
      <div className="cosmic-panel flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-100">
            Thống kê & Biểu đồ · {session.name}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {PUZZLE_LABELS[session.puzzle]} · {stats.count} lần giải ({stats.validCount} hợp lệ ·{' '}
            {stats.plusTwoCount} lần +2 · {stats.dnfCount} DNF)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={trend.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Sao lưu JSON</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-950 whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Khôi phục JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="cosmic-panel grid grid-cols-2 divide-y divide-white/10 rounded-xl border sm:grid-cols-3 md:grid-cols-6 md:divide-x md:divide-y-0">
        {[
          { label: 'Single Tốt Nhất', value: formatTimeMs(stats.bestSingle) },
          { label: 'Bo5 Tốt Nhất', value: formatTimeMs(stats.bestBo5) },
          { label: 'Ao5 Tốt Nhất', value: formatTimeMs(stats.bestAo5) },
          { label: 'Ao12 Tốt Nhất', value: formatTimeMs(stats.bestAo12) },
          { label: 'Session Mean', value: formatTimeMs(stats.sessionMean) },
          {
            label: 'Độ lệch chuẩn σ',
            value: stats.stdDev !== null ? formatTimeMs(stats.stdDev) : '—',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="px-4 py-3.5">
            <p className="text-[11px] font-medium text-slate-400">{kpi.label}</p>
            <p className="font-mono-tabular mt-1 text-xl font-bold text-slate-100">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Time Trend SVG Chart */}
      <div className="cosmic-panel rounded-xl border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Biểu đồ tiến độ thời gian
            </h2>
            <p className="text-xs text-slate-400">
              Di chuột lên biểu đồ để xem chi tiết từng lần giải, Ao5 và Ao12
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-slate-400 inline-block" /> Đơn
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-0.5 w-4 inline-block"
                style={{ backgroundColor: 'var(--accent-color)' }}
              />{' '}
              Ao5
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-amber-400 inline-block" /> Ao12
            </span>
          </div>
        </div>

        {!chartStats || trend.length < 2 ? (
          <div className="flex h-52 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-sm text-slate-400">
            Cần ít nhất 2 lần giải hợp lệ trong phiên để vẽ biểu đồ tiến độ.
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="h-64 w-full overflow-visible cursor-crosshair"
              onMouseLeave={() => setHoverIndex(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = ((e.clientX - rect.left) / rect.width) * chartW;
                const clamped = Math.max(padL, Math.min(chartW - padR, relX));
                const idx = Math.round(((clamped - padL) / plotW) * (trend.length - 1));
                setHoverIndex(Math.max(0, Math.min(trend.length - 1, idx)));
              }}
            >
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = chartStats.min + (chartStats.max - chartStats.min) * t;
                const y = getY(val);
                return (
                  <g key={t}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke="rgba(148,163,184,0.14)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 font-mono text-[10px]"
                    >
                      {formatTimeMs(Math.round(val / 10) * 10)}
                    </text>
                  </g>
                );
              })}

              {/* Single line */}
              <polyline
                fill="none"
                stroke="rgba(148, 163, 184, 0.55)"
                strokeWidth="1.5"
                points={buildPolyline((i) => trend[i].effectiveMs)}
              />

              {/* Ao5 line */}
              <polyline
                fill="none"
                stroke="var(--accent-color)"
                strokeWidth="2.2"
                points={buildPolyline((i) => {
                  const v = trend[i].ao5;
                  return v === null || v === 'DNF' ? null : v;
                })}
              />

              {/* Ao12 line */}
              <polyline
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="5 3"
                points={buildPolyline((i) => {
                  const v = trend[i].ao12;
                  return v === null || v === 'DNF' ? null : v;
                })}
              />

              {/* Crosshair */}
              {hoveredPoint && (
                <g>
                  <line
                    x1={getX(hoveredPoint.index - 1, trend.length)}
                    y1={padT}
                    x2={getX(hoveredPoint.index - 1, trend.length)}
                    y2={chartH - padB}
                    stroke="rgba(248, 250, 252, 0.35)"
                    strokeWidth="1"
                  />
                  {hoveredPoint.effectiveMs !== null && (
                    <circle
                      cx={getX(hoveredPoint.index - 1, trend.length)}
                      cy={getY(hoveredPoint.effectiveMs)}
                      r="4"
                      fill="#F8FAFC"
                    />
                  )}
                </g>
              )}
            </svg>

            {hoveredPoint && (
              <div className="font-mono-tabular mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-xs text-slate-200">
                <span>Lần #{hoveredPoint.index}</span>
                <span>Đơn: {formatSolve(hoveredPoint.solve)}</span>
                <span>Ao5: {hoveredPoint.ao5 !== null ? formatTimeMs(hoveredPoint.ao5) : '—'}</span>
                <span>
                  Ao12: {hoveredPoint.ao12 !== null ? formatTimeMs(hoveredPoint.ao12) : '—'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Distribution + Searchable Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Time Distribution */}
        <div className="cosmic-panel rounded-xl border p-5">
          <h3 className="font-display text-sm font-semibold text-slate-100">Phân bố thời gian</h3>
          <p className="mt-0.5 text-xs text-slate-400">Số lần giải theo từng khoảng giây</p>
          {histogram.length === 0 ? (
            <p className="mt-6 text-xs text-slate-400">Chưa có dữ liệu hợp lệ.</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {(() => {
                const maxCount = Math.max(1, ...histogram.map((b) => b.count));
                return histogram.map((b) => (
                  <div key={b.label} className="grid grid-cols-[64px_1fr_32px] items-center gap-2 text-xs">
                    <span className="font-mono-tabular text-slate-400">{b.label}</span>
                    <div className="h-2.5 overflow-hidden rounded-sm bg-white/5">
                      <div
                        className="h-full rounded-sm transition-all"
                        style={{
                          width: `${(b.count / maxCount) * 100}%`,
                          backgroundColor: 'var(--accent-color)',
                        }}
                      />
                    </div>
                    <span className="font-mono-tabular text-right text-slate-200">{b.count}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Full Solve Table */}
        <div className="cosmic-panel flex flex-col rounded-xl border p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Bảng lịch sử chi tiết
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thời gian, scramble, ghi chú..."
                className="w-full rounded-lg border border-white/15 bg-black/35 py-1.5 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="custom-scrollbar max-h-80 overflow-y-auto">
            {filteredSolves.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Không tìm thấy lần giải phù hợp.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400">
                  <tr>
                    <th className="py-2 pr-2 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Thời gian</th>
                    <th className="py-2 pr-3 font-medium">Ao5</th>
                    <th className="py-2 pr-3 font-medium">Ao12</th>
                    <th className="py-2 font-medium">Scramble</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSolves.map((p) => (
                    <tr
                      key={p.solve.id}
                      onClick={() => onSelectSolve(p.solve, p.index)}
                      className="cursor-pointer transition-colors hover:bg-white/10"
                    >
                      <td className="font-mono-tabular py-2 pr-2 text-slate-400">{p.index}</td>
                      <td className="font-mono-tabular py-2 pr-3 font-semibold text-slate-100">
                        {formatSolve(p.solve)}
                      </td>
                      <td className="font-mono-tabular py-2 pr-3 text-slate-300">
                        {p.ao5 !== null ? formatTimeMs(p.ao5) : '—'}
                      </td>
                      <td className="font-mono-tabular py-2 pr-3 text-slate-300">
                        {p.ao12 !== null ? formatTimeMs(p.ao12) : '—'}
                      </td>
                      <td className="font-mono-tabular max-w-xs truncate py-2 text-slate-400">
                        {p.solve.scramble}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
