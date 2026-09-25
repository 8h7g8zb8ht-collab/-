import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Flower2,
  Moon,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface HarmonyPairsProps {
  isMuted: boolean;
}

type CardTheme = 'botanical' | 'celestial' | 'zen';
type GridDifficulty = 'breeze' | 'balanced' | 'flow' | 'garden';

interface CardItem {
  id: number;
  symbolId: string;
  label: string;
  iconSvg: React.ReactNode;
  isFlipped: boolean;
  isMatched: boolean;
}

// Minimalist vector SVG symbols for each theme
const SYMBOLS = {
  botanical: [
    { id: 'lotus', label: 'Lotus', emoji: '🪷' },
    { id: 'bamboo', label: 'Bamboo', emoji: '🎋' },
    { id: 'sakura', label: 'Sakura', emoji: '🌸' },
    { id: 'ginkgo', label: 'Ginkgo', emoji: '🍂' },
    { id: 'fern', label: 'Fern', emoji: '🌿' },
    { id: 'bonsai', label: 'Bonsai', emoji: '🪴' },
    { id: 'cactus', label: 'Cactus', emoji: '🌵' },
    { id: 'clover', label: 'Clover', emoji: '☘️' },
    { id: 'tulip', label: 'Tulip', emoji: '🌷' },
    { id: 'sunflower', label: 'Sunflower', emoji: '🌻' },
    { id: 'herb', label: 'Lavender', emoji: '🌾' },
    { id: 'leaf', label: 'Maple', emoji: '🍁' },
    { id: 'sprout', label: 'Sprout', emoji: '🌱' },
    { id: 'seedling', label: 'Evergreen', emoji: '🌲' },
    { id: 'blossom', label: 'Hibiscus', emoji: '🌺' },
    { id: 'rose', label: 'Rose', emoji: '🌹' },
    { id: 'palm', label: 'Palm', emoji: '🌴' },
    { id: 'sheaf', label: 'Wheat', emoji: '🌾' }
  ],
  celestial: [
    { id: 'moon', label: 'Crescent', emoji: '🌙' },
    { id: 'sun', label: 'Radiance', emoji: '☀️' },
    { id: 'star', label: 'Star', emoji: '⭐' },
    { id: 'saturn', label: 'Ringed Planet', emoji: '🪐' },
    { id: 'comet', label: 'Comet', emoji: '☄️' },
    { id: 'cloud', label: 'Cloud', emoji: '☁️' },
    { id: 'rainbow', label: 'Aurora', emoji: '🌈' },
    { id: 'sparkle', label: 'Cosmos', emoji: '✨' },
    { id: 'fullmoon', label: 'Full Moon', emoji: '🌕' },
    { id: 'galaxy', label: 'Eclipse', emoji: '🌑' },
    { id: 'wind', label: 'Solar Wind', emoji: '💨' },
    { id: 'meteor', label: 'Shooting Star', emoji: '🌠' },
    { id: 'telescope', label: 'Observatory', emoji: '🔭' },
    { id: 'nebula', label: 'Nebula', emoji: '🌌' },
    { id: 'horizon', label: 'Sunrise', emoji: '🌅' },
    { id: 'twilight', label: 'Sunset', emoji: '🌇' },
    { id: 'globe', label: 'Earth', emoji: '🌍' },
    { id: 'satellite', label: 'Orbit', emoji: '🛰️' }
  ],
  zen: [
    { id: 'enso', label: 'Enso', emoji: '⭕' },
    { id: 'yinyang', label: 'Balance', emoji: '☯️' },
    { id: 'mandala', label: 'Mandalic', emoji: '☸️' },
    { id: 'water', label: 'Ripple', emoji: '💧' },
    { id: 'crystal', label: 'Gemstone', emoji: '💎' },
    { id: 'fire', label: 'Warmth', emoji: '🕯️' },
    { id: 'bell', label: 'Singing Bowl', emoji: '🔔' },
    { id: 'tea', label: 'Matcha', emoji: '🍵' },
    { id: 'mountain', label: 'Sanctuary', emoji: '⛰️' },
    { id: 'wave', label: 'Stream', emoji: '🌊' },
    { id: 'lantern', label: 'Lantern', emoji: '🏮' },
    { id: 'feather', label: 'Lightness', emoji: '🪶' },
    { id: 'pebble', label: 'Cairn', emoji: '🪨' },
    { id: 'fan', label: 'Breeze', emoji: '🪭' },
    { id: 'bridge', label: 'Crossing', emoji: '⛩️' },
    { id: 'origami', label: 'Crane', emoji: '🦢' },
    { id: 'shell', label: 'Spiral', emoji: '🐚' },
    { id: 'kite', label: 'Drift', emoji: '🪁' }
  ]
};

