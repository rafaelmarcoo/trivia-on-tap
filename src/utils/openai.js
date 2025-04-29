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
          content: "You are a trivia question generator. Generate one multiple choice question with 4 options and the correct answer. Format the response as JSON with the following structure: { question: string, options: string[], correctAnswer: string }"
        },
        {
          role: "user",
          content: `Generate a trivia question from these categories: ${categories.join(', ')}. The question should be challenging but fair.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const questionData = JSON.parse(content);

    return {
      question: questionData.question,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer
    };
  } catch (error) {
    console.error('Error generating trivia question:', error);
    throw error;
  }
} 