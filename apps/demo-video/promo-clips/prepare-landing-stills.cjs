// Reuse approved demo footage, never the original recordings with private data.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../..');
const ffmpeg = path.join(
  root,
  'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
);
const downloads = path.resolve(root, '../..');
const output = path.join(root, 'apps/web/public/media/landing');
const frames = path.join(__dirname, '../page-walkthrough/output');
const web = [
  ['homeowner-post-job', 'Homeowner', 3, [650, 150, 880, 810]],
  ['homeowner-properties', 'Homeowner', 1],
  ['homeowner-jobs', 'Homeowner', 4],
  ['homeowner-job-detail', 'Homeowner', 5],
  ['homeowner-payments', 'Homeowner', 7],
  ['contractor-discover', 'Contractor', 1],
  ['contractor-quotes', 'Contractor', 2],
  ['contractor-jobs', 'Contractor', 4],
  ['contractor-finance', 'Contractor', 8],
];
const mobile = [
  ['mobile-homeowner-home', 'mintenance-mobile-demo-walkthrough.mp4', 6],
  ['mobile-homeowner-post', 'mintenance-mobile-demo-walkthrough.mp4', 20],
  ['mobile-homeowner-review', 'mintenance-mobile-demo-walkthrough.mp4', 53],
  ['mobile-agreement', 'mintenance-mobile-demo-walkthrough.mp4', 78],
  ['mobile-contractor-home', 'mintenance-contractor-mobile-demo.mp4', 6],
  ['mobile-contractor-jobs', 'mintenance-contractor-mobile-demo.mp4', 13],
  ['mobile-contractor-map', 'mintenance-contractor-mobile-demo.mp4', 21],
  // First steady frame of the Business hub shot; crop excludes promo captions.
  [
    'mobile-contractor-business',
    'Mintenance-social-clips/02-contractor-business.mp4',
    3.4,
    [193, 315, 694, 1330],
  ],
];
async function save(name, input, crop, width) {
  const [left, top, w, h] = crop;
  await sharp(input)
    .extract({ left, top, width: w, height: h })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(output, `${name}.webp`));
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  for (const [name, role, index, crop] of web) {
    await save(
      name,
      path.join(frames, `Demo-${role}-${index}.png`),
      crop || [66, 70, 1780, 914],
      1440
    );
  }
  for (const [name, file, time, crop] of mobile) {
    const frame = execFileSync(
      ffmpeg,
      [
        '-v',
        'error',
        '-ss',
        String(time),
        '-i',
        path.join(downloads, file),
        '-frames:v',
        '1',
        '-f',
        'image2pipe',
        '-vcodec',
        'png',
        'pipe:1',
      ],
      { windowsHide: true, maxBuffer: 20 * 1024 * 1024 }
    );
    await save(name, frame, crop || [185, 240, 710, 1490], 600);
  }
  console.log(
    `Prepared ${web.length + mobile.length} landing stills from reviewed demo footage.`
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
