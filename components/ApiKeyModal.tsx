import React, { useState } from 'react';
import { SparklesIcon } from './icons';

interface ApiKeyModalProps {
  onSave: (apiKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-gray-700">
        <div className="text-center">
            <SparklesIcon className="w-12 h-12 text-indigo-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white mt-4">Masukkan API Key OpenRouter</h2>
            <p className="text-gray-400 mt-2">
                Aplikasi ini membutuhkan API key dari OpenRouter.ai untuk berfungsi. Key Anda hanya disimpan di browser untuk sesi ini.
            </p>
        </div>
        <div className="mt-6">
            <label htmlFor="api-key" className="sr-only">OpenRouter API Key</label>
            <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="sk-or-..."
                className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
            />
        </div>
        <div className="mt-6">
            <button
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed disabled:text-gray-400"
            >
                Simpan dan Lanjutkan
            </button>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
            Belum punya key? Dapatkan di <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">OpenRouter.ai</a>
        </p>
      </div>
    </div>
  );
};
