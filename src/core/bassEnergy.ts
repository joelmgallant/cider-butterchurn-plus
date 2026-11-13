export const BASS_CUTOFF_HZ = 150;

/**
 * Mean bass magnitude (0..1) from AnalyserNode.getByteFrequencyData output.
 * Skips the DC bin; includes bins whose centre frequency is <= cutoffHz.
 */
export function bassEnergy(
  bytes: ArrayLike<number>,
  sampleRate: number,
  fftSize: number,
  cutoffHz: number = BASS_CUTOFF_HZ,
): number {
  const hzPerBin = sampleRate / fftSize;
  const lastBin = Math.min(bytes.length - 1, Math.floor(cutoffHz / hzPerBin));
  if (lastBin < 1) return 0;
  let sum = 0;
  for (let bin = 1; bin <= lastBin; bin++) sum += bytes[bin];
  return sum / (lastBin * 255);
}
