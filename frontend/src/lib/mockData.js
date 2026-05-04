// Mock data for KarigarAI — replace with real API responses later.

export const KARNATAKA_DISTRICTS = [
  'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
  'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
  'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
  'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
  'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir',
  'Hubli',
];

export const TRADE_CATEGORIES = [
  'Electrician', 'Plumber', 'Carpenter', 'Welder', 'Mason',
  'Machine Operator', 'Lab Technician', 'Draughtsman', 'Helper', 'Packing',
  'Assembly Line',
];

export const FITMENT_CATEGORIES = [
  'job_ready',
  'requires_upskilling',
  'manual_review',
  'low_confidence',
  'suspected_fraud',
];

export const WORKFORCE_SEGMENTS = ['blue_collar', 'polytechnic', 'semi_skilled'];

const FIRST_NAMES = [
  'Raju', 'Priya', 'Suresh', 'Meena', 'Vinod', 'Lakshmi', 'Mahesh', 'Geetha',
  'Ravi', 'Anitha', 'Kiran', 'Shilpa', 'Manjunath', 'Roopa', 'Praveen', 'Divya',
  'Naveen', 'Bhavana', 'Ganesh', 'Sumitra', 'Rakesh', 'Pavithra', 'Santosh',
  'Nirmala', 'Arun', 'Kavya', 'Basavaraj', 'Yamuna', 'Hemanth', 'Sushma',
];
const LAST_INITIALS = ['Kumar', 'Devi', 'B', 'G', 'M', 'S', 'R', 'N', 'P', 'K'];

const SUMMARIES_EN = {
  job_ready: [
    'Demonstrated solid command of trade fundamentals and communicated procedures clearly. Confidence with safety practices was strong throughout.',
    'Articulated technical concepts with precision and answered scenario-based questions correctly. Suitable for immediate field deployment.',
    'Showed reliable hands-on judgment and used trade vocabulary accurately. A consistent and confident interview overall.',
    'Provided complete and structured answers with practical examples. Clarity and skill confidence both scored above benchmark.',
  ],
  requires_upskilling: [
    'Foundation is sound but applied vocabulary needs reinforcement. A short focused training on common scenarios would close the gap.',
    'Understands basic principles but stumbled on procedure-specific terms. Recommend a 4–6 week skill-bridging course.',
    'Communication is clear but technical depth is partial. Targeted upskilling on safety codes is recommended.',
  ],
  manual_review: [
    'Mixed responses across questions — strong on fundamentals, hesitant on advanced steps. A reviewer should validate alignment with role requirements.',
    'Promising candidate with inconsistent depth across topics. Manual review recommended before placement decision.',
  ],
  low_confidence: [
    'Audio clarity was below threshold for confident scoring. Candidate should retry the interview in a quieter environment.',
    'Significant pauses and unclear phrasing limited evaluation. A retry is recommended for an accurate assessment.',
  ],
  suspected_fraud: [
    'Voice pattern divergence detected versus registered candidate baseline. Routed for fraud review.',
    'Background audio suggests prompted responses. Flagged for manual verification.',
  ],
};

