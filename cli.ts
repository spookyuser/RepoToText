import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Get the command-line arguments
const args = process.argv.slice(2);

// Check if the minimum required arguments are provided
if (args.length < 2) {
  console.error(
    "Usage: node script.js <repoPath> <outputFilePath> [extensions...]"
  );
  process.exit(1);
}

const repoPath = args[0];
const outputFilePath = args[1];

const extensions = args.slice(2).map((ext) => `.${ext}`); // Ensure each extension starts with a dot
extensions.push(".ts");
extensions.push(".tsx");

const includeAll = args.includes("--all");

// Customize the separators
const startSeparator = "===== BEGIN ";
const endSeparator = " =====";

// Standard exclusions
const standardExclusions = [
  "node_modules/",
  ".git/",
  ".DS_Store",
  "dist/",
  "build/",
  "*.log",
  // Add more exclusions as needed
];

// Custom includes
const customIncludes = [
  "package.json",
  "../../README.md",
  "README.md",
  // Add more custom includes as needed
];

function isGitRepo(repoPath) {
  try {
    fs.accessSync(path.join(repoPath, ".git"), fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isExcluded(filePath) {
  if (includeAll) {
    return false;
  }
  return standardExclusions.some((exclusion) => {
    const normalizedExclusion = path.normalize(exclusion).replace(/\\/g, "/");
    const normalizedFilePath = path.normalize(filePath).replace(/\\/g, "/");
    if (normalizedExclusion.endsWith("/")) {
      return normalizedFilePath.startsWith(normalizedExclusion);
    }
    return normalizedFilePath.endsWith(normalizedExclusion);
  });
}

function isIncluded(filePath) {
  if (includeAll) {
    return true;
  }
  return (
    customIncludes.some((inclusion) => {
      const normalizedInclusion = path.normalize(inclusion);
      const normalizedFilePath = path.normalize(filePath);
      return normalizedFilePath.includes(normalizedInclusion);
    }) || extensions.some((ext) => filePath.endsWith(ext))
  );
}

function listFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      listFiles(filePath, fileList);
    } else {
      fileList.push(filePath.replace(`${repoPath}/`, ""));
    }
  });
  return fileList;
}

function getTrackedFiles() {
  const output = execSync("git ls-files", { cwd: repoPath, encoding: "utf-8" });
  return output.split("\n").filter((file) => file.trim() !== "");
}

function getAllFiles() {
  if (isGitRepo(repoPath)) {
    return getTrackedFiles();
  } else {
    return listFiles(repoPath).filter(
      (file) => !isExcluded(file) || isIncluded(file)
    );
  }
}

const allFiles = getAllFiles();
const fileTree = generateFileTree(allFiles);

fs.writeFileSync(outputFilePath, "File Tree:\n");
printFileTree(fileTree);
fs.appendFileSync(outputFilePath, "\n\n");

// Adjusted to consider configurable extensions
allFiles.forEach((filePath) => {
  if (isIncluded(filePath)) {
    const fileContent = fs.readFileSync(path.join(repoPath, filePath), "utf-8");
    const separator = `${startSeparator}${filePath}${endSeparator}\n${fileContent}\n\n`;
    fs.appendFileSync(outputFilePath, separator);
  }
});
function printFileTree(fileTree, indent = "", isLast = true) {
  const keys = Object.keys(fileTree);
  const lastIndex = keys.length - 1;

  keys.forEach((key, index) => {
    const isLastItem = index === lastIndex;
    const treeItem = isLastItem ? "└─ " : "├─ ";
    const subIndent = isLast ? "   " : "│  ";

    if (fileTree[key] === true) {
      // Print leaf nodes (files)
      fs.appendFileSync(outputFilePath, `${indent}${treeItem}${key}\n`);
    } else {
      // Print directories
      fs.appendFileSync(outputFilePath, `${indent}${treeItem}${key}\n`);
      printFileTree(fileTree[key], indent + subIndent, isLastItem);
    }
  });
}

function generateFileTree(files) {
  const fileTree = {};

  files.forEach((file) => {
    if (!isExcluded(file) || isIncluded(file)) {
      const parts = file.split(path.sep);
      let currentLevel = fileTree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          currentLevel[part] = true; // Use `true` instead of `null` for leaf nodes
        } else {
          currentLevel[part] = currentLevel[part] || {};
          currentLevel = currentLevel[part];
        }
      });
    }
  });

  return fileTree;
}
