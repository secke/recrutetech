import React, { useEffect, useRef, useState } from 'react';
import { useInterviewWebSocket } from '../hooks/useInterviewWebSocket';
import AudioRecorder from './AudioRecorder';
import { User, Bot, Video, VideoOff } from 'lucide-react';

const InterviewInterface = () => {
    // Generate a random token for testing
    const [token] = useState(() => 'test-' + Math.random().toString(36).substr(2, 9));
    const { isConnected, messages, sendAudioChunk } = useInterviewWebSocket(token);
    const [transcript, setTranscript] = useState([]);
    const videoRef = useRef(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    // Handle incoming messages
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];

            if (lastMsg.type === 'ai_response') {
                // Add to transcript
                setTranscript(prev => [...prev, { role: 'ai', text: lastMsg.text }]);

                // Play audio if available (hex-encoded audio data)
                if (lastMsg.audio) {
                    try {
                        // Convert hex string to binary
                        const hexString = lastMsg.audio;
                        const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        const audio = new Audio(audioUrl);
                        audio.play().catch(err => console.error('Error playing audio:', err));
                    } catch (err) {
                        console.error('Error processing audio:', err);
                    }
                }
            } else if (lastMsg.type === 'transcription') {
                setTranscript(prev => [...prev, { role: 'user', text: lastMsg.text }]);
            }
        }
    }, [messages]);

    // Setup Webcam
    useEffect(() => {
        const startVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setIsVideoEnabled(false);
            }
        };

        if (isVideoEnabled) {
            startVideo();
        } else if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, [isVideoEnabled]);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    RecruteTech AI Interviewer
                </h1>
                <div className={`px-3 py-1 rounded-full text-sm ${isConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                {/* Left Column: Video & Controls */}
                <div className="space-y-6">
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
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <VideoOff className="w-16 h-16" />
                            </div>
                        )}

                        <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                            <AudioRecorder onAudioChunk={sendAudioChunk} isConnected={isConnected} />
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Bot className="w-5 h-5 text-blue-400" />
                            AI Interviewer
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                                <Bot className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="font-medium">Sarah (AI)</p>
                                <p className="text-sm text-gray-400">Technical Recruiter</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Transcript */}
                <div className="bg-gray-800 rounded-2xl border border-gray-700 flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-700">
                        <h2 className="text-lg font-semibold">Live Transcript</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {transcript.length === 0 && (
                            <div className="text-center text-gray-500 mt-20">
                                <p>Transcript will appear here...</p>
                            </div>
                        )}

                        {transcript.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-green-600' : 'bg-blue-600'
                                    }`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-green-900/30 text-green-100 rounded-tr-none'
                                        : 'bg-blue-900/30 text-blue-100 rounded-tl-none'
                                    }`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewInterface;
