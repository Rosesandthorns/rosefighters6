const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

const target = `            if (player.activeEffects?.['coleRoll'] > Date.now()) {
                ctx.translate(player.width / 2, player.height / 2);
                ctx.rotate(Date.now() / 100);
                ctx.translate(-player.width / 2, -player.height / 2);
            }`;
const replacement = `            if (player.activeEffects?.['coleRoll'] > Date.now() || player.activeEffects?.['kaelenRoll'] > Date.now()) {
                ctx.translate(player.width / 2, player.height / 2);
                ctx.rotate(Date.now() / 100);
                ctx.translate(-player.width / 2, -player.height / 2);
            }`;
code = code.replace(target, replacement);
fs.writeFileSync('src/GameCanvas.tsx', code);
