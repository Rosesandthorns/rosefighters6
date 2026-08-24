const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

const target = `          let ab2CD = isNeddy ? 30 : (isWax ? 90 : 300);`;
const replacement = `          let ab2CD = isNeddy ? 30 : (isWax ? 90 : (isKaelen ? 15 : 300));`;
code = code.replace(target, replacement);
fs.writeFileSync('src/GameCanvas.tsx', code);

code = fs.readFileSync('server.ts', 'utf8');
const target2 = `              if (player.kaelenBomb) {
                  Object.values(players).forEach(p => {`;
const replacement2 = `              if (player.kaelenBomb) {
                  Object.values(players).forEach(p => {`;
// Actually, let's just add kaelenCooldown to server
const t3 = `          } else if (data.ability === 2) {
              if (player.kaelenBomb) {`;
const r3 = `          } else if (data.ability === 2) {
              if (player.kaelenBombCD && Date.now() < player.kaelenBombCD) return;
              if (player.kaelenBomb) {
                  player.kaelenBombCD = Date.now() + 10000;`;
code = code.replace(t3, r3);
fs.writeFileSync('server.ts', code);
