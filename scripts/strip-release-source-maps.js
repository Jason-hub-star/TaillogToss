#!/usr/bin/env node
/**
 * Remove source maps from release artifacts before AIT upload/security scan.
 * Source maps carry sourcesContent, including dev-only strings and local paths.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const aitPath = path.join(root, 'taillog-app.ait');
const distPath = path.join(root, 'dist');

function removeSourceMaps(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      removeSourceMaps(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.map')) {
      fs.rmSync(fullPath, { force: true });
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      const source = fs.readFileSync(fullPath, 'utf8');
      const stripped = source.replace(/\/\/[#@]\s*sourceMappingURL=.*(?:\r?\n)?/g, '');
      if (stripped !== source) {
        fs.writeFileSync(fullPath, stripped);
      }
    }
  }
}

function run(command, args, allowedStatuses = new Set([0]), cwd = root) {
  try {
    execFileSync(command, args, { cwd, stdio: 'ignore' });
  } catch (error) {
    if (!allowedStatuses.has(error.status)) {
      throw error;
    }
  }
}

if (fs.existsSync(aitPath)) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taillog-ait-strip-'));
  const strippedPath = path.join(os.tmpdir(), `taillog-app-stripped-${Date.now()}.ait`);
  try {
    run('unzip', ['-qq', aitPath, '-d', tempDir], new Set([0, 1]));
    removeSourceMaps(tempDir);
    run('zip', ['-qr', strippedPath, '.'], new Set([0]), tempDir);
    fs.copyFileSync(strippedPath, aitPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(strippedPath, { force: true });
  }
}

if (fs.existsSync(distPath)) {
  removeSourceMaps(distPath);
}
