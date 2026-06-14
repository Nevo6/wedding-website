const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });

const mockGlobals = `
  window.getUserIP = async () => '127.0.0.1';
  window.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
`;

const js = fs.readFileSync('static/Script.js', 'utf8');
const scriptEl = dom.window.document.createElement('script');
scriptEl.textContent = mockGlobals + js;

dom.window.addEventListener('error', event => {
  console.log('JSDOM ERROR:', event.error.message);
  console.log('STACK:', event.error.stack);
});

try {
  dom.window.document.body.appendChild(scriptEl);
  console.log('Script parsed and ran without uncaught top-level error.');
} catch (e) {
  console.log('CATCH ERROR:', e.message);
}
