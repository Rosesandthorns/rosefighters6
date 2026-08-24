const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

let target = `                      if (target.characterId === 'wisp' && target.activeEffects?.['wispInvuln'] > Date.now()) continue;`;
let replacement = `                      if (target.characterId === 'wisp' && target.activeEffects?.['wispInvuln'] > Date.now()) continue;
                      if (target.activeEffects?.['kaelenRoll'] > Date.now()) continue;`;
code = code.replace(target, replacement);

target = `                      io.to(target.id).emit('applyKnockback', { vx: proj.vx > 0 ? 10 : -10, vy: -5, stunFrames: 10 });`;
replacement = `                      let stun = 10;
                      if (proj.type === 'lantern') stun = 30;
                      
                      if (proj.type === 'dart') {
                          target.activeEffects = target.activeEffects || {};
                          target.activeEffects['waxSlow'] = Date.now() + 3000;
                      }
                      if (proj.type === 'paintLob' || proj.type === 'paintTrap') {
                          target.activeEffects = target.activeEffects || {};
                          target.activeEffects['paintScreen'] = Date.now() + 3000;
                      }

                      if (target.characterId !== 'wax') io.to(target.id).emit('applyKnockback', { vx: proj.vx > 0 ? 10 : -10, vy: -5, stunFrames: stun });`;
code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
