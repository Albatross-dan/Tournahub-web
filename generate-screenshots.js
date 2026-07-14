import { Jimp } from 'jimp';

async function main() {
  try {
    console.log('[PWA Assets] Generating screenshot placeholders...');
    
    // Create directory if not exists
    // public/assets exists, let's create screenshot-desktop.png and screenshot-mobile.png
    
    // 1. Desktop Screenshot: 1280x720, background color #060812 (RGBA: 0x06, 0x08, 0x12, 0xff)
    const desktop = new Jimp({ width: 1280, height: 720, color: 0x060812ff });
    await desktop.write('public/assets/screenshot-desktop.png');
    console.log('[PWA Assets] Generated screenshot-desktop.png');

    // 2. Mobile Screenshot: 390x844, background color #060812 (RGBA: 0x06, 0x08, 0x12, 0xff)
    const mobile = new Jimp({ width: 390, height: 844, color: 0x060812ff });
    await mobile.write('public/assets/screenshot-mobile.png');
    console.log('[PWA Assets] Generated screenshot-mobile.png');
  } catch (err) {
    console.error('[PWA Assets] Failed to generate screenshots:', err);
  }
}

main();
