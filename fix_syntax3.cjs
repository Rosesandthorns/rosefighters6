const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `              };
          } else if (player.characterId === 'lantern') {`;
const replacement = `              };
          }
      } else if (player.characterId === 'lantern') {`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
