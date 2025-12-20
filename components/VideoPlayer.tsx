import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface VideoPlayerProps {
  originalVideoUrl: string;
  dubbedAudioUrl: string | null;
  isDubbedAudioEnabled: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  originalVideoUrl, 
  dubbedAudioUrl,
  isDubbedAudioEnabled 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Sync play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
      } else {
        videoRef.current.play();
        if (audioRef.current && isDubbedAudioEnabled) {
          audioRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Sync seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    }
  };

  // Sync time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Force sync audio if it drifts too much (> 0.3s)
      if (audioRef.current && isDubbedAudioEnabled && !audioRef.current.paused) {
        const diff = Math.abs(audioRef.current.currentTime - videoRef.current.currentTime);
        if (diff > 0.3) {
            audioRef.current.currentTime = videoRef.current.currentTime;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if(audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  // Effect to manage PLAYBACK state when toggling dubbing on/off while playing
  useEffect(() => {
    if (audioRef.current && videoRef.current) {
      if (isDubbedAudioEnabled) {
        // If video is playing, start audio synced
        if (!videoRef.current.paused) {
          audioRef.current.currentTime = videoRef.current.currentTime;
          audioRef.current.play().catch(e => console.log("Audio play interrupted", e));
        }
      } else {
        // Pause audio if dubbing disabled
        audioRef.current.pause();
      }
    }
  }, [isDubbedAudioEnabled]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate effective mute states
  // Video is muted if: Global Mute is ON OR Dubbing is ON (we want to hear dub instead)
  const isVideoEffectiveMuted = isMuted || isDubbedAudioEnabled;
  // Audio is muted if: Global Mute is ON
  const isAudioEffectiveMuted = isMuted;

  return (
    <div className="relative group rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-800">
      <video
        ref={videoRef}
        src={originalVideoUrl}
        className="w-full h-auto max-h-[60vh] object-contain mx-auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onClick={togglePlay}
        muted={isVideoEffectiveMuted} // Controlled prop for reliable muting
      />
      
      {/* Hidden Audio Player for Dub Track */}
      {dubbedAudioUrl && (
        <audio 
            ref={audioRef} 
            src={dubbedAudioUrl} 
            preload="auto"
            muted={isAudioEffectiveMuted} // Controlled prop
        />
      )}

      {/* Custom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        {/* Progress Bar */}
        <div className="relative h-1 bg-white/20 rounded-full mb-4 cursor-pointer group/slider">
            <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
            <div 
                className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full pointer-events-none" 
                style={{ width: `${(currentTime / duration) * 100}%` }} 
            />
            <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/slider:scale-100 transition-transform pointer-events-none"
                style={{ left: `${(currentTime / duration) * 100}%` }}
            />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button 
                onClick={togglePlay} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
            </button>
            
            <button 
                onClick={toggleMute} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <span className="text-sm font-medium tabular-nums opacity-90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button 
            onClick={() => {
                if(videoRef.current) {
                    videoRef.current.currentTime = 0;
                    if(audioRef.current) audioRef.current.currentTime = 0;
                }
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;