// Web Audio API synthesizer for smooth offline audio preview fallback

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playFallbackCadence(lessonNumber: number, onEnded?: () => void): () => void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Notes mimicking traditional Zimbabwean mbira intervals
    const baseFreq = 220 + ((lessonNumber % 7) * 35);
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.875, baseFreq * 2];
    
    let scheduledTime = now;
    const oscillators: OscillatorNode[] = [];

    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, scheduledTime);
      
      // Decay envelope
      gain.gain.setValueAtTime(0.001, scheduledTime);
      gain.gain.exponentialRampToValueAtTime(0.3, scheduledTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, scheduledTime + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(scheduledTime);
      osc.stop(scheduledTime + 0.85);
      
      oscillators.push(osc);
      scheduledTime += 0.55;
    });

    const timer = setTimeout(() => {
      onEnded?.();
    }, (scheduledTime - now + 0.1) * 1000);

    return () => {
      clearTimeout(timer);
      oscillators.forEach(osc => {
        try {
          osc.stop();
        } catch {}
      });
    };
  } catch (err) {
    console.warn('Fallback audio playback error:', err);
    onEnded?.();
    return () => {};
  }
}
