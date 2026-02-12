const fs = require('fs');
const content = fs.readFileSync('c:/Users/Kshitij G Dhakane/.gemini/antigravity/scratch/drgmc-player-auctions/frontend/src/pages/AuctionLive.jsx', 'utf8');
let count = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
        if (char === '{') count++;
        if (char === '}') {
            count--;
            if (count === 0) {
                console.log(`Brace level 0 at line ${i + 1}`);
            }
        }
    }
}
console.log(`Final brace count: ${count}`);
