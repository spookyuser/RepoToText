import fs from "fs";
import path from "path";
import walkdir from "walkdir";
import directoryTree from "tree-node-cli";
import chalk from "chalk";
import { program } from "commander";

// Configuration
const standardExclusions = [
  "node_modules/",
  ".git/",
  ".DS_Store",
  "dist/",
  "build/",
  "*.log",
];
const customIncludes = ["package.json", "../../README.md", "README.md"];

// Function to check if a file path is excluded
function isExcluded(filePath: string): boolean {
  if (program.includeAll) return false;
  return standardExclusions.some((exclusion) => {
    const normalizedExclusion = path.normalize(exclusion).replace(/\\/g, "/");
    const normalizedFilePath = path.normalize(filePath).replace(/\\/g, "/");
    if (normalizedExclusion.endsWith("/")) {
      return normalizedFilePath.startsWith(normalizedExclusion);
    }
    return normalizedFilePath.endsWith(normalizedExclusion);
  });
}

// Function to check if a file path is included
function isIncluded(filePath: string): boolean {
  if (program.includeAll) return true;
  return (
    customIncludes.some((inclusion) => {
      const normalizedInclusion = path.normalize(inclusion);
      const normalizedFilePath = path.normalize(filePath);
      return normalizedFilePath.includes(normalizedInclusion);
    }) || program.extensions.some((ext: string) => filePath.endsWith(ext))
  );
}

// Function to process and write file content to the output file
function processFileContent(filePath: string): void {
  const fileContent = fs.readFileSync(
    path.join(program.repoPath, filePath),
    "utf-8"
  );
  const separator = `${chalk.bgBlue(
    `===== BEGIN ${filePath} =====`
  )}\n${fileContent}\n${chalk.bgBlue(`===== END ${filePath} =====`)}\n\n`;
  fs.appendFileSync(program.outputFilePath, separator);
}

// Main function
function main(): void {
  program
    .version("1.0.0")
    .description("Convert a repository to a text file")
    .option(
      "-r, --repo-path <repoPath>",
      "Path to the repository",
      path.resolve,
      process.cwd()
    )
    .option(
      "-o, --output-file-path <outputFilePath>",
      "Path to the output file",
      path.resolve,
      path.join(process.cwd(), "output.txt")
    )
    .option("-e, --extensions <extensions...>", "File extensions to include", [
      ".ts",
      ".tsx",
    ])
    .option("-a, --include-all", "Include all files and directories")
    .parse(process.argv);

  // Generate the file tree
  const tree = directoryTree(program.repoPath, {
    exclude: standardExclusions,
    attributes: ["size", "type", "extension"],
    depth: program.includeAll ? undefined : 1,
  });

  // Write the file tree to the output file
  fs.writeFileSync(
    program.outputFilePath,
    chalk.bold.underline("File Tree:\n")
  );
  fs.appendFileSync(program.outputFilePath, tree.toString());
  fs.appendFileSync(program.outputFilePath, "\n\n");

  // Walk through the directory and process files
  walkdir(program.repoPath, {
    no_recurse: !program.includeAll,
    track_inodes: true,
    followLinks: false,
  })
    .on("file", (filePath: string) => {
      if (isIncluded(filePath)) {
        processFileContent(filePath);
      }
    })
    .on("end", () => {
      console.log(chalk.green("Processing completed!"));
    });
}

// Run the main function
main();
