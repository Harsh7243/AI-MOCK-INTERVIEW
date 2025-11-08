import { useState, useEffect, useRef, useCallback } from 'react';

// FIX: Cast window to any to access non-standard SpeechRecognition APIs and prevent TypeScript errors.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeech = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    // FIX: Use 'any' for the ref type as SpeechRecognition is not a standard type
    // and the constant above creates a name collision.
    const recognitionRef = useRef<any | null>(null);

    useEffect(() => {
        if (!SpeechRecognition) {
            console.error("Speech Recognition API is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(prev => (prev + ' ' + finalTranscript).trim());
        };
        
        recognition.onend = () => {
            setIsListening(false);
        };
        
        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if(recognitionRef.current){
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);

    const speak = useCallback((text: string, onEndCallback?: () => void) => {
        if (!window.speechSynthesis) {
            console.error("Speech Synthesis API is not supported in this browser.");
            if (onEndCallback) onEndCallback();
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => {
            if (onEndCallback) {
                onEndCallback();
            }
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }, []);
    
    const isApiSupported = !!SpeechRecognition;

    return { isListening, transcript, startListening, stopListening, speak, isApiSupported, setTranscript };
};