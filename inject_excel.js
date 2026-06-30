const fs = require('fs');
let code = fs.readFileSync('app_v3.js', 'utf8');

const injection = `
  window.cargarHistorialExcel = (equip, idx) => {
    let fileInput = document.getElementById('hidden-excel-upload');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'hidden-excel-upload';
      fileInput.accept = '.xlsx, .xls';
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
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = window.XLSX.utils.sheet_to_json(firstSheet, {header: 1});
          
          const history = [];
          for (let i = 1; i < rows.length; i++) {
             const row = rows[i];
             if (row.length >= 2) {
                let dateVal = row[0];
                let numVal = parseFloat(row[1]);
                if (!isNaN(numVal)) {
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
            alert('No se encontraron datos v\u00e1lidos. Aseg\u00farese de que la columna A tenga Fechas y la Columna B tenga los Valores de viscosidad.');
            return;
          }
          
          history.sort((a,b) => new Date(a.date) - new Date(b.date));
          
          let currentConfig = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};
          if (currentConfig[equip] && currentConfig[equip][idx]) {
             currentConfig[equip][idx].history = history;
             localStorage.setItem('QC_STANDARDS_CONFIG', JSON.stringify(currentConfig));
             alert('Historial cargado exitosamente. Se importaron ' + history.length + ' registros.');
             
             // Refresh button
             const selectEquip = document.getElementById('gestor-qc-equip');
             if(selectEquip) {
                 const ev = new Event('change');
                 selectEquip.dispatchEvent(ev);
             }
          }
        } catch (err) {
          console.error(err);
          alert('Error procesando el archivo Excel.');
        }
      };
      reader.readAsArrayBuffer(file);
    };
    fileInput.click();
  };

  window.verGraficoCapilar = (equip, idx) => {
    let currentConfig = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};
    const sub = currentConfig[equip] && currentConfig[equip][idx];
    if (!sub) return alert('Configuraci\u00f3n no encontrada.');
    if (!sub.history || sub.history.length === 0) return alert('No hay historial cargado para graficar.');
    if (!sub.nominal || !sub.sd) return alert('Debe configurar el Valor Nominal y la Desviaci\u00f3n Est\u00e1ndar (SD) para graficar.');
    
    const modalId = 'modal-qc-grafico-capilar';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = \`<div class="modal-container" style="max-width: 900px; width: 95%;">
        <div class="modal-header" style="border-bottom: 2px solid var(--primary); padding-bottom: 12px; margin-bottom: 15px;">
          <h3 style="margin:0; font-family:var(--font-heading); color:var(--primary); display:flex; align-items:center; gap:8px;"><i data-lucide="bar-chart-2"></i> Carta de Control QC: \${sub.name} (\${equip})</h3>
          <button class="modal-close-btn" onclick="document.getElementById('\${modalId}').classList.remove('active')" style="color:var(--text-muted);">&times;</button>
        </div>
        <div style="padding: 10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom: 15px; font-size:0.95rem; background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
            <span><strong>Valor Nominal:</strong> \${sub.nominal}</span>
            <span><strong>Desviaci\u00f3n (SD):</strong> \${sub.sd}</span>
            <span><strong>Registros:</strong> \${sub.history.length}</span>
          </div>
          <div id="capilar-chart-container" style="width: 100%; height: 450px;"></div>
        </div>
      </div>\`;
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
        
        let violations = [];
        if (window.evaluarReglasWestgard) {
           violations = window.evaluarReglasWestgard(sub.history, mean, sd);
        }
        
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

// ==========================================
// M\u00d3DULO DE EST\u00c1NDARES Y QC
`;

code = code.replace("// ==========================================\n// M\u00d3DULO DE EST\u00c1NDARES Y QC", injection);

const btnRegex = /<button class="btn btn-secondary btn-sm" style="width:100%; height: 38px;" onclick="alert\('Lector Excel: En construcci[^>]+><i data-lucide="upload-cloud"><\/i> Cargar Historial \(Excel\)<\/button>/g;

const newBtns = '<button class="btn btn-secondary btn-sm" style="width:100%; height: 38px; margin-bottom:6px;" onclick="window.cargarHistorialExcel(\'${equip}\', ${idx})"><i data-lucide="upload-cloud"></i> Cargar Excel</button>\n<button class="btn btn-primary btn-sm" style="width:100%; height: 38px;" onclick="window.verGraficoCapilar(\'${equip}\', ${idx})"><i data-lucide="bar-chart-2"></i> Ver Gr\u00e1fico</button>';

code = code.replace(btnRegex, newBtns);

fs.writeFileSync('app_v3.js', code, 'utf8');
