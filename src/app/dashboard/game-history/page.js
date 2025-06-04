'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase';
import { format } from 'date-fns';
import QuestionReview from '../components/QuestionReview';
import { ArrowLeft, Clock, Calendar, Target, Award, X, ChevronRight, Trophy } from 'lucide-react';

function GameHistory() {
  const router = useRouter();
  const supabase = getSupabase();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [gameType, setGameType] = useState('single_player');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, [gameType]);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

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
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
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
        {sessions.map((session) => (
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
        ))}
      </div>
    );
  };

  const renderSessionDetails = () => {
    if (!selectedSession) return null;

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