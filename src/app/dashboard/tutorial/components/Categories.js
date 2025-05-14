"use client";

const categories = [
  { id: "general", name: "General Knowledge" },
  { id: "history", name: "History" },
  { id: "technology", name: "Technology" },
  { id: "geography", name: "Geography" },
  { id: "science", name: "Science" },
  { id: "math", name: "Mathematics" },
];

export default function CategoryChecklist() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((category) => (
        <div
          key={category.id}
          className="flex items-center p-4 rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center flex-1">
            <input
              type="checkbox"
              id={category.id}
              className="w-5 h-5 mr-3 cursor-pointer accent-blue-600 rounded"
            />
            <label
              htmlFor={category.id}
              className="text-gray-700 font-medium cursor-pointer group-hover:text-gray-900"
            >
              {category.name}
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}