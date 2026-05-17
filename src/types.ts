export enum Phase {
  LANDING = 'LANDING',
  CONTEXT = 'CONTEXT',
  INTERVIEW = 'INTERVIEW',
  LOADING_REPORT = 'LOADING_REPORT',
  REPORT = 'REPORT',
  PRICING = 'PRICING',
  PRO_DASHBOARD = 'PRO_DASHBOARD'
}

export interface CandidateContext {
  goal: string;
  level: string;
  education: string;
  confidence: string;
  struggle: string;
  interviewType: string;
}

export interface InterviewMessage {
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp: number;
}

export interface SkillSynthReport {
  hireabilityScore: number;
  skillRatings: {
    communication: number;
    confidence: number;
    clarity: number;
    fluency: number;
    problemSolving: number;
    leadership: number;
    adaptability: number;
  };
  personalityTag: string;
  emotionalIntelligence: string;
  stressHandling: string;
  strengths: string[];
  weaknesses: string[];
  roleFitAnalysis: string;
  improvementPlan: string[];
  competencyBreakdown: {
    technical: number;
    behavioral: number;
    situational: number;
    communication: number;
  };
  detailedAISuggestions: {
    title: string;
    description: string;
    actionItems: string[];
    resources?: {
      title: string;
      url: string;
    }[];
  }[];
}
