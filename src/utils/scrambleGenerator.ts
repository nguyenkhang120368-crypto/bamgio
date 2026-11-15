import { PuzzleType } from '../types/cube';

export const PUZZLE_LABELS: Record<PuzzleType, string> = {
  '3x3': '3×3×3',
  '2x2': '2×2×2',
  '4x4': '4×4×4',
  '5x5': '5×5×5',
  pyraminx: 'Pyraminx',
  skewb: 'Skewb',
};

const MODIFIERS = ['', "'", '2'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates standard WCA-style scrambles avoiding consecutive same-face
 * and redundant opposite-face axis repetitions (e.g., R L R).
 */
export function generateScramble(puzzle: PuzzleType): string {
  if (puzzle === '2x2') {
    const faces = ['U', 'R', 'F'];
    const length = 10;
    const moves: string[] = [];
    let prevFace = '';
    for (let i = 0; i < length; i++) {
      const candidates = faces.filter((f) => f !== prevFace);
      const face = pickRandom(candidates);
      prevFace = face;
      moves.push(face + pickRandom(MODIFIERS));
    }
    return moves.join(' ');
  }

  if (puzzle === 'pyraminx') {
    const faces = ['U', 'L', 'R', 'B'];
    const tips = ['u', 'l', 'r', 'b'];
    const moves: string[] = [];
    let prevFace = '';
    for (let i = 0; i < 9; i++) {
      const face = pickRandom(faces.filter((f) => f !== prevFace));
      prevFace = face;
      moves.push(face + pickRandom(['', "'"]));
    }
    for (const tip of tips) {
      const r = Math.random();
      if (r < 0.33) moves.push(tip);
      else if (r < 0.66) moves.push(`${tip}'`);
    }
    return moves.join(' ');
  }

  if (puzzle === 'skewb') {
    const faces = ['U', 'L', 'R', 'B'];
    const moves: string[] = [];
    let prevFace = '';
    for (let i = 0; i < 9; i++) {
      const face = pickRandom(faces.filter((f) => f !== prevFace));
      prevFace = face;
      moves.push(face + pickRandom(['', "'"]));
    }
    return moves.join(' ');
  }

  // NxN cubes: 3x3, 4x4, 5x5
  type Axis = 'x' | 'y' | 'z';
  interface FaceDef {
    face: string;
    axis: Axis;
  }

  const baseFaces: FaceDef[] = [
    { face: 'R', axis: 'x' },
    { face: 'L', axis: 'x' },
    { face: 'U', axis: 'y' },
    { face: 'D', axis: 'y' },
    { face: 'F', axis: 'z' },
    { face: 'B', axis: 'z' },
  ];

  const wideFaces: FaceDef[] = [
    { face: 'Rw', axis: 'x' },
    { face: 'Uw', axis: 'y' },
    { face: 'Fw', axis: 'z' },
  ];

  const all5x5Wide: FaceDef[] = [
    { face: 'Rw', axis: 'x' },
    { face: 'Lw', axis: 'x' },
    { face: 'Uw', axis: 'y' },
    { face: 'Dw', axis: 'y' },
    { face: 'Fw', axis: 'z' },
    { face: 'Bw', axis: 'z' },
  ];

  let pool = baseFaces;
  let length = 20;
  if (puzzle === '4x4') {
    pool = [...baseFaces, ...wideFaces];
    length = 42;
  } else if (puzzle === '5x5') {
    pool = [...baseFaces, ...all5x5Wide];
    length = 60;
  }

  const moves: string[] = [];
  let prevFace = '';
  let prevAxis: Axis | '' = '';
  let secondPrevAxis: Axis | '' = '';
  let secondPrevFace = '';

  for (let i = 0; i < length; i++) {
    const candidates = pool.filter((item) => {
      if (item.face === prevFace) return false;
      // Avoid R L R or U D U same-axis oscillation
      if (item.axis === prevAxis && item.axis === secondPrevAxis && item.face === secondPrevFace) {
        return false;
      }
      if (item.axis === prevAxis && item.face[0] === prevFace[0]) {
        // Avoid R followed by Rw on 4x4/5x5
        return false;
      }
      return true;
    });

    const chosen = pickRandom(candidates);
    moves.push(chosen.face + pickRandom(MODIFIERS));

    secondPrevFace = prevFace;
    secondPrevAxis = prevAxis;
    prevFace = chosen.face;
    prevAxis = chosen.axis;
  }

  return moves.join(' ');
}
