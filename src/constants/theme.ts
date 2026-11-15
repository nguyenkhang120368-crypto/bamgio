import nebulaImg from '../assets/images/cosmos_deep_nebula_1794717767698.jpg';
import galacticImg from '../assets/images/cosmos_galactic_core_1794717767760.jpg';
import horizonImg from '../assets/images/cosmos_event_horizon_1794717768974.jpg';
import { CosmicBackdropId, Session, ThemeSettings } from '../types/cube';
import { generateScramble } from '../utils/scrambleGenerator';

export interface BackdropOption {
  id: CosmicBackdropId;
  label: string;
  subtitle: string;
  imageSrc: string | null;
  fallbackGradient: string;
}

export const COSMIC_BACKDROPS: BackdropOption[] = [
  {
    id: 'nebula',
    label: 'Tinh vân Carina',
    subtitle: 'Đám mây bụi thiên hà xanh thẫm',
    imageSrc: nebulaImg,
    fallbackGradient:
      'radial-gradient(ellipse at 30% 25%, #0f2942 0%, #070b18 55%, #03040a 100%)',
  },
  {
    id: 'galactic',
    label: 'Lõi Thiên Hà',
    subtitle: 'Dải Ngân Hà ánh hổ phách và tinh tú',
    imageSrc: galacticImg,
    fallbackGradient:
      'radial-gradient(ellipse at 55% 45%, #2a1e16 0%, #0b0e18 55%, #04050a 100%)',
  },
  {
    id: 'horizon',
    label: 'Chân Trời Sao',
    subtitle: 'Biển sao sâu thẳm tối giản',
    imageSrc: horizonImg,
    fallbackGradient:
      'radial-gradient(ellipse at 50% 80%, #17162e 0%, #060812 60%, #020308 100%)',
  },
  {
    id: 'void',
    label: 'Không gian thuần túy',
    subtitle: 'Nền đen vũ trụ sâu thẳm kết hợp sao trôi',
    imageSrc: null,
    fallbackGradient:
      'radial-gradient(ellipse at 50% 35%, #0d1528 0%, #060811 55%, #030408 100%)',
  },
];

export const ACCENT_PRESETS = [
  { name: 'Lam Pulsar', hex: '#06B6D4' },
  { name: 'Hổ Phách Mặt Trời', hex: '#F59E0B' },
  { name: 'Xanh Thiên Hà', hex: '#3B82F6' },
  { name: 'Ngọc Lục Bảo', hex: '#10B981' },
  { name: 'Hồng Siêu Tân Tinh', hex: '#F43F5E' },
  { name: 'Tím Tinh Vân', hex: '#8B5CF6' },
];

export const TIMER_COLOR_PRESETS = [
  { name: 'Trắng Sao Băng', hex: '#F8FAFC' },
  { name: 'Lam Băng', hex: '#A5F3FC' },
  { name: 'Vàng Kim Tinh', hex: '#FDE68A' },
  { name: 'Lục Bắc Cực', hex: '#A7F3D0' },
  { name: 'Bạc Ánh Trăng', hex: '#CBD5E1' },
];

export const SURFACE_TINTS: Record<
  ThemeSettings['surfaceTint'],
  { label: string; rgb: string }
> = {
  obsidian: { label: 'Obsidian Đen Sâu', rgb: '8, 12, 23' },
  midnight: { label: 'Xanh Đêm Vũ Trụ', rgb: '12, 18, 38' },
  slate: { label: 'Than Chì Tinh Gọn', rgb: '17, 24, 39' },
};

export const DEFAULT_THEME: ThemeSettings = {
  backdrop: 'nebula',
  backdropDim: 48,
  starfieldEnabled: true,
  accentColor: '#06B6D4',
  timerColor: '#F8FAFC',
  surfaceTint: 'obsidian',
  surfaceOpacity: 76,
  holdToStartMs: 300,
  useInspection: false,
  inspectionAudio: true,
  hideUiWhileTiming: true,
};

export function createInitialSessions(): Session[] {
  return [
    {
      id: 'session-3x3-main',
      name: '3×3×3 Chính',
      puzzle: '3x3',
      createdAt: Date.now(),
      solves: [],
    },
    {
      id: 'session-2x2-speed',
      name: '2×2×2 Tốc Độ',
      puzzle: '2x2',
      createdAt: Date.now() - 1000,
      solves: [],
    },
  ];
}

export function getInitialScrambleForSession(session: Session): string {
  return generateScramble(session.puzzle);
}
