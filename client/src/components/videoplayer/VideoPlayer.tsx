import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import { Video } from '../../interfaces/globalInterface';
import { IoIosArrowBack } from "react-icons/io";

interface VideoPlayerProps {
  video: Video;
  setSelectedVideo: React.Dispatch<React.SetStateAction<Video | null>>;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, setSelectedVideo }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVideoStream = async (start: number, end: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const key = '1732975201330-_[Full_Song]_Dabangg__Feat._Malaika_Arora_Khan(480p).mp4';
      const range = `${start}-${end}`;
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/play/${key}`,
        {
          headers: {
            Range: `bytes=${range}`,
          },
          responseType: 'blob'
        }
      );
      console.log(response);

      const url = URL.createObjectURL(response.data);

      if (videoRef.current) {
        videoRef.current.src = url;
      }
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : 'An error occurred while loading the video';

      setError(errorMessage);
      console.error('Error loading video:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let isMounted = true;
    const abortController = new AbortController();

    const handleTimeUpdate = () => {
      if (!videoElement || !isMounted) return;

      const currentTime = videoElement.currentTime;
      const duration = videoElement.duration;

      // Calculate buffer size (e.g., 30 seconds ahead)
      const bufferSize = 30;
      const currentPosition = Math.floor(currentTime);
      const endPosition = Math.min(currentPosition + bufferSize, duration);

      // Convert to bytes (assuming average bitrate of 1MB per second - adjust as needed)
      const bytesPerSecond = 1024 * 1024; // 1MB
      const startByte = currentPosition * bytesPerSecond;
      const endByte = endPosition * bytesPerSecond;

      // Only request new chunk if we're not already loading
      if (!isLoading) {
        handleVideoStream(startByte, endByte);
      }
    };

    // Configure axios instance for video streaming
    const axiosInstance = axios.create({
      timeout: 30000, // 30 second timeout
      signal: abortController.signal,
    });

    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    // Initial load of first chunk
    handleVideoStream(0, 1024 * 1024); // First 1MB

    return () => {
      isMounted = false;
      abortController.abort();
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);

      // Cleanup URLs when component unmounts
      if (videoElement.src) {
        URL.revokeObjectURL(videoElement.src);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setSelectedVideo(null)}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
      >
        <IoIosArrowBack size={20} />
        <span>Back</span>
      </button>

      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white bg-red-500 px-4 py-2 rounded-lg">
              {error}
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          playsInline
          controlsList="nodownload"
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="text-lg font-semibold">
        {video.title || 'Untitled Video'}
      </div>
    </div>
  );
};

export default VideoPlayer;