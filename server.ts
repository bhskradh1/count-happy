import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import { existsSync } from "fs";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Database File Paths
const LEADERBOARD_FILE = path.join(process.cwd(), "db_leaderboard.json");
const HISTORY_FILE = path.join(process.cwd(), "db_history.json");
const QUESTIONS_FILE = path.join(process.cwd(), "db_questions.json");
const USERS_FILE = path.join(process.cwd(), "db_users.json");

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  streak: number;
  accuracy: number;
  mode: string;
  exam: string;
  createdAt: string;
}

interface BattleLog {
  id: string;
  player: string;
  opponent: string;
  mode: string;
  score: number;
  streak: number;
  result: "WIN" | "LOSS";
  createdAt: string;
}

interface CustomQuestion {
  id: string;
  subject: string;
  exam: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  author?: string;
  createdAt: string;
}

interface RegisteredUser {
  userId: string;
  name: string;
  score: number;
  createdAt: string;
}

interface OnlineUser {
  userId: string;
  name: string;
  score: number;
  rank: string;
  lastActive: number;
}

interface Invite {
  lobbyId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  exam: string;
  subject: string;
  customTopic: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: number;
}

interface OnlineLobby {
  lobbyId: string;
  hostId: string;
  hostName: string;
  hostScore: number;
  hostIndex: number;
  guestId: string;
  guestName: string;
  guestScore: number;
  guestIndex: number;
  status: "WAITING" | "ACTIVE" | "COMPLETED";
  exam: string;
  subject: string;
  customTopic: string;
  questions: any[];
  ropePosition: number; // starts at 0. Host pulls towards -100, Guest pulls towards 100
  lastUpdate: number;
  winnerId?: string;
}

// In-Memory state for online presence and active matchmaking
const onlineUsers: Record<string, OnlineUser> = {};
let invites: Invite[] = [];
const activeLobbies: Record<string, OnlineLobby> = {};

// Rank tiers helper
function getRankTier(score: number): string {
  if (score < 1100) return "🥉 Bronze Aspirant";
  if (score < 1300) return "🥈 Silver Gladiator";
  if (score < 1600) return "🥇 Gold Specialist";
  if (score < 2000) return "🏆 Platinum Master";
  return "⚡ Pulchowk Titan";
}

// Ensure database files are initialized with fallback mock-free Nepal data
async function initDatabase() {
  if (!existsSync(USERS_FILE)) {
    const defaultUsers: RegisteredUser[] = [];
    await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
  }
  if (!existsSync(LEADERBOARD_FILE)) {
    const defaultLeaderboard: LeaderboardEntry[] = [];
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(defaultLeaderboard, null, 2), "utf-8");
  }

  if (!existsSync(HISTORY_FILE)) {
    const defaultHistory: BattleLog[] = [];
    await fs.writeFile(HISTORY_FILE, JSON.stringify(defaultHistory, null, 2), "utf-8");
  }

  if (!existsSync(QUESTIONS_FILE)) {
    const defaultQuestions: CustomQuestion[] = [
      {
        id: "cq_1",
        subject: "Physics",
        exam: "IOE",
        question: "A simple pendulum of length L is placed inside a lift falling with acceleration g/3. What is its new time period of oscillation?",
        options: [
          "T = 2π√(3L/2g)",
          "T = 2π√(L/g)",
          "T = 2π√(3L/4g)",
          "T = 2π√(L/3g)"
        ],
        correctIndex: 0,
        explanation: "The effective acceleration in a downward accelerating lift is g_eff = g - a = g - g/3 = 2g/3. The time period is T = 2π√(L/g_eff) = 2π√(L / (2g/3)) = 2π√(3L/2g).",
        author: "Prof. Ghimire",
        createdAt: new Date().toISOString(),
      },
      {
        id: "cq_2",
        subject: "Chemistry",
        exam: "BOTH",
        question: "According to Bronsted-Lowry concept, which of the following acts as both conjugate acid and conjugate base?",
        options: [
          "H2O",
          "SO4(2-)",
          "NH4(+)",
          "H2SO4"
        ],
        correctIndex: 0,
        explanation: "H2O is amphiprotic; it can gain a proton to become H3O+ (conjugate acid role) or lose a proton to become OH- (conjugate base role).",
        author: "CEE Gold Medalist",
        createdAt: new Date().toISOString(),
      }
    ];
    await fs.writeFile(QUESTIONS_FILE, JSON.stringify(defaultQuestions, null, 2), "utf-8");
  }
}

