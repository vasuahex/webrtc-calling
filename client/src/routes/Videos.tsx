
const SAMPLE_VIDEOS: Video[] = [
  {
    id: '99',
    title: 'Discover the Beauty of Nature',
    thumbnail: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    channel: 'Nature Wonders',
    views: '1.2M',
    duration: '15:45'
  },
  {
    id: '98',
    title: 'Top 10 Travel Destinations',
    thumbnail: 'https://img.freepik.com/premium-photo/thumbnail-design-with-mountain-landscape_1272857-93437.jpg?w=996',
    channel: 'Travel Guru',
    views: '980K',
    duration: '8:20'
  },
  {
    id: '97',
    title: 'Mastering JavaScript in 2025',
    thumbnail: 'https://www.vdocipher.com/blog/wp-content/uploads/2023/12/DALL%C2%B7E-2023-12-10-20.21.58-A-creative-and-visually-appealing-featured-image-for-a-blog-about-video-thumbnails-for-various-social-platforms-like-YouTube-Instagram-and-TikTok-s-1536x878.png',
    channel: 'Code Academy',
    views: '2.3M',
    duration: '22:30'
  },
  {
    id: '95',
    title: 'Cooking Delicious Pasta at Home',
    thumbnail: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    channel: 'Foodies Hub',
    views: '600K',
    duration: '9:50'
  }
];

import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/videoplayer/Header';
import VideoList from '../components/videoplayer/VideoList';
import VideoPlayer from '../components/videoplayer/VideoPlayer';
import { Video } from '../interfaces/globalInterface';
import axios from 'axios';

interface ApiResponse {
  results: {
    id: string;
    urls: {
      small: string; // Thumbnail size
      regular: string; // Larger size for better quality
    };
    alt_description: string | null; // Description of the image
  }[];
  total: number;
  total_pages: number;
}

const App: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [sampleVideos, setSampleVideos] = useState<Video[]>(SAMPLE_VIDEOS);

  // Fetch thumbnails for a specific category
  const fetchThumbnailsByCategory = useCallback(async (category: string, page: number = 1): Promise<Video[]> => {
    try {
      const response = await axios.get<ApiResponse>('https://api.unsplash.com/search/photos', {
        params: {
          client_id: '_K9hXgi0a81O6x2sfib0yDsuYJpSxs_rMUXY407FK2g',
          query: category,
          page: 1,
          per_page: 5, // Fetch 5 images as requested
          content_filter: 'high',
        },
      });

      const thumbnails: Video[] = response.data.results.map((image, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        channel: `Channel - ${category}`,
        duration: `${(index + 1) * 5}:00`,
        thumbnail: image.urls.regular,
        title: image.alt_description || 'Untitled',
        views: `${(index + 1) * 10} K`,
      }));

      return thumbnails;
    } catch (error: any) {
      console.error(`Error fetching images for category "${category}": `, error.message);
      return [];
    }
  }, []);

  useEffect(() => {
    // Memoize and fetch thumbnails only once
    const fetchThumbnails = async () => {
      const categories = ['nature', 'technology', 'travel', 'food', 'fashion']; // Replace with your desired categories
      const allVideos: Video[] = [];
      let i = 1;
      for (const category of categories) {
        const thumbnails = await fetchThumbnailsByCategory(category, i);
        allVideos.push(...thumbnails); // Append thumbnails for each category
        i++
      }

      setSampleVideos([...sampleVideos, ...allVideos]); // Update state with combined results
    };

    fetchThumbnails();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-8">
        {selectedVideo ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VideoPlayer video={selectedVideo} setSelectedVideo={setSelectedVideo} />
              <div className="mt-4">
                <h1 className="text-xl font-bold">{selectedVideo.title}</h1>
                <p className="text-gray-600 mt-2">{selectedVideo.channel}</p>
                <p className="text-gray-500">{selectedVideo.views} views</p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-4">Suggested Videos</h2>
              <VideoList
                videos={sampleVideos.filter((v) => v.id !== selectedVideo?.id)}
                onVideoSelect={setSelectedVideo}
                layout="list"
              />
            </div>
          </div>
        ) : (
          <VideoList
            videos={sampleVideos}
            onVideoSelect={setSelectedVideo}
          />
        )}
      </main>
    </div>
  );
};

export default App;