const SUMMARIES_KN = {
  job_ready: [
    'ವೃತ್ತಿಯ ಮೂಲಭೂತ ತತ್ವಗಳ ಮೇಲೆ ಉತ್ತಮ ಹಿಡಿತ ತೋರಿಸಿದ್ದಾರೆ. ಸುರಕ್ಷತೆಯ ಬಗ್ಗೆ ಆತ್ಮವಿಶ್ವಾಸ ಸ್ಪಷ್ಟವಾಗಿತ್ತು.',
    'ತಾಂತ್ರಿಕ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ನಿಖರವಾಗಿ ವಿವರಿಸಿದ್ದಾರೆ. ತಕ್ಷಣದ ಕೆಲಸಕ್ಕೆ ಸೂಕ್ತ.',
    'ಪ್ರಾಯೋಗಿಕ ತೀರ್ಮಾನ ಮತ್ತು ಸ್ಪಷ್ಟ ಸಂವಹನ ತೋರಿಸಿದ್ದಾರೆ. ಒಟ್ಟಾರೆ ಸ್ಥಿರ ಸಂದರ್ಶನ.',
    'ಪೂರ್ಣ ಮತ್ತು ರಚನಾತ್ಮಕ ಉತ್ತರಗಳನ್ನು ನೀಡಿದ್ದಾರೆ. ಸ್ಪಷ್ಟತೆ ಮತ್ತು ಆತ್ಮವಿಶ್ವಾಸ ಎರಡೂ ಉತ್ತಮ.',
  ],
  requires_upskilling: [
    'ಮೂಲಭೂತ ತತ್ವಗಳು ಸರಿಯಿವೆ ಆದರೆ ತಾಂತ್ರಿಕ ಪದಗಳ ಮೇಲೆ ಬಲಪಡಿಸಬೇಕು. ಸಣ್ಣ ತರಬೇತಿ ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.',
    'ಮೂಲತತ್ವ ಅರ್ಥವಾಗಿದೆ ಆದರೆ ಕೆಲವು ವಿಧಾನಗಳಲ್ಲಿ ಸಂದೇಹವಿತ್ತು. 4-6 ವಾರಗಳ ಕೌಶಲ್ಯ ತರಬೇತಿ ಶಿಫಾರಸು.',
    'ಸಂವಹನ ಸ್ಪಷ್ಟವಾಗಿದೆ ಆದರೆ ತಾಂತ್ರಿಕ ಆಳ ಭಾಗಶಃ. ಸುರಕ್ಷತಾ ನಿಯಮಗಳ ಮೇಲೆ ಗುರಿತಪ್ಪದ ತರಬೇತಿ ಸೂಚಿತ.',
  ],
  manual_review: [
    'ಪ್ರಶ್ನೆಗಳ ಉತ್ತರಗಳಲ್ಲಿ ವೈವಿಧ್ಯ ಕಂಡುಬಂದಿದೆ. ಪರಿಶೀಲಕರು ಪಾತ್ರಕ್ಕೆ ಹೊಂದಾಣಿಕೆಯನ್ನು ದೃಢೀಕರಿಸಬೇಕು.',
    'ಭರವಸೆಯ ಅಭ್ಯರ್ಥಿ ಆದರೆ ಆಳದಲ್ಲಿ ಅಸಂಗತತೆ. ಮ್ಯಾನುಯಲ್ ಪರಿಶೀಲನೆ ಶಿಫಾರಸು.',
  ],
  low_confidence: [
    'ಧ್ವನಿ ಸ್ಪಷ್ಟತೆ ಕಡಿಮೆ ಇದ್ದ ಕಾರಣ ನಿಖರ ಮೌಲ್ಯಮಾಪನ ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಶಾಂತ ಸ್ಥಳದಲ್ಲಿ ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.',
    'ಗಮನಾರ್ಹ ವಿರಾಮಗಳಿಂದ ಮೌಲ್ಯಮಾಪನ ಸೀಮಿತವಾಗಿತ್ತು. ಮರುಪ್ರಯತ್ನ ಶಿಫಾರಸು.',
  ],
  suspected_fraud: [
    'ನೋಂದಾಯಿತ ಧ್ವನಿ ಮಾದರಿಯೊಂದಿಗೆ ಭಿನ್ನತೆ ಪತ್ತೆ. ಪರಿಶೀಲನೆಗೆ ಕಳುಹಿಸಲಾಗಿದೆ.',
    'ಹಿನ್ನೆಲೆ ಧ್ವನಿಯಿಂದ ಪ್ರೇರಿತ ಉತ್ತರಗಳ ಸಾಧ್ಯತೆ. ಮ್ಯಾನುಯಲ್ ಪರಿಶೀಲನೆಗೆ ಗುರುತಿಸಲಾಗಿದೆ.',
  ],
};

