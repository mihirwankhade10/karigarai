// Generates the friendly AI-interviewer reply for Q12 (the closing question
// where the candidate may ask about the role). Short, warm, language-aware.

const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');

const PROMPT = PromptTemplate.fromTemplate(`
You are a friendly AI interviewer for the Government of Karnataka workforce
assessment programme. The candidate is a {trade} from {district}. They asked:

  "{candidateQuestion}"

Reply in {language} (use the correct script: Kannada \u2192 \u0C95\u0CA8\u0CCD\u0CA8\u0CA1, Hindi \u2192 \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940, otherwise English).

RULES:
  \u2022 Maximum 3 sentences total.
  \u2022 Be encouraging and professional.
  \u2022 If specific salary, location, or start-date details are unknown, say
    "results and details will be shared by the recruitment team".
  \u2022 End with a warm closing to the interview (e.g. "Thank you, all the best").
`);

let model;
function getModel() {
  if (!model) {
    model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 200,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return model;
}

async function generateAIResponse({ candidateQuestion, trade, district, language }) {
  if (!process.env.OPENAI_API_KEY) {
    return fallback(language);
  }
  try {
    const text = await PROMPT.format({ candidateQuestion, trade, district, language });
    const r = await getModel().invoke(text);
    return typeof r === 'string' ? r : r?.content || fallback(language);
  } catch (err) {
    console.warn('[aiResponse.service] LLM failed:', err.message);
    return fallback(language);
  }
}

function fallback(language) {
  if (language === 'kannada')
    return '\u0CA8\u0CBF\u0CAE\u0CCD\u0CAE \u0CAA\u0CCD\u0CB0\u0CB6\u0CCD\u0CA8\u0CB5\u0C95\u0CCD\u0C95\u0CC6 \u0CA7\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6\u0C97\u0CB3\u0CC1. \u0C92\u0CA8\u0CCD\u0CA6\u0CC1 \u0CB5\u0CBF\u0CB7\u0CAF\u0CB5\u0CA8\u0CCD\u0CA8\u0CC1 \u0CA8\u0CC7\u0CAE\u0C95\u0CBE\u0CA4\u0CBF \u0CA4\u0C82\u0C97\u0CB5\u0CBF\u0C95\u0CC1\u0CA4\u0CCD\u0CA4\u0CB0\u0CC1 \u0CB6\u0CC0\u0C98\u0CCD\u0CB0\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF \u0CA4\u0CBF\u0CB3\u0CBF\u0CB8\u0CC1\u0CA4\u0CCD\u0CA4\u0CBE\u0CB0\u0CC6. \u0CB6\u0CC1\u0CAD\u0CB5\u0CBE\u0CB0\u0CCD\u0CA4\u0CC6\u0C97\u0CB3\u0CC1!';
  if (language === 'hindi')
    return '\u0906\u092A\u0915\u0947 \u092A\u094D\u0930\u0936\u094D\u0928 \u0915\u0947 \u0932\u093F\u090F \u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964 \u092D\u0930\u094D\u0924\u0940 \u091F\u0940\u092E \u091C\u0932\u094D\u0926 \u0939\u0940 \u0935\u093F\u0938\u094D\u0924\u0930\u0923 \u0938\u0947 \u0938\u093E\u091D\u093E \u0915\u0930\u0947\u0917\u0940\u0964 \u0936\u0941\u092D\u0915\u093E\u092E\u0928\u093E\u090F\u0901!';
  return 'Thank you for your question. Our recruitment team will share results and details with you soon. All the best!';
}

module.exports = { generateAIResponse };
