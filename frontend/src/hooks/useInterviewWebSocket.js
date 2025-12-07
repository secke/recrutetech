import { useState, useEffect, useRef, useCallback } from 'react';

export const useInterviewWebSocket = (interviewToken) => {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const wsRef = useRef(null);

    useEffect(() => {
        if (!interviewToken) return;

        const wsUrl = `ws://localhost:8000/ws/interview/${interviewToken}`;
        console.log('Connecting to WebSocket:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket Connected');
            setIsConnected(true);
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                // Handle binary audio data (Blob)
                if (event.data instanceof Blob) {
                    // For now, we assume binary data is audio to play
                    // In a real app, we might wrap this in a JSON structure or use a separate channel
                    // But the backend sends JSON for control/text and binary for audio?
                    // Let's check backend protocol. 
                    // Backend sends: {"type": "ai_response", "audio": "hex_data"} (JSON)
                    // OR binary?
                    // Let's assume JSON for now based on backend code comments.
                    console.log("Received binary data", event.data);
                } else {
                    const data = JSON.parse(event.data);
                    setMessages((prev) => [...prev, data]);
                }
            } catch (err) {
                console.error('Error parsing message:', err);
            }
        };

        ws.onerror = (event) => {
            console.error('WebSocket Error:', event);
            setError('Connection error');
            setIsConnected(false);
        };

        ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setIsConnected(false);
        };

        return () => {
            ws.close();
        };
    }, [interviewToken]);

    const sendMessage = useCallback((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected');
        }
    }, []);

    const sendAudioChunk = useCallback((chunk) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(chunk);
        }
    }, []);

    return { isConnected, messages, error, sendMessage, sendAudioChunk };
};
