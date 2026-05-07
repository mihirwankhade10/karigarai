// LangChain question generation: 12 questions per candidate, in EN/KN/HI.
//
// Distribution (locked by spec):
//   Q1\u2013Q2  intro
//   Q3\u2013Q8  technical (trade-specific)
//   Q9\u2013Q10 general (soft skills)
//   Q11    situational
//   Q12    closing  (always is_ai_question=true \u2014 asks the candidate if they have any questions)

const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StructuredOutputParser } = require('langchain/output_parsers');
const { z } = require('zod');
const { FALLBACK_QUESTIONS } = require('../../../db/seed');

const QuestionSchema = z.object({
  questions: z
    .array(
      z.object({
        order: z.number().min(1).max(12),
        type: z.enum(['intro', 'technical', 'general', 'situational', 'closing']),
        question_en: z.string(),
        question_kn: z.string(),
        question_hi: z.string(),
        difficulty_level: z.number().min(1).max(3),
        is_ai_question: z.boolean(),
      })
    )
    .length(12),
});

const parser = StructuredOutputParser.fromZodSchema(QuestionSchema);

const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert HR interviewer for the Government of Karnataka EDCS workforce
assessment programme. Generate exactly 12 interview questions for this candidate:

  Trade:    {trade}
  District: {district}
  Language: {language}

DISTRIBUTION (mandatory):
  Q1, Q2   \u2013 intro questions (about the candidate themselves and prior experience)
  Q3 \u2013 Q8  \u2013 6 technical questions specifically about the {trade} trade
  Q9, Q10  \u2013 general soft-skill questions (teamwork, problem solving, communication)
  Q11      \u2013 situational/behavioural scenario relevant to a {trade} workplace
  Q12      \u2013 closing question. ALWAYS set is_ai_question=true. ALWAYS ask the
              candidate if they have any questions or doubts about the role.

RULES:
  \u2022 Questions must be practical for blue-collar / polytechnic / semi-skilled
    workers \u2013 NOT academic or theoretical.
  \u2022 Technical questions must be GENUINELY specific to {trade} (e.g. for
    Electrician: actual tools, voltage handling, common faults; not generic).
  \u2022 question_en, question_kn, question_hi are translations of the SAME question.
  \u2022 question_kn must use proper Kannada script.
  \u2022 question_hi must use Devanagari script.
  \u2022 Q12 is_ai_question=true; all others is_ai_question=false.
  \u2022 difficulty_level: 1 for intro/closing, 1\u20132 for general/situational, 2\u20133 for technical.

