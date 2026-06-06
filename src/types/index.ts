export interface RepositoryMeta {
  name: string;
  fullName: string;
  owner: string;
  ownerAvatar: string;
  description: string | null;
  stars: number;
  forks: number;
  languagesUrl: string;
  htmlUrl: string;
  primaryLanguage: string | null;
}

export interface EngineeringReview {
  engineeringScore: number;
  subscores: {
    architecture: number;
    maintainability: number;
    scalability: number;
    codeOrganization: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface DocumentationAudit {
  documentationScore: number;
  presentSections: string[];
  missingSections: string[];
  recommendations: string[];
}

export interface ResumeGenerator {
  bullets: string[];
}

export interface InterviewQuestion {
  id: string;
  category: 'Technical Questions' | 'Project-Specific Questions' | 'Deep-Dive Follow-Up Questions';
  question: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  suggestedTalkingPoints: string[];
}

export interface InterviewPrep {
  questions: InterviewQuestion[];
}

export interface EmployabilityScore {
  overallEmployabilityScore: number;
  subscores: {
    technicalDepth: number;
    documentationQuality: number;
    portfolioPresentation: number;
    projectComplexity: number;
    professionalReadiness: number;
  };
  strengths: string[];
  improvementAreas: string[];
}

export interface RoadmapTask {
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  actionableSteps: string[];
  timeline: string;
  expectedOutcome: string;
}

export interface RoadmapGenerator {
  tasks: RoadmapTask[];
}

export interface RecruiterSnapshot {
  recommendedRoles: string[];
  technicalMaturity: 'Beginner' | 'Intermediate' | 'Advanced';
  strongestSkills: string[];
}

export interface AnalysisReport {
  repository: RepositoryMeta;
  analysis: {
    engineeringReview: EngineeringReview;
    documentationAudit: DocumentationAudit;
    resumeGenerator: ResumeGenerator;
    interviewPrep: InterviewPrep;
    employabilityScore: EmployabilityScore;
    roadmapGenerator: RoadmapGenerator;
    recruiterSnapshot: RecruiterSnapshot;
  };
}
