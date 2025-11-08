import { GoogleGenAI, Type } from "@google/genai";
import type { Difficulty, InterviewType, Feedback } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuestion = async (
    jobRole: string,
    interviewType: InterviewType,
    difficulty: Difficulty,
    questionNumber: number
): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "You are an expert interviewer. Your task is to generate a single interview question. Provide only the raw text of the question, without any labels like 'Question:', numbering, or conversational filler.";
    const contents = `Generate one ${difficulty} level ${interviewType} interview question for a "${jobRole}" position. This is question number ${questionNumber} in the interview.`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                systemInstruction,
                temperature: 0.8,
                maxOutputTokens: 150,
            }
        });

        const questionText = response.text?.trim();
        
        if (!questionText) {
            throw new Error("Received an empty question from the AI.");
        }
        
        return questionText.replace(/^"|"$/g, '').replace(/\*+/g, '');

    } catch (error) {
        console.error("Error generating question:", error);
        return "Sorry, I couldn't generate a question right now. Please check your Gemini API key and try again.";
    }
};

export const evaluateAnswer = async (
    question: string,
    userAnswer: string,
    difficulty: Difficulty
): Promise<Feedback> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `You are a fair but critical interview evaluator. Your task is to analyze an interview answer and provide structured feedback.`;
    const contents = `
        Question: "${question}"
        Candidate's Answer: "${userAnswer}"
        Current Difficulty: "${difficulty}"

        Evaluate the answer on a scale of 0-10. Based on this score, determine the next question's difficulty. 
        - If score >= 8, increase difficulty (e.g., medium -> hard).
        - If score <= 4, decrease difficulty (e.g., medium -> easy).
        - Otherwise, keep the difficulty the same.
        - Difficulty cannot go below 'easy' or above 'hard'.

        Provide concise, constructive feedback.
    `;
    const schema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.NUMBER, description: "Score from 0-10 for the answer." },
            strengths: { type: Type.STRING, description: "Concise summary of strengths." },
            weaknesses: { type: Type.STRING, description: "Concise summary of weaknesses." },
            suggestions: { type: Type.STRING, description: "Concise suggestions for improvement." },
            difficultyNext: { 
                type: Type.STRING,
                description: "Difficulty for the next question. Must be one of 'easy', 'medium', or 'hard'."
            },
        },
        required: ['score', 'strengths', 'weaknesses', 'suggestions', 'difficultyNext'],
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                systemInstruction,
                temperature: 0.5,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        const feedbackJsonString = response.text.trim();
        const feedback: Feedback = JSON.parse(feedbackJsonString);

        if (typeof feedback.score !== 'number' || !['easy', 'medium', 'hard'].includes(feedback.difficultyNext)) {
             throw new Error("Invalid feedback structure from AI.");
        }

        return feedback;
    } catch (error) {
        console.error("Error evaluating answer:", error);
        return {
            score: 0,
            strengths: "Could not evaluate.",
            weaknesses: "There was an error communicating with the Gemini API.",
            suggestions: "Please check your Gemini API key and try again.",
            difficultyNext: difficulty,
        };
    }
};
