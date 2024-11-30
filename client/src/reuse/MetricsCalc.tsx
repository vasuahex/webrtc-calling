import React, { useState, useEffect } from 'react';
import { Gauge } from 'lucide-react';
import MediaSoupTypes, { Consumer } from 'mediasoup-client/lib/types';

interface LayerDetails {
    maxBitrate: number;
    scale: number;
}

interface Stats {
    bitrate: number;
    resolution: string;
    frameRate: number;
    qualityScore: number;
    currentLayer: 'r0' | 'r1' | 'r2';
    layerDetails: {
        r0: LayerDetails;
        r1: LayerDetails;
        r2: LayerDetails;
    };
}

interface VideoQualityMetricsProps {
    producer: Consumer
}

const VideoQualityMetrics: React.FC<VideoQualityMetricsProps> = ({ producer }) => {
    const [stats, setStats] = useState<Stats>({
        bitrate: 0,
        resolution: '',
        frameRate: 0,
        qualityScore: 100,
        currentLayer: 'r2',
        layerDetails: {
            r0: { maxBitrate: 100000, scale: 4 },
            r1: { maxBitrate: 300000, scale: 2 },
            r2: { maxBitrate: 900000, scale: 1 },
        },
    });

    useEffect(() => {
        if (!producer) return;

        const getStats = async () => {
            try {
                const statsMap = await producer.getStats();
                console.log(statsMap);

                const videoStats = Array.from(statsMap.values()).find(
                    (stat) => stat.type === 'outbound-rtp' && stat.kind === 'video'
                );
                console.log(videoStats);

                if (videoStats) {
                    const bitrate = Math.floor(
                        ((videoStats.bytesSent - (videoStats.lastBytesSent || 0)) * 8) / 1000
                    );

                    // Determine current layer based on bitrate
                    let currentLayer: 'r0' | 'r1' | 'r2' = 'r2';
                    if (bitrate <= 100) currentLayer = 'r0';
                    else if (bitrate <= 300) currentLayer = 'r1';

                    const resolution = `${videoStats.frameWidth || 0}x${videoStats.frameHeight || 0}`;
                    const frameRate = Math.round(videoStats.framesPerSecond || 0);

                    setStats((prevStats) => ({
                        ...prevStats,
                        bitrate,
                        resolution,
                        frameRate,
                        currentLayer,
                        qualityScore: calculateQualityScore(bitrate, frameRate, resolution, currentLayer),
                    }));

                    // Update last values for next calculation
                    videoStats.lastBytesSent = videoStats.bytesSent;
                }
            } catch (error) {
                console.error('Error getting video stats:', error);
            }
        };

        const interval = setInterval(getStats, 1000);
        return () => clearInterval(interval);
    }, [producer]);

    const calculateQualityScore = (
        bitrate: number,
        fps: number,
        resolution: string,
        currentLayer: 'r0' | 'r1' | 'r2'
    ): number => {
        const { layerDetails } = stats;

        // Base scores
        let bitrateScore = 0;
        let fpsScore = 0;
        let resolutionScore = 0;

        // Bitrate scoring based on layers
        const layerMaxBitrate = layerDetails[currentLayer].maxBitrate / 1000; // Convert to kbps
        bitrateScore = Math.min(100, (bitrate / layerMaxBitrate) * 100);

        // FPS scoring (assuming target is 30fps)
        fpsScore = Math.min(100, (fps / 30) * 100);

        // Resolution scoring
        const [width] = resolution.split('x').map(Number);
        if (width >= 1280) resolutionScore = 100;
        else if (width >= 640) resolutionScore = 75;
        else resolutionScore = 50;

        // Weighted average
        return Math.round(bitrateScore * 0.4 + fpsScore * 0.3 + resolutionScore * 0.3);
    };

    const getQualityColor = (score: number): string => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getLayerDescription = (layer: 'r0' | 'r1' | 'r2'): string => {
        const descriptions: Record<'r0' | 'r1' | 'r2', string> = {
            r0: 'Low Quality',
            r1: 'Medium Quality',
            r2: 'High Quality',
        };
        return descriptions[layer];
    };

    return (
        <div className="w-64 bg-white shadow-lg rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-medium text-gray-800">Video Quality</h2>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Quality Score:</span>
                    <span className={`font-medium ${getQualityColor(stats.qualityScore)}`}>
                        {stats.qualityScore}%
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Layer:</span>
                    <span className="font-medium">{getLayerDescription(stats.currentLayer)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Bitrate:</span>
                    <span className="font-medium">{stats.bitrate} kbps</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Resolution:</span>
                    <span className="font-medium">{stats.resolution}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Frame Rate:</span>
                    <span className="font-medium">{stats.frameRate} fps</span>
                </div>
            </div>
        </div>
    );
};

export default VideoQualityMetrics;
