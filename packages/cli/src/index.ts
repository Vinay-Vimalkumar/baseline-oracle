#!/usr/bin/env node

import { analyze } from "@baseline-oracle/engine";

console.log("✅ Baseline Oracle CLI running...");

const result = analyze("demo.css");
console.log("Analysis result:", result);