{format_instructions}
`);

function buildModel() {
  return new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function fallbackFor(trade) {
  // 12 minimal fallback questions when LLM/parsing fails. Used to avoid blocking
  // the candidate flow on LLM downtime; admin sees quality_flag on the candidate.
  const tradeQ = (FALLBACK_QUESTIONS && FALLBACK_QUESTIONS[trade]) || [];
  const intro = [
    { en: 'Tell us your name and your experience.', kn: '\u0CA8\u0CBF\u0CAE\u0CCD\u0CAE \u0CB9\u0CC6\u0CB8\u0CB0\u0CC1 \u0CAE\u0CA4\u0CCD\u0CA4\u0CC1 \u0CA8\u0CBF\u0CAE\u0CCD\u0CAE \u0C85\u0CA8\u0CC1\u0CAD\u0CB5 \u0CA4\u0CBF\u0CB3\u0CBF\u0CB8\u0CBF.', hi: 'apna naam aur anubhav bataiye.' },
    { en: `How many years have you worked as a ${trade}?`, kn: `\u0CA8\u0CC0\u0CB5\u0CC1 \u0C8E\u0CB7\u0CCD\u0C9F\u0CC1 \u0CB5\u0CB0\u0CCD\u0CB7 ${trade} \u0C86\u0C97\u0CBF \u0C95\u0CC6\u0CB2\u0CB8 \u0CAE\u0CBE\u0CA1\u0CBF\u0CA6\u0CCD\u0CA6\u0CC0\u0CB0\u0CBF?`, hi: `aapne ${trade} ke roop mein kitne saal kaam kiya hai?` },
  ];
  const tech = Array.from({ length: 6 }, (_, i) => ({
    en: `Explain a common task you do as a ${trade} (sample ${i + 1}).`,
    kn: `${trade} \u0C86\u0C97\u0CBF \u0CA8\u0CC0\u0CB5\u0CC1 \u0CAE\u0CBE\u0CA1\u0CC1\u0CB5 \u0CB8\u0CBE\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C95\u0CC6\u0CB2\u0CB8\u0CB5\u0CCD\u0CA8\u0CC1 \u0CB5\u0CBF\u0CB5\u0CB0\u0CBF\u0CB8\u0CBF (\u0CAE\u0CBE\u0CA6\u0CB0\u0CBF ${i + 1}).`,
    hi: `${trade} ke roop mein aap kaun sa kaam karte hain (udaharan ${i + 1})?`,
  }));
  const general = [
    { en: 'How do you handle a difficult team member?', kn: '\u0C95\u0CB7\u0CCD\u0C9F\u0C95\u0CB0 \u0C97\u0CC1\u0C82\u0CAA\u0CBF\u0CA8 \u0CB8\u0CA6\u0CB8\u0CCD\u0CAF\u0CB0\u0CCA\u0C82\u0CA6\u0CBF\u0C97\u0CC6 \u0CB9\u0CC7\u0C97\u0CC6 \u0CB5\u0CB0\u0CCD\u0CA4\u0CBF\u0CB8\u0CC1\u0CA4\u0CCD\u0CA4\u0CC0\u0CB0\u0CBF?', hi: 'mushkil team member ke saath kaise nibhate hain?' },
    { en: 'Tell us about a time you solved a problem at work.', kn: '\u0C95\u0CC6\u0CB2\u0CB8\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF \u0C92\u0C82\u0CA6\u0CC1 \u0CB8\u0CAE\u0CB8\u0CCD\u0CAF\u0CC6\u0CAF\u0CA8\u0CCD\u0CA8\u0CC1 \u0CAA\u0CB0\u0CBF\u0CB9\u0CB0\u0CBF\u0CB8\u0CBF\u0CA6 \u0C89\u0CA6\u0CBE\u0CB9\u0CB0\u0CA3\u0CC6 \u0C95\u0CC6\u0CB3\u0CC1\u0CA4\u0CCD\u0CA4\u0CC7\u0CA8\u0CC6.', hi: 'kaam par jab aapne koi samasya hal ki ho, batayein.' },
  ];
  const situational = [
    { en: `If equipment fails on site as a ${trade}, what do you do first?`, kn: `${trade} \u0C86\u0C97\u0CBF \u0C89\u0CAA\u0C95\u0CB0\u0CA3 \u0CB5\u0CBF\u0CAB\u0CB2\u0CB5\u0CBE\u0CA6\u0CB0\u0CC6 \u0CA8\u0CC0\u0CB5\u0CC1 \u0CAE\u0CCA\u0CA6\u0CB2\u0CC1 \u0C8F\u0CA8\u0CC1 \u0CAE\u0CBE\u0CA1\u0CC1\u0CA4\u0CCD\u0CA4\u0CC0\u0CB0\u0CBF?`, hi: `agar site par equipment kharab ho to ${trade} ke roop mein aap pehle kya karenge?` },
  ];
  const closing = [{ en: 'Do you have any questions about the role?', kn: '\u0CAA\u0CBE\u0CA4\u0CCD\u0CB0\u0CA6 \u0CAC\u0231\u0CC6 \u0CA8\u0CBF\u0CAE\u0C97\u0CC6 \u0C8F\u0CA8\u0CBE\u0CA6\u0CB0\u0CC2 \u0CAA\u0CCD\u0CB0\u0CB6\u0CCD\u0CA8\u0CC6\u0C97\u0CB3\u0CBF\u0CB5\u0CC6\u0CAF\u0CC7?', hi: 'is bhumika ke baare mein kya aapke koi prashn hain?' }];
  const all = [...intro, ...tech, ...general, ...situational, ...closing];
  return all.slice(0, 12).map((q, i) => ({
    order: i + 1,
    type: i < 2 ? 'intro' : i < 8 ? 'technical' : i < 10 ? 'general' : i === 10 ? 'situational' : 'closing',
    question_en: q.en,
    question_kn: q.kn,
    question_hi: q.hi,
    difficulty_level: i < 2 || i === 11 ? 1 : i < 8 ? 2 : 1,
    is_ai_question: i === 11,
  }));
}

/**
 * Generate 12 questions for a candidate. Falls back to a canonical bank if
 * the LLM call or output-parsing fails (so the candidate flow is never blocked).
 */
async function generateQuestions({ trade, district, language }) {
  const formatInstructions = parser.getFormatInstructions();

  if (!process.env.OPENAI_API_KEY) {
    return { questions: fallbackFor(trade), fallback: true };
  }

  try {
    const model = buildModel();
    const prompt = await promptTemplate.format({
      trade,
      district,
      language,
      format_instructions: formatInstructions,
    });
    const response = await model.invoke(prompt);
    const text = typeof response === 'string' ? response : response?.content || '';
    const parsed = await parser.parse(text);
    if (!parsed?.questions || parsed.questions.length !== 12) {
      throw new Error('LLM returned wrong number of questions');
    }
    // Force Q12 closing flags per spec.
    parsed.questions[11].is_ai_question = true;
    parsed.questions[11].type = 'closing';
    return { questions: parsed.questions, fallback: false };
  } catch (err) {
    console.warn('[question.service] LLM failed, using fallback:', err.message);
    return { questions: fallbackFor(trade), fallback: true };
  }
}

module.exports = { generateQuestions };
