import codecs
import re

# 1. Modificar index.html
with codecs.open('index.html', 'r', 'utf-8') as f:
    html = f.read()

# Hacer opcionales el costo y stock minimo
html = html.replace('<input type="number" step="0.01" id="inv-ins-costo" class="form-control" required>', '<input type="number" step="0.01" id="inv-ins-costo" class="form-control" placeholder="Opcional">')
html = html.replace('<input type="number" step="0.01" id="inv-ins-min" class="form-control" required>', '<input type="number" step="0.01" id="inv-ins-min" class="form-control" placeholder="Opcional">')

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(html)

# 2. Modificar inventario.js
with codecs.open('inventario.js', 'r', 'utf-8') as f:
    js = f.read()

# Agregar el boton de edicion en renderCatalogo
btn_delete = '<button class="btn btn-danger btn-sm" onclick="eliminarInsumo(${idx})" style="padding: 2px 6px; font-size:0.75rem;">&times;</button>'
btn_edit = '<button class="btn btn-primary btn-sm" onclick="editarInsumo(${idx})" style="padding: 2px 6px; font-size:0.75rem; margin-right: 4px;"><i data-lucide="edit-2" style="width:12px; height:12px;"></i></button>'

if btn_delete in js:
    js = js.replace(btn_delete, btn_edit + btn_delete)

# Hacer que al crear, costoUnitario y stockMinimo puedan ser 0
js = js.replace("costoUnitario: parseFloat(document.getElementById('inv-ins-costo').value),", "costoUnitario: parseFloat(document.getElementById('inv-ins-costo').value) || 0,")
js = js.replace("stockMinimo: parseFloat(document.getElementById('inv-ins-min').value)", "stockMinimo: parseFloat(document.getElementById('inv-ins-min').value) || 0")

# Agregar la funcion editarInsumo
edit_logic = """
  window.editarInsumo = (idx) => {
    const db = getInsumos();
    const ins = db[idx];
    const nuevoNombre = prompt('Editar Nombre del Insumo:', ins.nombre);
    if (nuevoNombre !== null) {
      const nuevoCosto = prompt('Editar Costo ($/U):', ins.costoUnitario);
      if (nuevoCosto !== null) {
        const nuevoMin = prompt('Editar Stock Minimo (Alerta):', ins.stockMinimo);
        if (nuevoMin !== null) {
           ins.nombre = nuevoNombre.trim() || ins.nombre;
           ins.costoUnitario = parseFloat(nuevoCosto) || 0;
           ins.stockMinimo = parseFloat(nuevoMin) || 0;
           saveInsumos(db);
           renderCatalogo();
           actualizarDashboard();
        }
      }
    }
  };
"""

target = "window.eliminarInsumo ="
if target in js and "window.editarInsumo =" not in js:
    js = js.replace(target, edit_logic + "\n  " + target)

with codecs.open('inventario.js', 'w', 'utf-8') as f:
    f.write(js)

print("Modificaciones realizadas con exito.")
