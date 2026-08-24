const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');
const target = `  { id: 'neddy', name: 'Neddy', color: '#eab308', hp: 80, category: 'Project Defence' }
];`;
const replacement = `  { id: 'neddy', name: 'Neddy', color: '#eab308', hp: 80, category: 'Project Defence' },
  { id: 'lantern', name: 'The Lantern Setter', color: '#fef08a', hp: 120, category: 'Project Defence' },
  { id: 'wax', name: 'Wax Driven Shopkeeper', color: '#f5f5f4', hp: 2500, category: 'Project Defence' },
  { id: 'kaelen', name: 'Commander Kaelen', color: '#4d7c0f', hp: 100, category: 'Vantage' },
  { id: 'luma', name: 'Luma Art', color: '#ec4899', hp: 100, category: 'Vantage' }
];`;
code = code.replace(target, replacement);
fs.writeFileSync('src/GameCanvas.tsx', code);
