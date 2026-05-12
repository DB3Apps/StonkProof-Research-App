import fs from 'fs';
const packageLockPath = 'package-lock.json';
const lockfile = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));

if (lockfile.packages) {
  for (const key of Object.keys(lockfile.packages)) {
    if (key.includes('oxide-wasm32-wasi')) {
      delete lockfile.packages[key];
    }
  }
}

if (lockfile.dependencies) {
  for (const key of Object.keys(lockfile.dependencies)) {
    if (key.includes('oxide-wasm32-wasi')) {
      delete lockfile.dependencies[key];
    }
  }
}

// Write back
fs.writeFileSync(packageLockPath, JSON.stringify(lockfile, null, 2));
console.log('Removed oxide-wasm32-wasi related packages from package-lock.json');
