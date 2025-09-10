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

function getDefaultPackagePath(sfRoot) {
  const projectFile = path.join(sfRoot, "sfdx-project.json");
  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
  const defaultPackage = project.packageDirectories.find((p) => p.default);
  if (!defaultPackage) {
    throw new Error("Default package directory not found in sfdx-project.json");
  }
  return defaultPackage.path;
}

function getPackageName() {
  const packageJsonPath = path.resolve(__dirname, "..", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return packageJson.name.replace(/^@.*\//, ""); // Remove scope if present
}

function linkAll(sourceDir, destDir, packageName) {
  // Create the wisefoxme destination directory with the package name if it doesn't exist
  const wisefoxmeDestDir = path.join(destDir, "wisefoxme", packageName);

  if (!fs.existsSync(sourceDir)) {
    console.warn(`Source directory not found: ${sourceDir}`);
    return;
  }

  // Ensure the destination directory exists
  fs.mkdirSync(wisefoxmeDestDir, { recursive: true });

  // Read all files and directories in the source directory
  const items = fs.readdirSync(sourceDir);

  // Link each item individually
  items.forEach((item) => {
    const sourcePath = path.join(sourceDir, item);

    // Check if the path contains a "default" folder and adjust destination accordingly
    const pathParts = item.split(path.sep);
    const hasDefault = pathParts.includes("default");
    const adjustedItem = hasDefault
      ? pathParts.filter((part) => part !== "default").join(path.sep)
      : item;

    const destPath = path.join(wisefoxmeDestDir, adjustedItem);

    // Ensure the parent directory of the destination exists
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    // if link already exists, remove it
    try {
      const stats = fs.lstatSync(destPath);
      if (stats.isSymbolicLink() || stats.isDirectory()) {
        fs.rmSync(destPath, { recursive: true, force: true });
      } else if (stats.isFile()) {
        fs.unlinkSync(destPath);
      }
    } catch (err) {
      // Item doesn't exist, which is fine
    }

    // Create a symbolic link for each item
    const rel = path.relative(path.dirname(destPath), sourcePath);
    fs.symlinkSync(rel, destPath, "junction");
  });
}

try {
  // Skip linking if running on CI environment
  if (process.env.CI === "true") {
    console.log("Skipping postinstall script in CI environment.");
    return;
  }

  const sfRoot = findSfRoot(process.env.INIT_CWD || process.cwd());
  const defaultPackagePath = getDefaultPackagePath(sfRoot);
  const destRoot = path.join(sfRoot, defaultPackagePath);
  const sourceRoot = path.resolve(__dirname, "..", "force-app", "main");
  const packageName = getPackageName();

  linkAll(sourceRoot, destRoot, packageName);

  console.log(
    `✅ All components linked successfully to wisefoxme/${packageName} in ${destRoot}`
  );
} catch (error) {
  console.error("Error linking components:", error.message);
  process.exit(1);
}
