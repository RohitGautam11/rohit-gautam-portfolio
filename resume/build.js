// Builds resume/resume.html from resume/template.html, copying the skills section
// straight from index.html so the resume always matches the website.
// Usage: node resume/build.js   (then print resume.html to PDF)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const site = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

const start = site.indexOf('<div class="skills">');
const end = site.indexOf('<div class="edu', start);
if (start < 0 || end < 0) throw new Error('Skills section not found in index.html');
const block = site.slice(start, end);

const cards = [];
const re = /<h3>([\s\S]*?)<\/h3>[\s\S]*?<ul class="chips">([\s\S]*?)<\/ul>/g;
let m;
while ((m = re.exec(block))) {
  const items = [...m[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1].trim());
  cards.push({ title: m[1].trim(), items });
}
if (!cards.length) throw new Error('No skill cards parsed');

const total = cards.reduce((s, c) => s + c.items.length, 0);
const html = cards.map((c) =>
  `      <div class="skill"><div class="skill__head"><h3>${c.title}</h3><span class="count">${c.items.length}</span></div>` +
  `<ul class="chips">${c.items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`
).join('\n');

fs.writeFileSync(path.join(__dirname, 'resume.html'), tpl.replace('{{SKILLS}}', html).replace('{{TOTAL}}', String(total)));
console.log(`resume.html built: ${cards.length} skill groups, ${total} skills`);
