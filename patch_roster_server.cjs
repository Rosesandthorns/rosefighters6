const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const target = `  { id: 'neddy', name: 'Neddy', color: '#eab308', hp: 80, speedMult: 1.2, category: 'Project Defence' }
];`;
const replacement = `  { id: 'neddy', name: 'Neddy', color: '#eab308', hp: 80, speedMult: 1.2, category: 'Project Defence' },
  { id: 'lantern', name: 'The Lantern Setter', color: '#fef08a', hp: 120, speedMult: 0.9, category: 'Project Defence' },
  { id: 'wax', name: 'Wax Driven Shopkeeper', color: '#f5f5f4', hp: 2500, speedMult: 0.1, category: 'Project Defence' },
  { id: 'kaelen', name: 'Commander Kaelen', color: '#4d7c0f', hp: 100, speedMult: 1.1, category: 'Vantage' },
  { id: 'luma', name: 'Luma Art', color: '#ec4899', hp: 100, speedMult: 1.1, category: 'Vantage' }
];`;
code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
