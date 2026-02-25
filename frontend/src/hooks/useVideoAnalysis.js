/**
 * useVideoAnalysis Hook
 *
 * Provides real-time facial analysis for interview assessment.
 * Uses MediaPipe Face Mesh for facial landmark detection and emotion analysis.
 *
 * Features:
 * - Eye contact detection (looking at camera)
 * - Facial expression analysis (confidence, stress, engagement)
 * - Head pose estimation
 * - Attention/distraction detection
 * - Periodic metrics reporting
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

// Landmark indices for key facial features
const LANDMARKS = {
    // Eyes
    LEFT_EYE: [33, 133, 160, 159, 158, 144, 145, 153],
    RIGHT_EYE: [362, 263, 387, 386, 385, 373, 374, 380],
    LEFT_IRIS: [468, 469, 470, 471, 472],
    RIGHT_IRIS: [473, 474, 475, 476, 477],
    // Eyebrows
    LEFT_EYEBROW: [70, 63, 105, 66, 107],
    RIGHT_EYEBROW: [336, 296, 334, 293, 300],
    // Mouth
    UPPER_LIP: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
    LOWER_LIP: [146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
    // Nose
    NOSE_TIP: 1,
    // Face outline for pose
    FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
};

// Analysis thresholds
const THRESHOLDS = {
    EYE_CONTACT_DEVIATION: 0.15, // Max deviation for eye contact
    BLINK_THRESHOLD: 0.2,
    SMILE_THRESHOLD: 0.3,
    HEAD_TURN_THRESHOLD: 0.2,
};

/**
 * Custom hook for real-time video analysis
 *
 * @param {Object} options Configuration options
 * @param {HTMLVideoElement} options.videoElement - Video element to analyze
 * @param {Function} options.onMetricsUpdate - Callback for metrics updates
 * @param {number} options.analysisInterval - Interval for analysis in ms (default 1000)
 * @param {boolean} options.enabled - Whether analysis is enabled
 * @returns {Object} Analysis state and controls
 */
