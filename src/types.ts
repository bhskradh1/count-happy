export interface RawQuestion {
  id: string;
  subject: "Physics" | "Chemistry" | "Mathematics" | "Biology";
  exam: "IOE" | "CEE" | "BOTH";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type SubjectOption = "All" | "Physics" | "Chemistry" | "Mathematics" | "Biology";

export type TargetExam = "IOE" | "CEE";

export type GameModeOption = "SOLO" | "MULTIPLAYER";

export type MultiplayerSubmode = "VS_BOT" | "LOCAL_1V1" | "ONLINE_DUEL";

export interface BotOpponent {
  name: string;
  accuracy: number; // 0 to 1
  minSpeedMs: number;
  maxSpeedMs: number;
  rank: string;
  description: string;
}

export const BOT_PRESETS: BotOpponent[] = [
  {
    name: "Sujal (IOE Rank #12)",
    accuracy: 0.88,
    minSpeedMs: 4000,
    maxSpeedMs: 7000,
    rank: "Master",
    description: "Incredibly fast calculus solver with 90% syllabus command.",
  },
  {
    name: "Sneha (CEE Rank #45)",
    accuracy: 0.82,
    minSpeedMs: 5000,
    maxSpeedMs: 9000,
    rank: "Elite",
    description: "Rapid biology specialist. Rare lapses in physical chemistry.",
  },
  {
    name: "Arjun (Pulchowk Aspirant)",
    accuracy: 0.70,
    minSpeedMs: 6000,
    maxSpeedMs: 12000,
    rank: "Gladiator",
    description: "Strong basic mechanics. Stumbles slightly in AC circuit harmonics.",
  },
  {
    name: "Binita (Kathmandu Medic)",
    accuracy: 0.60,
    minSpeedMs: 7000,
    maxSpeedMs: 14000,
    rank: "Challenger",
    description: "Solid plant physiology revision. Takes a bit more time to calculate.",
  }
];

export interface GameScoreState {
  score: number;
  streak: number;
  highestStreak: number;
  correctCount: number;
  incorrectCount: number;
  strikeCount: number; // 0 to 3
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}
