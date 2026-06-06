const fs = require('fs');
const html = fs.readFileSync('flashcard-app.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:[^>]*?)>([\s\S]*?)<\/script>/g)];
let idx = 0;
for (const match of scripts) {
  const src = /src\s*=\s*"([^"]+)"/.exec(match[0]);
  if (src) continue;
  idx++;
  try {
    new Function(match[1]);
    console.log('script', idx, 'OK');
  } catch (err) {
    console.error('script', idx, 'ERROR', err.message);
    process.exit(1);
  }
}
