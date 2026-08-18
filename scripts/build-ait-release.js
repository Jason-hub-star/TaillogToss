#!/usr/bin/env node
/**
 * Build the AIT artifact with a sanitized environment.
 *
 * The repo .env may contain service-role keys and deployment credentials for
 * local operations. AIT builds only need public runtime constants, so this
 * wrapper passes a small allowlist into the build process and then strips source
 * maps before keeping both the canonical and deployment-id-named artifacts.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { assertReleaseArtifactIsClean } = require('./release-security-check');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const buildLogPath = '/tmp/ait-build.log';

const PASSTHROUGH_ENV_KEYS = new Set([
  'ANDROID_HOME',
  'ANDROID_SDK_ROOT',
  'CI',
  'HOME',
  'JAVA_HOME',
  'LANG',
  'LC_ALL',
  'PATH',
  'SHELL',
  'TERM',
  'TMPDIR',
  'USER',
]);

const ALLOWED_DOTENV_KEYS = new Set([
  'AIT_AD_B1',
  'AIT_AD_B2',
  'AIT_AD_B3',
  'AIT_AD_I1',
  'AIT_AD_R1',
  'AIT_AD_R2',
  'AIT_AD_R3',
  'EXPO_PUBLIC_BACKEND_URL',
  'EXPO_PUBLIC_CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID',
  'EXPO_PUBLIC_SHOW_DEV_MENU',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_URL',
]);

const SENSITIVE_ENV_PATTERNS = [
  /API_KEY/i,
  /AUTH.*SECRET/i,
  /BASIC_AUTH/i,
  /CALLBACK_AUTH/i,
  /CERT/i,
  /CLIENT_KEY/i,
  /CLIENT_SECRET/i,
  /JWT_SECRET/i,
  /MTLS/i,
  /OPENAI/i,
  /PEPPER/i,
  /PRIVATE_KEY/i,
  /SERVICE_ROLE/i,
  /TOSS_PII/i,
  /TOSS_PROFILE/i,
];

function parseDotenv(contents) {
  const values = new Map();
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

function isSensitiveKey(key) {
  return SENSITIVE_ENV_PATTERNS.some((pattern) => pattern.test(key));
}

function buildEnvironment() {
  const env = {};
  for (const key of PASSTHROUGH_ENV_KEYS) {
    if (process.env[key]) env[key] = process.env[key];
  }

  if (fs.existsSync(envPath)) {
    const dotenvValues = parseDotenv(fs.readFileSync(envPath, 'utf8'));
    for (const [key, value] of dotenvValues) {
      if (!ALLOWED_DOTENV_KEYS.has(key)) continue;
      if (isSensitiveKey(key)) {
        throw new Error(`Refusing to pass sensitive AIT build env key: ${key}`);
      }
      env[key] = value;
    }
  }

  env.NODE_ENV = 'production';
  env.EXPO_PUBLIC_SHOW_DEV_MENU = '';
  return env;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: options.env,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output && !options.quiet) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
  return output;
}

function main() {
  const env = buildEnvironment();
  const output = run('ait', ['build'], { env });
  fs.writeFileSync(buildLogPath, output);

  run('node', ['scripts/strip-release-source-maps.js'], {
    env: { ...env, PATH: process.env.PATH ?? env.PATH },
  });

  const deploymentId = output.match(/deploymentId: ([0-9a-f-]+)/)?.[1];
  const aitPath = path.join(root, 'taillog-app.ait');
  assertReleaseArtifactIsClean(aitPath);
  if (deploymentId && fs.existsSync(aitPath)) {
    const versionedPath = path.join(root, `taillog-app-${deploymentId}.ait`);
    fs.copyFileSync(aitPath, versionedPath);
    assertReleaseArtifactIsClean(versionedPath);
    console.log(`-> ${path.basename(versionedPath)}`);
  }
}

main();
