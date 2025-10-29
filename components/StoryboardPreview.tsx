
import React from 'react';
import { AspectRatio, StoryboardResult } from '../types';
import { FrameCard } from './FrameCard';
import { MusicIcon, RefreshIcon } from './icons';

interface StoryboardPreviewProps {
  result: StoryboardResult | null;
  isLoading: boolean;
  progress: string;
  progressPercent: number;
  regeneratingFrameId: number | null;
  aspectRatio: AspectRatio;
  onRegenerateFrame: (frameId: number) => void;
  onViewImage: (imageUrl: string) => void;
  onRegenerateText: () => void;
}

const LoadingSkeleton: React.FC<{aspectRatio: AspectRatio}> = ({aspectRatio}) => {
    const getAspectRatioClass = (ratio: AspectRatio) => {
        if (ratio === '1:1') return 'aspect-square';
        if (ratio === '16:9') return 'aspect-video';
        return 'aspect-[9/16]';
    };
    return <div className={`flex-shrink-0 w-72 h-auto ${getAspectRatioClass(aspectRatio)} bg-gray-700 animate-pulse rounded-lg`}></div>
};

export const StoryboardPreview: React.FC<StoryboardPreviewProps> = ({ 
    result, 
    isLoading, 
    progress,
    progressPercent,
    regeneratingFrameId,
    aspectRatio,
    onRegenerateFrame,
    onViewImage,
    onRegenerateText,
}) => {
  if (isLoading && !result) { // Show this only on initial full generation
    return (
      <div className="p-6 bg-gray-800/50 rounded-lg flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500 mx-auto"></div>
        <h3 className="mt-4 text-xl font-semibold text-white">AI sedang bekerja...</h3>
        <p className="text-gray-400 mt-2">{progress}</p>
        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
            <div className="bg-indigo-600 h-2.5 rounded-full" style={{width: `${progressPercent}%`, transition: 'width 0.3s ease-in-out'}}></div>
        </div>
        <p className="text-sm text-indigo-300 font-bold mt-2">{progressPercent}%</p>
        
        <div className="mt-8 w-full">
            <h3 className="text-lg font-medium text-left text-gray-300 mb-4">Preview Storyboard</h3>
            <div className="flex space-x-4 overflow-x-hidden pb-4">
                {[...Array(5)].map((_, i) => <LoadingSkeleton key={i} aspectRatio={aspectRatio} />)}
            </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-6 bg-gray-800/50 rounded-lg flex flex-col items-center justify-center h-full text-center">
        <svg className="w-24 h-24 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-4 text-xl font-semibold text-white">Output Storyboard Anda</h3>
        <p className="text-gray-400 mt-2">Isi formulir di sebelah kiri untuk mulai membuat storyboard UGC bertenaga AI Anda.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800/50 rounded-lg h-full overflow-y-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Hasil Storyboard</h2>
      </div>
      
      <div>
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-indigo-400">Hook (8 Detik Pertama)</h3>
            <button onClick={onRegenerateText} disabled={isLoading} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                <RefreshIcon className="w-3 h-3"/> Generate Ulang
            </button>
        </div>
        <p className="mt-2 text-gray-300 bg-gray-900 p-3 rounded-md italic">"{result.hook}"</p>
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-indigo-400">Timeline Storyboard</h3>
        <div className="mt-4 flex space-x-6 overflow-x-auto pb-4">
          {result.frames.map(frame => (
            <FrameCard 
              key={frame.id} 
              frame={frame}
              aspectRatio={aspectRatio}
              isRegenerating={regeneratingFrameId === frame.id}
              onRegenerate={onRegenerateFrame}
              onViewImage={onViewImage}
            />
          ))}
        </div>
      </div>
      
      {result.musicPrompt && (
        <div>
          <h3 className="text-lg font-medium text-indigo-400 flex items-center gap-2"><MusicIcon className="w-5 h-5"/>Prompt Musik Latar (Suno AI)</h3>
          <p className="mt-2 text-gray-300 bg-gray-900 p-3 rounded-md font-mono text-sm">{result.musicPrompt}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-indigo-400">Script Konten Jualan (Full)</h3>
            <button onClick={onRegenerateText} disabled={isLoading} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                <RefreshIcon className="w-3 h-3"/> Generate Ulang
            </button>
        </div>
        <p className="mt-2 text-gray-300 whitespace-pre-wrap bg-gray-900 p-4 rounded-md leading-relaxed">{result.fullScript}</p>
      </div>
    </div>
  );
};
