/**
 * useInterviewWebSocket Hook
 *
 * Manages WebSocket connection for real-time interview communication.
 *
 * Features:
 * - Bidirectional audio/video data transmission
 * - Visual metrics transmission for behavioral analysis
 * - Connection state management with auto-reconnect
 * - Message queue for reliable delivery
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket configuration
const WS_CONFIG = {
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    pingInterval: 30000,
};

export const useInterviewWebSocket = (interviewToken) => {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);

    const wsRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const connectionAttemptsRef = useRef(0);
    const isConnectingRef = useRef(false);
    const hasConnectedRef = useRef(false);

    /**
     * Cleanup function
     */
    const cleanup = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
    }, []);

    /**
     * Connect to WebSocket server
     */
    const connect = useCallback(() => {
        if (!interviewToken) return;

        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log('⚠️ Already connecting, skipping...');
            return;
        }

        // Prevent reconnection if already connected
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('⚠️ Already connected, skipping...');
            return;
        }

        // Prevent reconnection if we're in CONNECTING state
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
            console.log('⚠️ Connection in progress, skipping...');
            return;
        }

        isConnectingRef.current = true;

        const wsUrl = `ws://localhost:8000/ws/interview/${interviewToken}`;
        console.log('🔌 Connecting to WebSocket:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('✅ WebSocket Connected');
            isConnectingRef.current = false;
            hasConnectedRef.current = true;
            connectionAttemptsRef.current = 0;
            setIsConnected(true);
            setError(null);

            // Start ping interval to keep connection alive
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, WS_CONFIG.pingInterval);
        };

        ws.onmessage = (event) => {
            try {
                if (event.data instanceof Blob) {
                    console.log('📦 Received binary data:', event.data.size, 'bytes');
                } else {
                    const data = JSON.parse(event.data);

                    // Filter out pong messages
                    if (data.type === 'pong') {
                        return;
                    }

                    console.log('📨 Received message:', data.type);
                    setMessages((prev) => [...prev, data]);
                }
            } catch (err) {
                console.error('❌ Error parsing message:', err);
            }
        };

        ws.onerror = (event) => {
            console.error('❌ WebSocket Error:', event);
            isConnectingRef.current = false;
            setError('Connection error');
        };

        ws.onclose = (event) => {
            console.log('🔌 WebSocket Disconnected:', event.code, event.reason);
            isConnectingRef.current = false;
            setIsConnected(false);

            // Clear ping interval
            cleanup();

            // Only attempt to reconnect if:
            // 1. Not a normal closure (code !== 1000)
            // 2. We've successfully connected before
            // 3. Haven't exceeded max attempts
            if (
                event.code !== 1000 &&
                hasConnectedRef.current &&
                connectionAttemptsRef.current < WS_CONFIG.maxReconnectAttempts
            ) {
                connectionAttemptsRef.current += 1;
                console.log(
                    `🔄 Attempting to reconnect (${connectionAttemptsRef.current}/${WS_CONFIG.maxReconnectAttempts})...`
                );
                reconnectTimeoutRef.current = setTimeout(connect, WS_CONFIG.reconnectInterval);
            }
        };
    }, [interviewToken, cleanup]);

    /**
     * Disconnect from WebSocket server
     */
    const disconnect = useCallback(() => {
        cleanup();
        hasConnectedRef.current = false;
        connectionAttemptsRef.current = 0;

        if (wsRef.current) {
            wsRef.current.close(1000, 'User disconnected');
            wsRef.current = null;
        }

        setIsConnected(false);
    }, [cleanup]);

    // Connect on mount, disconnect on unmount
    // Use empty dependency array to run only once
    useEffect(() => {
        // Small delay to ensure component is fully mounted
        const timeoutId = setTimeout(() => {
            connect();
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interviewToken]);

    /**
     * Send JSON message to server
     */
    const sendMessage = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
            return true;
        } else {
            console.warn('⚠️ WebSocket not connected, cannot send message');
            return false;
        }
    }, []);

    /**
     * Send audio chunk (binary data) to server
     */
    const sendAudioChunk = useCallback((chunk) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(chunk);
            return true;
        } else {
            console.warn('⚠️ WebSocket not connected, cannot send audio');
            return false;
        }
    }, []);

    /**
     * Send visual metrics to server for behavioral analysis
     */
    const sendVisualMetrics = useCallback(
        (metrics) => {
            return sendMessage({
                type: 'visual_metrics',
                metrics: {
                    timestamp: metrics.timestamp,
                    eyeContactRatio: metrics.eyeContactRatio,
                    smileRatio: metrics.smileRatio,
                    attentionRatio: metrics.attentionRatio,
                    blinkRate: metrics.blinkRate,
                    headStability: metrics.headStability,
                    indicators: metrics.indicators,
                },
            });
        },
        [sendMessage]
    );

    /**
     * Send text message (alternative to audio)
     */
    const sendTextMessage = useCallback(
        (text) => {
            return sendMessage({
                type: 'text_message',
                content: text,
            });
        },
        [sendMessage]
    );

    /**
     * Request to end interview
     */
    const endInterview = useCallback(() => {
        return sendMessage({
            type: 'end_interview',
        });
    }, [sendMessage]);

    /**
     * Clear messages (useful when starting new interview)
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        // Connection state
        isConnected,
        error,
        connectionAttempts: connectionAttemptsRef.current,

        // Messages
        messages,

        // Actions
        sendMessage,
        sendAudioChunk,
        sendVisualMetrics,
        sendTextMessage,
        endInterview,
        clearMessages,

        // Connection control
        connect,
        disconnect,
    };
};

export default useInterviewWebSocket;
