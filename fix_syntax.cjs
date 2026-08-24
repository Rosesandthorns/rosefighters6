const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("      }\n      } else if (player.characterId === 'lantern') {", "      } else if (player.characterId === 'lantern') {");
fs.writeFileSync('server.ts', code);
