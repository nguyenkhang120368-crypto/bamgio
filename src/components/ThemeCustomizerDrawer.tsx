import { RotateCcw, X } from 'lucide-react';
import {
  ACCENT_PRESETS,
  COSMIC_BACKDROPS,
  DEFAULT_THEME,
  SURFACE_TINTS,
  TIMER_COLOR_PRESETS,
} from '../constants/theme';
import { ThemeSettings } from '../types/cube';

interface ThemeCustomizerDrawerProps {
  open: boolean;
  theme: ThemeSettings;
  onChange: (next: ThemeSettings) => void;
  onClose: () => void;
}

export function ThemeCustomizerDrawer({
  open,
  theme,
  onChange,
  onClose,
}: ThemeCustomizerDrawerProps) {
  if (!open) return null;

  const update = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    onChange({ ...theme, [key]: value });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tùy chỉnh giao diện vũ trụ và màu sắc"
    >
      <div
        className="cosmic-panel custom-scrollbar h-full w-full max-w-md overflow-y-auto border-l p-6 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Tùy chỉnh màu & Vũ trụ
            </h2>
            <p className="text-xs text-slate-400">
              Cá nhân hóa nền không gian, màu nhấn, chữ số đồng hồ và độ trong suốt
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Đóng bảng tùy chỉnh"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Cosmic Backdrop Selection */}
          <div>
            <span className="mb-2.5 block text-xs font-semibold text-slate-300">
              Nền vũ trụ bao la
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {COSMIC_BACKDROPS.map((item) => {
                const active = theme.backdrop === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => update('backdrop', item.id)}
                    className={`group overflow-hidden rounded-lg border text-left transition-all ${
                      active
                        ? 'border-2'
                        : 'border-white/15 hover:border-white/35'
                    }`}
                    style={active ? { borderColor: 'var(--accent-color)' } : undefined}
                  >
                    <div
                      className="relative h-20 w-full bg-cover bg-center"
                      style={{ background: item.fallbackGradient }}
                    >
                      {item.imageSrc && (
                        <img
                          src={item.imageSrc}
                          alt={item.label}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute bottom-1.5 left-2 text-xs font-semibold text-white">
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Độ tối nền vũ trụ (tăng độ tương phản)</span>
                  <span className="font-mono-tabular text-slate-200">{theme.backdropDim}%</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={85}
                  value={theme.backdropDim}
                  onChange={(e) => update('backdropDim', Number(e.target.value))}
                  className="mt-1.5 w-full accent-cyan-400"
                />
              </div>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Hiệu ứng các vì sao trôi nhẹ</span>
                <input
                  type="checkbox"
                  checked={theme.starfieldEnabled}
                  onChange={(e) => update('starfieldEnabled', e.target.checked)}
                  className="h-4 w-4 rounded accent-cyan-400"
                />
              </label>
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="border-t border-white/10 pt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Màu nhấn chủ đạo</span>
              <span className="font-mono-tabular text-xs text-slate-400">
                {theme.accentColor.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const active = theme.accentColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => update('accentColor', preset.hex)}
                    title={preset.name}
                    className={`h-8 w-8 rounded-lg border transition-transform hover:scale-105 ${
                      active ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    aria-label={preset.name}
                  />
                );
              })}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10">
                <input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => update('accentColor', e.target.value)}
                  className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
                <span>Tự chọn</span>
              </label>
            </div>
          </div>

          {/* Timer Digit Color */}
          <div className="border-t border-white/10 pt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Màu chữ số đồng hồ</span>
              <span className="font-mono-tabular text-xs text-slate-400">
                {theme.timerColor.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {TIMER_COLOR_PRESETS.map((preset) => {
                const active = theme.timerColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => update('timerColor', preset.hex)}
                    title={preset.name}
                    className={`h-8 w-8 rounded-lg border transition-transform hover:scale-105 ${
                      active ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    aria-label={preset.name}
                  />
                );
              })}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10">
                <input
                  type="color"
                  value={theme.timerColor}
                  onChange={(e) => update('timerColor', e.target.value)}
                  className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
                <span>Tự chọn</span>
              </label>
            </div>
          </div>

          {/* Panel Surface Tint & Opacity */}
          <div className="border-t border-white/10 pt-5 space-y-3">
            <span className="block text-xs font-semibold text-slate-300">
              Tông màu & Độ mờ khung giao diện
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SURFACE_TINTS) as ThemeSettings['surfaceTint'][]).map((tintKey) => {
                const active = theme.surfaceTint === tintKey;
                return (
                  <button
                    key={tintKey}
                    type="button"
                    onClick={() => update('surfaceTint', tintKey)}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                      active
                        ? 'border-transparent text-slate-950 font-semibold'
                        : 'border-white/15 bg-black/35 text-slate-300 hover:bg-white/10'
                    }`}
                    style={active ? { backgroundColor: 'var(--accent-color)' } : undefined}
                  >
                    {SURFACE_TINTS[tintKey].label.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Độ đặc nền bảng</span>
                <span className="font-mono-tabular text-slate-200">{theme.surfaceOpacity}%</span>
              </div>
              <input
                type="range"
                min={45}
                max={95}
                value={theme.surfaceOpacity}
                onChange={(e) => update('surfaceOpacity', Number(e.target.value))}
                className="mt-1.5 w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* Timer Mechanics Settings */}
          <div className="border-t border-white/10 pt-5 space-y-3">
            <span className="block text-xs font-semibold text-slate-300">
              Cấu hình bấm giờ
            </span>
            <div>
              <span className="mb-1.5 block text-xs text-slate-400">
                Thời gian giữ phím Space để sẵn sàng
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 200, 300, 500].map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => update('holdToStartMs', ms)}
                    className={`font-mono-tabular rounded-md border py-1.5 text-xs font-medium transition-colors ${
                      theme.holdToStartMs === ms
                        ? 'border-transparent text-slate-950 font-semibold'
                        : 'border-white/15 bg-black/35 text-slate-300 hover:bg-white/10'
                    }`}
                    style={
                      theme.holdToStartMs === ms
                        ? { backgroundColor: 'var(--accent-color)' }
                        : undefined
                    }
                  >
                    {ms === 0 ? 'Ngay' : `${ms}ms`}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Âm thanh báo mốc 8s / 12s khi quan sát</span>
              <input
                type="checkbox"
                checked={theme.inspectionAudio}
                onChange={(e) => update('inspectionAudio', e.target.checked)}
                className="h-4 w-4 rounded accent-cyan-400"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Làm mờ giao diện phụ khi đang chạy giờ</span>
              <input
                type="checkbox"
                checked={theme.hideUiWhileTiming}
                onChange={(e) => update('hideUiWhileTiming', e.target.checked)}
                className="h-4 w-4 rounded accent-cyan-400"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_THEME)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Khôi phục giao diện mặc định</span>
          </button>
        </div>
      </div>
    </div>
  );
}
