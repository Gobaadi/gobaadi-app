export interface DiseaseInfo {
  subtitle: string;
  paragraphs: string[];
  clinicalSigns: string[];
}

const KNOWLEDGE_BASE: Record<string, DiseaseInfo> = {
  'foot and mouth disease': {
    subtitle: 'Highly contagious viral disease',
    paragraphs: [
      'Foot-and-Mouth Disease (FMD) is a highly contagious viral illness affecting cloven-hoofed livestock like cattle, pigs, and sheep, but it poses absolutely no threat to human health or food safety.',
      'If FMD has been detected in your herd or region, immediate action is required to prevent widespread transmission and massive economic losses.',
    ],
    clinicalSigns: [
      'Fever and reduced appetite',
      'Blisters or raw lesions around the mouth, tongue and hooves',
      'Excessive drooling and reluctance to eat',
      'Lameness, limping or reluctance to walk',
      'Reduced milk yield in dairy cattle',
    ],
  },
  'lumpy skin disease': {
    subtitle: 'Viral disease spread by biting insects',
    paragraphs: [
      'Lumpy Skin Disease (LSD) is a viral illness of cattle that causes firm nodules across the skin and can permanently damage hide and milk production.',
      'The virus spreads through biting flies, ticks and shared equipment, so quick isolation and vector control are the best way to protect the rest of the herd.',
    ],
    clinicalSigns: [
      'Firm round nodules (2–5 cm) on the neck, limbs and udder',
      'Fever, nasal and eye discharge',
      'Swollen lymph nodes',
      'Sudden drop in milk yield',
      'Loss of appetite and weight loss',
    ],
  },
  'bovine tuberculosis': {
    subtitle: 'Slowly progressive chronic bacterial disease',
    paragraphs: [
      'Bovine Tuberculosis (TB) is a chronic bacterial disease that slowly damages the lungs and can remain hidden in a herd for months before obvious signs appear.',
      'Testing and separating positive animals early protects both the herd and your long-term farm income, since advanced cases rarely recover fully.',
    ],
    clinicalSigns: [
      'Persistent dry cough',
      'Gradual weight loss despite normal appetite',
      'Dull coat and reduced milk yield',
      'Swollen lymph nodes',
      'Mild intermittent fever',
    ],
  },
  'dermatophilosis': {
    subtitle: 'Bacterial skin infection worsened by moisture',
    paragraphs: [
      'Dermatophilosis is a bacterial skin infection that appears as crusty, matted patches on the hide, often after heavy rain, humidity or prolonged wet housing.',
      'It is treatable with timely care, but untreated lesions can become infected by flies and lead to permanent hide damage.',
    ],
    clinicalSigns: [
      'Crusted, scabbed patches that mat the hair or hide',
      'Painful skin lesions, often on the back and neck',
      'Mild fever and stiffness',
      'Skin swelling under the crusts',
      'Reluctance to move or be handled',
    ],
  },
  healthy: {
    subtitle: 'No signs of disease detected',
    paragraphs: [
      'The analysis found no visible signs of disease or nutrient deficiency in the submitted photo. The animal appears healthy based on what the AI could observe.',
      'Continue routine checks, vaccination and balanced nutrition. Re-scan immediately if new symptoms such as fever, lesions or reduced appetite appear.',
    ],
    clinicalSigns: [],
  },
  'healthy undetermined': {
    subtitle: 'No clear condition could be determined',
    paragraphs: [
      'The analysis was unable to identify a specific condition from the information provided. This does not guarantee the animal is completely healthy.',
      'Re-scan with clearer, well-lit photos of the affected area, or describe the symptoms you have observed, then consult a veterinarian if signs persist.',
    ],
    clinicalSigns: [],
  },
};

const GENERIC: DiseaseInfo = {
  subtitle: 'AI-detected condition',
  paragraphs: [
    'The AI analysis identified this condition from the photo and reported symptoms. Match the guidance below with what you observe on the animal.',
    'Isolate the animal if the condition looks contagious, and contact a veterinarian promptly if symptoms worsen or spread to the rest of the herd.',
  ],
  clinicalSigns: [],
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDiseaseInfo(analysisResult?: string): DiseaseInfo {
  if (!analysisResult) return GENERIC;

  const key = normalize(analysisResult);

  if (KNOWLEDGE_BASE[key]) return KNOWLEDGE_BASE[key];

  for (const [entryKey, info] of Object.entries(KNOWLEDGE_BASE)) {
    if (key.includes(entryKey) || entryKey.includes(key)) return info;
  }

  return GENERIC;
}