// Call database initialization
initDatabase().catch(err => {
  console.error("Database initialization failed:", err);
});

// Helper functions for lock-free JSON storage
async function readEntries<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeEntries<T>(file: string, entries: T[]): Promise<void> {
  await fs.writeFile(file, JSON.stringify(entries, null, 2), "utf-8");
}

// Leaderboard Routes
app.get("/api/leaderboard", async (req, res) => {
  const entries = await readEntries<LeaderboardEntry>(LEADERBOARD_FILE);
  // Sort by highest score first
  const sorted = entries.sort((a, b) => b.score - a.score);
  res.json({ success: true, scores: sorted });
});

app.post("/api/leaderboard", async (req, res) => {
  const { name, score, streak, accuracy, mode, exam } = req.body;
  if (!name || score === undefined) {
    return res.status(400).json({ error: "Name and Score are required fields." });
  }

  const entries = await readEntries<LeaderboardEntry>(LEADERBOARD_FILE);
  const newEntry: LeaderboardEntry = {
    id: "l_" + Date.now(),
    name: name.substring(0, 32),
    score: Math.max(0, parseInt(score) || 0),
    streak: Math.max(0, parseInt(streak) || 0),
    accuracy: Math.max(0, Math.min(100, parseInt(accuracy) || 0)),
    mode: mode || "SOLO",
    exam: exam || "IOE",
    createdAt: new Date().toISOString()
  };

  entries.push(newEntry);
  const sorted = entries.sort((a, b) => b.score - a.score).slice(0, 50); // Keep top 50
  await writeEntries(LEADERBOARD_FILE, sorted);

  // Also update registered user score if they exist
  const users = await readEntries<RegisteredUser>(USERS_FILE);
  const matchedUser = users.find(u => u.name.toLowerCase() === name.toLowerCase());
  if (matchedUser) {
    matchedUser.score = Math.max(matchedUser.score, newEntry.score);
    await writeEntries(USERS_FILE, users);
  }

  // Find dynamic overall rank
  const rank = sorted.findIndex(e => e.id === newEntry.id) + 1;
  res.json({ success: true, rank, entry: newEntry });
});

// User Registration & Unique ID Auth
app.post("/api/users/login-register", async (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name) {
    return res.status(400).json({ error: "Unique User ID and Display Name are required." });
  }

  const cleanUserId = userId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (cleanUserId.length < 3 || cleanUserId.length > 20) {
    return res.status(400).json({ error: "User ID must be 3-20 alphanumeric characters or underscores." });
  }

  const users = await readEntries<RegisteredUser>(USERS_FILE);
  const existingByUid = users.find(u => u.userId === cleanUserId);

  if (existingByUid) {
    // Log them in to their existing profile
    return res.json({
      success: true,
      message: "Welcome back, Challenger!",
      user: existingByUid,
      rank: getRankTier(existingByUid.score)
    });
  }

  // Verify username doesn't conflict with another ID
  const existingByName = users.find(u => u.name.toLowerCase() === name.trim().toLowerCase());
  if (existingByName) {
    return res.status(400).json({ error: "Display Name is already claimed by another User ID." });
  }

  const newUser: RegisteredUser = {
    userId: cleanUserId,
    name: name.trim().substring(0, 32),
    score: 1000, // starting baseline score
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await writeEntries(USERS_FILE, users);

  res.json({
    success: true,
    message: "New Profile Initiated!",
    user: newUser,
    rank: getRankTier(newUser.score)
  });
});

