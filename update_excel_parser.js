const fs = require('fs');
let code = fs.readFileSync('app_v3.js', 'utf8');

// I will extract the existing function and replace its body
// Wait, an easier way is to just define the whole updated function block and replace it using regex.

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
          
          // Buscar hoja "Datos" o usar la primera
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
          if (fechaIdx === -1) fechaIdx = 0; // fallback a col A
          
          let valIdx = headers.findIndex(h => h === capName || h.includes(capName));
          if (valIdx === -1) valIdx = idx + 1; // fallback a col B, C, D... segun indice
          
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
            alert('No se encontraron datos num\u00e9ricos para este capilar en la hoja. Aseg\u00farate de que la columna coincida con el capilar seleccionado.');
            return;
          }
          
          history.sort((a,b) => new Date(a.date) - new Date(b.date));
          
          if (currentConfig[equip] && currentConfig[equip][idx]) {
             currentConfig[equip][idx].history = history;
             localStorage.setItem('QC_STANDARDS_CONFIG', JSON.stringify(currentConfig));
             alert('Historial de ' + currentConfig[equip][idx].name + ' cargado exitosamente. Se importaron ' + history.length + ' registros desde la columna: ' + (headers[valIdx] || 'Indefinida'));
             const selectEquip = document.getElementById('gestor-qc-equip');
             if(selectEquip) {
                 const ev = new Event('change');
                 selectEquip.dispatchEvent(ev);
             }
          }
        } catch (err) {
          console.error(err);
          alert('Error procesando el archivo Excel.');
        } finally {
          fileInput.value = ''; // clear
        }
      };
      reader.readAsArrayBuffer(file);
    };
    fileInput.click();
  };
`;

// Find the existing window.cargarHistorialExcel block and replace it
const startIndex = code.indexOf('window.cargarHistorialExcel = (equip, idx) => {');
const endIndex = code.indexOf('window.verGraficoCapilar = (equip, idx) => {');

if (startIndex !== -1 && endIndex !== -1) {
    const before = code.substring(0, startIndex);
    const after = code.substring(endIndex);
    code = before + updatedParser.trim() + '\n\n  ' + after;
    fs.writeFileSync('app_v3.js', code, 'utf8');
} else {
    console.log("Could not find blocks to replace.");
}
