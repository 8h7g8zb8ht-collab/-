import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Undo2,
  Trophy,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface Zen2048Props {
  isMuted: boolean;
}

type BoardMatrix = number[][];

const TILE_STYLES: Record<number, { bg: string; text: string; shadow?: string }> = {
  2: { bg: 'bg-[#F4EFEA] dark:bg-[#2A2E39]', text: 'text-stone-700 dark:text-stone-200' },
  4: { bg: 'bg-[#EADBC8] dark:bg-[#343A48]', text: 'text-stone-800 dark:text-stone-100' },
  8: { bg: 'bg-[#D8C4B6] dark:bg-[#3E4556]', text: 'text-stone-800 dark:text-stone-100' },
  16: { bg: 'bg-[#D5B4B4] dark:bg-[#4E3D48]', text: 'text-stone-900 dark:text-stone-50' },
  32: { bg: 'bg-[#C5D8A4] dark:bg-[#354B3E]', text: 'text-stone-900 dark:text-stone-50' },
  64: { bg: 'bg-[#A8BF8B] dark:bg-[#2F4437]', text: 'text-stone-900 dark:text-stone-50' },
  128: { bg: 'bg-[#A0C4E2] dark:bg-[#2C4156]', text: 'text-stone-900 dark:text-stone-50' },
  256: { bg: 'bg-[#89B0DC] dark:bg-[#263C53]', text: 'text-white' },
  512: { bg: 'bg-[#E5A9A9] dark:bg-[#5C3636]', text: 'text-white' },
  1024: { bg: 'bg-[#C98B6B] dark:bg-[#5C3B29]', text: 'text-white' },
  2048: { bg: 'bg-[#D6B265] dark:bg-[#665022]', text: 'text-white', shadow: 'shadow-md shadow-amber-500/20 ring-2 ring-amber-300' }
};

