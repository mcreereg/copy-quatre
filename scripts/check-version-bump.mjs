#!/usr/bin/env node
/**
 * Ensures packages/web/package.json version was bumped correctly vs a base ref.
 *
 * Rules:
 * - Every change must increase semver by at least one patch.
 * - Minor bumps reset patch to 0.
 * - Major bumps reset minor and patch to 0.
 *
 * Usage: node scripts/check-version-bump.mjs [base-ref]
 * Default base ref: origin/main
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const versionFile = 'packages/web/package.json';

function readVersionFromJson(jsonText) {
  const version = JSON.parse(jsonText).version;
  if (typeof version !== 'string') {
    throw new Error(`${versionFile} is missing a string "version" field`);
  }
  return version;
}

function readWorkingTreeVersion() {
  return readVersionFromJson(readFileSync(join(repoRoot, versionFile), 'utf8'));
}

function readGitRefVersion(ref) {
  const jsonText = execFileSync('git', ['show', `${ref}:${versionFile}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return readVersionFromJson(jsonText);
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid semver "${version}" in ${versionFile}; expected MAJOR.MINOR.PATCH`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemver(a, b) {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) {
      return a[key] - b[key];
    }
  }
  return 0;
}

function describeValidBumps(baseVersion) {
  const base = parseSemver(baseVersion);
  return [
    `${base.major}.${base.minor}.${base.patch + 1}`,
    `${base.major}.${base.minor + 1}.0`,
    `${base.major + 1}.0.0`,
  ].join(', ');
}

function isValidBump(baseVersion, headVersion) {
  const base = parseSemver(baseVersion);
  const head = parseSemver(headVersion);

  if (compareSemver(base, head) >= 0) {
    return {
      ok: false,
      reason: `version must increase from ${baseVersion}; got ${headVersion}`,
    };
  }

  if (head.major > base.major) {
    if (head.minor !== 0 || head.patch !== 0) {
      return {
        ok: false,
        reason: `major bump to ${headVersion} must reset minor and patch to 0`,
      };
    }
    return { ok: true };
  }

  if (head.minor > base.minor) {
    if (head.major !== base.major || head.patch !== 0) {
      return {
        ok: false,
        reason: `minor bump to ${headVersion} must keep major ${base.major} and reset patch to 0`,
      };
    }
    return { ok: true };
  }

  if (head.patch > base.patch) {
    if (head.major !== base.major || head.minor !== base.minor) {
      return {
        ok: false,
        reason: `patch bump to ${headVersion} must keep major.minor at ${base.major}.${base.minor}`,
      };
    }
    return { ok: true };
  }

  return {
    ok: false,
    reason: `version ${headVersion} is not a valid semver increment from ${baseVersion}`,
  };
}

function resolveBaseRef(requestedRef) {
  if (requestedRef) {
    return requestedRef;
  }

  const envRef = process.env.GITHUB_BASE_REF;
  if (envRef) {
    return `origin/${envRef}`;
  }

  return 'origin/main';
}

function main() {
  const baseRef = resolveBaseRef(process.argv[2]);
  const headVersion = readWorkingTreeVersion();

  let baseVersion;
  try {
    baseVersion = readGitRefVersion(baseRef);
  } catch (error) {
    console.error(`Failed to read ${versionFile} from ${baseRef}: ${error.message}`);
    process.exit(1);
  }

  const result = isValidBump(baseVersion, headVersion);
  if (!result.ok) {
    console.error(`Invalid version bump in ${versionFile}.`);
    console.error(result.reason);
    console.error(`Valid next versions from ${baseVersion}: ${describeValidBumps(baseVersion)}`);
    process.exit(1);
  }

  console.log(`Version bump OK: ${baseVersion} -> ${headVersion}`);
}

main();
