const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

const target = `      requestAnimationFrame(render);
    };`;
const replacement = `        // Special Visual Overlays
        const myPlayer = playersRef.current[socketRef.current?.id || ''];
        if (myPlayer) {
            // Lantern Blind
            if (myPlayer.activeEffects?.['lanternBlind'] > Date.now()) {
                ctx.fillStyle = 'rgba(0,0,0,0.98)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Redraw player (simplistic)
                ctx.save();
                ctx.translate(canvas.width/2 - myPlayer.x, canvas.height/2 - myPlayer.y);
                ctx.fillStyle = myPlayer.color;
                ctx.fillRect(myPlayer.x, myPlayer.y, myPlayer.width, myPlayer.height);
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText(myPlayer.name, myPlayer.x + myPlayer.width/2, myPlayer.y - 10);
                ctx.restore();
            }

            // Paint Screen
            if (myPlayer.activeEffects?.['paintScreen'] > Date.now()) {
                const timeRemaining = myPlayer.activeEffects['paintScreen'] - Date.now();
                const offset = (3000 - timeRemaining) / 3; 
                
                ctx.fillStyle = 'rgba(236, 72, 153, 0.8)';
                ctx.beginPath(); ctx.arc(canvas.width * 0.2, offset, 150, 0, Math.PI * 2); ctx.fill();
                
                ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
                ctx.beginPath(); ctx.arc(canvas.width * 0.8, offset * 1.2 - 100, 200, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
                ctx.beginPath(); ctx.arc(canvas.width * 0.5, offset * 0.8 + 50, 120, 0, Math.PI * 2); ctx.fill();
            }
        }

      requestAnimationFrame(render);
    };`;
code = code.replace(target, replacement);
fs.writeFileSync('src/GameCanvas.tsx', code);
