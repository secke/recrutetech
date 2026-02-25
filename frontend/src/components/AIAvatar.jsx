/**
 * AIAvatar Component
 *
 * Animated AI interviewer avatar with lip-sync and expression animations.
 * Provides a visual representation of the AI agent during the interview.
 *
 * Features:
 * - Lip-sync animation based on audio playback
 * - Expression changes (neutral, speaking, listening, thinking)
 * - Smooth idle animations (blinking, subtle movements)
 * - Responsive design
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Avatar states
const AvatarState = {
    IDLE: 'idle',
    SPEAKING: 'speaking',
    LISTENING: 'listening',
    THINKING: 'thinking',
};

// Avatar configuration
const AVATAR_CONFIG = {
    // Animation speeds
    blinkInterval: 4000,
    blinkDuration: 150,
    mouthAnimationSpeed: 50,
    idleMovementSpeed: 3000,

    // Colors
    skinColor: '#F5D0C5',
    hairColor: '#4A3728',
    eyeColor: '#2E86AB',
    lipColor: '#C76B7F',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const AIAvatar = ({
    state = AvatarState.IDLE,
    audioElement = null,
    name = 'Sarah',
    title = 'AI Interviewer',
    size = 200,
}) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    // Use ref for mouthOpenness to avoid re-render loops in animation
    const mouthOpennessRef = useRef(0);
    const [isBlinking, setIsBlinking] = useState(false);
    const [headTilt, setHeadTilt] = useState(0);
    const analyserRef = useRef(null);
    const audioContextRef = useRef(null);

    /**
     * Setup audio analyzer for lip-sync
     */
    useEffect(() => {
        if (!audioElement) return;

        const setupAudioAnalyzer = () => {
            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                }

                const audioContext = audioContextRef.current;

                // Create analyzer if not exists
                if (!analyserRef.current) {
                    analyserRef.current = audioContext.createAnalyser();
                    analyserRef.current.fftSize = 256;

                    // Connect audio element to analyzer
                    const source = audioContext.createMediaElementSource(audioElement);
                    source.connect(analyserRef.current);
                    analyserRef.current.connect(audioContext.destination);
                }
            } catch (err) {
                console.error('Error setting up audio analyzer:', err);
            }
        };

        // Setup when audio starts playing
        const handlePlay = () => {
            setupAudioAnalyzer();
        };

        audioElement.addEventListener('play', handlePlay);

        return () => {
            audioElement.removeEventListener('play', handlePlay);
        };
    }, [audioElement]);

    /**
     * Analyze audio for lip-sync
     */
    const analyzeLipSync = useCallback(() => {
        if (!analyserRef.current || state !== AvatarState.SPEAKING) {
            mouthOpennessRef.current = 0;
            return;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average amplitude (focus on speech frequencies 100-3000 Hz)
        const speechRange = dataArray.slice(2, 30);
        const average = speechRange.reduce((a, b) => a + b, 0) / speechRange.length;

        // Normalize to 0-1 range with some smoothing
        const normalizedLevel = Math.min(1, average / 128);
        mouthOpennessRef.current = normalizedLevel * 0.8 + mouthOpennessRef.current * 0.2;
    }, [state]);

    /**
     * Blinking animation
     */
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), AVATAR_CONFIG.blinkDuration);
        }, AVATAR_CONFIG.blinkInterval + Math.random() * 2000);

        return () => clearInterval(blinkInterval);
    }, []);

    /**
     * Idle head movement
     */
    useEffect(() => {
        const moveHead = () => {
            const newTilt = (Math.random() - 0.5) * 6;
            setHeadTilt(newTilt);
        };

        const interval = setInterval(moveHead, AVATAR_CONFIG.idleMovementSpeed);
        return () => clearInterval(interval);
    }, []);

    /**
     * Main animation loop
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = size / 2;
        const centerY = size / 2;

        const draw = () => {
            // Clear canvas
            ctx.clearRect(0, 0, size, size);

            // Apply head tilt
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate((headTilt * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);

            // Draw face background (circle)
            const faceRadius = size * 0.38;
            ctx.beginPath();
            ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2);
            ctx.fillStyle = AVATAR_CONFIG.skinColor;
            ctx.fill();

            // Draw hair
            ctx.beginPath();
            ctx.arc(centerX, centerY - faceRadius * 0.15, faceRadius * 1.1, Math.PI, 0, false);
            ctx.fillStyle = AVATAR_CONFIG.hairColor;
            ctx.fill();

            // Side hair
            ctx.beginPath();
            ctx.ellipse(centerX - faceRadius * 0.85, centerY, faceRadius * 0.3, faceRadius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(centerX + faceRadius * 0.85, centerY, faceRadius * 0.3, faceRadius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw eyes
            const eyeY = centerY - faceRadius * 0.1;
            const eyeSpacing = faceRadius * 0.35;
            const eyeWidth = faceRadius * 0.2;
            const eyeHeight = isBlinking ? faceRadius * 0.02 : faceRadius * 0.12;

            // Left eye
            ctx.beginPath();
            ctx.ellipse(centerX - eyeSpacing, eyeY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Left iris
            if (!isBlinking) {
                ctx.beginPath();
                ctx.arc(centerX - eyeSpacing, eyeY, faceRadius * 0.08, 0, Math.PI * 2);
                ctx.fillStyle = AVATAR_CONFIG.eyeColor;
                ctx.fill();

                // Left pupil
                ctx.beginPath();
                ctx.arc(centerX - eyeSpacing, eyeY, faceRadius * 0.04, 0, Math.PI * 2);
                ctx.fillStyle = '#000';
                ctx.fill();

                // Eye highlight
                ctx.beginPath();
                ctx.arc(centerX - eyeSpacing - faceRadius * 0.02, eyeY - faceRadius * 0.02, faceRadius * 0.015, 0, Math.PI * 2);
                ctx.fillStyle = '#FFF';
                ctx.fill();
            }

            // Right eye
            ctx.beginPath();
            ctx.ellipse(centerX + eyeSpacing, eyeY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.stroke();

            // Right iris
            if (!isBlinking) {
                ctx.beginPath();
                ctx.arc(centerX + eyeSpacing, eyeY, faceRadius * 0.08, 0, Math.PI * 2);
                ctx.fillStyle = AVATAR_CONFIG.eyeColor;
                ctx.fill();

                // Right pupil
                ctx.beginPath();
                ctx.arc(centerX + eyeSpacing, eyeY, faceRadius * 0.04, 0, Math.PI * 2);
                ctx.fillStyle = '#000';
                ctx.fill();

                // Eye highlight
                ctx.beginPath();
                ctx.arc(centerX + eyeSpacing - faceRadius * 0.02, eyeY - faceRadius * 0.02, faceRadius * 0.015, 0, Math.PI * 2);
                ctx.fillStyle = '#FFF';
                ctx.fill();
            }

            // Draw eyebrows
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = AVATAR_CONFIG.hairColor;
            ctx.lineCap = 'round';

            // Expression-based eyebrow position
            let eyebrowOffset = 0;
            if (state === AvatarState.THINKING) {
                eyebrowOffset = -3;
            } else if (state === AvatarState.LISTENING) {
                eyebrowOffset = 2;
            }

            // Left eyebrow
            ctx.beginPath();
            ctx.moveTo(centerX - eyeSpacing - eyeWidth, eyeY - faceRadius * 0.25 + eyebrowOffset);
            ctx.quadraticCurveTo(
                centerX - eyeSpacing, eyeY - faceRadius * 0.32 + eyebrowOffset,
                centerX - eyeSpacing + eyeWidth, eyeY - faceRadius * 0.25 + eyebrowOffset
            );
            ctx.stroke();

            // Right eyebrow
            ctx.beginPath();
            ctx.moveTo(centerX + eyeSpacing - eyeWidth, eyeY - faceRadius * 0.25 + eyebrowOffset);
            ctx.quadraticCurveTo(
                centerX + eyeSpacing, eyeY - faceRadius * 0.32 + eyebrowOffset,
                centerX + eyeSpacing + eyeWidth, eyeY - faceRadius * 0.25 + eyebrowOffset
            );
            ctx.stroke();

            // Draw nose
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - faceRadius * 0.05);
            ctx.lineTo(centerX - faceRadius * 0.06, centerY + faceRadius * 0.15);
            ctx.lineTo(centerX + faceRadius * 0.06, centerY + faceRadius * 0.15);
            ctx.strokeStyle = '#D4A99A';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw mouth
            const mouthY = centerY + faceRadius * 0.35;
            const mouthWidth = faceRadius * 0.35;
            const mouthOpen = mouthOpennessRef.current * faceRadius * 0.15;

            ctx.beginPath();

            if (state === AvatarState.SPEAKING && mouthOpennessRef.current > 0.1) {
                // Open mouth for speaking
                ctx.ellipse(centerX, mouthY, mouthWidth, faceRadius * 0.08 + mouthOpen, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#8B4557';
                ctx.fill();

                // Teeth hint
                ctx.beginPath();
                ctx.ellipse(centerX, mouthY - mouthOpen * 0.3, mouthWidth * 0.8, faceRadius * 0.04, 0, Math.PI, 0);
                ctx.fillStyle = '#FFF';
                ctx.fill();
            } else {
                // Closed/smiling mouth
                ctx.moveTo(centerX - mouthWidth, mouthY);
                ctx.quadraticCurveTo(
                    centerX, mouthY + faceRadius * 0.08,
                    centerX + mouthWidth, mouthY
                );
                ctx.strokeStyle = AVATAR_CONFIG.lipColor;
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // Draw blush
            ctx.beginPath();
            ctx.ellipse(centerX - faceRadius * 0.45, centerY + faceRadius * 0.1, faceRadius * 0.12, faceRadius * 0.08, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(centerX + faceRadius * 0.45, centerY + faceRadius * 0.1, faceRadius * 0.12, faceRadius * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Analyze audio for next frame
            analyzeLipSync();

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [size, isBlinking, headTilt, state, analyzeLipSync]);

    /**
     * Get state indicator
     */
    const getStateIndicator = () => {
        switch (state) {
            case AvatarState.SPEAKING:
                return { color: 'bg-blue-500', text: 'Parle...' };
            case AvatarState.LISTENING:
                return { color: 'bg-green-500', text: 'Écoute...' };
            case AvatarState.THINKING:
                return { color: 'bg-yellow-500', text: 'Réfléchit...' };
            default:
                return { color: 'bg-gray-500', text: 'En attente' };
        }
    };

    const stateIndicator = getStateIndicator();

    return (
        <div className="flex flex-col items-center">
            {/* Avatar container */}
            <div
                className="relative rounded-full overflow-hidden shadow-2xl"
                style={{
                    width: size,
                    height: size,
                    background: AVATAR_CONFIG.backgroundColor,
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={size}
                    height={size}
                    className="w-full h-full"
                />

                {/* State indicator ring */}
                {state === AvatarState.SPEAKING && (
                    <div
                        className="absolute inset-0 rounded-full animate-pulse"
                        style={{
                            border: '3px solid rgba(59, 130, 246, 0.6)',
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                        }}
                    />
                )}
            </div>

            {/* Name and status */}
            <div className="mt-3 text-center">
                <p className="font-medium text-white">{name}</p>
                <p className="text-xs text-gray-400">{title}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${stateIndicator.color} ${state === AvatarState.SPEAKING ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-gray-400">{stateIndicator.text}</span>
                </div>
            </div>
        </div>
    );
};

// Export avatar states for external use
export { AvatarState };
export default AIAvatar;
