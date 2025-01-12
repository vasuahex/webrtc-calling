import React from 'react';
import { motion } from 'framer-motion';
import { Video } from '../../interfaces/globalInterface';

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      onClick={() => onClick(video)}
    >
      <div className="relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full aspect-video object-cover"
        />
        <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-sm px-2 py-1 rounded">
          {video.duration}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 line-clamp-2">{video.title}</h3>
        <p className="text-sm text-gray-600 mt-1">{video.channel}</p>
        <p className="text-sm text-gray-500 mt-1">{video.views} views</p>
      </div>
    </motion.div>
  );
};

export default VideoCard