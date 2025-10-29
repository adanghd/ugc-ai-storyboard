
import React from 'react';
import { AspectRatio, StoryboardFrame } from '../types';
import { DownloadIcon, RefreshIcon } from './icons';

interface FrameCardProps {
  frame: StoryboardFrame;
  aspectRatio: AspectRatio;
  isRegenerating: boolean;
  onRegenerate: (frameId: number) => void;
  onViewImage: (imageUrl: string) => void;
}

const getAspectRatioClass = (ratio: AspectRatio) => {
    if (ratio === '1:1') return 'aspect-square';
    if (ratio === '16:9') return 'aspect-video';
    return 'aspect-[9/16]'; // Default to 9:16
};


export const FrameCard: React.FC<FrameCardProps> = ({ frame, aspectRatio, isRegenerating, onRegenerate, onViewImage }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = frame.imageUrl;
    link.download = `storyboard-frame-${frame.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-shrink-0 w-72 bg-gray-800 rounded-lg overflow-hidden shadow-lg transform transition-all hover:scale-[1.02] hover:shadow-indigo-500/20">
      <div className={`relative group w-full ${getAspectRatioClass(aspectRatio)} bg-gray-900`}>
        <img 
          src={frame.imageUrl} 
          alt={`Storyboard frame ${frame.id}`} 
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
          onClick={() => onViewImage(frame.imageUrl)}
        />
        {isRegenerating && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-white"></div>
            </div>
        )}
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">{`FRAME ${frame.id}`}</div>
        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full capitalize">{frame.cameraAngle}</div>
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleDownload} disabled={isRegenerating} className="bg-indigo-600/70 text-white p-2 rounded-full hover:bg-indigo-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
              <DownloadIcon className="w-4 h-4" />
            </button>
            <button onClick={() => onRegenerate(frame.id)} disabled={isRegenerating} className="bg-gray-600/70 text-white p-2 rounded-full hover:bg-gray-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
              <RefreshIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-300 italic">"{frame.script}"</p>
      </div>
    </div>
  );
};
