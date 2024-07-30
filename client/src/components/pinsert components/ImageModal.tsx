// src/components/ImageModal.tsx
import React from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose, onPrev, onNext }) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="relative max-w-3xl w-full mx-4">
        <button className="absolute left-0 top-1/2 transform -translate-y-1/2 text-white text-2xl p-2" onClick={onPrev}>
          <FaArrowLeft />
        </button>
        <img src={imageUrl} alt="Selected" className="max-h-screen w-full object-contain" />
        <button className="absolute right-0 top-1/2 transform -translate-y-1/2 text-white text-2xl p-2" onClick={onNext}>
          <FaArrowRight />
        </button>
        <button className="absolute top-0 right-0 text-white text-2xl p-2" onClick={onClose}>
          &times;
        </button>
      </div>
    </div>
  );
};

export default ImageModal;
