import codecs
import re

# 1. Modificar index.html
with codecs.open('index.html', 'r', 'utf-8') as f:
    html = f.read()

old_alert = r'onclick="alert\([^)]+\)"(.*?>\s*<i data-lucide="plus-circle"></i>\s*A[^a-zA-Z]*adir Ensayo QC</button>)'
# Buscamos un patron mas robusto
old_alert_pattern = r'onclick="alert\(\'Esta funci[^\']*\'\)"'

html = re.sub(old_alert_pattern, 'onclick="if(window.abrirModalAddQCRun) window.abrirModalAddQCRun();"', html)

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(html)


# 2. Modificar app_v3.js
with codecs.open('app_v3.js', 'r', 'utf-8') as f:
    js = f.read()

new_logic = """
  window.abrirModalAddQCRun = () => {
    const mainSelect = document.getElementById('qc-select-standard');
    if (!mainSelect || !mainSelect.value) {
      alert('Por favor, selecciona un Estandar / Capilar primero desde el panel principal.');
      return;
    }
    const [equip, idx] = mainSelect.value.split('|');
    const config = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};
    const sub = config[equip] && config[equip][idx];
    if (!sub) return alert('No se pudo cargar la configuracion del capilar.');

    let modal = document.getElementById('modal-add-qc-run');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-add-qc-run';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    
    modal.innerHTML = `<div class="modal-container" style="max-width: 400px; width: 95%;">
        <div class="modal-header" style="border-bottom: 2px solid var(--primary); padding-bottom: 12px; margin-bottom: 15px;">
          <h3 style="margin:0; font-family:var(--font-heading); color:var(--primary); display:flex; align-items:center; gap:8px;"><i data-lucide="plus-circle"></i> Nuevo Ensayo QC</h3>
          <button class="modal-close-btn" onclick="document.getElementById('modal-add-qc-run').classList.remove('active')" style="color:var(--text-muted);">&times;</button>
        </div>
        <div style="padding: 10px;">
          <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom: 15px;">Capilar seleccionado: <strong>${equip} - ${sub.name}</strong></p>
          <div class="form-group">
            <label>Fecha de Lectura</label>
            <input type="date" id="qc-new-date" class="form-control" value="${today}">
          </div>
          <div class="form-group">
            <label>Valor de Viscosidad Obtenido</label>
            <input type="number" step="0.01" id="qc-new-val" class="form-control" placeholder="Ej: 100.25">
          </div>
          <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="btn btn-primary" style="flex:1;" onclick="window.guardarEnsayoQC('${equip}', ${idx})">Guardar</button>
            <button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('modal-add-qc-run').classList.remove('active')">Cancelar</button>
          </div>
        </div>
      </div>`;
      
    modal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => { document.getElementById('qc-new-val').focus(); }, 100);
  };
  
  window.guardarEnsayoQC = (equip, idx) => {
    const dateInput = document.getElementById('qc-new-date').value;
    const valInput = parseFloat(document.getElementById('qc-new-val').value);
    if (!dateInput || isNaN(valInput)) {
        alert('Por favor, ingresa una fecha valida y un valor numerico.');
        return;
    }
    
    let config = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};
    if (!config[equip] || !config[equip][idx]) return alert('Error al acceder a la BD.');
    
    // Convertir la fecha a formato ISO estandar para compatibilidad con el resto del sistema
    const isoDate = new Date(dateInput + 'T12:00:00Z').toISOString();
    
    if (!config[equip][idx].history) config[equip][idx].history = [];
    config[equip][idx].history.push({ date: isoDate, val: valInput });
    
    // Re-ordenar por fecha
    config[equip][idx].history.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    localStorage.setItem('QC_STANDARDS_CONFIG', JSON.stringify(config));
    
    document.getElementById('modal-add-qc-run').classList.remove('active');
    
    // Forzar actualizacion del grafico principal si existe la funcion
    const select = document.getElementById('qc-select-standard');
    if (select) {
        const ev = new Event('change');
        select.dispatchEvent(ev);
    }
  };
"""

target = "window.actualizarSelectorDeEstandaresPrincipal = () => {"
if target in js and "window.abrirModalAddQCRun =" not in js:
    js = js.replace(target, new_logic + "\n  " + target)
    with codecs.open('app_v3.js', 'w', 'utf-8') as f:
        f.write(js)
    print("app_v3.js modificado.")
else:
    print("No se pudo modificar app_v3.js")

print("Listo.")
