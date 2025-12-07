import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

const AudioRecorder = ({ onAudioChunk, isConnected }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Use a smaller timeslice for lower latency (e.g., 500ms or 1s)
            // Backend expects chunks.
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && isConnected) {
                    onAudioChunk(event.data);
                }
            };

            mediaRecorder.start(1000); // Send chunk every 1 second
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Error accessing microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
                className={`p-4 rounded-full transition-all ${!isConnected
                        ? 'bg-gray-300 cursor-not-allowed'
                        : isRecording
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                            : 'bg-blue-500 hover:bg-blue-600'
                    }`}
            >
                {isRecording ? (
                    <Square className="w-8 h-8 text-white" />
                ) : (
                    <Mic className="w-8 h-8 text-white" />
                )}
            </button>
            <p className="text-sm text-gray-500">
                {!isConnected
                    ? 'Connecting to server...'
                    : isRecording
                        ? 'Recording... (Speak now)'
                        : 'Click to start interview'}
            </p>
        </div>
    );
};

export default AudioRecorder;
