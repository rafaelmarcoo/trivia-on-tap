'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  BookOpen, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft
} from 'lucide-react';
import { getSupabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function QuestionBankDisplay() {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = getSupabase();
  const router = useRouter();

  // Fetch banked questions
  useEffect(() => {
    fetchBankedQuestions();
  }, []);

  // Filter questions based on search and type
  useEffect(() => {
    let filtered = questions;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.explanations && q.explanations.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(q => q.question_type === selectedType);
    }

    setFilteredQuestions(filtered);
  }, [questions, searchTerm, selectedType]);

  const fetchBankedQuestions = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch banked questions
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching banked questions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('question_bank')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      // Remove from local state
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpanded = (questionId) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const getQuestionTypeColor = (type) => {
    switch (type) {
      case 'multiple-choice': return 'bg-blue-100 text-blue-800';
      case 'true-false': return 'bg-green-100 text-green-800';
      case 'one-word': return 'bg-purple-100 text-purple-800';
      case 'math': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatQuestionType = (type) => {
    switch (type) {
      case 'multiple-choice': return 'Multiple Choice';
      case 'true-false': return 'True/False';
      case 'one-word': return 'One Word';
      case 'math': return 'Math';
      default: return type;
    }
  };

  const renderQuestionOptions = (question) => {
    if (!question.options || question.options.length === 0) {
      return null;
    }

    if (question.question_type === 'multiple-choice') {
      return (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">Options:</p>
          {question.options.map((option, index) => (
            <div 
              key={index} 
              className={`p-2 rounded text-sm ${
                option === question.correct_answer 
                  ? 'bg-green-100 border border-green-500 text-green-800' 
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <span className="font-medium">{String.fromCharCode(65 + index)}. </span>
              {option}
              {option === question.correct_answer && (
                <CheckCircle className="inline ml-2" size={14} />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (question.question_type === 'true-false') {
      return (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
          <div className="flex gap-2">
            {question.options.map((option, index) => (
              <span 
                key={index}
                className={`px-3 py-1 rounded-full text-sm ${
                  option === question.correct_answer 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {option}
                {option === question.correct_answer && (
                  <CheckCircle className="inline ml-1" size={12} />
                )}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-amber-800 font-medium">Loading your question bank...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-amber-900 rounded-xl transition-all duration-300 shadow-sm border border-amber-200/50 group"
        >
          <ArrowLeft size={20} className="text-amber-600 transition-transform duration-300 group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100/50 rounded-xl">
              <BookOpen className="text-amber-700" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-amber-900">Question Bank</h1>
              <p className="text-amber-700 mt-1">
                Review and manage your saved questions from previous games
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500" size={20} />
              <input
                type="text"
                placeholder="Search questions or explanations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/80 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500" size={20} />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="pl-10 pr-8 py-3 bg-white/80 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-w-[180px] transition-all duration-300"
              >
                <option value="all">All Types</option>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="true-false">True/False</option>
                <option value="one-word">One Word</option>
                <option value="math">Math</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-amber-100">
            <div className="flex items-center justify-between text-sm text-amber-700">
              <span>
                Showing {filteredQuestions.length} of {questions.length} questions
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  Total saved: {questions.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {filteredQuestions.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-12 text-center">
            <div className="w-20 h-20 bg-amber-100/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="text-amber-600" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-amber-900 mb-2">
              {questions.length === 0 ? 'No questions banked yet' : 'No questions match your filters'}
            </h3>
            <p className="text-amber-700">
              {questions.length === 0 
                ? 'Start playing games and bank interesting questions to see them here!'
                : 'Try adjusting your search terms or filters to find what you\'re looking for.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <div key={question.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="p-6">
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getQuestionTypeColor(question.question_type)}`}>
                          {formatQuestionType(question.question_type)}
                        </span>
                        <span className="text-sm text-amber-700">
                          {new Date(question.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {question.question_text}
                      </h3>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(question.id)}
                        className="p-2 text-amber-500 hover:text-amber-700 transition-colors"
                        title={expandedQuestions.has(question.id) ? 'Collapse' : 'Expand'}
                      >
                        {expandedQuestions.has(question.id) ? 
                          <ChevronUp size={20} /> : 
                          <ChevronDown size={20} />
                        }
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(question.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        title="Delete question"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Correct Answer Preview */}
                  <div className="mb-3">
                    <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
                      Correct Answer: {question.correct_answer}
                    </span>
                  </div>

                  {/* Expanded Content */}
                  {expandedQuestions.has(question.id) && (
                    <div className="border-t border-amber-100 pt-4 mt-4">
                      {renderQuestionOptions(question)}
                      
                      {question.explanations && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                          <p className="text-blue-800">{question.explanations}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-amber-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="text-red-500" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Delete Question</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this question from your bank? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteQuestion(deleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}