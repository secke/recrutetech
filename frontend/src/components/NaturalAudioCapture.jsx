/**
 * NaturalAudioCapture Component
 *
 * Provides natural voice interaction with automatic silence detection.
 * Uses Web Audio API for voice activity detection without external dependencies.
 *
 * Features:
 * - Automatic speech detection based on audio level analysis
 * - Visual feedback showing speaking state and audio levels
 * - Automatic pause when AI is speaking
 * - Graceful handling of interruptions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, Volume2, VolumeX } from 'lucide-react';

// Configuration constants
const VAD_CONFIG = {
    // Threshold for detecting speech (0-1) - VERY HIGH to avoid noise/silence false positives
    speechThreshold: 0.15,  // Very high threshold - requires clear, loud speech
    // Silence duration before considering speech ended (ms)
    silenceTimeout: 1200,
    // Minimum speech duration to consider valid (ms) - increased to filter out brief noises
    minSpeechDuration: 1000,  // Require at least 1 second of continuous speech
    // Audio analysis interval (ms)
    analysisInterval: 100,
    // Maximum recording duration (ms) - prevents Google STT "too long" error
    maxRecordingDuration: 30000,
};

const NaturalAudioCapture = ({
    onSpeechEnd,
    onSpeechStart,
    isConnected,
    isAISpeaking = false,
    disabled = false,
    autoStart = false,
}) => {
    const [isActive, setIsActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Cliquez pour démarrer');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Refs
    const mediaStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const speechStartTimeRef = useRef(null);
    const silenceTimeoutRef = useRef(null);
    const analysisIntervalRef = useRef(null);
    const maxDurationTimeoutRef = useRef(null);
    const isAISpeakingRef = useRef(isAISpeaking);

    // Keep refs updated
    useEffect(() => {
        isAISpeakingRef.current = isAISpeaking;
    }, [isAISpeaking]);

    /**
     * Analyze audio levels for VAD
     */
    const analyzeAudio = useCallback(() => {
        if (!analyserRef.current || isAISpeakingRef.current) {
            setAudioLevel(0);
            return;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = average / 255;
        setAudioLevel(normalizedLevel);

        // Detect speech based on threshold
        const isSpeechDetected = normalizedLevel > VAD_CONFIG.speechThreshold;

        if (isSpeechDetected) {
            // Clear silence timeout
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }

            // Start recording if not already speaking
            if (!speechStartTimeRef.current) {
                console.log('🎤 Speech detected - user started talking');
                speechStartTimeRef.current = Date.now();
                setIsSpeaking(true);
                audioChunksRef.current = [];

                // Start recording
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
                    mediaRecorderRef.current.start();
                }

                // Set max duration timeout to prevent too long recordings
                maxDurationTimeoutRef.current = setTimeout(() => {
                    console.log('⏱️ Max recording duration reached - stopping');
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                    speechStartTimeRef.current = null;
                    setIsSpeaking(false);
                    if (silenceTimeoutRef.current) {
                        clearTimeout(silenceTimeoutRef.current);
                        silenceTimeoutRef.current = null;
                    }
                }, VAD_CONFIG.maxRecordingDuration);

                if (onSpeechStart) {
                    onSpeechStart();
                }
            }
        } else if (speechStartTimeRef.current && !silenceTimeoutRef.current) {
            // Start silence timeout
            silenceTimeoutRef.current = setTimeout(() => {
                const speechDuration = Date.now() - speechStartTimeRef.current;

                // Clear max duration timeout
                if (maxDurationTimeoutRef.current) {
                    clearTimeout(maxDurationTimeoutRef.current);
                    maxDurationTimeoutRef.current = null;
                }

                if (speechDuration >= VAD_CONFIG.minSpeechDuration) {
                    console.log(`✅ Speech ended after ${speechDuration}ms - processing audio`);

                    // Stop recording and process
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                } else {
                    console.log(`🔇 Speech too short (${speechDuration}ms), ignoring`);
                    audioChunksRef.current = [];
                }

                speechStartTimeRef.current = null;
                setIsSpeaking(false);
                silenceTimeoutRef.current = null;
            }, VAD_CONFIG.silenceTimeout);
        }
    }, [onSpeechStart]);

    /**
     * Start listening for voice activity
     */
    const startListening = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            mediaStreamRef.current = stream;

            // Create audio context and analyser
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Create media recorder for capturing audio
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, {
                        type: mediaRecorder.mimeType,
                    });
                    console.log('📤 Preparing audio:', audioBlob.size, 'bytes, type:', mediaRecorder.mimeType);

                    if (onSpeechEnd) {
                        // Convert Blob to ArrayBuffer for WebSocket binary transmission
                        const arrayBuffer = await audioBlob.arrayBuffer();
                        console.log('📤 Sending ArrayBuffer:', arrayBuffer.byteLength, 'bytes');

                        // Log first bytes to verify WebM header (should be: 1a 45 df a3)
                        const firstBytes = new Uint8Array(arrayBuffer.slice(0, 16));
                        console.log('📤 Header bytes:', Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

                        onSpeechEnd(arrayBuffer);
                    }
                }
                audioChunksRef.current = [];
            };

            mediaRecorderRef.current = mediaRecorder;

            // Start audio analysis loop
            analysisIntervalRef.current = setInterval(analyzeAudio, VAD_CONFIG.analysisInterval);

            setIsListening(true);
            setIsActive(true);
            setIsLoading(false);
            console.log('🎙️ Voice Activity Detection started - speak naturally!');
        } catch (err) {
            console.error('Error starting audio capture:', err);
            setError(err.message || 'Failed to access microphone');
            setIsLoading(false);
        }
    }, [analyzeAudio, onSpeechEnd]);

    /**
     * Stop listening
     */
    const stopListening = useCallback(() => {
        // Clear intervals and timeouts
        if (analysisIntervalRef.current) {
            clearInterval(analysisIntervalRef.current);
            analysisIntervalRef.current = null;
        }
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
        if (maxDurationTimeoutRef.current) {
            clearTimeout(maxDurationTimeoutRef.current);
            maxDurationTimeoutRef.current = null;
        }

        // Stop media recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;

        // Stop media stream
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        speechStartTimeRef.current = null;
        audioChunksRef.current = [];

        setIsListening(false);
        setIsActive(false);
        setIsSpeaking(false);
        setAudioLevel(0);
        console.log('🔇 Voice Activity Detection stopped');
    }, []);

    /**
     * Toggle listening state
     */
    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Auto-pause/resume based on AI speaking state
    useEffect(() => {
        if (!isListening) return;

        if (isAISpeaking) {
            // Pause analysis when AI is speaking
            if (analysisIntervalRef.current) {
                clearInterval(analysisIntervalRef.current);
                analysisIntervalRef.current = null;
            }
            setAudioLevel(0);
        } else {
            // Resume analysis when AI stops speaking
            const timeout = setTimeout(() => {
                if (!isAISpeakingRef.current && isListening) {
                    analysisIntervalRef.current = setInterval(analyzeAudio, VAD_CONFIG.analysisInterval);
                }
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [isAISpeaking, isListening, analyzeAudio]);

    // Auto-start listening when autoStart becomes true
    useEffect(() => {
        if (autoStart && isConnected && !isListening && !disabled) {
            console.log('🎙️ Auto-starting voice detection...');
            startListening();
        }
    }, [autoStart, isConnected, isListening, disabled, startListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    // Update status message based on state
    useEffect(() => {
        if (!isConnected) {
            setStatusMessage('Connexion en cours...');
        } else if (isLoading) {
            setStatusMessage('Initialisation du microphone...');
        } else if (error) {
            setStatusMessage(`Erreur: ${error}`);
        } else if (!isActive) {
            setStatusMessage("Cliquez pour démarrer l'entretien");
        } else if (isAISpeaking) {
            setStatusMessage("L'IA parle... (écoute en pause)");
        } else if (isSpeaking) {
            setStatusMessage('Je vous écoute...');
        } else {
            setStatusMessage('Parlez naturellement, je vous écoute');
        }
    }, [isConnected, isLoading, error, isActive, isAISpeaking, isSpeaking]);

    // Visual indicator helpers
    const getIndicatorColor = () => {
        if (!isActive || !isConnected) return 'bg-gray-500';
        if (isAISpeaking) return 'bg-blue-500';
        if (isSpeaking) return 'bg-green-500 animate-pulse';
        return 'bg-green-400';
    };

    const getButtonStyle = () => {
        if (!isConnected || disabled) {
            return 'bg-gray-600 cursor-not-allowed';
        }
        if (isLoading) {
            return 'bg-yellow-600 animate-pulse';
        }
        if (!isActive) {
            return 'bg-blue-600 hover:bg-blue-700';
        }
        if (isSpeaking) {
            return 'bg-green-600 ring-4 ring-green-400 ring-opacity-50';
        }
        if (isAISpeaking) {
            return 'bg-blue-600 ring-4 ring-blue-400 ring-opacity-50';
        }
        return 'bg-green-600 hover:bg-green-700';
    };

    // Audio level visualization bars
    const renderAudioBars = () => {
        const bars = 5;
        const activeLevel = Math.ceil(audioLevel * bars * 10); // Scale up for visibility

        return (
            <div className="flex items-end gap-0.5 h-6">
                {Array.from({ length: bars }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-75 ${
                            i < activeLevel ? (isSpeaking ? 'bg-green-400' : 'bg-gray-500') : 'bg-gray-700'
                        }`}
                        style={{
                            height: `${((i + 1) / bars) * 100}%`,
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Main control button */}
            <div className="relative">
                {/* Audio level ring indicator */}
                {isActive && isListening && (
                    <div
                        className="absolute inset-0 rounded-full transition-transform duration-75"
                        style={{
                            transform: `scale(${1 + audioLevel * 2})`,
                            background: isSpeaking
                                ? 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
                        }}
                    />
                )}

                <button
                    onClick={toggleListening}
                    disabled={!isConnected || disabled || isLoading}
                    className={`relative p-6 rounded-full transition-all duration-200 ${getButtonStyle()}`}
                >
                    {isLoading ? (
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                    ) : isActive ? (
                        isSpeaking ? (
                            <Volume2 className="w-10 h-10 text-white" />
                        ) : isAISpeaking ? (
                            <VolumeX className="w-10 h-10 text-white opacity-50" />
                        ) : (
                            <Mic className="w-10 h-10 text-white" />
                        )
                    ) : (
                        <MicOff className="w-10 h-10 text-white" />
                    )}
                </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
                <span className="text-sm text-gray-300">{statusMessage}</span>
                {isActive && isListening && !isAISpeaking && renderAudioBars()}
            </div>

            {/* Speaking state indicator */}
            {isActive && (
                <div className="text-xs text-gray-500 text-center max-w-xs">
                    {isAISpeaking ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            L'IA répond...
                        </span>
                    ) : isSpeaking ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Enregistrement en cours...
                        </span>
                    ) : (
                        <span>💡 Parlez naturellement - la détection vocale est automatique</span>
                    )}
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</div>
            )}
        </div>
    );
};

export default NaturalAudioCapture;
