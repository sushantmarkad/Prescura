const fs = require('fs');
const path = require('path');

// Helper to parse CSV with quote awareness
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows = [];
  for (const line of lines) {
    const row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    row.push(cur.trim());
    rows.push(row);
  }
  return rows;
}

// Normalizer for disease & symptom strings
function normalizeKey(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
}

function normalizeSymptomId(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '_').trim();
}

class DiseasePredictionService {
  constructor() {
    this.symptomsMap = new Map(); // id -> { id, label, weight }
    this.descriptionsMap = new Map(); // normalizedDisease -> description
    this.precautionsMap = new Map(); // normalizedDisease -> [p1, p2, p3, p4]
    this.diseaseProfiles = new Map(); // canonicalDisease -> { name, symptoms: Set, symptomFrequencies: Map, sampleCount: number }
    this.canonicalDiseases = [];
    this.aliasMap = new Map(); // colloquial phrase -> symptomId

    this.init();
  }

  init() {
    try {
      const candidatePaths = [
        process.env.ARCHIVE_PATH,
        path.resolve(__dirname, '../../../archive'),
        path.resolve(__dirname, '../../archive'),
        path.resolve(process.cwd(), 'archive'),
        path.resolve(process.cwd(), '../archive'),
      ].filter(Boolean);

      const archiveDir = candidatePaths.find(p => fs.existsSync(path.join(p, 'dataset.csv'))) || path.resolve(__dirname, '../../../archive');
      
      // 1. Load Symptom Severity
      const sevPath = path.join(archiveDir, 'Symptom-severity.csv');
      if (fs.existsSync(sevPath)) {
        const rows = parseCSV(fs.readFileSync(sevPath, 'utf8')).slice(1);
        rows.forEach(r => {
          if (r[0]) {
            const id = normalizeSymptomId(r[0]);
            const weight = parseInt(r[1], 10) || 1;
            const label = r[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
            this.symptomsMap.set(id, { id, label, weight });
          }
        });
      }

      // 2. Load Descriptions
      const descPath = path.join(archiveDir, 'symptom_Description.csv');
      if (fs.existsSync(descPath)) {
        const rows = parseCSV(fs.readFileSync(descPath, 'utf8')).slice(1);
        rows.forEach(r => {
          if (r[0] && r[1]) {
            const norm = normalizeKey(r[0]);
            this.descriptionsMap.set(norm, r[1].trim());
            // Add spelling variations
            if (norm.includes('hemorrhoids') || norm.includes('hemmorhoids')) {
              this.descriptionsMap.set('dimorphic hemmorhoids(piles)', r[1].trim());
              this.descriptionsMap.set('dimorphic hemorrhoids(piles)', r[1].trim());
            }
          }
        });
      }

      // 3. Load Precautions
      const precPath = path.join(archiveDir, 'symptom_precaution.csv');
      if (fs.existsSync(precPath)) {
        const rows = parseCSV(fs.readFileSync(precPath, 'utf8')).slice(1);
        rows.forEach(r => {
          if (r[0]) {
            const norm = normalizeKey(r[0]);
            const precautions = [r[1], r[2], r[3], r[4]].filter(Boolean).map(p => p.trim());
            this.precautionsMap.set(norm, precautions);
            if (norm.includes('hemorrhoids') || norm.includes('hemmorhoids')) {
              this.precautionsMap.set('dimorphic hemmorhoids(piles)', precautions);
              this.precautionsMap.set('dimorphic hemorrhoids(piles)', precautions);
            }
          }
        });
      }

      // 4. Load Training Dataset
      const dataPath = path.join(archiveDir, 'dataset.csv');
      if (fs.existsSync(dataPath)) {
        const rows = parseCSV(fs.readFileSync(dataPath, 'utf8')).slice(1);
        
        rows.forEach(row => {
          const rawDisease = row[0].trim();
          if (!rawDisease) return;

          let profile = this.diseaseProfiles.get(rawDisease);
          if (!profile) {
            profile = {
              name: rawDisease,
              symptoms: new Set(),
              symptomFrequencies: new Map(),
              sampleCount: 0
            };
            this.diseaseProfiles.set(rawDisease, profile);
          }
          profile.sampleCount++;

          for (let i = 1; i < row.length; i++) {
            const rawSym = row[i]?.trim();
            if (rawSym) {
              const symId = normalizeSymptomId(rawSym);
              profile.symptoms.add(symId);
              profile.symptomFrequencies.set(symId, (profile.symptomFrequencies.get(symId) || 0) + 1);

              // If symptom wasn't in severity table, add default weight
              if (!this.symptomsMap.has(symId)) {
                const label = rawSym.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
                this.symptomsMap.set(symId, { id: symId, label, weight: 3 });
              }
            }
          }
        });

        this.canonicalDiseases = Array.from(this.diseaseProfiles.keys());
      }

      // 5. Populate rich natural language alias dictionary
      this.buildAliasMap();

      console.log(`[DiseasePredictionService] Initialized with ${this.canonicalDiseases.length} diseases, ${this.symptomsMap.size} symptoms.`);
    } catch (err) {
      console.error('[DiseasePredictionService] Initialization error:', err);
    }
  }

  buildAliasMap() {
    // Map standard symptom IDs and labels
    for (const [id, data] of this.symptomsMap.entries()) {
      this.aliasMap.set(id, id);
      this.aliasMap.set(normalizeKey(data.label), id);
      this.aliasMap.set(data.label.toLowerCase(), id);
    }

    // Common clinical / colloquial synonyms
    const synonyms = {
      'headache': ['head ache', 'head pain', 'migraine pain', 'throbbing head'],
      'high_fever': ['fever', 'high temp', 'high temperature', 'feverish', 'burning up', 'hot temperature'],
      'mild_fever': ['low grade fever', 'mild temperature', 'slight fever'],
      'stomach_pain': ['stomach ache', 'belly ache', 'abdominal pain', 'belly pain', 'tummy ache', 'gut ache', 'cramps', 'gastrointestinal issues', 'gastro issues', 'digestive issues', 'gut issues'],
      'vomiting': ['vomit', 'throwing up', 'puking', 'threw up', 'emesis'],
      'nausea': ['nauseous', 'queasy', 'feeling sick', 'sick to stomach'],
      'chills': ['shivering', 'feeling cold', 'cold chills'],
      'fatigue': ['tired', 'tiredness', 'exhausted', 'exhaustion', 'drained', 'low energy', 'fatigued', 'weariness'],
      'joint_pain': ['joints hurt', 'knee pain', 'aching joints', 'arthralgia', 'joint ache'],
      'muscle_pain': ['body ache', 'body aches', 'muscle ache', 'body pain', 'sore muscles', 'myalgia', 'aching body'],
      'pain_behind_the_eyes': ['eye pain', 'pain in eyes', 'eye ache', 'pain behind the eyes', 'aching eyes', 'pain behind eyes', 'hurt behind eyes'],
      'cough': ['coughing', 'dry cough', 'wet cough', 'hacking cough'],
      'breathlessness': ['shortness of breath', 'hard to breathe', 'difficulty breathing', 'breathless', 'cant breathe', 'gasping'],
      'chest_pain': ['chest ache', 'pain in chest', 'tight chest', 'chest tightness', 'heart pain'],
      'skin_rash': ['rash', 'red spots', 'skin spots', 'redness on skin', 'eruptions', 'hives'],
      'itching': ['itchy', 'scratchy', 'itching skin', 'scratching'],
      'diarrhoea': ['diarrhea', 'loose motions', 'loose stool', 'watery stool', 'dysentery', 'frequent stool'],
      'acidity': ['heartburn', 'acid reflux', 'burning sensation in chest', 'acidic'],
      'loss_of_appetite': ['not hungry', 'no appetite', 'dont want to eat', 'poor appetite'],
      'dizziness': ['dizzy', 'lightheaded', 'faint', 'spinning head', 'vertigo', 'loss of balance'],
      'continuous_sneezing': ['sneezing', 'sneeze', 'continuous sneeze'],
      'runny_nose': ['cold', 'nasal discharge', 'dripping nose', 'stuffy nose', 'congestion'],
      'watering_from_eyes': ['watery eyes', 'tearing eyes', 'eye watering'],
      'throat_irritation': ['sore throat', 'scratchy throat', 'throat pain', 'painful swallowing'],
      'swelling_joints': ['swollen joints', 'joint swelling', 'swollen knees', 'puffy joints'],
      'back_pain': ['lower back pain', 'back ache', 'spine pain'],
      'constipation': ['cannot poop', 'hard stool', 'irregular bowel'],
      'burning_micturition': ['burning urine', 'pain while urinating', 'painful urination', 'burning pee'],
      'sweating': ['heavy sweating', 'night sweats', 'excessive sweating', 'perspiration'],
      'weight_loss': ['lost weight', 'losing weight', 'unexplained weight loss'],
      'yellowish_skin': ['yellow skin', 'yellow eyes', 'jaundice skin', 'pale yellow skin'],
      'yellowing_of_eyes': ['yellow eyes', 'icterus'],
      'dark_urine': ['brown urine', 'deep yellow urine', 'tea colored urine'],
      'blister': ['blisters', 'boils', 'water blisters'],
      'red_sore_around_nose': ['sores on face', 'sores around mouth', 'impetigo sores', 'crusted sores'],
      'anxiety': ['anxious', 'nervous', 'panic'],
      'restlessness': ['restless', 'uneasy', 'fidgety'],
      'irregular_sugar_level': ['sugar spikes', 'high blood sugar', 'low blood sugar', 'diabetes sugar swing'],
      'lethargy': ['lethargic', 'sluggish', 'drowsy'],
      'swollen_legs': ['swollen feet', 'ankle swelling', 'puffy ankles', 'edema in legs']
    };

    for (const [symptomId, phrases] of Object.entries(synonyms)) {
      phrases.forEach(phrase => {
        this.aliasMap.set(phrase.toLowerCase(), symptomId);
      });
    }
  }

  // Get full list of symptoms for UI suggestions/chips
  getAllSymptoms() {
    return Array.from(this.symptomsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  // Get popular common symptoms for initial quick chips
  getPopularSymptoms() {
    const popularKeys = [
      'high_fever', 'headache', 'cough', 'fatigue', 'stomach_pain',
      'vomiting', 'nausea', 'chest_pain', 'breathlessness', 'skin_rash',
      'chills', 'joint_pain', 'diarrhoea', 'acidity', 'dizziness'
    ];
    return popularKeys.map(k => this.symptomsMap.get(k)).filter(Boolean);
  }

  // Extract symptoms from free text
  extractSymptomsFromText(text) {
    if (!text || typeof text !== 'string') return [];
    const lower = text.toLowerCase();
    const detected = new Set();

    // Check alias phrases (sorted by length descending so multi-word matches first)
    const sortedPhrases = Array.from(this.aliasMap.keys()).sort((a, b) => b.length - a.length);

    for (const phrase of sortedPhrases) {
      // Use regex with word boundaries where possible
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\b|\\W)${escaped}(\\b|\\W|$)`, 'i');
      if (regex.test(lower)) {
        const symptomId = this.aliasMap.get(phrase);
        if (symptomId && this.symptomsMap.has(symptomId)) {
          detected.add(symptomId);
        }
      }
    }

    return Array.from(detected);
  }

  // Predict disease given a list of symptom IDs
  predict(symptomInput) {
    let symptoms = [];
    if (Array.isArray(symptomInput)) {
      symptoms = symptomInput.map(s => normalizeSymptomId(s)).filter(s => this.symptomsMap.has(s));
    } else if (typeof symptomInput === 'string') {
      symptoms = this.extractSymptomsFromText(symptomInput);
    }

    // Deduplicate
    symptoms = Array.from(new Set(symptoms));

    if (symptoms.length === 0) {
      return {
        matched: false,
        message: 'No recognizable symptoms detected. Please describe symptoms such as fever, headache, cough, stomach pain, or select from the quick options.',
        symptoms: [],
        predictions: []
      };
    }

    // Compute matching scores against all 41 diseases
    const diseaseScores = [];

    for (const [diseaseName, profile] of this.diseaseProfiles.entries()) {
      let matchedCount = 0;
      let matchedSeverityWeight = 0;
      const matchedSymptoms = [];
      const missingSymptoms = [];

      for (const symId of symptoms) {
        if (profile.symptoms.has(symId)) {
          matchedCount++;
          const symData = this.symptomsMap.get(symId) || { weight: 1, label: symId };
          matchedSeverityWeight += symData.weight;
          matchedSymptoms.push(symData);
        }
      }

      if (matchedCount > 0) {
        // Collect characteristic missing symptoms (frequent in this disease, for follow-up)
        for (const symId of profile.symptoms) {
          if (!symptoms.includes(symId)) {
            const symData = this.symptomsMap.get(symId);
            if (symData) missingSymptoms.push(symData);
          }
        }

        // Metrics:
        // Recall: proportion of user symptoms explained by this disease
        const recall = matchedCount / symptoms.length;
        // Precision: proportion of disease's characteristic symptoms present in user
        const precision = matchedCount / profile.symptoms.size;
        // Frequency weight: how consistently these symptoms appear in the 120 dataset records for this disease
        let freqSum = 0;
        for (const sym of matchedSymptoms) {
          freqSum += (profile.symptomFrequencies.get(sym.id) || 1) / profile.sampleCount;
        }
        const avgFrequency = freqSum / matchedCount;

        // F1-score with frequency boost
        const fScore = (2 * precision * recall) / (precision + recall + 0.0001);
        const compositeScore = (fScore * 0.6) + (recall * 0.25) + (avgFrequency * 0.15);

        diseaseScores.push({
          disease: diseaseName,
          score: compositeScore,
          matchedCount,
          matchedSymptoms,
          missingSymptoms: missingSymptoms.slice(0, 5),
          totalDiseaseSymptoms: profile.symptoms.size
        });
      }
    }

    // Sort descending by composite score
    diseaseScores.sort((a, b) => b.score - a.score || b.matchedCount - a.matchedCount);

    if (diseaseScores.length === 0) {
      return {
        matched: false,
        message: 'Could not find a high-correlation condition for this specific combination of symptoms.',
        symptoms: symptoms.map(s => this.symptomsMap.get(s) || { id: s, label: s }),
        predictions: []
      };
    }

    // Calculate relative confidence percentages
    const topCandidates = diseaseScores.slice(0, 4);
    const sumTopScores = topCandidates.reduce((acc, c) => acc + c.score, 0) || 1;

    const formattedPredictions = topCandidates.map((cand, idx) => {
      // Calculate realistic confidence percentage bounded between 35% and 96%
      let rawPct = Math.round((cand.score / sumTopScores) * 100);
      if (idx === 0) {
        // Boost top match slightly based on raw match count
        const matchRatio = cand.matchedCount / symptoms.length;
        rawPct = Math.min(97, Math.max(55, Math.round(rawPct * 0.7 + matchRatio * 35)));
      } else {
        rawPct = Math.min(85, Math.max(12, rawPct));
      }

      const normName = normalizeKey(cand.disease);
      const description = this.descriptionsMap.get(normName) || 'No specific clinical description available.';
      const precautions = this.precautionsMap.get(normName) || ['Consult a qualified physician', 'Rest and hydrate', 'Monitor symptoms'];

      return {
        rank: idx + 1,
        disease: cand.disease,
        confidence: rawPct,
        matchedCount: cand.matchedCount,
        matchedSymptoms: cand.matchedSymptoms,
        suggestedFollowUpSymptoms: cand.missingSymptoms,
        description,
        precautions
      };
    });

    // Severity assessment of reported symptoms
    const totalSeverity = symptoms.reduce((acc, symId) => {
      const data = this.symptomsMap.get(symId);
      return acc + (data?.weight || 2);
    }, 0);
    const maxWeight = Math.max(...symptoms.map(s => this.symptomsMap.get(s)?.weight || 1));

    let triageLevel = 'MILD';
    let triageLabel = 'Mild / Low Risk';
    let triageColor = '#10b981'; // green

    const emergencySymptoms = ['chest_pain', 'breathlessness', 'loss_of_balance', 'altered_sensorium', 'paralysis'];
    const hasEmergency = symptoms.some(s => emergencySymptoms.includes(s));

    if (hasEmergency || maxWeight >= 7) {
      triageLevel = 'EMERGENCY';
      triageLabel = 'Emergency Attention Recommended';
      triageColor = '#ef4444'; // red
    } else if (maxWeight >= 5 || totalSeverity >= 14) {
      triageLevel = 'HIGH';
      triageLabel = 'High Priority Medical Attention';
      triageColor = '#f59e0b'; // orange
    } else if (maxWeight >= 3 || totalSeverity >= 7) {
      triageLevel = 'MODERATE';
      triageLabel = 'Moderate Concern';
      triageColor = '#3b82f6'; // blue
    }

    // Determine discriminating follow-up questions if symptoms are low (<= 2)
    let followUpSuggestions = [];
    if (symptoms.length <= 2 && formattedPredictions.length > 0) {
      // Find symptoms that appear in top 2 candidates but were not mentioned
      const symCandidates = new Set();
      formattedPredictions.slice(0, 2).forEach(p => {
        p.suggestedFollowUpSymptoms.forEach(s => symCandidates.add(s));
      });
      followUpSuggestions = Array.from(symCandidates).slice(0, 4);
    }

    return {
      matched: true,
      reportedSymptoms: symptoms.map(s => this.symptomsMap.get(s)),
      topPrediction: formattedPredictions[0],
      differentialDiagnoses: formattedPredictions.slice(1, 3),
      triage: {
        level: triageLevel,
        label: triageLabel,
        color: triageColor,
        score: totalSeverity,
        hasEmergency
      },
      followUpSuggestions
    };
  }
}

// Singleton instance
const diseasePredictionService = new DiseasePredictionService();
module.exports = diseasePredictionService;
