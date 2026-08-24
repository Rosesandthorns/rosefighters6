const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `      } else if (player.characterId === 'lantern') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'lantern',
                  x: player.x, y: player.y, startX: player.x, startY: player.y,
                  vx: player.facing === 'right' ? 12 : -12, vy: -10,
                  ownerId: player.id, damage: 20, life: 3000
              };
          } else if (data.ability === 2) {
              Object.values(players).forEach(p => {
                  if (p.id !== player.id) {
                      p.activeEffects = p.activeEffects || {};
                      p.activeEffects['lanternBlind'] = Date.now() + 3000;
                  }
              });
          } else if (data.ability === 3) {
              let nearestDist = Infinity;
              let nearestP = null;
              Object.values(players).forEach(p => {
                  if (p.id !== player.id && p.hp > 0) {
                      const dist = Math.hypot(p.x - player.x, p.y - player.y);
                      if (dist < nearestDist) { nearestDist = dist; nearestP = p; }
                  }
              });
              const targetX = nearestP ? nearestP.x : player.x + (player.facing === 'right' ? 100 : -100);
              const targetY = nearestP ? nearestP.y : player.y;
              for(let i=0; i<3; i++) {
                  setTimeout(() => {
                      if (!players[player.id]) return;
                      const dx = targetX - player.x;
                      const dy = targetY - player.y;
                      const mag = Math.hypot(dx, dy) || 1;
                      const id = 'proj_' + entityIdCounter++;
                      projectiles[id] = {
                          id, type: 'book',
                          x: player.x, y: player.y, startX: player.x, startY: player.y,
                          vx: (dx / mag) * 15, vy: (dy / mag) * 15,
                          ownerId: player.id, damage: 15, life: 2000
                      };
                  }, i * 200);
              }
          }
      } else if (player.characterId === 'wax') {
          if (data.ability === 1) {
              Object.values(players).forEach(p => {
                  if (p.id !== player.id && p.hp > 0) {
                      const dx = p.x - player.x;
                      const dy = p.y - player.y;
                      const mag = Math.hypot(dx, dy) || 1;
                      const id = 'proj_' + entityIdCounter++;
                      projectiles[id] = {
                          id, type: 'dart',
                          x: player.x + player.width/2, y: player.y + player.height/2, startX: player.x, startY: player.y,
                          vx: (dx / mag) * 10, vy: (dy / mag) * 10,
                          ownerId: player.id, damage: 5, life: 4000
                      };
                  }
              });
          } else if (data.ability === 2) {
              for(let i=0; i<15; i++) {
                  const id = 'proj_' + entityIdCounter++;
                  projectiles[id] = {
                      id, type: 'fallingBook',
                      x: -200 + Math.random() * 1400, y: -100, startX: 0, startY: -100,
                      vx: 0, vy: 8 + Math.random() * 4,
                      ownerId: player.id, damage: 15, life: 5000
                  };
              }
          } else if (data.ability === 3) {
              for(let i=0; i<10; i++) {
                  const id1 = 'proj_' + entityIdCounter++;
                  projectiles[id1] = {
                      id: id1, type: 'inkBlob',
                      x: -100, y: Math.random() * 800, startX: -100, startY: 0,
                      vx: 6 + Math.random()*4, vy: 0, ownerId: player.id, damage: 20, life: 6000
                  };
                  const id2 = 'proj_' + entityIdCounter++;
                  projectiles[id2] = {
                      id: id2, type: 'inkBlob',
                      x: 1300, y: Math.random() * 800, startX: 1300, startY: 0,
                      vx: -6 - Math.random()*4, vy: 0, ownerId: player.id, damage: 20, life: 6000
                  };
              }
          }
      } else if (player.characterId === 'kaelen') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'bullet',
                  x: player.facing === 'right' ? player.x + player.width : player.x, y: player.y + player.height/2, 
                  startX: player.x, startY: player.y,
                  vx: player.facing === 'right' ? 25 : -25, vy: 0,
                  ownerId: player.id, damage: 3, life: 1500
              };
          } else if (data.ability === 2) {
              if (player.kaelenBomb) {
                  Object.values(players).forEach(p => {
                      if (p.id !== player.id && p.hp > 0) {
                          const dist = Math.hypot(p.x - player.kaelenBomb.x, p.y - player.kaelenBomb.y);
                          if (dist < 150) {
                              p.hp -= 50;
                              io.to(p.id).emit('applyKnockback', { vx: (p.x > player.kaelenBomb.x ? 15 : -15), vy: -15, stunFrames: 30 });
                              if (p.hp <= 0) io.emit('playerDied', { id: p.id, killer: player.id });
                          }
                      }
                  });
                  delete player.kaelenBomb;
              } else {
                  player.kaelenBomb = { x: player.x + player.width/2, y: player.y + player.height/2 };
              }
          } else if (data.ability === 3) {
              player.activeEffects = player.activeEffects || {};
              player.activeEffects['kaelenRoll'] = Date.now() + 500;
          }
      } else if (player.characterId === 'luma') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'paintLob',
                  x: player.x, y: player.y, startX: player.x, startY: player.y,
                  vx: player.facing === 'right' ? 15 : -15, vy: -12,
                  ownerId: player.id, damage: 5, life: 2500
              };
          } else if (data.ability === 2) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'paintTrap',
                  x: player.x, y: player.y, startX: player.x, startY: player.y,
                  vx: 0, vy: 0, ownerId: player.id, damage: 15, life: 8000
              };
          } else if (data.ability === 3) {
              for(let i=0; i<8; i++) {
                  const angle = (i / 8) * Math.PI * 2;
                  const id = 'proj_' + entityIdCounter++;
                  projectiles[id] = {
                      id, type: 'paintLob',
                      x: player.x, y: player.y, startX: player.x, startY: player.y,
                      vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12,
                      ownerId: player.id, damage: 5, life: 1500
                  };
              }
          }
      }
  });`;

// Find the end of socket.on('useAbility'
const targetPattern = /          }\n      }\n  \}\);/g;
// Actually `super-block-bros (6)/server.ts` has:
//       }
//   });
// Let's do a replace that grabs the useAbility block up to its end.
const useAbilityStart = code.indexOf("socket.on('useAbility', (data) => {");
const useAbilityEnd = code.indexOf("  });\n\n  socket.on('playerHit'", useAbilityStart) || code.indexOf("  });\n\n  socket.on('playerDied'", useAbilityStart);

if (useAbilityEnd !== -1) {
    let block = code.substring(useAbilityStart, useAbilityEnd);
    let newBlock = block.replace(/          }\n      }\n$/, replacement.replace("  });", ""));
    code = code.replace(block, newBlock);
} else {
    // try to just find the end
    let parts = code.split(/          }\n      }\n  \}\);/);
    if(parts.length > 1) {
        code = parts.join(replacement); // careful, could replace multiple
    } else {
        console.log("Failed to inject");
    }
}
fs.writeFileSync('server.ts', code);