// Polling Online Presence & Pending Invites
app.post("/api/users/online", async (req, res) => {
  const { userId, name, score } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing identity" });

  const cleanId = userId.toLowerCase();
  
  // Update caller status
  onlineUsers[cleanId] = {
    userId: cleanId,
    name: name || "Anonymous",
    score: parseInt(score) || 1000,
    rank: getRankTier(parseInt(score) || 1000),
    lastActive: Date.now()
  };

  // Housekeeping: remove users offline for > 8 seconds
  const now = Date.now();
  for (const uid in onlineUsers) {
    if (now - onlineUsers[uid].lastActive > 8000) {
      delete onlineUsers[uid];
    }
  }

  // Get active online list (excluding ourselves)
  const activeList = Object.values(onlineUsers).filter(u => u.userId !== cleanId);

  // Find incoming invites that are pending and not expired (20 second lifespan)
  const incoming = invites.filter(inv => inv.receiverId === cleanId && inv.status === "PENDING" && (now - inv.createdAt < 20000));

  res.json({
    success: true,
    onlineUsers: activeList,
    incomingInvites: incoming
  });
});

// Send Multi-player Duel Invitation
app.post("/api/invites/send", async (req, res) => {
  const { senderId, senderName, receiverId, exam, subject, customTopic, totalQuestions } = req.body;
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "Sender and Receiver ID are required." });
  }

  const lobbyId = "lobby_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  
  const newInvite: Invite = {
    lobbyId,
    senderId,
    senderName,
    receiverId: receiverId.toLowerCase(),
    exam: exam || "IOE",
    subject: subject || "All",
    customTopic: customTopic || "",
    status: "PENDING",
    createdAt: Date.now()
  };

  // Add invite to pool; prune expired ones (keep latest 50)
  invites.push(newInvite);
  invites = invites.filter(inv => Date.now() - inv.createdAt < 60000).slice(-50);

  // Pre-initialize lobby structure
  const hostUser = onlineUsers[senderId.toLowerCase()];
  
  activeLobbies[lobbyId] = {
    lobbyId,
    hostId: senderId,
    hostName: senderName,
    hostScore: hostUser ? hostUser.score : 1000,
    hostIndex: 0,
    guestId: receiverId,
    guestName: "Challenger",
    guestScore: 1000,
    guestIndex: 0,
    status: "WAITING",
    exam: exam || "IOE",
    subject: subject || "All",
    customTopic: customTopic || "",
    questions: [],
    ropePosition: 0,
    lastUpdate: Date.now()
  };

  // Attach a custom numQuestions indicator
  const numQuestions = parseInt(totalQuestions) || 10;
  (activeLobbies[lobbyId] as any).numQuestions = numQuestions;
  (activeLobbies[lobbyId] as any).hostConsecutiveWrong = 0;
  (activeLobbies[lobbyId] as any).guestConsecutiveWrong = 0;

  res.json({ success: true, lobbyId });
});

