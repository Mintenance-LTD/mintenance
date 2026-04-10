// Query Keys for React Query
export const SUSTAINABILITY_KEYS = {
  all: ['sustainability'] as const,
  esgScore: (contractorId: string) =>
    ['sustainability', 'esg', contractorId] as const,
  jobAnalysis: (jobId: string) => ['sustainability', 'job', jobId] as const,
  materialAlternatives: (materials: string[]) =>
    ['sustainability', 'materials', materials] as const,
  carbonFootprint: (jobDetails: unknown) =>
    ['sustainability', 'carbon', jobDetails] as const,
  ranking: (location: string, category?: string) =>
    ['sustainability', 'ranking', location, category] as const,
  progress: (contractorId: string, timeframe: string) =>
    ['sustainability', 'progress', contractorId, timeframe] as const,
};

// Gamification achievements & badges
export const SUSTAINABILITY_ACHIEVEMENTS = [
  {
    id: 'carbon_reducer',
    title: 'Carbon Reducer',
    description: 'Reduce carbon footprint by 50kg in a month',
    icon: '🌱',
    progress: 0,
    target: 50,
    unlocked: false,
  },
  {
    id: 'waste_warrior',
    title: 'Waste Warrior',
    description: 'Achieve 80% waste diversion rate',
    icon: '♻️',
    progress: 0,
    target: 80,
    unlocked: false,
  },
  {
    id: 'green_champion',
    title: 'Green Champion',
    description: 'Complete 10 jobs with ESG score above 80',
    icon: '🏆',
    progress: 0,
    target: 10,
    unlocked: false,
  },
  {
    id: 'renewable_advocate',
    title: 'Renewable Advocate',
    description: 'Use 100% renewable energy sources',
    icon: '⚡',
    progress: 0,
    target: 100,
    unlocked: false,
  },
];

export const SUSTAINABILITY_BADGES = [
  { level: 'bronze', threshold: 60, color: '#CD7F32', icon: '🥉' },
  { level: 'silver', threshold: 70, color: '#C0C0C0', icon: '🥈' },
  { level: 'gold', threshold: 80, color: '#FFD700', icon: '🥇' },
  { level: 'platinum', threshold: 90, color: '#E5E4E2', icon: '🏆' },
];
