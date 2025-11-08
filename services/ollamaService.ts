
import type { Difficulty, InterviewType, Feedback } from "../types";

const OLLAMA_BASE_URL = "http://localhost:11434/v1";
const OLLAMA_MODEL_TAG = "llama3:latest";
const DUMMY_API_KEY = "ollama";

export const generateQuestion = async (
    jobRole: string,
    interviewType: InterviewType,
    difficulty: Difficulty,
    questionNumber: number
): Promise<string> => {
    const systemPrompt = "You are an expert interviewer. Your task is to generate a single interview question. Provide only the raw text of the question, without any labels like 'Question:', numbering, or conversational filler.";
    
    const userPrompt = `Generate one ${difficulty} level ${interviewType} interview question for a "${jobRole}" position. This is question number ${questionNumber} in the interview.`;

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DUMMY_API_KEY}`
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL_TAG,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 150,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        const questionText = data.choices[0]?.message?.content?.trim();
        
        if (!questionText) {
            throw new Error("Received an empty question from the AI.");
        }
        
        return questionText.replace(/^"|"$/g, '').replace(/\*+/g, '');

    } catch (error) {
        console.error("Error generating question:", error);
        return "Sorry, I couldn't generate a question right now. Please check if your local Ollama server is running and accessible.";
    }
};

export const evaluateAnswer = async (
    question: string,
    userAnswer: string,
    difficulty: Difficulty
): Promise<Feedback> => {
    const systemPrompt = `You are a fair but critical interview evaluator. Your task is to analyze an interview answer and provide structured feedback in a strict JSON format. Do not include any text outside of the JSON object.`;

    const userPrompt = `
        Question: "${question}"
        Candidate's Answer: "${userAnswer}"
        Current Difficulty: "${difficulty}"

        Evaluate the answer on a scale of 0-10. Based on this score, determine the next question's difficulty. 
        - If score >= 8, increase difficulty (e.g., medium -> hard).
        - If score <= 4, decrease difficulty (e.g., medium -> easy).
        - Otherwise, keep the difficulty the same.
        - Difficulty cannot go below 'easy' or above 'hard'.

        Provide concise, constructive feedback. Return a single, valid JSON object with these exact keys: "score" (number), "strengths" (string), "weaknesses" (string), "suggestions" (string), "difficultyNext" (string: 'easy'|'medium'|'hard').
    `;

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DUMMY_API_KEY}`
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL_TAG,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.5,
                max_tokens: 500,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        let feedbackJsonString = data.choices[0]?.message?.content?.trim();
        
        if (feedbackJsonString.startsWith("```json")) {
            feedbackJsonString = feedbackJsonString.substring(7, feedbackJsonString.length - 3).trim();
        }
        
        const feedback: Feedback = JSON.parse(feedbackJsonString);

        if (typeof feedback.score !== 'number' || !feedback.difficultyNext) {
             throw new Error("Invalid feedback structure from AI.");
        }

        return feedback;
    } catch (error) {
        console.error("Error evaluating answer:", error);
        return {
            score: 0,
            strengths: "Could not evaluate.",
            weaknesses: "There was an error communicating with the AI evaluation service.",
            suggestions: "Please ensure your local Ollama server is running and accessible, then try again.",
            difficultyNext: difficulty,
        };
    }
};
