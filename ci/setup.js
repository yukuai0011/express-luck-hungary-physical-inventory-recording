// Copy our app-src into the generated React Native app
// Usage: node ci/setup.js ExpressLuckInventory
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

async function copyFile(src, dst) {
  await fsp.mkdir(path.dirname(dst), { recursive: true });
  await fsp.copyFile(src, dst);
}

async function copyDir(srcDir, dstDir) {
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  await fsp.mkdir(dstDir, { recursive: true });
  for (const e of entries) {
    const src = path.join(srcDir, e.name);
    const dst = path.join(dstDir, e.name);
    if (e.isDirectory()) await copyDir(src, dst);
    else if (e.isFile()) await copyFile(src, dst);
  }
}

async function ensureBabelPlugin(appDir) {
  const babelPath = path.join(appDir, 'babel.config.js');
  let content = await fsp.readFile(babelPath, 'utf8');
  const plugins = [];
  if (!content.includes('nativewind/babel')) plugins.push("'nativewind/babel'");
  if (!content.includes('react-native-worklets-core/plugin')) plugins.push("'react-native-worklets-core/plugin'");
  if (plugins.length > 0) {
    content = content.replace(/presets:\s*\[[^\]]*\]/, (m) => m + ",\n  plugins: [" + plugins.join(', ') + "]");
    await fsp.writeFile(babelPath, content, 'utf8');
  }
}

async function writeTailwindConfig(appDir) {
  const cfg = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],\n  presets: [require('nativewind/preset')],\n  theme: { extend: {} },\n  plugins: [],\n};\n`;
  await fsp.writeFile(path.join(appDir, 'tailwind.config.js'), cfg, 'utf8');
}

async function main() {
  const appDir = process.argv[2] || 'ExpressLuckInventory';
  const repoRoot = process.cwd();
  const srcRoot = path.join(repoRoot, 'react-native-app-src');
  if (!fs.existsSync(srcRoot)) throw new Error('react-native-app-src not found');

  // Copy App.tsx
  await copyFile(path.join(srcRoot, 'App.tsx'), path.join(appDir, 'App.tsx'));
  // Copy src
  await copyDir(path.join(srcRoot, 'src'), path.join(appDir, 'src'));

  await ensureBabelPlugin(appDir);
  await writeTailwindConfig(appDir);
}

main().catch((e) => { console.error(e); process.exit(1); });
