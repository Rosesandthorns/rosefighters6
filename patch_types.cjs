const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch Projectile type
code = code.replace(
    "type: 'card' | 'boomerang' | 'fireball' | 'plate' | 'thorn' | 'laser';", 
    "type: 'card' | 'boomerang' | 'fireball' | 'plate' | 'thorn' | 'laser' | 'lantern' | 'book' | 'dart' | 'fallingBook' | 'inkBlob' | 'bullet' | 'paintLob' | 'paintTrap';"
);

// Patch Player type
code = code.replace(
    "lastDamageTaken?: number;",
    "lastDamageTaken?: number;\n    activeEffects?: Record<string, number>;\n    hp?: number;\n    kaelenBombCD?: number;\n    kaelenBomb?: boolean;"
);

fs.writeFileSync('server.ts', code);
