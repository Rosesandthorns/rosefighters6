const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');
const target = `      // Side bounds (Blast zones)
      if (myPlayer.x < -200) myPlayer.x = -200;
      if (myPlayer.x + myPlayer.width > 1224) myPlayer.x = 1224 - myPlayer.width;`;
const replacement = `      // Side bounds (Blast zones)
      if (myPlayer.characterId === 'wax') {
          if (myPlayer.x < 212) myPlayer.x = 212;
          if (myPlayer.x + myPlayer.width > 812) myPlayer.x = 812 - myPlayer.width;
      } else {
          if (myPlayer.x < -200) myPlayer.x = -200;
          if (myPlayer.x + myPlayer.width > 1224) myPlayer.x = 1224 - myPlayer.width;
      }`;
code = code.replace(target, replacement);
fs.writeFileSync('src/GameCanvas.tsx', code);
