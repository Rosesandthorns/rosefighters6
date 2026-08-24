const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `            y: 50,
            width: 50, height: 50,`;
const replace1 = `            y: p.characterId === 'wax' ? 350 : 50,
            width: p.characterId === 'wax' ? 100 : 50, height: p.characterId === 'wax' ? 100 : 50,`;

code = code.replace(target1, replace1);

const target2 = `            y: 50,
            width: 50,
            height: 50,`;
const replace2 = `            y: lp.characterId === 'wax' ? 350 : 50,
            width: lp.characterId === 'wax' ? 100 : 50,
            height: lp.characterId === 'wax' ? 100 : 50,`;

code = code.replace(target2, replace2);
fs.writeFileSync('server.ts', code);
