import React, { useEffect, useRef, useState } from "react";
import { Particle } from "../types";
// @ts-ignore
import tugOfWarImg from "../assets/images/tug_of_war_1779456959697.png";

interface TugOfWarCanvasProps {
  ropePosition: number; // Value from -100 (Player 1 fully dominant) to +100 (Player 2 / Bot fully dominant). 0 is center.
  player1Name: string;
  player2Name: string;
  gameState: "PLAYING" | "PAUSED" | "GAMEOVER";
  lastAction: "p1_pull" | "p2_pull" | "p1_fail" | "p2_fail" | null;
  onVfxDone: () => void;
  winner?: "p1" | "p2" | null;
  p1Streak?: number;
  p2Streak?: number;
  lastActionSpeed?: number;
}

export default function TugOfWarCanvas({
  ropePosition,
  player1Name,
  player2Name,
  gameState,
  lastAction,
  onVfxDone,
  winner,
  p1Streak = 0,
  p2Streak = 0,
  lastActionSpeed = 1.0,
}: TugOfWarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 210 });

  const animationFrameId = useRef<number | null>(null);
  const ropeOffset = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<number>(0);
  const frameCounter = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Organic elastic spring & motion refs
  const lerpedOffsetRef = useRef<number>(0);
  const ropeVelocityRef = useRef<number>(0);
  const p1VisualTranslateRef = useRef<number>(0);
  const p2VisualTranslateRef = useRef<number>(0);
  const p1VisualRotateRef = useRef<number>(0);
  const p2VisualRotateRef = useRef<number>(0);

  // Dhaka Topi Player Vector Drawer Function
  const drawDhakaTopiPlayer = (
    ctx: CanvasRenderingContext2D,
    cx: number, // Base ground center coordinates
    cy: number,
    isLeftTeam: boolean,
    isWinner: boolean,
    isLoser: boolean,
    playerIndex: number,
    frame: number
  ) => {
    ctx.save();

    // 1. Position sways
    let rx = cx;
    let ry = cy;

    let headY = ry - 54;
    let torsoAngle = isLeftTeam ? -0.2 : 0.2;
    let hand1X = rx;
    let hand1Y = ry - 40;
    let hand2X = rx;
    let hand2Y = ry - 40;

    // Normal active game swaying motion
    const cycleSpeed = 0.08;
    const swayFactor = Math.sin(frame * cycleSpeed + playerIndex * 1.5);
    const normalSway = swayFactor * 5;
    const normalSwayAngle = swayFactor * 0.05;

    if (isWinner) {
      // WINNER CHAMP JUMP & HIGH FIVE MODE
      const jumpCycle = frame * 0.16 + playerIndex * Math.PI;
      const jumpH = Math.max(0, Math.sin(jumpCycle)) * 15;
      ry -= jumpH;
      headY = ry - 54;
      torsoAngle = isLeftTeam ? -0.05 : 0.05;

      // High five hands alignment:
      // Player 0 and Player 1 turn towards each other and clap high in the middle
      const isP0 = playerIndex === 0;
      
      // Hands raised high to high-five
      hand1X = rx + (isP0 ? -12 : 12);
      hand1Y = ry - 75 + Math.sin(frame * 0.2) * 3;
      
      // Other arm waving high
      hand2X = rx + (isP0 ? 15 : -15);
      hand2Y = ry - 60 + Math.cos(frame * 0.12) * 5;

    } else if (isLoser) {
      // LOSER SITTING COUCH/FLOOR STATE COWERING SADLY
      ry += 15; // sit on ground
      headY = ry - 32;
      torsoAngle = isLeftTeam ? 0.35 : -0.35; // slouched or lying back sadly

      // Dropped hands sadly
      hand1X = rx + (isLeftTeam ? 10 : -10);
      hand1Y = ry - 14;
      hand2X = rx + (isLeftTeam ? -10 : 10);
      hand2Y = ry - 10;

    } else {
      // PLAYING SLOW FORWARD/BACKWARD PULL TENSION SWAYING
      torsoAngle = isLeftTeam ? (-0.26 + normalSwayAngle) : (0.26 - normalSwayAngle);
      rx += normalSway;
      headY = ry - 52 + Math.abs(normalSway) * 0.2;

      // Determined bracing hands pulling rope tight
      const ropeLevelY = cy - 8;
      const reachOffset = isLeftTeam ? 24 : -24;
      hand1X = rx + reachOffset;
      hand1Y = ropeLevelY;
      hand2X = rx + reachOffset - (isLeftTeam ? 6 : -6);
      hand2Y = ropeLevelY;
    }

    // --- DRAW CHARACTERS ---

    // 1. Legs / Footwear
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 6.5;
    ctx.lineCap = "round";

    if (isLoser) {
      // Drawn sitting sadly with extended legs
      ctx.beginPath();
      // Leg 1 flat
      ctx.moveTo(rx, ry - 8);
      ctx.lineTo(rx + (isLeftTeam ? 22 : -22), ry);
      // Leg 2 bent
      ctx.moveTo(rx, ry - 8);
      ctx.lineTo(rx + (isLeftTeam ? -12 : 12), ry - 2);
      ctx.stroke();

      // Flat red/blue shoes
      ctx.fillStyle = isLeftTeam ? "#e11d48" : "#2563eb";
      ctx.beginPath();
      ctx.arc(rx + (isLeftTeam ? 22 : -22), ry, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Wide athletic pulling stance
      ctx.beginPath();
      ctx.moveTo(rx - 3, ry - 18);
      ctx.lineTo(rx - 14, ry);
      ctx.moveTo(rx + 3, ry - 18);
      ctx.lineTo(rx + 14, ry);
      ctx.stroke();

      // Shoes
      ctx.fillStyle = isLeftTeam ? "#e11d48" : "#2563eb";
      ctx.fillRect(rx - 18, ry, 6, 3.5);
      ctx.fillRect(rx + 12, ry, 6, 3.5);
    }

    // 2. Torso (Vest shirt)
    const shirtColor = isLeftTeam ? "#0ea5e9" : "#f43f5e"; // Light blue vs light red
    ctx.fillStyle = shirtColor;
    ctx.strokeStyle = shirtColor;

    ctx.save();
    ctx.translate(rx, ry - 22);
    ctx.rotate(torsoAngle);

    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.lineTo(8, -15);
    ctx.lineTo(6, 12);
    ctx.lineTo(-6, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Sleeves & Arms
    ctx.strokeStyle = shirtColor;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const shoulderY = headY + 12;
    const shoulderX = rx + (isWinner ? 0 : (isLeftTeam ? 4 : -4));

    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo((shoulderX + hand1X) / 2, (shoulderY + hand1Y) / 2 - 2);
    ctx.lineTo(hand1X, hand1Y);

    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo((shoulderX + hand2X) / 2, (shoulderY + hand2Y) / 2 - 2);
    ctx.lineTo(hand2X, hand2Y);
    ctx.stroke();

    // Hands
    ctx.fillStyle = "#fbcfe8"; // skin tone helper
    ctx.beginPath();
    ctx.arc(hand1X, hand1Y, 3, 0, Math.PI * 2);
    ctx.arc(hand2X, hand2Y, 3, 0, Math.PI * 2);
    ctx.fill();

    // If winner, draw the high-five sparkly burst claps!
    if (isWinner && playerIndex === 0) {
      const sparkCycle = frame % 16;
      if (sparkCycle < 8) {
        ctx.save();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        const clX = rx - 18; // mid coordinate
        const clY = ry - 75;
        
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const deg = (i * Math.PI) / 4 + frame * 0.15;
          ctx.moveTo(clX, clY);
          ctx.lineTo(clX + Math.cos(deg) * 8, clY + Math.sin(deg) * 8);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. Face/Head
    ctx.fillStyle = "#fecdd3";
    ctx.beginPath();
    ctx.arc(rx, headY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes and mouth details
    ctx.save();
    ctx.translate(rx, headY);
    const lookRight = isWinner ? (playerIndex === 0 ? -1 : 1) : (isLeftTeam ? 1 : -1);

    if (isLoser) {
      // Dead sad eyes "x x"
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lookRight * 2 - 2, -2);
      ctx.lineTo(lookRight * 2 + 1, 1);
      ctx.moveTo(lookRight * 2 + 1, -2);
      ctx.lineTo(lookRight * 2 - 2, 1);
      ctx.stroke();

      // Downwards curved mouth
      ctx.beginPath();
      ctx.arc(lookRight * 3, 4, 3, Math.PI, 0, false);
      ctx.stroke();

      // Micro teardrops shedding
      if ((frame + playerIndex * 15) % 36 < 18) {
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        const dropSpreadY = 3 + ((frame + playerIndex * 15) % 18) * 0.6;
        ctx.arc(lookRight * 4, dropSpreadY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (isWinner) {
      // Super excited eyes "^ ^"
      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lookRight * 2.5, -1, 2, Math.PI, 0, false);
      ctx.stroke();

      // Big bright smile
      ctx.fillStyle = "#991b1b";
      ctx.beginPath();
      ctx.arc(lookRight * 3, 3, 4, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();

      // White teeth teeth line
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(lookRight * 3 - 2, 3, 4, 1.2);
    } else {
      // ACTIVE GRIT FACE
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(lookRight * 3, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Dry serious grit mouth
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lookRight * 1, 3.2);
      ctx.lineTo(lookRight * 5, 3.2);
      ctx.stroke();

      // Focus eyebrow slanting downwards
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(lookRight * 1.5, -4);
      ctx.lineTo(lookRight * 5, -2);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Kathmandu Traditional Dhaka Topi Cap polygon with dynamic clipping
    ctx.save();
    ctx.translate(rx, headY - 8);

    const isFacingRight = lookRight > 0;
    ctx.beginPath();
    if (isFacingRight) {
      ctx.moveTo(-11, 2);    // back bottom left
      ctx.lineTo(-9, -8);    // back top left
      ctx.lineTo(8, -12);    // front peak top right (highest point)
      ctx.lineTo(11, 3);     // front bottom right
    } else {
      ctx.moveTo(-11, 3);    // front bottom left
      ctx.lineTo(-8, -12);   // front peak top left (highest point)
      ctx.lineTo(9, -8);     // back top right
      ctx.lineTo(11, 2);     // back bottom right
    }
    ctx.closePath();

    ctx.fillStyle = "#f8fafc";
    ctx.fill();

    // Clip to safely paint authentic Dhaka weave shapes inside topis
    ctx.clip();

    ctx.strokeStyle = "#dc2626"; // Crimson
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let offset = -20; offset < 20; offset += 7) {
      ctx.moveTo(offset, -15);
      ctx.lineTo(offset + 12, 5);
    }
    ctx.stroke();

    ctx.strokeStyle = "#2563eb"; // Royal Blue
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let offset = -20; offset < 20; offset += 7) {
      ctx.moveTo(offset + 12, -15);
      ctx.lineTo(offset, 5);
    }
    ctx.stroke();

    // Classy bottom rib band
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-12, 1.2, 24, 2);

    ctx.restore();
    ctx.restore();
  };

  // Load tug of war character illustration (kept for compatibility in hook checks)
  useEffect(() => {
    const img = new Image();
    img.src = tugOfWarImg;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
  }, []);

  // Resize listener
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 600,
          height: 210,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Trigger Action Effects
  useEffect(() => {
    if (!lastAction) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const cy = canvas.height * 0.72;
    const cx = canvas.width / 2 + (ropePosition / 100) * (canvas.width * 0.35);

    const speedScale = lastActionSpeed || 1.0;
    const impulseStrength = Math.pow(speedScale, 1.8) * 12;

    if (lastAction === "p1_pull") {
      shakeRef.current = Math.min(20, 10 * speedScale);
      p1VisualTranslateRef.current = -22 * speedScale;
      p2VisualTranslateRef.current = -12 * speedScale;
      p1VisualRotateRef.current = -0.12 * speedScale;
      p2VisualRotateRef.current = -0.04 * speedScale;
      ropeVelocityRef.current -= impulseStrength; // Fast pull velocity punch
      
      // Spawn particles moving left
      const particleCount = Math.round(25 * speedScale);
      const particleColor = speedScale > 1.8 ? "hsl(48, 100%, 50%)" : "hsl(142, 70%, 50%)"; // Gold dynamic lightning if super quick!
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: -(Math.random() * 8 + 3) * (0.6 + speedScale * 0.4),
          vy: (Math.random() * 6 - 3) * (0.6 + speedScale * 0.4),
          color: particleColor,
          size: Math.random() * 5 + 2,
          alpha: 1.0,
          decay: Math.random() * 0.03 + 0.02,
        });
      }
    } else if (lastAction === "p2_pull") {
      shakeRef.current = Math.min(20, 10 * speedScale);
      p2VisualTranslateRef.current = 22 * speedScale;
      p1VisualTranslateRef.current = 12 * speedScale;
      p2VisualRotateRef.current = 0.12 * speedScale;
      p1VisualRotateRef.current = 0.04 * speedScale;
      ropeVelocityRef.current += impulseStrength; // Fast pull velocity punch
      
      // Spawn particles moving right
      const particleCount = Math.round(25 * speedScale);
      const particleColor = speedScale > 1.8 ? "hsl(48, 100%, 50%)" : "hsl(217, 91%, 60%)"; // Gold dynamic lightning if super quick!
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: (Math.random() * 8 + 3) * (0.6 + speedScale * 0.4),
          vy: (Math.random() * 6 - 3) * (0.6 + speedScale * 0.4),
          color: particleColor,
          size: Math.random() * 5 + 2,
          alpha: 1.0,
          decay: Math.random() * 0.03 + 0.02,
        });
      }
    } else if (lastAction === "p1_fail" || lastAction === "p2_fail") {
      shakeRef.current = 15;
      if (lastAction === "p1_fail") {
        p1VisualTranslateRef.current = 16;
        p1VisualRotateRef.current = 0.15;
      } else {
        p2VisualTranslateRef.current = -16;
        p2VisualRotateRef.current = -0.15;
      }
      // Volcanic dark hot orange sparks for friction burn failures
      const sourceX = lastAction === "p1_fail" ? canvas.width * 0.25 : canvas.width * 0.75;
      for (let i = 0; i < 25; i++) {
        particlesRef.current.push({
          x: sourceX,
          y: cy,
          vx: Math.random() * 6 - 3,
          vy: -(Math.random() * 6 + 2),
          color: "hsl(16, 100%, 50%)", // fiery orange
          size: Math.random() * 4 + 2,
          alpha: 1.0,
          decay: Math.random() * 0.04 + 0.02,
        });
      }
    }

    const timer = setTimeout(() => {
      onVfxDone();
    }, 450);
    return () => clearTimeout(timer);
  }, [lastAction, ropePosition, onVfxDone]);

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Handle screening shake decay
      let dX = 0, dY = 0;
      if (shakeRef.current > 0) {
        dX = (Math.random() - 0.5) * shakeRef.current;
        dY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current *= 0.88;
        if (shakeRef.current < 0.2) shakeRef.current = 0;
      }

      ctx.save();
      ctx.translate(dX, dY);

      // 1. Dark Neon Space Arena background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#080c14");
      skyGrad.addColorStop(1, "#111622");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Star constellations or chemical bonds background grid
      ctx.strokeStyle = "rgba(51, 65, 85, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 0; y < h; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      for (let x = 0; x < w; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      // 2. Mud Pit / Hazard Zone in the Center
      const isFrenzy = p1Streak >= 2 && p2Streak >= 2;
      const pitWidth = 80;
      const pitLeft = w / 2 - pitWidth / 2;
      const pitGrad = ctx.createLinearGradient(pitLeft, 0, pitLeft + pitWidth, 0);
      pitGrad.addColorStop(0, "rgba(220, 38, 38, 0.1)");
      pitGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.45)"); // Boiling magma or toxic green chemical pool of failure
      pitGrad.addColorStop(1, "rgba(220, 38, 38, 0.1)");
      ctx.fillStyle = pitGrad;
      ctx.fillRect(pitLeft, h * 0.7, pitWidth, h * 0.3);

      // Pit outlines with warning neon flashes
      frameCounter.current += 1;
      const pulseOpacity = 0.5 + Math.sin(frameCounter.current * 0.1) * 0.3;
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulseOpacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pitLeft, h * 0.7);
      ctx.lineTo(pitLeft, h);
      ctx.moveTo(pitLeft + pitWidth, h * 0.7);
      ctx.lineTo(pitLeft + pitWidth, h);
      ctx.stroke();

      // "HAZARD LINE" tag
      ctx.font = "bold 8px 'JetBrains Mono'";
      ctx.fillStyle = `rgba(239, 68, 68, ${pulseOpacity})`;
      ctx.textAlign = "center";
      ctx.fillText("FAIL PIT", w / 2, h * 0.64);

      // Pulse neon FRENZY MODE overlay if active
      if (isFrenzy && gameState === "PLAYING") {
        ctx.save();
        ctx.font = "italic bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        const frenzyPulse = 0.6 + Math.sin(frameCounter.current * 0.2) * 0.4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(239, 68, 68, ${frenzyPulse})`;
        ctx.fillStyle = `rgba(251, 191, 36, ${0.8 + frenzyPulse * 0.2})`;
        ctx.fillText("⚡ FRENZY MODE: SPEED OSCILLATIONS ACTIVE! ⚡", w / 2, 24);
        ctx.restore();
      }

      // Platforms on left and right for players
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, h * 0.75, pitLeft - 5, h * 0.25);
      ctx.fillRect(pitLeft + pitWidth + 5, h * 0.75, w - (pitLeft + pitWidth + 5), h * 0.25);

      // Plat edges
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.75);
      ctx.lineTo(pitLeft - 5, h * 0.75);
      ctx.lineTo(pitLeft - 5, h);
      ctx.moveTo(w, h * 0.75);
      ctx.lineTo(pitLeft + pitWidth + 5, h * 0.75);
      ctx.lineTo(pitLeft + pitWidth + 5, h);
      ctx.stroke();

      // 3. Move and Render particles
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

      // 4. Calculate dynamic positions of rope and flags using mass-spring-damper physics!
      // Mapping ropePosition (-100 to 100) onto layout
      const centerLimit = w * 0.3; // max visual displacement
      const targetOffset = (ropePosition / 100) * centerLimit;
      
      // Non-linear elastic spring parameters: Hooke's law with friction damping
      const k = 0.08;
      const damping = 0.82;
      const force = (targetOffset - lerpedOffsetRef.current) * k;
      ropeVelocityRef.current += force;
      ropeVelocityRef.current *= damping;
      lerpedOffsetRef.current += ropeVelocityRef.current;

      let visualOffset = lerpedOffsetRef.current;

      // Handle active high-frequency streak frenzy mode!
      if (isFrenzy && gameState === "PLAYING") {
        // rapid violent oscillation of rope & contestants
        visualOffset += Math.sin(frameCounter.current * 0.6) * 9.5;

        // Auto-discharge lightning sparks from central critical threshold
        if (frameCounter.current % 2 === 0) {
          particlesRef.current.push({
            x: w / 2 + visualOffset + (Math.random() - 0.5) * 50,
            y: h * 0.72 + (Math.random() - 0.5) * 12,
            vx: (Math.random() - 0.5) * 6,
            vy: -(Math.random() * 4 + 2),
            color: Math.random() < 0.6 ? "hsl(45, 100%, 50%)" : "hsl(14, 100%, 50%)", // Electrical yellow-orange neon
            size: Math.random() * 3.5 + 1.5,
            alpha: 1.0,
            decay: Math.random() * 0.04 + 0.03,
          });
        }
      }

      const ropeCenterY = h * 0.72;
      const ropeCenterX = w / 2 + visualOffset;

      const p1AnchorX = w * 0.25;
      const p2AnchorX = w * 0.75;

      // Determine victorious status
      const leftWon = winner === "p1" || (gameState === "GAMEOVER" && ropePosition <= -40);
      const rightWon = winner === "p2" || (gameState === "GAMEOVER" && ropePosition >= 40);

      const leftBaseX_0 = (w * 0.25) - 15 + visualOffset;
      const leftBaseX_1 = (w * 0.25) - 50 + visualOffset;

      const rightBaseX_0 = (w * 0.75) + 15 + visualOffset;
      const rightBaseX_1 = (w * 0.75) + 50 + visualOffset;

      // 5. Draw Slack/Tension Physics Rope
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#f59e0b"; // Gold glowing tension
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;

      // Slack calculation
      const isSlack = leftWon || rightWon;
      const sag = isSlack ? 24 : Math.max(1, 10 - Math.abs(ropePosition) * 0.08);

      let leftRopeX = leftBaseX_0 + 20;
      let leftRopeY = h * 0.72;
      let rightRopeX = rightBaseX_0 - 20;
      let rightRopeY = h * 0.72;

      if (leftWon) {
        leftRopeX = leftBaseX_0 - 15;
        leftRopeY = h * 0.75; // slacked down to floor
      }
      if (rightWon) {
        rightRopeX = rightBaseX_0 + 15;
        rightRopeY = h * 0.75; // slacked down to floor
      }

      ctx.beginPath();
      ctx.moveTo(leftRopeX, leftRopeY);
      ctx.quadraticCurveTo((leftRopeX + rightRopeX) / 2, (leftRopeY + rightRopeY) / 2 + sag, rightRopeX, rightRopeY);
      ctx.stroke();
      ctx.restore();

      // Central indicator ribbon flag
      const ribbonX = (leftRopeX + rightRopeX) / 2;
      const ribbonY = (leftRopeY + rightRopeY) / 2 + sag * 0.8;

      ctx.save();
      ctx.fillStyle = "#ef4444";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(ribbonX - 4, ribbonY);
      ctx.lineTo(ribbonX + 4, ribbonY);
      ctx.lineTo(ribbonX, ribbonY + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 6. Draw Left Team (blue shirts, Dhaka Topis)
      drawDhakaTopiPlayer(
        ctx,
        leftBaseX_0,
        h * 0.75,
        true, // isLeftTeam
        leftWon,
        rightWon,
        0, // index
        frameCounter.current
      );

      drawDhakaTopiPlayer(
        ctx,
        leftBaseX_1,
        h * 0.75,
        true, // isLeftTeam
        leftWon,
        rightWon,
        1, // index
        frameCounter.current
      );

      // 7. Draw Right Team (red shirts, Dhaka Topis)
      drawDhakaTopiPlayer(
        ctx,
        rightBaseX_0,
        h * 0.75,
        false, // isLeftTeam
        rightWon,
        leftWon,
        0, // index
        frameCounter.current
      );

      drawDhakaTopiPlayer(
        ctx,
        rightBaseX_1,
        h * 0.75,
        false, // isLeftTeam
        rightWon,
        leftWon,
        1, // index
        frameCounter.current
      );

      // Status notifications if someone gets closer to pit boundary
      if (Math.abs(ropePosition) > 60 && !leftWon && !rightWon) {
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.fillStyle = "#f87171";
        const loserName = ropePosition > 0 ? player1Name : player2Name;
        ctx.fillText(`⚠️ WARNING: ${loserName.toUpperCase()} SLIPPING!`, w / 2, h * 0.16);
      }

      ctx.restore();

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [dimensions, ropePosition, player1Name, player2Name, winner, gameState, p1Streak, p2Streak]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl scanlines"
    >
      {/* Top dashboard within canvas frame overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-center pointer-events-none">
        <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-705/30 text-xs">
          <span className="font-mono text-emerald-400 font-bold">◄ {player1Name}</span>
        </div>

        {/* Rope state indicator bar */}
        <div className="flex-1 max-w-[140px] mx-4 bg-slate-900/90 backdrop-blur p-1 rounded-md border border-slate-700/50 flex flex-col items-center">
          <div className="w-full h-1.5 bg-slate-950 rounded relative overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 transition-all duration-300 ${
                ropePosition < 0 ? "bg-emerald-500 right-1/2" : "bg-blue-500 left-1/2"
              }`}
              style={{
                width: `${Math.min(50, Math.abs(ropePosition) / 2)}%`,
              }}
            />
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase">
            Tension: {Math.abs(ropePosition).toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-705/30 text-xs">
          <span className="font-mono text-blue-400 font-bold">{player2Name} ►</span>
        </div>
      </div>

      {/* Render Node */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-[210px] bg-[#090d14]"
      />
    </div>
  );
}
