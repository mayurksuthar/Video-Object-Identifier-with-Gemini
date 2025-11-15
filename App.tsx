import React, { useState, useCallback, useEffect, useRef } from 'react';
import { identifyObjectsInVideo } from './services/geminiService';
import VideoUpload from './components/VideoUpload';
import Loader from './components/Loader';
import ObjectTag from './components/ObjectTag';
import { EyeIcon, GithubIcon, SparklesIcon } from './components/Icons';

interface IdentifiedObject {
  name: string;
  imageUrl: string | null;
  price: string;
  timestamp: number;
}

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

/**
 * Extracts a frame from a video file at a specific time with high reliability.
 * @param videoFile The video file to process.
 * @param timeInSeconds The timestamp in seconds for the frame to capture.
 * @returns A Promise that resolves with a base64 data URL of the captured frame.
 */
const extractFrameFromVideo = (videoFile: File, timeInSeconds: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return reject(new Error('Could not get canvas context.'));
    }

    const videoUrl = URL.createObjectURL(videoFile);

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      URL.revokeObjectURL(videoUrl);
    };

    const onSeeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      cleanup();
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    const onLoadedMetadata = () => {
      // Ensure the seek time is within the video's duration
      video.currentTime = Math.min(Math.max(0, timeInSeconds), video.duration);
    };

    const onError = (e: Event | string) => {
      cleanup();
      const errorMessage = e instanceof Event ? (e.target as HTMLVideoElement)?.error?.message : e;
      reject(new Error(`Video error during frame extraction: ${errorMessage}`));
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;
  });
};


/**
 * Draws a bounding box on an image with improved precision.
 * @param imageUrl The base64 data URL of the image.
 * @param box The normalized bounding box coordinates.
 * @returns A Promise that resolves with a new base64 data URL of the image with the box drawn on it.
 */
const drawBoundingBoxOnImage = (imageUrl: string, box: BoundingBox): Promise<string> => {
  return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Could not get canvas context');

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Make line width proportional for better visual consistency.
          const lineWidth = Math.max(2, Math.round(Math.min(img.width, img.height) / 250));

          // Sanitize and clamp coordinates to be within the image bounds.
          const x1 = Math.max(0, box.x_min * img.width);
          const y1 = Math.max(0, box.y_min * img.height);
          const x2 = Math.min(img.width, box.x_max * img.width);
          const y2 = Math.min(img.height, box.y_max * img.height);
          
          const width = x2 - x1;
          const height = y2 - y1;
          
          // Only draw the box if it has a valid, positive size.
          if (width > 0 && height > 0) {
              ctx.strokeStyle = 'yellow';
              ctx.lineWidth = lineWidth;
              ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
              ctx.shadowBlur = lineWidth * 2;
              
              ctx.strokeRect(x1, y1, width, height);
          }

          resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => reject(new Error('Failed to load image for drawing bounding box.'));
      img.src = imageUrl;
  });
};


const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [identifiedObjects, setIdentifiedObjects] = useState<IdentifiedObject[]>([]);
  const [rawJsonOutput, setRawJsonOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleFileChange = (file: File | null) => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(file);
    setIdentifiedObjects([]);
    setRawJsonOutput(null);
    setError(null);

    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    } else {
      setVideoUrl(null);
    }
  };

  const handleIdentifyClick = useCallback(async () => {
    if (!videoFile) {
      setError("Please upload a video file first.");
      return;
    }
    if (!query.trim()) {
        setError("Please specify what objects to identify.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setIdentifiedObjects([]);
    setRawJsonOutput(null);

    try {
      const targetObjects = query.split(',').map(s => s.trim()).filter(Boolean);
      const { objects: objectsWithData, rawJson } = await identifyObjectsInVideo(videoFile, targetObjects);
      
      setRawJsonOutput(rawJson);

      if (objectsWithData.length === 0) {
        setIdentifiedObjects([]);
        setError("No matching objects were found in the video.");
      } else {
        const initialObjects: IdentifiedObject[] = objectsWithData.map(obj => ({
          name: obj.name,
          imageUrl: null,
          price: obj.price,
          timestamp: obj.timestamp
        }));
        setIdentifiedObjects(initialObjects);

        objectsWithData.forEach(async (obj, index) => {
          try {
            const rawFrame = await extractFrameFromVideo(videoFile, obj.timestamp);
            const frameWithBox = await drawBoundingBoxOnImage(rawFrame, obj.boundingBox);
            
            setIdentifiedObjects(prev => {
              const newObjects = [...prev];
              if (newObjects[index] && newObjects[index].name === obj.name) {
                newObjects[index] = { ...newObjects[index], imageUrl: frameWithBox };
              }
              return newObjects;
            });
          } catch (e) {
            console.error(`Failed to process frame for ${obj.name}`, e);
          }
        });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during object identification.");
    } finally {
      setIsLoading(false);
    }
  }, [videoFile, query]);
  
  const handleCardClick = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.play();
      videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      <main className="w-full max-w-4xl mx-auto space-y-8 p-4 md:p-8">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center gap-3">
            <EyeIcon className="w-10 h-10" />
            Dynamic Video Object Identifier
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Upload a video, tell the AI what to find, and see the results.
          </p>
        </header>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl shadow-black/20 p-6 md:p-8 space-y-6">
          <VideoUpload onFileChange={handleFileChange} disabled={isLoading} />
          
          {videoUrl && (
            <div className="bg-black rounded-lg overflow-hidden border border-gray-700">
              <video
                ref={videoRef}
                controls
                src={videoUrl}
                className="w-full h-auto max-h-[400px]"
                aria-label="Uploaded video preview"
              />
            </div>
          )}
          
          <div>
              <label htmlFor="object-query" className="block text-sm font-medium text-gray-300 mb-2">
                Objects to Identify (comma-separated):
              </label>
              <input
                type="text"
                id="object-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
                placeholder="e.g., chair, sofa, firearm"
                className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

          <div className="flex justify-center">
            <button
              onClick={handleIdentifyClick}
              disabled={!videoFile || isLoading || !query.trim()}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
            >
              {isLoading ? (
                <>
                  <Loader />
                  Analyzing...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Identify Objects
                </>
              )}
            </button>
          </div>
          
          {error && <div className="text-center p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">{error}</div>}

          {identifiedObjects.length > 0 && (
            <div className="pt-6 border-t border-gray-700">
              <h2 className="text-2xl font-semibold text-center mb-6">Detected Objects:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
                {identifiedObjects.map((obj, index) => (
                  <ObjectTag 
                    key={`${index}-${obj.name}`} 
                    name={obj.name} 
                    imageUrl={obj.imageUrl} 
                    price={obj.price}
                    timestamp={obj.timestamp}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            </div>
          )}

          {rawJsonOutput && !isLoading && (
            <div className="pt-6 border-t border-gray-700">
              <h2 className="text-2xl font-semibold text-center mb-6">Raw JSON Output:</h2>
              <pre className="bg-gray-950/50 border border-gray-700 rounded-lg p-4 overflow-x-auto text-sm text-yellow-300/80 font-mono">
                <code>
                  {JSON.stringify(JSON.parse(rawJsonOutput), null, 2)}
                </code>
              </pre>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full max-w-4xl mx-auto text-center py-6 text-gray-500">
        <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-indigo-400 transition-colors">
          <GithubIcon className="w-5 h-5" />
          Powered by Gemini API
        </a>
      </footer>
    </div>
  );
};

export default App;