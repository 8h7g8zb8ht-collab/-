import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Sparkles,
  Eraser,
  Pencil,
  Undo2,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Award
} from 'lucide-react';
import {
  SudokuDifficulty,
  SudokuCell,
  createSudokuGame,
  getRemainingDigitCounts,
  findConflicts,
  isBoardSolved
} from '../../utils/sudoku';
import { soundManager } from '../../utils/audio';

interface SudokuGameProps {
  isMuted: boolean;
}

export const SudokuGame: React.FC<SudokuGameProps> = ({ isMuted }) => {
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>('gentle');
  const [board, setBoard] = useState<SudokuCell[][]>(() => createSudokuGame('gentle').cells);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [notesMode, setNotesMode] = useState<boolean>(false);
  const [highlightErrors, setHighlightErrors] = useState<boolean>(true);
  const [showTimer, setShowTimer] = useState<boolean>(true);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [hintsUsed, setHintsUsed] = useState<number>(0);

  // History stack for Undo
  const [history, setHistory] = useState<SudokuCell[][][]>([]);

  // Start new game
  const startNewGame = useCallback((diff: SudokuDifficulty = difficulty) => {
    const { cells } = createSudokuGame(diff);
    setBoard(cells);
    setSelectedCell(null);
    setHistory([]);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setIsSolved(false);
    setHintsUsed(0);
  }, [difficulty]);

  // Handle difficulty switch
  const handleDifficultyChange = (diff: SudokuDifficulty) => {
    setDifficulty(diff);
    startNewGame(diff);
  };

  // Timer ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && !isSolved) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isSolved]);

  // Conflicts list
  const conflicts = useMemo(() => {
    if (!highlightErrors) return [];
    return findConflicts(board);
  }, [board, highlightErrors]);

  const conflictSet = useMemo(() => {
    const s = new Set<string>();
    conflicts.forEach(c => s.add(`${c.row},${c.col}`));
    return s;
  }, [conflicts]);

  // Digits remaining count
  const remainingCounts = useMemo(() => {
    return getRemainingDigitCounts(board);
  }, [board]);

  // Currently selected cell value
  const selectedValue = useMemo(() => {
    if (!selectedCell) return 0;
    return board[selectedCell.row][selectedCell.col].value;
  }, [selectedCell, board]);

  // Place number or note
  const handleInputDigit = useCallback((num: number) => {
    if (!selectedCell || isSolved) return;
    const { row, col } = selectedCell;
    const cell = board[row][col];
    if (cell.isInitial) return;

    // Push previous board to history
    setHistory(prev => [...prev.slice(-20), board.map(r => r.map(c => ({ ...c, notes: [...c.notes] })))]);

    const newBoard = board.map(r => r.map(c => ({ ...c, notes: [...c.notes] })));
    const target = newBoard[row][col];

    if (notesMode) {
      // Toggle note
      const hasNote = target.notes.includes(num);
      target.notes = hasNote
        ? target.notes.filter(n => n !== num)
        : [...target.notes, num].sort((a, b) => a - b);
      soundManager.playMove();
    } else {
      // Set value (or toggle off if same)
      const nextVal = target.value === num ? 0 : num;
      target.value = nextVal;
      target.notes = []; // Clear notes when entering digit

      if (nextVal !== 0) {
        soundManager.playPlaceNumber(nextVal);

        // Also remove this digit from candidate notes in the same row, col, and block
        for (let c = 0; c < 9; c++) {
          newBoard[row][c].notes = newBoard[row][c].notes.filter(n => n !== nextVal);
        }
        for (let r = 0; r < 9; r++) {
          newBoard[r][col].notes = newBoard[r][col].notes.filter(n => n !== nextVal);
        }
        const bRow = Math.floor(row / 3) * 3;
        const bCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            newBoard[bRow + r][bCol + c].notes = newBoard[bRow + r][bCol + c].notes.filter(n => n !== nextVal);
          }
        }

        // Check if solved
        if (isBoardSolved(newBoard)) {
          setIsSolved(true);
          setIsTimerRunning(false);
          soundManager.playVictory();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#86efac', '#93c5fd', '#fde047', '#f472b6']
          });
        }
      } else {
        soundManager.playRemove();
      }
    }

    setBoard(newBoard);
  }, [selectedCell, isSolved, board, notesMode]);

  // Erase current cell
  const handleErase = useCallback(() => {
    if (!selectedCell || isSolved) return;
    const { row, col } = selectedCell;
    if (board[row][col].isInitial) return;

    setHistory(prev => [...prev.slice(-20), board.map(r => r.map(c => ({ ...c, notes: [...c.notes] })))]);

    const newBoard = board.map(r => r.map(c => ({ ...c, notes: [...c.notes] })));
    newBoard[row][col].value = 0;
    newBoard[row][col].notes = [];
    soundManager.playRemove();
    setBoard(newBoard);
  }, [selectedCell, isSolved, board]);

  // Undo move
  const handleUndo = useCallback(() => {
    if (history.length === 0 || isSolved) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setBoard(previous);
    soundManager.playMove();
  }, [history, isSolved]);

  // Hint: reveals a selected cell or a random empty cell
  const handleHint = useCallback(() => {
    if (isSolved) return;

    let targetRow = selectedCell?.row;
    let targetCol = selectedCell?.col;

    // If no cell selected or cell already filled correctly, find an empty cell
    if (
      targetRow === undefined ||
      targetCol === undefined ||
      board[targetRow][targetCol].value === board[targetRow][targetCol].solution
    ) {
      const emptyCells: { r: number; c: number }[] = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c].value !== board[r][c].solution) {
            emptyCells.push({ r, c });
          }
        }
      }
      if (emptyCells.length === 0) return;
      const pick = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      targetRow = pick.r;
      targetCol = pick.c;
    }

    setHistory(prev => [...prev.slice(-20), board.map(r => r.map(c => ({ ...c, notes: [...c.notes] })))]);
    const newBoard = board.map(r => r.map(c => ({ ...c, notes: [...c.notes] })));
    const sol = newBoard[targetRow][targetCol].solution;
    newBoard[targetRow][targetCol].value = sol;
    newBoard[targetRow][targetCol].notes = [];

    setSelectedCell({ row: targetRow, col: targetCol });
    setHintsUsed(h => h + 1);
    soundManager.playPlaceNumber(sol);
    setBoard(newBoard);

    if (isBoardSolved(newBoard)) {
      setIsSolved(true);
      setIsTimerRunning(false);
      soundManager.playVictory();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isSolved, selectedCell, board]);

  // Keyboard navigation & digit input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSolved) return;

      // Digits 1-9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleInputDigit(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleErase();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setNotesMode(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setSelectedCell(curr => {
          if (!curr) return { row: 0, col: 0 };
          let { row, col } = curr;
          if (e.key === 'ArrowUp') row = (row - 1 + 9) % 9;
          if (e.key === 'ArrowDown') row = (row + 1) % 9;
          if (e.key === 'ArrowLeft') col = (col - 1 + 9) % 9;
          if (e.key === 'ArrowRight') col = (col + 1) % 9;
          return { row, col };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInputDigit, handleErase, handleUndo, isSolved]);

  // Format timer
  const formattedTime = useMemo(() => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [timerSeconds]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top HUD: Level selector & stats */}
      <div className="w-full max-w-lg flex flex-col gap-3 pb-3">
        <div className="flex items-center justify-between text-xs">
          {/* Level Switcher */}
          <div className="flex items-center p-1 bg-stone-200/70 dark:bg-stone-800/80 rounded-lg text-xs">
            {(
              [
                { id: 'gentle', label: 'Gentle' },
                { id: 'balanced', label: 'Balanced' },
                { id: 'mindful', label: 'Mindful' },
                { id: 'master', label: 'Master' }
              ] as const
            ).map(lvl => (
              <button
                key={lvl.id}
                onClick={() => handleDifficultyChange(lvl.id)}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap cursor-pointer ${
                  difficulty === lvl.id
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Timer & Zen mode toggle */}
          <div className="flex items-center gap-2">
            {showTimer ? (
              <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-stone-600 dark:text-stone-300">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{formattedTime}</span>
              </div>
            ) : (
              <span className="text-xs text-stone-400 italic">Zen Mode</span>
            )}

            <button
              onClick={() => setShowTimer(prev => !prev)}
              aria-label="Toggle Timer"
              title={showTimer ? 'Hide timer for Zen Mode' : 'Show timer'}
              className="p-1.5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              {showTimer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 9x9 Sudoku Grid Container */}
      <div className="relative w-full max-w-lg aspect-square bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-2 sm:p-3 select-none">
        <div className="grid grid-cols-9 grid-rows-9 w-full h-full border border-stone-300 dark:border-stone-700 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
              const isSameRowOrCol =
                selectedCell && (selectedCell.row === rIdx || selectedCell.col === cIdx);
              const isSameBlock =
                selectedCell &&
                Math.floor(selectedCell.row / 3) === Math.floor(rIdx / 3) &&
                Math.floor(selectedCell.col / 3) === Math.floor(cIdx / 3);
              const isSameNumber =
                selectedValue > 0 && cell.value === selectedValue && !isSelected;
              const isConflicted = conflictSet.has(`${rIdx},${cIdx}`);

              // Box border boundaries (thick border between 3x3 blocks)
              const borderRight = cIdx % 3 === 2 && cIdx !== 8 ? 'border-r-2 border-r-stone-400 dark:border-r-stone-600' : 'border-r border-r-stone-200/80 dark:border-r-stone-800/80';
              const borderBottom = rIdx % 3 === 2 && rIdx !== 8 ? 'border-b-2 border-b-stone-400 dark:border-b-stone-600' : 'border-b border-b-stone-200/80 dark:border-b-stone-800/80';

              // Background styling for calm legibility
              let bg = 'bg-white dark:bg-stone-900';
              if (isSelected) {
                bg = 'bg-amber-100 dark:bg-amber-950/40';
              } else if (isSameNumber) {
                bg = 'bg-amber-50/80 dark:bg-amber-900/20';
              } else if (isSameRowOrCol || isSameBlock) {
                bg = 'bg-stone-50 dark:bg-stone-800/50';
              }

              // Text styling
              let textColor = cell.isInitial
                ? 'font-bold text-stone-900 dark:text-stone-100'
                : 'font-medium text-emerald-800 dark:text-emerald-300';
              if (isConflicted) {
                textColor = 'font-bold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40';
              }

              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => setSelectedCell({ row: rIdx, col: cIdx })}
                  className={`relative flex items-center justify-center transition-colors ${borderRight} ${borderBottom} ${bg} cursor-pointer focus:outline-hidden`}
                >
                  {cell.value !== 0 ? (
                    <span className={`text-base sm:text-lg font-mono tabular-nums leading-none ${textColor}`}>
                      {cell.value}
                    </span>
                  ) : (
                    /* Pencil candidate notes 3x3 micro-grid */
                    <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5 text-[8px] sm:text-[9px] font-mono text-stone-400 dark:text-stone-500 leading-none">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <div key={n} className="flex items-center justify-center">
                          {cell.notes.includes(n) ? n : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Solved Victory Overlay */}
        {isSolved && (
          <div className="absolute inset-0 m-2 sm:m-3 rounded-xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-stone-900 dark:text-stone-100 mb-1">
              Peaceful Harmony
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Puzzle solved in <span className="font-mono font-medium text-stone-700 dark:text-stone-300">{formattedTime}</span>
              {hintsUsed > 0 && ` with ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}`}.
            </p>
            <button
              onClick={() => startNewGame()}
              className="py-2.5 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-medium transition-transform active:scale-98 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Next Puzzle</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Actions Row (Undo, Notes Mode, Erase, Hint, Reset) */}
      <div className="w-full max-w-lg flex items-center justify-between mt-3 px-1">
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Undo2 className="w-4 h-4" />
          <span className="text-[11px]">Undo</span>
        </button>

        <button
          onClick={handleErase}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <Eraser className="w-4 h-4" />
          <span className="text-[11px]">Erase</span>
        </button>

        <button
          onClick={() => setNotesMode(m => !m)}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer ${
            notesMode
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-medium'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
          }`}
        >
          <Pencil className="w-4 h-4" />
          <span className="text-[11px]">Notes {notesMode ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={handleHint}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-[11px]">Hint</span>
        </button>

        <button
          onClick={() => startNewGame()}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-[11px]">Restart</span>
        </button>
      </div>

      {/* Tactile 1-9 Number Pad */}
      <div className="w-full max-w-lg grid grid-cols-9 gap-1.5 sm:gap-2 mt-3 px-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
          const remaining = remainingCounts[num] ?? 0;
          const isCompleted = remaining === 0;

          return (
            <button
              key={num}
              onClick={() => handleInputDigit(num)}
              disabled={isCompleted && !notesMode}
              className={`flex flex-col items-center justify-center py-2.5 sm:py-3 rounded-xl border transition-all cursor-pointer select-none ${
                isCompleted && !notesMode
                  ? 'bg-stone-100/60 dark:bg-stone-800/40 border-stone-200/50 dark:border-stone-800 text-stone-300 dark:text-stone-600'
                  : 'bg-white dark:bg-stone-800/90 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 active:scale-95 shadow-2xs text-stone-800 dark:text-stone-100'
              }`}
            >
              <span className="font-mono text-base sm:text-lg font-semibold leading-none">{num}</span>
              <span className="text-[9px] text-stone-400 font-mono mt-1 tabular-nums">
                {isCompleted ? '✓' : remaining}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
