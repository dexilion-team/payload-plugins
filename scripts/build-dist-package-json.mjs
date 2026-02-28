#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();
const packageJsonPath = path.join(cwd, 'package.json');

const baseKeys = [
  'name',
  'version',
  'description',
  'license',
  'author',
  'type',
  'keywords',
  'repository',
  'homepage',
  'bugs',
  'funding',
  'sideEffects',
  'engines',
  'dependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'optionalDependencies',
];

const stripDistPrefix = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripDistPrefix);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, stripDistPrefix(nested)]),
    );
  }

  if (typeof value === 'string') {
    if (value.startsWith('./dist/')) {
      return `./${value.slice('./dist/'.length)}`;
    }

    if (value === './dist') {
      return '.';
    }
  }

  return value;
};

const raw = await readFile(packageJsonPath, 'utf8');
const pkg = JSON.parse(raw);

const distPkg = {};

for (const key of baseKeys) {
  if (pkg[key] !== undefined) {
    distPkg[key] = pkg[key];
  }
}

const publishConfig = pkg.publishConfig && typeof pkg.publishConfig === 'object'
  ? pkg.publishConfig
  : {};

const exportsField = publishConfig.exports ?? pkg.exports;
const mainField = publishConfig.main ?? pkg.main;
const typesField = publishConfig.types ?? pkg.types;
const binField = publishConfig.bin ?? pkg.bin;

if (exportsField !== undefined) {
  distPkg.exports = stripDistPrefix(exportsField);
}

if (mainField !== undefined) {
  distPkg.main = stripDistPrefix(mainField);
}

if (typesField !== undefined) {
  distPkg.types = stripDistPrefix(typesField);
}

if (binField !== undefined) {
  distPkg.bin = stripDistPrefix(binField);
}

await mkdir(path.join(cwd, 'dist'), { recursive: true });
await writeFile(path.join(cwd, 'dist', 'package.json'), `${JSON.stringify(distPkg, null, 2)}\n`, 'utf8');
