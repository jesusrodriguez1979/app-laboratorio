import codecs

# 1. Update index.html
with codecs.open('index.html', 'r', 'utf-8') as f:
    html = f.read()

if 'database.js' not in html:
    html = html.replace('<!-- Script del Controlador de la Aplicaci\u00f3n -->', 
                        '<!-- Script del Controlador de la Aplicaci\u00f3n -->\n  <script type="module" src="database.js?v=20260630"></script>')
    with codecs.open('index.html', 'w', 'utf-8') as f:
        f.write(html)

# 2. Update inventario.js to expose functions
with codecs.open('inventario.js', 'r', 'utf-8') as f:
    inv_js = f.read()

if 'window.renderCatalogo =' not in inv_js:
    inv_js = inv_js.replace('function renderCatalogo() {', 'window.renderCatalogo = function() {\n  function renderCatalogo() {').replace('const insumos = getInsumos();\n      const tbody = document.getElementById(\'tbody-inv-insumos\');', 'const insumos = getInsumos();\n      const tbody = document.getElementById(\'tbody-inv-insumos\');')
    # Actually, a safer way to expose is just at the end of the functions:
    # Instead of regex, I will just append to the file if they are not exposed.
    pass

# Safer way to expose inventario functions:
with codecs.open('inventario.js', 'r', 'utf-8') as f:
    inv_js = f.read()

expose_code = """
window.renderCatalogo = renderCatalogo;
window.renderMovimientos = renderMovimientos;
window.actualizarDashboardInv = actualizarDashboard;
"""
if 'window.renderCatalogo =' not in inv_js:
    inv_js += "\n" + expose_code
    with codecs.open('inventario.js', 'w', 'utf-8') as f:
        f.write(inv_js)

print("Integracion de base de datos lista.")
