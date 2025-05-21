'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase';

const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'general', name: 'General' },
  { id: 'history', name: 'History' },
  { id: 'technology', name: 'Technology' },
  { id: 'geography', name: 'Geography' },
  { id: 'science', name: 'Science' },
  { id: 'math', name: 'Math' },
];

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedCategory]);

  const fetchLeaderboardData = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = getSupabase();
    let debug = {};

    try {
      // First check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error('Authentication error. Please log in again.');
      }
      
      if (!user) {
        router.push('/login');
        return;
      }

      debug.currentUser = user.id;

      // First get all users
      const { data: users, error: userError } = await supabase
        .from('user')
        .select('*');

      if (userError) {
        console.error('User fetch error:', userError);
        throw userError;
      }

      // Get all completed game sessions
      let query = supabase
        .from('game_sessions')
        .select('*')
        .not('ended_at', 'is', null);

      // Add category filter if not "all"
      if (selectedCategory !== 'all') {
        query = query.contains('categories', [selectedCategory]);
      }

      const { data: sessions, error: sessionError } = await query;

      if (sessionError) {
        console.error('Session fetch error:', sessionError);
        throw sessionError;
      }

      // Debug data collection
      debug.totalUsers = users?.length || 0;
      debug.totalSessions = sessions?.length || 0;
      debug.completedSessions = sessions?.length || 0;

      // Create a map of auth_id to user
      const userMap = {};
      users.forEach(user => {
        if (user.auth_id) {
          userMap[user.auth_id] = user;
        }
      });

      // Initialize scores for all users
      const userScores = users.reduce((acc, user) => {
        acc[user.id] = {
          userId: user.id,
          authId: user.auth_id,
          userName: user.user_name || 'Anonymous Player',
          userLevel: user.user_level || 1,
          stats: {
            totalGames: 0,
            totalScore: 0,
            highestScore: 0,
            averageScore: 0,
            singlePlayerGames: 0,
            multiPlayerGames: 0,
            totalQuestionsAnswered: 0,
            perfectGames: 0,
            categoryStats: CATEGORIES.reduce((cats, cat) => {
              cats[cat.id] = {
                gamesPlayed: 0,
                totalScore: 0,
                highestScore: 0,
                averageScore: 0,
                perfectGames: 0
              };
              return cats;
            }, {})
          }
        };
        return acc;
      }, {});

      // Process sessions and try to match with users using auth_id
      let matchedSessions = 0;
      let unmatchedSessions = 0;
      sessions.forEach(session => {
        // Try to find user by auth_id (session.user_id is actually the auth_id)
        const user = userMap[session.user_id];
        if (!user) {
          unmatchedSessions++;
          return;
        }

        matchedSessions++;
        const stats = userScores[user.id].stats;
        stats.totalGames += 1;
        stats.totalScore += session.score || 0;
        stats.highestScore = Math.max(stats.highestScore, session.score || 0);
        stats.totalQuestionsAnswered += session.total_questions || 0;

        if (session.game_type === 'single_player') {
          stats.singlePlayerGames += 1;
        } else {
          stats.multiPlayerGames += 1;
        }

        if (session.score === session.total_questions) {
          stats.perfectGames += 1;
        }

        // Update category-specific stats
        session.categories.forEach(category => {
          const catStats = stats.categoryStats[category];
          if (catStats) {
            catStats.gamesPlayed += 1;
            catStats.totalScore += session.score || 0;
            catStats.highestScore = Math.max(catStats.highestScore, session.score || 0);
            if (session.score === session.total_questions) {
              catStats.perfectGames += 1;
            }
            catStats.averageScore = Math.round(catStats.totalScore / catStats.gamesPlayed);
          }
        });

        if (stats.totalGames > 0) {
          stats.averageScore = Math.round(stats.totalScore / stats.totalGames);
        }
      });

      debug.matchedSessions = matchedSessions;
      debug.unmatchedSessions = unmatchedSessions;
      debug.processedUsers = Object.keys(userScores).length;
      debug.usersWithGames = Object.values(userScores).filter(u => {
        if (selectedCategory === 'all') {
          return u.stats.totalGames > 0;
        }
        return u.stats.categoryStats[selectedCategory].gamesPlayed > 0;
      }).length;

      // Convert to array and sort based on selected category
      const leaderboard = Object.values(userScores)
        .filter(user => {
          if (selectedCategory === 'all') {
            return user.stats.totalGames > 0;
          }
          return user.stats.categoryStats[selectedCategory].gamesPlayed > 0;
        })
        .sort((a, b) => {
          if (selectedCategory === 'all') {
            // Sort by overall stats
            if (b.stats.averageScore !== a.stats.averageScore) {
              return b.stats.averageScore - a.stats.averageScore;
            }
            if (b.stats.highestScore !== a.stats.highestScore) {
              return b.stats.highestScore - a.stats.highestScore;
            }
            return b.stats.totalGames - a.stats.totalGames;
          } else {
            // Sort by category-specific stats
            const aStats = a.stats.categoryStats[selectedCategory];
            const bStats = b.stats.categoryStats[selectedCategory];
            if (bStats.averageScore !== aStats.averageScore) {
              return bStats.averageScore - aStats.averageScore;
            }
            if (bStats.highestScore !== aStats.highestScore) {
              return bStats.highestScore - aStats.highestScore;
            }
            return bStats.gamesPlayed - aStats.gamesPlayed;
          }
        });

      debug.finalLeaderboardEntries = leaderboard.length;
      setLeaderboardData(leaderboard);
      setDebugInfo(debug);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      if (error.message.includes('Authentication')) {
        router.push('/login');
      } else {
        setError(error.message || 'Failed to load leaderboard data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayStats = (entry) => {
    if (selectedCategory === 'all') {
      return {
        averageScore: entry.stats.averageScore,
        highestScore: entry.stats.highestScore,
        gamesPlayed: entry.stats.totalGames,
        questionsAnswered: entry.stats.totalQuestionsAnswered,
        perfectGames: entry.stats.perfectGames
      };
    }
    const catStats = entry.stats.categoryStats[selectedCategory];
    return {
      averageScore: catStats.averageScore,
      highestScore: catStats.highestScore,
      gamesPlayed: catStats.gamesPlayed,
      questionsAnswered: catStats.gamesPlayed * 20, // Assuming 20 questions per game
      perfectGames: catStats.perfectGames
    };
  };

  return (
    <div className="max-w-4xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-4 px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md flex items-center gap-2"
      >
        <span>←</span> Back to Dashboard
      </button>

      <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-fourth)]">
            Leaderboard Rankings
          </h1>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[var(--color-primary)] text-[var(--color-fourth)] px-4 py-2 rounded-md border border-[var(--color-fourth)]/20"
            >
              {CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-[var(--color-fourth)] text-xl">
              Loading leaderboard...
            </div>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-fourth)]">
            <div>No games played yet in {CATEGORIES.find(c => c.id === selectedCategory).name}!</div>
            {debugInfo && (
              <div className="mt-4 text-sm opacity-75">
                <div>Total Users: {debugInfo.totalUsers}</div>
                <div>Total Sessions: {debugInfo.totalSessions}</div>
                <div>Completed Sessions: {debugInfo.completedSessions}</div>
                <div>Matched Sessions: {debugInfo.matchedSessions}</div>
                <div>Unmatched Sessions: {debugInfo.unmatchedSessions}</div>
                <div>Users with Games: {debugInfo.usersWithGames}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboardData.map((entry, index) => {
              const stats = getDisplayStats(entry);
              return (
                <div
                  key={entry.userId}
                  className="flex items-center bg-[var(--color-primary)] p-4 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-[var(--color-tertiary)] rounded-full flex items-center justify-center text-[var(--color-primary)] font-bold text-xl">
                    {index + 1}
                  </div>
                  <div className="ml-4 flex-grow">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[var(--color-fourth)]">
                        {entry.userName}
                      </h3>
                      <span className="text-sm text-[var(--color-fourth)]/60">
                        Level {entry.userLevel}
                      </span>
                      {stats.perfectGames > 0 && (
                        <span className="text-yellow-500 text-xl" title={`${stats.perfectGames} Perfect Games`}>
                          ⭐
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-sm text-[var(--color-fourth)]/80">
                        <span className="font-medium">Average Score:</span> {stats.averageScore}
                      </div>
                      <div className="text-sm text-[var(--color-fourth)]/80">
                        <span className="font-medium">Highest Score:</span> {stats.highestScore}
                      </div>
                      <div className="text-sm text-[var(--color-fourth)]/80">
                        <span className="font-medium">Games Played:</span> {stats.gamesPlayed}
                      </div>
                      <div className="text-sm text-[var(--color-fourth)]/80">
                        <span className="font-medium">Questions Answered:</span> {stats.questionsAnswered}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
