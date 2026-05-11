// BeatFit Loader — main entry point.
// Usage:
//   <BeatFitLoader variant="logoBuild" />
//   <BeatFitLoader variant="podium" players={[...]} />
//   <BeatFitLoader variant="showdown" you={{...}} rival={{...}} caption="Hledám soupeře" />

import React from 'react';
import LoaderShell from './LoaderShell';
import LogoBuild from './variants/LogoBuild';
import Podium from './variants/Podium';
import Rings from './variants/Rings';
import Pulse from './variants/Pulse';
import Cycler from './variants/Cycler';
import Showdown from './variants/Showdown';

const VARIANTS = {
  logoBuild: LogoBuild,
  podium: Podium,
  rings: Rings,
  pulse: Pulse,
  cycler: Cycler,
  showdown: Showdown,
};

export default function BeatFitLoader({
  variant = 'logoBuild',
  fullscreen = true,
  ...variantProps
}) {
  const Variant = VARIANTS[variant] || LogoBuild;
  return (
    <LoaderShell fullscreen={fullscreen}>
      <Variant {...variantProps} />
    </LoaderShell>
  );
}

// Named exports for tree-shaking when you only need one
export { LogoBuild, Podium, Rings, Pulse, Cycler, Showdown, LoaderShell };
export { BF, TEAM } from './tokens';
