import React, { useEffect, useState } from "react";
import { getSupabase } from "@/utils/supabase";
import { 
  awardSinglePlayerXP, 
  awardChallengeXP, 
  getPlayerLevelStatus,
  getLevelProgress,
  LEVELING_CONFIG 
} from "@/utils/levelingSystem";
import { Trophy, Star, Zap } from "lucide-react";

const LevelingSystem = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [xpToAward, setXpToAward] = useState(50);
  const [xpSource, setXpSource] = useState('manual');

  // Fetch all users initially with XP data
  const fetchAllUsers = async () => {
    setError(null);
    try {
      const { data, error: fetchError } = await getSupabase
        .from("user")
        .select("id, user_name, user_level, total_xp, auth_id")
        .order('user_level', { ascending: false });

      if (fetchError) {
        setError("Failed to fetch users.");
        return;
      }

      // Calculate level progress for each user
      const usersWithProgress = data.map(user => {
        const progress = getLevelProgress(user.total_xp || 0);
        return {
          ...user,
          ...progress
        };
      });

      setUsers(usersWithProgress);
    } catch {
      setError("Something went wrong while fetching users.");
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    fetchAllUsers();

    const channel = getSupabase
      .channel("user-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user",
        },
        (payload) => {
          const updatedUser = payload.new;
          const progress = getLevelProgress(updatedUser.total_xp || 0);

          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === updatedUser.id
                ? { ...user, ...updatedUser, ...progress }
                : user
            )
          );
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      getSupabase.removeChannel(channel);
    };
  }, []);

  const awardXP = async (userId, authId, username, xpAmount, source) => {
    try {
      const { data, error: updateError } = await getSupabase
        .rpc('award_user_xp', {
          user_uuid: authId,
          xp_amount: xpAmount,
          xp_source: source
        });

      if (updateError) {
        console.error("Update error:", updateError.message);
        setError(`Failed to award XP: ${updateError.message}`);
        return;
      }

      if (data.leveled_up) {
        setInfo(`🎉 ${username} leveled up to ${data.new_level}! (+${xpAmount} XP)`);
      } else {
        setInfo(`${username} gained ${xpAmount} XP! (Level ${data.new_level})`);
      }
      
      // Refresh users list
      setTimeout(fetchAllUsers, 500);
    } catch (err) {
      console.error("Update error:", err.message);
      setError(`Error awarding XP: ${err.message}`);
    }
  };

  const simulateSinglePlayerGame = async (user) => {
    const gameData = {
      score: Math.floor(Math.random() * 20) + 1, // 1-20 correct
      totalQuestions: 20,
      difficulty: 'medium',
      categories: ['general'],
      questions: Array(20).fill(null).map((_, i) => ({
        isCorrect: Math.random() > 0.4,
        timeTaken: Math.floor(Math.random() * 25) + 5 // 5-30 seconds
      }))
    };

    try {
      const result = await awardSinglePlayerXP(user.auth_id, gameData);
      if (result.success) {
        setInfo(`🎮 ${user.user_name} completed single player (${gameData.score}/20) - Gained ${result.xpBreakdown.total} XP!`);
        if (result.data.leveledUp) {
          setInfo(prev => prev + ` 🎉 LEVEL UP to ${result.data.newLevel}!`);
        }
        setTimeout(fetchAllUsers, 500);
      }
    } catch (err) {
      setError(`Failed to award single player XP: ${err.message}`);
    }
  };

  const simulateChallenge = async (user) => {
    const playerScore = Math.floor(Math.random() * 10) + 1; // 1-10 correct
    const opponentScore = Math.floor(Math.random() * 10) + 1;
    
    const challengeData = {
      playerScore,
      opponentScore,
      totalQuestions: 10,
      difficulty: 'medium',
      isWinner: playerScore > opponentScore,
      isTie: playerScore === opponentScore,
      playerAnswers: Array(10).fill(null).map(() => ({
        is_correct: Math.random() > 0.4,
        time_taken: Math.floor(Math.random() * 25) + 5
      }))
    };

    try {
      const result = await awardChallengeXP(user.auth_id, challengeData);
      if (result.success) {
        const resultText = challengeData.isTie ? 'tied' : (challengeData.isWinner ? 'won' : 'lost');
        setInfo(`⚔️ ${user.user_name} ${resultText} challenge (${playerScore}-${opponentScore}) - Gained ${result.xpBreakdown.total} XP!`);
        if (result.data.leveledUp) {
          setInfo(prev => prev + ` 🎉 LEVEL UP to ${result.data.newLevel}!`);
        }
        setTimeout(fetchAllUsers, 500);
      }
    } catch (err) {
      setError(`Failed to award challenge XP: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200/50 p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-amber-900">XP & Leveling System</h1>
              <p className="text-amber-700">Manage player progression and test XP rewards</p>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <strong>Error:</strong> {error}
            </div>
          )}
          {info && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
              {info}
            </div>
          )}

          {/* XP System Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <Zap className="text-blue-600" size={20} />
                XP Rewards
              </h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>Correct Answer: {LEVELING_CONFIG.XP_REWARDS.CORRECT_ANSWER} XP</p>
                <p>Perfect Game: {LEVELING_CONFIG.XP_REWARDS.PERFECT_GAME} XP</p>
                <p>Challenge Win: {LEVELING_CONFIG.XP_REWARDS.CHALLENGE_WIN} XP</p>
                <p>Quick Answer: {LEVELING_CONFIG.XP_REWARDS.QUICK_ANSWER} XP</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                <Star className="text-purple-600" size={20} />
                Level System
              </h3>
              <div className="text-sm text-purple-800 space-y-1">
                <p>Base XP: {LEVELING_CONFIG.BASE_XP_REQUIRED}</p>
                <p>Growth: {LEVELING_CONFIG.LEVEL_MULTIPLIER}x per level</p>
                <p>Max Level: {LEVELING_CONFIG.MAX_LEVEL}</p>
                <p>Difficulty Bonus: 20-50%</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200">
              <h3 className="font-bold text-amber-900 mb-2">Manual XP Award</h3>
              <div className="space-y-3">
                <input
                  type="number"
                  value={xpToAward}
                  onChange={(e) => setXpToAward(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                  placeholder="XP Amount"
                />
                <select
                  value={xpSource}
                  onChange={(e) => setXpSource(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                >
                  <option value="manual">Manual Award</option>
                  <option value="bonus">Bonus XP</option>
                  <option value="event">Special Event</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-amber-900 mb-4">Players ({users.length})</h2>
            
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-gradient-to-r from-white/60 to-amber-50/60 backdrop-blur-sm border border-amber-200/50 p-6 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {user.user_level}
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900 text-lg">{user.user_name}</h3>
                        <p className="text-amber-700 text-sm">
                          Level {user.currentLevel} • {user.totalXP} Total XP
                        </p>
                      </div>
                    </div>

                    {/* XP Progress Bar */}
                    {!user.isMaxLevel && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-amber-700 mb-1">
                          <span>Level {user.currentLevel}</span>
                          <span>{user.xpInCurrentLevel} / {user.xpNeededForNextLevel} XP</span>
                          <span>Level {user.currentLevel + 1}</span>
                        </div>
                        <div className="w-full bg-amber-200 rounded-full h-2">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
                            style={{ width: `${user.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {user.isMaxLevel && (
                      <div className="text-center text-amber-800 font-semibold mb-3">
                        🏆 Maximum Level Reached! 🏆
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => awardXP(user.id, user.auth_id, user.user_name, xpToAward, xpSource)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 text-sm font-medium"
                    >
                      +{xpToAward} XP
                    </button>
                    
                    <button
                      onClick={() => simulateSinglePlayerGame(user)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium"
                    >
                      🎮 Single Player
                    </button>
                    
                    <button
                      onClick={() => simulateChallenge(user)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
                    >
                      ⚔️ Challenge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="text-amber-600 mb-4">
                <Trophy size={48} className="mx-auto" />
              </div>
              <p className="text-amber-800 text-lg">No users found</p>
              <p className="text-amber-600">Users will appear here once they're registered</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LevelingSystem;
