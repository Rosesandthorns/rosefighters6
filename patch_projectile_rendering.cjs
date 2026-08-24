const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

const target = `            } else if (proj.type === 'laser') {
                ctx.fillStyle = 'red';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            } else {
                ctx.fillStyle = proj.ownerId === myId ? '#60a5fa' : '#ef4444';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            }`;

const replacement = `            } else if (proj.type === 'laser') {
                ctx.fillStyle = 'red';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            } else if (proj.type === 'lantern') {
                ctx.fillStyle = '#fef08a';
                ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.width, 0, Math.PI*2); ctx.fill();
            } else if (proj.type === 'book' || proj.type === 'fallingBook') {
                ctx.fillStyle = '#8b5cf6';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            } else if (proj.type === 'dart') {
                ctx.fillStyle = '#1e1b4b';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            } else if (proj.type === 'inkBlob') {
                ctx.fillStyle = '#0f172a';
                ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.width, 0, Math.PI*2); ctx.fill();
            } else if (proj.type === 'bullet') {
                ctx.fillStyle = '#eab308';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            } else if (proj.type === 'paintLob' || proj.type === 'paintTrap') {
                ctx.fillStyle = '#ec4899';
                ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.width, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillStyle = proj.ownerId === myId ? '#60a5fa' : '#ef4444';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/GameCanvas.tsx', code);
