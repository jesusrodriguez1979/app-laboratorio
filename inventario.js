document.addEventListener('DOMContentLoaded', () => {
  const viewInv = document.getElementById('view-inventario');
  if (!viewInv) return;

  // 1. Manejo de Pestañas
  const tabBtns = viewInv.querySelectorAll('.inv-tab-btn');
  const tabContents = viewInv.querySelectorAll('.inv-tab-content');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-invtab');
      document.getElementById(targetId).style.display = 'block';
      if(targetId === 'inv-dashboard') actualizarDashboard();
    });
  });

  // 2. Base de Datos Local
  const getInsumos = () => JSON.parse(localStorage.getItem('lubelab_inventario_insumos') || '[]');
  const saveInsumos = (data) => localStorage.setItem('lubelab_inventario_insumos', JSON.stringify(data));
  
  const getMovimientos = () => JSON.parse(localStorage.getItem('lubelab_inventario_movimientos') || '[]');
  const saveMovimientos = (data) => localStorage.setItem('lubelab_inventario_movimientos', JSON.stringify(data));

  // 3. Renderizado de Catálogo
  function renderCatalogo() {
    const insumos = getInsumos();
    const tbody = document.getElementById('tbody-inv-insumos');
    tbody.innerHTML = '';
    
    // Poblar desplegables
    const selectMovInsumo = document.getElementById('inv-mov-insumo');
    selectMovInsumo.innerHTML = '<option value="">-- Selecciona Insumo --</option>';

    if(insumos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No hay insumos registrados.</td></tr>';
      return;
    }

    insumos.forEach((ins, idx) => {
      const valorizado = (ins.stockActual * ins.costoUnitario).toFixed(2);
      const isAlerta = ins.stockActual <= ins.stockMinimo;
      
      tbody.innerHTML += `
        <tr style="${isAlerta ? 'background:rgba(239, 68, 68, 0.1);' : ''}">
          <td><span class="badge" style="background:#4b5563; color:#fff;">${ins.sap}</span></td>
          <td><strong>${ins.nombre}</strong></td>
          <td>${ins.unidad}</td>
          <td>$${parseFloat(ins.costoUnitario).toFixed(2)}</td>
          <td style="font-weight:bold; ${isAlerta ? 'color:var(--danger);' : ''}">${ins.stockActual}</td>
          <td>${ins.stockMinimo}</td>
          <td>$${valorizado}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="editarInsumo(${idx})" style="padding: 2px 6px; font-size:0.75rem; margin-right: 4px;"><i data-lucide="edit-2" style="width:12px; height:12px;"></i></button><button class="btn btn-danger btn-sm" onclick="eliminarInsumo(${idx})" style="padding: 2px 6px; font-size:0.75rem;">&times;</button>
          </td>
        </tr>
      `;
      
      selectMovInsumo.innerHTML += `<option value="${ins.sap}">${ins.nombre} (${ins.sap}) - Disp: ${ins.stockActual} ${ins.unidad}</option>`;
    });
  }

  // 4. Formulario de Insumos
  const formInsumo = document.getElementById('form-inv-insumo');
  formInsumo.addEventListener('submit', (e) => {
    e.preventDefault();
    const sap = document.getElementById('inv-ins-sap').value.trim();
    const db = getInsumos();
    
    if(db.find(i => i.sap === sap)) {
      alert("Ya existe un insumo con este código SAP.");
      return;
    }

    const nuevoInsumo = {
      sap: sap,
      nombre: document.getElementById('inv-ins-nombre').value.trim(),
      unidad: document.getElementById('inv-ins-unidad').value.trim(),
      costoUnitario: parseFloat(document.getElementById('inv-ins-costo').value) || 0,
      stockMinimo: parseFloat(document.getElementById('inv-ins-min').value) || 0,
      stockActual: 0 // Inicia en 0, se carga por Movimientos
    };

    db.push(nuevoInsumo);
    saveInsumos(db);
    formInsumo.reset();
    renderCatalogo();
    actualizarDashboard();
  });

  
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

  window.eliminarInsumo = (idx) => {
    if(!confirm("¿Seguro que deseas eliminar este insumo del catálogo? Su historial de movimientos se conservará pero no podrás registrar nuevos.")) return;
    const db = getInsumos();
    db.splice(idx, 1);
    saveInsumos(db);
    renderCatalogo();
    actualizarDashboard();
  };

  // 5. Renderizado de Movimientos
  function renderMovimientos() {
    const movs = getMovimientos();
    const tbody = document.getElementById('tbody-inv-movs');
    tbody.innerHTML = '';
    
    // Sort desc by date
    const sortedMovs = [...movs].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    if(sortedMovs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No hay movimientos registrados.</td></tr>';
      return;
    }

    sortedMovs.forEach(m => {
      let color = m.tipo === 'INGRESO' ? 'var(--success)' : (m.tipo === 'CONSUMO' ? 'var(--danger)' : 'var(--primary)');
      let prefix = m.tipo === 'INGRESO' ? '+' : (m.tipo === 'CONSUMO' ? '-' : '');
      let rowHtml = `
        <tr>
          <td><small>${new Date(m.fecha).toLocaleString()}</small></td>
          <td><strong>${m.insumoNombre}</strong></td>
          <td><span class="badge" style="background:${color}; color:#fff;">${m.tipo}</span></td>
          <td style="font-weight:bold; color:${color};">${prefix}${m.cantidad}</td>
          <td>$${m.costoMovimiento.toFixed(2)}</td>
          <td>${m.usuario}</td>
          <td>${m.observacion || '-'}</td>
        </tr>
      `;
      tbody.innerHTML += rowHtml;
    });
  }

  // 6. Formulario de Movimientos
  const formMov = document.getElementById('form-inv-mov');
  formMov.addEventListener('submit', (e) => {
    e.preventDefault();
    const sap = document.getElementById('inv-mov-insumo').value;
    const tipo = document.getElementById('inv-mov-tipo').value;
    const cantidad = parseFloat(document.getElementById('inv-mov-cant').value);
    const obs = document.getElementById('inv-mov-obs').value.trim();

    const dbIns = getInsumos();
    const idxIns = dbIns.findIndex(i => i.sap === sap);
    
    if(idxIns === -1) {
      alert("Error: Insumo no encontrado.");
      return;
    }

    const ins = dbIns[idxIns];

    if(tipo === 'CONSUMO' && ins.stockActual < cantidad) {
      if(!confirm(`Atención: El stock actual (${ins.stockActual}) es menor a lo que intentas consumir (${cantidad}). ¿Proceder y dejar el stock en negativo?`)) {
        return;
      }
    }

    // Actualizar Stock
    if(tipo === 'INGRESO') ins.stockActual += cantidad;
    else if(tipo === 'CONSUMO') ins.stockActual -= cantidad;
    else if(tipo === 'AJUSTE') ins.stockActual = cantidad; // Ajuste manual sobreescribe

    // Calcular costo implicado (en ajuste solo guardamos la diff para el costo)
    let costoMovimiento = 0;
    if(tipo === 'AJUSTE') {
      costoMovimiento = 0; // Ajustes no computan como costo de consumo
    } else {
      costoMovimiento = cantidad * ins.costoUnitario;
    }

    const localUser = JSON.parse(localStorage.getItem('lubelab_session_user') || 'null');
    const uname = localUser ? localUser.username : 'Usuario General';

    const dbMov = getMovimientos();
    dbMov.push({
      id: Date.now(),
      fecha: new Date().toISOString(),
      sap: sap,
      insumoNombre: ins.nombre,
      tipo: tipo,
      cantidad: cantidad,
      costoUnitario: ins.costoUnitario,
      costoMovimiento: costoMovimiento,
      observacion: obs,
      usuario: uname
    });

    saveInsumos(dbIns);
    saveMovimientos(dbMov);
    
    formMov.reset();
    renderCatalogo();
    renderMovimientos();
    actualizarDashboard();
  });

  // 7. Dashboard KPIs
  function actualizarDashboard() {
    const movs = getMovimientos();
    const insumos = getInsumos();
    
    const now = new Date();
    const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let cost7 = 0, items7 = 0;
    let cost14 = 0, items14 = 0;
    let cost30 = 0, items30 = 0;

    movs.forEach(m => {
      if (m.tipo === 'CONSUMO') {
        const d = new Date(m.fecha);
        if (d >= days30) {
          cost30 += m.costoMovimiento;
          items30 += m.cantidad;
          if (d >= days14) {
            cost14 += m.costoMovimiento;
            items14 += m.cantidad;
          }
          if (d >= days7) {
            cost7 += m.costoMovimiento;
            items7 += m.cantidad;
          }
        }
      }
    });

    document.getElementById('inv-kpi-7d-costo').textContent = '$ ' + cost7.toFixed(2);
    document.getElementById('inv-kpi-7d-items').textContent = items7.toFixed(2) + ' un. consumidas';
    document.getElementById('inv-kpi-14d-costo').textContent = '$ ' + cost14.toFixed(2);
    document.getElementById('inv-kpi-14d-items').textContent = items14.toFixed(2) + ' un. consumidas';
    document.getElementById('inv-kpi-30d-costo').textContent = '$ ' + cost30.toFixed(2);
    document.getElementById('inv-kpi-30d-items').textContent = items30.toFixed(2) + ' un. consumidas';

    // Alertas de stock
    const alertasTbody = document.getElementById('tbody-inv-alertas');
    alertasTbody.innerHTML = '';
    let alertas = insumos.filter(i => i.stockActual <= i.stockMinimo);
    
    if(alertas.length === 0) {
      alertasTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--success);">Todos los insumos tienen stock saludable.</td></tr>';
    } else {
      alertas.forEach(i => {
        alertasTbody.innerHTML += `
          <tr>
            <td><strong>${i.nombre}</strong></td>
            <td>${i.sap}</td>
            <td style="color:var(--danger); font-weight:bold;">${i.stockActual} ${i.unidad}</td>
            <td>${i.stockMinimo} ${i.unidad}</td>
            <td><span class="badge" style="background:var(--danger); color:#fff;">Reponer</span></td>
          </tr>
        `;
      });
    }
  }

  // Init
  renderCatalogo();
  renderMovimientos();
  actualizarDashboard();
  
  // Expose to window for DB syncing
  window.renderCatalogo = renderCatalogo;
  window.renderMovimientos = renderMovimientos;
  window.actualizarDashboardInv = actualizarDashboard;
});
