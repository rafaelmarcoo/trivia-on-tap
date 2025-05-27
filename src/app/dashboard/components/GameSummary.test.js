import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameSummary from './GameSummary';

// Mock the QuestionReview component
jest.mock('./QuestionReview', () => {
  return function MockQuestionReview({ questionNumber, question, isCorrect }) {
    return (
      <div data-testid={`question-review-${questionNumber}`}>
        <span>Question {questionNumber}: {question}</span>
        <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
      </div>
    );
  };
});

describe('GameSummary', () => {
  const mockGameData = {
    score: 8,
    totalQuestions: 10,
    questions: [
      {
        question: 'What is the capital of France?',
        userAnswer: 'Paris',
        correctAnswer: 'Paris',
        isCorrect: true,
        explanation: 'Paris is the capital of France.',
        timeTaken: 5
      },
      {
        question: 'What is 2 + 2?',
        userAnswer: '5',
        correctAnswer: '4',
        isCorrect: false,
        explanation: '2 + 2 equals 4.',
        timeTaken: 3
      }
    ],
    categories: ['Geography', 'Math']
  };

  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders game summary with correct score and percentage', () => {
      render(<GameSummary gameData={mockGameData} onAction={mockOnAction} />);
      
      expect(screen.getByText('8/10')).toBeInTheDocument();
      expect(screen.getByText('80% Correct')).toBeInTheDocument();
      expect(screen.getByText('Game Summary')).toBeInTheDocument();
    });

    test('renders all questions', () => {
      render(<GameSummary gameData={mockGameData} onAction={mockOnAction} />);
      
      expect(screen.getByTestId('question-review-1')).toBeInTheDocument();
      expect(screen.getByTestId('question-review-2')).toBeInTheDocument();
    });

    test('renders action button with default label', () => {
      render(<GameSummary gameData={mockGameData} onAction={mockOnAction} />);
      
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    test('renders custom action label when provided', () => {
      render(
        <GameSummary 
          gameData={mockGameData} 
          onAction={mockOnAction} 
          actionLabel="Play Again"
        />
      );
      
      expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument();
    });

    test('shows categories when showCategories is true', () => {
      render(
        <GameSummary 
          gameData={mockGameData} 
          onAction={mockOnAction} 
          showCategories={true}
        />
      );
      
      expect(screen.getByText('Categories: Geography, Math')).toBeInTheDocument();
    });

    test('does not show categories when showCategories is false', () => {
      render(
        <GameSummary 
          gameData={mockGameData} 
          onAction={mockOnAction} 
          showCategories={false}
        />
      );
      
      expect(screen.queryByText('Categories: Geography, Math')).not.toBeInTheDocument();
    });
  });

  describe('Modal Mode', () => {
    test('renders as modal when isModal is true', () => {
      render(
        <GameSummary 
          gameData={mockGameData} 
          onAction={mockOnAction} 
          isModal={true}
        />
      );
      
      // Check for modal backdrop by finding the fixed positioned container
      const modalBackdrop = document.querySelector('.fixed.inset-0');
      expect(modalBackdrop).toBeInTheDocument();
      
      // Check for close button in header
      expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument();
    });

    test('renders normally when isModal is false', () => {
      render(
        <GameSummary 
          gameData={mockGameData} 
          onAction={mockOnAction} 
          isModal={false}
        />
      );
      
      // Should not have modal backdrop
      const modalBackdrop = document.querySelector('.fixed.inset-0');
      expect(modalBackdrop).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '✕' })).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls onAction when action button is clicked', async () => {
      const user = userEvent.setup();
      render(<GameSummary gameData={mockGameData} onAction={mockOnAction} />);
      
      const actionButton = screen.getByRole('button', { name: 'Close' });
      await user.click(actionButton);
      
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    test('calls onAction when modal close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <GameSummary 
          gameData={mockGameData} 
          onAction={mockOnAction} 
          isModal={true}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: '✕' });
      await user.click(closeButton);
      
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Score Calculations', () => {
    test('calculates percentage correctly for perfect score', () => {
      const perfectGameData = {
        ...mockGameData,
        score: 10,
        totalQuestions: 10
      };
      
      render(<GameSummary gameData={perfectGameData} onAction={mockOnAction} />);
      
      expect(screen.getByText('100% Correct')).toBeInTheDocument();
    });

    test('calculates percentage correctly for zero score', () => {
      const zeroGameData = {
        ...mockGameData,
        score: 0,
        totalQuestions: 10
      };
      
      render(<GameSummary gameData={zeroGameData} onAction={mockOnAction} />);
      
      expect(screen.getByText('0% Correct')).toBeInTheDocument();
    });

    test('rounds percentage correctly', () => {
      const oddGameData = {
        ...mockGameData,
        score: 1,
        totalQuestions: 3 // 33.333...%
      };
      
      render(<GameSummary gameData={oddGameData} onAction={mockOnAction} />);
      
      expect(screen.getByText('33% Correct')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty questions array', () => {
      const emptyGameData = {
        score: 0,
        totalQuestions: 0,
        questions: [],
        categories: []
      };
      
      render(<GameSummary gameData={emptyGameData} onAction={mockOnAction} />);
      
      expect(screen.getByText('0/0')).toBeInTheDocument();
      expect(screen.queryByTestId('question-review-1')).not.toBeInTheDocument();
    });

    test('handles missing categories gracefully', () => {
      const noCategoriesData = {
        ...mockGameData,
        categories: undefined
      };
      
      render(
        <GameSummary 
          gameData={noCategoriesData} 
          onAction={mockOnAction} 
          showCategories={true}
        />
      );
      
      // Should not crash and should not show categories section
      expect(screen.queryByText(/Categories:/)).not.toBeInTheDocument();
    });
  });
}); 