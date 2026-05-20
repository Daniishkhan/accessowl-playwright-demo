import { brokenSelectorDemo, loadAppsmithConfig } from "../../packages/integrations-appsmith/src/index.js";

const result = await brokenSelectorDemo(loadAppsmithConfig());

console.log(`Broken selector recovered: ${result.recovered}`);
console.log(`Evidence: ${result.evidenceDir}`);
console.log("Inspect llm/plan.json and llm/validation.json in that evidence folder.");