const DIFFICULTY_CONFIG: Record<
  GridDifficulty,
  { pairs: number; cols: string; label: string; desc: string }
> = {
  breeze: { pairs: 6, cols: 'grid-cols-4', label: 'Breeze (3×4)', desc: '6 pairs' },
  balanced: { pairs: 8, cols: 'grid-cols-4', label: 'Balanced (4×4)', desc: '8 pairs' },
  flow: { pairs: 10, cols: 'grid-cols-5', label: 'Flow (4×5)', desc: '10 pairs' },
  garden: { pairs: 18, cols: 'grid-cols-6', label: 'Garden (6×6)', desc: '18 pairs' }
};

export const HarmonyPairs: React.FC<HarmonyPairsProps> = ({ isMuted }) => {
  const [theme, setTheme] = useState<CardTheme>('botanical');
  const [difficulty, setDifficulty] = useState<GridDifficulty>('balanced');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);

  // Best score storage
  const bestScoreKey = `solace_memory_best_${difficulty}`;
  const [bestScore, setBestScore] = useState<number | null>(() => {
    const saved = localStorage.getItem(bestScoreKey);
    return saved ? parseInt(saved, 10) : null;
  });

  // Setup cards
  const setupGame = useCallback(
    (diff: GridDifficulty = difficulty, th: CardTheme = theme) => {
      const config = DIFFICULTY_CONFIG[diff];
      const themeSymbols = [...SYMBOLS[th]];

      // Shuffle symbols and pick required count
      const shuffledSymbols = [...themeSymbols].sort(() => Math.random() - 0.5).slice(0, config.pairs);

      // Create pairs
      const cardList: CardItem[] = [];
      shuffledSymbols.forEach((sym, idx) => {
        // First of pair
        cardList.push({
          id: idx * 2,
          symbolId: sym.id,
          label: sym.label,
          iconSvg: <span className="text-2xl sm:text-3xl select-none">{sym.emoji}</span>,
          isFlipped: false,
          isMatched: false
        });
        // Second of pair
        cardList.push({
          id: idx * 2 + 1,
          symbolId: sym.id,
          label: sym.label,
          iconSvg: <span className="text-2xl sm:text-3xl select-none">{sym.emoji}</span>,
          isFlipped: false,
          isMatched: false
        });
      });

      // Shuffle cards thoroughly
      const finalShuffled = cardList.sort(() => Math.random() - 0.5);

      setCards(finalShuffled);
      setFlippedIndices([]);
      setMoves(0);
      setMatchedPairs(0);
      setIsProcessing(false);
      setIsWon(false);
      setStreak(0);

      const savedBest = localStorage.getItem(`solace_memory_best_${diff}`);
      setBestScore(savedBest ? parseInt(savedBest, 10) : null);
    },
    [difficulty, theme]
  );

  useEffect(() => {
    setupGame(difficulty, theme);
  }, [difficulty, theme, setupGame]);

  // Card click handler
  const handleCardClick = (index: number) => {
    if (isProcessing || isWon) return;
    const card = cards[index];
    if (card.isFlipped || card.isMatched) return;

    soundManager.playMove();

    // Flip this card
    const nextCards = [...cards];
    nextCards[index].isFlipped = true;
    setCards(nextCards);

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves(m => m + 1);
      setIsProcessing(true);
      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = nextCards[firstIdx];
      const secondCard = nextCards[secondIdx];

      if (firstCard.symbolId === secondCard.symbolId) {
        // MATCH!
        setTimeout(() => {
          firstCard.isMatched = true;
          secondCard.isMatched = true;
          setCards([...nextCards]);
          setFlippedIndices([]);
          setIsProcessing(false);
          setMatchedPairs(p => {
            const nextP = p + 1;
            const targetPairs = DIFFICULTY_CONFIG[difficulty].pairs;
            if (nextP === targetPairs) {
              // Game Won!
              setIsWon(true);
              soundManager.playVictory();
              confetti({
                particleCount: 75,
                spread: 70,
                origin: { y: 0.6 }
              });

              // Check best score
              const currentFinalMoves = moves + 1;
              setBestScore(prev => {
                if (prev === null || currentFinalMoves < prev) {
                  localStorage.setItem(`solace_memory_best_${difficulty}`, currentFinalMoves.toString());
                  return currentFinalMoves;
                }
                return prev;
              });
            } else {
              soundManager.playMatchChord();
            }
            return nextP;
          });
          setStreak(s => s + 1);
        }, 320);
      } else {
        // NO MATCH -> flip back gently
        setStreak(0);
        setTimeout(() => {
          firstCard.isFlipped = false;
          secondCard.isFlipped = false;
          setCards([...nextCards]);
          setFlippedIndices([]);
          setIsProcessing(false);
        }, 900);
      }
    }
  };

  const gridColsClass = DIFFICULTY_CONFIG[difficulty].cols;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top HUD */}
      <div className="w-full max-w-xl flex flex-col gap-3 pb-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Level Switcher */}
          <div className="flex items-center p-1 bg-stone-200/70 dark:bg-stone-800/80 rounded-lg text-xs">
            {(
              [
                { id: 'breeze', label: 'Breeze' },
                { id: 'balanced', label: 'Balanced' },
                { id: 'flow', label: 'Flow' },
                { id: 'garden', label: 'Garden' }
              ] as const
            ).map(lvl => (
              <button
                key={lvl.id}
                onClick={() => setDifficulty(lvl.id)}
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

          {/* Theme selector */}
          <div className="flex items-center p-1 bg-stone-200/70 dark:bg-stone-800/80 rounded-lg text-xs">
            {(
              [
                { id: 'botanical', label: 'Botanical', icon: Flower2 },
                { id: 'celestial', label: 'Celestial', icon: Moon },
                { id: 'zen', label: 'Harmony', icon: Compass }
              ] as const
            ).map(th => {
              const Icon = th.icon;
              return (
                <button
                  key={th.id}
                  onClick={() => setTheme(th.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap cursor-pointer ${
                    theme === th.id
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{th.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Counters & Reset */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setupGame(difficulty, theme)}
              className="flex items-center gap-1.5 py-1 px-2.5 bg-stone-200/70 hover:bg-stone-300/70 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reshuffle</span>
            </button>
            {streak > 1 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                {streak}x Flow Streak!
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 font-mono text-stone-600 dark:text-stone-300 tabular-nums">
            {bestScore !== null && (
              <div className="flex items-center gap-1">
                <span className="text-stone-400 font-sans">Best:</span>
                <span>{bestScore}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-stone-400 font-sans">Moves:</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100">{moves}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-stone-400 font-sans">Pairs:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {matchedPairs}/{DIFFICULTY_CONFIG[difficulty].pairs}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid Container */}
      <div className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl p-3 sm:p-4 border border-stone-200 dark:border-stone-800 shadow-sm select-none">
        <div className={`grid ${gridColsClass} gap-2 sm:gap-3 w-full`}>
          {cards.map((card, idx) => {
            const isRevealed = card.isFlipped || card.isMatched;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(idx)}
                className={`aspect-square rounded-xl cursor-pointer perspective-1000 transition-transform duration-200 ${
                  card.isMatched
                    ? 'opacity-85 scale-98 pointer-events-none'
                    : 'hover:scale-102 active:scale-95'
                }`}
              >
                <div
                  className={`w-full h-full rounded-xl transition-all duration-300 transform-style-3d border ${
                    isRevealed
                      ? 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 shadow-2xs'
                      : 'border-stone-200/90 dark:border-stone-700/80 bg-stone-200/60 dark:bg-stone-800/60 hover:bg-stone-200 dark:hover:bg-stone-700/80'
                  }`}
                >
                  {isRevealed ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1">
                      {card.iconSvg}
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 font-medium tracking-tight truncate max-w-full px-1">
                        {card.label}
                      </span>
                    </div>
                  ) : (
                    /* Elegant Card Back Pattern */
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full border border-stone-300 dark:border-stone-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Won Overlay */}
        {isWon && (
          <div className="absolute inset-0 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-stone-900 dark:text-stone-100 mb-1">
              Garden in Full Bloom
            </h3>
            <p className="text-xs text-stone-500 mb-5">
              Completed in <span className="font-mono font-medium text-stone-700 dark:text-stone-300">{moves} moves</span>!
            </p>
            <button
              onClick={() => setupGame(difficulty, theme)}
              className="py-2.5 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-medium transition-transform active:scale-98 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Again</span>
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-3 text-center">
        Flip cards to reveal pairs · Build mindfulness through tranquil recall
      </p>
    </div>
  );
};
