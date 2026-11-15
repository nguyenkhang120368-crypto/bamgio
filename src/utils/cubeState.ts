export type FaceId = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

export type CubeFaces = Record<FaceId, FaceId[]>;

export const FACE_COLORS: Record<FaceId, string> = {
  U: '#F8FAFC', // White
  D: '#FACC15', // Yellow
  F: '#22C55E', // Green
  B: '#3B82F6', // Blue
  R: '#EF4444', // Red
  L: '#F97316', // Orange
};

function createSolvedCube(n: number): CubeFaces {
  const len = n * n;
  return {
    U: Array(len).fill('U'),
    D: Array(len).fill('D'),
    L: Array(len).fill('L'),
    R: Array(len).fill('R'),
    F: Array(len).fill('F'),
    B: Array(len).fill('B'),
  };
}

function rotateFaceCW(face: FaceId[], n: number): FaceId[] {
  const next = new Array<FaceId>(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      next[c * n + (n - 1 - r)] = face[r * n + c];
    }
  }
  return next;
}

function turnU(cube: CubeFaces, n: number, layer: number) {
  if (layer === 0) cube.U = rotateFaceCW(cube.U, n);
  const r = layer;
  for (let i = 0; i < n; i++) {
    const tmp = cube.F[r * n + i];
    cube.F[r * n + i] = cube.R[r * n + i];
    cube.R[r * n + i] = cube.B[r * n + i];
    cube.B[r * n + i] = cube.L[r * n + i];
    cube.L[r * n + i] = tmp;
  }
}

function turnD(cube: CubeFaces, n: number, layer: number) {
  if (layer === 0) cube.D = rotateFaceCW(cube.D, n);
  const r = n - 1 - layer;
  for (let i = 0; i < n; i++) {
    const tmp = cube.F[r * n + i];
    cube.F[r * n + i] = cube.L[r * n + i];
    cube.L[r * n + i] = cube.B[r * n + i];
    cube.B[r * n + i] = cube.R[r * n + i];
    cube.R[r * n + i] = tmp;
  }
}

function turnR(cube: CubeFaces, n: number, layer: number) {
  if (layer === 0) cube.R = rotateFaceCW(cube.R, n);
  const c = n - 1 - layer;
  for (let r = 0; r < n; r++) {
    const tmp = cube.U[r * n + c];
    cube.U[r * n + c] = cube.F[r * n + c];
    cube.F[r * n + c] = cube.D[r * n + c];
    cube.D[r * n + c] = cube.B[(n - 1 - r) * n + layer];
    cube.B[(n - 1 - r) * n + layer] = tmp;
  }
}

function turnL(cube: CubeFaces, n: number, layer: number) {
  if (layer === 0) cube.L = rotateFaceCW(cube.L, n);
  const c = layer;
  const bCol = n - 1 - layer;
  for (let r = 0; r < n; r++) {
    const tmp = cube.U[r * n + c];
    cube.U[r * n + c] = cube.B[(n - 1 - r) * n + bCol];
    cube.B[(n - 1 - r) * n + bCol] = cube.D[r * n + c];
    cube.D[r * n + c] = cube.F[r * n + c];
    cube.F[r * n + c] = tmp;
  }
}

function turnF(cube: CubeFaces, n: number, layer: number) {
  if (layer === 0) cube.F = rotateFaceCW(cube.F, n);
  const uRow = n - 1 - layer;
  const rCol = layer;
  const dRow = layer;
  const lCol = n - 1 - layer;
  for (let i = 0; i < n; i++) {
    const tmp = cube.U[uRow * n + i];
    cube.U[uRow * n + i] = cube.L[(n - 1 - i) * n + lCol];
    cube.L[(n - 1 - i) * n + lCol] = cube.D[dRow * n + (n - 1 - i)];
    cube.D[dRow * n + (n - 1 - i)] = cube.R[i * n + rCol];
    cube.R[i * n + rCol] = tmp;
  }
}

function turnB(cube: CubeFaces, n: number, layer: number) {
  if (layer === 0) cube.B = rotateFaceCW(cube.B, n);
  const uRow = layer;
  const lCol = layer;
  const dRow = n - 1 - layer;
  const rCol = n - 1 - layer;
  for (let i = 0; i < n; i++) {
    const tmp = cube.U[uRow * n + i];
    cube.U[uRow * n + i] = cube.R[i * n + rCol];
    cube.R[i * n + rCol] = cube.D[dRow * n + (n - 1 - i)];
    cube.D[dRow * n + (n - 1 - i)] = cube.L[(n - 1 - i) * n + lCol];
    cube.L[(n - 1 - i) * n + lCol] = tmp;
  }
}

const TURN_FNS: Record<FaceId, (cube: CubeFaces, n: number, layer: number) => void> = {
  U: turnU,
  D: turnD,
  L: turnL,
  R: turnR,
  F: turnF,
  B: turnB,
};

export function simulateNxNScramble(n: number, scramble: string): CubeFaces {
  const cube = createSolvedCube(n);
  const tokens = scramble.trim().split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const match = token.match(/^([UDLRFB])(w?)(['2]?)$/);
    if (!match) continue;
    const face = match[1] as FaceId;
    const isWide = match[2] === 'w';
    const mod = match[3];
    const turns = mod === '2' ? 2 : mod === "'" ? 3 : 1;
    const depth = isWide ? 2 : 1;
    const fn = TURN_FNS[face];

    for (let t = 0; t < turns; t++) {
      for (let layer = 0; layer < Math.min(depth, n); layer++) {
        fn(cube, n, layer);
      }
    }
  }

  return cube;
}
