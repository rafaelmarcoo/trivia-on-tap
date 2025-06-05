'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase';
import { format } from 'date-fns';
import QuestionReview from '../components/QuestionReview';
import { ArrowLeft, Clock, Calendar, Target, Award, X, ChevronRight, Trophy, User, Star } from 'lucide-react';

function GameHistory() {
  const router = useRouter();
  const supabase = getSupabase();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [gameType, setGameType] = useState('single_player');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    loadUser();
    fetchSessions();
  }, [gameType]);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      if (gameType === 'friend_challenges') {
        // Fetch friend challenge history from game_lobbies with completed challenges
        const { data: lobbies, error: lobbiesError } = await supabase
          .from('game_lobbies')
          .select('*')
          .eq('lobby_type', 'friend_challenge')
          .eq('status', 'completed')
          .or(`host_id.eq.${user.id},invited_friend_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (lobbiesError) throw lobbiesError;

        // Manually fetch user data and format for display
        const challengesWithUserData = await Promise.all(
          (lobbies || []).map(async (lobby) => {
            const opponentId = lobby.host_id === user.id ? lobby.invited_friend_id : lobby.host_id;
            
            // Fetch opponent user data
            const { data: opponent } = await supabase
              .from('user')
              .select('user_name, profile_image')
              .eq('auth_id', opponentId)
              .single();

            // Calculate scores directly from friend_challenge_answers table
            const { data: answers } = await supabase
              .from('friend_challenge_answers')
              .select('user_id, is_correct')
              .eq('lobby_id', lobby.id);

            // Count correct answers for each player
            const challengerScore = answers?.filter(a => 
              a.user_id === lobby.host_id && a.is_correct === true
            ).length || 0;
            
            const challengedScore = answers?.filter(a => 
              a.user_id === lobby.invited_friend_id && a.is_correct === true
            ).length || 0;

            // Count total questions answered by either player
            const totalQuestions = answers ? Math.max(
              answers.filter(a => a.user_id === lobby.host_id).length,
              answers.filter(a => a.user_id === lobby.invited_friend_id).length,
              10 // fallback to 10
            ) : 10;

            // Determine winner
            let winnerId = null;
            if (challengerScore > challengedScore) {
              winnerId = lobby.host_id;
            } else if (challengedScore > challengerScore) {
              winnerId = lobby.invited_friend_id;
            }
            // If scores are equal, winnerId remains null (tie)

            return {
              id: lobby.id,
              lobby_id: lobby.id,
              challenger_id: lobby.host_id,
              challenged_id: lobby.invited_friend_id,
              challenger_score: challengerScore,
              challenged_score: challengedScore,
              total_questions: totalQuestions,
              winner_id: winnerId,
              completed_at: lobby.ended_at || lobby.created_at,
              challenger: lobby.host_id === user.id ? { user_name: 'You' } : opponent,
              challenged: lobby.invited_friend_id === user.id ? { user_name: 'You' } : opponent,
              lobby: {
                categories: lobby.categories || ['General'],
                difficulty: lobby.difficulty || 'medium',
                created_at: lobby.created_at
              }
            };
          })
        );

        setSessions(challengesWithUserData);
      } else {
        // Fetch regular game sessions
        const { data, error: sessionsError } = await supabase
          .from('game_sessions')
          .select(`
            *,
            game_questions (
              question_text,
              question_type,
              options,
              correct_answer,
              user_answer,
              is_correct,
              time_taken
            )
          `)
          .eq('user_id', user.id)
          .eq('game_type', gameType)
          .order('created_at', { ascending: false });

        if (sessionsError) throw sessionsError;
        setSessions(data || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const calculateAccuracy = (questions) => {
    if (!questions || questions.length === 0) return 0;
    const correctAnswers = questions.filter(q => q.is_correct).length;
    return Math.round((correctAnswers / questions.length) * 100);
  };

  const renderSessionList = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-medium">Loading your game history...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-100/80 backdrop-blur-sm border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800">{error}</p>
        </div>
      );
    }

    if (sessions.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-amber-100/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="text-amber-600" size={40} />
          </div>
          <h3 className="text-xl font-semibold text-amber-900 mb-2">
            No games played yet
          </h3>
          <p className="text-amber-700">
            Start playing some games to build your history!
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sessions.map((session) => {
          if (gameType === 'friend_challenges') {
            // Render friend challenge session
            const isChallenger = session.challenger_id === currentUser?.id;
            const myScore = isChallenger ? session.challenger_score : session.challenged_score;
            const opponentScore = isChallenger ? session.challenged_score : session.challenger_score;
            const opponent = isChallenger ? session.challenged : session.challenger;
            const accuracy = session.total_questions > 0 ? Math.round((myScore / session.total_questions) * 100) : 0;
            
            return (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="bg-white/80 backdrop-blur-sm border border-amber-200/50 p-6 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:bg-white/90 hover:scale-[1.02] group"
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Calendar size={16} className="text-amber-600" />
                      <p className="font-medium">
                        {formatDate(session.lobby?.created_at || session.completed_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-amber-700">
                      <User size={16} className="text-amber-500" />
                      <p>
                        vs {opponent?.user_name || 'Unknown Player'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-amber-700">
                      <Target size={16} className="text-amber-500" />
                      <p>
                        {session.lobby?.categories?.join(', ') || 'General'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right space-y-2">
                      <div className="flex items-center justify-end gap-2 text-amber-900">
                        <Trophy size={16} className="text-amber-600" />
                        <p className="font-medium whitespace-nowrap">
                          Score: {myScore} / {session.total_questions}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-amber-700">
                        <Award size={16} className="text-amber-500" />
                        <p className="whitespace-nowrap">
                          Accuracy: {accuracy}%
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-amber-700">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          session.winner_id === null 
                            ? 'bg-gray-200 text-gray-700' 
                            : session.winner_id === currentUser?.id
                              ? 'bg-green-200 text-green-700'
                              : 'bg-red-200 text-red-700'
                        }`}>
                          {session.winner_id === null ? 'Tie' : session.winner_id === currentUser?.id ? 'Won' : 'Lost'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-amber-400 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          } else {
            // Render regular game session
            return (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="bg-white/80 backdrop-blur-sm border border-amber-200/50 p-6 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:bg-white/90 hover:scale-[1.02] group"
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Calendar size={16} className="text-amber-600" />
                      <p className="font-medium">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-amber-700">
                      <Target size={16} className="text-amber-500" />
                      <p>
                        {session.categories.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right space-y-2">
                      <div className="flex items-center justify-end gap-2 text-amber-900">
                        <Trophy size={16} className="text-amber-600" />
                        <p className="font-medium whitespace-nowrap">
                          Score: {session.score} / {session.total_questions}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-amber-700">
                        <Award size={16} className="text-amber-500" />
                        <p className="whitespace-nowrap">
                          Accuracy: {calculateAccuracy(session.game_questions)}%
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-amber-400 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  const renderSessionDetails = () => {
    if (!selectedSession) return null;

    if (gameType === 'friend_challenges') {
      // Render friend challenge details
      const isChallenger = selectedSession.challenger_id === currentUser?.id;
      const myScore = isChallenger ? selectedSession.challenger_score : selectedSession.challenged_score;
      const opponentScore = isChallenger ? selectedSession.challenged_score : selectedSession.challenger_score;
      const opponent = isChallenger ? selectedSession.challenged : selectedSession.challenger;
      const accuracy = selectedSession.total_questions > 0 ? Math.round((myScore / selectedSession.total_questions) * 100) : 0;

      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-200/50 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-amber-900">Friend Challenge Details</h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 text-amber-700 hover:text-amber-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Date</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Calendar size={16} className="text-amber-600" />
                    {formatDate(selectedSession.lobby?.created_at || selectedSession.completed_at)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Your Score</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Trophy size={16} className="text-amber-600" />
                    {myScore} / {selectedSession.total_questions}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Opponent</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <User size={16} className="text-amber-600" />
                    {opponent?.user_name || 'Unknown Player'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Result</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Award size={16} className="text-amber-600" />
                    <span className={`font-medium ${
                      selectedSession.winner_id === null 
                        ? 'text-gray-700' 
                        : selectedSession.winner_id === currentUser?.id
                          ? 'text-green-700'
                          : 'text-red-700'
                    }`}>
                      {selectedSession.winner_id === null ? 'Tie' : selectedSession.winner_id === currentUser?.id ? 'Won' : 'Lost'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Score Comparison */}
              <div className="mt-6 pt-6 border-t border-amber-200">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-amber-700 mb-2">Your Performance</div>
                    <div className="bg-white/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-amber-900">{myScore}</div>
                      <div className="text-sm text-amber-700">correct answers</div>
                      <div className="text-xs text-amber-600 mt-1">{accuracy}% accuracy</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-amber-700 mb-2">{opponent?.user_name || 'Opponent'}</div>
                    <div className="bg-white/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-amber-900">{opponentScore}</div>
                      <div className="text-sm text-amber-700">correct answers</div>
                      <div className="text-xs text-amber-600 mt-1">
                        {selectedSession.total_questions > 0 ? Math.round((opponentScore / selectedSession.total_questions) * 100) : 0}% accuracy
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories and Difficulty */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Categories</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Target size={16} className="text-amber-600" />
                    {selectedSession.lobby?.categories?.join(', ') || 'General'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Difficulty</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Star size={16} className="text-amber-600" />
                    <span className="capitalize">{selectedSession.lobby?.difficulty || 'Medium'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-amber-700">
              <p className="text-sm">Question details are not available for friend challenges.</p>
              <p className="text-xs mt-1">Only final scores and game statistics are stored.</p>
            </div>
          </div>
        </div>
      );
    } else {
      // Render regular game session details
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-200/50 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-amber-900">Game Details</h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 text-amber-700 hover:text-amber-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Date</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Calendar size={16} className="text-amber-600" />
                    {formatDate(selectedSession.created_at)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Score</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Trophy size={16} className="text-amber-600" />
                    {selectedSession.score} / {selectedSession.total_questions}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Accuracy</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Award size={16} className="text-amber-600" />
                    {calculateAccuracy(selectedSession.game_questions)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-amber-700">Categories</div>
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Target size={16} className="text-amber-600" />
                    {selectedSession.categories.join(', ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {selectedSession.game_questions.map((q, index) => (
                <QuestionReview
                  key={index}
                  questionNumber={index + 1}
                  question={q.question_text}
                  userAnswer={q.user_answer}
                  correctAnswer={q.correct_answer}
                  isCorrect={q.is_correct}
                  explanation={q.explanation}
                  timeTaken={q.time_taken}
                  showTimeTaken={true}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-amber-900 rounded-xl transition-all duration-300 shadow-sm border border-amber-200/50 group"
        >
          <ArrowLeft size={20} className="text-amber-600 transition-transform duration-300 group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100/50 rounded-xl">
                <Clock className="text-amber-700" size={32} />
              </div>
              <h1 className="text-3xl font-bold text-amber-900">Game History</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setGameType('single_player')}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
                  gameType === 'single_player'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/50 text-amber-900 hover:bg-white/80 border border-amber-200'
                }`}
              >
                Single Player
              </button>
              <button
                onClick={() => setGameType('multiplayer')}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
                  gameType === 'multiplayer'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/50 text-amber-900 hover:bg-white/80 border border-amber-200'
                }`}
              >
                Multiplayer
              </button>
              <button
                onClick={() => setGameType('friend_challenges')}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
                  gameType === 'friend_challenges'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/50 text-amber-900 hover:bg-white/80 border border-amber-200'
                }`}
              >
                Friend Challenges
              </button>
            </div>
          </div>

          {renderSessionList()}
        </div>

        {renderSessionDetails()}
      </div>
    </div>
  );
}

export default GameHistory; 