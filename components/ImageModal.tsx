
import React from 'react';
import { CloseIcon } from './icons';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-full"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking on the image itself
      >
        <img src={imageUrl} alt="Storyboard Preview" className="block max-h-[90vh] w-auto h-auto object-contain rounded-lg" />
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-white text-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-200 transition"
          aria-label="Close image preview"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