export const Zen2048: React.FC<Zen2048Props> = ({ isMuted }) => {
  const [board, setBoard] = useState<BoardMatrix>(() => initBoard());
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('solace_2048_highscore') || '0', 10);
  });
  const [history, setHistory] = useState<{ board: BoardMatrix; score: number }[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false);

  // Touch start ref
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function initBoard(): BoardMatrix {
    const empty: BoardMatrix = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    addRandomTile(empty);
    addRandomTile(empty);
    return empty;
  }

  function addRandomTile(grid: BoardMatrix): boolean {
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) emptyCells.push([r, c]);
      }
    }
    if (emptyCells.length === 0) return false;
    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  const restartGame = useCallback(() => {
    const newBoard = initBoard();
    setBoard(newBoard);
    setScore(0);
    setHistory([]);
    setIsGameOver(false);
    setHasWon(false);
    setKeepPlaying(false);
  }, []);

  // Slide & merge row
  function slideRow(row: number[]): { newRow: number[]; gainedScore: number; mergedVals: number[] } {
    const filtered = row.filter(val => val !== 0);
    const newRow: number[] = [];
    const mergedVals: number[] = [];
    let gainedScore = 0;

    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        const merged = filtered[i] * 2;
        newRow.push(merged);
        mergedVals.push(merged);
        gainedScore += merged;
        i++; // skip next since merged
      } else {
        newRow.push(filtered[i]);
      }
    }
    while (newRow.length < 4) {
      newRow.push(0);
    }
    return { newRow, gainedScore, mergedVals };
  }

  // Move in direction
  const move = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (isGameOver) return;

      let changed = false;
      let scoreInc = 0;
      const allMerged: number[] = [];
      const currentBoard = board.map(r => [...r]);
      const nextBoard: BoardMatrix = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ];

      if (direction === 'left') {
        for (let r = 0; r < 4; r++) {
          const { newRow, gainedScore, mergedVals } = slideRow(currentBoard[r]);
          nextBoard[r] = newRow;
          scoreInc += gainedScore;
          allMerged.push(...mergedVals);
          if (newRow.some((val, idx) => val !== currentBoard[r][idx])) changed = true;
        }
      } else if (direction === 'right') {
        for (let r = 0; r < 4; r++) {
          const reversed = [...currentBoard[r]].reverse();
          const { newRow, gainedScore, mergedVals } = slideRow(reversed);
          const restored = newRow.reverse();
          nextBoard[r] = restored;
          scoreInc += gainedScore;
          allMerged.push(...mergedVals);
          if (restored.some((val, idx) => val !== currentBoard[r][idx])) changed = true;
        }
      } else if (direction === 'up') {
        for (let c = 0; c < 4; c++) {
          const col = [currentBoard[0][c], currentBoard[1][c], currentBoard[2][c], currentBoard[3][c]];
          const { newRow, gainedScore, mergedVals } = slideRow(col);
          for (let r = 0; r < 4; r++) {
            nextBoard[r][c] = newRow[r];
          }
          scoreInc += gainedScore;
          allMerged.push(...mergedVals);
          if (newRow.some((val, idx) => val !== col[idx])) changed = true;
        }
      } else if (direction === 'down') {
        for (let c = 0; c < 4; c++) {
          const col = [currentBoard[3][c], currentBoard[2][c], currentBoard[1][c], currentBoard[0][c]];
          const { newRow, gainedScore, mergedVals } = slideRow(col);
          const restored = newRow.reverse();
          for (let r = 0; r < 4; r++) {
            nextBoard[r][c] = restored[r];
          }
          scoreInc += gainedScore;
          allMerged.push(...mergedVals);
          if (restored.some((val, idx) => val !== currentBoard[idx][c])) changed = true;
        }
      }

      if (changed) {
        // Save history for undo
        setHistory(prev => [...prev.slice(-3), { board: currentBoard, score }]);

        addRandomTile(nextBoard);
        const nextScore = score + scoreInc;
        setBoard(nextBoard);
        setScore(nextScore);

        if (allMerged.length > 0) {
          soundManager.playMerge(Math.max(...allMerged));
        } else {
          soundManager.playMove();
        }

        // Check 2048 milestone
        if (!hasWon && !keepPlaying) {
          const reached2048 = nextBoard.some(row => row.some(cell => cell >= 2048));
          if (reached2048) {
            setHasWon(true);
            soundManager.playVictory();
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.6 }
            });
          }
        }

        // Update high score
        setHighScore(prev => {
          const updated = Math.max(prev, nextScore);
          localStorage.setItem('solace_2048_highscore', updated.toString());
          return updated;
        });

        // Check if game over (no empty spaces and no valid adjacent merges)
        let hasMoves = false;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (nextBoard[r][c] === 0) hasMoves = true;
            if (c < 3 && nextBoard[r][c] === nextBoard[r][c + 1]) hasMoves = true;
            if (r < 3 && nextBoard[r][c] === nextBoard[r + 1][c]) hasMoves = true;
          }
        }
        if (!hasMoves) {
          setIsGameOver(true);
        }
      }
    },
    [board, score, isGameOver, hasWon, keepPlaying]
  );

  // Undo move
  const handleUndo = useCallback(() => {
    if (history.length === 0 || isGameOver) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setBoard(previous.board);
    setScore(previous.score);
    soundManager.playMove();
  }, [history, isGameOver]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        move('left');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        move('right');
      } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        move('up');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        move('down');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, handleUndo]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 30) {
      if (absX > absY) {
        if (dx > 0) move('right');
        else move('left');
      } else {
        if (dy > 0) move('down');
        else move('up');
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={restartGame}
            aria-label="Restart Game"
            className="flex items-center gap-1.5 py-1.5 px-3 bg-stone-200/70 hover:bg-stone-300/70 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-stone-200/70 hover:bg-stone-300/70 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-stone-600 dark:text-stone-300">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans">Best</span>
            <span className="font-semibold text-stone-700 dark:text-stone-200">{highScore}</span>
          </div>
          <span className="text-stone-300 dark:text-stone-600">/</span>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans">Score</span>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-50">{score}</span>
          </div>
        </div>
      </div>

      {/* 4x4 Game Board */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-sm aspect-square bg-stone-200/80 dark:bg-stone-800/90 rounded-2xl p-2.5 sm:p-3 shadow-inner select-none touch-none"
      >
        <div className="grid grid-cols-4 grid-rows-4 gap-2.5 sm:gap-3 w-full h-full">
          {board.map((row, rIdx) =>
            row.map((val, cIdx) => {
              const style = TILE_STYLES[val] || {
                bg: 'bg-stone-900 text-white',
                text: 'text-white'
              };

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="relative flex items-center justify-center rounded-xl bg-stone-100/60 dark:bg-stone-900/50 overflow-hidden"
                >
                  {val > 0 && (
                    <div
                      className={`w-full h-full flex items-center justify-center rounded-xl transition-all duration-100 ${style.bg} ${style.text} ${style.shadow || ''}`}
                    >
                      <span
                        className={`font-mono font-bold tabular-nums tracking-tight ${
                          val >= 1024 ? 'text-lg sm:text-xl' : val >= 128 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
                        }`}
                      >
                        {val}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Reached 2048 Victory Overlay */}
        {hasWon && !keepPlaying && (
          <div className="absolute inset-0 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-stone-900 dark:text-stone-100 mb-1">
              Golden Radiance
            </h3>
            <p className="text-xs text-stone-500 mb-5">
              You harmonized the 2048 tile with serenity!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setKeepPlaying(true)}
                className="py-2.5 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-medium cursor-pointer"
              >
                Keep Going
              </button>
              <button
                onClick={restartGame}
                className="py-2.5 px-4 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-medium cursor-pointer"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <h3 className="font-serif text-2xl text-stone-900 dark:text-stone-100 mb-1">
              Quiet Equilibrium
            </h3>
            <p className="text-xs text-stone-500 mb-1">No more legal merges remaining.</p>
            <p className="text-xs font-mono font-medium text-stone-700 dark:text-stone-300 mb-5">
              Final Score: {score}
            </p>
            <button
              onClick={restartGame}
              className="py-2.5 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-medium transition-transform active:scale-98 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Again</span>
            </button>
          </div>
        )}
      </div>

      {/* Directional Pad for touch / mouse navigation */}
      <div className="w-full max-w-sm flex flex-col items-center gap-1 mt-4">
        <button
          onClick={() => move('up')}
          aria-label="Move Up"
          className="p-3 bg-stone-200/80 hover:bg-stone-300/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl active:scale-95 transition-all cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => move('left')}
            aria-label="Move Left"
            className="p-3 bg-stone-200/80 hover:bg-stone-300/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => move('down')}
            aria-label="Move Down"
            className="p-3 bg-stone-200/80 hover:bg-stone-300/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => move('right')}
            aria-label="Move Right"
            className="p-3 bg-stone-200/80 hover:bg-stone-300/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Helpful keyboard hint */}
      <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-2 text-center">
        Use Arrow Keys or WASD · Swipe on touchscreen
      </p>
    </div>
  );
};
