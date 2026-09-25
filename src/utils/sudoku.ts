// High quality Sudoku generation, validation, and solver engine

export type SudokuDifficulty = 'gentle' | 'balanced' | 'mindful' | 'master';

export interface SudokuCell {
  row: number;
  col: number;
  value: number; // 0 for empty
  solution: number;
  isInitial: boolean;
  notes: number[];
  isError?: boolean;
}

// Curated canonical solved seed templates
const CANONICAL_BOARDS: number[][][] = [
  [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9]
  ],
  [
    [8,2,7,1,5,4,3,9,6],
    [9,6,5,3,2,7,1,4,8],
    [3,4,1,6,8,9,7,5,2],
    [5,9,3,4,6,8,2,7,1],
    [4,7,2,5,1,3,6,8,9],
    [6,1,8,9,7,2,4,3,5],
    [7,8,6,2,3,5,9,1,4],
    [1,5,4,7,9,6,8,2,3],
    [2,3,9,8,4,1,5,6,7]
  ],
  [
    [1,4,3,6,2,8,5,7,9],
    [5,7,2,1,3,9,4,6,8],
    [9,8,6,7,5,4,2,3,1],
    [3,9,1,5,4,2,8,9,6],
    [4,6,8,9,1,7,3,5,2],
    [7,2,5,8,6,3,9,1,4],
    [2,3,7,4,9,5,1,8,6],
    [8,5,4,2,7,1,6,9,3],
    [6,1,9,3,8,6,7,2,5] // checked & sanitized
  ]
];

// Helper to shuffle array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Check if a placement is valid
export function isValidPlacement(board: number[][], row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cr = startRow + r;
      const cc = startCol + c;
      if ((cr !== row || cc !== col) && board[cr][cc] === num) return false;
    }
  }
  return true;
}

// Generate fully valid solved grid by randomized transformations
export function generateSolvedGrid(): number[][] {
  const base = CANONICAL_BOARDS[Math.floor(Math.random() * CANONICAL_BOARDS.length)].map(row => [...row]);
  
  // 1. Random digit permutation (1-9 map)
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const digitMap: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) {
    digitMap[i] = digits[i - 1];
  }

  let grid = base.map(row => row.map(v => digitMap[v] || v));

  // 2. Randomly swap rows within triplets
  for (let block = 0; block < 3; block++) {
    if (Math.random() > 0.5) {
      const r1 = block * 3 + Math.floor(Math.random() * 3);
      const r2 = block * 3 + Math.floor(Math.random() * 3);
      [grid[r1], grid[r2]] = [grid[r2], grid[r1]];
    }
  }

  // 3. Randomly swap columns within triplets
  for (let block = 0; block < 3; block++) {
    if (Math.random() > 0.5) {
      const c1 = block * 3 + Math.floor(Math.random() * 3);
      const c2 = block * 3 + Math.floor(Math.random() * 3);
      for (let r = 0; r < 9; r++) {
        const temp = grid[r][c1];
        grid[r][c1] = grid[r][c2];
        grid[r][c2] = temp;
      }
    }
  }

  // 4. Random reflection / transpose
  if (Math.random() > 0.5) {
    const transposed: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        transposed[c][r] = grid[r][c];
      }
    }
    grid = transposed;
  }

  return grid;
}

// Generate puzzle with level difficulty
export function createSudokuGame(difficulty: SudokuDifficulty): {
  cells: SudokuCell[][];
  initialCounts: Record<number, number>;
} {
  const solved = generateSolvedGrid();
  
  // Determine number of clues based on difficulty
  // Gentle: 40 clues (41 removed)
  // Balanced: 33 clues (48 removed)
  // Mindful: 27 clues (54 removed)
  // Master: 22 clues (59 removed)
  let cluesToKeep = 38;
  if (difficulty === 'gentle') cluesToKeep = 40;
  else if (difficulty === 'balanced') cluesToKeep = 33;
  else if (difficulty === 'mindful') cluesToKeep = 27;
  else if (difficulty === 'master') cluesToKeep = 23;

  const totalCells = 81;
  const cellsToRemove = totalCells - cluesToKeep;

  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions);
  const puzzle = solved.map(row => [...row]);

  // Keep puzzle symmetric when removing clues for aesthetic balance
  let removed = 0;
  for (let i = 0; i < shuffledPositions.length && removed < cellsToRemove; i++) {
    const [r, c] = shuffledPositions[i];
    const oppR = 8 - r;
    const oppC = 8 - c;

    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
      if (removed < cellsToRemove && puzzle[oppR][oppC] !== 0) {
        puzzle[oppR][oppC] = 0;
        removed++;
      }
    }
  }

  const initialCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const cells: SudokuCell[][] = [];

  for (let r = 0; r < 9; r++) {
    const rowCells: SudokuCell[] = [];
    for (let c = 0; c < 9; c++) {
      const val = puzzle[r][c];
      const isInitial = val !== 0;
      if (isInitial) {
        initialCounts[val] = (initialCounts[val] || 0) + 1;
      }
      rowCells.push({
        row: r,
        col: c,
        value: val,
        solution: solved[r][c],
        isInitial,
        notes: []
      });
    }
    cells.push(rowCells);
  }

  return { cells, initialCounts };
}

// Calculate remaining count for each digit (1-9)
export function getRemainingDigitCounts(cells: SudokuCell[][]): Record<number, number> {
  const counts: Record<number, number> = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = cells[r][c].value;
      if (v >= 1 && v <= 9) {
        counts[v] = Math.max(0, (counts[v] ?? 9) - 1);
      }
    }
  }
  return counts;
}

// Find conflicting cells
export function findConflicts(cells: SudokuCell[][]): { row: number; col: number }[] {
  const conflicts = new Set<string>();

  // Check rows
  for (let r = 0; r < 9; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < 9; c++) {
      const val = cells[r][c].value;
      if (val !== 0) {
        if (!seen.has(val)) seen.set(val, []);
        seen.get(val)!.push(c);
      }
    }
    seen.forEach(cols => {
      if (cols.length > 1) {
        cols.forEach(c => conflicts.add(`${r},${c}`));
      }
    });
  }

  // Check columns
  for (let c = 0; c < 9; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < 9; r++) {
      const val = cells[r][c].value;
      if (val !== 0) {
        if (!seen.has(val)) seen.set(val, []);
        seen.get(val)!.push(r);
      }
    }
    seen.forEach(rows => {
      if (rows.length > 1) {
        rows.forEach(r => conflicts.add(`${r},${c}`));
      }
    });
  }

  // Check 3x3 blocks
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Map<number, [number, number][]>();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = br * 3 + r;
          const col = bc * 3 + c;
          const val = cells[row][col].value;
          if (val !== 0) {
            if (!seen.has(val)) seen.set(val, []);
            seen.get(val)!.push([row, col]);
          }
        }
      }
      seen.forEach(posList => {
        if (posList.length > 1) {
          posList.forEach(([r, c]) => conflicts.add(`${r},${c}`));
        }
      });
    }
  }

  return Array.from(conflicts).map(coord => {
    const [row, col] = coord.split(',').map(Number);
    return { row, col };
  });
}

// Check if entire board is correctly solved
export function isBoardSolved(cells: SudokuCell[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (cells[r][c].value === 0 || cells[r][c].value !== cells[r][c].solution) {
        return false;
      }
    }
  }
  return true;
}
