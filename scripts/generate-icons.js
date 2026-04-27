const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generateIcon(size, name) {
  const fontSize = Math.floor(size * 0.35);
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#F07040" rx="${Math.floor(size * 0.15)}"/><text x="${size / 2}" y="${size / 2 + fontSize / 3}" font-size="${fontSize}" font-weight="900" font-family="system-ui" text-anchor="middle" fill="white">ET</text></svg>`;

  await sharp(Buffer.from(svg)).png().toFile(path.join(iconDir, name));
}

async function generateAllIcons() {
  try {
    for (const { name, size } of sizes) {
      await generateIcon(size, name);
      console.log(`✓ Generated ${name}`);
    }
    console.log('All icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

generateAllIcons();
