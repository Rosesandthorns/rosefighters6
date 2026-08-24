const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

let patchContent = fs.readFileSync('patch_server_abilities.cjs', 'utf8');
const replacementMatch = patchContent.match(/const replacement = \`([\s\S]+?)\`;/);
if (!replacementMatch) process.exit(1);

let insertedBlock = replacementMatch[1];
// The problem is `patch_kaelen_cd.cjs` modified `server.ts` AFTER `patch_server_abilities.cjs` ran!
// It replaced `if (player.kaelenBomb) {` with `if (player.kaelenBombCD && Date.now() < player.kaelenBombCD) return; ...`
// Let's do a regex to grab the block from `} else if (player.characterId === 'lantern') {`
// up to `} else if (player.characterId === 'luma') { ... }`
// Actually, let's just find `socket.on('useAbility', (data) => {` and see where it ends.
