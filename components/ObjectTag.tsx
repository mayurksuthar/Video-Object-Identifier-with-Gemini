import React from 'react';
import { PlayIcon } from './Icons';

interface ObjectTagProps {
  name: string;
  imageUrl: string | null;
  price: string;
  timestamp: number;
  onClick: (timestamp: number) => void;
}

const ImageLoader: React.FC = () => (
    <div className="w-full aspect-square bg-gray-700 rounded-t-lg animate-pulse"></div>
);

const ObjectTag: React.FC<ObjectTagProps> = ({ name, imageUrl, price, timestamp, onClick }) => {
  const handleInteraction = () => {
    onClick(timestamp);
  };

  return (
    <div 
      className="group bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-indigo-500/20 w-full max-w-[400px] cursor-pointer"
      onClick={handleInteraction}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleInteraction(); }}
      role="button"
      tabIndex={0}
      aria-label={`View ${name} at timestamp ${timestamp.toFixed(2)}s`}
    >
      <div className="w-full h-auto aspect-square relative">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={`A snapshot of: ${name}`} 
            className="w-full h-full object-cover" 
            width="400"
            height="400"
          />
        ) : (
          <ImageLoader />
        )}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <PlayIcon className="w-16 h-16 text-white/80" />
        </div>
      </div>
      <div className="p-4 bg-gray-800/50">
        <h3 className="text-lg font-semibold text-center text-gray-100 truncate" title={name}>
          {name.charAt(0).toUpperCase() + name.slice(1)}
        </h3>
        {price && (
            <p className="text-center text-yellow-400 font-bold text-xl mt-1">{price}</p>
        )}
      </div>
    </div>
  );
};

export default ObjectTag;