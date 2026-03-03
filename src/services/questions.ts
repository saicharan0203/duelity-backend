// src/services/questions.ts
import { Question } from '../types';

// Pre-seeded question bank — free, no OpenAI needed
// Add more questions here to increase variety

const EASY: Question[] = [
  { question: 'What is 15 × 8?', options: ['100', '120', '110', '130'], answer: '120' },
  { question: 'What is 25% of 200?', options: ['40', '50', '60', '25'], answer: '50' },
  { question: 'Solve: x + 14 = 31', options: ['17', '15', '18', '16'], answer: '17' },
  { question: 'What is 72 ÷ 9?', options: ['6', '7', '8', '9'], answer: '8' },
  { question: 'What is 13 × 7?', options: ['81', '91', '101', '71'], answer: '91' },
  { question: 'What is 30% of 150?', options: ['40', '45', '50', '35'], answer: '45' },
  { question: 'Solve: 2x = 24', options: ['10', '11', '12', '13'], answer: '12' },
  { question: 'What is 9²?', options: ['72', '81', '90', '63'], answer: '81' },
  { question: 'What is 144 ÷ 12?', options: ['10', '11', '12', '13'], answer: '12' },
  { question: 'What is 50% of 340?', options: ['160', '170', '180', '150'], answer: '170' },
  { question: 'Solve: x − 9 = 15', options: ['22', '23', '24', '25'], answer: '24' },
  { question: 'What is 6 × 11?', options: ['56', '66', '76', '46'], answer: '66' },
  { question: 'What is 18 ÷ 3?', options: ['5', '6', '7', '8'], answer: '6' },
  { question: 'What is 10% of 250?', options: ['15', '20', '25', '30'], answer: '25' },
  { question: 'Solve: x + 7 = 19', options: ['10', '11', '12', '13'], answer: '12' },
  { question: 'What is 8 × 9?', options: ['64', '72', '81', '96'], answer: '72' },
  { question: 'What is 3/5 of 50?', options: ['20', '25', '30', '35'], answer: '30' },
  { question: 'What is 7²?', options: ['42', '47', '49', '56'], answer: '49' },
  { question: 'What is 1/4 of 64?', options: ['12', '14', '16', '18'], answer: '16' },
  { question: 'Solve: 5x = 45', options: ['7', '8', '9', '10'], answer: '9' },
];

const MEDIUM: Question[] = [
  { question: 'What is √144?', options: ['11', '14', '12', '13'], answer: '12' },
  { question: 'If 3x − 7 = 14, what is x?', options: ['5', '7', '9', '3'], answer: '7' },
  { question: 'What is 12² − 5²?', options: ['109', '119', '99', '129'], answer: '119' },
  { question: 'What is 15% of 480?', options: ['62', '72', '82', '52'], answer: '72' },
  { question: 'Solve: 4x + 3 = 23', options: ['4', '5', '6', '7'], answer: '5' },
  { question: 'What is 17 × 13?', options: ['211', '221', '231', '201'], answer: '221' },
  { question: 'What is 2⁸?', options: ['128', '256', '512', '64'], answer: '256' },
  { question: 'A car travels 240km in 3hrs. Speed?', options: ['70', '80', '90', '60'], answer: '80' },
  { question: 'What is √225?', options: ['13', '14', '15', '16'], answer: '15' },
  { question: 'Simplify: 3² + 4²', options: ['20', '25', '30', '35'], answer: '25' },
  { question: 'If 5x = 85, x = ?', options: ['15', '16', '17', '18'], answer: '17' },
  { question: 'What is 20% of 650?', options: ['120', '130', '140', '110'], answer: '130' },
  { question: 'What is 18²?', options: ['284', '304', '324', '344'], answer: '324' },
  { question: 'Solve: 7x − 9 = 33', options: ['5', '6', '7', '8'], answer: '6' },
  { question: 'What is 35% of 400?', options: ['120', '130', '140', '150'], answer: '140' },
  { question: 'A train goes 150km in 2.5hrs. Speed?', options: ['50', '55', '60', '65'], answer: '60' },
  { question: 'What is (5/8) of 320?', options: ['180', '190', '200', '210'], answer: '200' },
  { question: 'Simplify: 6³ ÷ 6', options: ['6', '18', '36', '216'], answer: '36' },
  { question: 'If x/3 = 9, x = ?', options: ['18', '21', '24', '27'], answer: '27' },
  { question: 'What is √289?', options: ['15', '16', '17', '18'], answer: '17' },
];

