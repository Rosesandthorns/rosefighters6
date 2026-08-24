const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("const PORT = process.env.PORT || 3000;", "const PORT = 3000;");
code = code.replace("httpServer.listen(PORT, () => {", 'httpServer.listen(PORT, "0.0.0.0", () => {');
fs.writeFileSync('server.ts', code);
