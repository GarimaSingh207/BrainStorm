const OpenAI = require('openai');
const { logger } = require('../utils/logger');

function getOpenAIClient() {
  const apiKey = process.env.OPENROUTER_API_KEY || 'dummy_key';
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey === 'your_openrouter_api_key' ? 'dummy_key' : apiKey,
    defaultHeaders: { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5001', 'X-Title': process.env.OPENROUTER_SITE_NAME || 'BrainStorm Arena' },
  });
}

function buildQuizPrompt(context, difficulty, topicHint) {
  const topicContext = topicHint ? `The topic/exam is: "${topicHint}".` : 'No specific exam is specified — generate general-knowledge questions strictly based on the study material below.';
  return `You are an elite academic quiz generator.
${topicContext}
Study Material / RAG Context:
---
${context}
---
OUTPUT FORMAT — Return ONLY a single valid JSON object:
{
  "questionCount": <number>,
  "timerConfig": {
    "mode": "<per_question_fixed | global_countdown | per_question_dynamic>",
    "perQuestionSeconds": <number, ONLY if mode is per_question_fixed>,
    "totalSeconds": <number, ONLY if mode is global_countdown>,
    "perQuestionTimes": [<array of numbers, one per question, ONLY if mode is per_question_dynamic>]
  },
  "questions": [
    { "type": "MCQ", "content": "<question text>", "options": [ { "id": "A", "text": "<option A>" }, { "id": "B", "text": "<option B>" }, { "id": "C", "text": "<option C>" }, { "id": "D", "text": "<option D>" } ], "correctAnswerId": "<A|B|C|D>" }
  ]
}`;
}

function generateFallbackPayload(context, difficulty, count) {
  logger.info('Using local fallback quiz generator.');
  const fallbackQuestions = [];
  for (let i = 0; i < count; i++) {
    fallbackQuestions.push({
      type: 'MCQ',
      content: `Fallback question ${i + 1} based on context`,
      options: [{ id: 'A', text: 'True' }, { id: 'B', text: 'False' }, { id: 'C', text: 'Maybe' }, { id: 'D', text: 'None' }],
      correctAnswerId: 'A',
    });
  }
  return { questionCount: count, questions: fallbackQuestions, timerConfig: { mode: 'per_question_fixed', perQuestionSeconds: 15 } };
}

async function generateQuizContent(context, difficulty, count, topicHint = '') {
  const modelName = 'nvidia/nemotron-3-nano-30b-a3b:free';
  const openai = getOpenAIClient();

  if (process.env.TEST === 'true') {
    return generateFallbackPayload(context, difficulty, count);
  }

  try {
    const prompt = buildQuizPrompt(context, difficulty, topicHint);
    const completion = await openai.chat.completions.create({ model: modelName, messages: [{ role: 'user', content: prompt }] });
    const resultText = completion.choices[0]?.message?.content || '';
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.timerConfig?.mode) parsed.timerConfig = { mode: 'per_question_fixed', perQuestionSeconds: 20 };
    return parsed;
  } catch (error) {
    logger.error('Failed to generate quiz', error);
    throw new Error(`Quiz generation failed: ${error.message}`);
  }
}
module.exports = { generateQuizContent };
