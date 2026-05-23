import React, { useEffect, useRef, useState } from "react";
import { Particle } from "../types";

interface MonsterChaseCanvasProps {
  strikeCount: number;
  distance: number; // in meters (e.g. 0 to 25)
  speed: number;    // arbitrary running units
  gameState: "PLAYING" | "PAUSED" | "GAMEOVER" | "VICTORY";
  triggerVfx: "correct" | "incorrect" | "timeout" | null;
  onVfxDone: () => void;
}

export default function MonsterChaseCanvas({
  strikeCount,
  distance,
  speed,
  gameState,
  triggerVfx,
  onVfxDone,
}: MonsterChaseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 210 });

  // Animation Refs to prevent stale closures in requestAnimationFrame
  const animationFrameId = useRef<number | null>(null);
  const offsetRef = useRef<number>(0);
  const playerFrameRef = useRef<number>(0);
  const monsterTentacleAngle = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const screenShakeRef = useRef<number>(0);
  const flashColorRef = useRef<string | null>(null);
  const flashOpacityRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);

  // Resize handler
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 600,
          height: 210, // constant optimal height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle sudden VFX changes
  useEffect(() => {
    if (!triggerVfx) return;

    if (triggerVfx === "correct") {
      screenShakeRef.current = 8;
      flashColorRef.current = "rgba(34, 197, 94, 0.45)";
      flashOpacityRef.current = 1.0;
      // Emit heavy green speed sparks
      const canvas = canvasRef.current;
      if (canvas) {
        const py = canvas.height * 0.65;
        const px = canvas.width * 0.55; 
        for (let i = 0; i < 40; i++) {
          particlesRef.current.push({
            x: px,
            y: py,
            vx: (Math.random() * 12 + 4), // Burst forward
            vy: (Math.random() * 8 - 4),
            color: `hsl(${Math.random() * 40 + 100}, 95%, 60%)`, // neon greens
            size: Math.random() * 5 + 3,
            alpha: 1.0,
            decay: Math.random() * 0.03 + 0.02,
          });
        }
      }
    } else if (triggerVfx === "incorrect" || triggerVfx === "timeout") {
      screenShakeRef.current = 18; // Heavy impact slam
      flashColorRef.current = "rgba(239, 68, 68, 0.5)";
      flashOpacityRef.current = 1.0;
      // Emit retro orange/red spark debris
      const canvas = canvasRef.current;
      if (canvas) {
        const py = canvas.height * 0.65;
        const px = canvas.width * 0.55; 
        for (let i = 0; i < 45; i++) {
          particlesRef.current.push({
            x: px,
            y: py,
            vx: (Math.random() * 10 - 5) - 3, // Fly feedbackwards
            vy: (Math.random() * 12 - 6),
            color: `hsl(${Math.random() * 30 + 0}, 100%, 55%)`, // fiery reds
            size: Math.random() * 6 + 3,
            alpha: 1.0,
            decay: Math.random() * 0.02 + 0.01,
          });
        }
      }
    }

    const timer = setTimeout(() => {
      onVfxDone();
    }, 400);
    return () => clearTimeout(timer);
  }, [triggerVfx, onVfxDone]);

  // Main Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      // Dimensions
      const w = canvas.width;
      const h = canvas.height;
      frameCounterRef.current += 1;

      // Handle screen shake factor decay
      let dx = 0;
      let dy = 0;
      if (screenShakeRef.current > 0) {
        dx = (Math.random() - 0.5) * screenShakeRef.current;
        dy = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.9; // decay
        if (screenShakeRef.current < 0.2) screenShakeRef.current = 0;
      }

      ctx.save();
      ctx.translate(dx, dy);

      // 1. Render Sky/Space Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#080b11");
      skyGrad.addColorStop(1, "#121824");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Parallax starry background + formula dust
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      for (let i = 0; i < 20; i++) {
        const starX = ((i * 137) - (offsetRef.current * 0.15)) % w;
        const starY = (i * 11) % (h * 0.5);
        ctx.fillRect(starX < 0 ? starX + w : starX, starY, 2, 2);
      }

      // Draw floating neon chemical symbols / equations in background
      ctx.font = "italic 10px monospace";
      ctx.fillStyle = "rgba(56, 189, 248, 0.13)";
      const equations = ["e = mc²", "F = ma", "PV = nRT", "pH = -log[H⁺]", "∫ eˣ dx", "λ = h/p"];
      equations.forEach((eq, idx) => {
        const eqX = ((idx * 220) - (offsetRef.current * 0.4)) % (w + 100);
        const eqY = 40 + (idx * 20) % 90;
        ctx.fillText(eq, eqX - 50 < 0 ? eqX + w : eqX - 50, eqY);
      });

      // 3. Render Ground pathways
      // Side Walls representing Pulchowk gate corridor
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, h * 0.8, w, h * 0.2);

      // Ground pattern lines (running speed lines)
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.8);
      ctx.lineTo(w, h * 0.8);
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.fillRect(0, h * 0.82, w, 3);

      // Moving ground hazard grid lines to convey high running speed
      ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
      ctx.lineWidth = 2;
      for (let x = -50; x < w + 100; x += 60) {
        const scrollX = x - (offsetRef.current % 60);
        ctx.beginPath();
        ctx.moveTo(scrollX, h * 0.8);
        ctx.lineTo(scrollX - 40, h);
        ctx.stroke();
      }

      // 4. Update and Draw Particles
      const activeParticles = particlesRef.current;
      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          activeParticles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Generate soft dust particles back trailing from player's feet
      if (gameState === "PLAYING" && Math.random() < 0.4 + (speed * 0.1)) {
        const px = w * 0.55;
        const py = h * 0.77;
        particlesRef.current.push({
          x: px,
          y: py,
          vx: -(Math.random() * 4 + 2) - speed * 0.3,
          vy: -Math.random() * 2,
          color: "rgba(148, 163, 184, 0.4)",
          size: Math.random() * 3 + 1,
          alpha: 0.8,
          decay: 0.04,
        });
      }

      // 5. Calculate player & monster positions dynamically
      // Distance range is generally 0-25 meters.
      // Maximum distance we display safely is 25m, minimum 0m.
      // We will place the player close to center-right.
      // The Monster is on the left. The higher the distance, the further left the monster is.
      const playerX = w * 0.6;
      const playerY = h * 0.75;

      // Map distance from 0m - 25m onto canvas X. 
      // If distance is 0, monster gets right onto playerX.
      // If distance is 25, monster is off-screen left (or far left).
      const gapRatio = Math.max(0, Math.min(25, distance)) / 25; // 0 (caught) to 1 (safe)
      let monsterX = playerX - 100 - (gapRatio * (w * 0.45));
      if (strikeCount === 1) {
        // Enforce physical feedback positions based on strikes too
        monsterX = Math.max(monsterX, w * 0.15);
      } else if (strikeCount === 2) {
        monsterX = Math.max(monsterX, w * 0.35);
      } else if (strikeCount >= 3 || distance <= 0) {
        monsterX = playerX - 20; // Caught
      }

      // Add a floating height for monster
      monsterTentacleAngle.current += 0.08;
      const monsterY = h * 0.5 + Math.sin(monsterTentacleAngle.current) * 8;

      // 6. Draw the Syllabus Exam Monster (Terrifying Void Beast of Exams!)
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(168, 85, 247, 0.8)"; // Neon purple dark magic aura

      // A. Draw multiple layered writhing void tentacles with sharp glowing thorns
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const tentacleCount = 6;
      for (let j = 0; j < tentacleCount; j++) {
        const baseTentacleY = monsterY + (j - (tentacleCount - 1) / 2) * 11;
        
        ctx.strokeStyle = `rgba(${120 + j * 20}, 40, 240, 0.55)`;
        ctx.lineWidth = 7 - (j % 2) * 2;
        
        ctx.beginPath();
        ctx.moveTo(monsterX, baseTentacleY);
        
        // Complex wavy path stretching forward
        const waveFreq = monsterTentacleAngle.current * 1.8 + j * 0.9;
        const cp1x = monsterX + 50;
        const cp1y = baseTentacleY + Math.sin(waveFreq) * 24;
        const cp2x = monsterX + 110;
        const cp2y = baseTentacleY + Math.cos(waveFreq * 0.8) * 18;
        const destX = monsterX + 130 + Math.sin(waveFreq) * 10;
        const destY = baseTentacleY + Math.cos(waveFreq) * 15;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, destX, destY);
        ctx.stroke();

        // Draw barbed hooks/thorns along tentacles
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 6;
        for (let t = 1; t <= 3; t++) {
          const ratio = t / 4;
          // Approximating cubic bezier point
          const tx = monsterX * Math.pow(1 - ratio, 3) + 3 * cp1x * ratio * Math.pow(1 - ratio, 2) + 3 * cp2x * Math.pow(ratio, 2) * (1 - ratio) + destX * Math.pow(ratio, 3);
          const ty = baseTentacleY * Math.pow(1 - ratio, 3) + 3 * cp1y * ratio * Math.pow(1 - ratio, 2) + 3 * cp2y * Math.pow(ratio, 2) * (1 - ratio) + destY * Math.pow(ratio, 3);
          
          ctx.beginPath();
          ctx.arc(tx, ty + (t % 2 === 0 ? 5 : -5), 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // B. Draw floating charred syllabus exam sheets decorated with F grades circulating the monster
      ctx.shadowBlur = 5;
      ctx.shadowColor = "rgba(220, 38, 38, 0.4)";
      for (let s = 0; s < 3; s++) {
        const orbitAngle = monsterTentacleAngle.current * 0.5 + s * (Math.PI * 2 / 3);
        const sheetX = monsterX + Math.cos(orbitAngle) * 65 - 15;
        const sheetY = monsterY + Math.sin(orbitAngle * 1.5) * 45;

        ctx.save();
        ctx.translate(sheetX, sheetY);
        ctx.rotate(orbitAngle * 0.4);
        
        // Charred paper base
        ctx.fillStyle = s % 2 === 0 ? "#1e293b" : "#0f172a";
        ctx.strokeStyle = "rgba(239, 68, 68, 0.7)"; // bleeding red margins
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Jagged jagged burnt-corner rect
        ctx.moveTo(-10, -12);
        ctx.lineTo(8, -14);
        ctx.lineTo(12, 10);
        ctx.lineTo(-12, 12);
        ctx.lineTo(-11, -3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Red "F" grade marker
        ctx.fillStyle = "#f43f5e";
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillText("F", -3, 3);

        // Crisscross exam failures
        ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-7, -5);
        ctx.lineTo(-2, -5);
        ctx.moveTo(-6, 6);
        ctx.lineTo(4, 6);
        ctx.stroke();
        ctx.restore();
      }

      // C. Draw vibrating Spiky obsidian energy body outline (pure jagged chaos)
      const bodyRad = 44;
      ctx.shadowBlur = 24;
      ctx.shadowColor = "rgba(124, 58, 237, 0.9)"; // Deep violet glow

      ctx.fillStyle = "#0c0a15"; // Midnight dark obsidian core
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      const numSpikes = 20;
      for (let i = 0; i < numSpikes; i++) {
        const angle = (i * Math.PI * 2) / numSpikes;
        // High frequency vibration factor
        const vibration = Math.sin(monsterTentacleAngle.current * 2.8 + i * 1.5) * 5.5;
        const curRad = bodyRad + (i % 2 === 0 ? 8 : -4) + vibration;
        
        const sx = monsterX + Math.cos(angle) * curRad;
        const sy = monsterY + Math.sin(angle) * curRad;
        
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // D. Draw curling obsidian Horns on top/back
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ef4444";
      const hornGrad = ctx.createLinearGradient(monsterX - 20, monsterY - 50, monsterX + 5, monsterY - 30);
      hornGrad.addColorStop(0, "#f97316"); // Burning orange horn tip
      hornGrad.addColorStop(0.3, "#dc2626"); // blood-red
      hornGrad.addColorStop(1, "#1e1b4b"); // indigo base
      
      // Top main horn
      ctx.fillStyle = hornGrad;
      ctx.beginPath();
      ctx.moveTo(monsterX - 15, monsterY - 25);
      // Curl forward menacingly
      ctx.bezierCurveTo(monsterX - 25, monsterY - 55, monsterX + 18, monsterY - 60, monsterX + 22, monsterY - 36);
      ctx.bezierCurveTo(monsterX + 12, monsterY - 44, monsterX - 10, monsterY - 40, monsterX - 10, monsterY - 20);
      ctx.closePath();
      ctx.fill();

      // Bottom back counter horn
      ctx.beginPath();
      ctx.moveTo(monsterX - 15, monsterY + 25);
      ctx.bezierCurveTo(monsterX - 25, monsterY + 55, monsterX + 18, monsterY + 60, monsterX + 22, monsterY + 36);
      ctx.bezierCurveTo(monsterX + 12, monsterY + 44, monsterX - 10, monsterY + 40, monsterX - 10, monsterY + 20);
      ctx.closePath();
      ctx.fill();

      // E. Draw gaping red fleshy maw cavern (jaws open wide!)
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#3b0712"; // dark red bloody throat
      ctx.beginPath();
      ctx.arc(monsterX + 14, monsterY + 14, 16, -Math.PI * 0.35, Math.PI * 0.45, false);
      ctx.closePath();
      ctx.fill();

      // Sharp serrated fangs dripping dynamic glowing acid
      ctx.fillStyle = "#f8fafc"; // White razor fangs
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 0.5;
      
      // Upper rows of teeth
      ctx.beginPath();
      ctx.moveTo(monsterX + 5, monsterY + 5);
      ctx.lineTo(monsterX + 12, monsterY + 12);
      ctx.lineTo(monsterX + 13, monsterY + 3);
      ctx.lineTo(monsterX + 18, monsterY + 11);
      ctx.lineTo(monsterX + 20, monsterY + 2);
      ctx.lineTo(monsterX + 26, monsterY + 9);
      ctx.stroke();
      ctx.fill();

      // Lower rows of teeth pointing upwards
      ctx.beginPath();
      ctx.moveTo(monsterX + 4, monsterY + 22);
      ctx.lineTo(monsterX + 11, monsterY + 15);
      ctx.lineTo(monsterX + 14, monsterY + 24);
      ctx.lineTo(monsterX + 17, monsterY + 16);
      ctx.lineTo(monsterX + 20, monsterY + 23);
      ctx.lineTo(monsterX + 23, monsterY + 14);
      ctx.stroke();
      ctx.fill();

      // Dripping bright green acidic drool
      if (frameCounterRef.current % 18 < 6) {
        ctx.fillStyle = "#a3e635"; // Neon toxic slime
        ctx.beginPath();
        const dripOffset = (frameCounterRef.current % 18) * 1.5;
        ctx.arc(monsterX + 19, monsterY + 16 + dripOffset, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // F. Multi-eyed Nightmare Face (Central giant slit-pupil and creepy glowing satellite eyes)
      // 1. Central giant eye
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ef4444";
      ctx.fillStyle = "#ffffff"; // Sclera
      ctx.beginPath();
      const eyeX = monsterX + 16;
      const eyeY = monsterY - 12;
      ctx.arc(eyeX, eyeY, 11, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing Crimson Iris
      const irisPulse = 6 + Math.sin(monsterTentacleAngle.current * 3) * 1.5;
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, irisPulse, 0, Math.PI * 2);
      ctx.fill();

      // Vertical feline black slit-pupil
      ctx.fillStyle = "#090514";
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, 1.8, irisPulse - 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Extra satellite eyes (pulsing randomly above and below)
      ctx.fillStyle = "#e0f2fe";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1;
      
      // Secondary small eye 1 (above)
      ctx.beginPath();
      ctx.arc(monsterX + 6, monsterY - 24, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#facc15"; // scary yellow pupils
      ctx.beginPath();
      ctx.arc(monsterX + 6.5, monsterY - 24, 2, 0, Math.PI * 2);
      ctx.fill();

      // Secondary small eye 2 (middle)
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.arc(monsterX - 4, monsterY - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(monsterX - 3.5, monsterY - 5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Warning text from Monster if too close
      if (distance < 8 && gameState === "PLAYING") {
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillStyle = "#ff8a8a";
        ctx.fillText("I'M COGNITIVE BEHIND YOU!", monsterX - 30, monsterY - 50);
      }

      // 7. Draw the Runner (The Aspirant)
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(34, 197, 94, 0.8)"; // Neon green running trial

      // Cycle player runner frames for foot coordinates
      playerFrameRef.current += 1.3 * (speed / 10 + 0.5);
      const walkCycle = Math.sin(playerFrameRef.current * 0.25);

      // Body (Sleek light blue-green suit)
      ctx.fillStyle = "#22c55e"; // Pulsing bright neon green
      const rx = playerX;
      let ry = playerY;

      // Jump adjustment if strike bungeed or tripped
      if (strikeCount >= 3 || distance <= 0) {
        // Dragging/Falling coordinate
        ry += 15;
        ctx.fillStyle = "#ef4444"; // Bleeding Red
      } else if (strikeCount > 0 && Math.sin(playerFrameRef.current * 0.1) > 0.6) {
        // Stumble jitter
        ry += Math.sin(playerFrameRef.current) * 4;
      }

      // Draw character nodes: Legs, Arms, Head, Torso
      // Head
      ctx.beginPath();
      ctx.arc(rx, ry - 30, 7, 0, Math.PI * 2);
      ctx.fill();

      // Glasses or Cap representing student
      ctx.fillStyle = "#3b82f6"; // cool blue advisor
      ctx.fillRect(rx - 2, ry - 32, 10, 3);
      ctx.fillRect(rx + 6, ry - 31, 2, 2);

      // Torso (Lean Forward)
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(rx - 2, ry - 23);
      ctx.lineTo(rx + 5, ry - 10);
      ctx.stroke();

      // Running Legs
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 4;
      // Leg 1 (Front leg)
      ctx.beginPath();
      ctx.moveTo(rx + 5, ry - 10);
      const frontKneeX = rx + 14 + walkCycle * 8;
      const frontKneeY = ry - 2 + Math.abs(walkCycle) * 3;
      ctx.lineTo(frontKneeX, frontKneeY);
      ctx.lineTo(frontKneeX + 6, ry + 5);
      ctx.stroke();

      // Leg 2 (Back leg)
      ctx.beginPath();
      ctx.moveTo(rx + 5, ry - 10);
      const backKneeX = rx - 6 - walkCycle * 8;
      const backKneeY = ry - 1 + Math.abs(walkCycle) * -3;
      ctx.lineTo(backKneeX, backKneeY);
      ctx.lineTo(backKneeX - 4, ry + 5);
      ctx.stroke();

      // Active arms pumping
      ctx.strokeStyle = "#6ee7b7";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx, ry - 20);
      ctx.lineTo(rx + 14 - walkCycle * 5, ry - 14);
      ctx.lineTo(rx + 18, ry - 8);
      ctx.stroke();

      // Restore parameters
      ctx.shadowBlur = 0;

      // 8. Draw Wall Strike Hits (CGI/VFX Side indicators)
      if (strikeCount >= 1) {
        // Left side Wall crash impact indicator (Strike 1)
        ctx.fillStyle = "rgba(220, 38, 38, 0.4)";
        const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
        ctx.globalAlpha = 0.4 * pulse;
        ctx.fillRect(0, 0, 35, h * 0.8);
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 35, h * 0.8);

        // Text tag
        ctx.font = "bold 8px 'JetBrains Mono'";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("CRASH 1", 3, h * 0.4);
      }

      if (strikeCount >= 2) {
        // Right side Wall crash impact (Strike 2)
        ctx.fillStyle = "rgba(220, 38, 38, 0.4)";
        const pulse = 0.5 + Math.cos(Date.now() * 0.012) * 0.5;
        ctx.globalAlpha = 0.4 * pulse;
        ctx.fillRect(w - 35, 0, 35, h * 0.8);
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2;
        ctx.strokeRect(w - 35, 0, 35, h * 0.8);

        // Text tag
        ctx.font = "bold 8px 'JetBrains Mono'";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("CRASH 2", w - 33, h * 0.4);
      }

      // Flash feedback overlay on question submit
      if (flashColorRef.current && flashOpacityRef.current > 0) {
        ctx.fillStyle = flashColorRef.current;
        ctx.globalAlpha = flashOpacityRef.current;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1.0;
        flashOpacityRef.current -= 0.04;
        if (flashOpacityRef.current <= 0) {
          flashColorRef.current = null;
        }
      }

      ctx.restore();

      // Continuous animation logic
      if (gameState === "PLAYING") {
        offsetRef.current += speed * 0.5;
      }
      animationFrameId.current = requestAnimationFrame(render);
    };

    // Trigger loop
    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [dimensions, strikeCount, distance, speed, gameState]);

  // Render HTML container
  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl scanlines"
    >
      {/* Top dashboard within canvas frame overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-center pointer-events-none">
        <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
            Path: Pulchowk Arena
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50 flex space-x-2 items-center text-xs">
            <span className="text-slate-400 font-mono">Distance to Catch:</span>
            <span
              className={`font-mono font-bold ${
                distance < 8 ? "text-red-400 animate-pulse text-sm" : "text-amber-400"
              }`}
            >
              {distance.toFixed(1)}m
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50 flex space-x-2 items-center text-xs">
            <span className="text-slate-400 font-mono">Speed:</span>
            <span className="font-mono font-bold text-emerald-400">
              {(speed * 8.4).toFixed(0)} km/h
            </span>
          </div>
        </div>
      </div>

      {/* Screen Damage Indicator Text Layer for heavy focus */}
      {strikeCount > 0 && gameState === "PLAYING" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-red-950/80 backdrop-blur border border-red-800/60 px-3 py-1 rounded-full text-[10px] font-mono text-red-400 flex items-center space-x-1.5 uppercase tracking-widest animate-pulse">
          <span>⚠️ System Damaged! {3 - strikeCount} Runs Left</span>
        </div>
      )}

      {/* Interactive Canvas Rendering Node */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-[210px] bg-[#090d14]"
      />
    </div>
  );
}
