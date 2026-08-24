const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const lines = code.split('\n');
let open = 0;
for (let i = 770; i < 1410; i++) {
    const line = lines[i];
    for(let j = 0; j < line.length; j++) {
        if(line[j] === '{') open++;
        if(line[j] === '}') open--;
    }
    if (i > 1400 || open < 2) {
        console.log("Line " + (i+1) + ": " + open + " | " + line);
    }
}
