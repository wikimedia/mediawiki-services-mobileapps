'use strict';

const DEFAULT_MAX_MS_PER_TICK = 100;

let maxMsPerTick = 0;
if (process.env.MAX_MS_PER_TICK) {
  maxMsPerTick = parseInt(process.env.MAX_MS_PER_TICK);
}

if (!maxMsPerTick || maxMsPerTick.isNan || maxMsPerTick <= 0) {
  maxMsPerTick = DEFAULT_MAX_MS_PER_TICK;
}

module.exports = {
  // rough maximum time in ms to run before letting the event loop continue
  MAX_MS_PER_TICK: maxMsPerTick
};