const HARD: Question[] = [
  { question: 'Simplify: (2³ × 2⁴) ÷ 2²', options: ['32', '16', '64', '8'], answer: '32' },
  { question: 'What is 3! + 4!?', options: ['24', '30', '36', '18'], answer: '30' },
  { question: 'Find x: 2x² − 8 = 0', options: ['x=±4', 'x=±2', 'x=±3', 'x=±1'], answer: 'x=±2' },
  { question: 'What is the sum of first 10 natural numbers?', options: ['45', '50', '55', '60'], answer: '55' },
  { question: 'If log₂(x) = 5, what is x?', options: ['16', '32', '64', '10'], answer: '32' },
  { question: 'What is HCF of 48 and 72?', options: ['12', '16', '24', '8'], answer: '24' },
  { question: 'Solve: x² − 5x + 6 = 0, x = ?', options: ['2,3', '1,6', '2,4', '3,4'], answer: '2,3' },
  { question: 'What is 11² − 9²?', options: ['38', '40', '42', '44'], answer: '40' },
  { question: 'A train 200m long passes a pole in 10s. Speed in km/h?', options: ['60', '70', '72', '80'], answer: '72' },
  { question: 'What is LCM of 12 and 18?', options: ['24', '36', '48', '72'], answer: '36' },
  { question: 'Simplify: (a+b)² − (a−b)²', options: ['2ab', '4ab', 'a²+b²', '2a²'], answer: '4ab' },
  { question: 'If x% of 200 = 50, x = ?', options: ['20', '25', '30', '15'], answer: '25' },
  { question: 'Solve: 3x² − 12x = 0, x = ?', options: ['0,2', '0,3', '2,3', '3,4'], answer: '0,4' },
  { question: 'What is the sum of angles in a pentagon?', options: ['360°', '450°', '540°', '720°'], answer: '540°' },
  { question: 'If 2⁴ · 2ˣ = 2⁹, x = ?', options: ['3', '4', '5', '6'], answer: '5' },
  { question: 'A number is increased by 20% and then decreased by 20%. Net change?', options: ['0%', '2% decrease', '4% decrease', '5% decrease'], answer: '4% decrease' },
  { question: 'Solve: (x − 3)/5 = 4', options: ['15', '17', '19', '23'], answer: '23' },
  { question: 'What is the cube root of 512?', options: ['6', '7', '8', '9'], answer: '8' },
  { question: 'Simplify: (1/2 + 1/3)', options: ['5/6', '3/5', '2/5', '4/5'], answer: '5/6' },
  { question: 'If a:b = 2:3 and b:c = 4:5, what is a:c?', options: ['8:15', '3:5', '4:7', '6:5'], answer: '8:15' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getQuestions(count: number = 10, difficulty: 'easy' | 'mixed' | 'hard' = 'mixed'): Question[] {
  let pool: Question[];

  if (difficulty === 'easy') {
    pool = [...EASY];
  } else if (difficulty === 'hard') {
    pool = [...HARD];
  } else {
    // Mixed: roughly 30% easy, 40% medium, 30% hard
    const eCount = Math.round(count * 0.3);
    const mCount = Math.round(count * 0.4);
    const hCount = count - eCount - mCount;
    pool = [
      ...shuffle(EASY).slice(0, eCount),
      ...shuffle(MEDIUM).slice(0, mCount),
      ...shuffle(HARD).slice(0, hCount),
    ];
  }

  return shuffle(pool).slice(0, count);
}

export function getAssessmentQuestions(): Question[] {
  // 10-question mixed set for assessment — sampled to reduce repetition
  return getQuestions(10, 'mixed');
}
