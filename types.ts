
import type { User as FirebaseUser } from "firebase/auth";

export type AppUser = FirebaseUser | null;

export type InterviewType = "Technical" | "HR";
export type Difficulty = "easy" | "medium" | "hard";

export interface Feedback {
  score: number;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  difficultyNext: Difficulty;
}

export interface QuestionAndAnswer {
  question: string;
  answer: string;
  feedback?: Feedback;
}

export interface InterviewConfig {
    jobRole: string;
    interviewType: InterviewType;
}

export interface InterviewSession {
    id?: string;
    userId: string;
    config: InterviewConfig;
    questionsAndAnswers: QuestionAndAnswer[];
    overallScore: number;
    completedAt: Date;
}
