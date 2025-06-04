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

const USERS_PER_PAGE = 20;

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedCategory, currentPage]);

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

      // Get users first
      const from = (currentPage - 1) * USERS_PER_PAGE;
      const to = from + USERS_PER_PAGE - 1;

      const { data: users, error: userError } = await supabase
        .from('user')
        .select('*')
        .range(from, to)
        .order('user_level', { ascending: false });

      if (userError) {
        console.error('User fetch error:', userError);
        throw userError;
      }

      // Get total count
      const { count } = await supabase
        .from('user')
        .select('*', { count: 'exact', head: true });

      setHasMore(count > to + 1);

      // Get game sessions for these users
      const userAuthIds = users.map(user => user.auth_id);
      let sessionsQuery = supabase
        .from('game_sessions')
        .select('*')
        .in('user_id', userAuthIds)
        .not('ended_at', 'is', null);

      // Add category filter if not "all"
      if (selectedCategory !== 'all') {
        sessionsQuery = sessionsQuery.contains('categories', [selectedCategory]);
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;

      if (sessionsError) {
        console.error('Sessions fetch error:', sessionsError);
        throw sessionsError;
      }

      // Create a map of auth_id to their sessions
      const userSessions = sessions.reduce((acc, session) => {
        if (!acc[session.user_id]) {
          acc[session.user_id] = [];
        }
        acc[session.user_id].push(session);
        return acc;
      }, {});

      if (userError) {
        console.error('User fetch error:', userError);
        throw userError;
      }

              // Process user data
      const processedUsers = users.map(user => {
        const stats = {
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
        };

        // Process game sessions
        const userGameSessions = userSessions[user.auth_id] || [];
        userGameSessions.forEach(session => {
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
          session.categories?.forEach(category => {
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
        });

        if (stats.totalGames > 0) {
          stats.averageScore = Math.round(stats.totalScore / stats.totalGames);
        }

        return {
          userId: user.id,
          authId: user.auth_id,
          userName: user.user_name || 'Anonymous Player',
          userLevel: user.user_level || 1,
          stats
        };
      });

      // Sort based on selected category
      const sortedUsers = processedUsers
        .filter(user => {
          if (selectedCategory === 'all') {
            return user.stats.totalGames > 0;
          }
          return user.stats.categoryStats[selectedCategory].gamesPlayed > 0;
        })
        .sort((a, b) => {
          if (selectedCategory === 'all') {
            if (b.stats.averageScore !== a.stats.averageScore) {
              return b.stats.averageScore - a.stats.averageScore;
            }
            if (b.stats.highestScore !== a.stats.highestScore) {
              return b.stats.highestScore - a.stats.highestScore;
            }
            return b.stats.totalGames - a.stats.totalGames;
          } else {
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

      debug.totalUsers = count;
      debug.displayedUsers = sortedUsers.length;
      setLeaderboardData(sortedUsers);
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-amber-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-100/20 to-amber-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-4 md:mb-6 px-4 md:px-6 py-2 md:py-3 bg-white/90 backdrop-blur-md text-amber-800 rounded-xl md:rounded-2xl flex items-center gap-2 hover:bg-white/95 transition-all duration-300 shadow-lg hover:shadow-xl border border-amber-200/50 text-sm md:text-base"
        >
          <span>←</span> Back to Dashboard
        </button>

        <div className="bg-white/90 backdrop-blur-md p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl border border-amber-200/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
              Leaderboard Rankings
            </h1>
            <div className="w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-800 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-amber-200/50 focus:ring-4 focus:ring-amber-200/50 focus:border-amber-300 text-sm md:text-base"
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
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl md:rounded-2xl text-xs md:text-sm text-center shadow-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 md:py-12">
              <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-lg">
                <div className="w-4 md:w-5 h-4 md:h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                <div className="text-amber-800 text-base md:text-lg font-medium">Loading leaderboard...</div>
              </div>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <div className="bg-white/80 backdrop-blur-sm px-4 md:px-6 py-6 md:py-8 rounded-xl md:rounded-2xl shadow-lg inline-block">
                <div className="text-amber-800 text-base md:text-lg font-medium mb-2">
                  No games played yet in {CATEGORIES.find(c => c.id === selectedCategory).name}!
                </div>
                {debugInfo && (
                  <div className="mt-4 text-xs md:text-sm text-amber-700/75">
                    <div>Total Users: {debugInfo.totalUsers}</div>
                    <div>Displayed Users: {debugInfo.displayedUsers}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:space-y-4">
                {leaderboardData.map((entry, index) => {
                  const stats = getDisplayStats(entry);
                  const position = ((currentPage - 1) * USERS_PER_PAGE) + index + 1;
                  return (
                    <div
                      key={entry.userId}
                      className="group bg-gradient-to-r from-amber-50 to-amber-100/50 p-4 md:p-6 rounded-xl md:rounded-2xl hover:shadow-lg transition-all duration-300 border border-amber-200/50"
                    >
                                             <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
                         <div className="flex items-center gap-3 lg:gap-4 w-full lg:w-auto lg:min-w-[300px]">
                           <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg md:rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                             {position}
                           </div>
                           <div className="flex-1 min-w-0 lg:min-w-[200px]">
                             <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                               <h3 className="text-base md:text-lg font-bold text-amber-800 sm:truncate lg:truncate-none">
                                 {entry.userName}
                               </h3>
                               <div className="flex items-center gap-2 flex-shrink-0">
                                 <span className="px-2 md:px-3 py-1 bg-white/60 rounded-full text-xs md:text-sm font-medium text-amber-700">
                                   Level {entry.userLevel}
                                 </span>
                                 {stats.perfectGames > 0 && (
                                   <span 
                                     className="text-yellow-500 text-lg md:text-xl animate-pulse" 
                                     title={`${stats.perfectGames} Perfect Games`}
                                   >
                                     ⭐
                                   </span>
                                 )}
                               </div>
                             </div>
                           </div>
                         </div>
                         
                         <div className="w-full lg:flex-grow lg:max-w-md">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                            <div className="bg-white/40 px-2 md:px-3 py-2 rounded-lg">
                              <div className="text-xs text-amber-700 font-medium">Average Score</div>
                              <div className="text-sm md:text-lg font-bold text-amber-800">{stats.averageScore}</div>
                            </div>
                            <div className="bg-white/40 px-2 md:px-3 py-2 rounded-lg">
                              <div className="text-xs text-amber-700 font-medium">Highest Score</div>
                              <div className="text-sm md:text-lg font-bold text-amber-800">{stats.highestScore}</div>
                            </div>
                            <div className="bg-white/40 px-2 md:px-3 py-2 rounded-lg">
                              <div className="text-xs text-amber-700 font-medium">Games Played</div>
                              <div className="text-sm md:text-lg font-bold text-amber-800">{stats.gamesPlayed}</div>
                            </div>
                            <div className="bg-white/40 px-2 md:px-3 py-2 rounded-lg">
                              <div className="text-xs text-amber-700 font-medium">Questions</div>
                              <div className="text-sm md:text-lg font-bold text-amber-800">{stats.questionsAnswered}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {hasMore && (
                <div className="mt-6 md:mt-8 text-center">
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="w-full sm:w-auto px-4 md:px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 border-amber-300/50 text-sm md:text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : (
                      'Load More Players'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
