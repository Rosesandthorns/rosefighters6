const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

const target = `if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && myPlayer.isGrounded && !(myPlayer.activeEffects?.['ricaCharge'] > Date.now())) {`;
const replace = `if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && myPlayer.isGrounded && myPlayer.characterId !== 'wax' && !(myPlayer.activeEffects?.['ricaCharge'] > Date.now())) {`;
if (code.includes(target)) {
    code = code.replace(target, replace);
    fs.writeFileSync('src/GameCanvas.tsx', code);
    console.log("Patched jump");
} else {
    console.log("Jump target not found");
}
