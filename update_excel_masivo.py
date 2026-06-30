import codecs

with codecs.open('app_v3.js', 'r', 'utf-8') as f:
    code = f.read()

start_sig = "window.cargarHistorialExcel = (equip, idx) => {"
end_sig = "window.verGraficoCapilar = (equip, idx) => {"

if start_sig in code and end_sig in code:
    start_idx = code.find(start_sig)
    end_idx = code.find(end_sig)
    
    before = code[:start_idx]
    after = code[end_idx:]
    
    new_func = """  window.cargarHistorialExcel = (equip, idx) => {
    let currentConfig = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};
    const subs = currentConfig[equip];
    if (!subs || subs.length === 0) return alert('No hay capilares configurados en este equipo.');

    let fileInput = document.getElementById('hidden-excel-upload');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'hidden-excel-upload';
      fileInput.accept = '.xlsx, .xls, .xlsm';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = window.XLSX.read(data, {type: 'array'});
          
          let sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('DATOS'));
          if (!sheetName) sheetName = workbook.SheetNames[0];
          
          const sheet = workbook.Sheets[sheetName];
          const rows = window.XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null});
          
          if (rows.length < 2) {
             alert('El archivo no contiene suficientes datos.');
             return;
          }
          
          const headers = rows[0].map(h => String(h || '').trim().toUpperCase());
          let fechaIdx = headers.findIndex(h => h.includes('FECHA'));
          if (fechaIdx === -1) fechaIdx = 0; 
          
          let capilaresActualizados = 0;
          let mensajeResumen = '';
          
          // Iterar por todos los capilares del equipo actual
          subs.forEach((sub, subIdx) => {
              const capName = sub.name.toUpperCase();
              let valIdx = headers.findIndex(h => h === capName || h.includes(capName));
              
              // Solo intentamos cargar si encontramos una columna que coincida con el nombre del capilar,
              // O si es el capilar desde el cual se apreto el boton (como fallback por numero)
              if (valIdx === -1 && subIdx === idx) {
                  valIdx = subIdx + 1; // Fallback solo para el capilar seleccionado
              }
              
              if (valIdx !== -1) {
                  const history = [];
                  for (let i = 1; i < rows.length; i++) {
                     const row = rows[i];
                     if (row.length > Math.max(fechaIdx, valIdx)) {
                        let dateVal = row[fechaIdx];
                        let numVal = parseFloat(row[valIdx]);
                        if (!isNaN(numVal) && dateVal !== null) {
                          if (typeof dateVal === 'number') {
                             const dateObj = new Date(Math.round((dateVal - 25569)*86400*1000));
                             dateVal = dateObj.toISOString();
                          } else if (typeof dateVal === 'string') {
                             const parsed = new Date(dateVal);
                             if (!isNaN(parsed.getTime())) dateVal = parsed.toISOString();
                          }
                          history.push({ date: dateVal, val: numVal });
                        }
                     }
                  }
                  
                  if (history.length > 0) {
                      history.sort((a,b) => new Date(a.date) - new Date(b.date));
                      sub.history = history;
                      capilaresActualizados++;
                      mensajeResumen += `- ${sub.name}: ${history.length} registros cargados\\n`;
                  }
              }
          });
          
          if (capilaresActualizados > 0) {
             localStorage.setItem('QC_STANDARDS_CONFIG', JSON.stringify(currentConfig));
             alert('¡Historial masivo cargado con exito!\\nSe actualizaron ' + capilaresActualizados + ' capilares en simultaneo:\\n' + mensajeResumen);
             const selectEquip = document.getElementById('gestor-qc-equip');
             if(selectEquip) {
                 const ev = new Event('change');
                 selectEquip.dispatchEvent(ev);
             }
          } else {
             alert('No se encontraron datos numericos para los capilares. Asegurate de que los nombres de las columnas coincidan con los nombres configurados (Ej: "CAPILAR 1").');
          }
        } catch (err) {
          console.error(err);
          alert('Error procesando el archivo Excel.');
        } finally {
          fileInput.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    };
    fileInput.click();
  };

  """
    
    code = before + new_func + after
    with codecs.open('app_v3.js', 'w', 'utf-8') as f:
        f.write(code)
    print("Modificado con exito.")
else:
    print("No se encontraron los tags.")
