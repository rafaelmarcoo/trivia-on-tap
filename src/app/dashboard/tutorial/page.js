"use client";

import { useState } from "react";
import Categories from "./components/Categories";
import MultiChoiceQ from "./components/MultiChoiceQ";
import TrueFalse from "./components/TrueFalse";
import Maths from "./components/Maths";
import { useRouter, useSearchParams } from 'next/navigation';

export default function TutorialPage() {
  const [tutorialStep, setTutorialStep] = useState(0); // 0 = welcome, 1 = multiple choice, 2 = true/false, 3 = math
  const router = useRouter();

  const getTutorialHeader = () => {
    switch(tutorialStep) {
      case 1:
        return {
          title: "Multiple Choice Questions",
          subtitle: "Learn how to answer multiple choice questions in the quiz"
        };
      case 2:
        return {
          title: "True or False Questions",
          subtitle: "Learn how to answer true/false questions in the quiz"
        };
      case 3:
        return {
          title: "Math Questions",
          subtitle: "Learn how to answer math questions in the quiz"
        };
      default:
        return {
          title: "Welcome to the Tutorial",
          subtitle: "Learn how to play Trivia on Tap in just a few simple steps"
        };
    }
  };

  const renderTutorialContent = () => {
    switch(tutorialStep) {
      case 1:
        return <MultiChoiceQ onNext={() => setTutorialStep(2)} />;
      case 2:
        return <TrueFalse onNext={() => setTutorialStep(3)} />;
      case 3:
        return <Maths onComplete={() => router.push('/dashboard')} />;
      default:
        return (
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold">1</span>
                <h2 className="text-2xl font-semibold text-gray-800">Choose Your Categories</h2>
              </div>
              <p className="text-gray-600 mb-6 pl-11">
                Select one or more categories below that you'd like to be quizzed on. 
                Mix and match to create your perfect trivia experience!
              </p>
              <div className="pl-11">
                <Categories />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold">2</span>
                <h2 className="text-2xl font-semibold text-gray-800">Start Your Game</h2>
              </div>
              <p className="text-gray-600 mb-6 pl-11">
                Ready to begin? Click the button below to start your trivia game with the selected categories.
              </p>
              <div className="pl-11">
                <button
                  className="w-full py-4 px-8 rounded-lg text-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors shadow-md"
                  onClick={() => setTutorialStep(1)}
                >
                  Begin Tutorial
                </button>
              </div>
            </section>
          </div>
        );
    }
  };

  const header = getTutorialHeader();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto p-8">
        <nav className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <span className="text-lg">←</span>
            <span>Return to Dashboard</span>
          </button>
        </nav>

        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {header.title}
          </h1>
          <p className="text-lg text-gray-600">
            {header.subtitle}
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {renderTutorialContent()}
        </div>
      </div>
    </div>
  );
}