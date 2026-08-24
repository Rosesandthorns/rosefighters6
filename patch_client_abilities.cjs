const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

const target = `          const isNeddy = myPlayer.characterId === 'neddy';
          if (mouseButtons[0] && abilityCooldownsRef.current[1] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 1 });
              abilityCooldownsRef.current[1] = isNeddy ? 30 : (isOakwell ? 15 : 60);
              hitCooldownsRef.current = {};
          } else if (mouseButtons[1] && abilityCooldownsRef.current[2] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 2 });
              abilityCooldownsRef.current[2] = isNeddy ? 30 : 300;
              hitCooldownsRef.current = {};
          } else if (mouseButtons[2] && abilityCooldownsRef.current[3] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 3 });
              abilityCooldownsRef.current[3] = isNeddy ? 30 : 300;
              hitCooldownsRef.current = {};
          }`;

const replacement = `          const isNeddy = myPlayer.characterId === 'neddy';
          const isKaelen = myPlayer.characterId === 'kaelen';
          const isLantern = myPlayer.characterId === 'lantern';
          const isWax = myPlayer.characterId === 'wax';

          let ab1CD = isNeddy ? 30 : (isOakwell ? 15 : (isKaelen ? 6 : (isLantern ? 120 : (isWax ? 90 : 60))));
          let ab2CD = isNeddy ? 30 : (isWax ? 90 : 300);
          let ab3CD = isNeddy ? 30 : (isWax ? 90 : 300);

          if (isKaelen && mouseButtons[0] && abilityCooldownsRef.current[1] === 0 && !myPlayer.isGrabbingLedge && moveTarget === 0 && myPlayer.isGrounded) {
              socket.emit('useAbility', { ability: 1 });
              abilityCooldownsRef.current[1] = ab1CD;
          } else if (!isKaelen && mouseButtons[0] && abilityCooldownsRef.current[1] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 1 });
              abilityCooldownsRef.current[1] = ab1CD;
              hitCooldownsRef.current = {};
          } else if (mouseButtons[1] && abilityCooldownsRef.current[2] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 2 });
              abilityCooldownsRef.current[2] = ab2CD;
              hitCooldownsRef.current = {};
          } else if (mouseButtons[2] && abilityCooldownsRef.current[3] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 3 });
              abilityCooldownsRef.current[3] = ab3CD;
              hitCooldownsRef.current = {};
          }`;

code = code.replace(target, replacement);

fs.writeFileSync('src/GameCanvas.tsx', code);
