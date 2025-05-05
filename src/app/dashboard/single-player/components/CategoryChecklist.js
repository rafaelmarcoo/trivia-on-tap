'use client';

const categories = [
  { id: 'general', name: 'General' },
  { id: 'history', name: 'History' },
  { id: 'technology', name: 'Technology' },
  { id: 'geography', name: 'Geography' },
  { id: 'science', name: 'Science' },
  { id: 'math', name: 'Math' },
];

export default function CategoryChecklist({ selectedCategories, onCategoryToggle }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {categories.map((category) => (
        <div 
          key={category.id}
          className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors ${
            selectedCategories.includes(category.id)
              ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)]'
              : 'bg-[var(--color-primary)] border-[var(--color-fourth)]'
          } border-2`}
          onClick={() => onCategoryToggle(category.id)}
        >
          <input
            type="checkbox"
            id={category.id}
            checked={selectedCategories.includes(category.id)}
            onChange={() => onCategoryToggle(category.id)}
            className="w-5 h-5 mr-3 cursor-pointer accent-[var(--color-tertiary)]"
          />
          <label 
            htmlFor={category.id}
            className="text-[var(--color-fourth)] cursor-pointer"
          >
            {category.name}
          </label>
        </div>
      ))}
    </div>
  );
} 