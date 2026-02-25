/**
 * InterviewInterface Component
 *
 * Main interface for conducting AI-powered interviews with natural conversation flow.
 *
 * Features:
 * - Natural voice interaction with automatic speech detection (VAD)
 * - Real-time video capture and behavioral analysis
 * - Live transcript display
 * - AI audio response playback with turn-taking management
 * - Visual metrics display (confidence, engagement, eye contact)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useInterviewWebSocket } from '../hooks/useInterviewWebSocket';
import { useVideoAnalysis } from '../hooks/useVideoAnalysis';
import NaturalAudioCapture from './NaturalAudioCapture';
import VisualMetricsDisplay from './VisualMetricsDisplay';
import AIAvatar, { AvatarState } from './AIAvatar';
import { User, Bot, Video, VideoOff, PhoneOff, Wifi, WifiOff, Eye, EyeOff } from 'lucide-react';

// Conversation states for turn-taking
const ConversationState = {
    IDLE: 'idle',
    USER_SPEAKING: 'user_speaking',
    PROCESSING: 'processing',
    AI_SPEAKING: 'ai_speaking',
};

const InterviewInterface = () => {
    // Generate a random token for testing
    const [token] = useState(() => 'test-' + Math.random().toString(36).substring(2, 11));

    // WebSocket connection
    const {
        isConnected,
        messages,
        sendAudioChunk,
        sendMessage,
        sendVisualMetrics,
    } = useInterviewWebSocket(token);

    // Conversation state management
    const [conversationState, setConversationState] = useState(ConversationState.IDLE);
    const [transcript, setTranscript] = useState([]);
    const [isInterviewActive, setIsInterviewActive] = useState(false);
    const [welcomeReceived, setWelcomeReceived] = useState(false);

    // Video state
    const videoRef = useRef(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAnalysisEnabled, setIsAnalysisEnabled] = useState(true);

    // Visual metrics state
    const [visualMetrics, setVisualMetrics] = useState(null);

    // Audio playback management
    const audioRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);

    // Transcript auto-scroll
    const transcriptEndRef = useRef(null);

    // Track processed messages to avoid duplicates
    const processedMessagesRef = useRef(new Set());

    /**
     * Handle visual metrics update from video analysis
     */
    const handleMetricsUpdate = useCallback(
        (metrics) => {
            setVisualMetrics(metrics);

            // Send metrics to backend if interview is active
            if (isInterviewActive && isConnected) {
                sendVisualMetrics(metrics);
            }
        },
        [isInterviewActive, isConnected, sendVisualMetrics]
    );

    /**
     * Send video frame to backend for analysis
     */
    const sendVideoFrame = useCallback(
        (frameBase64) => {
            if (isInterviewActive && isConnected) {
                sendMessage({
                    type: 'video_frame',
                    frame: frameBase64,
                });
            }
        },
        [isInterviewActive, isConnected, sendMessage]
    );

    // Initialize video analysis
    const { isAnalyzing, currentMetrics } = useVideoAnalysis({
        videoElement: videoRef.current,
        onMetricsUpdate: handleMetricsUpdate,
        analysisInterval: 2000, // Report every 2 seconds
        enabled: isAnalysisEnabled && isVideoEnabled && isInterviewActive,
    });

    /**
     * Play audio from queue with turn-taking management
     */
    const playNextAudio = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setConversationState(ConversationState.IDLE);
            return;
        }

        isPlayingRef.current = true;
        setConversationState(ConversationState.AI_SPEAKING);

        const audioData = audioQueueRef.current.shift();

        try {
            // Convert hex string to binary
            const bytes = new Uint8Array(
                audioData.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
            );
            const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play().catch((err) => {
                    console.error('Error playing audio:', err);
                    playNextAudio();
                });
            }
        } catch (err) {
            console.error('Error processing audio:', err);
            playNextAudio();
        }
    }, []);

    /**
     * Handle audio playback end
     */
    const handleAudioEnded = useCallback(() => {
        playNextAudio();
    }, [playNextAudio]);

    /**
     * Queue audio for playback
     */
    const queueAudio = useCallback(
        (audioHex) => {
            audioQueueRef.current.push(audioHex);
            if (!isPlayingRef.current) {
                playNextAudio();
            }
        },
        [playNextAudio]
    );

    /**
     * Handle incoming WebSocket messages
     */
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];

        // Create a unique ID for this message to prevent duplicates
        const messageId = `${lastMsg.type}-${lastMsg.timestamp || Date.now()}-${lastMsg.text?.substring(0, 50) || ''}`;

        // Skip if we've already processed this message
        if (processedMessagesRef.current.has(messageId)) {
            console.log('⚠️ Skipping duplicate message:', lastMsg.type);
            return;
        }

        // Mark as processed
        processedMessagesRef.current.add(messageId);

        // Keep the set from growing too large
        if (processedMessagesRef.current.size > 100) {
            const entries = Array.from(processedMessagesRef.current);
            processedMessagesRef.current = new Set(entries.slice(-50));
        }

        switch (lastMsg.type) {
            case 'welcome_message':
                // Welcome message received - show it but don't start interview yet
                console.log('👋 Welcome message received');
                setWelcomeReceived(true);

                setTranscript((prev) => [
                    ...prev,
                    {
                        role: 'ai',
                        text: lastMsg.text,
                        timestamp: lastMsg.timestamp,
                        isWelcome: true,
                    },
                ]);

                if (lastMsg.audio) {
                    queueAudio(lastMsg.audio);
                }

                setConversationState(ConversationState.AI_SPEAKING);
                break;

            case 'ai_message':
            case 'ai_response':
                setTranscript((prev) => [
                    ...prev,
                    {
                        role: 'ai',
                        text: lastMsg.text,
                        timestamp: lastMsg.timestamp,
                        evaluation: lastMsg.evaluation,
                    },
                ]);

                if (lastMsg.audio) {
                    queueAudio(lastMsg.audio);
                }

                // Set AI speaking state when audio is present
                if (lastMsg.audio) {
                    setConversationState(ConversationState.AI_SPEAKING);
                } else if (conversationState === ConversationState.PROCESSING) {
                    setConversationState(ConversationState.AI_SPEAKING);
                }
                break;

            case 'transcription':
                setTranscript((prev) => [
                    ...prev,
                    {
                        role: 'user',
                        text: lastMsg.text,
                        timestamp: lastMsg.timestamp,
                    },
                ]);
                setConversationState(ConversationState.PROCESSING);
                break;

            case 'interview_complete':
                setTranscript((prev) => [
                    ...prev,
                    {
                        role: 'system',
                        text: 'Entretien terminé. Merci pour votre participation!',
                        report: lastMsg.report,
                    },
                ]);
                setIsInterviewActive(false);
                if (lastMsg.closing_audio) {
                    queueAudio(lastMsg.closing_audio);
                }
                break;

            case 'error':
                console.error('Server error:', lastMsg.message);
                setTranscript((prev) => [
                    ...prev,
                    {
                        role: 'error',
                        text: `Erreur: ${lastMsg.message}`,
                    },
                ]);
                break;

            default:
                console.log('Unknown message type:', lastMsg.type);
        }
    }, [messages, queueAudio, conversationState, isInterviewActive]);

    /**
     * Auto-scroll transcript to bottom
     */
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    /**
     * Setup Webcam
     */
    useEffect(() => {
        const startVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user',
                    },
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error('Error accessing camera:', err);
                setIsVideoEnabled(false);
            }
        };

        if (isVideoEnabled) {
            startVideo();
        } else if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }

        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            }
        };
    }, [isVideoEnabled]);

    /**
     * Send video frames to backend periodically during interview
     */
    useEffect(() => {
        if (!isInterviewActive || !isVideoEnabled || !videoRef.current || !isConnected) {
            return;
        }

        // Create canvas for capturing frames
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const captureFrame = () => {
            if (!videoRef.current || !isInterviewActive) return;

            const video = videoRef.current;
            if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw current frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to base64 JPEG (compressed)
            const frameData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

            // Send to backend
            sendVideoFrame(frameData);
        };

        // Capture frame every 2 seconds
        const intervalId = setInterval(captureFrame, 2000);

        return () => clearInterval(intervalId);
    }, [isInterviewActive, isVideoEnabled, isConnected, sendVideoFrame]);

    /**
     * Handle speech end - send audio to server
     */
    const handleSpeechEnd = useCallback(
        (audioBlob) => {
            if (!isConnected) return;

            setConversationState(ConversationState.PROCESSING);
            sendAudioChunk(audioBlob);
        },
        [isConnected, sendAudioChunk]
    );

    /**
     * Handle speech start
     */
    const handleSpeechStart = useCallback(() => {
        setConversationState(ConversationState.USER_SPEAKING);
    }, []);

    /**
     * End interview manually
     */
    const endInterview = useCallback(() => {
        sendMessage({ type: 'end_interview' });
        setIsInterviewActive(false);
    }, [sendMessage]);

    /**
     * Start interview - send message to backend
     */
    const startInterview = useCallback(() => {
        if (!isConnected) {
            console.error('❌ Cannot start interview: not connected');
            return;
        }

        console.log('🎬 Starting interview...');
        setIsInterviewActive(true);

        // Notify backend that interview is starting
        sendMessage({ type: 'start_interview' });
    }, [isConnected, sendMessage]);

    /**
     * Get conversation state indicator
     */
    const getStateIndicator = () => {
        switch (conversationState) {
            case ConversationState.USER_SPEAKING:
                return { color: 'bg-green-500', text: 'Vous parlez...' };
            case ConversationState.PROCESSING:
                return { color: 'bg-yellow-500 animate-pulse', text: 'Traitement...' };
            case ConversationState.AI_SPEAKING:
                return { color: 'bg-blue-500 animate-pulse', text: "L'IA répond..." };
            default:
                return { color: 'bg-gray-500', text: 'En attente' };
        }
    };

    const stateIndicator = getStateIndicator();

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            {/* Hidden audio element for AI responses */}
            <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

            {/* Header */}
            <header className="mb-6 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        RecruteTech AI Interviewer
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Entretien naturel avec analyse comportementale en temps réel
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Connection status */}
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                            isConnected
                                ? 'bg-green-900/50 text-green-300 border border-green-700'
                                : 'bg-red-900/50 text-red-300 border border-red-700'
                        }`}
                    >
                        {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        {isConnected ? 'Connecté' : 'Déconnecté'}
                    </div>

                    {/* Conversation state indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700">
                        <div className={`w-2 h-2 rounded-full ${stateIndicator.color}`} />
                        <span className="text-sm text-gray-300">{stateIndicator.text}</span>
                    </div>

                    {/* End interview button */}
                    {isInterviewActive && (
                        <button
                            onClick={endInterview}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                            <PhoneOff className="w-4 h-4" />
                            Terminer
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {/* Left Column: Video & Controls */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Video feed */}
                    <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
                        {isVideoEnabled ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <VideoOff className="w-16 h-16 mb-2" />
                                <span>Caméra désactivée</span>
                            </div>
                        )}

                        {/* Video controls overlay */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button
                                onClick={() => setIsAnalysisEnabled(!isAnalysisEnabled)}
                                className={`p-2 rounded-full transition-colors ${
                                    isAnalysisEnabled
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : 'bg-gray-800/80 hover:bg-gray-700'
                                }`}
                                title={isAnalysisEnabled ? 'Désactiver analyse' : 'Activer analyse'}
                            >
                                {isAnalysisEnabled ? (
                                    <Eye className="w-5 h-5" />
                                ) : (
                                    <EyeOff className="w-5 h-5" />
                                )}
                            </button>
                            <button
                                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                                className={`p-2 rounded-full transition-colors ${
                                    isVideoEnabled
                                        ? 'bg-gray-800/80 hover:bg-gray-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {isVideoEnabled ? (
                                    <Video className="w-5 h-5" />
                                ) : (
                                    <VideoOff className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {/* Speaking indicator overlay */}
                        {conversationState === ConversationState.USER_SPEAKING && (
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="bg-green-600/90 text-white px-4 py-2 rounded-lg text-center animate-pulse">
                                    🎤 Vous parlez...
                                </div>
                            </div>
                        )}

                        {/* Analysis indicator */}
                        {isAnalyzing && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-blue-600/80 px-3 py-1.5 rounded-full">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <span className="text-xs">Analyse en cours</span>
                            </div>
                        )}
                    </div>

                    {/* Controls row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Natural Audio Capture */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <NaturalAudioCapture
                                onSpeechEnd={handleSpeechEnd}
                                onSpeechStart={handleSpeechStart}
                                isConnected={isConnected}
                                isAISpeaking={conversationState === ConversationState.AI_SPEAKING}
                                disabled={!isInterviewActive}
                                autoStart={isInterviewActive}
                            />

                            {/* Start interview button - shown after welcome message */}
                            {!isInterviewActive && welcomeReceived && isConnected && (
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={startInterview}
                                        className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        🎬 Commencer l'entretien
                                    </button>
                                    <p className="text-sm text-gray-400 mt-2">
                                        Cliquez quand vous êtes prêt
                                    </p>
                                </div>
                            )}

                            {/* Waiting for connection message */}
                            {!isConnected && (
                                <div className="mt-4 text-center text-gray-400">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        Connexion en cours...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AI Interviewer with Avatar */}
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div className="flex flex-col items-center mb-4">
                                {/* Animated AI Avatar */}
                                <AIAvatar
                                    state={
                                        conversationState === ConversationState.AI_SPEAKING
                                            ? AvatarState.SPEAKING
                                            : conversationState === ConversationState.PROCESSING
                                            ? AvatarState.THINKING
                                            : conversationState === ConversationState.USER_SPEAKING
                                            ? AvatarState.LISTENING
                                            : AvatarState.IDLE
                                    }
                                    audioElement={audioRef.current}
                                    name="Sarah"
                                    title="Technical Recruiter"
                                    size={140}
                                />
                            </div>

                            {/* Visual Metrics Display */}
                            <VisualMetricsDisplay
                                metrics={visualMetrics || currentMetrics}
                                isAnalyzing={isAnalyzing}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Transcript */}
                <div className="bg-gray-800 rounded-2xl border border-gray-700 flex flex-col h-[calc(100vh-12rem)] lg:h-[700px]">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Transcription en direct</h2>
                        <span className="text-xs text-gray-500">
                            {transcript.length} message{transcript.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {transcript.length === 0 && (
                            <div className="text-center text-gray-500 mt-20">
                                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                {!isConnected ? (
                                    <>
                                        <p className="animate-pulse">Connexion à l'interviewer IA...</p>
                                        <p className="text-sm mt-2">Veuillez patienter</p>
                                    </>
                                ) : !welcomeReceived ? (
                                    <>
                                        <p className="animate-pulse">En attente du message de bienvenue...</p>
                                    </>
                                ) : (
                                    <>
                                        <p>Prêt à démarrer l'entretien</p>
                                        <p className="text-sm mt-2">
                                            Cliquez sur "Commencer l'entretien" pour débuter
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        {transcript.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        msg.role === 'user'
                                            ? 'bg-green-600'
                                            : msg.role === 'error'
                                            ? 'bg-red-600'
                                            : msg.role === 'system'
                                            ? 'bg-yellow-600'
                                            : msg.isWelcome
                                            ? 'bg-purple-600'
                                            : 'bg-blue-600'
                                    }`}
                                >
                                    {msg.role === 'user' ? (
                                        <User className="w-4 h-4" />
                                    ) : (
                                        <Bot className="w-4 h-4" />
                                    )}
                                </div>
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl ${
                                        msg.role === 'user'
                                            ? 'bg-green-900/30 text-green-100 rounded-tr-none'
                                            : msg.role === 'error'
                                            ? 'bg-red-900/30 text-red-100 rounded-tl-none'
                                            : msg.role === 'system'
                                            ? 'bg-yellow-900/30 text-yellow-100 rounded-tl-none'
                                            : msg.isWelcome
                                            ? 'bg-purple-900/30 text-purple-100 rounded-tl-none border border-purple-700'
                                            : 'bg-blue-900/30 text-blue-100 rounded-tl-none'
                                    }`}
                                >
                                    {msg.isWelcome && (
                                        <div className="text-xs font-semibold text-purple-300 mb-1">
                                            👋 Message de bienvenue
                                        </div>
                                    )}
                                    <p className="text-sm">{msg.text}</p>
                                    {msg.evaluation && (
                                        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                                            Score: {Math.round((msg.evaluation.overall || 0) * 10) / 10}/10
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={transcriptEndRef} />
                    </div>

                    {/* Processing indicator */}
                    {conversationState === ConversationState.PROCESSING && (
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex items-center gap-3 text-gray-400">
                                <div className="flex gap-1">
                                    <div
                                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                        style={{ animationDelay: '0ms' }}
                                    />
                                    <div
                                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                        style={{ animationDelay: '150ms' }}
                                    />
                                    <div
                                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                        style={{ animationDelay: '300ms' }}
                                    />
                                </div>
                                <span className="text-sm">L'IA analyse votre réponse...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer with instructions */}
            <footer className="mt-6 text-center text-gray-500 text-sm">
                <p>
                    💡 Conseil: Regardez la caméra et parlez naturellement. L'analyse
                    comportementale évalue votre confiance et engagement.
                </p>
            </footer>
        </div>
    );
};

export default InterviewInterface;
