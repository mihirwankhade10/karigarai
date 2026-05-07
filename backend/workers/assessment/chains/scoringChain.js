// LangChain scoring chain.
//
// Produces structured scores + summaries for an interview transcript.
// Wraps invocation in try/catch with a fallback default object so the
// pipeline is never blocked by an LLM/parsing failure.

const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StructuredOutputParser } = require('langchain/output_parsers');
const { z } = require('zod');

const Schema = z.object({
  relevance_score: z.number().min(0).max(10),
  clarity_score: z.number().min(0).max(10),
  skill_confidence_score: z.number().min(0).max(10),
  acs_score: z.number().min(0).max(100),
  ai_summary_en: z.string().min(10),
  ai_summary_kn: z.string().min(5),
  key_observations: z.array(z.string()).min(3).max(5),
});

const parser = StructuredOutputParser.fromZodSchema(Schema);

const PROMPT = PromptTemplate.fromTemplate(`
You are evaluating a video interview transcript from a Karnataka workforce
assessment programme. The candidate is a {trade} from {district}, answering in
{language}.

QUESTIONS PRESENTED TO THE CANDIDATE:
{questions}

CANDIDATE TRANSCRIPT (raw, multilingual, possibly imperfect):
"""
{transcript}
"""

SCORE THE INTERVIEW:
  \u2022 relevance_score (0-10): how well their answers match the questions
  \u2022 clarity_score   (0-10): structure, completeness, conciseness
  \u2022 skill_confidence_score (0-10): genuine domain knowledge of {trade}
  \u2022 acs_score (0-100) = round(relevance*0.35*10 + clarity*0.25*10 + skill_confidence*0.40*10)

GUIDELINES:
  \u2022 Be lenient on language quality. A blue-collar worker in their second
    language should NOT be penalised for grammar.
  \u2022 Focus on the substance of domain knowledge. A welder who describes the
    actual welding process they use should score high on skill_confidence.
  \u2022 Penalise generic, evasive, or coached-sounding answers.
  \u2022 ai_summary_en: 2 short sentences \u2014 strengths + areas to develop.
  \u2022 ai_summary_kn: same content in proper Kannada script.
  \u2022 key_observations: 3-5 specific bullet points about THIS candidate's
    actual answers (not generic praise).

{format_instructions}
`);

function buildModel() {
  return new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function fallbackScores() {
  return {
    relevance_score: 5,
    clarity_score: 5,
    skill_confidence_score: 5,
    acs_score: 50,
    ai_summary_en: 'Automated scoring unavailable; manual review recommended.',
    ai_summary_kn: '\u0CB8\u0CCD\u0CB5\u0CAF\u0C82\u0CB5\u0CBE\u0C97\u0CBF \u0C85\u0C82\u0C95 \u0CA8\u0CC0\u0CA1\u0CB2\u0CC1 \u0CB5\u0CBF\u0CAB\u0CB2\u0CB5\u0CBE\u0CA6\u0CB0\u0CC6 \u0C95\u0CC8\u0CAF\u0CBF\u0C82\u0CA6 \u0CAA\u0CB0\u0CBF\u0CB6\u0CC0\u0CB2\u0CA8\u0CC6 \u0CB6\u0CBF\u0CAB\u0CBE\u0CB0\u0CB8\u0CC1.',
    key_observations: [
      'AI scoring fell back to default; transcript may be incomplete.',
      'Recommend manual review by district officer.',
      'Candidate flow completed end-to-end.',
    ],
    fallback: true,
  };
}

async function score({ transcript, trade, district, language, questions }) {
  if (!process.env.OPENAI_API_KEY) return fallbackScores();
  try {
    const model = buildModel();
    const text = await PROMPT.format({
      transcript: (transcript || '').slice(0, 8000),
      trade,
      district,
      language,
      questions,
      format_instructions: parser.getFormatInstructions(),
    });
    const response = await model.invoke(text);
    const out = typeof response === 'string' ? response : response?.content || '';
    const parsed = await parser.parse(out);
    return parsed;
  } catch (err) {
    console.warn('[assessment] scoring failed, using fallback:', err.message);
    return fallbackScores();
  }
}

module.exports = { score };
