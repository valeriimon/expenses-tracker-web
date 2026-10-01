// Renders the app icons from src/assets/icon/icon.svg.
//
// Run by hand when the mark changes, and commit the PNGs it writes. It is not
// part of the build: icons change roughly never, and a build that needs a
// browser binary to produce four static files fails on a fresh machine for no
// good reason.
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const dir = 'src/assets/icon';
const svg = await readFile(`${dir}/icon.svg`, 'utf8');

// The mark sits inside the central 80% that a maskable icon must keep clear of
// the platform's crop, so every output is drawn from the same artwork at full
// size. Only the corners differ.
const outputs = [
  { file: 'icon-192.png', size: 192, radius: '18%' },
  { file: 'icon-512.png', size: 512, radius: '18%' },
  // Square and full-bleed: the platform supplies the shape.
  { file: 'icon-maskable-512.png', size: 512, radius: '0' },
  { file: 'apple-touch-icon.png', size: 180, radius: '0' },
  { file: 'favicon.png', size: 64, radius: '18%' },
];

const browser = await chromium.launch();

for (const { file, size, radius } of outputs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}
     div{width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden}
     svg{display:block;width:100%;height:100%}</style><div>${svg}</div>`,
  );
  await page.screenshot({ path: `${dir}/${file}`, omitBackground: true });
  await page.close();
  console.log(`${file} (${size}px)`);
}

await browser.close();
