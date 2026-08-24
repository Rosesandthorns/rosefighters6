const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startBlock = `      } else if (player.characterId === 'lantern') {`;
const endBlock = `          }
      }
  });`; // the end of playerHit which was replaced

// Find the start
const startIdx = code.indexOf(startBlock);
if (startIdx === -1) {
    console.log("Could not find start");
    process.exit(1);
}

// Find the end
// Wait, the block actually ends at `} else if (player.characterId === 'luma') { ... }  });`
// So I will just slice from `startIdx` to the next `});` after it.
let nextEnd = code.indexOf("  });\n\n  socket.on('playerDied'", startIdx);
if (nextEnd === -1) {
    nextEnd = code.indexOf("  });", startIdx);
}
if (nextEnd === -1) {
    console.log("Could not find end");
    process.exit(1);
}

let extraction = code.slice(startIdx, nextEnd + "  });".length);
console.log("Extracted:", extraction.slice(0, 100), "...", extraction.slice(-100));

// Remove it from playerHit
code = code.replace(extraction, `      }\n  });`);

// Now insert it into useAbility
// Look for where useAbility ends
const useAbilityEnd = `              }
          }
      }
  });`;

// Wait, earlier I saw:
// 1057:  socket.on('useAbility', (data) => {
// Let's find the useAbility block in the CURRENT modified code.
let useAbilityStart = code.indexOf("socket.on('useAbility', (data) => {");
if (useAbilityStart === -1) {
    console.log("Could not find useAbility");
    process.exit(1);
}

// Just insert the extracted code (without the trailing `  });`) right before the `});` of useAbility.
// To do this, I can find the end of `useAbility`.
// Let's just find the next `});` after `useAbilityStart`. Wait, there are nested `});` inside it? 
// No, the abilities don't have nested `});` at the top level, actually `setTimeout(() => { ... }, ...)` does.

// The safest way is to find the LAST `}` of `useAbility` block.
// Or we can just use the target from `patch_server_abilities.cjs` again but target the CORRECT one!
// The correct target is the end of useAbility.

