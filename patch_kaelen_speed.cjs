const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

const target = `              vx = SPEED;
              moving = true;
          }`;
const replacement = `              vx = SPEED;
              moving = true;
          }
          
          if (myPlayer.characterId === 'kaelen' && mouseButtons[0] && myPlayer.isGrounded) {
              vx = 0;
          }`;

code = code.replace(target, replacement);

const target2 = `      let activeSpeedMult = myPlayer.speedMult;`;
const replacement2 = `      let activeSpeedMult = myPlayer.speedMult;
      if (myPlayer.activeEffects?.['waxSlow'] > Date.now()) activeSpeedMult *= 0.5;`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/GameCanvas.tsx', code);
