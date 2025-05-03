import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // This is needed for client-side usage
});

export async function generateTriviaQuestion(categories) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a trivia question generator. Always respond ONLY with a valid JSON object matching this structure:
          {
            "type": "multiple-choice" | "true-false" | "one-word" | "math",
            "question": string,
            "options": string[] (only for multiple-choice and true-false),
            "correctAnswer": string,
            "explanation": string (optional)
          }

          For multiple-choice: Provide 4 options.
          For true-false: Provide ["True", "False"].
          For one-word: No options needed, just the correct answer.
          For math: No options needed, provide the numerical answer as a string.

          Respond only with a JSON object, no extra text. The word 'JSON' must appear in your response instructions.`
        },
        {
          role: "user",
          content: `Generate a trivia question from these categories: ${categories.join(', ')}. The question should be challenging but fair. Randomly select one of the question types.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const questionData = JSON.parse(content);

    if (questionData.type === "multiple-choice") {
      if (!Array.isArray(questionData.options) || questionData.options.length !== 4) {
        throw new Error("Invalid multiple-choice question: must have 4 options.");
      }
    }
    if (questionData.type === "true-false") {
      if (
        !Array.isArray(questionData.options) ||
        questionData.options.length !== 2 ||
        !questionData.options.includes("True") ||
        !questionData.options.includes("False")
      ) {
        throw new Error("Invalid true-false question: must have ['True', 'False'] options.");
      }
    }
    if (questionData.type === "one-word" || questionData.type === "math") {
      if (questionData.options && questionData.options.length > 0) {
        throw new Error("One-word and math questions should not have options.");
      }
    }

    return {
      type: questionData.type,
      question: questionData.question,
      options: questionData.options || [],
      correctAnswer: questionData.correctAnswer,
      explanation: questionData.explanation
    };
  } catch (error) {
    console.error('Error generating trivia question:', error);
    throw error;
  }
} 