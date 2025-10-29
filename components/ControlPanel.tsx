import React, { useState, useRef, useEffect } from 'react';
import { AspectRatio, MusicStyle, UploadMode } from '../types';
import { ASPECT_RATIOS, MUSIC_STYLES } from '../constants';
import { SparklesIcon, UploadIcon, ChevronDownIcon } from './icons';

interface ControlPanelProps {
  isLoading: boolean;
  onSubmit: (data: {
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
  }) => void;
}

const ImageUploader: React.FC<{
  id: string;
  label: string;
  onFileSelect: (file: File | null) => void;
  preview: string | null;
}> = ({ id, label, onFileSelect, preview }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files ? e.target.files[0] : null);
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md hover:border-indigo-400 transition-colors">
        <div className="space-y-1 text-center">
          {preview ? (
            <img src={preview} alt="Preview" className="mx-auto h-24 w-24 object-cover rounded-md" />
          ) : (
            <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
          )}
          <div className="flex text-sm text-gray-500">
            <label htmlFor={id} className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-indigo-500">
              <span>Upload file</span>
              <input id={id} name={id} type="file" className="sr-only" onChange={handleChange} accept="image/*" />
            </label>
            <p className="pl-1">atau tarik dan lepas</p>
          </div>
          <p className="text-xs text-gray-600">PNG, JPG, GIF hingga 10MB</p>
        </div>
      </div>
    </div>
  );
};

const AspectRatioDropdown: React.FC<{
    value: AspectRatio;
    onChange: (value: AspectRatio) => void;
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = ASPECT_RATIOS.find(r => r.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition bg-gray-700 hover:bg-gray-600 text-white"
            >
                <div className="flex items-center gap-2">
                    {selectedOption && <selectedOption.icon className="w-5 h-5" />}
                    <span>{selectedOption?.label}</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg">
                    {ASPECT_RATIOS.map(ratio => (
                        <button
                            key={ratio.value}
                            type="button"
                            onClick={() => {
                                onChange(ratio.value);
                                setIsOpen(false);
                            }}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-600"
                        >
                            <ratio.icon className="w-5 h-5" />
                            {ratio.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ isLoading, onSubmit }) => {
  const [productUrl, setProductUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [styleConcept, setStyleConcept] = useState('');
  const [frameCount, setFrameCount] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [uploadMode, setUploadMode] = useState<UploadMode>('separate');
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [combinedImage, setCombinedImage] = useState<File | null>(null);
  
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [combinedPreview, setCombinedPreview] = useState<string | null>(null);

  const [generateMusic, setGenerateMusic] = useState(false);
  const [musicStyle, setMusicStyle] = useState<MusicStyle>('upbeat');


  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>, previewSetter: React.Dispatch<React.SetStateAction<string | null>>) => (file: File | null) => {
    setter(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        previewSetter(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      previewSetter(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      productUrl, targetAudience, styleConcept, frameCount, aspectRatio,
      modelImage, productImage, combinedImage, uploadMode,
      musicStyle: generateMusic ? musicStyle : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-gray-800/50 rounded-lg h-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">1. Upload Aset Visual</h2>
            <p className="text-sm text-gray-400 mt-1">Sediakan gambar untuk konsistensi AI.</p>
            
            <div className="mt-4 flex space-x-2 rounded-lg bg-gray-900 p-1">
              <button type="button" onClick={() => setUploadMode('separate')} className={`w-full rounded-md py-2 text-sm font-medium transition ${uploadMode === 'separate' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Model & Produk Terpisah</button>
              <button type="button" onClick={() => setUploadMode('combined')} className={`w-full rounded-md py-2 text-sm font-medium transition ${uploadMode === 'combined' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Model + Produk</button>
            </div>

            <div className="mt-4 space-y-4">
              {uploadMode === 'separate' ? (
                <div className="flex flex-col md:flex-row gap-4">
                  <ImageUploader id="model-image" label="Upload Model" onFileSelect={handleFileChange(setModelImage, setModelPreview)} preview={modelPreview} />
                  <ImageUploader id="product-image" label="Upload Produk" onFileSelect={handleFileChange(setProductImage, setProductPreview)} preview={productPreview} />
                </div>
              ) : (
                <ImageUploader id="combined-image" label="Upload Model + Produk" onFileSelect={handleFileChange(setCombinedImage, setCombinedPreview)} preview={combinedPreview} />
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-white mt-6">2. Detail Konten</h2>
            <div className="space-y-4 mt-4">
              <div>
                <label htmlFor="product-url" className="block text-sm font-medium text-gray-300">Link Produk (Shopee/TikTok)</label>
                <input type="url" id="product-url" value={productUrl} onChange={e => setProductUrl(e.target.value)} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="https://shopee.co.id/product/..." />
              </div>
              <div>
                <label htmlFor="target-audience" className="block text-sm font-medium text-gray-300">Target Audiens</label>
                <input type="text" id="target-audience" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Contoh: Wanita usia 20-30, pecinta skincare" />
              </div>
              <div>
                <label htmlFor="style-concept" className="block text-sm font-medium text-gray-300">Style/Konsep</label>
                <textarea id="style-concept" value={styleConcept} onChange={e => setStyleConcept(e.target.value)} rows={3} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Contoh: Aesthetic, cinematic, unboxing, soft selling"></textarea>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mt-6">3. Pengaturan Storyboard</h2>
            <div className="space-y-4 mt-4">
              <div>
                <label htmlFor="frame-count" className="block text-sm font-medium text-gray-300">Total Storyboard ({frameCount} frame)</label>
                <input type="range" id="frame-count" min="1" max="10" value={frameCount} onChange={e => setFrameCount(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mt-6">4. Aspek Rasio</h2>
             <div className="space-y-4 mt-4">
                <div>
                    <span className="block text-sm font-medium text-gray-300 mb-2">Pilih Aspek Rasio</span>
                    <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />
                </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-white mt-6">5. Musik Latar (Opsional)</h2>
            <div className="space-y-4 mt-4">
                <div className="flex items-center">
                    <input id="generate-music" type="checkbox" checked={generateMusic} onChange={e => setGenerateMusic(e.target.checked)} className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500" />
                    <label htmlFor="generate-music" className="ml-2 block text-sm text-gray-300">Sertakan prompt musik latar (untuk Suno AI)</label>
                </div>
                {generateMusic && (
                    <div>
                        <span className="block text-sm font-medium text-gray-300">Pilih Gaya Musik</span>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                            {MUSIC_STYLES.map(style => (
                                <button key={style.value} type="button" onClick={() => setMusicStyle(style.value)} className={`px-3 py-2 text-sm rounded-md transition capitalize ${musicStyle === style.value ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          </div>
      </div>
      
      <button type="submit" disabled={isLoading} className="mt-6 flex-shrink-0 w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed disabled:text-gray-400">
        <SparklesIcon className="w-5 h-5"/>
        {isLoading ? 'Sedang Membuat...' : 'Generate Storyboard UGC AI'}
      </button>
    </form>
  );
};