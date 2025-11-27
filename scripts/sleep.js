#!/usr/bin/env node

const sleepTime = parseInt(process.argv[2]) || 5000;

setTimeout(() => {
  process.exit(0);
}, sleepTime);