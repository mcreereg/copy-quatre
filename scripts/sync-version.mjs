#!/usr/bin/env node
/**
 * Copy packages/web/package.json version to packages/core/package.json.
 * Web is the canonical app version (CI, Android release).
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CORE_VERSION_FILE,
  WEB_VERSION_FILE,
  readPackageJson,
  writeVersion,
} from './version-utils.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const webVersion = readPackageJson(WEB_VERSION_FILE, repoRoot).version;
  const coreVersion = readPackageJson(CORE_VERSION_FILE, repoRoot).version;

  if (webVersion === coreVersion) {
    console.log(`Versions already in sync at ${webVersion}`);
    return;
  }

  writeVersion(CORE_VERSION_FILE, repoRoot, webVersion);
  console.log(`Synced ${CORE_VERSION_FILE}: ${coreVersion} -> ${webVersion}`);
}

main();
