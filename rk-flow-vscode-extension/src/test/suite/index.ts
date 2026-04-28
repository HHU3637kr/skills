import * as fs from "fs/promises";
import * as path from "path";
import Mocha from "mocha";

export async function run(): Promise<void> {
  const mocha = new Mocha({
    color: true,
    timeout: 90_000,
    ui: "tdd"
  });
  const testsRoot = __dirname;
  const files = await findTestFiles(testsRoot);

  for (const file of files) {
    mocha.addFile(file);
  }

  await new Promise<void>((resolve, reject) => {
    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
        return;
      }

      resolve();
    });
  });
}

async function findTestFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findTestFiles(fullPath);
    }

    return entry.name.endsWith(".test.js") ? [fullPath] : [];
  }));

  return files.flat();
}