export const useVideoAnalysis = ({
    videoElement,
    onMetricsUpdate,
    analysisInterval = 1000,
    enabled = true,
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [currentMetrics, setCurrentMetrics] = useState(null);

    // Refs
    const faceMeshRef = useRef(null);
    const cameraRef = useRef(null);
    const metricsBufferRef = useRef([]);
    const lastReportTimeRef = useRef(Date.now());

    // Accumulated metrics for reporting
    const accumulatedMetricsRef = useRef({
        eyeContactFrames: 0,
        totalFrames: 0,
        smileFrames: 0,
        attentiveFrames: 0,
        headPoseHistory: [],
        blinkCount: 0,
        lastBlinkState: false,
    });

    /**
     * Calculate Eye Aspect Ratio (EAR) for blink detection
     */
    const calculateEAR = useCallback((landmarks, eyeIndices) => {
        const getPoint = (idx) => landmarks[eyeIndices[idx]];

        // Vertical distances
        const v1 = Math.hypot(
            getPoint(1).x - getPoint(5).x,
            getPoint(1).y - getPoint(5).y
        );
        const v2 = Math.hypot(
            getPoint(2).x - getPoint(4).x,
            getPoint(2).y - getPoint(4).y
        );

        // Horizontal distance
        const h = Math.hypot(
            getPoint(0).x - getPoint(3).x,
            getPoint(0).y - getPoint(3).y
        );

        return (v1 + v2) / (2.0 * h);
    }, []);

    /**
     * Calculate iris position relative to eye for gaze detection
     */
    const calculateGaze = useCallback((landmarks) => {
        const leftEyeCenter = {
            x: landmarks[LANDMARKS.LEFT_EYE[0]].x,
            y: (landmarks[LANDMARKS.LEFT_EYE[1]].y + landmarks[LANDMARKS.LEFT_EYE[5]].y) / 2,
        };

        const rightEyeCenter = {
            x: landmarks[LANDMARKS.RIGHT_EYE[0]].x,
            y: (landmarks[LANDMARKS.RIGHT_EYE[1]].y + landmarks[LANDMARKS.RIGHT_EYE[5]].y) / 2,
        };

        // Iris centers (if available)
        const leftIris = landmarks[LANDMARKS.LEFT_IRIS[0]];
        const rightIris = landmarks[LANDMARKS.RIGHT_IRIS[0]];

        if (!leftIris || !rightIris) {
            return { x: 0, y: 0, isLookingAtCamera: true };
        }

        // Calculate deviation from center
        const leftDeviation = {
            x: leftIris.x - leftEyeCenter.x,
            y: leftIris.y - leftEyeCenter.y,
        };

        const rightDeviation = {
            x: rightIris.x - rightEyeCenter.x,
            y: rightIris.y - rightEyeCenter.y,
        };

        const avgDeviation = {
            x: (leftDeviation.x + rightDeviation.x) / 2,
            y: (leftDeviation.y + rightDeviation.y) / 2,
        };

        const isLookingAtCamera =
            Math.abs(avgDeviation.x) < THRESHOLDS.EYE_CONTACT_DEVIATION &&
            Math.abs(avgDeviation.y) < THRESHOLDS.EYE_CONTACT_DEVIATION;

        return {
            x: avgDeviation.x,
            y: avgDeviation.y,
            isLookingAtCamera,
        };
    }, []);

    /**
     * Calculate head pose from landmarks
     */
    const calculateHeadPose = useCallback((landmarks) => {
        const nose = landmarks[LANDMARKS.NOSE_TIP];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];

        // Yaw (left-right rotation)
        const faceWidth = rightCheek.x - leftCheek.x;
        const noseOffset = nose.x - (leftCheek.x + faceWidth / 2);
        const yaw = (noseOffset / faceWidth) * 2;

        // Pitch (up-down rotation) - simplified
        const forehead = landmarks[10];
        const chin = landmarks[152];
        const faceHeight = chin.y - forehead.y;
        const noseVerticalOffset = nose.y - (forehead.y + faceHeight / 2);
        const pitch = (noseVerticalOffset / faceHeight) * 2;

        // Roll (tilt) - based on eye level
        const leftEye = landmarks[LANDMARKS.LEFT_EYE[0]];
        const rightEye = landmarks[LANDMARKS.RIGHT_EYE[0]];
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

        return {
            yaw, // -1 (left) to 1 (right)
            pitch, // -1 (up) to 1 (down)
            roll, // in radians
            isFacingCamera: Math.abs(yaw) < THRESHOLDS.HEAD_TURN_THRESHOLD,
        };
    }, []);

    /**
     * Detect smile from mouth landmarks
     */
    const detectSmile = useCallback((landmarks) => {
        // Mouth corners
        const leftCorner = landmarks[61];
        const rightCorner = landmarks[291];
        const mouthWidth = rightCorner.x - leftCorner.x;

        // Upper and lower lip center
        const upperLip = landmarks[13];
        const lowerLip = landmarks[14];
        const mouthOpenness = lowerLip.y - upperLip.y;

        // Mouth corner elevation (relative to mouth center)
        const mouthCenterY = (upperLip.y + lowerLip.y) / 2;
        const cornerElevation = mouthCenterY - (leftCorner.y + rightCorner.y) / 2;

        // Smile is indicated by elevated corners and wider mouth
        const smileScore = (cornerElevation * 10 + mouthWidth * 5) / 2;

        return {
            isSmiling: smileScore > THRESHOLDS.SMILE_THRESHOLD,
            smileScore: Math.max(0, Math.min(1, smileScore)),
            mouthOpenness,
        };
    }, []);

    /**
     * Analyze facial expression for emotion indicators
     */
    const analyzeExpression = useCallback((landmarks) => {
        // Eyebrow position (raised = surprised/interested, lowered = concerned)
        const leftBrow = landmarks[LANDMARKS.LEFT_EYEBROW[2]];
        const rightBrow = landmarks[LANDMARKS.RIGHT_EYEBROW[2]];
        const leftEye = landmarks[LANDMARKS.LEFT_EYE[0]];
        const rightEye = landmarks[LANDMARKS.RIGHT_EYE[0]];

        const leftBrowElevation = leftEye.y - leftBrow.y;
        const rightBrowElevation = rightEye.y - rightBrow.y;
        const avgBrowElevation = (leftBrowElevation + rightBrowElevation) / 2;

        // Map to engagement/interest indicator
        const engagementScore = Math.min(1, Math.max(0, avgBrowElevation * 10));

        return {
            engagementScore,
            browPosition: avgBrowElevation,
        };
    }, []);

    /**
     * Process face mesh results
     */
    const onResults = useCallback((results) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            // No face detected
            metricsBufferRef.current.push({
                timestamp: Date.now(),
                faceDetected: false,
            });
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        const accumulated = accumulatedMetricsRef.current;

        // Calculate all metrics
        const gaze = calculateGaze(landmarks);
        const headPose = calculateHeadPose(landmarks);
        const smile = detectSmile(landmarks);
        const expression = analyzeExpression(landmarks);

        // Calculate EAR for blink detection
        const leftEAR = calculateEAR(landmarks, LANDMARKS.LEFT_EYE);
        const rightEAR = calculateEAR(landmarks, LANDMARKS.RIGHT_EYE);
        const avgEAR = (leftEAR + rightEAR) / 2;
        const isBlinking = avgEAR < THRESHOLDS.BLINK_THRESHOLD;

        // Count blinks
        if (isBlinking && !accumulated.lastBlinkState) {
            accumulated.blinkCount++;
        }
        accumulated.lastBlinkState = isBlinking;

        // Update accumulated metrics
        accumulated.totalFrames++;
        if (gaze.isLookingAtCamera) accumulated.eyeContactFrames++;
        if (smile.isSmiling) accumulated.smileFrames++;
        if (headPose.isFacingCamera && gaze.isLookingAtCamera) accumulated.attentiveFrames++;
        accumulated.headPoseHistory.push(headPose);

        // Keep only last 30 head poses for movement analysis
        if (accumulated.headPoseHistory.length > 30) {
            accumulated.headPoseHistory.shift();
        }

        // Current frame metrics
        const frameMetrics = {
            timestamp: Date.now(),
            faceDetected: true,
            gaze,
            headPose,
            smile,
            expression,
            isBlinking,
            eyeContactRatio: accumulated.eyeContactFrames / accumulated.totalFrames,
        };

        metricsBufferRef.current.push(frameMetrics);
        setCurrentMetrics(frameMetrics);

        // Report aggregated metrics periodically
        const now = Date.now();
        if (now - lastReportTimeRef.current >= analysisInterval) {
            reportMetrics();
            lastReportTimeRef.current = now;
        }
    }, [calculateGaze, calculateHeadPose, detectSmile, analyzeExpression, calculateEAR, analysisInterval]);

    /**
     * Calculate head movement stability
     */
    const calculateStability = useCallback(() => {
        const history = accumulatedMetricsRef.current.headPoseHistory;
        if (history.length < 5) return 1;

        // Calculate variance in head pose
        const yaws = history.map((h) => h.yaw);
        const pitches = history.map((h) => h.pitch);

        const yawVariance = calculateVariance(yaws);
        const pitchVariance = calculateVariance(pitches);

        // Higher variance = lower stability
        const stability = 1 - Math.min(1, (yawVariance + pitchVariance) * 10);
        return stability;
    }, []);

    /**
     * Report aggregated metrics
     */
    const reportMetrics = useCallback(() => {
        const accumulated = accumulatedMetricsRef.current;

        if (accumulated.totalFrames === 0) return;

        const metrics = {
            timestamp: Date.now(),
            eyeContactRatio: accumulated.eyeContactFrames / accumulated.totalFrames,
            smileRatio: accumulated.smileFrames / accumulated.totalFrames,
            attentionRatio: accumulated.attentiveFrames / accumulated.totalFrames,
            blinkRate: accumulated.blinkCount, // blinks per interval
            headStability: calculateStability(),
            // Derived behavioral indicators
            indicators: {
                confidence: calculateConfidenceScore(accumulated),
                engagement: calculateEngagementScore(accumulated),
                nervousness: calculateNervousnessScore(accumulated),
            },
        };

        // Reset accumulated metrics
        accumulatedMetricsRef.current = {
            eyeContactFrames: 0,
            totalFrames: 0,
            smileFrames: 0,
            attentiveFrames: 0,
            headPoseHistory: [],
            blinkCount: 0,
            lastBlinkState: false,
        };

        if (onMetricsUpdate) {
            onMetricsUpdate(metrics);
        }
    }, [onMetricsUpdate, calculateStability]);

    /**
     * Start video analysis
     */
    const startAnalysis = useCallback(async () => {
        if (!videoElement) {
            setError('Video element not available');
            return;
        }

        try {
            setError(null);

            // Initialize FaceMesh
            const faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                },
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true, // Enable iris landmarks
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            faceMesh.onResults(onResults);
            faceMeshRef.current = faceMesh;

            // Initialize Camera
            const camera = new Camera(videoElement, {
                onFrame: async () => {
                    if (faceMeshRef.current) {
                        await faceMeshRef.current.send({ image: videoElement });
                    }
                },
                width: 640,
                height: 480,
            });

            await camera.start();
            cameraRef.current = camera;

            setIsAnalyzing(true);
            console.log('📹 Video analysis started');
        } catch (err) {
            console.error('Error starting video analysis:', err);
            setError(err.message);
        }
    }, [videoElement, onResults]);

    /**
     * Stop video analysis
     */
    const stopAnalysis = useCallback(() => {
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }

        if (faceMeshRef.current) {
            faceMeshRef.current.close();
            faceMeshRef.current = null;
        }

        setIsAnalyzing(false);
        console.log('📹 Video analysis stopped');
    }, []);

    // Auto-start/stop based on enabled prop
    useEffect(() => {
        if (enabled && videoElement && !isAnalyzing) {
            // Wait for video to be ready before starting analysis
            const checkVideoReady = () => {
                if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA or better
                    console.log('📹 Video ready, starting analysis...');
                    startAnalysis();
                } else {
                    // Wait a bit more for video to load
                    setTimeout(checkVideoReady, 500);
                }
            };

            checkVideoReady();
        } else if (!enabled && isAnalyzing) {
            stopAnalysis();
        }
    }, [enabled, videoElement, isAnalyzing, startAnalysis, stopAnalysis]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAnalysis();
        };
    }, [stopAnalysis]);

    return {
        isAnalyzing,
        error,
        currentMetrics,
        startAnalysis,
        stopAnalysis,
    };
};

