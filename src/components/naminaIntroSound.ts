/** An original four-note cinematic sound mark for NAMINA. No audio files or samples. */
export function createNaminaIntroSound() {
  let context: AudioContext | null = null;
  let played = false;
  let disposed = false;
  let lastStartedAt = -Infinity;

  const ensureContext = () => {
    if (context) return context;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    return context;
  };

  const playSoundMark = (audio: AudioContext) => {
    const origin = audio.currentTime + 0.04;
    const master = audio.createGain();
    master.gain.value = 0.31;
    master.connect(audio.destination);

    const note = (time: number, frequency: number, duration: number, strength: number) => {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, origin + time);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.85, origin + time + duration);
      envelope.gain.setValueAtTime(0.0001, origin + time);
      envelope.gain.exponentialRampToValueAtTime(strength, origin + time + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, origin + time + duration);
      oscillator.connect(envelope).connect(master);
      oscillator.start(origin + time);
      oscillator.stop(origin + time + duration + 0.02);
    };

    // A low sweep, three staggered strikes, and a bright resolving accent.
    note(0.06, 92.5, 1.25, 0.68);
    note(0.52, 164.8, 1.65, 0.42);
    note(1.23, 220, 1.85, 0.38);
    note(3.06, 329.6, 1.34, 0.32);

    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 1.2), audio.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const noiseEnvelope = audio.createGain();
    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, origin);
    filter.frequency.exponentialRampToValueAtTime(1400, origin + 0.85);
    noiseEnvelope.gain.setValueAtTime(0.0001, origin);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.19, origin + 0.2);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, origin + 1.15);
    noise.connect(filter).connect(noiseEnvelope).connect(master);
    noise.start(origin);
    noise.stop(origin + 1.2);
  };

  const play = async (restart = false) => {
    if (disposed || (played && !restart)) return played;
    try {
      const audio = ensureContext();
      if (!audio) return false;
      if (audio.state !== "running") {
        // An autoplay-restricted browser can leave resume() pending until a much
        // later click. Do not surprise the visitor with a delayed intro sound.
        await Promise.race([
          audio.resume().catch(() => {}),
          new Promise<void>((resolve) => window.setTimeout(resolve, 350)),
        ]);
      }
      if (disposed || (played && !restart) || audio.state !== "running") return played;
      if (restart && audio.currentTime - lastStartedAt < 0.7) return true;
      played = true;
      lastStartedAt = audio.currentTime;
      playSoundMark(audio);
      return true;
    } catch {
      return false;
    }
  };

  return {
    play,
    dispose() {
      disposed = true;
      if (context) void context.close().catch(() => {});
    },
  };
}