// Respond to Invite (Accept or Decline)
app.post("/api/invites/respond", async (req, res) => {
  const { lobbyId, responderId, action } = req.body;
  const invite = invites.find(inv => inv.lobbyId === lobbyId);
  const lobby = activeLobbies[lobbyId];

  if (!invite || !lobby) {
    return res.status(404).json({ error: "No matching invite session found." });
  }

  if (action === "DECLINED") {
    invite.status = "DECLINED";
    lobby.status = "COMPLETED";
    lobby.winnerId = lobby.hostId; // Host automatically gets win if declined
    return res.json({ success: true, status: "DECLINED" });
  }

  // Accepted
  invite.status = "ACCEPTED";
  lobby.status = "ACTIVE";
  
  const guestUser = onlineUsers[responderId.toLowerCase()];
  if (guestUser) {
    lobby.guestName = guestUser.name;
    lobby.guestScore = guestUser.score;
  }

  // Seed question list for this specific Duel using custom community and offline fallbacks
  const serverFallbackQuestions = [
    {
      id: "s_q1",
      subject: "Physics",
      exam: "IOE",
      question: "What is the equivalent resistance of three identical 9 ohm resistors connected in parallel?",
      options: ["27 ohms", "9 ohms", "3 ohms", "1 ohm"],
      correctIndex: 2,
      explanation: "For parallel resistors, 1/Rp = 1/R1 + 1/R2 + 1/R3 = 1/9 + 1/9 + 1/9 = 3/9 = 1/3. So Rp = 3 ohms."
    },
    {
      id: "s_q2",
      subject: "Chemistry",
      exam: "BOTH",
      question: "Which of the following elements has the lowest electronegativity?",
      options: ["Fluorine", "Oxygen", "Lithium", "Cesium"],
      correctIndex: 3,
      explanation: "Cesium resides at the bottom-left of the periodic table, possessing the lowest ionization energy and lowest electronegativity (most electropositive)."
    },
    {
      id: "s_q3",
      subject: "Mathematics",
      exam: "IOE",
      question: "Find the general solution of the differential equation dy/dx = y/x.",
      options: ["y = c / x", "y = c * x", "y = x + c", "y^2 = x^2 + c"],
      correctIndex: 1,
      explanation: "Separating variables yields dy/y = dx/x. Integrating both sides: ln|y| = ln|x| + ln|c| which simplifies to y = c * x."
    },
    {
      id: "s_q4",
      subject: "Biology",
      exam: "CEE",
      question: "Which cell organelle is known as the suicidal bag of the cell?",
      options: ["Mitochondria", "Lysosome", "Ribosome", "Golgi Body"],
      correctIndex: 1,
      explanation: "Lysosomes contain hydrolytic enzymes capable of digesting macromolecules and entire cellular structures if ruptured, hence called the suicidal bag."
    },
    {
      id: "s_q5",
      subject: "Physics",
      exam: "CEE",
      question: "The pitch of sound depends primarily on which of the following variables?",
      options: ["Frequency", "Amplitude", "Velocity", "Waveform"],
      correctIndex: 0,
      explanation: "Pitch is the brain's internal perception of sound frequency. High frequency produces high pitch; low frequency produces low pitch."
    },
    {
      id: "s_q6",
      subject: "Chemistry",
      exam: "BOTH",
      question: "What is the oxidation state of sulfur in H2SO4?",
      options: ["+2", "+4", "+6", "-2"],
      correctIndex: 2,
      explanation: "Let x be oxidation of S. 2(1) + x + 4(-2) = 0 => 2 + x - 8 = 0 => x = +6."
    }
  ];

  // Mix in live custom community questions
  const communityQ = await readEntries<CustomQuestion>(QUESTIONS_FILE);
  let finalServerQuestions = [...communityQ, ...serverFallbackQuestions];

  // Filter based on subject selection
  if (lobby.subject !== "All") {
    finalServerQuestions = finalServerQuestions.filter(q => q.subject.toLowerCase() === lobby.subject.toLowerCase());
  }
  // Filter based on exam syllabus
  if (lobby.exam !== "BOTH") {
    finalServerQuestions = finalServerQuestions.filter(q => q.exam === "BOTH" || q.exam.toLowerCase() === lobby.exam.toLowerCase());
  }

  if (finalServerQuestions.length === 0) {
    finalServerQuestions = serverFallbackQuestions;
  }

  // Shuffle and set count based on host's custom "totalQuestions" setting (default 10)
  const numQuestions = (lobby as any).numQuestions || 10;
  lobby.questions = finalServerQuestions
    .sort(() => 0.5 - Math.random())
    .slice(0, numQuestions);

  lobby.lastUpdate = Date.now();

  res.json({ success: true, status: "ACCEPTED", questions: lobby.questions });
});

