const fs = require('fs');
let code = fs.readFileSync('app_v3.js', 'utf8');

const updatedParser = `
  window.cargarHistorialExcel = (equip, idx) => {
    let currentConfig = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};
    const capName = currentConfig[equip] && currentConfig[equip][idx] ? currentConfig[equip][idx].name.toUpperCase() : '';

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
          
          let valIdx = headers.findIndex(h => h === capName || h.includes(capName));
          if (valIdx === -1) valIdx = idx + 1; 
          
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
          
          if (history.length === 0) {
            alert('No se encontraron datos numericos para este capilar en la hoja. Asegurate de que la columna coincida con el nombre del capilar seleccionado.');
            return;
          }
          
          history.sort((a,b) => new Date(a.date) - new Date(b.date));
          
          if (currentConfig[equip] && currentConfig[equip][idx]) {
             currentConfig[equip][idx].history = history;
             localStorage.setItem('QC_STANDARDS_CONFIG', JSON.stringify(currentConfig));
             alert('Historial de ' + currentConfig[equip][idx].name + ' cargado exitosamente. Se importaron ' + history.length + ' registros desde la columna: ' + (headers[valIdx] || 'Indefinida'));
             
             // Quick UI refresh trigger
             const btnAdd = document.getElementById('btn-add-qc-subcomponent');
             if(btnAdd) {
                const ev = new Event('change');
                const selectEquip = document.getElementById('gestor-qc-equip');
                if (selectEquip) selectEquip.dispatchEvent(ev);
             }
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
`;

const regex = /window\.cargarHistorialExcel\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?(?=window\.verGraficoCapilar\s*=)/;

if (regex.test(code)) {
    code = code.replace(regex, updatedParser + '\n  ');
    fs.writeFileSync('app_v3.js', code, 'utf8');
    console.log('Success');
} else {
    console.log('Regex did not match');
}
