import { useMemo } from 'react';
import { PuzzleType } from '../types/cube';
import { FACE_COLORS, FaceId, simulateNxNScramble } from '../utils/cubeState';

interface ScrambleNetProps {
  puzzle: PuzzleType;
  scramble: string;
  size?: 'compact' | 'large';
}

const NXN_MAP: Partial<Record<PuzzleType, number>> = {
  '2x2': 2,
  '3x3': 3,
  '4x4': 4,
  '5x5': 5,
};

export function ScrambleNet({ puzzle, scramble, size = 'compact' }: ScrambleNetProps) {
  const n = NXN_MAP[puzzle];

  const cubeState = useMemo(() => {
    if (!n) return null;
    return simulateNxNScramble(n, scramble);
  }, [n, scramble]);

  if (!n || !cubeState) {
    // Clean geometric emblem for Pyraminx / Skewb
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-2 text-center">
        <svg
          width={size === 'large' ? 140 : 104}
          height={size === 'large' ? 100 : 74}
          viewBox="0 0 120 90"
          className="opacity-85"
          aria-label={`Mô hình ${puzzle}`}
        >
          {puzzle === 'pyraminx' ? (
            <g stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round">
              <polygon points="60,8 22,76 98,76" fill="#22C55E" fillOpacity="0.9" />
              <line x1="41" y1="42" x2="79" y2="42" />
              <line x1="31.5" y1="59" x2="88.5" y2="59" />
              <line x1="41" y1="42" x2="60" y2="76" />
              <line x1="79" y1="42" x2="60" y2="76" />
              <line x1="50.5" y1="59" x2="41" y2="76" />
              <line x1="69.5" y1="59" x2="79" y2="76" />
            </g>
          ) : (
            <g stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round">
              <rect x="30" y="15" width="60" height="60" rx="4" fill="#F8FAFC" />
              <polygon points="60,15 90,45 60,75 30,45" fill="#06B6D4" fillOpacity="0.85" />
            </g>
          )}
        </svg>
        <span className="text-[11px] text-slate-400">
          {puzzle === 'pyraminx' ? 'Sơ đồ Pyraminx' : 'Sơ đồ Skewb'}
        </span>
      </div>
    );
  }

  const cell = size === 'large' ? (n >= 5 ? 11 : n === 4 ? 13 : 17) : n >= 5 ? 6.5 : n === 4 ? 8 : 11;
  const gap = size === 'large' ? 1.5 : 1;
  const facePx = n * cell + (n - 1) * gap;
  const faceGap = size === 'large' ? 7 : 4;

  const totalW = facePx * 4 + faceGap * 3;
  const totalH = facePx * 3 + faceGap * 2;

  const facePositions: { face: FaceId; col: number; row: number }[] = [
    { face: 'U', col: 1, row: 0 },
    { face: 'L', col: 0, row: 1 },
    { face: 'F', col: 1, row: 1 },
    { face: 'R', col: 2, row: 1 },
    { face: 'B', col: 3, row: 1 },
    { face: 'D', col: 1, row: 2 },
  ];

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="select-none"
      role="img"
      aria-label={`Trạng thái Rubik ${n}x${n} sau khi xáo`}
    >
      {facePositions.map(({ face, col, row }) => {
        const ox = col * (facePx + faceGap);
        const oy = row * (facePx + faceGap);
        const stickers = cubeState[face];

        return (
          <g key={face} transform={`translate(${ox}, ${oy})`}>
            {stickers.map((stickerFace, idx) => {
              const r = Math.floor(idx / n);
              const c = idx % n;
              return (
                <rect
                  key={idx}
                  x={c * (cell + gap)}
                  y={r * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={size === 'large' ? 2 : 1.2}
                  fill={FACE_COLORS[stickerFace]}
                  stroke="rgba(2, 6, 23, 0.7)"
                  strokeWidth={0.6}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
