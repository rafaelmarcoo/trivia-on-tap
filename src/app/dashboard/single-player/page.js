'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CategoryChecklist from './components/CategoryChecklist';

export default function SinglePlayerPage() {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState([]);

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      }
      return [...prev, category];
    });
  };

  const handleStartGame = () => {
    // TODO: Implement game start logic
    console.log('Starting game with categories:', selectedCategories);
  };

  return (
    <div className="max-w-3xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-4 px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md flex items-center gap-2"
      >
        <span>←</span> Back to Dashboard
      </button>
      
      <h1 className="text-4xl text-center mb-8 text-[var(--color-fourth)]">
        Single Player Mode
      </h1>
      
      <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
        <h2 className="text-2xl mb-4 text-[var(--color-fourth)]">
          Select Categories
        </h2>
        <p className="text-[var(--color-fourth)]/80 mb-8">
          Choose the categories you want to play with. You can select multiple categories.
        </p>
        
        <CategoryChecklist 
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
        />
        
        <button 
          className={`w-full py-4 px-8 rounded-lg text-lg ${
            selectedCategories.length > 0 
              ? 'bg-[var(--color-tertiary)] cursor-pointer' 
              : 'bg-[var(--color-fourth)] cursor-not-allowed'
          } text-[var(--color-primary)]`}
          onClick={handleStartGame}
          disabled={selectedCategories.length === 0}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
