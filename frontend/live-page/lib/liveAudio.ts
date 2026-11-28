let context: AudioContext | null = null;
let enabled = false;
let hornBuffer: Promise<AudioBuffer> | null = null;
let playingHorn: AudioBufferSourceNode | null = null;

function loadHorn(audio: AudioContext) {
  hornBuffer ??= fetch("/hackeps/fairground-horn.mp3")
    .then(response => {
      if (!response.ok) throw Error("Horn audio unavailable");
      return response.arrayBuffer();
    })
    .then(bytes => audio.decodeAudioData(bytes))
    .catch(error => { hornBuffer = null; throw error; });
  return hornBuffer;
}

const soundChanges = new EventTarget();

export function subscribeToLiveAudio(listener: () => void) {
  soundChanges.addEventListener("change", listener);
  return () => soundChanges.removeEventListener("change", listener);
}

export function activeLiveAudio() {
  return enabled && context?.state === "running" ? context : null;
}

export async function enableLiveAudio() {
  context ??= new AudioContext();
  await context.resume();
  if (context.state !== "running") throw Error("Audio unavailable");
  enabled = true;
  void loadHorn(context).catch(() => {});
  soundChanges.dispatchEvent(new Event("change"));
}

export function muteLiveAudio() {
  enabled = false;
  playingHorn?.stop();
  soundChanges.dispatchEvent(new Event("change"));
}

export async function playBullHorn() {
  const audio = activeLiveAudio();
  if (!audio || document.hidden) return;
  const start = audio.currentTime;
  const buffer = await loadHorn(audio).catch(() => null);
  const elapsed = audio.currentTime - start;
  if (!buffer || elapsed >= buffer.duration || !activeLiveAudio() || document.hidden) return;

  const source = audio.createBufferSource();
  source.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = 0.65;
  source.connect(gain).connect(audio.destination);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
    if (playingHorn === source) playingHorn = null;
  };
  playingHorn = source;
  source.start(0, elapsed);
}

export function playPosterPop() {
  const audio = activeLiveAudio();
  if (!audio || document.hidden) return;

  const start = audio.currentTime;
  const end = start + 0.075;
  const pop = audio.createOscillator();
  const gain = audio.createGain();
  pop.type = "triangle";
  pop.frequency.setValueAtTime(420, start);
  pop.frequency.exponentialRampToValueAtTime(105, end);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.22, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  pop.connect(gain).connect(audio.destination);
  pop.onended = () => {
    pop.disconnect();
    gain.disconnect();
  };
  pop.start(start);
  pop.stop(end);
}
