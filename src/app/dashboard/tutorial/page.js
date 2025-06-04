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
          <div className="space-y-12">
            <section className="transform transition-all duration-300 hover:translate-x-2">
              <div className="flex items-center gap-4 mb-6">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white font-semibold shadow-md">1</span>
                <h2 className="text-2xl font-semibold text-gray-800">Choose Your Categories</h2>
              </div>
              <p className="text-gray-600 mb-8 pl-14">
                Select one or more categories below that you&apos;d like to be quizzed on. 
                Mix and match to create your perfect trivia experience!
              </p>
              <div className="pl-14">
                <Categories />
              </div>
            </section>

            <section className="transform transition-all duration-300 hover:translate-x-2">
              <div className="flex items-center gap-4 mb-6">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white font-semibold shadow-md">2</span>
                <h2 className="text-2xl font-semibold text-gray-800">Start Your Game</h2>
              </div>
              <p className="text-gray-600 mb-8 pl-14">
                Ready to begin? Click the button below to start your trivia game with the selected categories.
              </p>
              <div className="pl-14">
                <button
                  className="w-full py-4 px-8 rounded-lg text-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      <div className="max-w-4xl mx-auto p-8">
        <nav className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-800 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-sm border border-amber-100"
          >
            <span className="text-lg">←</span>
            <span>Return to Dashboard</span>
          </button>
        </nav>

        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 relative">
            {header.title}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-amber-500 rounded-full opacity-75"></div>
          </h1>
          <p className="text-lg text-gray-600">
            {header.subtitle}
          </p>
        </header>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100/50 p-8 transition-all duration-300">
          {tutorialStep === 0 && (
            <div className="absolute top-4 right-4 flex gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className="w-2 h-2 rounded-full bg-amber-200"
                ></div>
              ))}
            </div>
          )}
          {renderTutorialContent()}
        </div>
      </div>
    </div>
  );
}