import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Gauge, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  lessonNumber: number;
  autoPlay?: boolean;
  label?: string;
  forcePlayKey?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  lessonNumber: _lessonNumber,
  autoPlay: _autoPlay = false,
  label = 'Lesson Audio Recording',
  forcePlayKey = 0
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Normalize path for web/electron: if relative, ensure './' or clean url
  const normalizedSrc = !src
    ? ''
    : src.startsWith('http') || src.startsWith('./')
    ? src
    : src.startsWith('/')
    ? `.${src}`
    : `./${src}`;

  // Reset player state when audio source changes (no autoplay)
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [normalizedSrc]);

  const handlePlay = useCallback(() => {
    if (!normalizedSrc) {
      setIsPlaying(false);
      setAudioError('No audio file is linked to this lesson.');
      return;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current
        .play()
        .then(() => {
          setAudioError(null);
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Audio playback error for:', normalizedSrc, err);
          setIsPlaying(false);
          setAudioError(
            `Audio file unavailable or could not be loaded (${src || 'missing source'}).`
          );
        });
    }
  }, [normalizedSrc, playbackRate, src]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePause, handlePlay]);

  const handleReplay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      handlePlay();
    }
  }, [handlePlay]);

  // Handle explicit Spacebar replay trigger from user
  useEffect(() => {
    if (forcePlayKey > 0) {
      handleReplay();
    }
  }, [forcePlayKey, handleReplay]);

  // Cycle speeds: 1.0x -> 0.8x -> 1.25x
  const cyclePlaybackRate = () => {
    const nextRate = playbackRate === 1.0 ? 0.8 : playbackRate === 0.8 ? 1.25 : 1.0;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur max-w-2xl mx-auto my-4 transition-all hover:border-amber-500/30">
      <audio
        ref={audioRef}
        src={normalizedSrc}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setAudioError(null);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setAudioError(
            `Audio recording could not be loaded (${src || 'missing file'}).`
          );
        }}
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center border ${
              audioError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {audioError ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">{label}</h4>
            <p className={`text-xs ${audioError ? 'text-rose-400 font-medium' : 'text-slate-400'}`}>
              {audioError ? 'Audio Unavailable' : 'Central Shona (Zezuru) Master Audio'}
            </p>
          </div>
        </div>

        {/* Speed toggle */}
        <button
          onClick={cyclePlaybackRate}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600 transition"
          title="Adjust playback speed"
        >
          <Gauge className="w-3.5 h-3.5 text-amber-400" />
          <span>{playbackRate}x</span>
        </button>
      </div>

      {audioError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* Progress slider */}
      <div className="space-y-1.5 mb-4">
        <input
          type="range"
          min={0}
          max={duration || 10}
          step={0.1}
          value={currentTime}
          disabled={Boolean(audioError)}
          onChange={handleSeek}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Primary Audio Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleReplay}
          disabled={Boolean(audioError)}
          className="p-2.5 rounded-full bg-slate-700/80 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white transition shadow"
          title="Replay from start (Space)"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={handleToggle}
          disabled={Boolean(audioError)}
          className="p-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold shadow-lg shadow-amber-500/20 transform hover:scale-105 active:scale-95 transition"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => {
            const nextMute = !isMuted;
            setIsMuted(nextMute);
            if (audioRef.current) audioRef.current.muted = nextMute;
          }}
          disabled={Boolean(audioError)}
          className="p-2.5 rounded-full bg-slate-700/80 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white transition shadow"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="mt-3 text-center">
        <span className="text-[11px] text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700/50">
          Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600 font-mono text-[10px]">Space</kbd> anytime to replay audio
        </span>
      </div>
    </div>
  );
};
