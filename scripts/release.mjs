#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatPackageDateVersion, getPackageTarballName } from './release-version.js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = join(rootDir, 'package.json');
const packageLockPath = join(rootDir, 'package-lock.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function syncPackageVersion(version) {
  const pkg = readJson(packageJsonPath);
  pkg.version = version;
  writeJson(packageJsonPath, pkg);

  const lock = readJson(packageLockPath);
  lock.version = version;
  if (lock.packages?.['']) {
    lock.packages[''].version = version;
  }
  writeJson(packageLockPath, lock);

  return pkg.name;
}

const version = formatPackageDateVersion();
const packageName = syncPackageVersion(version);
const tarballName = getPackageTarballName(packageName, version);

execFileSync('npm', ['run', 'build'], { cwd: rootDir, stdio: 'inherit' });
execFileSync('npm', ['pack'], { cwd: rootDir, stdio: 'inherit' });

console.log(`Packed ${tarballName}`);
