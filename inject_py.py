import codecs

with codecs.open('app_v3.js', 'r', 'utf-8') as f:
    code = f.read()

new_functions = """
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
          fileInput.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    };
    fileInput.click();
  };

  window.verGraficoCapilar = (equip, idx) => {
    let currentConfig = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};
    const sub = currentConfig[equip] && currentConfig[equip][idx];
    if (!sub) return alert('Configuracion no encontrada.');
    if (!sub.history || sub.history.length === 0) return alert('No hay historial cargado para graficar.');
    if (!sub.nominal || !sub.sd) return alert('Debe configurar el Valor Nominal y la Desviacion Estandar (SD) para graficar.');
    
    const modalId = 'modal-qc-grafico-capilar';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `<div class="modal-container" style="max-width: 900px; width: 95%;">
        <div class="modal-header" style="border-bottom: 2px solid var(--primary); padding-bottom: 12px; margin-bottom: 15px;">
          <h3 style="margin:0; font-family:var(--font-heading); color:var(--primary); display:flex; align-items:center; gap:8px;"><i data-lucide="bar-chart-2"></i> Carta de Control QC: ${sub.name} (${equip})</h3>
          <button class="modal-close-btn" onclick="document.getElementById('${modalId}').classList.remove('active')" style="color:var(--text-muted);">&times;</button>
        </div>
        <div style="padding: 10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom: 15px; font-size:0.95rem; background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
            <span><strong>Valor Nominal:</strong> ${sub.nominal}</span>
            <span><strong>Desviacion (SD):</strong> ${sub.sd}</span>
            <span><strong>Registros:</strong> ${sub.history.length}</span>
          </div>
          <div id="capilar-chart-container" style="width: 100%; height: 450px;"></div>
        </div>
      </div>`;
    modal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
      const chartDom = document.getElementById('capilar-chart-container');
      if (chartDom && window.echarts) {
        const myChart = window.echarts.init(chartDom);
        const mean = parseFloat(sub.nominal);
        const sd = parseFloat(sub.sd);
        
        const dates = sub.history.map(h => {
           let d = new Date(h.date);
           return isNaN(d.getTime()) ? h.date : d.toLocaleDateString('es-ES');
        });
        const values = sub.history.map(h => h.val);
        
        const option = {
          tooltip: { trigger: 'axis' },
          grid: { left: '5%', right: '5%', bottom: '10%', top: '5%', containLabel: true },
          xAxis: { type: 'category', data: dates, boundaryGap: false },
          yAxis: { 
            type: 'value', 
            min: (mean - (sd * 4)).toFixed(2), 
            max: (mean + (sd * 4)).toFixed(2),
            splitLine: { show: false }
          },
          series: [
            {
              name: 'Viscosidad',
              type: 'line',
              data: values,
              itemStyle: { color: '#002f6c' },
              lineStyle: { width: 2 },
              symbol: 'circle',
              symbolSize: 6,
              markLine: {
                silent: true,
                symbol: 'none',
                data: [
                  { yAxis: mean, lineStyle: { color: '#10b981', width: 2, type: 'solid' }, label: { formatter: 'Media', position: 'insideStartTop' } },
                  { yAxis: mean + sd, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: '+1 SD' } },
                  { yAxis: mean - sd, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: '-1 SD' } },
                  { yAxis: mean + (2*sd), lineStyle: { color: '#f97316', type: 'dashed' }, label: { formatter: '+2 SD' } },
                  { yAxis: mean - (2*sd), lineStyle: { color: '#f97316', type: 'dashed' }, label: { formatter: '-2 SD' } },
                  { yAxis: mean + (3*sd), lineStyle: { color: '#ef4444', type: 'solid' }, label: { formatter: '+3 SD' } },
                  { yAxis: mean - (3*sd), lineStyle: { color: '#ef4444', type: 'solid' }, label: { formatter: '-3 SD' } }
                ]
              }
            }
          ]
        };
        myChart.setOption(option);
      }
    }, 150);
  };

"""

target = "function inicializarModuloQC() {"
if target in code:
    code = code.replace(target, new_functions + "\\n" + target)
    with codecs.open('app_v3.js', 'w', 'utf-8') as f:
        f.write(code)
    print("Inyectado con exito.")
else:
    print("No se encontro target.")
