const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `                        io.to(player.id).emit('applyKnockback', { vx: proj.vx > 0 ? 10 : -10, vy: -5, stunFrames: 10 });`;
const replace1 = `                        if (player.characterId !== 'wax') io.to(player.id).emit('applyKnockback', { vx: proj.vx > 0 ? 10 : -10, vy: -5, stunFrames: 10 });`;
code = code.replace(target1, replace1);

const target2 = `                    io.to(target.id).emit('applyKnockback', { vx: 0, vy: -30, stunFrames: 60 });`;
const replace2 = `                    if (target.characterId !== 'wax') io.to(target.id).emit('applyKnockback', { vx: 0, vy: -30, stunFrames: 60 });`;
code = code.replace(target2, replace2);

const target3 = `                      io.to(target.id).emit('applyKnockback', { vx: player.facing === 'right' ? 10 : -10, vy: -10, stunFrames: 30 });`;
const replace3 = `                      if (target.characterId !== 'wax') io.to(target.id).emit('applyKnockback', { vx: player.facing === 'right' ? 10 : -10, vy: -10, stunFrames: 30 });`;
code = code.replace(target3, replace3);

const target4 = `                  io.to(target.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 60 });`;
const replace4 = `                  if (target.characterId !== 'wax') io.to(target.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 60 });`;
code = code.replace(target4, replace4);

fs.writeFileSync('server.ts', code);