// Helper functions

function calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

function calculateConfidenceScore(metrics) {
    // High eye contact + good posture + some smiling = confidence
    const eyeContact = metrics.eyeContactFrames / Math.max(1, metrics.totalFrames);
    const attention = metrics.attentiveFrames / Math.max(1, metrics.totalFrames);
    const smiles = metrics.smileFrames / Math.max(1, metrics.totalFrames);

    return Math.min(1, (eyeContact * 0.4 + attention * 0.4 + smiles * 0.2));
}

function calculateEngagementScore(metrics) {
    // Attention + some head movement (not too static) = engagement
    const attention = metrics.attentiveFrames / Math.max(1, metrics.totalFrames);
    const headMovement = metrics.headPoseHistory.length > 5 ?
        calculateVariance(metrics.headPoseHistory.map(h => h.yaw)) * 10 : 0;
    const optimalMovement = Math.min(1, headMovement) * (1 - Math.max(0, headMovement - 0.5));

    return Math.min(1, attention * 0.7 + optimalMovement * 0.3);
}

function calculateNervousnessScore(metrics) {
    // High blink rate + excessive movement + low eye contact = nervousness
    const blinkRate = Math.min(1, metrics.blinkCount / 10); // Normalize to ~10 blinks per interval
    const eyeContactLack = 1 - (metrics.eyeContactFrames / Math.max(1, metrics.totalFrames));
    const excessiveMovement = metrics.headPoseHistory.length > 5 ?
        Math.min(1, calculateVariance(metrics.headPoseHistory.map(h => h.yaw)) * 20) : 0;

    return Math.min(1, (blinkRate * 0.3 + eyeContactLack * 0.4 + excessiveMovement * 0.3));
}

export default useVideoAnalysis;