const KEY_OBSERVATIONS = {
  job_ready: [
    'Demonstrated knowledge of basic wiring principles and circuit safety',
    'Used correct technical vocabulary throughout the interview',
    'Showed confidence in tool handling and step sequencing',
  ],
  requires_upskilling: [
    'Understood fundamentals but used informal terms for technical concepts',
    'Hesitated on advanced procedural questions',
    'Strong willingness to learn — clear and engaged communication',
  ],
  manual_review: [
    'Inconsistent depth across topic areas',
    'Strong on practical examples, weaker on theory',
    'Needs human reviewer to confirm role alignment',
  ],
  low_confidence: [
    'Audio quality intermittently degraded scoring',
    'Several questions had partial answers',
    'Candidate appeared distracted by environment',
  ],
  suspected_fraud: [
    'Voice biometric divergence flagged by audio model',
    'Background voices detected during responses',
    'Recommended for in-person verification',
  ],
};

const FRAUD_REASONS = [
  'Voiceprint mismatch with registered baseline (similarity 0.42)',
  'Multiple background voices coaching responses',
  'Identical response phrasing matched 2 prior submissions',
];

const LANGUAGES = ['kannada', 'hindi', 'english'];

// 30 candidates with prescribed fitment distribution
const FITMENT_DISTRIBUTION = [
  ...Array(10).fill('job_ready'),
  ...Array(8).fill('requires_upskilling'),
  ...Array(5).fill('manual_review'),
  ...Array(4).fill('low_confidence'),
  ...Array(3).fill('suspected_fraud'),
];

const seededRand = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};
const rand = seededRand(7);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const generateScores = (fitment) => {
  switch (fitment) {
    case 'job_ready':
      return {
        acsScore: 75 + Math.floor(rand() * 20),
        relevanceScore: 78 + Math.floor(rand() * 18),
        clarityScore: 75 + Math.floor(rand() * 20),
        skillConfidenceScore: 76 + Math.floor(rand() * 20),
      };
    case 'requires_upskilling':
      return {
        acsScore: 50 + Math.floor(rand() * 20),
        relevanceScore: 52 + Math.floor(rand() * 22),
        clarityScore: 60 + Math.floor(rand() * 20),
        skillConfidenceScore: 48 + Math.floor(rand() * 20),
      };
    case 'manual_review':
      return {
        acsScore: 55 + Math.floor(rand() * 15),
        relevanceScore: 50 + Math.floor(rand() * 25),
        clarityScore: 55 + Math.floor(rand() * 25),
        skillConfidenceScore: 50 + Math.floor(rand() * 25),
      };
    case 'low_confidence':
      return {
        acsScore: 25 + Math.floor(rand() * 20),
        relevanceScore: 30 + Math.floor(rand() * 20),
        clarityScore: 25 + Math.floor(rand() * 20),
        skillConfidenceScore: 28 + Math.floor(rand() * 20),
      };
    case 'suspected_fraud':
      return {
        acsScore: 40 + Math.floor(rand() * 30),
        relevanceScore: 45 + Math.floor(rand() * 30),
        clarityScore: 50 + Math.floor(rand() * 30),
        skillConfidenceScore: 40 + Math.floor(rand() * 30),
      };
    default:
      return { acsScore: 50, relevanceScore: 50, clarityScore: 50, skillConfidenceScore: 50 };
  }
};

