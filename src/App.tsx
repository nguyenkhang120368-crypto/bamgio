import { Palette } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlgorithmsView } from './components/AlgorithmsView';
import { AnalyticsView } from './components/AnalyticsView';
import { RecordsView } from './components/RecordsView';
import { SessionsView } from './components/SessionsView';
import { SolveDetailModal } from './components/SolveDetailModal';
import { StarfieldCanvas } from './components/StarfieldCanvas';
import { StatsSidebar } from './components/StatsSidebar';
import { ThemeCustomizerDrawer } from './components/ThemeCustomizerDrawer';
import { TimerPhase, TimerStage } from './components/TimerStage';
import {
  COSMIC_BACKDROPS,
  createInitialSessions,
  DEFAULT_THEME,
  SURFACE_TINTS,
} from './constants/theme';
import { Penalty, PuzzleType, Session, SolveRecord, ThemeSettings } from './types/cube';
import { computeSessionStats } from './utils/cubeStats';
import { generateScramble, PUZZLE_LABELS } from './utils/scrambleGenerator';
import { playRecordChime } from './utils/sound';

type AppTab = 'timer' | 'algorithms' | 'analytics' | 'records' | 'sessions';

const STORAGE_KEYS = {
  sessions: 'astrocube_sessions_v1',
  activeSessionId: 'astrocube_active_session_v1',
  theme: 'astrocube_theme_v1',
};

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.sessions);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fallback to defaults
  }
  return createInitialSessions();
}

function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.theme);
    if (raw) {
      return { ...DEFAULT_THEME, ...JSON.parse(raw) };
    }
  } catch {
    // Fallback
  }
  return DEFAULT_THEME;
}

