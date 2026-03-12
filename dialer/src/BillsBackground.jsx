import { useMemo } from 'react';

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export default function BillsBackground({ count = 22 }) {
  const bills = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const left = rand(0, 100).toFixed(2) + 'vw';
      const delay = rand(0, 10).toFixed(2) + 's';
      const dur = rand(8.5, 16.5).toFixed(2) + 's';
      const size = rand(0.70, 1.35).toFixed(2);
      const drift = rand(-120, 120).toFixed(2) + 'px';
      const sway = rand(60, 200).toFixed(2) + 'px';
      const opacity = rand(0.60, 0.95).toFixed(2);

      // Rotación base y “vida” (flutter)
      const yaw = rand(0, 360).toFixed(2) + 'deg';
      const pitch = rand(-25, 25).toFixed(2) + 'deg';
      const roll = rand(-35, 35).toFixed(2) + 'deg';
      const flutter = rand(0.7, 1.35).toFixed(2);
      const flipDir = Math.random() > 0.5 ? 1 : -1;

      return { i, left, delay, dur, size, drift, sway, opacity, yaw, pitch, roll, flutter, flipDir };
    });
  }, [count]);

  return (
    <div className="cs-bills" aria-hidden="true">
      {bills.map((b) => (
        <div
          key={b.i}
          className="cs-bill"
          style={{
            left: b.left,
            '--cs-delay': b.delay,
            '--cs-dur': b.dur,
            '--cs-scale': b.size,
            '--cs-drift': b.drift,
            '--cs-sway': b.sway,
            '--cs-opacity': b.opacity,
            '--cs-yaw': b.yaw,
            '--cs-pitch': b.pitch,
            '--cs-roll': b.roll,
            '--cs-flutter': b.flutter,
            '--cs-flipdir': b.flipDir,
          }}
        >
          <div className="cs-bill-inner">
            <div className="cs-bill-face cs-bill-front" />
            <div className="cs-bill-face cs-bill-back" />
          </div>
        </div>
      ))}
    </div>
  );
}

