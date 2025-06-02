'use client';

const categories = [
  { id: 'general', name: '🌍 General', description: 'Mixed topics' },
  { id: 'history', name: '📚 History', description: 'Past events' },
  { id: 'technology', name: '💻 Technology', description: 'Tech & gadgets' },
  { id: 'geography', name: '🗺️ Geography', description: 'World places' },
  { id: 'science', name: '🔬 Science', description: 'Natural world' },
  { id: 'math', name: '🔢 Math', description: 'Numbers & logic' },
];

export default function CategoryChecklist({ selectedCategories, onCategoryToggle }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {categories.map((category) => (
        <div 
          key={category.id}
          className={`relative p-4 rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-105 ${
            selectedCategories.includes(category.id)
              ? 'bg-amber-100 border-2 border-amber-500 shadow-md'
              : 'bg-white border-2 border-amber-200 hover:border-amber-300 hover:bg-amber-50'
          }`}
          onClick={() => onCategoryToggle(category.id)}
        >
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id={category.id}
              checked={selectedCategories.includes(category.id)}
              onChange={() => onCategoryToggle(category.id)}
              className="w-5 h-5 mt-1 cursor-pointer accent-amber-500 rounded"
            />
            <div className="flex-1">
              <label 
                htmlFor={category.id}
                className="text-amber-900 font-medium cursor-pointer block"
              >
                {category.name}
              </label>
              <p className="text-sm text-amber-700 mt-1">
                {category.description}
              </p>
            </div>
          </div>
          {selectedCategories.includes(category.id) && (
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 