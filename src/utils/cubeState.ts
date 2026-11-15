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

function rotateFaceCCW(face: FaceId[], n: number): FaceId[] {
  return rotateFaceCW(rotateFaceCW(rotateFaceCW(face, n), n), n);
}

function turnU(cube: CubeFaces, n: number, layer: number) {
  if (layer === 0) cube.U = rotateFaceCW(cube.U, n);
  if (layer === n - 1) cube.D = rotateFaceCCW(cube.D, n);
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
  if (layer === n - 1) cube.U = rotateFaceCCW(cube.U, n);
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
  if (layer === n - 1) cube.L = rotateFaceCCW(cube.L, n);
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
  if (layer === n - 1) cube.R = rotateFaceCCW(cube.R, n);
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
  if (layer === n - 1) cube.B = rotateFaceCCW(cube.B, n);
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
  if (layer === n - 1) cube.F = rotateFaceCCW(cube.F, n);
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

function parseMoveTokens(notation: string): string[] {
  return notation
    .replace(/[()[\]]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function invertAlgorithm(alg: string): string {
  const tokens = parseMoveTokens(alg);
  return tokens
    .reverse()
    .map((tok) => {
      if (tok.endsWith('2')) return tok;
      if (tok.endsWith("'")) return tok.slice(0, -1);
      return `${tok}'`;
    })
    .join(' ');
}

export function simulateNxNScramble(
  n: number,
  scramble: string,
  topColorYellow = false
): CubeFaces {
  const cube = createSolvedCube(n);

  if (topColorYellow) {
    // Standard CFOP/Roux/ZB Last Layer orientation: Yellow on Top (U), White on Bottom (D)
    const len = n * n;
    cube.U = Array(len).fill('D');
    cube.D = Array(len).fill('U');
    cube.F = Array(len).fill('F');
    cube.B = Array(len).fill('B');
    cube.L = Array(len).fill('R');
    cube.R = Array(len).fill('L');
  }

  const tokens = parseMoveTokens(scramble);

  for (const token of tokens) {
    const mod = token.endsWith('2') ? '2' : token.endsWith("'") ? "'" : '';
    const base = mod ? token.slice(0, -1) : token;
    const turns = mod === '2' ? 2 : mod === "'" ? 3 : 1;

    // Handle cube rotations x, y, z
    if (base === 'x' || base === 'y' || base === 'z') {
      const fn = base === 'x' ? turnR : base === 'y' ? turnU : turnF;
      for (let t = 0; t < turns; t++) {
        for (let layer = 0; layer < n; layer++) {
          fn(cube, n, layer);
        }
      }
      continue;
    }

    // Handle slice moves M (follows L), E (follows D), S (follows F)
    if (base === 'M' || base === 'E' || base === 'S') {
      if (n < 3) continue;
      const fn = base === 'M' ? turnL : base === 'E' ? turnD : turnF;
      for (let t = 0; t < turns; t++) {
        fn(cube, n, 1);
      }
      continue;
    }

    // Standard & wide moves (R, Rw, r, etc.)
    const upperMatch = base.match(/^([UDLRFB])(w?)$/);
    const lowerMatch = base.match(/^([udlrfb])$/);

    let face: FaceId | null = null;
    let isWide = false;

    if (upperMatch) {
      face = upperMatch[1] as FaceId;
      isWide = upperMatch[2] === 'w';
    } else if (lowerMatch) {
      face = lowerMatch[1].toUpperCase() as FaceId;
      isWide = true;
    }

    if (!face) continue;

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
