const fs = require('fs');
const path = require('path');

const outDir = 'dist';
const entries = ['background', 'content', 'devtools', 'options', 'popup'];

// read manifest.json
const manifestPath = path.join(__dirname, outDir, 'manifest.json');
const data = fs.readFileSync(manifestPath, { encoding: 'utf-8', flag: 'r' });
let manifest = JSON.parse(data);
let isManifestChanged = false;

// modify manifest if entries are not found
for (const entry of entries)
  if (!fs.existsSync(path.join(__dirname, outDir, entry + '.js'))) {
    if (entry.includes('background')) delete manifest['background'];
    else if (entry.includes('content')) delete manifest['content_scripts'];
    else if (entry.includes('devtools')) delete manifest['devtools_page'];
    else if (entry.includes('options')) delete manifest['options_ui'];
    else if (entry.includes('popup')) delete manifest['browser_action'];
    isManifestChanged = true;
  }

// overwrite manifest.json
if (isManifestChanged)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), {
    encoding: 'utf-8',
    flag: 'w',
  });
