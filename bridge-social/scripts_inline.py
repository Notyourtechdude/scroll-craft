"""Bundle dist/ into one self-contained HTML file (fonts, CSS and JS inlined) for single-file hosts."""
import re, base64, glob, os, sys
D = 'dist'
out = sys.argv[1] if len(sys.argv) > 1 else 'deploy/index.html'
h = open(f'{D}/index.html').read()
css_path = glob.glob(f'{D}/assets/*.css')[0]; js_path = glob.glob(f'{D}/assets/*.js')[0]
css = open(css_path).read()
# keep only latin / latin-ext faces, woff2 only, as data URIs
def keep(face):
    return not re.search(r'cyrillic|vietnamese|greek', face)
css = re.sub(r'@font-face\{[^}]*\}', lambda m: m.group(0) if keep(m.group(0)) else '', css)
css = re.sub(r',\s*url\([^)]*\.woff\)\s*format\("woff"\)', '', css)
def data(m):
    p = os.path.join(D, 'assets', m.group(1).lstrip('./'))
    return 'url(data:font/woff2;base64,' + base64.b64encode(open(p, 'rb').read()).decode() + ')'
css = re.sub(r'url\((\./[^)]*\.woff2)\)', data, css)
js = open(js_path).read().replace('</script', '<\\/script')
h = re.sub(r'<script type="module"[^>]*></script>', '', h)
h = re.sub(r'<link rel="stylesheet"[^>]*>', lambda m: '<style>' + css + '</style>', h)
h = h.replace('</body>', '<script type="module">' + js + '</script>\n</body>')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w').write(h)
print(out, round(len(h) / 1024), 'KB')
