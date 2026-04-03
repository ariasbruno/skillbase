#!/usr/bin/env node
import { runCLI } from '../src/cli.js';

runCLI(process.argv).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
