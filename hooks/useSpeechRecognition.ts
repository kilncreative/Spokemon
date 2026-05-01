import { useEffect, useRef, useState, useCallback } from 'react';
import { isFuzzyMatch } from '../utils/textUtils';

export type SpeechStatus = 'idle' | 'connecting' | 'listening';

export const useSpeechRecognition = (
  expectedWord: string, 
  onMatch: () => void,
  onMismatch: (word: string) => void
) => {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState(''); 
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(false);
  const watchdogTimerRef = useRef<any>(null);

  // Refs for callbacks
  const onMatchRef = useRef(onMatch);
  const onMismatchRef = useRef(onMismatch);
  const expectedWordRef = useRef(expectedWord);

  useEffect(() => {
    onMatchRef.current = onMatch;
    onMismatchRef.current = onMismatch;
    expectedWordRef.current = expectedWord;
  }, [onMatch, onMismatch, expectedWord]);

  // Cleanup
  useEffect(() => {
    return () => {
      isEnabledRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, []);

  const startListening = useCallback(() => {
    const IWindow = window as any;
    const SpeechConstructor = IWindow.SpeechRecognition || IWindow.webkitSpeechRecognition;

    if (!SpeechConstructor) {
      setError("Not Supported");
      return;
    }

    // 1. Clear any existing session completely
    if (recognitionRef.current) {
        try { 
            recognitionRef.current.onend = null; // Detach handlers to prevent zombie restarts
            recognitionRef.current.abort(); 
        } catch(e) {}
        recognitionRef.current = null;
    }

    // 2. Reset UI
    setError(null);
    setTranscript('');
    setStatus('connecting');
    isEnabledRef.current = true;

    // 3. Setup new session
    const recognition = new SpeechConstructor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false; // Mobile friendly single-shot

    recognition.onstart = () => {
        // Clear watchdog
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        setStatus('listening');
        setError(null);
    };

    recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let matched = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            const text = result[0].transcript;

            if (isFuzzyMatch(expectedWordRef.current, text)) {
                matched = true;
            }

            if (result.isFinal) {
                finalTranscript = text;
            } else {
                setTranscript(text);
            }
        }

        if (matched) {
            setTranscript(expectedWordRef.current);
            isEnabledRef.current = false; // Stop intent
            recognition.abort(); // Force stop
            onMatchRef.current();
            setStatus('idle');
        } else if (finalTranscript) {
            setTranscript(finalTranscript);
            onMismatchRef.current(finalTranscript);
            setTimeout(() => {
                if (isEnabledRef.current) setTranscript('');
            }, 1000);
        }
    };

    recognition.onerror = (event: any) => {
        console.log("Speech Error:", event.error);
        if (event.error === 'no-speech') {
            // Ignore, let onend restart it
            return;
        }
        if (event.error === 'aborted') {
            return;
        }
        
        isEnabledRef.current = false; // Stop trying
        setStatus('idle');

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError("Mic Denied");
        } else if (event.error === 'network') {
            setError("Network Error");
        } else {
            setError("Mic Error");
        }
    };

    recognition.onend = () => {
        // If user still wants to listen (continuous effect), restart
        if (isEnabledRef.current && status !== 'idle') {
            // Small delay to prevent tight loop crashes
            setTimeout(() => {
                if (isEnabledRef.current) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error("Restart failed", e);
                        setStatus('idle');
                        isEnabledRef.current = false;
                    }
                }
            }, 150);
        } else {
            setStatus('idle');
        }
    };

    // 4. Start
    try {
        recognitionRef.current = recognition;
        recognition.start();
        
        // Watchdog: If still "connecting" after 1.5s, something is stuck (permission dialog hidden, or ignored)
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = setTimeout(() => {
            if (isEnabledRef.current && status === 'connecting') {
                console.warn("Connection watchdog triggered");
                // Don't kill it immediately if it's just slow, but show user feedback?
                // Actually, on mobile, if permission prompt is up, JS pauses. 
                // So this timeout might only fire if the prompt is NOT up but the engine is stuck.
                // We'll reset to idle so user can click again.
                isEnabledRef.current = false;
                if (recognitionRef.current) try { recognitionRef.current.abort(); } catch(e){}
                setStatus('idle');
                setError("Tap to Retry");
            }
        }, 1500);

    } catch (e) {
        console.error("Start Exception", e);
        setStatus('idle');
        setError("Error");
        isEnabledRef.current = false;
    }

  }, [status]); // Dependencies

  const stopListening = useCallback(() => {
    isEnabledRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
    setStatus('idle');
    setTranscript('');
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
  }, []);

  return {
    status,
    transcript,
    error,
    startListening,
    stopListening
  };
};