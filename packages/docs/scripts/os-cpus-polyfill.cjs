"use strict";

// Some sandboxed environments return `os.cpus()` as an empty array.
// A few build tools pass that value into concurrency limits (p-limit),
// which crashes when it becomes 0. We polyfill `os.cpus()` to guarantee
// at least 1 CPU, using `os.availableParallelism()` when possible.
//
// This file is loaded via NODE_OPTIONS=--require ... for Next dev/build.

const os = require("node:os");

const originalCpus = os.cpus.bind(os);

function safeCpuCount() {
  try {
    if (typeof os.availableParallelism === "function") {
      const n = os.availableParallelism();
      if (Number.isFinite(n) && n >= 1) return n;
    }
  } catch {
    // ignore
  }

  // Fallback: 1 core.
  return 1;
}

os.cpus = () => {
  const cpus = originalCpus();
  if (Array.isArray(cpus) && cpus.length > 0) return cpus;

  const count = safeCpuCount();

  return Array.from({ length: count }, () => ({
    model: "unknown",
    speed: 0,
    times: {
      user: 0,
      nice: 0,
      sys: 0,
      idle: 0,
      irq: 0,
    },
  }));
};