function isBetterTime(nextVal: number | 'DNF' | null, prevVal: number | 'DNF' | null): boolean {
  if (nextVal === null || nextVal === 'DNF') return false;
  if (prevVal === null || prevVal === 'DNF') return true;
  return nextVal < prevVal;
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.activeSessionId);
    return saved || '';
  });
  const [theme, setTheme] = useState<ThemeSettings>(loadTheme);
  const [activeTab, setActiveTab] = useState<AppTab>('timer');
  const [timerPhase, setTimerPhase] = useState<TimerPhase>('idle');
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [selectedSolveInfo, setSelectedSolveInfo] = useState<{
    solve: SolveRecord;
    numberInSession?: number;
  } | null>(null);
  const [newRecordBadges, setNewRecordBadges] = useState<string[]>([]);
  const [backdropImgError, setBackdropImgError] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  }, [sessions, activeSessionId]);

  const [currentScramble, setCurrentScramble] = useState<string>(() =>
    generateScramble(activeSession.puzzle)
  );

  // Sync activeSessionId if fallback occurred
  useEffect(() => {
    if (activeSession && activeSession.id !== activeSessionId) {
      setActiveSessionId(activeSession.id);
    }
  }, [activeSession, activeSessionId]);

  // Persist sessions & theme
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    } catch {
      // Storage quota safeguard
    }
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(STORAGE_KEYS.activeSessionId, activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));
    } catch {
      // Ignore
    }
  }, [theme]);

  // Apply custom CSS variables dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--timer-color', theme.timerColor);
    root.style.setProperty('--surface-rgb', SURFACE_TINTS[theme.surfaceTint].rgb);
    root.style.setProperty('--surface-opacity', (theme.surfaceOpacity / 100).toFixed(2));
  }, [theme]);

  // Reset image error state when switching backdrop
  useEffect(() => {
    setBackdropImgError(false);
  }, [theme.backdrop]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const activeStats = useMemo(
    () => computeSessionStats(activeSession.solves),
    [activeSession.solves]
  );

  const latestSolve = useMemo(() => {
    if (activeSession.solves.length === 0) return null;
    return [...activeSession.solves].sort((a, b) => a.createdAt - b.createdAt).at(-1) ?? null;
  }, [activeSession.solves]);

  const handleSelectSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    if (!target) return;
    setActiveSessionId(id);
    setCurrentScramble(generateScramble(target.puzzle));
    setNewRecordBadges([]);
  };

  const handleChangePuzzle = (puzzle: PuzzleType) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, puzzle } : s))
    );
    setCurrentScramble(generateScramble(puzzle));
    setNewRecordBadges([]);
  };

  const handleNextScramble = useCallback(() => {
    setCurrentScramble(generateScramble(activeSession.puzzle));
  }, [activeSession.puzzle]);

  const handleFinishSolve = useCallback(
    (timeMs: number, autoPenalty: Penalty) => {
      const prevStats = computeSessionStats(activeSession.solves);

      const newSolve: SolveRecord = {
        id: `solve-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sessionId: activeSession.id,
        puzzle: activeSession.puzzle,
        timeMs,
        penalty: autoPenalty,
        scramble: currentScramble,
        createdAt: Date.now(),
      };

      const nextSolves = [...activeSession.solves, newSolve];
      const nextStats = computeSessionStats(nextSolves);

      const broken: string[] = [];
      if (isBetterTime(nextStats.bestSingle, prevStats.bestSingle)) broken.push('Đơn');
      if (isBetterTime(nextStats.bestBo5, prevStats.bestBo5)) broken.push('Bo5');
      if (isBetterTime(nextStats.bestAo5, prevStats.bestAo5)) broken.push('Ao5');
      if (isBetterTime(nextStats.bestAo12, prevStats.bestAo12)) broken.push('Ao12');
      if (isBetterTime(nextStats.bestMo3, prevStats.bestMo3)) broken.push('Mo3');

      setNewRecordBadges(broken);
      if (broken.length > 0 && theme.inspectionAudio) {
        playRecordChime();
      }

      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, solves: nextSolves } : s))
      );
      setCurrentScramble(generateScramble(activeSession.puzzle));
    },
    [activeSession, currentScramble, theme.inspectionAudio]
  );

  const handleChangePenalty = (solveId: string, penalty: Penalty) => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        solves: s.solves.map((item) => (item.id === solveId ? { ...item, penalty } : item)),
      }))
    );
    setSelectedSolveInfo((prev) =>
      prev && prev.solve.id === solveId
        ? { ...prev, solve: { ...prev.solve, penalty } }
        : prev
    );
  };

  const handleUpdateNote = (solveId: string, note: string) => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        solves: s.solves.map((item) => (item.id === solveId ? { ...item, note } : item)),
      }))
    );
    setSelectedSolveInfo((prev) =>
      prev && prev.solve.id === solveId
        ? { ...prev, solve: { ...prev.solve, note } }
        : prev
    );
  };

  const handleDeleteSolve = (solveId: string) => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        solves: s.solves.filter((item) => item.id !== solveId),
      }))
    );
    setNewRecordBadges([]);
  };

  const handleCreateSession = (name: string, puzzle: PuzzleType) => {
    const newSession: Session = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      puzzle,
      createdAt: Date.now(),
      solves: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setCurrentScramble(generateScramble(puzzle));
    setNewRecordBadges([]);
    showToast(`Đã tạo phiên "${name}"`);
  };

  const handleQuickCreateSession = () => {
    const nextNum = sessions.length + 1;
    handleCreateSession(
      `Phiên ${PUZZLE_LABELS[activeSession.puzzle]} #${nextNum}`,
      activeSession.puzzle
    );
  };

  const handleRenameSession = (id: string, name: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleChangeSessionPuzzle = (id: string, puzzle: PuzzleType) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, puzzle } : s)));
    if (id === activeSession.id) {
      setCurrentScramble(generateScramble(puzzle));
    }
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (id === activeSession.id) {
      setActiveSessionId(remaining[0].id);
      setCurrentScramble(generateScramble(remaining[0].puzzle));
    }
    showToast('Đã xóa phiên giải');
  };

  const handleExportJson = () => {
    const payload = JSON.stringify({ version: 1, exportedAt: Date.now(), sessions }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astrocube-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      const importedSessions: Session[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.sessions)
        ? parsed.sessions
        : [];
      if (importedSessions.length === 0) {
        showToast('Tệp sao lưu không hợp lệ hoặc trống.');
        return;
      }
      setSessions(importedSessions);
      setActiveSessionId(importedSessions[0].id);
      setCurrentScramble(generateScramble(importedSessions[0].puzzle));
      showToast(`Đã khôi phục ${importedSessions.length} phiên giải.`);
    } catch {
      showToast('Không thể đọc tệp JSON.');
    }
  };

  const backdropConfig =
    COSMIC_BACKDROPS.find((b) => b.id === theme.backdrop) ?? COSMIC_BACKDROPS[0];

  const isTimingFocus = timerPhase === 'running' && theme.hideUiWhileTiming;
  const anyModalOpen =
    customizerOpen || selectedSolveInfo !== null || confirmClearOpen;

  const navItems: { id: AppTab; label: string }[] = [
    { id: 'timer', label: 'Bấm giờ' },
    { id: 'algorithms', label: 'Công thức' },
    { id: 'analytics', label: 'Thống kê' },
    { id: 'records', label: 'Kỷ lục' },
    { id: 'sessions', label: 'Phiên giải' },
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden text-slate-100">
      {/* Cosmic Deep-Space Background Layer */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: backdropConfig.fallbackGradient }}
      >
        {backdropConfig.imageSrc && !backdropImgError && (
          <img
            src={backdropConfig.imageSrc}
            alt={backdropConfig.label}
            referrerPolicy="no-referrer"
            onError={() => setBackdropImgError(true)}
            className="h-full w-full object-cover object-center"
          />
        )}
        {/* Dimming scrim for guaranteed text legibility */}
        <div
          className="absolute inset-0 transition-colors duration-200"
          style={{ backgroundColor: `rgba(4, 6, 14, ${theme.backdropDim / 100})` }}
        />
      </div>

      {/* Subtle Starfield Layer */}
      <StarfieldCanvas
        enabled={theme.starfieldEnabled}
        paused={timerPhase === 'running'}
      />

      {/* Top Navigation Bar (Strict 1-row, 3-zone contract) */}
      <header
        className={`relative z-20 border-b border-white/10 bg-black/40 backdrop-blur-md transition-opacity duration-200 ${
          isTimingFocus ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:gap-8 sm:px-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            AstroCube
          </button>

          {/* Zone 2: 4 Single-Line Nav Links */}
          <nav className="flex items-center gap-4 overflow-x-auto sm:gap-7">
            {navItems.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  {active && (
                    <span
                      className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                      style={{ backgroundColor: 'var(--accent-color)' }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setCustomizerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-950 transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tùy chỉnh màu</span>
              <span className="sm:hidden">Màu sắc</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col p-4 sm:p-6">
        {activeTab === 'timer' && (
          <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
            <div className="order-2 lg:order-1 lg:h-[calc(100vh-116px)] lg:min-h-[540px]">
              <StatsSidebar
                sessions={sessions}
                activeSession={activeSession}
                stats={activeStats}
                onSelectSession={handleSelectSession}
                onQuickCreateSession={handleQuickCreateSession}
                onSelectSolve={(solve, num) =>
                  setSelectedSolveInfo({ solve, numberInSession: num })
                }
                onClearSessionSolves={() => setConfirmClearOpen(true)}
                dimmed={isTimingFocus}
              />
            </div>

            <div className="order-1 lg:order-2 lg:min-h-[540px]">
              <TimerStage
                puzzle={activeSession.puzzle}
                scramble={currentScramble}
                theme={theme}
                latestSolve={latestSolve}
                newRecordBadges={newRecordBadges}
                phase={timerPhase}
                onPhaseChange={setTimerPhase}
                onChangePuzzle={handleChangePuzzle}
                onNextScramble={handleNextScramble}
                onSetCustomScramble={setCurrentScramble}
                onFinishSolve={handleFinishSolve}
                onApplyPenaltyLatest={(penalty) => {
                  if (latestSolve) handleChangePenalty(latestSolve.id, penalty);
                }}
                onDeleteLatest={() => {
                  if (latestSolve) handleDeleteSolve(latestSolve.id);
                }}
                onToggleInspection={() =>
                  setTheme((prev) => ({ ...prev, useInspection: !prev.useInspection }))
                }
                modalOpen={anyModalOpen}
              />
            </div>
          </div>
        )}

        {activeTab === 'algorithms' && <AlgorithmsView />}

        {activeTab === 'analytics' && (
          <AnalyticsView
            session={activeSession}
            stats={activeStats}
            onSelectSolve={(solve, num) => setSelectedSolveInfo({ solve, numberInSession: num })}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
          />
        )}

        {activeTab === 'records' && (
          <RecordsView
            sessions={sessions}
            onInspectSolve={(solve) => setSelectedSolveInfo({ solve })}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsView
            sessions={sessions}
            activeSessionId={activeSession.id}
            onSelectSession={(id) => {
              handleSelectSession(id);
              setActiveTab('timer');
            }}
            onCreateSession={handleCreateSession}
            onRenameSession={handleRenameSession}
            onChangeSessionPuzzle={handleChangeSessionPuzzle}
            onDeleteSession={handleDeleteSession}
          />
        )}
      </main>

      {/* Solve Detail Modal */}
      <SolveDetailModal
        solve={selectedSolveInfo?.solve ?? null}
        solveNumber={selectedSolveInfo?.numberInSession}
        onClose={() => setSelectedSolveInfo(null)}
        onChangePenalty={handleChangePenalty}
        onUpdateNote={handleUpdateNote}
        onDelete={handleDeleteSolve}
      />

      {/* Theme & Color Customizer Drawer */}
      <ThemeCustomizerDrawer
        open={customizerOpen}
        theme={theme}
        onChange={setTheme}
        onClose={() => setCustomizerOpen(false)}
      />

      {/* Confirm Clear Session Modal */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmClearOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="cosmic-panel w-full max-w-sm rounded-xl border p-6 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-base font-bold text-white">
              Xóa toàn bộ lần giải?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Thao tác này sẽ xóa tất cả {activeSession.solves.length} lần giải trong phiên{' '}
              <strong>{activeSession.name}</strong> và không thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessions((prev) =>
                    prev.map((s) =>
                      s.id === activeSession.id ? { ...s, solves: [] } : s
                    )
                  );
                  setNewRecordBadges([]);
                  setConfirmClearOpen(false);
                  showToast('Đã xóa toàn bộ lần giải trong phiên.');
                }}
                className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Toast Feedback */}
      {toastMessage && (
        <div className="fixed right-5 bottom-5 z-50 rounded-lg border border-white/15 bg-slate-950/90 px-4 py-2.5 text-xs font-medium text-slate-100 shadow-lg backdrop-blur-md">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