// Poll & Synchronize Active Multiplayer Duel Game Lobby
app.post("/api/lobby/sync", async (req, res) => {
  const { lobbyId, userId, currentIndex, scoreChange, ropeChange, isWrongAnswer } = req.body;
  const lobby = activeLobbies[lobbyId];

  if (!lobby) {
    return res.status(404).json({ error: "Lobby not found or expired." });
  }

  const isHost = userId === lobby.hostId;
  const numQs = (lobby as any).numQuestions || 10;
  
  // Calculate failure limit: Fail to get 10% of total no question continuously
  // E.g. Math.max(1, Math.round(0.10 * numQs))
  const failLimit = Math.max(1, Math.round(0.10 * numQs));

  // Handle active status updates
  if (lobby.status === "ACTIVE") {
    // 1. Sync index values
    if (currentIndex !== undefined) {
      if (isHost) {
        lobby.hostIndex = currentIndex;
      } else {
        lobby.guestIndex = currentIndex;
      }
    }

    // 2. Sync scores
    if (scoreChange !== undefined) {
      if (isHost) {
        lobby.hostScore = Math.max(0, lobby.hostScore + scoreChange);
      } else {
        lobby.guestScore = Math.max(0, lobby.guestScore + scoreChange);
      }
    }

    // 3. Process Answer outcome logic: Tug and Continuous Wrong Answers
    if (isWrongAnswer === true) {
      // Increment continuous failures
      if (isHost) {
        (lobby as any).hostConsecutiveWrong = ((lobby as any).hostConsecutiveWrong || 0) + 1;
        if ((lobby as any).hostConsecutiveWrong >= failLimit) {
          lobby.status = "COMPLETED";
          lobby.winnerId = lobby.guestId; // Host gets knocked out! Guest wins
        }
      } else {
        (lobby as any).guestConsecutiveWrong = ((lobby as any).guestConsecutiveWrong || 0) + 1;
        if ((lobby as any).guestConsecutiveWrong >= failLimit) {
          lobby.status = "COMPLETED";
          lobby.winnerId = lobby.hostId; // Guest gets knocked out! Host wins
        }
      }
    } else if (isWrongAnswer === false) {
      // Correct answer! Reset their consecutive wrongs count
      if (isHost) {
        (lobby as any).hostConsecutiveWrong = 0;
      } else {
        (lobby as any).guestConsecutiveWrong = 0;
      }
    }

    // 4. Update rope pulls
    // Host drags to left (negative numbers). Guest drags to right (positive numbers)
    if (ropeChange !== undefined) {
      lobby.ropePosition = Math.max(-100, Math.min(100, lobby.ropePosition + ropeChange));
      
      // Determine win conditions by sudden-death rope boundary
      if (lobby.ropePosition <= -100) {
        lobby.status = "COMPLETED";
        lobby.winnerId = lobby.hostId;
      } else if (lobby.ropePosition >= 100) {
        lobby.status = "COMPLETED";
        lobby.winnerId = lobby.guestId;
      }
    }

    // Checking if both reach end of questions naturally and determining by higher lobby score
    if (lobby.hostIndex >= lobby.questions.length && lobby.guestIndex >= lobby.questions.length && lobby.questions.length > 0) {
      lobby.status = "COMPLETED";
      // Tie breaker by dynamic score pull or rope
      if (lobby.hostScore === lobby.guestScore) {
        lobby.winnerId = lobby.ropePosition < 0 ? lobby.hostId : lobby.guestId;
      } else {
        lobby.winnerId = lobby.hostScore > lobby.guestScore ? lobby.hostId : lobby.guestId;
      }
    }
  }

  // Update lobby timestamp
  lobby.lastUpdate = Date.now();

  res.json({
    success: true,
    lobby,
    failLimit,
    hostFailCount: (lobby as any).hostConsecutiveWrong || 0,
    guestFailCount: (lobby as any).guestConsecutiveWrong || 0
  });
});

// Battle Logs History Routes
app.get("/api/history", async (req, res) => {
  const entries = await readEntries<BattleLog>(HISTORY_FILE);
  // Sort by latest timestamp
  const sorted = entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, history: sorted });
});

