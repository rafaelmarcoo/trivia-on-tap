'use client';

import { CheckCircle, Globe, Book, Cpu, MapPin, Microscope, Calculator } from 'lucide-react';

const categories = [
  { 
    id: 'general', 
    name: 'General Knowledge', 
    description: 'Mixed topics and trivia',
    icon: Globe,
    color: 'emerald'
  },
  { 
    id: 'history', 
    name: 'History', 
    description: 'Past events and civilizations',
    icon: Book,
    color: 'amber'
  },
  { 
    id: 'technology', 
    name: 'Technology', 
    description: 'Tech, gadgets, and innovation',
    icon: Cpu,
    color: 'blue'
  },
  { 
    id: 'geography', 
    name: 'Geography', 
    description: 'World places and locations',
    icon: MapPin,
    color: 'green'
  },
  { 
    id: 'science', 
    name: 'Science', 
    description: 'Natural world and discoveries',
    icon: Microscope,
    color: 'purple'
  },
  { 
    id: 'math', 
    name: 'Mathematics', 
    description: 'Numbers, logic, and calculations',
    icon: Calculator,
    color: 'red'
  },
];

const getColorClasses = (color, isSelected) => {
  const colors = {
    emerald: isSelected 
      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' 
      : 'bg-white/70 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50',
    amber: isSelected 
      ? 'bg-amber-50/80 border-amber-300 text-amber-900' 
      : 'bg-white/70 border-amber-200 hover:border-amber-300 hover:bg-amber-50/50',
    blue: isSelected 
      ? 'bg-blue-50/80 border-blue-300 text-blue-900' 
      : 'bg-white/70 border-blue-200 hover:border-blue-300 hover:bg-blue-50/50',
    green: isSelected 
      ? 'bg-green-50/80 border-green-300 text-green-900' 
      : 'bg-white/70 border-green-200 hover:border-green-300 hover:bg-green-50/50',
    purple: isSelected 
      ? 'bg-purple-50/80 border-purple-300 text-purple-900' 
      : 'bg-white/70 border-purple-200 hover:border-purple-300 hover:bg-purple-50/50',
    red: isSelected 
      ? 'bg-red-50/80 border-red-300 text-red-900' 
      : 'bg-white/70 border-red-200 hover:border-red-300 hover:bg-red-50/50',
  };
  return colors[color] || colors.amber;
};

const getIconColorClasses = (color, isSelected) => {
  const colors = {
    emerald: isSelected ? 'text-emerald-600' : 'text-emerald-500',
    amber: isSelected ? 'text-amber-600' : 'text-amber-500',
    blue: isSelected ? 'text-blue-600' : 'text-blue-500',
    green: isSelected ? 'text-green-600' : 'text-green-500',
    purple: isSelected ? 'text-purple-600' : 'text-purple-500',
    red: isSelected ? 'text-red-600' : 'text-red-500',
  };
  return colors[color] || colors.amber;
};

export default function CategoryChecklist({ selectedCategories, onCategoryToggle }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
      {categories.map((category) => {
        const isSelected = selectedCategories.includes(category.id);
        const IconComponent = category.icon;
        
        return (
          <div 
            key={category.id}
            className={`group relative p-4 md:p-5 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] backdrop-blur-sm border-2 shadow-lg hover:shadow-xl ${
              getColorClasses(category.color, isSelected)
            }`}
            onClick={() => onCategoryToggle(category.id)}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 z-10">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="text-white" size={16} />
                </div>
              </div>
            )}

            {/* Category content */}
            <div className="flex items-start space-x-3 md:space-x-4">
              {/* Hidden checkbox for accessibility */}
              <input
                type="checkbox"
                id={category.id}
                checked={isSelected}
                onChange={() => onCategoryToggle(category.id)}
                className="sr-only"
                tabIndex={-1}
              />
              
              {/* Category icon */}
              <div className={`flex-shrink-0 p-2 md:p-3 rounded-xl transition-all duration-300 ${
                isSelected 
                  ? 'bg-white/60 shadow-md' 
                  : 'bg-white/40 group-hover:bg-white/60'
              }`}>
                <IconComponent 
                  size={20} 
                  className={`transition-colors duration-300 ${getIconColorClasses(category.color, isSelected)}`} 
                />
              </div>
              
              {/* Category info */}
              <div className="flex-1 min-w-0">
                <label 
                  htmlFor={category.id}
                  className="block font-semibold text-sm md:text-base cursor-pointer transition-colors duration-300"
                >
                  {category.name}
                </label>
                <p className="text-xs md:text-sm opacity-80 mt-1 leading-relaxed">
                  {category.description}
                </p>
              </div>
            </div>

            {/* Selection overlay effect */}
            <div className={`absolute inset-0 rounded-xl md:rounded-2xl transition-all duration-300 pointer-events-none ${
              isSelected 
                ? 'bg-gradient-to-br from-amber-200/20 to-amber-300/10' 
                : 'group-hover:bg-gradient-to-br group-hover:from-amber-100/10 group-hover:to-amber-200/5'
            }`} />
          </div>
        );
      })}
    </div>
  );
} 