// Builds the ATS-friendly resume (resume/resume.html) from resume/template.html.
// - Technical skills are copied from the Skills section of index.html, so the resume always matches the website.
// - Years of experience are calculated from the start dates below at build time.
// Usage:
//   node resume/build.js
//   then print resume/resume.html to assets/Rohit_Gautam_Resume.pdf (headless Chrome --print-to-pdf)
const fs = require('fs');
const path = require('path');

const DEV_START = '2022-04'; // first developer role (Netgen IT Solutions)
const IT_START = '2019-05';  // first IT role (Surevin Pvt. Ltd.)

function yearsSince(ym) {
  const [y, m] = ym.split('-').map(Number);
  const now = new Date();
  return Math.floor(((now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)) / 12);
}

const root = path.join(__dirname, '..');
const site = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

const start = site.indexOf('<div class="skills">');
const end = site.indexOf('<div class="edu', start);
if (start < 0 || end < 0) throw new Error('Skills section not found in index.html');
const block = site.slice(start, end);

const groups = [];
const re = /<h3>([\s\S]*?)<\/h3>[\s\S]*?<ul class="chips">([\s\S]*?)<\/ul>/g;
let m;
while ((m = re.exec(block))) {
  const items = [...m[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1].trim());
  groups.push({ title: m[1].trim(), items });
}
if (!groups.length) throw new Error('No skill groups parsed');

const skills = groups.map((g) => `<p><b>${g.title}:</b> ${g.items.join(', ')}</p>`).join('\n');
const total = groups.reduce((s, g) => s + g.items.length, 0);

const out = tpl
  .replace('{{SKILLS}}', skills)
  .replace('{{DEV_YEARS}}', String(yearsSince(DEV_START)))
  .replace('{{IT_YEARS}}', String(yearsSince(IT_START)));
if (/\{\{[A-Z_]+\}\}/.test(out)) throw new Error('Unfilled placeholder in template');

fs.writeFileSync(path.join(__dirname, 'resume.html'), out);
console.log(`resume.html built: ${groups.length} skill groups, ${total} skills, ${yearsSince(DEV_START)}+ dev years, ${yearsSince(IT_START)}+ IT years`);
