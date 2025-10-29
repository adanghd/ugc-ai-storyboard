import React, { useState, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { StoryboardPreview } from './components/StoryboardPreview';
import { generateFullStoryboard, regenerateFrameImage, regenerateStoryboardText } from './services/geminiService';
import { AspectRatio, StoryboardResult, UploadMode, MusicStyle } from './types';
import { ImageModal } from './components/ImageModal';

const App: React.FC = () => {
  const [storyboardResult, setStoryboardResult] = useState<StoryboardResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [lastRequest, setLastRequest] = useState<any>(null);

  // --- New states for granular control ---
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [regeneratingFrameId, setRegeneratingFrameId] = useState<number | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = useCallback(async (data: {
    productUrl: string;
    targetAudience: string;
    styleConcept: string;
    frameCount: number;
    aspectRatio: AspectRatio;
    modelImage: File | null;
    productImage: File | null;
    combinedImage: File | null;
    uploadMode: UploadMode;
    musicStyle: MusicStyle | null;
  }) => {
    setIsLoading(true);
    setError(null);
    setStoryboardResult(null);
    setProgress('Mempersiapkan aset...');
    setProgressPercent(0);
    setLastRequest(data); // Save file-based request for now

    const onProgressUpdate = (message: string, currentStep: number, totalSteps: number) => {
        setProgress(message);
        setProgressPercent(Math.round((currentStep / totalSteps) * 100));
    };

    try {
      const [modelImageBase64, productImageBase64, combinedImageBase64] = await Promise.all([
        data.modelImage ? fileToBase64(data.modelImage) : Promise.resolve(null),
        data.productImage ? fileToBase64(data.productImage) : Promise.resolve(null),
        data.combinedImage ? fileToBase64(data.combinedImage) : Promise.resolve(null),
      ]);
      
      const requestData = {
        ...data,
        modelImage: modelImageBase64,
        productImage: productImageBase64,
        combinedImage: combinedImageBase64
      };
      
      // Save the version with base64 strings for regeneration
      setLastRequest(requestData);

      // FIX: Removed apiKey argument
      const result = await generateFullStoryboard(requestData, onProgressUpdate);
      
      setStoryboardResult(result);
    } catch (e: any) {
      console.error(e);
      setError(`Terjadi kesalahan: ${e.message}`);
    } finally {
      setIsLoading(false);
      setProgress('');
      setProgressPercent(0);
    }
  }, []);
  
  const handleRegenerateFrame = useCallback(async (frameId: number) => {
    if (!lastRequest || !storyboardResult) return;

    const frameToRegen = storyboardResult.frames.find(f => f.id === frameId);
    if (!frameToRegen) return;

    setRegeneratingFrameId(frameId);
    setError(null);

    try {
        // FIX: Removed apiKey argument
        const newImageUrl = await regenerateFrameImage(
            { sceneDescription: frameToRegen.sceneDescription, cameraAngle: frameToRegen.cameraAngle },
            lastRequest
        );
        
        setStoryboardResult(prevResult => {
            if (!prevResult) return null;
            return {
                ...prevResult,
                frames: prevResult.frames.map(f => f.id === frameId ? {...f, imageUrl: newImageUrl} : f)
            };
        });

    } catch (e: any) {
        console.error(e);
        setError(`Gagal membuat ulang frame ${frameId}: ${e.message}`);
    } finally {
        setRegeneratingFrameId(null);
    }
  }, [lastRequest, storyboardResult]);

  const handleRegenerateText = useCallback(async () => {
    if (!lastRequest) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
        // FIX: Removed apiKey argument
        const { hook, fullScript, musicPrompt } = await regenerateStoryboardText(lastRequest);
        setStoryboardResult(prev => prev ? {...prev, hook, fullScript, musicPrompt } : null);
    } catch (e: any) {
        console.error(e);
        setError(`Gagal membuat ulang script: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  }, [lastRequest]);

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
        <header className="bg-gray-800/30 backdrop-blur-sm shadow-lg p-4 sticky top-0 z-10 flex-shrink-0">
          <h1 className="text-2xl font-bold text-center text-white tracking-wider">
            UGC AI <span className="text-indigo-400">Storyboard Builder</span>
          </h1>
        </header>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-md m-4 flex-shrink-0" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">&times;</button>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-4 lg:p-6 max-w-screen-2xl mx-auto w-full flex-grow">
          <div className="lg:col-span-2 h-full min-h-0">
            <ControlPanel isLoading={isLoading || regeneratingFrameId !== null} onSubmit={handleGenerate} />
          </div>
          <div className="lg:col-span-3 h-full min-h-0">
            <StoryboardPreview 
              result={storyboardResult} 
              isLoading={isLoading}
              progress={progress}
              progressPercent={progressPercent}
              regeneratingFrameId={regeneratingFrameId}
              aspectRatio={lastRequest?.aspectRatio || '9:16'}
              onRegenerateFrame={handleRegenerateFrame}
              onViewImage={setViewingImage}
              onRegenerateText={handleRegenerateText}
            />
          </div>
        </main>
      </div>
      {viewingImage && <ImageModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
    </>
  );
};

export default App;