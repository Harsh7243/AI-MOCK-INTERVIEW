import React from 'react';
import { BrainCircuitIcon, GoogleIcon } from './icons';
import { signInWithGoogle } from '../services/firebase';

export const LandingPage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="relative z-10 flex flex-col items-center max-w-4xl">
                <div className="mb-6">
                    <BrainCircuitIcon className="h-20 w-20 text-cyan-400" />
                </div>
                <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 mb-4 leading-tight">
                    AI Mock Interview Pro
                </h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-8">
                    Enhance your interview skills with interactive, AI-powered sessions. Get instant feedback, adaptive questions, and practice with your voice.
                </p>

                <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-gray-700 shadow-2xl shadow-cyan-500/10 mb-10 w-full">
                    <h3 className="text-2xl font-semibold text-cyan-300 mb-4">Features</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-gray-300">
                        <li className="flex items-start space-x-3">
                            <span className="text-cyan-400 mt-1">✓</span>
                            <span><strong>Adaptive Questions:</strong> Difficulty adjusts based on your performance.</span>
                        </li>
                        <li className="flex items-start space-x-3">
                            <span className="text-cyan-400 mt-1">✓</span>
                            <span><strong>Voice Interaction:</strong> Speak your answers naturally with real-time transcription.</span>
                        </li>
                        <li className="flex items-start space-x-3">
                            <span className="text-cyan-400 mt-1">✓</span>
                            <span><strong>Instant AI Feedback:</strong> Detailed analysis of your strengths and weaknesses.</span>
                        </li>
                    </ul>
                </div>
                
                <button 
                    onClick={signInWithGoogle}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-800 font-semibold rounded-lg shadow-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
                >
                    <GoogleIcon />
                    Sign In & Start Interview
                </button>
            </div>
        </div>
    );
};