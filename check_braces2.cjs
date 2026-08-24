const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');
const lines = code.split('\n');
let open = 0;
for (let i = 770; i < 1410; i++) {
    const line = lines[i];
    let prev = open;
    for(let j = 0; j < line.length; j++) {
        if(line[j] === '{') open++;
        if(line[j] === '}') open--;
    }
    // Print lines where the block level changes to a new base level, or just print all levels
    // Let's just look at the level at the start of `} else if`
    if (line.includes('} else if (player.characterId ===')) {
        console.log("Char start level: " + open + " at line " + (i+1));
    }
}
