// src/components/ImageCard.js
import React from 'react';

const ImageCard = ({ imageUrl, author }: { imageUrl: string, author: string }) => {
    return (
        <div className="overflow-hidden cursor-pointer rounded-lg shadow-md">
            <img src={imageUrl} alt="Artwork" style={{ minWidth: 200 }} className=" object-cover" />
            <div className="p-4">
                <h3 className="text-md font-special">{author}</h3>
            </div>
        </div>
    );
};

export default ImageCard;
