
import React, { useRef, useState, useCallback } from 'react';
import { UploadCloudIcon } from './Icons';

interface VideoUploadProps {
  onFileChange: (file: File | null) => void;
  disabled: boolean;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onFileChange, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled) {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileChange(files[0]);
      }
    }
  }, [onFileChange, disabled]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileChange(files[0]);
    } else {
      onFileChange(null);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const activeClasses = isDragging ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-600 hover:border-indigo-500 hover:bg-gray-700/30';
  const disabledClasses = disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';

  return (
    <div>
      <label
        htmlFor="video-upload-input"
        className={`flex flex-col items-center justify-center w-full h-48 border-2 ${activeClasses} ${disabledClasses} border-dashed rounded-lg transition-all duration-300`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        aria-disabled={disabled}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloudIcon className="w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-400">
            <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">MP4, AVI, MOV, or other video formats</p>
        </div>
        <input
          ref={fileInputRef}
          id="video-upload-input"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </label>
    </div>
  );
};

export default VideoUpload;
