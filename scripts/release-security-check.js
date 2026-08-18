#!/usr/bin/env node
/**
 * Release artifact security preflight.
 *
 * Parity: AUTH-001, IAP-001, SEC-AIT
 * Scans AIT artifacts for secret/dev/local markers and source maps before upload.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const FORBIDDEN_RELEASE_MARKERS = [
  'SERVICE_ROLE_KEY',
  'SUPABASE_' + 'SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'JWT_SECRET',
  'AUTH_BRIDGE_SECRET',
  'SUPER_SECRET_PEPPER',
  'TOSS_PII_DECRYPTION_KEY',
  'TOSS_PROFILE_DECRYPTION_KEY',
  'OPENAI_API_KEY',
  'TOSS_CLIENT_SECRET',
  'TOSS_CLIENT_KEY',
  'TOSS_CLIENT_CERT',
  'TOSS_CALLBACK_AUTH_ID',
  'TOSS_CALLBACK_AUTH_PW',
  'TOSS_BASIC_AUTH',
  'TOSS_MTLS_CERT',
  'TOSS_MTLS_KEY',
  'TOSS_MTLS_MODE=mock',
  'REPORT_AI_MODE=mock',
  'TOSS_RUNTIME_MODE=DEV_LOCAL',
  'EXPO_PUBLIC_SHOW_DEV_MENU=true',
  'sourceMappingURL=',
  'http://localhost',
  'https://localhost',
  'http://127.0.0.1',
  'http://0.0.0.0',
  'http://[::1]',
  'http://10.0.2.2',
  'http://192.168.',
  'Mock Login',
  'MockMTLSClient',
  'setDevPlanOverride',
  'setDevGuardBypass',
  'components/shared/DevMenu',
  'mock_stable_user_001',
  'mock_access_',
  'TOSS_MOCK_STABLE_USER=true',
  'DEV_LOOPBACK_BACKEND_URL',
  'DEV_LOCAL',
  'SANDBOX_REAL',
  'PROD_READ',
  'PROD_READY',
  'Dev Navigator',
  'IAP 바이패스',
  '[DEV] IAP',
  '[DEV] 지급',
  '[DEV] 에러',
  'BEGIN CERTIFICATE',
  'BEGIN PRIVATE KEY',
  'PRIVATE KEY',
  'Bearer eyJ',
  'authorization: Bearer',
  'access_token=',
  'refresh_token=',
  'authorizationCode=',
  'authCode=',
  'id_token=eyJ',
  'jwt=eyJ',
  'toss_user_key=',
  'userKey=',
  'phone=',
  'email=',
  'ait-ad-test-',
];

const FORBIDDEN_RELEASE_PATTERNS = [
  /\bSUPABASE[_-]?SERVICE[_-]?ROLE[_-]?KEY\b/i,
  /\bSERVICE[_-]?ROLE[_-]?KEY\b/i,
  /\b(?:serviceRoleKey|supabaseServiceRoleKey)\b\s*[:=]\s*['"][^'"\s,}]+['"]/i,
  /\b(?:serviceRoleKey|supabaseServiceRoleKey)\b\s*[:=]\s*[^'"\s,}]*-[^'"\s,}]+/i,
  /\bAUTH[_-]?BRIDGE[_-]?SECRET\b/i,
  /\bOPENAI[_-]?API[_-]?KEY\b/i,
  /\bTOSS[_-]?CLIENT[_-]?(SECRET|CERT|KEY)\b/i,
  /\bTOSS[_-]?MTLS[_-]?(CERT|KEY)\b/i,
  /['"]?\bTOSS[_-]?MTLS[_-]?MODE\b['"]?\s*[:=]\s*['"]?mock\b/i,
  /['"]?\bREPORT[_-]?AI[_-]?MODE\b['"]?\s*[:=]\s*['"]?mock\b/i,
  /['"]?\bTOSS[_-]?RUNTIME[_-]?MODE\b['"]?\s*[:=]\s*['"]?(DEV_LOCAL|SANDBOX_REAL|PROD_READ|PROD_READY)\b/i,
  /['"]?\bEXPO_PUBLIC_SHOW_DEV_MENU\b['"]?\s*[:=]\s*['"]?true\b/i,
  /sourceMappingURL\s*=/i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|\[::1\])\b/i,
  /\b(Bearer|jwt|id_token|idToken|access_token|accessToken|refresh_token|refreshToken)\b\s*[:=]\s*['"]?eyJ/i,
  /\b(?:authorization[_-]?code|authorizationCode|auth[_-]?code|authCode)\b\s*[:=]\s*['"][^'"\s,}]+['"]/i,
  /\b(?:authorization[_-]?code|authorizationCode|auth[_-]?code|authCode)\b\s*[:=]\s*[^'"\s,}]*-[^'"\s,}]+/i,
  /\b(?:toss[_-]?user[_-]?key|tossUserKey|userKey)\b\s*[:=]\s*['"][^'"\s,}]+['"]/i,
  /\b(?:toss[_-]?user[_-]?key|tossUserKey|userKey)\b\s*[:=]\s*[^'"\s,}]*-[^'"\s,}]+/i,
  /\bemail\b\s*[:=]\s*['"]?[^'"\s,}]*@[^'"\s,}]+['"]?/i,
  /\bphone\b\s*[:=]\s*['"]?(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}['"]?/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
  /\bait-ad-test-[A-Za-z0-9_-]+/,
];

const FORBIDDEN_RELEASE_FILE_PATTERNS = [
  /(^|\/)\.env(?:\.[^/]+)?$/i,
  /(^|\/)[^/]+\.(?:pem|key|p12|pfx|crt|cer)$/i,
  /(^|\/)(?:id_rsa|id_ed25519|known_hosts)$/i,
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output && !options.quiet) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
  return output;
}

function assertReleaseArtifactIsClean(artifactPath) {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`AIT artifact not found: ${artifactPath}`);
  }

  const payload = run('unzip', ['-p', artifactPath], { quiet: true });
  const leakedMarkers = FORBIDDEN_RELEASE_MARKERS.filter((marker) => payload.includes(marker));
  const leakedPatterns = FORBIDDEN_RELEASE_PATTERNS
    .filter((pattern) => pattern.test(payload))
    .map((pattern) => pattern.toString());
  if (leakedMarkers.length > 0 || leakedPatterns.length > 0) {
    throw new Error(
      `${path.basename(artifactPath)} contains forbidden release markers: ${[
        ...leakedMarkers,
        ...leakedPatterns,
      ].join(', ')}`,
    );
  }

  const fileList = run('unzip', ['-Z1', artifactPath], { quiet: true });
  const artifactFiles = fileList.split(/\r?\n/).filter(Boolean);
  const sourceMapFiles = artifactFiles.filter((name) => name.endsWith('.map'));
  if (sourceMapFiles.length > 0) {
    throw new Error(
      `${path.basename(artifactPath)} still contains source maps: ${sourceMapFiles.join(', ')}`,
    );
  }
  const forbiddenFiles = artifactFiles.filter((name) =>
    FORBIDDEN_RELEASE_FILE_PATTERNS.some((pattern) => pattern.test(name))
  );
  if (forbiddenFiles.length > 0) {
    throw new Error(
      `${path.basename(artifactPath)} contains forbidden release files: ${forbiddenFiles.join(', ')}`,
    );
  }
}

function resolveArtifacts(args) {
  if (args.length > 0) {
    return args.map((arg) => path.resolve(root, arg));
  }

  const canonicalPath = path.join(root, 'taillog-app.ait');
  return fs.existsSync(canonicalPath) ? [canonicalPath] : [];
}

function main() {
  const artifacts = resolveArtifacts(process.argv.slice(2));
  if (artifacts.length === 0) {
    throw new Error('No AIT artifacts found. Run npm run build before release:security-check.');
  }

  for (const artifactPath of artifacts) {
    assertReleaseArtifactIsClean(artifactPath);
    console.log(`[release-security-check] PASS ${path.basename(artifactPath)}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  FORBIDDEN_RELEASE_MARKERS,
  FORBIDDEN_RELEASE_FILE_PATTERNS,
  FORBIDDEN_RELEASE_PATTERNS,
  assertReleaseArtifactIsClean,
  resolveArtifacts,
};
