#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDirs = ['src/pages', 'src/components'];
const extensions = new Set(['.ts', '.tsx']);

const ignoredFiles = new Set([
  'src/components/shared/DevMenu.tsx',
]);

const ignoredFragments = [
  '/__tests__/',
];

const rules = [
  {
    name: 'formal-ending',
    pattern: /(문제가 발생했습니다|실패했습니다|일치하지 않습니다|주소입니다|결과입니다|분석입니다|제안합니다|제공합니다|준비되었습니다|표시됩니다|대체하지 않습니다|개선할 수 있습니다)/,
    message: '사용자 노출 문구는 해요체로 바꿔주세요.',
  },
  {
    name: 'commanding-copy',
    pattern: /(입력하세요|등록하세요|생성하세요|확인하세요|분석하세요)/,
    message: '명령형은 부드러운 요청형이나 가능 표현으로 바꿔주세요.',
  },
  {
    name: 'internal-plan-day-label',
    pattern: /\b(Plan [ABC]|Plan A\/B\/C|Plan B\/C|Day [0-9]|Day \{|\b다음 Day|전체 Day)\b/,
    message: 'Plan/Day 같은 내부 라벨은 사용자 친화 문구로 바꿔주세요.',
  },
  {
    name: 'loading-ellipsis',
    pattern: /(저장 중\.\.\.|불러오는 중\.\.\.|처리 중\.\.\.|생성 중\.\.\.|확인 중\.\.\.|등록 중\.\.\.|준비 중\.\.\.)/,
    message: '로딩 문구는 “~하고 있어요” 형태로 통일해주세요.',
  },
  {
    name: 'stale-price-copy',
    pattern: /(월 4,900원|토큰 10회:\s*1,900원|토큰 30회:\s*4,900원)/,
    message: '가격 문구는 IAP_PRODUCTS 카탈로그 기준으로 표시해주세요.',
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function lineFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

const violations = [];

for (const dir of targetDirs) {
  for (const file of walk(path.join(root, dir))) {
    const rel = path.relative(root, file);
    if (ignoredFiles.has(rel) || ignoredFragments.some((fragment) => rel.includes(fragment))) {
      continue;
    }

    const source = stripComments(fs.readFileSync(file, 'utf8'));
    for (const rule of rules) {
      const isLegalCopy = rel === 'src/pages/legal/terms.tsx' || rel === 'src/pages/legal/privacy.tsx';
      if (isLegalCopy && rule.name !== 'stale-price-copy') {
        continue;
      }
      const match = source.match(rule.pattern);
      if (match && match.index !== undefined) {
        violations.push({
          file: rel,
          line: lineFor(source, match.index),
          rule: rule.name,
          sample: match[0],
          message: rule.message,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('UX copy check failed:\n');
  for (const v of violations) {
    console.error(`${v.file}:${v.line} [${v.rule}] ${v.sample}`);
    console.error(`  ${v.message}`);
  }
  process.exit(1);
}

console.log('UX copy check passed.');
