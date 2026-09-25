import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Bell,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export type ActiveGameTab = 'dino' | 'sudoku' | '2048' | 'pairs';

interface NavbarProps {
  activeTab: ActiveGameTab;
  onSelectTab: (tab: ActiveGameTab) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  ambientType: 'none' | 'rain' | 'waves' | 'chimes';
  onChangeAmbient: (type: 'none' | 'rain' | 'waves' | 'chimes') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  isDarkMode,
  onToggleDarkMode,
  isMuted,
  onToggleMute,
  ambientType,
  onChangeAmbient
}) => {
  const [showAmbientMenu, setShowAmbientMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 dark:border-stone-800/80 bg-[#F8F9FA]/90 dark:bg-[#12151B]/90 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single element wordmark */}
        <button
          onClick={() => onSelectTab('dino')}
          className="font-serif text-2xl font-normal tracking-tight text-stone-900 dark:text-stone-50 hover:opacity-85 transition-opacity cursor-pointer shrink-0"
        >
          Solace
        </button>

        {/* Zone 2: 4 clean text navigation links with subtle active indicator */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          {(
            [
              { id: 'dino', label: 'Dino Run' },
              { id: 'sudoku', label: 'Zen Sudoku' },
              { id: '2048', label: 'Serene 2048' },
              { id: 'pairs', label: 'Harmony Pairs' }
            ] as const
          ).map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-stone-900 dark:text-stone-100 bg-stone-200/70 dark:bg-stone-800 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200/40 dark:hover:bg-stone-800/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions (Soundscape / Mute & Theme) */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {/* Ambient Sound Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowAmbientMenu(prev => !prev)}
              aria-label="Sound Ambience"
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                ambientType !== 'none' && !isMuted
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800'
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-stone-400" />
              ) : ambientType === 'rain' ? (
                <CloudRain className="w-4 h-4 text-emerald-600 animate-pulse" />
              ) : ambientType === 'waves' ? (
                <Waves className="w-4 h-4 text-cyan-600 animate-pulse" />
              ) : ambientType === 'chimes' ? (
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span className="hidden md:inline font-medium text-[11px] capitalize">
                {isMuted ? 'Muted' : ambientType === 'none' ? 'Sound' : ambientType}
              </span>
            </button>

            {/* Ambient Soundscape Popover */}
            {showAmbientMenu && (
              <div
                className="absolute right-0 mt-2 w-52 p-2 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                    Ambience
                  </span>
                  <button
                    onClick={onToggleMute}
                    className="text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 font-medium cursor-pointer"
                  >
                    {isMuted ? 'Unmute All' : 'Mute All'}
                  </button>
                </div>

                <div className="space-y-1">
                  {(
                    [
                      { id: 'none', label: 'Silent Calm', icon: VolumeX },
                      { id: 'rain', label: 'Gentle Rain', icon: CloudRain },
                      { id: 'waves', label: 'Ocean Waves', icon: Waves },
                      { id: 'chimes', label: 'Wind Chimes', icon: Sparkles }
                    ] as const
                  ).map(opt => {
                    const Icon = opt.icon;
                    const isSelected = ambientType === opt.id && !isMuted;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          onChangeAmbient(opt.id);
                          setShowAmbientMenu(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium'
                            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
