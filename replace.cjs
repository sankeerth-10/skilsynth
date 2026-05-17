const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replacements to convert from dark to light mode
content = content.replace(/bg-slate-950\/80/g, 'bg-white/80');
content = content.replace(/bg-slate-950/g, 'bg-slate-50');
content = content.replace(/bg-slate-900/g, 'bg-slate-100');
content = content.replace(/bg-slate-800/g, 'bg-white');
content = content.replace(/border-slate-800/g, 'border-slate-200');
content = content.replace(/border-slate-700/g, 'border-slate-200');
content = content.replace(/text-slate-400/g, 'text-slate-500');
content = content.replace(/text-slate-300/g, 'text-slate-600');
content = content.replace(/text-slate-200/g, 'text-slate-600');
content = content.replace(/text-white/g, 'text-slate-900');
content = content.replace(/glass-dark/g, 'glass');
// specific to avoid text-slate-900 on buttons where we want white text
content = content.replace(/from-cyan-500 to-blue-600 text-slate-900/g, 'from-cyan-500 to-blue-600 text-white');
content = content.replace(/bg-cyan-900\/50/g, 'bg-cyan-100');
content = content.replace(/bg-purple-900\/50/g, 'bg-purple-100');
content = content.replace(/bg-blue-900\/50/g, 'bg-blue-100');
content = content.replace(/bg-slate-800 text-slate-900/g, 'bg-white text-slate-900'); // fix buttons

// Fix text-white explicitly in some components we just broke
content = content.replace(/bg-indigo-600 text-slate-900/g, 'bg-indigo-600 text-white');
content = content.replace(/bg-red-600 text-slate-900/g, 'bg-red-600 text-white');

fs.writeFileSync('src/App.tsx', content);
console.log("Done");
