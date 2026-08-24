const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');
const target = `audio.play().catch(e => console.error("Audio play failed:", e));`;
const replacement = `audio.play().catch(e => {
        if (e.name !== 'NotSupportedError' && !e.message.includes('supported source was found')) {
          console.error("Audio play failed:", e);
        } else {
          console.warn("Audio file could not be decoded. The mp3 file may be corrupted.");
        }
      });`;
code = code.replace(target, replacement);
fs.writeFileSync('src/GameCanvas.tsx', code);
