#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function findSfRoot(start) {
  let dir = start;
  while (!fs.existsSync(path.join(dir, "sfdx-project.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("Salesforce Project root not found");
    dir = parent;
  }
  return dir;
}

function getPackageName() {
  const packageJsonPath = path.resolve(__dirname, "..", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return packageJson.name.replace(/^@.*\//, ""); // Remove scope if present
}

function getDefaultPackagePath(sfRoot) {
  const projectFile = path.join(sfRoot, "sfdx-project.json");
  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
  const defaultPackage = project.packageDirectories.find((p) => p.default);
  if (!defaultPackage) {
    throw new Error("Default package directory not found in sfdx-project.json");
  }
  return defaultPackage.path;
}

try {
  const sfRoot = findSfRoot(process.env.INIT_CWD || process.cwd());
  const defaultPackagePath = getDefaultPackagePath(sfRoot);
  const wisefoxmeDir = path.join(sfRoot, defaultPackagePath, "wisefoxme");
  const packageName = getPackageName();
  const recordCalendarPath = path.join(wisefoxmeDir, packageName);

  if (fs.existsSync(recordCalendarPath)) {
    fs.rmSync(recordCalendarPath, { recursive: true, force: true });
    console.log("✅ Removed recordCalendar package:", recordCalendarPath);
  } else {
    console.log("recordCalendar package does not exist, nothing to remove.");
  }
} catch (error) {
  console.error("Error removing recordCalendar package:", error.message);
  process.exit(1);
}
