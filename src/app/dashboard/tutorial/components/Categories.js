"use client";

const categories = [
  { id: "general", name: "General Knowledge", icon: "🎯" },
  { id: "history", name: "History", icon: "📚" },
  { id: "technology", name: "Technology", icon: "💻" },
  { id: "geography", name: "Geography", icon: "🌍" },
  { id: "science", name: "Science", icon: "🔬" },
  { id: "math", name: "Mathematics", icon: "🔢" },
];

export default function CategoryChecklist() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => (
        <div
          key={category.id}
          className="flex items-center p-5 rounded-xl bg-white/90 backdrop-blur-sm border border-amber-100 hover:border-amber-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group"
        >
          <div className="flex items-center flex-1 gap-4">
            <span className="text-2xl" role="img" aria-label={category.name}>
              {category.icon}
            </span>
            <div className="flex items-center flex-1">
              <input
                type="checkbox"
                id={category.id}
                className="w-5 h-5 mr-3 cursor-pointer accent-amber-500 rounded"
              />
              <label
                htmlFor={category.id}
                className="text-gray-700 font-medium cursor-pointer group-hover:text-gray-900"
              >
                {category.name}
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}