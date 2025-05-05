import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function generateTriviaQuestions(categories, level, count = 20) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        {
          role: "system",
          content: `You are a trivia question generator. Always respond ONLY with a valid JSON object containing an array of questions matching this structure:
          {
            "questions": [
              {
                "type": "multiple-choice" | "true-false" | "one-word" | "math",
                "question": string,
                "options": string[] (only for multiple-choice and true-false),
                "correctAnswer": string,
                "explanation": string
              }
            ]
          }

          For multiple-choice: Provide 4 options.
          For true-false: Provide ["True", "False"].
          For one-word: No options needed, just the correct answer.
          For math: No options needed, provide the numerical answer as a string.

          Generate ${count} diverse questions. Mix different types of questions and ensure they are challenging but fair for level ${level}.
          Respond only with a JSON object, no extra text.`
        },
        {
          role: "user",
          content: `Generate ${count} trivia questions from these categories: ${categories.join(', ')}. The questions should be challenging but fair for a user at level ${level}.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const questionsData = JSON.parse(content);

    if (!Array.isArray(questionsData.questions) || questionsData.questions.length !== count) {
      throw new Error(`Invalid response: expected ${count} questions`);
    }

    // Validate each question
    questionsData.questions.forEach((questionData, index) => {
      if (questionData.type === "multiple-choice") {
        if (!Array.isArray(questionData.options) || questionData.options.length !== 4) {
          throw new Error(`Invalid multiple-choice question at index ${index}: must have 4 options.`);
        }
      }
      if (questionData.type === "true-false") {
        if (
          !Array.isArray(questionData.options) ||
          questionData.options.length !== 2 ||
          !questionData.options.includes("True") ||
          !questionData.options.includes("False")
        ) {
          throw new Error(`Invalid true-false question at index ${index}: must have ['True', 'False'] options.`);
        }
      }
      if (questionData.type === "one-word" || questionData.type === "math") {
        if (questionData.options && questionData.options.length > 0) {
          throw new Error(`One-word and math questions at index ${index} should not have options.`);
        }
      }
    });

    return questionsData.questions;
  } catch (error) {
    console.error('Error generating trivia questions:', error);
    throw error;
  }
}

// Keep the original function for backward compatibility
export async function generateTriviaQuestion(categories, level) {
  const questions = await generateTriviaQuestions(categories, level, 1);
  return questions[0];
} 