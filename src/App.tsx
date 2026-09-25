import React, { useState, useEffect } from 'react';
import { Navbar, ActiveGameTab } from './components/Navbar';
import { DinoRunner } from './components/games/DinoRunner';
import { SudokuGame } from './components/games/SudokuGame';
import { Zen2048 } from './components/games/Zen2048';
import { HarmonyPairs } from './components/games/HarmonyPairs';
import { soundManager } from './utils/audio';
import {
  Sparkles,
  Wind,
  Footprints,
  Grid3X3,
  Layers,
  HeartHandshake
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveGameTab>('dino');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [ambientType, setAmbientType] = useState<'none' | 'rain' | 'waves' | 'chimes'>('none');

  // Handle dark mode class on document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  const handleChangeAmbient = (type: 'none' | 'rain' | 'waves' | 'chimes') => {
    setAmbientType(type);
    soundManager.setAmbient(type);
  };

  const GAME_INFO: Record<
    ActiveGameTab,
    { title: string; subtitle: string; description: string; tag: string }
  > = {
    dino: {
      title: 'Dusk Dune Runner',
      subtitle: 'Sprint across sunset dunes with graceful jumps and crouches',
      description: 'A tranquil reimagining of the desert sprint. Choose Tranquil mode with gentle shield petals or test your instincts in Classic mode.',
      tag: 'Arcade Sprint'
    },
    sudoku: {
      title: 'Zen Sudoku',
      subtitle: 'Four graded levels from Gentle to Master with pencil notes and hints',
      description: 'Harmonize the 9×9 grid with logical elimination. Features candidate notes, conflict detection, and optional Zen Mode to hide the timer.',
      tag: 'Logic & Focus'
    },
    2048: {
      title: 'Serene 2048',
      subtitle: 'Merge ceramic pastel tiles toward the golden 2048 harmony',
      description: 'Slide in four directions to fuse matching numbers. Includes undo forgiveness and soothing pentatonic chords on every combination.',
      tag: 'Sliding Puzzle'
    },
    pairs: {
      title: 'Harmony Pairs',
      subtitle: 'Tranquil card matching across Botanical, Celestial, and Zen themes',
      description: 'Flip pairs of mindful symbols with custom grid scales ranging from a quick 3×4 breeze to an expansive 6×6 garden.',
      tag: 'Mindful Memory'
    }
  };

  const currentInfo = GAME_INFO[activeTab];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-[#12151B] text-[#1E232A] dark:text-[#E2E8F0] transition-colors selection:bg-stone-300 dark:selection:bg-stone-700">
      {/* Top Bar Contract (Section 2) */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        ambientType={ambientType}
        onChangeAmbient={handleChangeAmbient}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center">
        {/* Curated Game Header / Headline */}
        <section className="w-full text-center mb-6 max-w-2xl">
          <div className="flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-1.5 font-medium tracking-wide">
            <span>{currentInfo.tag}</span>
            <span aria-hidden="true">·</span>
            <span>Mindful Play</span>
            <span aria-hidden="true">·</span>
            <span>No Pressure</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-stone-50 mb-2">
            {currentInfo.title}
          </h1>

          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed text-balance">
            {currentInfo.subtitle}
          </p>
        </section>

        {/* Active Game Surface */}
        <section className="w-full flex justify-center mb-10">
          {activeTab === 'dino' && <DinoRunner isMuted={isMuted} />}
          {activeTab === 'sudoku' && <SudokuGame isMuted={isMuted} />}
          {activeTab === '2048' && <Zen2048 isMuted={isMuted} />}
          {activeTab === 'pairs' && <HarmonyPairs isMuted={isMuted} />}
        </section>

        {/* Quick Game Showcase Selector */}
        <section className="w-full border-t border-stone-200/80 dark:border-stone-800/80 pt-8 mt-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Curated Sanctuary Games
            </h2>
            <span className="text-xs text-stone-400 dark:text-stone-500">
              4 Mini Games Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {(
              [
                {
                  id: 'dino',
                  title: 'Dusk Dino Runner',
                  desc: 'Obstacle desert sprint with dusk atmosphere',
                  icon: Footprints
                },
                {
                  id: 'sudoku',
                  title: 'Zen Sudoku',
                  desc: 'Levels Gentle to Master with smart hints',
                  icon: Grid3X3
                },
                {
                  id: '2048',
                  title: 'Serene 2048',
                  desc: 'Pastel tile sliding with undo mechanics',
                  icon: Layers
                },
                {
                  id: 'pairs',
                  title: 'Harmony Pairs',
                  desc: 'Botanical & celestial card match grids',
                  icon: HeartHandshake
                }
              ] as const
            ).map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-xs ring-1 ring-stone-300 dark:ring-stone-700'
                      : 'border-stone-200/90 dark:border-stone-800/90 bg-white/60 dark:bg-stone-900/40 hover:bg-white dark:hover:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected
                          ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm text-stone-900 dark:text-stone-100">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-normal">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Discreet Footer */}
      <footer className="w-full border-t border-stone-200/60 dark:border-stone-800/60 py-6 text-center text-xs text-stone-400 dark:text-stone-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Solace — Designed for quiet pauses and mindful play</span>
          <div className="flex items-center gap-3">
            <span>Pure Web Audio</span>
            <span aria-hidden="true">·</span>
            <span>Zero Ads</span>
            <span aria-hidden="true">·</span>
            <span>Offline Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
