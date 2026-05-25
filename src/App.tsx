import React, { useState, useEffect, useRef } from "react";
import {
  Trophy,
  Activity,
  User,
  Zap,
  RotateCcw,
  Sparkles,
  BookOpen,
  Sword,
  Shield,
  Clock,
  Volume2,
  VolumeX,
  HelpCircle,
  HelpCircle as HelpIcon,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Play
} from "lucide-react";
import MonsterChaseCanvas from "./components/MonsterChaseCanvas";
import TugOfWarCanvas from "./components/TugOfWarCanvas";
import { RawQuestion, getOfflineQuestions } from "./data/questions";
import {
  GameModeOption,
  TargetExam,
  SubjectOption,
  BotOpponent,
  BOT_PRESETS,
  GameScoreState,
  MultiplayerSubmode
} from "./types";
import { supabase } from "./integrations/supabase/client";

function getRankTier(score: number): string {
  if (score < 1100) return "🥉 Bronze Aspirant";
  if (score < 1300) return "🥈 Silver Gladiator";
  if (score < 1600) return "🥇 Gold Specialist";
  if (score < 2000) return "🏆 Platinum Master";
  return "⚡ Pulchowk Titan";
}


export default function App() {
  // Game Setup Configurations
  const [exam, setExam] = useState<TargetExam>("IOE");
  const [subject, setSubject] = useState<SubjectOption>("All");
  const [timerLimit, setTimerLimit] = useState<number>(30); // 30, 60, 90 seconds
  const [gameMode, setGameMode] = useState<GameModeOption>("SOLO");
  const [multiSubmode, setMultiSubmode] = useState<MultiplayerSubmode>("VS_BOT");
  const [selectedBot, setSelectedBot] = useState<BotOpponent>(BOT_PRESETS[0]);
  const [customTopic, setCustomTopic] = useState<string>("General past-paper syllabus");

  // Game Engine General States
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victoryState, setVictoryState] = useState<boolean>(false);
  const [activeQuestionList, setActiveQuestionList] = useState<RawQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);

  // Active Scorecard / Survival Stats state
  const [scoreState, setScoreState] = useState<GameScoreState>({
    score: 0,
    streak: 0,
    highestStreak: 1,
    correctCount: 0,
    incorrectCount: 0,
    strikeCount: 0,
  });

  // Solo mode chase properties
  const [distanceToMonster, setDistanceToMonster] = useState<number>(25.0); // 0 to 25 meters
  const [runSpeed, setRunSpeed] = useState<number>(5.0); // arbitrary speed factor

  // Multiplayer "Tug of War" relative dynamics
  const [ropePosition, setRopePosition] = useState<number>(0); // -100 (dominant player 1) to +100 (dominant player 2)
  const [player1Name, setPlayer1Name] = useState<string>("You");
  const [player2Name, setPlayer2Name] = useState<string>("Bot");
  const [multiTurn, setMultiTurn] = useState<"p1" | "p2">("p1"); // For Couch 1v1 Mode

  // VFX Animation Hooks
  const [lastSoloVfx, setLastSoloVfx] = useState<"correct" | "incorrect" | "timeout" | null>(null);
  const [lastMultiVfx, setLastMultiVfx] = useState<"p1_pull" | "p2_pull" | "p1_fail" | "p2_fail" | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  // Gemini loading dynamics
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationLog, setGenerationLog] = useState<string>("");

  // Countdown timer mechanics
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio configuration settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // --- Real Persistent Backend State Hooks & Dynamic Forms ---
  const [aspirantName, setAspirantName] = useState<string>("Aspirant");
  const [activeTab, setActiveTab] = useState<string>("BATTLE"); // BATTLE | LEADERBOARD | HISTORY | CONTRIBUTE
  const [dbScores, setDbScores] = useState<any[]>([]);
  const [dbHistory, setDbHistory] = useState<any[]>([]);
  const [dbCommunityQuestions, setDbCommunityQuestions] = useState<any[]>([]);
  const [enableCommunityDB, setEnableCommunityDB] = useState<boolean>(true);
  const [hasSubmittedThisGame, setHasSubmittedThisGame] = useState<boolean>(true);

  // --- LOVABLE CLOUD AUTH STATE ---
  const [userId, setUserId] = useState<string>(""); // auth.users.id (uuid)
  const [userScore, setUserScore] = useState<number>(1000);
  const [userRank, setUserRank] = useState<string>("🥉 Bronze Aspirant");
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [showRegModal, setShowRegModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authDisplayName, setAuthDisplayName] = useState<string>("");
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [regError, setRegError] = useState<string>("");

  const [onlineUsersList, setOnlineUsersList] = useState<any[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<any[]>([]);
  const [activeLobby, setActiveLobby] = useState<any>(null);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(10); // chosen count: 5, 10, 20, 30
  const [isLobbyHost, setIsLobbyHost] = useState<boolean>(false);
  const [awaitingLobbyAccept, setAwaitingLobbyAccept] = useState<boolean>(false);
  const [inviteStatusMessage, setInviteStatusMessage] = useState<string>("");

  // Track consecutive wrong choices
  const [p1ConsecutiveWrong, setP1ConsecutiveWrong] = useState<number>(0);
  const [p2ConsecutiveWrong, setP2ConsecutiveWrong] = useState<number>(0);
  const [multiplayerFailLimit, setMultiplayerFailLimit] = useState<number>(1);
  const [p1Streak, setP1Streak] = useState<number>(0);
  const [p2Streak, setP2Streak] = useState<number>(0);
  const [lastActionSpeed, setLastActionSpeed] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ---- Auth bootstrap: subscribe BEFORE getSession ----
  useEffect(() => {
    const loadProfile = async (uid: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, score, rank")
        .eq("id", uid)
        .maybeSingle();
      if (data) {
        setAspirantName(data.display_name);
        setUserScore(data.score);
        setUserRank(data.rank);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || "";
      setUserId(uid);
      setShowRegModal(!uid);
      setAuthReady(true);
      if (uid) setTimeout(() => loadProfile(uid), 0);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const uid = session?.user?.id || "";
        setUserId(uid);
        setShowRegModal(!uid);
        if (uid) loadProfile(uid);
      })
      .catch(() => {
        setUserId("");
        setShowRegModal(true);
        setRegError("Please sign in to continue.");
      })
      .finally(() => setAuthReady(true));

    return () => sub.subscription.unsubscribe();
  }, []);

  // Keep profile.score in sync when the user's local score changes (best-effort)
  useEffect(() => {
    if (!userId) return;
    const newRank = getRankTier(userScore);
    setUserRank(newRank);
    supabase
      .from("profiles")
      .update({ score: userScore, rank: newRank })
      .eq("id", userId)
      .then(() => {});
  }, [userScore, userId]);


  // Loop A: Polling Presence and New Invites (via Lovable Cloud)
  useEffect(() => {
    if (!userId) return;

    const pollPresenceEnv = async () => {
      try {
        await supabase.from("online_presence").upsert({
          user_id: userId,
          name: aspirantName,
          score: userScore,
          rank: getRankTier(userScore),
          last_active: new Date().toISOString(),
        });

        const cutoffPresence = new Date(Date.now() - 8000).toISOString();
        const cutoffInvites = new Date(Date.now() - 20000).toISOString();

        const [{ data: others }, { data: invs }] = await Promise.all([
          supabase
            .from("online_presence")
            .select("user_id, name, score, rank")
            .gt("last_active", cutoffPresence)
            .neq("user_id", userId),
          supabase
            .from("duel_invites")
            .select("*")
            .eq("receiver_id", userId)
            .eq("status", "PENDING")
            .gt("created_at", cutoffInvites),
        ]);

        setOnlineUsersList(
          (others || []).map((u: any) => ({
            userId: u.user_id,
            name: u.name,
            score: u.score,
            rank: u.rank,
          })),
        );
        setIncomingInvites(
          (invs || []).map((i: any) => ({
            lobbyId: i.lobby_id,
            senderId: i.sender_id,
            senderName: i.sender_name,
            exam: i.exam,
            subject: i.subject,
            totalQuestions: i.total_questions,
          })),
        );
      } catch (e) {
        console.error("Presence beacon failed", e);
      }
    };

    pollPresenceEnv();
    const timer = setInterval(pollPresenceEnv, 3200);
    return () => clearInterval(timer);
  }, [userId, aspirantName, userScore]);

  // Loop B: Live Battle Lobby Synchronizer (Cloud DB poll)
  useEffect(() => {
    if (!activeLobby) return;

    const syncLobbyLoop = async () => {
      try {
        const { data: row } = await supabase
          .from("duel_lobbies")
          .select("*")
          .eq("lobby_id", activeLobby.lobbyId)
          .maybeSingle();
        if (!row) return;

        const lobby = {
          lobbyId: row.lobby_id,
          hostId: row.host_id,
          hostName: row.host_name,
          hostScore: row.host_score,
          hostIndex: row.host_index,
          hostConsecutiveWrong: row.host_consecutive_wrong,
          guestId: row.guest_id,
          guestName: row.guest_name,
          guestScore: row.guest_score,
          guestIndex: row.guest_index,
          guestConsecutiveWrong: row.guest_consecutive_wrong,
          status: row.status,
          exam: row.exam,
          subject: row.subject,
          customTopic: row.custom_topic,
          questions: (row.questions as any) || [],
          ropePosition: row.rope_position,
          numQuestions: row.num_questions,
          winnerId: row.winner_id,
        };
        setActiveLobby(lobby);
        const failLimit = Math.max(1, Math.round(0.1 * lobby.numQuestions));
        setMultiplayerFailLimit(failLimit);

        if (isLobbyHost) {
          setP1ConsecutiveWrong(lobby.hostConsecutiveWrong || 0);
          setP2ConsecutiveWrong(lobby.guestConsecutiveWrong || 0);
        } else {
          setP1ConsecutiveWrong(lobby.guestConsecutiveWrong || 0);
          setP2ConsecutiveWrong(lobby.hostConsecutiveWrong || 0);
        }

        const oppScore = isLobbyHost ? lobby.guestScore : lobby.hostScore;
        const oppIdx = isLobbyHost ? lobby.guestIndex : lobby.hostIndex;
        const oppWrong = isLobbyHost ? lobby.guestConsecutiveWrong : lobby.hostConsecutiveWrong;

        if (oppIdx !== prevOppIndexRef.current || oppScore !== prevOppScoreRef.current) {
          if (oppWrong > prevOppWrongRef.current) {
            setP2Streak(0);
          } else if (oppScore > prevOppScoreRef.current) {
            setP2Streak((prev) => prev + 1);
          }
          prevOppIndexRef.current = oppIdx;
          prevOppScoreRef.current = oppScore;
          prevOppWrongRef.current = oppWrong;
        } else if (oppWrong > prevOppWrongRef.current) {
          setP2Streak(0);
          prevOppWrongRef.current = oppWrong;
        }

        setRopePosition(lobby.ropePosition);

        if (lobby.status === "ACTIVE") {
          setAwaitingLobbyAccept(false);
          if (!isGameActive) {
            setPlayer1Name(isLobbyHost ? lobby.hostName : lobby.guestName);
            setPlayer2Name(isLobbyHost ? lobby.guestName : lobby.hostName);
            setActiveQuestionList(lobby.questions || []);
            setCurrentIdx(isLobbyHost ? lobby.hostIndex : lobby.guestIndex);
            setGameOver(false);
            setVictoryState(false);
            setIsGameActive(true);
            setTimeLeft(timerLimit);
            startTimer();
          } else {
            const ourClientIndex = isLobbyHost ? lobby.hostIndex : lobby.guestIndex;
            if (ourClientIndex !== currentIdx) {
              setCurrentIdx(ourClientIndex);
              setSelectedOptionIdx(null);
              setIsAnswerSubmitted(false);
              setTimeLeft(timerLimit);
              startTimer();
            }
          }
        } else if (lobby.status === "COMPLETED") {
          setIsGameActive(false);
          clearTimer();
          if (lobby.winnerId === userId) {
            setVictoryState(true);
            setGameOver(false);
            setUserScore((prev) => prev + 120);
          } else {
            setGameOver(true);
            setVictoryState(false);
            setUserScore((prev) => Math.max(1000, prev - 50));
          }
          playSynthSound(lobby.winnerId === userId ? "victory" : "gameover");
          setActiveLobby(null);
        }
      } catch (e) {
        console.error("Lobby replication slip", e);
      }
    };

    syncLobbyLoop();
    const interval = setInterval(syncLobbyLoop, 1200);
    return () => clearInterval(interval);
  }, [activeLobby, userId, isGameActive, currentIdx, isLobbyHost]);

  // Action: Launch Duel Challenge Request
  const handleSendInvite = async (receiverUid: string) => {
    setInviteStatusMessage("Transmitting challenge sequence signals...");
    setAwaitingLobbyAccept(true);
    setIsLobbyHost(true);

    try {
      const lobbyId = "lobby_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      const numQs = totalQuestionsCount;

      const { error: lobbyErr } = await supabase.from("duel_lobbies").insert({
        lobby_id: lobbyId,
        host_id: userId,
        host_name: aspirantName,
        host_score: userScore,
        guest_id: receiverUid,
        guest_name: "Challenger",
        guest_score: 1000,
        status: "WAITING",
        exam,
        subject,
        custom_topic: customTopic,
        num_questions: numQs,
      });
      if (lobbyErr) throw lobbyErr;

      const { error: invErr } = await supabase.from("duel_invites").insert({
        lobby_id: lobbyId,
        sender_id: userId,
        sender_name: aspirantName,
        receiver_id: receiverUid,
        exam,
        subject,
        custom_topic: customTopic,
        status: "PENDING",
        num_questions: numQs,
        total_questions: numQs,
      });
      if (invErr) throw invErr;

      setInviteStatusMessage(`Signals loaded successfully. Waiting for opponent to accept continuous-survival MCQ battle...`);
      setActiveLobby({ lobbyId, status: "WAITING" });
    } catch (e: any) {
      setAwaitingLobbyAccept(false);
      alert(e?.message || "Transmission conflict: Matchmaking line noise. Retry standard!");
    }
  };

  // Build the question pool the same way the old server did
  const buildDuelQuestions = async (
    duelExam: string,
    duelSubject: string,
    numQuestions: number,
  ): Promise<any[]> => {
    const fallback: any[] = [
      { id: "s_q1", subject: "Physics", exam: "IOE", question: "What is the equivalent resistance of three identical 9 ohm resistors connected in parallel?", options: ["27 ohms", "9 ohms", "3 ohms", "1 ohm"], correctIndex: 2, explanation: "1/Rp = 3/9 = 1/3 so Rp = 3 ohms." },
      { id: "s_q2", subject: "Chemistry", exam: "BOTH", question: "Which of the following elements has the lowest electronegativity?", options: ["Fluorine", "Oxygen", "Lithium", "Cesium"], correctIndex: 3, explanation: "Cesium has the lowest electronegativity in the periodic table." },
      { id: "s_q3", subject: "Mathematics", exam: "IOE", question: "Find the general solution of dy/dx = y/x.", options: ["y = c / x", "y = c * x", "y = x + c", "y^2 = x^2 + c"], correctIndex: 1, explanation: "Separable: ln|y| = ln|x| + c so y = c*x." },
      { id: "s_q4", subject: "Biology", exam: "CEE", question: "Which cell organelle is known as the suicidal bag of the cell?", options: ["Mitochondria", "Lysosome", "Ribosome", "Golgi Body"], correctIndex: 1, explanation: "Lysosomes contain hydrolytic enzymes." },
      { id: "s_q5", subject: "Physics", exam: "CEE", question: "The pitch of sound depends primarily on which variable?", options: ["Frequency", "Amplitude", "Velocity", "Waveform"], correctIndex: 0, explanation: "Pitch is the perception of frequency." },
      { id: "s_q6", subject: "Chemistry", exam: "BOTH", question: "What is the oxidation state of sulfur in H2SO4?", options: ["+2", "+4", "+6", "-2"], correctIndex: 2, explanation: "2(1) + x + 4(-2) = 0 → x = +6." },
    ];

    const { data: community } = await supabase.from("community_questions").select("*");
    const communityMapped = (community || []).map((q: any) => ({
      id: q.id,
      subject: q.subject,
      exam: q.exam,
      question: q.question,
      options: q.options,
      correctIndex: q.correct_index,
      explanation: q.explanation,
    }));

    let pool = [...communityMapped, ...fallback];
    if (duelSubject !== "All") {
      pool = pool.filter((q) => q.subject.toLowerCase() === duelSubject.toLowerCase());
    }
    if (duelExam !== "BOTH") {
      pool = pool.filter((q) => q.exam === "BOTH" || q.exam.toLowerCase() === duelExam.toLowerCase());
    }
    if (pool.length === 0) pool = fallback;
    return pool.sort(() => 0.5 - Math.random()).slice(0, numQuestions);
  };

  // Action: Respond to incoming challenge
  const handleRespondInvite = async (inv: any, accept: boolean) => {
    setIncomingInvites((prev) => prev.filter((i) => i.lobbyId !== inv.lobbyId));

    try {
      if (!accept) {
        await supabase.from("duel_invites").update({ status: "DECLINED" }).eq("lobby_id", inv.lobbyId);
        const { data: lobby } = await supabase
          .from("duel_lobbies")
          .select("host_id")
          .eq("lobby_id", inv.lobbyId)
          .maybeSingle();
        if (lobby) {
          await supabase
            .from("duel_lobbies")
            .update({ status: "COMPLETED", winner_id: lobby.host_id })
            .eq("lobby_id", inv.lobbyId);
        }
        return;
      }

      await supabase.from("duel_invites").update({ status: "ACCEPTED" }).eq("lobby_id", inv.lobbyId);

      const { data: lobby } = await supabase
        .from("duel_lobbies")
        .select("*")
        .eq("lobby_id", inv.lobbyId)
        .maybeSingle();
      if (!lobby) return;

      const questions = await buildDuelQuestions(lobby.exam, lobby.subject, lobby.num_questions);

      await supabase
        .from("duel_lobbies")
        .update({
          status: "ACTIVE",
          guest_name: aspirantName,
          guest_score: userScore,
          questions: questions as any,
        })
        .eq("lobby_id", inv.lobbyId);

      setIsLobbyHost(false);
      setAwaitingLobbyAccept(false);
      setActiveLobby({ lobbyId: inv.lobbyId, status: "ACTIVE", questions });
    } catch (e) {
      console.error("Response error for duel challenge", e);
    }
  };

  // Action: Sign in / Sign up via Lovable Cloud
  const handleRegisterProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!authEmail.trim() || !authPassword) {
      setRegError("Please provide email and password.");
      return;
    }
    if (authMode === "signup" && !authDisplayName.trim()) {
      setRegError("Please choose a display name.");
      return;
    }

    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: authDisplayName.trim() },
          },
        });
        if (error) {
          setRegError(error.message);
        } else {
          setRegError("Account created. If email confirmation is required, check your inbox, then sign in.");
          setAuthMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) setRegError(error.message);
        else playSynthSound("correct");
      }
    } catch (err: any) {
      setRegError(err?.message || "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (userId) {
      await supabase.from("online_presence").delete().eq("user_id", userId);
    }
    await supabase.auth.signOut();
  };


  // Community Question contribution states
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState<boolean>(false);
  const [contribSubject, setContribSubject] = useState<string>("Physics");
  const [contribExam, setContribExam] = useState<string>("IOE");
  const [contribQuestion, setContribQuestion] = useState<string>("");
  const [contribOptions, setContribOptions] = useState<string[]>(["", "", "", ""]);
  const [contribCorrectIndex, setContribCorrectIndex] = useState<number>(0);
  const [contribExplanation, setContribExplanation] = useState<string>("");
  const [contribAuthor, setContribAuthor] = useState<string>("");
  const [contribSuccessMsg, setContribSuccessMsg] = useState<string>("");
  const [contribErrorMsg, setContribErrorMsg] = useState<string>("");

  // Save Name and Fetch Database values
  useEffect(() => {
    localStorage.setItem("arena_player_name", aspirantName);
  }, [aspirantName]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (data.success) setDbScores(data.scores);
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.success) setDbHistory(data.history);
    } catch (e) {
      console.error("Failed to fetch battle logs:", e);
    }
  };

  const fetchCommunityQuestions = async () => {
    try {
      const res = await fetch("/api/questions/community");
      const data = await res.json();
      if (data.success) setDbCommunityQuestions(data.questions);
    } catch (e) {
      console.error("Failed to fetch community questions database:", e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchHistory();
    fetchCommunityQuestions();
  }, []);

  // Sync Completion Stats and Log battles to real database on final outcome
  useEffect(() => {
    if (!isGameActive && (gameOver || victoryState) && !hasSubmittedThisGame) {
      setHasSubmittedThisGame(true);
      const result = victoryState ? "WIN" : "LOSS";
      const finalScore = scoreState.score;
      const finalStreak = scoreState.highestStreak;
      const totalAttempted = scoreState.correctCount + scoreState.incorrectCount;
      const accuracy = totalAttempted > 0 ? Math.round((scoreState.correctCount / totalAttempted) * 100) : 100;
      
      const p1 = aspirantName.trim() || "Aspirant";
      const p2 = gameMode === "SOLO" ? "Syllabus Monster" : player2Name;

      // POST Leaderboard Record
      fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p1,
          score: finalScore,
          streak: finalStreak,
          accuracy,
          mode: gameMode,
          exam
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchLeaderboard(); // instant refresh in memory
        }
      })
      .catch(err => console.error("Error committing score board:", err));

      // POST Game History log
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: p1,
          opponent: p2,
          mode: gameMode,
          score: finalScore,
          streak: finalStreak,
          result
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchHistory(); // instant refresh in memory
        }
      })
      .catch(err => console.error("Error logging battle outcomes:", err));
    }
  }, [gameOver, victoryState, isGameActive, hasSubmittedThisGame]);

  // Submit custom added MCQ past-paper Question to server DB
  const handleContributeQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContribSuccessMsg("");
    setContribErrorMsg("");

    if (!contribQuestion.trim() || contribOptions.some(o => !o.trim())) {
      setContribErrorMsg("Please write the conceptual question stem and provide all 4 multiple-choice options.");
      return;
    }

    setIsSubmittingQuestion(true);
    try {
      const res = await fetch("/api/questions/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: contribSubject,
          exam: contribExam,
          question: contribQuestion,
          options: contribOptions,
          correctIndex: contribCorrectIndex,
          explanation: contribExplanation || "Conceptual past syllabus principle logic.",
          author: contribAuthor.trim() || aspirantName || "Anonymous Scholar"
        })
      });

      const data = await res.json();
      if (data.success) {
        setContribSuccessMsg("Successfully contributed! This question is now integrated into the Live Arena database.");
        // Reset form variables
        setContribQuestion("");
        setContribOptions(["", "", "", ""]);
        setContribExplanation("");
        fetchCommunityQuestions(); // dynamic reload list
      } else {
        setContribErrorMsg(data.error || "Submission rejected by Nepalese Entrance Admin filters.");
      }
    } catch {
      setContribErrorMsg("Network conflict: Could not securely connect to persistent past-papers storage.");
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // Bot response scheduling references
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Online duel opponent tracker refs
  const prevOppScoreRef = useRef<number>(0);
  const prevOppIndexRef = useRef<number>(0);
  const prevOppWrongRef = useRef<number>(0);

  // Play retro synthesised sound using Web Audio API
  const playSynthSound = (type: "correct" | "incorrect" | "strike" | "gameover" | "tug" | "victory") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "correct") {
        // High-pitched retro crystal bell chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === "incorrect") {
        // Sliding dual down-pitch buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25); // A2

        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "strike") {
        // Warning clang
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(180, ctx.currentTime);
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(185, ctx.currentTime);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.45);
        osc2.stop(ctx.currentTime + 0.45);
      } else if (type === "tug") {
        // Sound of heavy whip tug
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "victory") {
        // Hero trumpet success sequence
        const freqs = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
        freqs.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);

          gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.1 + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + index * 0.1);
          osc.stop(ctx.currentTime + index * 0.1 + 0.3);
        });
      } else if (type === "gameover") {
        // Descending crash chords
        const freqs = [220, 196, 174.61, 146.83];
        freqs.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);

          gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.12 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + index * 0.12);
          osc.stop(ctx.currentTime + index * 0.12 + 0.4);
        });
      }
    } catch (e) {
      console.warn("AudioContext failed or blocked by iframe permissions: ", e);
    }
  };

  // Start question countdown timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(timerLimit);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleQuestionTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Triggered when countdown runs out (counts as a visual chase slip or slide crash!)
  const handleQuestionTimeout = () => {
    if (gameOver || victoryState) return;

    if (gameMode === "SOLO") {
      setLastSoloVfx("timeout");
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 410);

      // Decrement catch distance severely
      const nextDistance = Math.max(0, distanceToMonster - 8);
      setDistanceToMonster(nextDistance);

      const nextStrikes = scoreState.strikeCount + 1;
      
      // Determine sounds
      if (nextStrikes >= 3 || nextDistance <= 0) {
        playSynthSound("gameover");
        setGameOver(true);
        setIsGameActive(false);
      } else {
        playSynthSound("strike");
      }

      setScoreState((p) => ({
        ...p,
        streak: 0,
        incorrectCount: p.incorrectCount + 1,
        strikeCount: nextStrikes,
      }));

      setIsAnswerSubmitted(true);
      setSelectedOptionIdx(null);
    } else {
      // Multiplayer timeout goes to opposite player's pull advantage
      setLastMultiVfx(multiTurn === "p1" ? "p1_fail" : "p2_fail");
      playSynthSound("strike");

      if (multiTurn === "p1") {
        setRopePosition((p) => Math.min(100, p + 15)); // moves right (p2 helper)
      } else {
        setRopePosition((p) => Math.max(-100, p - 15)); // moves left (p1 helper)
      }

      setIsAnswerSubmitted(true);
    }
  };

  // Trigger Gemini AI questions or offline past papers
  const initiateGameSession = async () => {
    setIsGenerating(true);
    setGameOver(false);
    setVictoryState(false);
    setHasSubmittedThisGame(false); // Enable persistent stats auto-save
    setDistanceToMonster(25.0);
    setRunSpeed(5.0);
    setRopePosition(0);
    setP1Streak(0);
    setP2Streak(0);
    setLastActionSpeed(1.0);
    setScoreState({
      score: 0,
      streak: 0,
      highestStreak: 1,
      correctCount: 0,
      incorrectCount: 0,
      strikeCount: 0,
    });
    setPlayer1Name(aspirantName.trim() || "You");
    setPlayer2Name(multiSubmode === "VS_BOT" ? selectedBot.name : "Player 2");

    // Clear background timers
    if (botTimerRef.current) clearTimeout(botTimerRef.current);

    // Dynamic portal message sequencing
    const logs = [
      `Initializing entrance arena...`,
      `Scanning syllabus files for Nepal ${exam} entrance exam...`,
      `Generating authentic conceptually deep questions...`,
    ];
    setGenerationLog(logs[0]);
    
    // Simulate neat animated terminal logic
    setTimeout(() => setGenerationLog(logs[1]), 500);
    setTimeout(() => setGenerationLog(logs[2]), 1100);

    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam,
          subject: subject === "All" ? "Chemistry" : subject, // provide solid baseline
          count: 8,
          topic: customTopic,
        }),
      });

      const data = await response.json();
      
      let finalQuestions: RawQuestion[] = [];
      if (data.useFallback || !data.questionSet || data.questionSet.length === 0) {
        // Fallback directly to the curated Nepalese Offline Question Bank
        finalQuestions = getOfflineQuestions(exam, subject);
      } else {
        finalQuestions = data.questionSet;
      }

      // Mix in dynamic custom community questions from our persistent database
      if (enableCommunityDB && dbCommunityQuestions.length > 0) {
        const filteredCommunity = dbCommunityQuestions.filter(q => {
          const subjectMatch = subject === "All" || q.subject.toLowerCase() === subject.toLowerCase();
          const examMatch = q.exam === "BOTH" || q.exam.toLowerCase() === exam.toLowerCase();
          return subjectMatch && examMatch;
        });

        if (filteredCommunity.length > 0) {
          const mixedSubset = [...filteredCommunity]
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(q => ({
              id: q.id,
              subject: q.subject as any,
              exam: q.exam as any,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: `${q.explanation} (Community Contribution by: ${q.author || "Anonymous Scholar"})`
            }));
          finalQuestions = [...mixedSubset, ...finalQuestions];
        }
      }

      setActiveQuestionList(finalQuestions);
      setCurrentIdx(0);
      setSelectedOptionIdx(null);
      setIsAnswerSubmitted(false);
      setIsGameActive(true);
      setIsGenerating(false);

      // Start core mechanisms
      setTimeLeft(timerLimit);
      startTimer();

      // Trigger standard Bot logic if multiplayer is launched against Bot
      if (gameMode === "MULTIPLAYER" && multiSubmode === "VS_BOT") {
        scheduleBotChoice(finalQuestions[0]);
      }
    } catch (err) {
      console.error(err);
      // Absolute silent recovery with standard repository
      let fallback = getOfflineQuestions(exam, subject);

      if (enableCommunityDB && dbCommunityQuestions.length > 0) {
        const filteredCommunity = dbCommunityQuestions.filter(q => {
          const subjectMatch = subject === "All" || q.subject.toLowerCase() === subject.toLowerCase();
          const examMatch = q.exam === "BOTH" || q.exam.toLowerCase() === exam.toLowerCase();
          return subjectMatch && examMatch;
        });

        if (filteredCommunity.length > 0) {
          const mixedSubset = [...filteredCommunity]
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(q => ({
              id: q.id,
              subject: q.subject as any,
              exam: q.exam as any,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: `${q.explanation} (Community Contribution by: ${q.author || "Anonymous Scholar"})`
            }));
          fallback = [...mixedSubset, ...fallback];
        }
      }

      setActiveQuestionList(fallback);
      setCurrentIdx(0);
      setSelectedOptionIdx(null);
      setIsAnswerSubmitted(false);
      setIsGameActive(true);
      setIsGenerating(false);
      startTimer();

      if (gameMode === "MULTIPLAYER" && multiSubmode === "VS_BOT") {
        scheduleBotChoice(fallback[0]);
      }
    }
  };

  // Bot response algorithm simulating Nepalese aspirant speed/accuracy
  const scheduleBotChoice = (currentQuest: RawQuestion) => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);

    const reactionTime = Math.random() * (selectedBot.maxSpeedMs - selectedBot.minSpeedMs) + selectedBot.minSpeedMs;

    botTimerRef.current = setTimeout(() => {
      // Decide if bot answers correctly based on accuracy
      const isCorrect = Math.random() < selectedBot.accuracy;
      const finalIndex = isCorrect 
        ? currentQuest.correctIndex 
        : (currentQuest.correctIndex + 1) % 4; // pick any distractor

      handleBotActionExecuted(finalIndex, reactionTime);
    }, reactionTime);
  };

  // Execute bot's computed action
  const handleBotActionExecuted = (botChoiceIdx: number, reactionMs: number) => {
    // If player already answered, dump old reactions
    if (isAnswerSubmitted || gameOver || victoryState) return;

    clearTimer();
    setIsAnswerSubmitted(true);
    setSelectedOptionIdx(botChoiceIdx);

    const targetQuest = activeQuestionList[currentIdx];
    const isBotCorrect = botChoiceIdx === targetQuest.correctIndex;

    if (isBotCorrect) {
      // Bot pulls rope towards right (positive coordinate)
      setP2Streak((prev) => prev + 1);
      const botSpeedRatio = (selectedBot.maxSpeedMs - reactionMs) / (selectedBot.maxSpeedMs - selectedBot.minSpeedMs || 1000);
      const speedScale = 1.0 + Math.max(0, botSpeedRatio) * 1.5;
      setLastActionSpeed(speedScale);
      setLastMultiVfx("p2_pull");
      playSynthSound("tug");
      // Faster answers get higher pulling leverage
      const pullIntensity = Math.max(10, 30 - (reactionMs / 1000) * 2);
      setRopePosition((p) => {
        const next = Math.min(100, p + pullIntensity);
        if (next >= 100) {
          playSynthSound("gameover");
          setGameOver(true);
          setIsGameActive(false);
        }
        return next;
      });
    } else {
      // Bot loses footing, friction slide sparks
      setP2Streak(0);
      setLastActionSpeed(1.0);
      setLastMultiVfx("p2_fail");
      playSynthSound("strike");
      setRopePosition((p) => Math.max(-100, p - 15));
    }
  };

  // Player selected option handler
  const handleOptionClick = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOptionIdx(idx);
  };

  // Player clicks submit code
  const handleAnswerSubmit = () => {
    if (selectedOptionIdx === null || isAnswerSubmitted) return;

    clearTimer();
    setIsAnswerSubmitted(true);

    const currentQuest = activeQuestionList[currentIdx];
    const isCorrect = selectedOptionIdx === currentQuest.correctIndex;

    // Real-time server lobby syncing for Online Duel Arena
    if (activeLobby) {
      const points = isCorrect ? 100 : 0;
      setScoreState((prev) => ({
        ...prev,
        score: prev.score + points,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        incorrectCount: prev.incorrectCount + (isCorrect ? 0 : 1),
      }));

      const speedScale = Math.max(1, (timeLeft / timerLimit) * 2.5);
      const pullFactor = Math.round(15 * speedScale);

      fetch("/api/lobby/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lobbyId: activeLobby.lobbyId,
          userId,
          isWrongAnswer: !isCorrect,
          scoreChange: points,
          ropeChange: isCorrect ? (isLobbyHost ? -pullFactor : pullFactor) : undefined,
          currentIndex: currentIdx + 1
        })
      })
      .then(() => {
        if (isCorrect) {
          playSynthSound("correct");
          setLastMultiVfx(isLobbyHost ? "p1_pull" : "p2_pull");
        } else {
          playSynthSound("strike");
          setLastMultiVfx(isLobbyHost ? "p1_fail" : "p2_fail");
        }
      })
      .catch((e) => console.error("Error submitting game action:", e));

      return;
    }

    if (gameMode === "SOLO") {
      if (isCorrect) {
        playSynthSound("correct");
        setLastSoloVfx("correct");

        // Increase distance from syllabus chase monster
        const nextDistance = Math.min(25.0, distanceToMonster + 4.5);
        setDistanceToMonster(nextDistance);
        setRunSpeed((prev) => Math.min(10.0, prev + 0.6));

        // Increment core scores
        setScoreState((prev) => {
          const nextStreak = prev.streak + 1;
          const pointsEarned = 100 + nextStreak * 25 + Math.round(timeLeft * 2);
          return {
            ...prev,
            score: prev.score + pointsEarned,
            streak: nextStreak,
            highestStreak: Math.max(prev.highestStreak, nextStreak),
            correctCount: prev.correctCount + 1,
          };
        });
      } else {
        // Impact side-crash feedback
        setLastSoloVfx("incorrect");
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 410);

        const nextStrikes = scoreState.strikeCount + 1;
        const nextDistance = Math.max(0, distanceToMonster - 7.5);
        setDistanceToMonster(nextDistance);
        setRunSpeed((prev) => Math.max(3.0, prev - 1.2));

        if (nextStrikes >= 3 || nextDistance <= 0) {
          playSynthSound("gameover");
          setGameOver(true);
          setIsGameActive(false);
        } else {
          playSynthSound("strike");
        }

        setScoreState((prev) => ({
          ...prev,
          streak: 0,
          incorrectCount: prev.incorrectCount + 1,
          strikeCount: nextStrikes,
        }));
      }
    } else {
      // --- MULTIPLAYER ENGINE RULES ---
      // Player is Player 1 in "VS_BOT"
      // In Local Pass & Play couch 1v1, they take turns answering consecutive questions.
      const currentHitter = multiSubmode === "VS_BOT" ? "p1" : multiTurn;

      if (isCorrect) {
        playSynthSound("victory");
        const speedScale = Math.max(1, (timeLeft / timerLimit) * 2.5);
        const pullFactor = Math.round(15 * speedScale);

        setLastActionSpeed(speedScale);
        if (currentHitter === "p1") {
          setP1Streak((prev) => prev + 1);
          setLastMultiVfx("p1_pull");
          setRopePosition((p) => {
            const next = Math.max(-100, p - pullFactor);
            if (next <= -100) {
              setVictoryState(true);
              setIsGameActive(false);
            }
            return next;
          });
        } else {
          setP2Streak((prev) => prev + 1);
          setLastMultiVfx("p2_pull");
          setRopePosition((p) => {
            const next = Math.min(100, p + pullFactor);
            if (next >= 100) {
              setGameOver(true); // Player 2 won
              setIsGameActive(false);
            }
            return next;
          });
        }
      } else {
        // Mistake allows free pull advantage for opponent
        playSynthSound("strike");
        setLastActionSpeed(1.0);
        if (currentHitter === "p1") {
          setP1Streak(0);
          setLastMultiVfx("p1_fail");
          setRopePosition((p) => Math.min(100, p + 15));
        } else {
          setP2Streak(0);
          setLastMultiVfx("p2_fail");
          setRopePosition((p) => Math.max(-100, p - 15));
        }
      }
    }
  };

  // Next Question triggers
  const handleNextQuestion = () => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);

    if (activeLobby) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setSelectedOptionIdx(null);
      setIsAnswerSubmitted(false);
      setTimeLeft(timerLimit);
      startTimer();
      return;
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx >= activeQuestionList.length) {
      // Loop or trigger educational Victory!
      playSynthSound("victory");
      setVictoryState(true);
      setIsGameActive(false);
      return;
    }

    setCurrentIdx(nextIdx);
    setSelectedOptionIdx(null);
    setIsAnswerSubmitted(false);

    // Switch turns in Couch local 1v1 Mode
    if (gameMode === "MULTIPLAYER" && multiSubmode === "LOCAL_1V1") {
      setMultiTurn((p) => (p === "p1" ? "p2" : "p1"));
    }

    startTimer();

    // Re-schedule Bot Choice if fighting Bot on next question
    if (gameMode === "MULTIPLAYER" && multiSubmode === "VS_BOT") {
      scheduleBotChoice(activeQuestionList[nextIdx]);
    }
  };

  // Safety hooks to clean resources on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, []);

  const currentQuestion: RawQuestion | undefined = activeQuestionList[currentIdx];

  return (
    <div
      id="root-viewport"
      className={`min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950 ${
        screenShake ? "shake-effect" : ""
      }`}
    >
      {/* Dynamic Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-emerald-500 to-indigo-600 p-2 rounded-xl shadow-lg ring-1 ring-emerald-400/20">
              <Sword className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base tracking-tight text-white flex items-center space-x-1">
                <span>IOE & CEE Entrance Arena</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-md font-mono">
                  v1.2
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-sans tracking-wide">
                Gamified Nepali Entrance MCQ Simulator
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Audio Toggle button */}
            <button
              id="audio-toggle-btn"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playSynthSound("correct");
              }}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title={soundEnabled ? "Mute Synthesizer" : "Unmute Synthesizer"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Simulated Live User Count tag */}
            <span className="hidden sm:inline-flex items-center space-x-1.5 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-full text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>184 Aspirants Active Today</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col justify-center">
        {!isGameActive && !gameOver && !victoryState ? (
          /* GAME CONFIGURATION SCREEN */
          <div className="grid md:grid-cols-12 gap-6 items-start">
            {/* Left promo banner */}
            <div className="md:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                  NEPAL ADMISSION PORTAL
                </span>
                <h2 className="font-display font-bold text-3xl text-white leading-tight">
                  Tackle past papers, survive the monster.
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Train your instincts with rapid-firing multi-choice matrices. Race against our 
                  glowing <strong className="text-purple-400">Syllabus Monster</strong> or drag-pull competitive bots 
                  in virtual <strong className="text-amber-400">Relative Tug of Wars</strong> setup.
                </p>
              </div>

              {/* Unique Bento Features summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <Clock className="w-4 h-4 text-emerald-400 mb-1" />
                  <h4 className="font-display font-medium text-xs text-slate-200">Reflex Mode</h4>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">30s, 1m, or 1.5m custom blitz limits</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <Sword className="w-4 h-4 text-indigo-400 mb-1" />
                  <h4 className="font-display font-medium text-xs text-slate-200">Sidewalls Slip</h4>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Crash, buffer offsets, and 3 fallback lives</p>
                </div>
              </div>

              {/* Quick stats counter */}
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/50 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Custom past-papers:</span>
                <span className="font-mono font-bold text-emerald-450">{250 + dbCommunityQuestions.length} Questions</span>
              </div>
            </div>

            {/* Right configuration panel / Database Dashboard hub */}
            <div id="setup-panel" className="md:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
              
              {/* Profile Config section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-955 p-3 rounded-xl border border-slate-800/60 gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-emerald-500/20 flex items-center justify-center text-sm shadow-inner select-none">
                    🇳🇵
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-mono uppercase block leading-none">Aspirant Username</label>
                    <input
                      type="text"
                      value={aspirantName}
                      onChange={(e) => setAspirantName(e.target.value)}
                      className="bg-transparent text-xs font-bold text-white focus:outline-none border-b border-transparent focus:border-emerald-500 pb-0.5"
                      placeholder="Enter username"
                    />
                  </div>
                </div>
                <div className="text-right text-[10px] bg-slate-900 px-2 py-1 rounded font-mono text-slate-400 border border-slate-805/40">
                  REF-ID: <span className="text-emerald-400 font-bold">N-{Date.now().toString().slice(-4)}</span>
                </div>
              </div>

              {/* Tab selector buttons */}
              <div className="grid grid-cols-4 border border-slate-800 bg-slate-950 p-1 rounded-xl">
                {[
                  { id: "BATTLE", label: "Battle", icon: Sword },
                  { id: "LEADERBOARD", label: "Leaderboard", icon: Trophy },
                  { id: "HISTORY", label: "Duel Logs", icon: Activity },
                  { id: "CONTRIBUTE", label: "Contribute", icon: Plus }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        playSynthSound("tug");
                      }}
                      className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? "bg-slate-800 text-emerald-400 font-black border border-slate-700/60"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* BATTLE TAB VIEW: Core configurations to launch */}
              {activeTab === "BATTLE" && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Mode Toggles */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono tracking-wider uppercase text-slate-400 block">
                      Select Game Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        id="mode-solo-btn"
                        onClick={() => {
                          setGameMode("SOLO");
                          playSynthSound("tug");
                        }}
                        className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          gameMode === "SOLO"
                            ? "border-emerald-500/80 bg-emerald-950/20 text-white"
                            : "border-slate-850 bg-slate-950 text-slate-400 hover:border-slate-750 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <Zap className={`w-5 h-5 mb-2 ${gameMode === "SOLO" ? "text-emerald-400" : "text-slate-500"}`} />
                          {gameMode === "SOLO" && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm">Monster Chase Survival</h4>
                          <p className="text-[10px] text-slate-500 font-sans mt-1">
                            Answer fast! 3 chance limits or standard Temple Run caught elimination.
                          </p>
                        </div>
                      </button>

                      <button
                        id="mode-multiplayer-btn"
                        onClick={() => {
                          setGameMode("MULTIPLAYER");
                          playSynthSound("tug");
                        }}
                        className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          gameMode === "MULTIPLAYER"
                            ? "border-blue-500/80 bg-blue-950/20 text-white"
                            : "border-slate-850 bg-slate-950 text-slate-400 hover:border-slate-755 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <Sword className={`w-5 h-5 mb-2 ${gameMode === "MULTIPLAYER" ? "text-blue-400" : "text-slate-500"}`} />
                          {gameMode === "MULTIPLAYER" && (
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm">Tug Of War Duel</h4>
                          <p className="text-[10px] text-slate-500 font-sans mt-1">
                            2 competing aspirants. Correct answers pull rope. Mud fall dictates loss.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* IOE / CEE syllabus configuration */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono tracking-wider uppercase text-slate-400 block">
                        Target Board Exam
                      </label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                          id="exam-ioe-btn"
                          onClick={() => {
                            setExam("IOE");
                            setSubject("All");
                            playSynthSound("tug");
                          }}
                          className={`py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                            exam === "IOE"
                              ? "bg-slate-800 text-emerald-400"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          IOE (Eng.)
                        </button>
                        <button
                          id="exam-cee-btn"
                          onClick={() => {
                            setExam("CEE");
                            setSubject("All");
                            playSynthSound("tug");
                          }}
                          className={`py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                            exam === "CEE"
                              ? "bg-slate-800 text-cyan-400"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          CEE (Med.)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono tracking-wider uppercase text-slate-400 block">
                        Focus Stream/Subject
                      </label>
                      <select
                        id="subject-dropdown"
                        value={subject}
                        onChange={(e) => {
                          setSubject(e.target.value as SubjectOption);
                          playSynthSound("tug");
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="All">All Curated Streams</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        {exam === "IOE" ? (
                          <option value="Mathematics">Mathematics</option>
                        ) : (
                          <option value="Biology">Biology (Zoology & Botany)</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Multiplayer specific configurations */}
                  {gameMode === "MULTIPLAYER" && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono py-0.5 px-2 rounded-md">
                        MULTIPLAYER DUEL SUBMODE
                      </span>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => {
                            setMultiSubmode("VS_BOT");
                            setPlayer2Name(selectedBot.name);
                            playSynthSound("tug");
                          }}
                          className={`p-2 rounded-lg text-[10px] font-bold font-mono border text-center transition-all cursor-pointer ${
                            multiSubmode === "VS_BOT"
                              ? "border-blue-500 bg-blue-950/15 text-blue-400"
                              : "border-slate-850 hover:border-slate-750 text-slate-400 bg-slate-950"
                          }`}
                        >
                          Top AI Robot
                        </button>
                        <button
                          onClick={() => {
                            setMultiSubmode("LOCAL_1V1");
                            setPlayer1Name("Player 1");
                            setPlayer2Name("Player 2");
                            playSynthSound("tug");
                          }}
                          className={`p-2 rounded-lg text-[10px] font-bold font-mono border text-center transition-all cursor-pointer ${
                            multiSubmode === "LOCAL_1V1"
                              ? "border-indigo-500 bg-indigo-950/15 text-indigo-400"
                              : "border-slate-850 hover:border-slate-750 text-slate-400 bg-slate-950"
                          }`}
                        >
                          Couch Pass Play
                        </button>
                        <button
                          onClick={() => {
                            setMultiSubmode("ONLINE_DUEL");
                            playSynthSound("tug");
                          }}
                          className={`p-2 rounded-lg text-[10px] font-bold font-mono border text-center transition-all cursor-pointer ${
                            multiSubmode === "ONLINE_DUEL"
                              ? "border-emerald-500 bg-emerald-950/15 text-emerald-400"
                              : "border-slate-850 hover:border-slate-750 text-slate-400 bg-slate-950"
                          }`}
                        >
                          Online Arena ⚔️
                        </button>
                      </div>

                      {multiSubmode === "ONLINE_DUEL" && (
                        <div className="mt-3 space-y-3.5 pt-3 border-t border-slate-900 animate-fadeIn">
                          {/* 1. Choice of total questions */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] uppercase font-mono text-slate-450">
                              <span>Choose Number of Questions:</span>
                              <span className="text-emerald-400 font-bold bg-emerald-900/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                Continuous Fail Limit: {Math.max(1, Math.round(totalQuestionsCount * 0.10))} Wrong
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {[5, 10, 15, 20, 30].map((count) => {
                                const failLimitValue = Math.max(1, Math.round(count * 0.10));
                                return (
                                  <button
                                    key={count}
                                    type="button"
                                    onClick={() => {
                                      setTotalQuestionsCount(count);
                                      playSynthSound("tug");
                                    }}
                                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                                      totalQuestionsCount === count
                                        ? "border-emerald-400 bg-emerald-950/20 text-emerald-300"
                                        : "border-slate-900 bg-slate-950 text-slate-500"
                                    }`}
                                  >
                                    <div>{count} Q</div>
                                    <div className="text-[7px] text-slate-500 font-normal leading-none mt-0.5">({failLimitValue} limit)</div>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-sans bg-slate-900 p-2 rounded-lg border border-slate-805/40">
                              🚨 <strong>Nepal Knockout Rule</strong>: If either Gladiator fails to obtain 10% of the total questions consecutively (i.e. if they accumulate <strong>{Math.max(1, Math.round(totalQuestionsCount * 0.10))} consecutive incorrect choices</strong>), they are disqualified!
                            </p>
                          </div>

                          {/* 2. Invitation listing and search */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-mono uppercase text-slate-400">
                                Online Candidates for Duel (Polling)
                              </label>
                              <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                Connected as: {userId}
                              </span>
                            </div>

                            <div className="relative">
                              <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2.5" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter candidates by User ID..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-7 pr-3 text-xs text-slate-200 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                              {onlineUsersList.filter(u => u.userId.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                <div className="text-center py-4 bg-slate-900/10 rounded-lg border border-slate-800/20 text-slate-500 text-[10px] leading-relaxed">
                                  No other candidates online right now. <br />
                                  <span className="text-slate-600 font-mono">Tip: Open a secondary browser incognito session or tab to login as another unique user for real-time testing!</span>
                                </div>
                              ) : (
                                onlineUsersList
                                  .filter(u => u.userId.toLowerCase().includes(searchQuery.toLowerCase()))
                                  .map((targetUser) => (
                                    <div
                                      key={targetUser.userId}
                                      className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs gap-2"
                                    >
                                      <div>
                                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                          <span>{targetUser.name}</span>
                                          <span className="text-[9px] text-slate-500 font-normal font-mono">@{targetUser.userId}</span>
                                        </div>
                                        <div className="text-[9px] text-slate-450 mt-0.5 flex gap-2">
                                          <span>🏆 Score: {targetUser.score}</span>
                                          <span>{targetUser.rank}</span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleSendInvite(targetUser.userId)}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 text-[10px] rounded transition-all cursor-pointer shadow-sm"
                                      >
                                        Challenge ⚔️
                                      </button>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {multiSubmode === "VS_BOT" && (
                        <div className="mt-3 space-y-2">
                          <label className="text-[10px] font-mono uppercase text-slate-500">
                            Select Top Nepal Aspirant Opponent Bot
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {BOT_PRESETS.map((bot) => (
                              <div
                                key={bot.name}
                                onClick={() => {
                                  setSelectedBot(bot);
                                  setPlayer2Name(bot.name);
                                  playSynthSound("tug");
                                }}
                                className={`p-2 rounded-lg border transition-all text-left cursor-pointer ${
                                  selectedBot.name === bot.name
                                    ? "border-amber-400/80 bg-slate-900"
                                    : "border-slate-900 hover:border-slate-800 bg-slate-950"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-200">{bot.name}</span>
                                  <span className="text-[9px] bg-slate-800 text-amber-400 px-1 rounded font-mono">
                                    {bot.rank}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-sans mt-1 line-clamp-1">
                                  {bot.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customizable Timer limits and custom topics */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-mono tracking-wider uppercase text-slate-400">
                          Response Timer Limit
                        </label>
                        <span className="text-[10px] text-amber-500 font-mono font-medium">⚡ Speed multipliers</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {[30, 60, 90].map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setTimerLimit(t);
                              playSynthSound("tug");
                            }}
                            className={`py-1 text-xs font-mono rounded-md transition-all cursor-pointer ${
                              timerLimit === t
                                ? "bg-slate-850 text-amber-400 font-bold"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {t === 30 ? "30s" : t === 60 ? "1m" : "1.5m"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono tracking-wider uppercase text-slate-400 block">
                        Custom AI Syllabus Target
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full bg-slate-900 border border-slate-805 rounded-lg p-1.5 pl-8 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                          placeholder="e.g. Kinematics, Acid-base, Plant cell..."
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                        />
                        <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>

                  {/* Community Questions Toggle inside BATTLE controls */}
                  <div className="flex items-center space-x-2.5 bg-slate-950 border border-slate-850 p-3 rounded-lg">
                    <input
                      type="checkbox"
                      id="enable-community-db-chk"
                      checked={enableCommunityDB}
                      onChange={(e) => {
                        setEnableCommunityDB(e.target.checked);
                        playSynthSound("tug");
                      }}
                      className="w-4.5 h-4.5 accent-emerald-500 rounded cursor-pointer"
                    />
                    <div className="flex-1 leading-tight">
                      <label htmlFor="enable-community-db-chk" className="text-xs font-black text-slate-200 cursor-pointer block">
                        ⚡ Mix Custom Community Questions Database ({dbCommunityQuestions.length})
                      </label>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Integrates real student contributions directly into the queue so they display live!
                      </p>
                    </div>
                  </div>

                  {/* Start game engine button */}
                  {gameMode === "MULTIPLAYER" && multiSubmode === "ONLINE_DUEL" ? (
                    <div className="p-4 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-950/10 text-center space-y-1 animate-fadeIn">
                      <p className="text-xs font-mono font-bold text-emerald-400">⚡ INVITE AN ACTIVE ASPIRANT ABOVE TO START ⚡</p>
                      <p className="text-[10px] text-slate-500">
                        Once they accept your invitation, a synced real-time <strong>Nepal Tug-of-War</strong> continuous survival matrix arena will initiate automatically!
                      </p>
                    </div>
                  ) : (
                    <button
                      id="start-game-btn"
                      onClick={initiateGameSession}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black tracking-widest text-sm py-4 rounded-xl shadow-xl hover:shadow-emerald-500/10 transition-all flex justify-center items-center space-x-2 cursor-pointer border border-emerald-400/25"
                    >
                      <Play className="w-4 h-4 text-slate-950 fill-current" />
                      <span>LAUNCH ENTRANCE ARENA</span>
                    </button>
                  )}
                </div>
              )}

              {/* LIVE LEADERBOARD TAB VIEW */}
              {activeTab === "LEADERBOARD" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-805">
                    <div>
                      <h4 className="font-display font-bold text-base text-white">Championship Leaderboard</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Standings retrieved from real persistent database store</p>
                    </div>
                    <button
                      onClick={fetchLeaderboard}
                      className="px-2.5 py-1 text-[10px] bg-slate-950 border border-slate-800 rounded font-mono text-slate-400 hover:text-white transition-colors"
                    >
                      🔄 Refresh
                    </button>
                  </div>

                  <div className="max-h-[355px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {dbScores.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">No active standings recorded in the archive. Launch a battle to post yours!</div>
                    ) : (
                      dbScores.map((score, idx) => {
                        const rankMedals = ["🥇", "🥈", "🥉"];
                        const isSelf = score.name.toLowerCase() === aspirantName.toLowerCase();
                        return (
                          <div
                            key={score.id}
                            className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                              isSelf ? "bg-emerald-950/10 border-emerald-500/35" : "bg-slate-950 border-slate-900"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="font-mono text-xs w-6 text-center font-bold">
                                {idx < 3 ? rankMedals[idx] : `#${idx + 1}`}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>{score.name}</span>
                                  <span className={`text-[8px] font-mono px-1 rounded-sm ${score.exam === "IOE" ? "bg-emerald-900 border border-emerald-500/10 text-emerald-400 font-black" : "bg-cyan-900 border border-cyan-500/10 text-cyan-400 font-black"}`}>
                                    {score.exam}
                                  </span>
                                </h5>
                                <p className="text-[10px] text-slate-500 font-mono">Mode: {score.mode} • Accuracy: {score.accuracy}%</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-emerald-400">{score.score} XP</span>
                              <p className="text-[9px] text-slate-500 font-mono">Streak: {score.streak}⚡</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* LIVE BATTLE HISTORY LOGS TAB VIEW */}
              {activeTab === "HISTORY" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-805">
                    <div>
                      <h4 className="font-display font-bold text-base text-white">Live Battle History Logs</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Persistent audit log of previous entrance duels and chased survival attempts</p>
                    </div>
                    <button
                      onClick={fetchHistory}
                      className="px-2.5 py-1 text-[10px] bg-slate-950 border border-slate-800 rounded font-mono text-slate-400 hover:text-white transition-colors"
                    >
                      🔄 Refresh
                    </button>
                  </div>

                  <div className="max-h-[355px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {dbHistory.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">No matches logged in the server's history vault.</div>
                    ) : (
                      dbHistory.map((item) => (
                        <div key={item.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span>{item.player}</span>
                              <span className="text-[10px] font-normal text-slate-500">vs</span>
                              <span className="text-slate-400 font-medium">{item.opponent}</span>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                item.result === "WIN" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}
                            >
                              {item.result}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-900/50">
                            <span>Score: {item.score} XP • Streak: {item.streak}⚡ ({item.mode})</span>
                            <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* CONTRIBUTE MCQ TAB VIEW */}
              {activeTab === "CONTRIBUTE" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="pb-1.5 border-b border-slate-805">
                    <h4 className="font-display font-bold text-base text-white">Contribute Academic Entry</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Submit past-paper formulas or syllabus concepts to store permanently in our Nepal database.</p>
                  </div>

                  <form onSubmit={handleContributeQuestionSubmit} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Target Exam Board</label>
                        <select
                          value={contribExam}
                          onChange={(e) => setContribExam(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-805 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="IOE">IOE Syllabus (Eng.)</option>
                          <option value="CEE">CEE Syllabus (Med.)</option>
                          <option value="BOTH">BOTH Syllabus Stream</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Subject Area</label>
                        <select
                          value={contribSubject}
                          onChange={(e) => setContribSubject(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-805 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Biology">Biology / Life Science</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">MCQ Question Stem Statement</label>
                      <textarea
                        value={contribQuestion}
                        onChange={(e) => setContribQuestion(e.target.value)}
                        placeholder="e.g. Simple harmonic wave equation is y = A sin(wt - kx). Find its wave speed..."
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-805 rounded p-2 text-xs text-slate-200 focus:outline-none placeholder:text-slate-600 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase block">Provide Exactly Four Multiple-Choices</label>
                      <div className="grid grid-cols-2 gap-2">
                        {contribOptions.map((opt, i) => (
                          <div key={i} className="flex items-center space-x-1">
                            <span className="text-[10px] font-mono text-slate-500 font-bold">{String.fromCharCode(65 + i)}</span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => {
                                const next = [...contribOptions];
                                next[i] = e.target.value;
                                setContribOptions(next);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              className="w-full bg-slate-900 border border-slate-805 rounded p-1.5 text-xs text-slate-200 focus:outline-none placeholder:text-slate-705"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-900 p-2 rounded border border-slate-800">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Correct Option index</label>
                        <select
                          value={contribCorrectIndex}
                          onChange={(e) => setContribCorrectIndex(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-amber-400 font-bold focus:outline-none"
                        >
                          <option value={0}>Choice A</option>
                          <option value={1}>Choice B</option>
                          <option value={2}>Choice C</option>
                          <option value={3}>Choice D</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Author Name Tag</label>
                        <input
                          type="text"
                          value={contribAuthor}
                          onChange={(e) => setContribAuthor(e.target.value)}
                          placeholder={aspirantName || "Anonymous Scholar"}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-250 focus:outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Academic Proof & Explanation</label>
                      <input
                        type="text"
                        value={contribExplanation}
                        required
                        onChange={(e) => setContribExplanation(e.target.value)}
                        placeholder="e.g. Since wavelength l = 2L/n, speed v = h/l..."
                        className="w-full bg-slate-900 border border-slate-850 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-505 placeholder:text-slate-600"
                      />
                    </div>

                    {contribSuccessMsg && <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-mono">{contribSuccessMsg}</div>}
                    {contribErrorMsg && <div className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-mono">{contribErrorMsg}</div>}

                    <button
                      type="submit"
                      disabled={isSubmittingQuestion}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold py-2 rounded text-xs hover:from-emerald-450 hover:to-teal-400 focus:outline-none cursor-pointer border border-emerald-400/20"
                    >
                      {isSubmittingQuestion ? "Transmitting package..." : "PUBLISH ENTRY TO ACTIVE DATABASE"}
                    </button>
                  </form>

                  {/* Curated list of Community questions */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-mono uppercase text-slate-400 block pb-1 border-b border-slate-900">Custom Syllabus Feed ({dbCommunityQuestions.length})</h5>
                    <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {dbCommunityQuestions.length === 0 ? (
                        <div className="text-center py-4 text-slate-600 text-[10px]">No community custom matrices created.</div>
                      ) : (
                        dbCommunityQuestions.map((q) => (
                          <div key={q.id} className="p-2.5 bg-slate-950 border border-slate-900 rounded text-[11px] space-y-1">
                            <div className="flex justify-between items-center bg-slate-900/40 p-1.5 rounded">
                              <span className="font-bold text-slate-300 line-clamp-2">{q.question}</span>
                              <span className="text-[8px] bg-slate-800 text-emerald-400 px-1 rounded-sm ml-2 h-fit whitespace-nowrap">{q.subject}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 italic">Contributed by: {q.author || "Scholar"} ({q.exam} Syllabus)</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : isGenerating ? (
          /* DYNAMIC GEMINI GENERATOR INTERMEDIARY SCREEN */
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              <Sparkles className="w-8 h-8 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-medium text-lg text-white">
                Preparing custom entrance test matrix...
              </h3>
              <p className="text-xs text-slate-500 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 max-h-[100px] overflow-hidden text-left">
                &gt; {generationLog}
              </p>
            </div>

            <div className="text-slate-400 text-xs">
              Powered by <strong className="text-white">Gemini 3.5 Flash Model</strong>. Fully customized to your syllabus target.
            </div>
          </div>
        ) : (
          /* ACTIVE EXAM RUNNING GAMEPLAY AREA */
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Visual game environment CGI canvas */}
            <div className="lg:col-span-8 space-y-4">
              {gameMode === "SOLO" ? (
                <MonsterChaseCanvas
                  strikeCount={scoreState.strikeCount}
                  distance={distanceToMonster}
                  speed={runSpeed}
                  gameState="PLAYING"
                  triggerVfx={lastSoloVfx}
                  onVfxDone={() => setLastSoloVfx(null)}
                />
              ) : (
                <TugOfWarCanvas
                  ropePosition={ropePosition}
                  player1Name={player1Name}
                  player2Name={player2Name}
                  gameState={gameOver || victoryState ? "GAMEOVER" : "PLAYING"}
                  lastAction={lastMultiVfx}
                  onVfxDone={() => setLastMultiVfx(null)}
                  winner={victoryState ? "p1" : (gameOver ? "p2" : null)}
                  p1Streak={p1Streak}
                  p2Streak={p2Streak}
                  lastActionSpeed={lastActionSpeed}
                />
              )}

              {/* Active High-Fidelity MCQ Question Card */}
              {currentQuestion && (
                <div id="active-question-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  {/* Subject and exam tags banner */}
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 font-bold px-2 py-0.5 rounded uppercase">
                        {currentQuestion.subject}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                        Nepal {currentQuestion.exam === "BOTH" ? exam : currentQuestion.exam} Syllabus
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Timer limit ticks */}
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className={`text-xs font-mono font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse text-sm" : "text-amber-400"}`}>
                          {timeLeft}s
                        </span>
                      </div>

                      {/* Question counter indicators */}
                      <span className="text-xs font-mono text-slate-500">
                        Question {currentIdx + 1}/{activeQuestionList.length || 8}
                      </span>
                    </div>
                  </div>

                  {/* Couch Local Pass & play visual indicator help */}
                  {gameMode === "MULTIPLAYER" && multiSubmode === "LOCAL_1V1" && (
                    <div className={`p-2 rounded-lg text-center font-mono font-bold text-xs transition-colors ${
                      multiTurn === "p1" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" : "bg-blue-950/40 text-blue-400 border border-blue-500/20"
                    }`}>
                      👤 Active Challenger Turn: {multiTurn === "p1" ? player1Name.toUpperCase() : player2Name.toUpperCase()}
                    </div>
                  )}

                  {/* Question Stem Display */}
                  <p className="text-slate-100 font-display font-medium text-sm sm:text-base leading-relaxed">
                    {currentQuestion.question}
                  </p>

                  {/* Curated Selective Option Grid */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    {currentQuestion.options.map((optionText, idx) => {
                      // Styling indicators on answer status
                      let optBg = "bg-slate-950 hover:bg-slate-800/60 border-slate-800 text-slate-300";
                      
                      if (selectedOptionIdx === idx) {
                        optBg = "border-amber-400 bg-amber-950/15 text-white";
                      }

                      if (isAnswerSubmitted) {
                        if (idx === currentQuestion.correctIndex) {
                          optBg = "border-emerald-500 bg-emerald-950/30 text-emerald-400 ring-1 ring-emerald-500/30";
                        } else if (selectedOptionIdx === idx) {
                          optBg = "border-red-500 bg-red-950/20 text-red-500 ring-1 ring-red-500/30";
                        } else {
                          optBg = "opacity-30 border-slate-800 bg-slate-950 text-slate-500";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          id={`option-btn-${idx}`}
                          onClick={() => handleOptionClick(idx)}
                          disabled={isAnswerSubmitted}
                          className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all focus:outline-none flex justify-between items-center cursor-pointer ${optBg}`}
                        >
                          <span>{optionText}</span>
                          {isAnswerSubmitted && idx === currentQuestion.correctIndex && (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          )}
                          {isAnswerSubmitted && selectedOptionIdx === idx && idx !== currentQuestion.correctIndex && (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* CTA Action Bar */}
                  <div className="flex justify-end pt-3 border-t border-slate-800">
                    {!isAnswerSubmitted ? (
                      <button
                        id="submit-answer-btn"
                        onClick={handleAnswerSubmit}
                        disabled={selectedOptionIdx === null}
                        className={`px-6 py-2.5 rounded-xl font-display font-medium text-xs tracking-wider uppercase transition-all duration-150 ${
                          selectedOptionIdx !== null
                            ? "bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-lg cursor-pointer"
                            : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                        }`}
                      >
                        LOCK CHOICE
                      </button>
                    ) : (
                      <button
                        id="next-question-btn"
                        onClick={handleNextQuestion}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-bold text-xs tracking-wider uppercase transition-all duration-150 shadow-lg cursor-pointer"
                      >
                        {currentIdx + 1 >= activeQuestionList.length ? "Finish Arena" : "Continue Path →"}
                      </button>
                    )}
                  </div>

                  {/* Academic detailed explanation card */}
                  {isAnswerSubmitted && (
                    <div id="explanation-box" className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1.5 animate-fadeIn">
                      <div className="flex items-center space-x-1.5 text-emerald-400 font-mono font-bold tracking-wide uppercase text-[10px]">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Entrance Explanative Guide</span>
                      </div>
                      <p>{currentQuestion.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar with survival metrics / Scorecard overview */}
            <div className="lg:col-span-4 space-y-4">
              <div id="score-stats-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="font-display font-bold text-sm text-slate-200 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Statistics Board
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-805/30">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">XP Score</span>
                    <span className="text-xl font-mono font-bold text-emerald-400">{scoreState.score}</span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-805/30">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Active Streak</span>
                    <span className="text-xl font-mono font-bold text-indigo-400">⚡ {scoreState.streak}</span>
                  </div>
                </div>

                {gameMode === "SOLO" && (
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-slate-400">Monster Distance Safeguard</span>
                      <span className={`font-mono font-bold ${distanceToMonster < 8 ? "text-red-400 animate-pulse text-sm" : "text-amber-400"}`}>
                        {distanceToMonster.toFixed(1)}m
                      </span>
                    </div>

                    {/* Progress tracking bar */}
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          distanceToMonster < 8
                            ? "bg-red-500"
                            : distanceToMonster < 16
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                        style={{ width: `${(distanceToMonster / 25) * 100}%` }}
                      />
                    </div>
                    {distanceToMonster < 8 && (
                      <span className="text-[9px] font-mono text-red-400 block animate-pulse">
                        ⚠️ MONSTER CLOSING CONTEXT BEHIND! ANSWER TO BURST SPEED FORWARD!
                      </span>
                    )}
                  </div>
                )}

                {/* Score Summary List */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Precision Rate</span>
                    <span className="font-mono font-bold text-slate-200">
                      {scoreState.correctCount + scoreState.incorrectCount > 0
                        ? Math.round(
                            (scoreState.correctCount / (scoreState.correctCount + scoreState.incorrectCount)) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Correct Chimes</span>
                    <span className="font-mono text-emerald-400">{scoreState.correctCount}</span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Incorrect Slips</span>
                    <span className="font-mono text-red-400">{scoreState.incorrectCount}</span>
                  </div>

                  {activeLobby ? (
                    <>
                      <div className="flex justify-between text-slate-400 font-sans">
                        <span>Your Consecutive Slips</span>
                        <span className={`font-mono font-bold ${p1ConsecutiveWrong >= multiplayerFailLimit - 1 && multiplayerFailLimit > 1 ? "text-red-400 animate-pulse font-black" : "text-slate-400"}`}>
                          {p1ConsecutiveWrong} / {multiplayerFailLimit}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 font-sans">
                        <span>Opponent Consecutive Slips</span>
                        <span className="font-mono text-slate-400 font-bold">
                          {p2ConsecutiveWrong} / {multiplayerFailLimit}
                        </span>
                      </div>
                      <div className="p-2 bg-red-950/25 rounded-lg border border-red-500/20 text-[9px] text-red-400 leading-normal font-sans">
                        ⚠️ <strong>Consecutive Slip Knockout</strong>: Accumulating {multiplayerFailLimit} mistakes in a row loses the match instantly!
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-400">
                      <span>Chances Remaining</span>
                      <span className="font-mono text-amber-400">
                        {3 - scoreState.strikeCount} / 3
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between">
                  <button
                    onClick={() => {
                      setIsGameActive(false);
                      setGameOver(false);
                      setVictoryState(false);
                      playSynthSound("tug");
                    }}
                    className="w-full text-slate-400 hover:text-white hover:bg-slate-800 text-xs border border-slate-800 bg-slate-950 py-2 rounded-xl transition-all font-display text-center cursor-pointer"
                  >
                    Exits Arena Setup
                  </button>
                </div>
              </div>

              {/* Tips bento box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
                <div className="flex items-center space-x-1 text-slate-200 font-bold">
                  <HelpIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Entrance tips</span>
                </div>
                <p className="leading-relaxed">
                  In IOE, calculus & alternating currents demand heavy computation, while CEE tests rapid
                  identification of plant hormones or anatomical pathways. Use longer timer options if you prefer detailed calculus scribble time!
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* GAME OVER MODAL OVERLAY */}
      {gameOver && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-red-500/30 rounded-2xl p-6 text-center space-y-5 animate-scaleIn">
            <div className="w-14 h-14 bg-red-950 text-red-400 border border-red-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold font-mono">
              ☠️
            </div>

            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-white">
                Eliminated in the Entrance Arena!
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed px-2">
                {gameMode === "SOLO"
                  ? "The Syllabus Monster caught up to context boundaries after you ran out of survival buffer chances. Keep practicing to build high reflexes!"
                  : `Competition result: ${player2Name} pulled you into the Failure Pit! Better luck in the next relative tug matrix.`}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 font-mono uppercase block">Syllabus Score</span>
                <span className="text-lg font-mono font-bold text-emerald-400">{scoreState.score}</span>
              </div>
              <div>
                <span className="text-slate-500 font-mono uppercase block">Best Streak</span>
                <span className="text-lg font-mono font-bold text-indigo-400">⚡ {scoreState.highestStreak}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setGameOver(false);
                  setIsGameActive(false);
                  playSynthSound("tug");
                }}
                className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 py-3 rounded-lg text-xs font-display font-medium cursor-pointer"
              >
                Entrance Setup
              </button>
              <button
                onClick={initiateGameSession}
                className="flex-1 bg-red-500 hover:bg-red-400 text-slate-950 font-display font-black tracking-widest text-xs py-3 rounded-lg cursor-pointer"
              >
                RETRY BATTLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY/COMPLETE MODAL OVERLAY */}
      {victoryState && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 text-center space-y-5 animate-scaleIn">
            <div className="w-14 h-14 bg-emerald-950 text-emerald-400 border border-emerald-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold font-mono">
              🏆
            </div>

            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-white">
                Entrance Arena Dominated!
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed px-2">
                {gameMode === "SOLO"
                  ? "Incredible job! You answered all questions to survive the chase through Pulchowk gate corridor safely."
                  : `Victory! You successfully pulled ${player2Name} in the dynamic relative Tug of War contest! Your quick syllabus recall won the platform.`}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500 font-mono uppercase block">Total XP</span>
                <span className="text-base font-mono font-bold text-emerald-400">{scoreState.score}</span>
              </div>
              <div>
                <span className="text-slate-500 font-mono uppercase block">Best Streak</span>
                <span className="text-base font-mono font-bold text-indigo-400">⚡ {scoreState.highestStreak}</span>
              </div>
              <div>
                <span className="text-slate-500 font-mono uppercase block">Accuracy</span>
                <span className="text-base font-mono font-bold text-amber-400">
                  {scoreState.correctCount + scoreState.incorrectCount > 0
                    ? Math.round(
                        (scoreState.correctCount / (scoreState.correctCount + scoreState.incorrectCount)) * 100
                      )
                    : 100}
                  %
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setVictoryState(false);
                  setIsGameActive(false);
                  playSynthSound("tug");
                }}
                className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 py-3 rounded-lg text-xs font-display font-medium cursor-pointer"
              >
                Entrance Setup
              </button>
              <button
                onClick={initiateGameSession}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black tracking-widest text-xs py-3 rounded-lg cursor-pointer"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. REGISTRATION IDENTITY MODAL OVERLAY */}
      {(showRegModal || !authReady) && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl relative animate-scaleIn">
            <div className="text-center space-y-1.5">
              <span className="text-[9px] font-mono tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                Gladiator Candidate Index
              </span>
              <h2 className="font-display font-bold text-xl text-white">
                {!authReady ? "Loading Arena Access" : authMode === "signup" ? "Create Arena Profile" : "Enter the Arena"}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {!authReady
                  ? "Preparing secure email and password sign-in."
                  : authMode === "signup"
                  ? "Sign up to save standings on the persistent leaderboard and challenge online players in real time."
                  : "Sign in to continue your run, sync stats across devices, and join live duels."}
              </p>
            </div>

            <form onSubmit={handleRegisterProfile} className="space-y-3">
              {authMode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase block">Display Name</label>
                  <input
                    type="text"
                    required
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    placeholder="e.g. Sujal Devkota"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase block">Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase block">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {regError && (
                <div className="p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-mono text-[10px] leading-relaxed">
                  {regError}
                </div>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black tracking-widest text-xs transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                {authBusy ? "…" : authMode === "signup" ? "CREATE ACCOUNT" : "SIGN IN"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "signin" : "signup");
                  setRegError("");
                }}
                className="w-full text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {authMode === "signup"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. TRANSMITTING INVITE / AWAITING MULTIPLAYER LOBBY OVERLAY */}
      {awaitingLobbyAccept && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-5 animate-scaleIn">
            <div className="relative w-14 h-14 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              <Sword className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-display font-medium text-base text-white">Transmitting Duel Signal</h3>
              <p className="text-xs text-slate-400 leading-relaxed px-1">
                {inviteStatusMessage}
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1 text-center">
              <span className="text-[9px] font-mono text-slate-500 block uppercase">Match Configuration</span>
              <div className="flex justify-center gap-3 text-[11px] font-semibold text-slate-300">
                <span>📚 {subject} </span>
                <span>⏱️ {timerLimit}s Timer</span>
                <span>🎮 {totalQuestionsCount} Qs</span>
              </div>
            </div>

            <button
              onClick={() => {
                setAwaitingLobbyAccept(false);
                setActiveLobby(null);
                setInviteStatusMessage("");
                playSynthSound("tug");
              }}
              className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-400 text-xs font-medium cursor-pointer transition-colors"
            >
              Aborts Challenge Sequence
            </button>
          </div>
        </div>
      )}

      {/* 3. INCOMING CHALLENGES SLIDE-OUT PANEL HUD */}
      {incomingInvites.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2.5 max-w-sm w-full animate-bounceIn">
          {incomingInvites.map((inv) => (
            <div
              key={inv.lobbyId}
              className="bg-slate-900/95 backdrop-blur border border-amber-500/40 rounded-xl p-4 shadow-2xl relative space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                  <span className="text-xs font-mono font-bold text-amber-400 tracking-wider uppercase">⚔️ Challenge Signals Detected</span>
                </div>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">NEPAL PORTAL</span>
              </div>

              <div>
                <p className="text-[11px] text-slate-350">
                  <strong className="text-white text-xs">{inv.senderName}</strong> (@{inv.senderId}) challenges you to an entrance exam face-off!
                </p>
                <div className="mt-1.5 flex gap-1.5 flex-wrap text-[9px] font-mono">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-350">{inv.subject}</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-350">{inv.exam} Syllabus</span>
                  <span className="bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">{inv.totalQuestions} Questions duel</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleRespondInvite(inv, false)}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-450 border border-slate-850 font-bold py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Decline ❌
                </button>
                <button
                  onClick={() => handleRespondInvite(inv, true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Accept 🗡️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer credits and copyright banner */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-[10px] text-slate-600 font-mono flex flex-col sm:flex-row justify-between items-center max-w-6xl w-full mx-auto space-y-2 sm:space-y-0">
        <div>
          <span>© 2026 IOE & CEE Entrance Arena. Nepalese Aspirants Training Center.</span>
        </div>
        <div>
          <span>Crafted for Elite conceptual recall. No simulated tech larp.</span>
        </div>
      </footer>
    </div>
  );
}
