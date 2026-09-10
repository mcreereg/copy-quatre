import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const WEB_VERSION_FILE = 'packages/web/package.json';
export const CORE_VERSION_FILE = 'packages/core/package.json';

export function readVersionFromJson(jsonText, fileLabel) {
  const version = JSON.parse(jsonText).version;
  if (typeof version !== 'string') {
    throw new Error(`${fileLabel} is missing a string "version" field`);
  }
  return version;
}

export function readPackageJson(filePath, repoRoot) {
  const absolutePath = join(repoRoot, filePath);
  const jsonText = readFileSync(absolutePath, 'utf8');
  return { absolutePath, jsonText, version: readVersionFromJson(jsonText, filePath) };
}

export function writeVersion(filePath, repoRoot, version) {
  const absolutePath = join(repoRoot, filePath);
  const packageJson = JSON.parse(readFileSync(absolutePath, 'utf8'));
  packageJson.version = version;
  writeFileSync(absolutePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

export function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid semver "${version}"; expected MAJOR.MINOR.PATCH`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareSemver(a, b) {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) {
      return a[key] - b[key];
    }
  }
  return 0;
}

export function bumpSemver(version, bumpType) {
  const current = parseSemver(version);
  switch (bumpType) {
    case 'patch':
      return `${current.major}.${current.minor}.${current.patch + 1}`;
    case 'minor':
      return `${current.major}.${current.minor + 1}.0`;
    case 'major':
      return `${current.major + 1}.0.0`;
    default:
      throw new Error(`Invalid bump type "${bumpType}"; expected patch, minor, or major`);
  }
}

export function describeValidBumps(baseVersion) {
  return ['patch', 'minor', 'major'].map((type) => bumpSemver(baseVersion, type)).join(', ');
}

export function isValidBump(baseVersion, headVersion) {
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
