#!/bin/sh
# Baut die App lokal nach _site (gleiche Schritte wie .github/workflows/pages.yml).
# Aufruf aus dem Repo-Ordner:  sh werkzeuge/lokal_bauen.sh   – danach z. B.  npx serve _site
set -e
mkdir -p build _site
rm -rf build/src && cp -r src build/src
cd build
[ -f package.json ] || npm init -y > /dev/null
[ -d node_modules/three ] || npm install --silent react@18.1.0 react-dom@18.1.0 lucide-react@^0.577.0 three@0.160.0 esbuild tailwindcss@3
npx esbuild src/index.js --bundle --minify --loader:.js=jsx --jsx=automatic \
  --define:process.env.NODE_ENV='"production"' --outfile=../_site/bundle.js
npx tailwindcss@3 -i src/tailwind-input.css -o ../_site/tailwind.css \
  --content "src/**/*.{js,jsx},../public/index.html" --minify
cd ..
rm -rf _site/fonts _site/audio _site/modelle _site/bilder
cp -r public/fonts _site/fonts
# 3D-Handmodelle (MIT, siehe public/modelle/LIZENZ-Haende.txt)
if [ -d public/modelle ]; then cp -r public/modelle _site/modelle; fi
# Bilder (z. B. Stufen-Karten, Standbilder aus der 3D-Szene)
if [ -d public/bilder ]; then cp -r public/bilder _site/bilder; fi
# Ton: nur fertige MP3 (und den Bericht) kopieren – Zwischendateien einer gerade laufenden Erzeugung überspringen
if [ -d public/audio ]; then
  cp -r public/audio _site/audio 2>/dev/null || echo "Hinweis: nicht alle Tondateien kopiert (läuft gerade eine Erzeugung?)"
  find _site/audio -name '*.tmp.wav' -delete 2>/dev/null || true
fi
node -e "
  const fs = require('fs');
  let h = fs.readFileSync('public/index.html', 'utf8');
  h = h.replace(/<script type=\"module\"[^>]*><\/script>/, '');
  h = h.replace('</body>', '  <script src=\"bundle.js\"></script>\n  </body>');
  fs.writeFileSync('_site/index.html', h);
"
touch _site/.nojekyll
echo fertig
