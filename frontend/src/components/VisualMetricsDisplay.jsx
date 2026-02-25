/**
 * VisualMetricsDisplay Component
 *
 * Displays real-time visual analysis metrics from the candidate's video feed.
 * Shows indicators for confidence, engagement, eye contact, and nervousness.
 */

import React from 'react';
import { Eye, Smile, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

const VisualMetricsDisplay = ({ metrics, isAnalyzing }) => {
    if (!isAnalyzing || !metrics) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-gray-500">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm">Analyse visuelle en attente...</span>
                </div>
            </div>
        );
    }

    const { indicators = {}, eyeContactRatio = 0, smileRatio = 0, attentionRatio = 0 } = metrics;

    const getColorClass = (value, inverse = false) => {
        const v = inverse ? 1 - value : value;
        if (v >= 0.7) return 'text-green-400 bg-green-400';
        if (v >= 0.4) return 'text-yellow-400 bg-yellow-400';
        return 'text-red-400 bg-red-400';
    };

    const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

    const MetricBar = ({ label, value, icon: Icon, inverse = false }) => (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                </div>
                <span className={getColorClass(value, inverse).split(' ')[0]}>
                    {formatPercent(value)}
                </span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${getColorClass(value, inverse).split(' ')[1]}`}
                    style={{ width: `${(value || 0) * 100}%`, opacity: 0.8 }}
                />
            </div>
        </div>
    );

    return (
        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Analyse Comportementale
                </h4>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500">En direct</span>
                </div>
            </div>

            {/* Main indicators */}
            <div className="grid grid-cols-2 gap-3">
                <MetricBar
                    label="Confiance"
                    value={indicators.confidence}
                    icon={TrendingUp}
                />
                <MetricBar
                    label="Engagement"
                    value={indicators.engagement}
                    icon={Activity}
                />
                <MetricBar
                    label="Contact Visuel"
                    value={eyeContactRatio}
                    icon={Eye}
                />
                <MetricBar
                    label="Nervosité"
                    value={indicators.nervousness}
                    icon={AlertTriangle}
                    inverse={true}
                />
            </div>

            {/* Secondary metrics */}
            <div className="pt-2 border-t border-gray-700">
                <div className="flex justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Smile className="w-3 h-3" />
                        <span>Sourires: {formatPercent(smileRatio)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>Attention: {formatPercent(attentionRatio)}</span>
                    </div>
                </div>
            </div>

            {/* Face detection status */}
            {metrics.faceDetected === false && (
                <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 px-3 py-2 rounded">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Visage non détecté - assurez-vous d'être face à la caméra</span>
                </div>
            )}
        </div>
    );
};

export default VisualMetricsDisplay;
