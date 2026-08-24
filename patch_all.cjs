const fs = require('fs');

// Patch tsconfig.json
let tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
tsconfig.compilerOptions.esModuleInterop = true;
tsconfig.compilerOptions.resolveJsonModule = true;
fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));

// Patch server.ts
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
    "isInvincible?: boolean;",
    "isInvincible?: boolean;\n  activeEffects?: Record<string, number>;\n  hp?: number;\n  kaelenBombCD?: number;\n  kaelenBomb?: boolean;"
);
// Fix the remaining "lantern" errors (type '"lantern"' is not assignable to type ...) wait, wasn't that fixed?
// I had replaced it but maybe it didn't apply because the script failed?
// Ah, the first patch did replace it, let's verify if 'paintLob' is there.
fs.writeFileSync('server.ts', code);
