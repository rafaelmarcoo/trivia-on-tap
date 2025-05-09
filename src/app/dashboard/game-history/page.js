'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase';
import { format } from 'date-fns';
import QuestionReview from '../components/QuestionReview';

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
      return <div className="text-center py-8">Loading sessions...</div>;
    }

    if (error) {
      return <div className="text-red-500 text-center py-8">{error}</div>;
    }

    if (sessions.length === 0) {
      return <div className="text-center py-8">No sessions found</div>;
    }

    return (
      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => setSelectedSession(session)}
            className="bg-[var(--color-secondary)] p-4 rounded-lg cursor-pointer hover:bg-opacity-90 transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[var(--color-fourth)] font-medium">
                  {formatDate(session.created_at)}
                </p>
                <p className="text-[var(--color-fourth)]/80">
                  Categories: {session.categories.join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[var(--color-fourth)] font-medium">
                  Score: {session.score} / {session.total_questions}
                </p>
                <p className="text-[var(--color-fourth)]/80">
                  Accuracy: {calculateAccuracy(session.game_questions)}%
                </p>
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-[var(--color-secondary)] rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl text-[var(--color-fourth)]">Session Details</h2>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-[var(--color-fourth)] hover:text-opacity-80"
            >
              ✕
            </button>
          </div>

          <div className="mb-6 p-4 bg-[var(--color-primary)]/10 rounded-lg">
            <p className="text-[var(--color-fourth)]">
              Date: {formatDate(selectedSession.created_at)}
            </p>
            <p className="text-[var(--color-fourth)]">
              Score: {selectedSession.score} / {selectedSession.total_questions}
            </p>
            <p className="text-[var(--color-fourth)]">
              Categories: {selectedSession.categories.join(', ')}
            </p>
            <p className="text-[var(--color-fourth)]">
              Accuracy: {calculateAccuracy(selectedSession.game_questions)}%
            </p>
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
    <div className="max-w-4xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-4 px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md flex items-center gap-2"
      >
        <span>←</span> Back to Dashboard
      </button>

      <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl text-[var(--color-fourth)]">Game History</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setGameType('single_player')}
              className={`px-4 py-2 rounded-md ${
                gameType === 'single_player'
                  ? 'bg-[var(--color-tertiary)] text-[var(--color-primary)]'
                  : 'bg-[var(--color-primary)] text-[var(--color-fourth)]'
              }`}
            >
              Single Player
            </button>
            <button
              onClick={() => setGameType('multiplayer')}
              className={`px-4 py-2 rounded-md ${
                gameType === 'multiplayer'
                  ? 'bg-[var(--color-tertiary)] text-[var(--color-primary)]'
                  : 'bg-[var(--color-primary)] text-[var(--color-fourth)]'
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
  );
}

export default GameHistory; 