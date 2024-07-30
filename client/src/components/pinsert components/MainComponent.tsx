// src/components/MainContent.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ImageCard from './ImageCard';
import ImageModal from './ImageModal';
import { debounce } from 'lodash';

interface Image {
    id: string;
    urls: {
        small: string;
        regular: string;
    };
    user: {
        name: string;
    };
}

type ApiResponse = {
    results: Image[];
};

interface MainContentProps {
    category: string;
}

const MainContent: React.FC<MainContentProps> = ({ category }) => {
    const [images, setImages] = useState<Image[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchImages = useCallback(async () => {
        if (!hasMore || loading) return;

        setLoading(true);
        try {
            const response = await axios.get<ApiResponse>('https://api.unsplash.com/search/photos', {
                params: {
                    client_id: '_K9hXgi0a81O6x2sfib0yDsuYJpSxs_rMUXY407FK2g',
                    query: category,
                    page,
                    per_page: 15,
                    content_filter: 'high',
                },
            });
            if (response.data.results.length === 0) {
                setHasMore(false);
            } else {
                setImages((prevImages) => [...prevImages, ...response.data.results]);
                setPage((prevPage) => prevPage + 1);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        }
        setLoading(false);
    }, [page, category, hasMore, loading]);

    useEffect(() => {
        setImages([]);
        setPage(1);
        setHasMore(true);
        fetchImages();
    }, [category]);

    const debouncedFetchImages = useCallback(
        debounce(() => {
            fetchImages();
        }, 200),
        [fetchImages]
    );

    const handleScroll = useCallback(() => {
        if (
            window.innerHeight + document.documentElement.scrollTop >=
            document.documentElement.offsetHeight - 100
        ) {
            debouncedFetchImages();
        }
    }, [debouncedFetchImages]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [handleScroll]);

    const openModal = (index: number) => {
        setSelectedImageIndex(index);
    };

    const closeModal = () => {
        setSelectedImageIndex(null);
    };

    const showPrevImage = () => {
        if (selectedImageIndex !== null && selectedImageIndex > 0) {
            setSelectedImageIndex(selectedImageIndex - 1);
        }
    };

    const showNextImage = () => {
        if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
            setSelectedImageIndex(selectedImageIndex + 1);
        }
    };

    return (
        <div className="flex-1 p-4">
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-4 gap-4">
                {images.map((image, index: number) => (
                    <div key={image.id} className="mb-4 break-inside-avoid" onClick={() => openModal(index)}>
                        <ImageCard imageUrl={image.urls.small} author={image.user.name} />
                    </div>
                ))}
            </div>
            {loading && <div className="text-center py-4">Loading...</div>}

            {selectedImageIndex !== null && (
                <ImageModal
                    imageUrl={images[selectedImageIndex].urls.regular}
                    onClose={closeModal}
                    onPrev={showPrevImage}
                    onNext={showNextImage}
                />
            )}
        </div>
    );
};

export default MainContent;