const segmentForTrade = (trade) => {
  if (['Lab Technician', 'Draughtsman', 'Machine Operator'].includes(trade)) return 'polytechnic';
  if (['Helper', 'Packing', 'Assembly Line'].includes(trade)) return 'semi_skilled';
  return 'blue_collar';
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const CANDIDATES = FITMENT_DISTRIBUTION.map((fitmentCategory, i) => {
  const id = `cand_${String(i + 1).padStart(3, '0')}`;
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastInitial = LAST_INITIALS[i % LAST_INITIALS.length];
  const district = KARNATAKA_DISTRICTS[i % KARNATAKA_DISTRICTS.length];
  const tradeCategory = TRADE_CATEGORIES[i % TRADE_CATEGORIES.length];
  const language = LANGUAGES[i % LANGUAGES.length];
  const scores = generateScores(fitmentCategory);
  const summaryEnArr = SUMMARIES_EN[fitmentCategory];
  const summaryKnArr = SUMMARIES_KN[fitmentCategory];
  const observations = KEY_OBSERVATIONS[fitmentCategory];
  const isFraud = fitmentCategory === 'suspected_fraud';

  return {
    id,
    name: `${firstName} ${lastInitial}`,
    phone: `9${String(800000000 + i * 137 + 12345).slice(0, 9)}`,
    district,
    tradeCategory,
    language,
    photo: `https://i.pravatar.cc/200?img=${(i % 30) + 1}`,
    ...scores,
    fitmentCategory,
    workforceSegment: segmentForTrade(tradeCategory),
    aiSummaryEn: summaryEnArr[i % summaryEnArr.length],
    aiSummaryKn: summaryKnArr[i % summaryKnArr.length],
    keyObservations: observations,
    fraudFlag: isFraud,
    fraudReason: isFraud ? FRAUD_REASONS[i % FRAUD_REASONS.length] : null,
    fraudSimilarity: isFraud ? 0.78 + Math.random() * 0.15 : null,
    faceMatchConfidence: isFraud ? 0.42 : 0.92 + Math.random() * 0.07,
    qualityFlag: fitmentCategory === 'low_confidence',
    status: fitmentCategory === 'manual_review' ? 'flagged' : 'complete',
    interviewDate: daysAgo(i % 7),
  };
});

export const INTERVIEW_QUESTIONS = {
  Electrician: [
    {
      id: 'q_elec_1',
      tradeCategoryId: 'Electrician',
      questionEn: 'Explain the difference between AC and DC current in everyday tools.',
      questionKn: 'ದೈನಂದಿನ ಉಪಕರಣಗಳಲ್ಲಿ AC ಮತ್ತು DC ವಿದ್ಯುತ್ ನಡುವಿನ ವ್ಯತ್ಯಾಸವನ್ನು ವಿವರಿಸಿ.',
      questionHi: 'रोज़मर्रा के उपकरणों में AC और DC करंट के बीच अंतर समझाइए।',
      difficultyLevel: 1,
    },
    {
      id: 'q_elec_2',
      tradeCategoryId: 'Electrician',
      questionEn: 'How would you safely replace a faulty MCB in a domestic distribution box?',
      questionKn: 'ಮನೆಯ ವಿತರಣಾ ಪೆಟ್ಟಿಗೆಯಲ್ಲಿ ದೋಷಪೂರಿತ MCB ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಹೇಗೆ ಬದಲಾಯಿಸುತ್ತೀರಿ?',
      questionHi: 'घरेलू वितरण बॉक्स में खराब MCB को सुरक्षित रूप से कैसे बदलेंगे?',
      difficultyLevel: 2,
    },
    {
      id: 'q_elec_3',
      tradeCategoryId: 'Electrician',
      questionEn: 'What safety equipment is mandatory before working on a live panel?',
      questionKn: 'ಲೈವ್ ಪ್ಯಾನಲ್‌ನ ಮೇಲೆ ಕೆಲಸ ಮಾಡುವ ಮೊದಲು ಯಾವ ಸುರಕ್ಷತಾ ಸಾಧನಗಳು ಕಡ್ಡಾಯ?',
      questionHi: 'लाइव पैनल पर काम करने से पहले कौन से सुरक्षा उपकरण अनिवार्य हैं?',
      difficultyLevel: 1,
    },
    {
      id: 'q_elec_4',
      tradeCategoryId: 'Electrician',
      questionEn: 'Describe how earthing protects appliances and people.',
      questionKn: 'ಅರ್ಥಿಂಗ್ ಉಪಕರಣಗಳು ಮತ್ತು ಜನರನ್ನು ಹೇಗೆ ರಕ್ಷಿಸುತ್ತದೆ ಎಂಬುದನ್ನು ವಿವರಿಸಿ.',
      questionHi: 'अर्थिंग उपकरणों और लोगों की सुरक्षा कैसे करती है, बताइए।',
      difficultyLevel: 2,
    },
    {
      id: 'q_elec_5',
      tradeCategoryId: 'Electrician',
      questionEn: 'A 3-phase motor is humming but not rotating. What are your first three checks?',
      questionKn: '3-ಫೇಸ್ ಮೋಟಾರು ಶಬ್ದ ಮಾಡುತ್ತಿದೆ ಆದರೆ ತಿರುಗುತ್ತಿಲ್ಲ. ನಿಮ್ಮ ಮೊದಲ ಮೂರು ಪರಿಶೀಲನೆಗಳು ಯಾವುವು?',
      questionHi: '3-फेज़ मोटर हम कर रही है लेकिन घूम नहीं रही। आपकी पहली तीन जाँच क्या होंगी?',
      difficultyLevel: 3,
    },
  ],
  Carpenter: [
    {
      id: 'q_carp_1',
      tradeCategoryId: 'Carpenter',
      questionEn: 'Which wood types are commonly used for door frames in Karnataka?',
      questionKn: 'ಕರ್ನಾಟಕದಲ್ಲಿ ಬಾಗಿಲ ಚೌಕಟ್ಟಿಗೆ ಸಾಮಾನ್ಯವಾಗಿ ಯಾವ ಮರಗಳನ್ನು ಬಳಸುತ್ತಾರೆ?',
      questionHi: 'कर्नाटक में दरवाज़े की चौखट के लिए सामान्यतः कौन सी लकड़ियाँ उपयोग होती हैं?',
      difficultyLevel: 1,
    },
    {
      id: 'q_carp_2',
      tradeCategoryId: 'Carpenter',
      questionEn: 'How do you measure and mark a 90-degree corner without a protractor?',
      questionKn: 'ಪ್ರೋಟ್ರಾಕ್ಟರ್ ಇಲ್ಲದೆ 90 ಡಿಗ್ರಿ ಮೂಲೆಯನ್ನು ಹೇಗೆ ಅಳೆಯುತ್ತೀರಿ ಮತ್ತು ಗುರುತಿಸುತ್ತೀರಿ?',
      questionHi: 'बिना प्रोट्रैक्टर के 90 डिग्री कोण कैसे मापते और चिह्नित करते हैं?',
      difficultyLevel: 2,
    },
    {
      id: 'q_carp_3',
      tradeCategoryId: 'Carpenter',
      questionEn: 'List the safety steps before operating a circular saw.',
      questionKn: 'ಸರ್ಕ್ಯುಲರ್ ಗರಗಸವನ್ನು ಬಳಸುವ ಮೊದಲು ಸುರಕ್ಷತಾ ಹಂತಗಳನ್ನು ಪಟ್ಟಿಮಾಡಿ.',
      questionHi: 'सर्कुलर आरी चलाने से पहले के सुरक्षा कदम बताइए।',
      difficultyLevel: 1,
    },
    {
      id: 'q_carp_4',
      tradeCategoryId: 'Carpenter',
      questionEn: 'Explain the difference between mortise & tenon and dowel joinery.',
      questionKn: 'ಮಾರ್ಟೈಸ್ & ಟೆನಾನ್ ಮತ್ತು ಡೋವೆಲ್ ಜೋಡಣೆಯ ನಡುವಿನ ವ್ಯತ್ಯಾಸವನ್ನು ವಿವರಿಸಿ.',
      questionHi: 'मॉर्टाइस-टेनन और डाउल जॉइनरी के बीच अंतर समझाइए।',
      difficultyLevel: 3,
    },
    {
      id: 'q_carp_5',
      tradeCategoryId: 'Carpenter',
      questionEn: 'How do you treat wood to prevent termite damage?',
      questionKn: 'ಗೆದ್ದಲು ಹಾನಿಯನ್ನು ತಡೆಯಲು ಮರವನ್ನು ಹೇಗೆ ಸಂಸ್ಕರಿಸುತ್ತೀರಿ?',
      questionHi: 'दीमक के नुकसान से बचाने के लिए लकड़ी का उपचार कैसे करते हैं?',
      difficultyLevel: 2,
    },
  ],
  Plumber: [
    {
      id: 'q_plum_1',
      tradeCategoryId: 'Plumber',
      questionEn: 'How do you identify the source of a leak behind a wall?',
      questionKn: 'ಗೋಡೆಯ ಹಿಂದಿನ ಸೋರಿಕೆಯ ಮೂಲವನ್ನು ಹೇಗೆ ಗುರುತಿಸುತ್ತೀರಿ?',
      questionHi: 'दीवार के पीछे रिसाव का स्रोत कैसे पहचानते हैं?',
      difficultyLevel: 2,
    },
    {
      id: 'q_plum_2',
      tradeCategoryId: 'Plumber',
      questionEn: 'What is the recommended slope for a 4-inch drain pipe?',
      questionKn: '4-ಇಂಚಿನ ಡ್ರೈನ್ ಪೈಪ್‌ಗೆ ಶಿಫಾರಸು ಮಾಡಲಾದ ಇಳಿಜಾರು ಎಷ್ಟು?',
      questionHi: '4 इंच की ड्रेन पाइप के लिए कितनी ढलान सही है?',
      difficultyLevel: 1,
    },
    {
      id: 'q_plum_3',
      tradeCategoryId: 'Plumber',
      questionEn: 'List the types of pipe joints used in CPVC plumbing.',
      questionKn: 'CPVC ಪ್ಲಂಬಿಂಗ್‌ನಲ್ಲಿ ಬಳಸಲಾಗುವ ಪೈಪ್ ಜಂಟಿಗಳ ಪ್ರಕಾರಗಳನ್ನು ಪಟ್ಟಿಮಾಡಿ.',
      questionHi: 'CPVC प्लंबिंग में उपयोग होने वाले पाइप जोड़ों के प्रकार बताइए।',
      difficultyLevel: 1,
    },
    {
      id: 'q_plum_4',
      tradeCategoryId: 'Plumber',
      questionEn: 'How do you safely replace a corroded angle valve under pressure?',
      questionKn: 'ಒತ್ತಡದ ಅಡಿಯಲ್ಲಿ ತುಕ್ಕು ಹಿಡಿದ ಆಂಗಲ್ ವಾಲ್ವ್ ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಹೇಗೆ ಬದಲಾಯಿಸುತ್ತೀರಿ?',
      questionHi: 'दबाव में जंग लगे एंगल वाल्व को सुरक्षित रूप से कैसे बदलते हैं?',
      difficultyLevel: 3,
    },
    {
      id: 'q_plum_5',
      tradeCategoryId: 'Plumber',
      questionEn: 'Describe how to test new plumbing for leaks before closing the wall.',
      questionKn: 'ಗೋಡೆ ಮುಚ್ಚುವ ಮೊದಲು ಹೊಸ ಪ್ಲಂಬಿಂಗ್‌ನಲ್ಲಿ ಸೋರಿಕೆಯನ್ನು ಹೇಗೆ ಪರೀಕ್ಷಿಸುತ್ತೀರಿ?',
      questionHi: 'दीवार बंद करने से पहले नई प्लंबिंग में रिसाव की जाँच कैसे करते हैं?',
      difficultyLevel: 2,
    },
  ],
  Welder: [
    {
      id: 'q_weld_1',
      tradeCategoryId: 'Welder',
      questionEn: 'What PPE is mandatory for arc welding?',
      questionKn: 'ಆರ್ಕ್ ವೆಲ್ಡಿಂಗ್‌ಗೆ ಯಾವ PPE ಕಡ್ಡಾಯ?',
      questionHi: 'आर्क वेल्डिंग के लिए कौन सा PPE अनिवार्य है?',
      difficultyLevel: 1,
    },
    {
      id: 'q_weld_2',
      tradeCategoryId: 'Welder',
      questionEn: 'Difference between MIG, TIG and stick welding — when to use each?',
      questionKn: 'MIG, TIG ಮತ್ತು ಸ್ಟಿಕ್ ವೆಲ್ಡಿಂಗ್ ನಡುವಿನ ವ್ಯತ್ಯಾಸ — ಯಾವಾಗ ಯಾವುದನ್ನು ಬಳಸಬೇಕು?',
      questionHi: 'MIG, TIG और स्टिक वेल्डिंग में अंतर — कब किसका उपयोग करें?',
      difficultyLevel: 3,
    },
    {
      id: 'q_weld_3',
      tradeCategoryId: 'Welder',
      questionEn: 'How do you prepare a mild-steel surface before welding?',
      questionKn: 'ವೆಲ್ಡಿಂಗ್ ಮೊದಲು ಮೈಲ್ಡ್-ಸ್ಟೀಲ್ ಮೇಲ್ಮೈಯನ್ನು ಹೇಗೆ ಸಿದ್ಧಪಡಿಸುತ್ತೀರಿ?',
      questionHi: 'वेल्डिंग से पहले माइल्ड-स्टील की सतह कैसे तैयार करते हैं?',
      difficultyLevel: 2,
    },
    {
      id: 'q_weld_4',
      tradeCategoryId: 'Welder',
      questionEn: 'What causes porosity in a weld bead and how do you prevent it?',
      questionKn: 'ವೆಲ್ಡ್ ಬೀಡ್‌ನಲ್ಲಿ ರಂಧ್ರತೆಗೆ ಕಾರಣವೇನು ಮತ್ತು ಅದನ್ನು ಹೇಗೆ ತಡೆಯುತ್ತೀರಿ?',
      questionHi: 'वेल्ड बीड में पोरोसिटी क्यों होती है और इसे कैसे रोकते हैं?',
      difficultyLevel: 3,
    },
    {
      id: 'q_weld_5',
      tradeCategoryId: 'Welder',
      questionEn: 'Describe how to set amperage for a 6mm electrode.',
      questionKn: '6mm ಎಲೆಕ್ಟ್ರೋಡ್‌ಗಾಗಿ ಆಂಪಿಯರೇಜ್ ಅನ್ನು ಹೇಗೆ ಹೊಂದಿಸುತ್ತೀರಿ ಎಂಬುದನ್ನು ವಿವರಿಸಿ.',
      questionHi: '6mm इलेक्ट्रोड के लिए एम्पीयर सेट करने का तरीका बताइए।',
      difficultyLevel: 2,
    },
  ],
};

// Default fallback for trades without dedicated questions
INTERVIEW_QUESTIONS.default = INTERVIEW_QUESTIONS.Electrician;

export const ADMIN_USERS = [
  {
    id: 'adm_001',
    name: 'Anil Kulkarni',
    email: 'admin@edcs.kar.gov.in',
    password: 'admin123',
    district: 'Bengaluru Urban',
    role: 'admin',
  },
  {
    id: 'adm_002',
    name: 'Sushma Patil',
    email: 'reviewer@edcs.kar.gov.in',
    password: 'review123',
    district: 'Mysuru',
    role: 'reviewer',
  },
  {
    id: 'adm_003',
    name: 'Rajesh Hegde',
    email: 'admin2@edcs.kar.gov.in',
    password: 'admin123',
    district: 'Dharwad',
    role: 'admin',
  },
];

const districtBreakdown = KARNATAKA_DISTRICTS.reduce((acc, d) => {
  acc[d] = CANDIDATES.filter((c) => c.district === d).length;
  return acc;
}, {});

const dailyIntake = Array.from({ length: 7 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: date.toISOString().split('T')[0],
    label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
    count: 12 + Math.floor(Math.sin(i * 1.3) * 6) + (i === 6 ? 4 : 0) + 8,
  };
});

const fitmentDistribution = FITMENT_CATEGORIES.map((category) => ({
  category,
  count: CANDIDATES.filter((c) => c.fitmentCategory === category).length,
}));

const languageDistribution = LANGUAGES.map((lang) => ({
  language: lang,
  count: CANDIDATES.filter((c) => c.language === lang).length,
}));

export const ANALYTICS = {
  totalCandidates: CANDIDATES.length,
  jobReadyCount: CANDIDATES.filter((c) => c.fitmentCategory === 'job_ready').length,
  flaggedCount: CANDIDATES.filter((c) => c.fitmentCategory === 'suspected_fraud').length,
  processedToday: dailyIntake[dailyIntake.length - 1].count,
  districtBreakdown,
  dailyIntake,
  fitmentDistribution,
  languageDistribution,
};

// Pre-shortlisted IDs (seeded into zustand on first load) — pick 3 job_ready candidates
export const SEEDED_SHORTLIST = CANDIDATES
  .filter((c) => c.fitmentCategory === 'job_ready')
  .slice(0, 3)
  .map((c) => c.id);
