const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `    } else if (player.characterId === 'lantern') {
          if (data.ability === 1) {`;

// Let's just find the `} else if (player.characterId === 'lantern') {` and see what's there
let parts = code.split(`} else if (player.characterId === 'lantern') {`);
if(parts.length > 1) {
    console.log("Found lantern block!");
} else {
    console.log("Could not find lantern block directly, trying regex");
}
