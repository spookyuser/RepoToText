import { execSync } from "child_process"
import fs from "fs"
import path from "path"

// Get the command-line arguments
const args = process.argv.slice(2)

// Check if the required arguments are provided
if (args.length !== 2) {
  console.error("Usage: bun script.js <repoPath> <outputFilePath>")
  process.exit(1)
}

const repoPath = args[0]
const outputFilePath = args[1]

// Customize the separators
const startSeparator = "===== BEGIN "
const endSeparator = " ====="

// Custom exclusions
const customExclusions = [
  "locales/",
  "*.ts-snapshots"

  // Add more custom exclusions as needed
]

// Custom includes
const customIncludes = [
  "package.json",
  "../../README.md",
  "README.md"
  // Add more custom includes as needed
]
function isExcluded(filePath) {
  return customExclusions.some((exclusion) => {
    const normalizedExclusion = path.normalize(exclusion)
    const normalizedFilePath = path.normalize(filePath)
    return normalizedFilePath.startsWith(normalizedExclusion)
  })
}

function isIncluded(filePath) {
  return customIncludes.some((inclusion) => {
    const normalizedInclusion = path.normalize(inclusion)
    const normalizedFilePath = path.normalize(filePath)
    return normalizedFilePath.startsWith(normalizedInclusion)
  })
}

function getTrackedFiles() {
  const output = execSync("git ls-files", { cwd: repoPath, encoding: "utf-8" })
  return output.split("\n").filter((file) => file.trim() !== "")
}

function generateFileTree(files) {
  const fileTree = {}

  files.forEach((file) => {
    if (!isExcluded(file) || isIncluded(file)) {
      const parts = file.split(path.sep)
      let currentLevel = fileTree

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          currentLevel[part] = true // Use `true` instead of `null` for leaf nodes
        } else {
          currentLevel[part] = currentLevel[part] || {}
          currentLevel = currentLevel[part]
        }
      })
    }
  })

  return fileTree
}

function printFileTree(fileTree, indent = "", isLast = true) {
  const keys = Object.keys(fileTree)
  const lastIndex = keys.length - 1

  keys.forEach((key, index) => {
    const isLastItem = index === lastIndex
    const treeItem = isLastItem ? "└─ " : "├─ "
    const subIndent = isLast ? "   " : "│  "

    if (fileTree[key] === true) {
      // Print leaf nodes (files)
      fs.appendFileSync(outputFilePath, `${indent}${treeItem}${key}\n`)
    } else {
      // Print directories
      fs.appendFileSync(outputFilePath, `${indent}${treeItem}${key}\n`)
      printFileTree(fileTree[key], indent + subIndent, isLastItem)
    }
  })
}

function processFile(filePath) {
  if (
    (!isExcluded(filePath) || isIncluded(filePath)) &&
    (filePath.endsWith(".ts") || filePath.endsWith(".tsx"))
  ) {
    const fileContent = fs.readFileSync(path.join(repoPath, filePath), "utf-8")
    const separator = `${startSeparator}${filePath}${endSeparator}\n${fileContent}\n\n`
    fs.appendFileSync(outputFilePath, separator)
  }
}

const trackedFiles = getTrackedFiles()
const fileTree = generateFileTree(trackedFiles)

fs.writeFileSync(outputFilePath, "File Tree:\n")
printFileTree(fileTree)
fs.appendFileSync(outputFilePath, "\n")

trackedFiles.forEach(processFile)
