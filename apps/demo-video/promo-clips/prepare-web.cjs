// Re-encode only the reviewed, privacy-edited exports for public landing pages.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execFileSync } = require('child_process');
const source = 'C:/Users/gloir/Downloads/Mintenance-social-clips';
const dest = path.resolve(__dirname, '../../web/public/media/demos');
const ff = path.resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const ids = ['01-homeowner', '02-contractor-business', '03-find-local-work', '04-clear-agreements'];
async function main() {
  fs.mkdirSync(dest, { recursive: true });
  for (const id of ids) {
    execFileSync(ff, ['-v','error','-y','-i',path.join(source,id+'.mp4'),'-vf','scale=720:1280','-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-threads','3','-movflags','+faststart',path.join(dest,id+'.mp4')], { windowsHide: true });
    await sharp(path.join(source,id+'-cover.jpg')).resize(720,1280).jpeg({quality:85}).toFile(path.join(dest,id+'-cover.jpg'));
    const srt=fs.readFileSync(path.join(source,id+'.srt'),'utf8');
    fs.writeFileSync(path.join(dest,id+'.vtt'),'WEBVTT\n\n'+srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2').trimEnd()+'\n');
    console.log('Prepared '+id);
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
