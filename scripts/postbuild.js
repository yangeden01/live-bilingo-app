import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('dist/index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');

  // Remove type="module", crossorigin, and defer
  html = html.replace(/type="module"\s*/g, '');
  html = html.replace(/crossorigin(=("[^"]*"|'[^']*'|[^>\s]+))?\s*/g, '');
  html = html.replace(/<script\s+defer\s+/g, '<script ');

  // Normalize absolute asset paths to relative paths for file:// and WebView compatibility
  html = html.replace(/src="\/assets\//g, 'src="./assets/');
  html = html.replace(/href="\/assets\//g, 'href="./assets/');

  // Match script tags pointing to ./assets/index-*.js, /assets/index-*.js, or assets/index-*.js
  const scriptRegex = /<script\s+src="(\/|\.\/)?assets\/index-[^"]+\.js"><\/script>/g;
  const matches = html.match(scriptRegex);

  if (matches && matches.length > 0) {
    // Remove matches from wherever they are
    html = html.replace(scriptRegex, '');

    // Normalize match to use relative ./assets/
    const normalizedMatches = matches.map(m => m.replace(/src="(\/|\.\/)?assets\//, 'src="./assets/'));

    // Append script tags to just before </body>
    const scriptTags = normalizedMatches.join('\n    ');
    html = html.replace('</body>', `  ${scriptTags}\n  </body>`);
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('[postbuild.js] Successfully optimized dist/index.html script tags for WebView compatibility.');
}
