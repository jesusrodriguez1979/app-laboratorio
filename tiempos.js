document.addEventListener('DOMContentLoaded', () => {
  const viewTiempos = document.getElementById('view-tiempos');
  if (!viewTiempos) return;
  // --- UTILS ---
  function formatTime(decimalHrs) {
    if (isNaN(decimalHrs) || decimalHrs <= 0) return '0m';
    const totalMins = Math.round(decimalHrs * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  const MACRO_COLORS = {
    'Productiva': '#10b981', 
    'Salud': '#74ACDF',      
    'Objetivos': '#3b82f6',  
    'Mantenimiento': '#f59e0b', 
    'Asistencia': '#8b5cf6', 
    'Análisis de Activos': '#ec4899', 
    'default': '#94a3b8' 
  };

  function getMacroColor(macroName) {
    if(!macroName) return MACRO_COLORS['default'];
    if(macroName.includes('Activos') || macroName.includes('Cat 8')) return MACRO_COLORS['Análisis de Activos'];
    return MACRO_COLORS[macroName] || MACRO_COLORS['default'];
  }

  // --- 1. NAVEGACIÓN DE PESTAÑAS ---
  const tabBtns = viewTiempos.querySelectorAll('.tmp-tab-btn');
  const tabContents = viewTiempos.querySelectorAll('.tmp-tab-content');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tmptab');
      document.getElementById(targetId).style.display = 'block';
      if(targetId === 'tmp-dashboard') renderDashboard();
    });
  });

  // --- 2. BASE DE DATOS LOCAL ---
  const getCategorias = () => JSON.parse(localStorage.getItem('lubelab_tiempos_categorias') || '[]');
  const saveCategorias = (data) => localStorage.setItem('lubelab_tiempos_categorias', JSON.stringify(data));

  const getActividades = () => JSON.parse(localStorage.getItem('lubelab_tiempos_actividades') || '[]');
  const saveActividades = (data) => localStorage.setItem('lubelab_tiempos_actividades', JSON.stringify(data));

  const getCampana = () => JSON.parse(localStorage.getItem('lubelab_tiempos_campana') || '{"inicio":"","fin":""}');
  const saveCampana = (data) => localStorage.setItem('lubelab_tiempos_campana', JSON.stringify(data));

  function isFranco(dateMs) {
    const c = getCampana();
    if(!c.inicio) return false;
    
    // Cálculo Matemático de Ciclo 14x14 (14 trabajo, 14 franco = 28 días)
    const target = new Date(dateMs);
    const anchor = new Date(c.inicio + "T00:00:00");
    
    const dAnchor = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const dTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
    
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.floor((dTarget - dAnchor) / msPerDay);
    
    let cycleDay = diffDays % 28;
    if (cycleDay < 0) cycleDay += 28;
    
    // 0 a 13 son días de Campaña. 14 a 27 son Franco.
    return cycleDay >= 14;
  }

  const getMuestrasActivas = () => JSON.parse(localStorage.getItem('lubelab_muestras_activas') || '[]');
  const getMuestrasCompletadas = () => JSON.parse(localStorage.getItem('lubelab_muestras_completadas') || '[]');

  // --- 3. MÓDULO DE CATEGORÍAS ---
  function renderTablaCategorias() {
    const cats = getCategorias();
    const tbody = document.getElementById('tbody-tmp-categorias');
    tbody.innerHTML = '';
    
    // Actualizar selector del formulario de actividades
    const selectJerarquia = document.getElementById('tmp-act-jerarquia');
    selectJerarquia.innerHTML = '<option value="">-- Seleccione Jerarquía --</option>';

    if(cats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No hay categorías registradas.</td></tr>';
      return;
    }

    cats.forEach((c, idx) => {
      // Color by macro
      let color = '#4b5563';
      if(c.macro === 'Productiva') color = 'var(--success)';
      if(c.macro === 'Mantenimiento') color = 'var(--warning)';
      if(c.macro === 'Asistencia') color = 'var(--primary)';

      tbody.innerHTML += `
        <tr>
          <td><span class="badge" style="background:${color}; color:#fff;">${c.macro}</span></td>
          <td><strong>${c.sim1}</strong></td>
          <td>${c.nom1}</td>
          <td>${c.sim2 || '-'}</td>
          <td>${c.nom2 || '-'}</td>
          <td>${c.sim3 || '-'}</td>
          <td>${c.nom3 || '-'}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="eliminarCategoria(${idx})" style="padding: 2px 6px; font-size:0.75rem;">&times;</button>
          </td>
        </tr>
      `;

      // Build path label
      let label = `[${c.macro}] ${c.sim1}: ${c.nom1}`;
      if(c.sim2) label += ` > ${c.sim2}: ${c.nom2}`;
      if(c.sim3) label += ` > ${c.sim3}: ${c.nom3}`;
      selectJerarquia.innerHTML += `<option value="${c.id}">${label}</option>`;
    });
  }

  const formCat = document.getElementById('form-tmp-cat');
  formCat.addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getCategorias();
    const catObj = {
      id: 'cat_' + Date.now(),
      sim1: document.getElementById('tmp-cat-sim1').value.trim(),
      nom1: document.getElementById('tmp-cat-nom1').value.trim(),
      sim2: document.getElementById('tmp-cat-sim2').value.trim(),
      nom2: document.getElementById('tmp-cat-nom2').value.trim(),
      sim3: document.getElementById('tmp-cat-sim3').value.trim(),
      nom3: document.getElementById('tmp-cat-nom3').value.trim(),
      macro: document.getElementById('tmp-cat-macro').value
    };
    db.push(catObj);
    saveCategorias(db);
    formCat.reset();
    renderTablaCategorias();
  });

  window.eliminarCategoria = (idx) => {
    if(!confirm("¿Seguro que deseas eliminar esta categoría? (Las actividades existentes la conservarán en su historial).")) return;
    const db = getCategorias();
    db.splice(idx, 1);
    saveCategorias(db);
    renderTablaCategorias();
  };


  // --- 4. MÓDULO DE ACTIVIDADES ---
  
  // Calcular duración automáticamente
  const f1 = document.getElementById('tmp-act-f1');
  const h1 = document.getElementById('tmp-act-h1');
  const f2 = document.getElementById('tmp-act-f2');
  const h2 = document.getElementById('tmp-act-h2');
  const dDur = document.getElementById('tmp-act-dur');

  function calcularDuracion() {
    if(f1.value && h1.value && f2.value && h2.value) {
      const d1 = new Date(`${f1.value}T${h1.value}`);
      const d2 = new Date(`${f2.value}T${h2.value}`);
      let diff = (d2 - d1) / (1000 * 60 * 60); // hours
      if(diff < 0) {
        dDur.value = "Error: Fin es menor a Inicio";
        dDur.style.color = "var(--danger)";
      } else {
        dDur.value = diff.toFixed(2);
        dDur.style.color = "";
      }
    }
  }
  [f1, h1, f2, h2].forEach(el => el.addEventListener('change', calcularDuracion));

  function renderTablaActividades() {
    const acts = getActividades();
    const tbody = document.getElementById('tbody-tmp-actividades');
    tbody.innerHTML = '';
    
    const sorted = [...acts].sort((a,b) => new Date(b.inicio) - new Date(a.inicio));

    if(sorted.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No hay actividades registradas.</td></tr>';
      return;
    }

    sorted.forEach((a, idx) => {
      let impactColor = a.impacto === 'Normal' ? '#4b5563' : (a.impacto === 'Demora' ? 'var(--warning)' : (a.impacto === 'Suspensión' ? 'var(--danger)' : 'var(--primary)'));
      
      tbody.innerHTML += `
        <tr>
          <td><small>${new Date(a.inicio).toLocaleString()}</small></td>
          <td><small>${new Date(a.fin).toLocaleString()}</small></td>
          <td style="font-weight:bold;">${formatTime(a.duracion)}</td>
          <td><strong>${a.desc}</strong></td>
          <td><small>${a.catLabel}</small></td>
          <td>${a.participantes} <br><small>(${a.area})</small></td>
          <td><span class="badge" style="background:${impactColor}; color:#fff;">${a.impacto}</span></td>
          <td style="display:flex; gap:5px; justify-content:center;">
            <button class="btn btn-secondary btn-sm" onclick="editarActividad(${idx})" style="padding: 2px 6px; font-size:0.75rem;" title="Editar">&#9998;</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarActividad(${idx})" style="padding: 2px 6px; font-size:0.75rem;" title="Eliminar">&times;</button>
          </td>
        </tr>
      `;
    });
  }

  let currentEditActId = null;
  const formAct = document.getElementById('form-tmp-act');
  const btnCancelAct = document.getElementById('btn-cancel-act');
  const lblSubmitAct = document.getElementById('lbl-submit-act');

  btnCancelAct.addEventListener('click', () => {
    currentEditActId = null;
    formAct.reset();
    dDur.value = '';
    btnCancelAct.style.display = 'none';
    lblSubmitAct.textContent = 'Registrar Actividad';
  });

  window.editarActividad = (idx) => {
    const db = getActividades();
    const sorted = [...db].sort((a,b) => new Date(b.inicio) - new Date(a.inicio));
    const act = sorted[idx];
    if(!act) return;
    
    currentEditActId = act.id;
    
    const d1 = new Date(act.inicio);
    f1.value = d1.getFullYear() + '-' + String(d1.getMonth()+1).padStart(2,'0') + '-' + String(d1.getDate()).padStart(2,'0');
    h1.value = String(d1.getHours()).padStart(2,'0') + ':' + String(d1.getMinutes()).padStart(2,'0');

    const d2 = new Date(act.fin);
    f2.value = d2.getFullYear() + '-' + String(d2.getMonth()+1).padStart(2,'0') + '-' + String(d2.getDate()).padStart(2,'0');
    h2.value = String(d2.getHours()).padStart(2,'0') + ':' + String(d2.getMinutes()).padStart(2,'0');
    
    document.getElementById('tmp-act-desc').value = act.desc;
    document.getElementById('tmp-act-parts').value = act.participantes;
    document.getElementById('tmp-act-area').value = act.area;
    document.getElementById('tmp-act-jerarquia').value = act.catId;
    document.getElementById('tmp-act-impacto').value = act.impacto;
    
    calcularDuracion();
    
    btnCancelAct.style.display = 'inline-flex';
    lblSubmitAct.textContent = 'Actualizar Actividad';
    
    document.getElementById('tmp-actividades').scrollIntoView({behavior: 'smooth'});
  };

  formAct.addEventListener('submit', (e) => {
    e.preventDefault();
    if(dDur.value.includes("Error") || !dDur.value) {
      alert("Corrige las fechas/horas antes de guardar.");
      return;
    }

    const catId = document.getElementById('tmp-act-jerarquia').value;
    const cats = getCategorias();
    const catObj = cats.find(c => c.id === catId);
    if(!catObj) return;

    let label = `[${catObj.macro}] ${catObj.sim1}`;
    if(catObj.sim2) label += ` > ${catObj.sim2}`;
    if(catObj.sim3) label += ` > ${catObj.sim3}`;

    const actObj = {
      id: currentEditActId ? currentEditActId : 'act_' + Date.now(),
      inicio: new Date(`${f1.value}T${h1.value}`).toISOString(),
      fin: new Date(`${f2.value}T${h2.value}`).toISOString(),
      duracion: parseFloat(dDur.value),
      desc: document.getElementById('tmp-act-desc').value.trim(),
      participantes: document.getElementById('tmp-act-parts').value.trim(),
      area: document.getElementById('tmp-act-area').value.trim(),
      catId: catObj.id,
      catMacro: catObj.macro,
      catN1: catObj.sim1 + ': ' + catObj.nom1,
      catN2: catObj.sim2 ? (catObj.sim2 + ': ' + catObj.nom2) : null,
      catN3: catObj.sim3 ? (catObj.sim3 + ': ' + catObj.nom3) : null,
      catLabel: label,
      impacto: document.getElementById('tmp-act-impacto').value
    };

    const db = getActividades();
    
    if (currentEditActId) {
      const realIdx = db.findIndex(a => a.id === currentEditActId);
      if (realIdx > -1) db[realIdx] = actObj;
      currentEditActId = null;
      btnCancelAct.style.display = 'none';
      lblSubmitAct.textContent = 'Registrar Actividad';
    } else {
      db.push(actObj);
    }
    
    saveActividades(db);
    formAct.reset();
    dDur.value = '';
    renderTablaActividades();
    renderDashboard();
  });

  window.eliminarActividad = (idx) => {
    if(!confirm("¿Eliminar actividad histórica?")) return;
    const db = getActividades();
    // Since we sorted it for display, we must find the real index.
    // However, the idx passed here is from the sorted array! 
    // Fix: Pass ID instead of IDX.
    const sorted = [...db].sort((a,b) => new Date(b.inicio) - new Date(a.inicio));
    const targetId = sorted[idx].id;
    const realIdx = db.findIndex(a => a.id === targetId);
    
    db.splice(realIdx, 1);
    saveActividades(db);
    renderTablaActividades();
    renderDashboard();
  };

  // --- 5. DASHBOARD & APEXCHARTS ---
  let drilldownChart = null;
  let macrogrupoChart = null;
  let ganttChart = null;

  document.getElementById('btn-tmp-actualizar').addEventListener('click', renderDashboard);

  // Campaña
  const iptCampanaInicio = document.getElementById('tmp-campana-inicio');
  const iptCampanaFin = document.getElementById('tmp-campana-fin');
  const btnCampanaGuardar = document.getElementById('btn-tmp-campana-guardar');
  
  const cData = getCampana();
  if(cData.inicio) iptCampanaInicio.value = cData.inicio;
  if(cData.fin) iptCampanaFin.value = cData.fin;

  btnCampanaGuardar.addEventListener('click', () => {
    saveCampana({
      inicio: iptCampanaInicio.value,
      fin: iptCampanaFin.value
    });
    alert('Fechas de campaña (14x14) actualizadas correctamente.');
    renderDashboard();
  });

  // Set default filter to current day
  const tmpSelectTipo = document.getElementById('tmp-filtro-tipo');
  const tmpFiltroDia = document.getElementById('tmp-filtro-dia');
  const tmpFiltroMes = document.getElementById('tmp-filtro-mes');
  const tmpFiltroAno = document.getElementById('tmp-filtro-ano');
  
  const now = new Date();
  tmpFiltroDia.value = now.toISOString().split('T')[0];
  tmpFiltroMes.value = now.toISOString().slice(0, 7); // YYYY-MM
  tmpFiltroAno.value = now.getFullYear();

  tmpSelectTipo.addEventListener('change', (e) => {
    tmpFiltroDia.style.display = e.target.value === 'dia' ? 'block' : 'none';
    tmpFiltroMes.style.display = e.target.value === 'mes' ? 'block' : 'none';
    tmpFiltroAno.style.display = e.target.value === 'ano' ? 'block' : 'none';
  });

  function getStartDateAndRefDate() {
    let startDate = new Date();
    let refDate = new Date();
    const tipo = tmpSelectTipo.value;

    if (tipo === 'dia') {
      // For type="date", value is YYYY-MM-DD in local time
      const [y, m, d] = (tmpFiltroDia.value || now.toISOString().split('T')[0]).split('-');
      startDate = new Date(y, parseInt(m)-1, d, 0,0,0,0);
      refDate = new Date(y, parseInt(m)-1, d, 23,59,59,999);
    } else if (tipo === 'mes') {
      const [yy, mm] = (tmpFiltroMes.value || now.toISOString().slice(0, 7)).split('-');
      startDate = new Date(yy, parseInt(mm)-1, 1, 0,0,0,0);
      refDate = new Date(yy, parseInt(mm), 0, 23,59,59,999); // last day of month
    } else if (tipo === 'ano') {
      const yy = parseInt(tmpFiltroAno.value || now.getFullYear());
      startDate = new Date(yy, 0, 1, 0,0,0,0);
      refDate = new Date(yy, 11, 31, 23,59,59,999);
    }
    return { startDate, refDate };
  }

  function getFilteredActivities() {
    const act = getActividades();
    const { startDate, refDate } = getStartDateAndRefDate();

    return act.filter(a => {
      const d = new Date(a.inicio);
      return d >= startDate && d <= refDate;
    });
  }

  function renderDashboard() {
    const filteredActs = getFilteredActivities();

    // 1. KPIs
    let demoraHs=0, demoraCount=0;
    let suspHs=0, suspCount=0;

    filteredActs.forEach(a => {
      if(a.impacto === 'Demora') { demoraHs += a.duracion; demoraCount++; }
      if(a.impacto === 'Suspensión') { suspHs += a.duracion; suspCount++; }
    });

    document.getElementById('tmp-kpi-demora').textContent = formatTime(demoraHs);
    document.getElementById('tmp-kpi-demora-count').textContent = demoraCount + ' eventos';
    document.getElementById('tmp-kpi-suspension').textContent = formatTime(suspHs);
    document.getElementById('tmp-kpi-suspension-count').textContent = suspCount + ' eventos';
    document.getElementById('tmp-kpi-superposicion').textContent = 'Calculando...';

    // 2. Gráfico Macro-grupos
    const macroMap = {};
    filteredActs.forEach(a => {
      macroMap[a.catMacro] = (macroMap[a.catMacro] || 0) + a.duracion;
    });
    const macroLabels = Object.keys(macroMap);
    const macroSeries = Object.values(macroMap);

    if (macrogrupoChart) {
      if(macrogrupoChart.destroy) macrogrupoChart.destroy();
      else if(macrogrupoChart.dispose) macrogrupoChart.dispose();
    }
    
    const domMacro = document.getElementById('chart-tmp-macrogrupos');
    domMacro.innerHTML = '';
    macrogrupoChart = echarts.init(domMacro, 'dark', { renderer: 'svg' });

    const dataMacro = [];
    if(macroLabels.length === 0) {
      dataMacro.push({ value: 1, name: 'Sin datos', itemStyle: { color: getMacroColor('default') } });
    } else {
      macroLabels.forEach((lbl, i) => {
        dataMacro.push({ value: macroSeries[i], name: lbl, itemStyle: { color: getMacroColor(lbl) } });
      });
    }

    const optionMacro = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: function(p) { return `${p.name} : ${formatTime(p.value)} (${p.percent}%)`; }
      },
      series: [
        {
          name: 'Macro-grupos',
          type: 'pie',
          radius: ['20%', '80%'],
          center: ['50%', '50%'],
          roseType: 'radius',
          itemStyle: {
            borderRadius: 5,
            shadowBlur: 15,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetX: 5,
            shadowOffsetY: 5
          },
          label: { color: '#e2e8f0', formatter: '{b}\\n{d}%' },
          data: dataMacro.sort((a, b) => a.value - b.value)
        }
      ]
    };
    macrogrupoChart.setOption(optionMacro);

    // 3. Gráfico Drill-down (Comienza mostrando N1)
    renderDrilldownLevel(filteredActs, 1, null, null);

    // 4. Gantt Combinado
    renderGantt(filteredActs);
  }

  // Drilldown logic
  // Level 1: N1 (Categorías)
  // Level 2: N2 (Subcategorías) given N1
  // Level 3: N3 (3er orden) given N2
  function renderDrilldownLevel(acts, level, parentN1, parentN2) {
    const map = {};
    acts.forEach(a => {
      if(level === 1) {
        map[a.catN1] = (map[a.catN1] || 0) + a.duracion;
      } else if (level === 2) {
        if(a.catN1 === parentN1 && a.catN2) {
          map[a.catN2] = (map[a.catN2] || 0) + a.duracion;
        }
      } else if (level === 3) {
        if(a.catN2 === parentN2 && a.catN3) {
          map[a.catN3] = (map[a.catN3] || 0) + a.duracion;
        }
      }
    });

    const labels = Object.keys(map);
    const series = Object.values(map);

    let title = level === 1 ? 'Categorías (Nivel 1)' : (level === 2 ? `Subcategorías de ${parentN1}` : `Detalle de ${parentN2}`);

    if (drilldownChart) {
      if(drilldownChart.destroy) drilldownChart.destroy();
      else if(drilldownChart.dispose) drilldownChart.dispose();
    }
    
    const domDrill = document.getElementById('chart-tmp-drilldown');
    domDrill.innerHTML = '';
    drilldownChart = echarts.init(domDrill, 'dark', { renderer: 'svg' });

    const dataDrill = [];
    if(labels.length === 0) {
      dataDrill.push({ value: 1, name: 'Sin datos' });
    } else {
      labels.forEach((lbl, i) => {
        dataDrill.push({ value: series[i], name: lbl });
      });
    }

    const optionDrill = {
      backgroundColor: 'transparent',
      title: {
        text: title,
        left: 'center',
        textStyle: { color: '#fff', fontSize: 14 }
      },
      tooltip: {
        trigger: 'item',
        formatter: function(p) { return `${p.name} : ${formatTime(p.value)} (${p.percent}%)`; }
      },
      series: [
        {
          name: 'Distribución',
          type: 'pie',
          radius: ['20%', '80%'],
          center: ['50%', '55%'],
          roseType: 'radius',
          itemStyle: {
            borderRadius: 5,
            shadowBlur: 15,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetX: 5,
            shadowOffsetY: 5
          },
          label: { color: '#e2e8f0', formatter: '{b}\\n{d}%' },
          data: dataDrill.sort((a, b) => a.value - b.value)
        }
      ]
    };
    drilldownChart.setOption(optionDrill);

    drilldownChart.off('click');
    drilldownChart.on('click', function(params) {
      if(labels.length === 0 || labels[0] === 'Sin datos') return;
      if(level === 1) {
        renderDrilldownLevel(acts, 2, params.name, null);
      } else if (level === 2) {
        renderDrilldownLevel(acts, 3, parentN1, params.name);
      }
    });

    // Right click to go back
    domDrill.oncontextmenu = (e) => {
      e.preventDefault();
      if(level === 3) renderDrilldownLevel(acts, 2, parentN1, null);
      else if(level === 2) renderDrilldownLevel(acts, 1, null, null);
    };
  }

  // GANTT
  function renderGantt(filteredActs) {
    const { startDate, refDate } = getStartDateAndRefDate();
    const dataSeries = [];
    const events = [];

    // 1. Agregar Actividades Manuales
    filteredActs.forEach(a => {
      a.isManual = true;
      events.push({ time: new Date(a.inicio).getTime(), type: 'start', id: a.id, obj: a, isManual: true });
      events.push({ time: new Date(a.fin).getTime(), type: 'end', id: a.id });
    });

    // Se ha eliminado el bloque de "Muestras del Laboratorio" a petición del usuario.
    // Solo se graficarán actividades manuales.

    // Inyectar cortes artificiales a las 07:00 y 19:00 para separar horas extra
    if(events.length > 0) {
      const minT = Math.min(...events.map(e => e.time));
      const maxT = Math.max(...events.map(e => e.time));
      let cursorD = new Date(minT);
      cursorD.setHours(0,0,0,0);
      while(cursorD.getTime() <= maxT + 86400000) {
        let startB = new Date(cursorD); startB.setHours(7,0,0,0);
        let endB = new Date(cursorD); endB.setHours(19,0,0,0);
        events.push({ time: startB.getTime(), type: 'split', id: 'dummy_s' });
        events.push({ time: endB.getTime(), type: 'split', id: 'dummy_e' });
        cursorD.setDate(cursorD.getDate() + 1);
      }
    }

    // Algoritmo Sweep-Line para Superposición y Horas Extra
    events.sort((a,b) => a.time - b.time);
    let activeSet = new Map();
    let lastTime = null;
    let totalOverlapMs = 0;

    events.forEach(ev => {
      if(lastTime !== null && lastTime < ev.time && activeSet.size > 0) {
        const isOverlap = activeSet.size > 1;
        
        // Calcular punto medio para saber si el segmento está fuera de hora (antes de 7 o después de 19)
        let midPoint = new Date(lastTime + (ev.time - lastTime)/2);
        let midHour = midPoint.getHours() + (midPoint.getMinutes() / 60);
        let isOutOfBounds = (midHour < 7 || midHour >= 19);

        if(isOverlap) {
          totalOverlapMs += (ev.time - lastTime);
        }

        activeSet.forEach((taskObj) => {
          let color = getMacroColor(taskObj.catMacro);
          let label = taskObj.desc;
          
          let enFranco = isFranco(midPoint.getTime());

          if (enFranco) {
            color = '#fbbf24'; // Dorado brillante para Franco
            label += ' [TRABAJO EN FRANCO]';
          } else {
            if (isOverlap) {
              color = '#ef4444'; // Red para colisiones
              label += ' [SUPERPOSICIÓN]';
            }
            if (isOutOfBounds && taskObj.isManual) {
              color = '#ef4444'; // Red para horas extra
              if(!isOverlap) label += ' [FUERA DE HORA]';
            }
          }

          dataSeries.push({
            x: taskObj.isManual ? taskObj.catMacro : 'A.A. (Análisis de Activos)',
            y: [lastTime, ev.time],
            fillColor: color,
            meta: label
          });
        });
      }
      if(ev.type === 'start') activeSet.set(ev.id, ev.obj);
      else if (ev.type === 'end') activeSet.delete(ev.id);
      
      lastTime = ev.time;
    });

    // Actualizar KPI de superposición automáticamente
    let superHs = totalOverlapMs / (1000 * 60 * 60);
    document.getElementById('tmp-kpi-superposicion').textContent = formatTime(superHs);
    document.getElementById('tmp-kpi-superposicion-count').textContent = 'Automático';

    if (ganttChart) ganttChart.destroy();

    // Clamp eje X a 07:00 - 19:00 si es un solo día
    let xAxisOptions = {
      type: 'datetime',
      labels: { 
        style: { colors: '#94a3b8' },
        datetimeUTC: false
      }
    };
    const tmpSelectTipo = document.getElementById('tmp-filtro-tipo').value;
    if (tmpSelectTipo === 'dia') {
      const dMin = new Date(startDate); dMin.setHours(7,0,0,0);
      const dMax = new Date(startDate); dMax.setHours(19,0,0,0);
      let realMin = dMin.getTime();
      let realMax = dMax.getTime();
      if(dataSeries.length > 0) {
        const dsMin = Math.min(...dataSeries.map(s => s.y[0]));
        const dsMax = Math.max(...dataSeries.map(s => s.y[1]));
        realMin = Math.min(realMin, dsMin);
        realMax = Math.max(realMax, dsMax);
      }
      xAxisOptions.min = realMin;
      xAxisOptions.max = realMax;
    }

    // Crear sombreado para horario laboral 07:00 a 19:00
    let annotationsX = [];
    {
      const minDataTime = dataSeries.length > 0 ? Math.min(...dataSeries.map(s => s.y[0])) : startDate.getTime();
      const maxDataTime = dataSeries.length > 0 ? Math.max(...dataSeries.map(s => s.y[1])) : refDate.getTime();
      
      let cursorA = new Date(minDataTime);
      cursorA.setHours(0,0,0,0);
      
      let endCursor = new Date(Math.max(maxDataTime, refDate.getTime()));
      endCursor.setHours(23,59,59,999);

      while(cursorA.getTime() <= endCursor.getTime() + 86400000) {
        if(!isFranco(cursorA.getTime())) {
          let workStart = new Date(cursorA); workStart.setHours(7,0,0,0);
          let workEnd = new Date(cursorA); workEnd.setHours(19,0,0,0);
          
          annotationsX.push({
            x: workStart.getTime(),
            x2: workEnd.getTime(),
            fillColor: '#ffffff',
            opacity: 0.04,
            label: { text: '' }
          });
        }
        
        cursorA.setDate(cursorA.getDate() + 1);
      }
    }

    const options = {
      annotations: { xaxis: annotationsX },
      series: [
        {
          data: dataSeries
        }
      ],
      chart: {
        height: 400,
        type: 'rangeBar',
        background: 'transparent',
        dropShadow: {
          enabled: true,
          top: 4,
          left: 4,
          blur: 5,
          color: '#000000',
          opacity: 0.6
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%',
          borderRadius: 5
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.5,
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.8,
          stops: [0, 100]
        }
      },
      grid: {
        borderColor: '#334155',
        strokeDashArray: 3
      },
      xaxis: xAxisOptions,
      yaxis: {
        labels: { style: { colors: '#e2e8f0', fontSize: '12px', fontWeight: 'bold' } }
      },
      theme: { mode: 'dark' },
      tooltip: {
        custom: function(opts) {
          const row = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex];
          const d1 = new Date(row.y[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const d2 = new Date(row.y[1]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const diffHrs = (row.y[1] - row.y[0]) / (1000*60*60);
          return `<div style="padding:10px; background:#1e293b; border:1px solid #334155; border-radius:4px; color:#fff;">
            <strong>${row.x}</strong><br>
            <span>${row.meta}</span><br>
            <span style="color:#a78bfa;">${d1} - ${d2} (${formatTime(diffHrs)})</span>
          </div>`;
        }
      }
    };

    ganttChart = new ApexCharts(document.querySelector("#chart-tmp-gantt"), options);
    ganttChart.render();
  }

  // --- INIT ---
  renderTablaCategorias();
  renderTablaActividades();
  setTimeout(renderDashboard, 100);

});
