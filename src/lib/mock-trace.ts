// Generates realistic-looking pre-fault engine trace samples.
export type Sample = { t: number; rpm: number; temp: number; load: number; speed: number };

export function generateTrace(minutes = 20): Sample[] {
  const samples: Sample[] = [];
  const points = minutes * 6; // 1 point / 10s
  let rpm = 1400, temp = 82, load = 42, speed = 58;
  for (let i = 0; i < points; i++) {
    const p = i / points;
    // Load slowly climbs
    load = 42 + p * 28 + Math.sin(i / 5) * 4 + (Math.random() - 0.5) * 3;
    // Coolant temp climbs, crosses 94 around 60% in
    temp = 82 + p * 14 + Math.sin(i / 8) * 1.2 + (Math.random() - 0.5) * 0.5;
    // RPM increasingly volatile toward end
    rpm = 1400 + p * 900 + Math.sin(i / 3) * (80 + p * 220) + (Math.random() - 0.5) * 60;
    speed = 58 + Math.sin(i / 7) * 6 + (Math.random() - 0.5) * 3;
    samples.push({
      t: i * 10,
      rpm: Math.round(rpm),
      temp: +temp.toFixed(1),
      load: +load.toFixed(1),
      speed: +speed.toFixed(1),
    });
  }
  return samples;
}

export const DTC_POOL = ["P0301","P0128","P0171","P0420","P0217","P0335","P0100","P0505"];
