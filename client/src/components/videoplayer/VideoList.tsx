import React from 'react';
import { Video } from '../../interfaces/globalInterface';
import VideoCard from './VideoCard';

interface VideoListProps {
  videos: Video[];
  onVideoSelect: (video: Video) => void;
  layout?: 'grid' | 'list';
}

const VideoList: React.FC<VideoListProps> = ({ 
  videos, 
  onVideoSelect, 
  layout = 'grid' 
}) => {
  return (
    <div className={`
      grid gap-4
      ${layout === 'grid' 
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
        : 'grid-cols-1'
      }
    `}>
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onClick={onVideoSelect}
        />
      ))}
    </div>
  );
};

export default VideoList

