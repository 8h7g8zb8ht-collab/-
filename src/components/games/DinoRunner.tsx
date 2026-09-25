import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Shield, Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface DinoRunnerProps {
  isMuted: boolean;
}

export const DinoRunner: React.FC<DinoRunnerProps> = ({ isMuted }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game states
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('solace_dino_highscore') || '0', 10);
  });
  const [mode, setMode] = useState<'tranquil' | 'classic'>('tranquil');
  const [lives, setLives] = useState<number>(3);
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'dusk' | 'night'>('dusk');

  // Internal mutable state for high-frequency 60fps canvas loop
  const internalRef = useRef({
    gameState: 'IDLE' as 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER',
    mode: 'tranquil' as 'tranquil' | 'classic',
    score: 0,
    speed: 5.5,
    distance: 0,
    lives: 3,
    invincibleTimer: 0,
    lastMilestone: 0,
    
    // Dino physics
    dino: {
      x: 70,
      y: 0, // calculated from ground
      vy: 0,
      width: 44,
      height: 48,
      isGrounded: true,
      isDucking: false,
      legFrame: 0,
      runAnimTimer: 0
    },

    // World & obstacles
    groundY: 210,
    obstacles: [] as Array<{
      id: number;
      type: 'cactus' | 'cactus_cluster' | 'bird';
      x: number;
      y: number;
      width: number;
      height: number;
      wingPhase?: number;
    }>,
    nextObstacleDist: 90,

    // Particles & aesthetic
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }>,
    stars: [] as Array<{ x: number; y: number; r: number; alpha: number }>,
    dunes: [
      { offset: 0, speed: 0.3, points: [] as number[] },
      { offset: 0, speed: 0.8, points: [] as number[] },
      { offset: 0, speed: 1.6, points: [] as number[] }
    ],

    animationFrameId: 0,
    lastTimestamp: 0
  });

  // Sync React state to internal ref
  useEffect(() => {
    internalRef.current.mode = mode;
  }, [mode]);

  // Initialize dunes & stars
  const initEnvironment = useCallback((width: number, height: number) => {
    const internal = internalRef.current;
    internal.stars = [];
    for (let i = 0; i < 45; i++) {
      internal.stars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.55),
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    // Initialize 3 dune layers
    internal.dunes.forEach((dune, idx) => {
      dune.points = [];
      const segmentCount = 20;
      const baseHeight = 120 + idx * 35;
      for (let s = 0; s <= segmentCount; s++) {
        dune.points.push(baseHeight + Math.sin(s * 0.8 + idx) * (18 - idx * 4));
      }
    });
  }, []);

  // Jump trigger
  const triggerJump = useCallback(() => {
    const s = internalRef.current;
    if (s.gameState === 'IDLE' || s.gameState === 'GAME_OVER') {
      startGame();
      return;
    }
    if (s.gameState === 'PLAYING' && s.dino.isGrounded && !s.dino.isDucking) {
      s.dino.vy = -12.5;
      s.dino.isGrounded = false;
      soundManager.playJump();

      // Emit soft dust puff
      for (let i = 0; i < 6; i++) {
        s.particles.push({
          x: s.dino.x + 12 + Math.random() * 15,
          y: s.groundY - 2,
          vx: -(Math.random() * 1.8 + 0.8),
          vy: -(Math.random() * 1.5 + 0.2),
          size: Math.random() * 3 + 2,
          alpha: 0.6,
          color: 'rgba(215, 195, 175, '
        });
      }
    }
  }, []);

  // Duck trigger
  const setDucking = useCallback((ducking: boolean) => {
    const s = internalRef.current;
    if (s.gameState === 'PLAYING') {
      s.dino.isDucking = ducking;
      if (ducking && !s.dino.isGrounded) {
        // Fast drop
        s.dino.vy += 6;
      }
    }
  }, []);

  // Start / Restart game
  const startGame = useCallback(() => {
    const s = internalRef.current;
    s.score = 0;
    s.speed = 5.5;
    s.distance = 0;
    s.lives = mode === 'tranquil' ? 3 : 1;
    s.invincibleTimer = 0;
    s.lastMilestone = 0;
    s.obstacles = [];
    s.particles = [];
    s.dino.y = 0;
    s.dino.vy = 0;
    s.dino.isGrounded = true;
    s.dino.isDucking = false;
    s.nextObstacleDist = 120;
    s.gameState = 'PLAYING';

    setScore(0);
    setLives(s.lives);
    setGameState('PLAYING');
  }, [mode]);

  // Pause / Resume
  const togglePause = useCallback(() => {
    setGameState(prev => {
      const next = prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev;
      internalRef.current.gameState = next;
      return next;
    });
  }, []);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        triggerJump();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setDucking(true);
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setDucking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerJump, setDucking, togglePause]);

  // Main game animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let mounted = true;
    const s = internalRef.current;

    // Resize canvas for sharp retina display
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
      s.groundY = rect.height - 44;
      initEnvironment(rect.width, rect.height);
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Render loop
    const loop = (timestamp: number) => {
      if (!mounted) return;
      if (!s.lastTimestamp) s.lastTimestamp = timestamp;
      const dt = Math.min((timestamp - s.lastTimestamp) / 1000, 0.1);
      s.lastTimestamp = timestamp;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // UPDATE LOGIC
      if (s.gameState === 'PLAYING') {
        s.distance += s.speed * 60 * dt;
        const currentScore = Math.floor(s.distance / 10);
        if (currentScore !== s.score) {
          s.score = currentScore;
          setScore(currentScore);

          // Milestone audio every 100m
          if (currentScore > 0 && currentScore % 100 === 0 && currentScore !== s.lastMilestone) {
            s.lastMilestone = currentScore;
            soundManager.playScoreMilestone();

            // Tranquil mode: gently restore 1 life if below max
            if (s.mode === 'tranquil' && s.lives < 3 && currentScore % 300 === 0) {
              s.lives += 1;
              setLives(s.lives);
            }
          }

          // Gentle speed progression (capped for relaxing feel)
          s.speed = Math.min(5.5 + (currentScore / 250) * 0.8, 10.5);
        }

        // Cycle time of day based on distance
        const cycle = (currentScore % 900);
        if (cycle < 300 && timeOfDay !== 'dawn') setTimeOfDay('dawn');
        else if (cycle >= 300 && cycle < 600 && timeOfDay !== 'dusk') setTimeOfDay('dusk');
        else if (cycle >= 600 && timeOfDay !== 'night') setTimeOfDay('night');

        // Dino physics
        if (!s.dino.isGrounded) {
          s.dino.vy += 32 * dt; // gravity
          s.dino.y += s.dino.vy;
          if (s.dino.y >= 0) {
            s.dino.y = 0;
            s.dino.vy = 0;
            s.dino.isGrounded = true;
          }
        }

        // Run animation frames
        s.dino.runAnimTimer += dt * (s.speed * 2);
        if (s.dino.runAnimTimer > 1) {
          s.dino.legFrame = (s.dino.legFrame + 1) % 2;
          s.dino.runAnimTimer = 0;

          // Tiny footstep particle
          if (s.dino.isGrounded && Math.random() > 0.4) {
            s.particles.push({
              x: s.dino.x + 8,
              y: s.groundY - 1,
              vx: -(s.speed * 0.4 + Math.random()),
              vy: -(Math.random() * 0.8),
              size: Math.random() * 2.5 + 1.5,
              alpha: 0.5,
              color: 'rgba(210, 190, 170, '
            });
          }
        }

        if (s.invincibleTimer > 0) {
          s.invincibleTimer -= dt;
        }

        // Spawn obstacles
        s.nextObstacleDist -= s.speed * 60 * dt;
        if (s.nextObstacleDist <= 0) {
          const typeRoll = Math.random();
          let type: 'cactus' | 'cactus_cluster' | 'bird' = 'cactus';
          let obsHeight = 36;
          let obsWidth = 20;
          let obsY = s.groundY - obsHeight;

          if (s.score > 80 && typeRoll > 0.65) {
            type = 'bird';
            obsWidth = 34;
            obsHeight = 24;
            // Bird can fly at low jump height or duck height
            obsY = Math.random() > 0.5 ? s.groundY - 58 : s.groundY - 32;
          } else if (typeRoll > 0.35) {
            type = 'cactus_cluster';
            obsWidth = 36;
            obsHeight = 40;
            obsY = s.groundY - obsHeight;
          } else {
            type = 'cactus';
            obsWidth = 22;
            obsHeight = 34;
            obsY = s.groundY - obsHeight;
          }

          s.obstacles.push({
            id: Math.random(),
            type,
            x: width + 20,
            y: obsY,
            width: obsWidth,
            height: obsHeight,
            wingPhase: 0
          });

          // Next obstacle distance with randomized breathing space
          s.nextObstacleDist = Math.max(180, 260 + Math.random() * 220 - (s.speed * 8));
        }

        // Move obstacles and check collisions
        const dinoHitBox = {
          x: s.dino.x + 6,
          y: s.groundY + s.dino.y - (s.dino.isDucking ? 26 : s.dino.height) + 4,
          w: (s.dino.isDucking ? 52 : 32),
          h: (s.dino.isDucking ? 24 : s.dino.height - 6)
        };

        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const obs = s.obstacles[i];
          obs.x -= s.speed * 60 * dt;
          if (obs.type === 'bird' && obs.wingPhase !== undefined) {
            obs.wingPhase += dt * 10;
          }

          // Check collision
          const obsHitBox = {
            x: obs.x + 4,
            y: obs.y + 4,
            w: obs.width - 8,
            h: obs.height - 6
          };

          const isColliding =
            dinoHitBox.x < obsHitBox.x + obsHitBox.w &&
            dinoHitBox.x + dinoHitBox.w > obsHitBox.x &&
            dinoHitBox.y < obsHitBox.y + obsHitBox.h &&
            dinoHitBox.y + dinoHitBox.h > obsHitBox.y;

          if (isColliding && s.invincibleTimer <= 0) {
            soundManager.playDinoHit();
            s.lives -= 1;
            setLives(s.lives);

            // Trigger soft screen shake particles
            for (let p = 0; p < 12; p++) {
              s.particles.push({
                x: obs.x + obs.width / 2,
                y: obs.y + obs.height / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                size: Math.random() * 3 + 2,
                alpha: 0.8,
                color: 'rgba(230, 140, 130, '
              });
            }

            if (s.lives <= 0) {
              s.gameState = 'GAME_OVER';
              setGameState('GAME_OVER');
              const finalScore = s.score;
              setHighScore(prev => {
                const updated = Math.max(prev, finalScore);
                localStorage.setItem('solace_dino_highscore', updated.toString());
                return updated;
              });
              break;
            } else {
              // Gentle invincibility buffer
              s.invincibleTimer = 1.4;
              s.obstacles.splice(i, 1);
              continue;
            }
          }

          // Remove off-screen obstacles
          if (obs.x < -60) {
            s.obstacles.splice(i, 1);
          }
        }

        // Update particles
        for (let p = s.particles.length - 1; p >= 0; p--) {
          const part = s.particles[p];
          part.x += part.vx;
          part.y += part.vy;
          part.alpha -= dt * 1.5;
          if (part.alpha <= 0) {
            s.particles.splice(p, 1);
          }
        }
      }

      // RENDER SECTION
      ctx.clearRect(0, 0, width, height);

      // 1. Atmosphere Gradient (Gentle Dusk / Dawn / Twilight)
      let skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (timeOfDay === 'dawn') {
        skyGrad.addColorStop(0, '#F5EDE4');
        skyGrad.addColorStop(0.65, '#F7E7D9');
        skyGrad.addColorStop(1, '#EFE3D3');
      } else if (timeOfDay === 'dusk') {
        skyGrad.addColorStop(0, '#EAE6E8');
        skyGrad.addColorStop(0.5, '#F4E3D7');
        skyGrad.addColorStop(1, '#E9D6CA');
      } else {
        // Twilight Night
        skyGrad.addColorStop(0, '#2D3240');
        skyGrad.addColorStop(0.6, '#3A3F50');
        skyGrad.addColorStop(1, '#4B4F60');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Stars (glow softly in dusk & night)
      if (timeOfDay === 'night' || timeOfDay === 'dusk') {
        ctx.save();
        s.stars.forEach(st => {
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          const starAlpha = timeOfDay === 'night' ? st.alpha : st.alpha * 0.4;
          ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
          ctx.fill();
        });
        ctx.restore();
      }

      // Celestial body (Sun/Moon)
      ctx.save();
      const celestialX = width - 110;
      const celestialY = 48;
      ctx.beginPath();
      ctx.arc(celestialX, celestialY, 26, 0, Math.PI * 2);
      if (timeOfDay === 'night') {
        // Glowing moon
        ctx.fillStyle = '#FFF7D6';
        ctx.shadowColor = 'rgba(255, 247, 214, 0.4)';
        ctx.shadowBlur = 16;
        ctx.fill();
        // Inner shadow crescent
        ctx.beginPath();
        ctx.arc(celestialX + 7, celestialY - 4, 23, 0, Math.PI * 2);
        ctx.fillStyle = '#2D3240';
        ctx.shadowBlur = 0;
        ctx.fill();
      } else {
        // Soft glowing sun
        ctx.fillStyle = timeOfDay === 'dawn' ? '#FEE8C8' : '#FBD6B8';
        ctx.shadowColor = 'rgba(251, 214, 184, 0.5)';
        ctx.shadowBlur = 24;
        ctx.fill();
      }
      ctx.restore();

      // 2. Parallax Sand Dunes
      const duneColors = timeOfDay === 'night'
        ? ['#363A48', '#2D313E', '#242732']
        : ['#DECFC1', '#D4C1B0', '#C6B09E'];

      s.dunes.forEach((dune, idx) => {
        dune.offset += (s.speed * 0.12 * (idx + 1)) * 60 * dt;
        ctx.fillStyle = duneColors[idx];
        ctx.beginPath();
        ctx.moveTo(0, height);
        const segmentWidth = width / (dune.points.length - 1);
        for (let i = 0; i < dune.points.length; i++) {
          const px = i * segmentWidth;
          const py = height - dune.points[i];
          if (i === 0) ctx.lineTo(px, py);
          else {
            const prevPx = (i - 1) * segmentWidth;
            const prevPy = height - dune.points[i - 1];
            const cx = (prevPx + px) / 2;
            ctx.quadraticCurveTo(prevPx, prevPy, cx, (prevPy + py) / 2);
          }
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
      });

      // 3. Ground Line & Texture
      const groundColor = timeOfDay === 'night' ? '#1D2028' : '#A99382';
      ctx.strokeStyle = groundColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, s.groundY);
      ctx.lineTo(width, s.groundY);
      ctx.stroke();

      // Tiny ground pebble dots
      ctx.fillStyle = timeOfDay === 'night' ? '#2A2E3B' : '#BCAF9F';
      const pebbleOffset = (s.distance * 1.5) % 180;
      for (let x = -pebbleOffset; x < width; x += 36) {
        ctx.beginPath();
        ctx.arc(x, s.groundY + 6, 1.2, 0, Math.PI * 2);
        ctx.arc(x + 14, s.groundY + 12, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Draw Obstacles (Cacti / Saguaro / Swallows)
      const obstacleColor = timeOfDay === 'night' ? '#A5ADC2' : '#4E5752';
      s.obstacles.forEach(obs => {
        ctx.save();
        ctx.fillStyle = obstacleColor;

        if (obs.type === 'bird') {
          // Bird with graceful wing flap
          const bx = obs.x;
          const by = obs.y;
          const wingOffset = Math.sin(obs.wingPhase || 0) * 8;
          ctx.beginPath();
          // Head / beak
          ctx.moveTo(bx, by + 10);
          ctx.lineTo(bx - 10, by + 8);
          // Left wing
          ctx.lineTo(bx - 4, by + 8 + wingOffset);
          ctx.lineTo(bx + 8, by + 12);
          // Right wing
          ctx.lineTo(bx + 18, by + 8 - wingOffset);
          ctx.lineTo(bx + 10, by + 14);
          ctx.closePath();
          ctx.fill();
        } else if (obs.type === 'cactus') {
          // Single minimalist saguaro cactus
          const cx = obs.x;
          const cy = obs.y;
          const ch = obs.height;
          // Main stem
          ctx.beginPath();
          ctx.roundRect(cx + 6, cy, 10, ch, 5);
          // Left arm
          ctx.roundRect(cx, cy + 10, 8, 5, 2);
          ctx.roundRect(cx, cy + 5, 5, 10, 2);
          // Right arm
          ctx.roundRect(cx + 14, cy + 14, 8, 5, 2);
          ctx.roundRect(cx + 17, cy + 8, 5, 11, 2);
          ctx.fill();

          // Gentle blossom on top
          ctx.fillStyle = '#E89088';
          ctx.beginPath();
          ctx.arc(cx + 11, cy - 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Cactus cluster
          const cx = obs.x;
          const cy = obs.y;
          // Tall stem
          ctx.beginPath();
          ctx.roundRect(cx + 8, cy, 10, obs.height, 5);
          // Small companion stem
          ctx.roundRect(cx + 20, cy + 12, 8, obs.height - 12, 4);
          // Low rounded pad
          ctx.roundRect(cx, cy + 18, 9, obs.height - 18, 4);
          ctx.fill();

          // Blossoms
          ctx.fillStyle = '#E89088';
          ctx.beginPath();
          ctx.arc(cx + 13, cy - 2, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + 24, cy + 10, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 5. Draw Dino (Sleek, minimalist aesthetic silhouette)
      ctx.save();
      const dinoColor = timeOfDay === 'night' ? '#E5E9F0' : '#2D3436';
      ctx.fillStyle = dinoColor;

      // Soft flicker if invincible
      if (s.invincibleTimer > 0 && Math.floor(s.invincibleTimer * 10) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }

      const dx = s.dino.x;
      const dy = s.groundY + s.dino.y;

      if (s.dino.isDucking) {
        // Elongated sleek ducking silhouette
        ctx.beginPath();
        // Body
        ctx.roundRect(dx, dy - 26, 44, 22, 10);
        // Head / snout reaching forward
        ctx.roundRect(dx + 30, dy - 22, 20, 14, 6);
        ctx.fill();

        // Eye
        ctx.fillStyle = timeOfDay === 'night' ? '#2D3436' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(dx + 42, dy - 17, 2, 0, Math.PI * 2);
        ctx.fill();

        // Ducking legs
        ctx.strokeStyle = dinoColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (s.dino.legFrame === 0) {
          ctx.moveTo(dx + 12, dy - 4);
          ctx.lineTo(dx + 18, dy);
          ctx.moveTo(dx + 30, dy - 4);
          ctx.lineTo(dx + 26, dy);
        } else {
          ctx.moveTo(dx + 16, dy - 4);
          ctx.lineTo(dx + 12, dy);
          ctx.moveTo(dx + 26, dy - 4);
          ctx.lineTo(dx + 32, dy);
        }
        ctx.stroke();
      } else {
        // Upright running Dino
        const headY = dy - s.dino.height;
        ctx.beginPath();
        // Main body
        ctx.roundRect(dx + 4, dy - 34, 28, 24, 10);
        // Neck & Head
        ctx.roundRect(dx + 18, headY, 20, 18, 6);
        // Tail curving up gently
        ctx.moveTo(dx + 4, dy - 24);
        ctx.quadraticCurveTo(dx - 10, dy - 20, dx - 12, dy - 30);
        ctx.lineTo(dx - 6, dy - 16);
        ctx.closePath();
        ctx.fill();

        // Minimal arms
        ctx.beginPath();
        ctx.roundRect(dx + 24, dy - 22, 8, 4, 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = timeOfDay === 'night' ? '#2D3436' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(dx + 30, headY + 6, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Running Legs
        ctx.strokeStyle = dinoColor;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (s.dino.isGrounded) {
          if (s.dino.legFrame === 0) {
            // Left forward, right back
            ctx.moveTo(dx + 12, dy - 10);
            ctx.lineTo(dx + 8, dy);
            ctx.moveTo(dx + 22, dy - 10);
            ctx.lineTo(dx + 26, dy);
          } else {
            // Left back, right forward
            ctx.moveTo(dx + 12, dy - 10);
            ctx.lineTo(dx + 16, dy);
            ctx.moveTo(dx + 22, dy - 10);
            ctx.lineTo(dx + 18, dy);
          }
        } else {
          // Mid-air jump tuck legs
          ctx.moveTo(dx + 12, dy - 10);
          ctx.lineTo(dx + 8, dy - 4);
          ctx.moveTo(dx + 22, dy - 10);
          ctx.lineTo(dx + 24, dy - 2);
        }
        ctx.stroke();
      }
      ctx.restore();

      // 6. Draw Dust Particles
      s.particles.forEach(p => {
        ctx.fillStyle = `${p.color}${Math.max(0, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Loop continue
      s.animationFrameId = requestAnimationFrame(loop);
    };

    s.animationFrameId = requestAnimationFrame(loop);

    return () => {
      mounted = false;
      cancelAnimationFrame(s.animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [initEnvironment, timeOfDay]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* HUD Header */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-sm">
        {/* Mode selector & status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-stone-200/70 dark:bg-stone-800/80 rounded-lg text-xs">
            <button
              onClick={() => {
                if (gameState === 'IDLE') setMode('tranquil');
              }}
              className={`px-3 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
                mode === 'tranquil'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Tranquil Mode
            </button>
            <button
              onClick={() => {
                if (gameState === 'IDLE') setMode('classic');
              }}
              className={`px-3 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
                mode === 'classic'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Classic Challenge
            </button>
          </div>

          {/* Tranquil shields / lives */}
          {mode === 'tranquil' && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <span className="text-[11px] uppercase tracking-wider text-stone-400">Shields</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(heartIdx => (
                  <span
                    key={heartIdx}
                    className={`inline-block w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      heartIdx <= lives
                        ? 'bg-emerald-500 scale-100'
                        : 'bg-stone-300 dark:bg-stone-700 scale-75'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">BEST</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{highScore}m</span>
          </div>
          <span className="text-stone-300 dark:text-stone-600">/</span>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">DISTANCE</span>
            <span className="text-base font-bold text-stone-900 dark:text-stone-50">{score}m</span>
          </div>
        </div>
      </div>

      {/* Canvas Game Arena */}
      <div className="relative w-full max-w-4xl h-[300px] sm:h-[340px] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm select-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-pointer"
          onClick={() => {
            if (gameState === 'IDLE' || gameState === 'GAME_OVER') startGame();
            else triggerJump();
          }}
        />

        {/* Idle Overlay / Start */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/10 backdrop-blur-[2px]">
            <div className="text-center p-6 bg-white/90 dark:bg-stone-900/90 rounded-2xl shadow-lg border border-stone-200/80 dark:border-stone-800 max-w-sm">
              <h3 className="font-serif text-2xl font-normal text-stone-900 dark:text-stone-100 mb-2">
                Dusk Dune Runner
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 mb-5 leading-relaxed">
                A serene desert sprint through twilight dunes. Jump over desert cacti and duck beneath low-flying swallows.
              </p>
              <button
                onClick={startGame}
                className="w-full py-2.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-sm font-medium transition-transform active:scale-98 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Begin Sprint</span>
              </button>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-3">
                Space or ↑ to Jump · ↓ to Duck
              </p>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/25 backdrop-blur-xs">
            <div className="text-center p-6 bg-white/95 dark:bg-stone-900/95 rounded-2xl shadow-lg border border-stone-200/80 dark:border-stone-800">
              <p className="font-serif text-xl text-stone-800 dark:text-stone-100 mb-4">Quiet Moment</p>
              <button
                onClick={togglePause}
                className="py-2 px-6 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium cursor-pointer"
              >
                Resume Run
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/30 backdrop-blur-xs">
            <div className="text-center p-6 bg-white/95 dark:bg-stone-900/95 rounded-2xl shadow-xl border border-stone-200/80 dark:border-stone-800 max-w-xs animate-in fade-in duration-200">
              <span className="text-xs uppercase tracking-wider text-stone-400">Run Finished</span>
              <p className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-50 mt-1 mb-1 tabular-nums">
                {score}m
              </p>
              <p className="text-xs text-stone-500 mb-5">
                {score >= highScore ? 'New Personal Record' : `Best: ${highScore}m`}
              </p>
              <button
                onClick={startGame}
                className="w-full py-2.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-medium transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Run Again</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch & Quick Controls for mobile and convenience */}
      <div className="w-full max-w-4xl flex items-center justify-between mt-4">
        {/* Helper instructions */}
        <div className="text-xs text-stone-500 hidden sm:flex items-center gap-2">
          <span>Tap canvas or Spacebar to jump</span>
          <span aria-hidden="true">·</span>
          <span>Arrow Down to duck</span>
          <span aria-hidden="true">·</span>
          <span>P to pause</span>
        </div>

        {/* Touch button pad for mobile / tablet devices */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onPointerDown={() => setDucking(true)}
            onPointerUp={() => setDucking(false)}
            onPointerLeave={() => setDucking(false)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2.5 px-4 bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-medium active:scale-95 transition-all select-none cursor-pointer"
          >
            <ArrowDown className="w-4 h-4" />
            <span>Duck</span>
          </button>
          <button
            onPointerDown={triggerJump}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2.5 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-medium active:scale-95 transition-all select-none cursor-pointer shadow-xs"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Jump</span>
          </button>
          {gameState === 'PLAYING' && (
            <button
              onClick={togglePause}
              aria-label="Pause"
              className="p-2.5 bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
