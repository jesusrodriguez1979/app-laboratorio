import codecs
import re

with codecs.open('app_v3.js', 'r', 'utf-8') as f:
    code = f.read()

# Buscamos el boton original o el boton ya reemplazado mal.
old_btn_pattern = r'<button class="btn btn-secondary btn-sm" style="width:100%; height: 38px;" onclick="alert\(\\\'Lector Excel[^>]+><i data-lucide="upload-cloud"></i> Cargar Historial \(Excel\)</button>'

# Por si las comillas estan escapadas diferente
old_btn_pattern2 = r'<button class="btn btn-secondary btn-sm" style="width:100%; height: 38px;" onclick="alert\(\'Lector Excel[^>]+><i data-lucide="upload-cloud"></i> Cargar Historial \(Excel\)</button>'

new_btns = """<button class="btn btn-secondary btn-sm" style="width:100%; height: 38px; margin-bottom:6px;" onclick="window.cargarHistorialExcel('${equip}', ${idx})"><i data-lucide="upload-cloud"></i> Cargar Excel</button>
<button class="btn btn-primary btn-sm" style="width:100%; height: 38px;" onclick="window.verGraficoCapilar('${equip}', ${idx})"><i data-lucide="bar-chart-2"></i> Ver Grafico</button>"""

if re.search(old_btn_pattern, code):
    code = re.sub(old_btn_pattern, new_btns, code)
    print("Reemplazado patron 1")
elif re.search(old_btn_pattern2, code):
    code = re.sub(old_btn_pattern2, new_btns, code)
    print("Reemplazado patron 2")
else:
    print("No se encontro el boton para reemplazar.")

with codecs.open('app_v3.js', 'w', 'utf-8') as f:
    f.write(code)
