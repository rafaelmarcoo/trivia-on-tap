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