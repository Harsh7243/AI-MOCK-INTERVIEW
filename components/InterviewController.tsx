import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { saveInterviewSession } from '../services/firebase';
import { generateQuestion, evaluateAnswer } from '../services/ollamaService';
import type { InterviewConfig, InterviewType, Difficulty, QuestionAndAnswer, InterviewSession } from '../types';
import { useSpeech } from '../hooks/useSpeechRecognition';
import { MicIcon, StopIcon, BrainCircuitIcon } from './icons';

const TOTAL_QUESTIONS = 5;
const TIMER_SECONDS: Record<Difficulty, number> = { easy: 40, medium: 35, hard: 30 };

const LoadingIndicator = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
        <BrainCircuitIcon className="w-16 h-16 text-cyan-400 animate-pulse mb-4" />
        <p className="text-xl text-gray-300">{text}</p>
    </div>
);

const ProgressBar = ({ current, total }: { current: number, total: number }) => {
    const percentage = (current / total) * 100;
    return (
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
            <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

export const InterviewController = ({ user }: { user: User }) => {
    const [pageState, setPageState] = useState<'setup' | 'session' | 'results'>('setup');
    const [config, setConfig] = useState<InterviewConfig>({ jobRole: '', interviewType: 'Technical' });
    const [sessionData, setSessionData] = useState<QuestionAndAnswer[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('medium');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [timer, setTimer] = useState(0);
    // FIX: The return type of `setTimeout` in a browser environment is `number`, not `NodeJS.Timeout`.
    const timerRef = useRef<number | null>(null);

    const { isListening, transcript, startListening, stopListening, speak, isApiSupported, setTranscript } = useSpeech();
    
    const handleNextQuestion = async () => {
        stopListening();
        if (timerRef.current) clearTimeout(timerRef.current);
        setTimer(0);
        setIsLoading(true);
        setLoadingText("Evaluating your answer and preparing the next question...");

        const currentQnA = sessionData[currentQuestionIndex];
        const updatedQnA = { ...currentQnA, answer: transcript || "No answer provided." };
        
        const feedback = await evaluateAnswer(updatedQnA.question, updatedQnA.answer, currentDifficulty);
        updatedQnA.feedback = feedback;

        const updatedSessionData = [...sessionData];
        updatedSessionData[currentQuestionIndex] = updatedQnA;
        setSessionData(updatedSessionData);
        
        setTranscript('');

        if (currentQuestionIndex + 1 >= TOTAL_QUESTIONS) {
            setPageState('results');
            setIsLoading(false);
            return;
        }

        const nextDifficulty = feedback.difficultyNext;
        setCurrentDifficulty(nextDifficulty);
        const nextQuestion = await generateQuestion(config.jobRole, config.interviewType, nextDifficulty, currentQuestionIndex + 2);
        
        setSessionData(prev => [...prev, { question: nextQuestion, answer: '' }]);
        setCurrentQuestionIndex(prev => prev + 1);
        setIsLoading(false);
        
        speak(nextQuestion, () => {
            setTimeout(() => {
                startListening();
                setTimer(TIMER_SECONDS[nextDifficulty]);
            }, 2000);
        });
    };

    useEffect(() => {
        if (timer > 0) {
            timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
        } else if (timer === 0 && pageState === 'session' && !isLoading && sessionData.length > 0 && sessionData.length < TOTAL_QUESTIONS + 1) {
             if(isListening) {
                 handleNextQuestion();
             }
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timer]);

    const fetchAndStartFirstQuestion = async () => {
        setIsLoading(true);
        setLoadingText("Generating your first question...");
        const question = await generateQuestion(config.jobRole, config.interviewType, currentDifficulty, 1);
        setSessionData([{ question, answer: '' }]);
        setIsLoading(false);
        setPageState('session');
        speak(question, () => {
            setTimeout(() => {
                startListening();
                setTimer(TIMER_SECONDS[currentDifficulty]);
            }, 2000);
        });
    };
    
    const handleSaveResults = async () => {
        const overallScore = sessionData.reduce((acc, qna) => acc + (qna.feedback?.score || 0), 0) / sessionData.length;
        const finalSession: InterviewSession = {
            userId: user.uid,
            config: config,
            questionsAndAnswers: sessionData,
            overallScore: parseFloat(overallScore.toFixed(1)),
            completedAt: new Date(),
        };
        try {
            await saveInterviewSession(finalSession);
            alert("Session saved successfully!");
        } catch (error) {
            alert("Failed to save session. Please try again.");
        }
    };
    
    const resetInterview = () => {
        setPageState('setup');
        setConfig({ jobRole: '', interviewType: 'Technical' });
        setSessionData([]);
        setCurrentQuestionIndex(0);
        setCurrentDifficulty('medium');
        setIsLoading(false);
        setTranscript('');
        setTimer(0);
    }

    if (pageState === 'setup') {
        return (
            <div className="w-full max-w-lg mx-auto bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700">
                <h2 className="text-3xl font-bold text-center mb-2">Interview Setup</h2>
                <p className="text-center text-gray-400 mb-8">Tell us what you're preparing for.</p>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="jobRole" className="block mb-2 text-sm font-medium text-gray-300">Job Role</label>
                        <input type="text" id="jobRole" value={config.jobRole} onChange={(e) => setConfig(c => ({ ...c, jobRole: e.target.value }))} placeholder="e.g., Software Engineer" className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5" />
                    </div>
                    <div>
                        <label htmlFor="interviewType" className="block mb-2 text-sm font-medium text-gray-300">Interview Type</label>
                        <select id="interviewType" value={config.interviewType} onChange={(e) => setConfig(c => ({ ...c, interviewType: e.target.value as InterviewType }))} className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
                            <option>Technical</option>
                            <option>HR</option>
                        </select>
                    </div>
                    <button onClick={fetchAndStartFirstQuestion} disabled={!config.jobRole} className="w-full text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-3 text-center disabled:bg-gray-600 disabled:cursor-not-allowed">Start Interview</button>
                </div>
            </div>
        );
    }

    if (pageState === 'session') {
        const currentQnA = sessionData[currentQuestionIndex];
        return (
            <div className="w-full max-w-3xl mx-auto bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 flex flex-col min-h-[70vh]">
                {isLoading ? <LoadingIndicator text={loadingText} /> : (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-cyan-400">Question {currentQuestionIndex + 1}/{TOTAL_QUESTIONS}</h3>
                            <span className="text-lg font-semibold text-white">{timer}s</span>
                        </div>
                        <ProgressBar current={currentQuestionIndex + 1} total={TOTAL_QUESTIONS} />
                        <p className="text-2xl font-semibold my-6 flex-grow">{currentQnA?.question}</p>
                        <div className="bg-gray-900/50 p-4 rounded-lg min-h-[150px] border border-gray-600 mb-6"><p className="text-gray-300">{transcript || (isListening ? "Listening..." : "Your answer will appear here.")}</p></div>
                        <div className="flex justify-center items-center gap-4">
                            <button onClick={isListening ? stopListening : startListening} className={`p-4 rounded-full transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'}`}>
                                {isListening ? <StopIcon className="w-8 h-8 text-white"/> : <MicIcon className="w-8 h-8 text-white"/>}
                            </button>
                            <button onClick={handleNextQuestion} className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg">Submit & Next</button>
                        </div>
                        {!isApiSupported && <p className="text-red-500 text-center mt-4">Speech recognition is not supported by your browser.</p>}
                    </>
                )}
            </div>
        );
    }
    
    if (pageState === 'results') {
        const overallScore = sessionData.reduce((acc, qna) => acc + (qna.feedback?.score || 0), 0) / sessionData.length;
        return (
            <div className="w-full max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700">
                <h2 className="text-4xl font-bold text-center mb-4 text-cyan-400">Interview Report</h2>
                <p className="text-center text-gray-300 mb-2">Overall Score: <span className="font-bold text-2xl text-white">{overallScore.toFixed(1)}/10</span></p>
                <p className="text-center text-gray-400 mb-8">{config.jobRole} - {config.interviewType} Interview</p>
                <div className="space-y-6 mb-8 max-h-[50vh] overflow-y-auto pr-4">
                    {sessionData.map((qna, index) => (
                        <div key={index} className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                            <p className="font-bold text-lg mb-2 text-gray-200">Q{index+1}: {qna.question}</p>
                            <p className="italic text-gray-400 mb-4">Your Answer: "{qna.answer}"</p>
                            {qna.feedback && (
                                <div className="border-t border-gray-600 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="bg-green-900/30 p-3 rounded"><h4 className="font-semibold text-green-400 mb-1">Strengths</h4><p>{qna.feedback.strengths}</p></div>
                                    <div className="bg-red-900/30 p-3 rounded"><h4 className="font-semibold text-red-400 mb-1">Weaknesses</h4><p>{qna.feedback.weaknesses}</p></div>
                                    <div className="md:col-span-2 bg-yellow-900/30 p-3 rounded"><h4 className="font-semibold text-yellow-400 mb-1">Suggestions</h4><p>{qna.feedback.suggestions}</p></div>
                                    <div className="md:col-span-2 text-right"><p className="font-bold text-lg">Score: <span className="text-cyan-400">{qna.feedback.score}/10</span></p></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-center gap-4 pt-4 border-t border-gray-700">
                     <button onClick={resetInterview} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg">Try Another Interview</button>
                     <button onClick={handleSaveResults} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg">Save Results</button>
                </div>
            </div>
        )
    }

    return null;
};