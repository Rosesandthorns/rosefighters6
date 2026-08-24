const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

const regex = /if \(\(keys\['ArrowUp'\] \|\| keys\['KeyW'\] \|\| keys\['Space'\]\) && myPlayer\.isGrounded && !\(myPlayer\.activeEffects\?\.\['ricaCharge'\] > Date\.now\(\)\).+\) \{/g;
code = code.replace(regex, "if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && myPlayer.isGrounded && myPlayer.characterId !== 'wax' && !(myPlayer.activeEffects?.['ricaCharge'] > Date.now())) {");

// I'll also just replace the specific mangled string.
code = code.replace(/if \(\(keys\['ArrowUp'\] \|\| keys\['KeyW'\] \|\| keys\['Space'\]\) && myPlayer\.isGrounded && !\(myPlayer\.activeEffects\?\.\['ricaCharge'\] > Date\.now\(\)\)&& myPlayer.isGrounded && !\(myPlayer\.activeEffects\?\.\['ricaCharge'\] > Date\.now\(\)\) myPlayer.isGrounded && myPlayer\.characterId !== 'wax' && !\(myPlayer\.activeEffects\?\.\['ricaCharge'\] > Date\.now\(\)\)\) \{/, "if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && myPlayer.isGrounded && myPlayer.characterId !== 'wax' && !(myPlayer.activeEffects?.['ricaCharge'] > Date.now())) {");

fs.writeFileSync('src/GameCanvas.tsx', code);