app.post("/api/history", async (req, res) => {
  const { player, opponent, mode, score, streak, result } = req.body;
  const entries = await readEntries<BattleLog>(HISTORY_FILE);

  const newLog: BattleLog = {
    id: "h_" + Date.now(),
    player: (player || "Aspirant").substring(0, 32),
    opponent: (opponent || "Bot Master").substring(0, 32),
    mode: mode || "SOLO",
    score: Math.max(0, parseInt(score) || 0),
    streak: Math.max(0, parseInt(streak) || 0),
    result: result === "WIN" ? "WIN" : "LOSS",
    createdAt: new Date().toISOString()
  };

  entries.push(newLog);
  // Keep latest 30 historical matches
  const pruned = entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);
  await writeEntries(HISTORY_FILE, pruned);
  res.json({ success: true, log: newLog });
});

// Community Question Routes
app.get("/api/questions/community", async (req, res) => {
  const entries = await readEntries<CustomQuestion>(QUESTIONS_FILE);
  // Sort latest first
  const sorted = entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, questions: sorted });
});

app.post("/api/questions/add", async (req, res) => {
  const { subject, exam, question, options, correctIndex, explanation, author } = req.body;
  if (!subject || !exam || !question || !options || options.length !== 4 || correctIndex === undefined) {
    return res.status(400).json({ error: "Invalid question data. Full MCQ schema requirements needed." });
  }

  const entries = await readEntries<CustomQuestion>(QUESTIONS_FILE);
  const newQuestion: CustomQuestion = {
    id: "cq_" + Date.now(),
    subject,
    exam,
    question,
    options,
    correctIndex: parseInt(correctIndex),
    explanation: explanation || "No explanation provided.",
    author: (author || "Anonymous Scholar").substring(0, 32),
    createdAt: new Date().toISOString()
  };

  entries.push(newQuestion);
  await writeEntries(QUESTIONS_FILE, entries);
  res.json({ success: true, question: newQuestion });
});

// Initialize Gemini SDK with telemetry header if key is available
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// REST API endpoint to generate custom CEE/IOE questions
app.post("/api/questions/generate", async (req, res) => {
  const { exam, subject, count = 5, topic = "General syllabus" } = req.body;

  if (!exam || !subject) {
    return res.status(400).json({ error: "Missing exam type or subject" });
  }

  // Graceful fallback description if AI of Gemini SDK is not enabled
  if (!ai) {
    return res.status(200).json({
      useFallback: true,
      message: "Credentials not available. Using elite local master Question Bank.",
    });
  }

  try {
    const prompt = `Generate ${count} highly realistic, multiple-choice questions for Nepal's ${exam} Entrance Exam (Engineering or Medical).
These questions should represent the relative difficulty and key concepts found in typical past paper syllabi.
Exam: ${exam}
Subject: ${subject}
Focus Area/Topic: ${topic}

Ensure options are plausible distractors and contains exactly one clear correct answer.
Provide a logical, helpful educational explanation for the correct option.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert IOE (Nepal Institute of Engineering Admission test) and CEE (Common Entrance Examination Nepal) prep professor and question designer.
Generate standard entrance-level conceptually deep questions.
Return output in strict JSON format matching the schema requested.`,
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: {
                type: Type.STRING,
                description: "Unique identifier short string e.g., 'q_1'",
              },
              subject: {
                type: Type.STRING,
                description: "Subject name (Physics, Chemistry, Mathematics, Zoology, Botany)",
              },
              exam: {
                type: Type.STRING,
                description: "Exam name (IOE or CEE)",
              },
              question: {
                type: Type.STRING,
                description: "The conceptual multiple choice question stem",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 options representing possible solutions",
              },
              correctIndex: {
                type: Type.INTEGER,
                description: "0-based index of the correct option",
              },
              explanation: {
                type: Type.STRING,
                description: "Detailed step-by-step reasoning or chemical principle for the answer",
              },
            },
            required: ["id", "subject", "exam", "question", "options", "correctIndex", "explanation"],
          },
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No text output returned from Gemini API");
    }

    const questionSet = JSON.parse(textOutput.trim());
    return res.json({ questionSet, useFallback: false });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return res.status(200).json({
      useFallback: true,
      message: `Dynamic generator error: ${error.message || error}. Falling back to standard syllabus repository.`,
    });
  }
});

// Load Vite middleware or static server based on environment
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IOE & CEE Battle Arena Server configured on port ${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
