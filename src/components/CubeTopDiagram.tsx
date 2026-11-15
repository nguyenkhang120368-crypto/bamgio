import { useMemo } from 'react';
import { DiagramMode } from '../data/algorithms';
import { FACE_COLORS, FaceId, invertAlgorithm, simulateNxNScramble } from '../utils/cubeState';

interface CubeTopDiagramProps {
  alg: string;
  mode: DiagramMode;
  size?: number;
}

const STICKER_HEX: Record<FaceId, string> = {
  ...FACE_COLORS,
  // Yellow top mode uses 'D' as yellow
  D: '#FACC15',
};

export function CubeTopDiagram({ alg, mode, size = 84 }: CubeTopDiagramProps) {
  const is2x2 = mode === '2x2-oll' || mode === '2x2-ll';
  const n = is2x2 ? 2 : 3;

  const cube = useMemo(() => {
    const setupMoves = invertAlgorithm(alg);
    return simulateNxNScramble(n, setupMoves, true);
  }, [alg, n]);

  // Helper to resolve sticker color based on diagram mode
  const getColor = (faceId: FaceId, isTopGrid: boolean) => {
    if (mode === 'oll' || mode === '2x2-oll') {
      // Yellow is 'D' in topColorYellow mode
      return faceId === 'D' ? '#FACC15' : '#1E293B';
    }
    if (mode === 'lse') {
      // Highlight U/D yellow/white edge orientation + M-slice
      if (faceId === 'D' || faceId === 'U') return '#FACC15';
      return isTopGrid ? '#1E293B' : '#334155';
    }
    if (mode === 'f2l' || mode === 'block') {
      return STICKER_HEX[faceId];
    }
    // 'll' or '2x2-ll': show full colors on top & side collar
    return STICKER_HEX[faceId];
  };

  // Layout geometry in 100x100 SVG viewBox
  const collar = 8;
  const pad = 4;
  const gridOrigin = pad + collar + 3; // 15
  const gridSize = 100 - gridOrigin * 2; // 70
  const gap = 2;
  const cell = (gridSize - gap * (n - 1)) / n;

  // Side collar indices on F, R, B, L (top row of each face: 0..n-1)
  // Note orientation of top row relative to U grid:
  // B top row: index 0 is right-most of U (col n-1), index n-1 is left-most of U (col 0)!
  // R top row: index 0 is bottom-most of U (row n-1), index n-1 is top-most of U (row 0)!
  // L top row: index 0 is top-most of U (row 0), index n-1 is bottom-most of U (row n-1)!
  // F top row: index 0 is left-most of U (col 0), index n-1 is right-most of U (col n-1)!

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0 select-none"
      role="img"
      aria-label="Sơ đồ nhận diện công thức"
    >
      {/* Top U face grid */}
      {cube.U.map((faceId, idx) => {
        const r = Math.floor(idx / n);
        const c = idx % n;
        const x = gridOrigin + c * (cell + gap);
        const y = gridOrigin + r * (cell + gap);
        return (
          <rect
            key={`u-${idx}`}
            x={x}
            y={y}
            width={cell}
            height={cell}
            rx={2.5}
            fill={getColor(faceId, true)}
            stroke="rgba(2, 6, 23, 0.85)"
            strokeWidth="1.2"
          />
        );
      })}

      {/* Back collar (top edge) */}
      {Array.from({ length: n }).map((_, c) => {
        const faceId = cube.B[n - 1 - c];
        const x = gridOrigin + c * (cell + gap);
        return (
          <rect
            key={`b-${c}`}
            x={x}
            y={pad}
            width={cell}
            height={collar}
            rx={2}
            fill={getColor(faceId, false)}
            stroke="rgba(2, 6, 23, 0.85)"
            strokeWidth="1"
          />
        );
      })}

      {/* Front collar (bottom edge) */}
      {Array.from({ length: n }).map((_, c) => {
        const faceId = cube.F[c];
        const x = gridOrigin + c * (cell + gap);
        return (
          <rect
            key={`f-${c}`}
            x={x}
            y={100 - pad - collar}
            width={cell}
            height={collar}
            rx={2}
            fill={getColor(faceId, false)}
            stroke="rgba(2, 6, 23, 0.85)"
            strokeWidth="1"
          />
        );
      })}

      {/* Left collar */}
      {Array.from({ length: n }).map((_, r) => {
        const faceId = cube.L[r];
        const y = gridOrigin + r * (cell + gap);
        return (
          <rect
            key={`l-${r}`}
            x={pad}
            y={y}
            width={collar}
            height={cell}
            rx={2}
            fill={getColor(faceId, false)}
            stroke="rgba(2, 6, 23, 0.85)"
            strokeWidth="1"
          />
        );
      })}

      {/* Right collar */}
      {Array.from({ length: n }).map((_, r) => {
        const faceId = cube.R[n - 1 - r];
        const y = gridOrigin + r * (cell + gap);
        return (
          <rect
            key={`r-${r}`}
            x={100 - pad - collar}
            y={y}
            width={collar}
            height={cell}
            rx={2}
            fill={getColor(faceId, false)}
            stroke="rgba(2, 6, 23, 0.85)"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}
