import { SensorNoise } from '@meltdown/shared';

/** Apply sensor noise offset to a displayed value. Technicians always bypass this. */
export function noisy(
  value: number,
  key: keyof SensorNoise['offsets'],
  noise: SensorNoise,
  isTechnician: boolean,
): number {
  if (isTechnician || !noise.active) return value;
  return value + noise.offsets[key];
}
