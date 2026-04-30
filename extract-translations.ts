import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const LOCALES_DIR = path.join(SRC_DIR, 'locales');

const TRANSLATION_REGEX = /t\(['"]([^'"]+)['"]\)/g;

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'locales' && f !== 'node_modules') {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

function extractTranslations() {
  const keys: Set<string> = new Set();

  walkDir(SRC_DIR, (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    let match;
    while ((match = TRANSLATION_REGEX.exec(content)) !== null) {
      keys.add(match[1]);
    }
  });

  const sortedKeys = Array.from(keys).sort();
  const translations: Record<string, string> = {};

  ['en', 'es'].forEach(lang => {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    let existing: Record<string, string> = {};
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    const newTranslations: Record<string, string> = {};
    sortedKeys.forEach(key => {
      newTranslations[key] = existing[key] || key;
    });

    fs.writeFileSync(filePath, JSON.stringify(newTranslations, null, 2));
    console.log(`Updated ${lang}.json with ${sortedKeys.length} keys`);
  });
}

extractTranslations();
