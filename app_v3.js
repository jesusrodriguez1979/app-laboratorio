// JR-LABS Portal - Controlador de Operaciones, Mantenimiento e Inspección
// Ajustado para esquema de color Light corporativo Newmont

document.addEventListener('DOMContentLoaded', () => {

  // INFO LEGAL
  const btnInfoLegal = document.getElementById('btn-info-legal');
  const modalInfoLegal = document.getElementById('modal-info-legal');
  const btnCerrarLegal = document.getElementById('btn-cerrar-legal');
  
  if (btnInfoLegal && modalInfoLegal && btnCerrarLegal) {
      btnInfoLegal.addEventListener('click', () => {
          modalInfoLegal.style.display = 'flex';
      });
      btnCerrarLegal.addEventListener('click', () => {
          modalInfoLegal.style.display = 'none';
      });
  }

  // LOGICA DE CAMBIO DE CONTRASEÑA
  let pendingUserLogin = null;
  const modalChangePassword = document.getElementById('modal-change-password');
  const btnConfirmPassword = document.getElementById('btn-confirm-password');
  const inputNewPassword = document.getElementById('input-new-password');

  if (btnConfirmPassword) {
      btnConfirmPassword.addEventListener('click', () => {
          const newPass = inputNewPassword.value.trim();
          if (newPass.length < 4) {
              alert("La contraseña debe tener al menos 4 caracteres.");
              return;
          }
          if (pendingUserLogin) {
              const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || SEMILLA_USUARIOS;
              const idx = users.findIndex(u => u.username === pendingUserLogin.username);
              if (idx !== -1) {
                  users[idx].password = newPass;
                  users[idx].mustChangePassword = false;
                  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                  
                  pendingUserLogin.password = newPass;
                  pendingUserLogin.mustChangePassword = false;
                  sessionUser = pendingUserLogin;
                  
                  modalChangePassword.style.display = 'none';
                  inputNewPassword.value = '';
                  pendingUserLogin = null;
                  
                  document.getElementById('login-panel').classList.add('hidden');
                  document.getElementById('hub-panel').classList.remove('hidden');
                  updateWelcomeScreenVisibility();
                  
                  // Forzar guardado a la nube llamando al localstorage (db.js lo intercepta)
                  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
              }
          }
      });
  }

  let intervalTimers = null;
  let useServerAPI = false;
  let serverCache = {};

  // === LLAVES DE LOCALSTORAGE ===
  const STORAGE_KEYS = {
    EQUIPOS: 'lubelab_equipos',
    FALLAS: 'lubelab_fallas',
    STANDARDS: 'lubelab_standards',
    QC_RUNS: 'lubelab_qc_runs',
    MUESTRAS_ACTIVAS: 'lubelab_muestras_activas',
    MUESTRAS_COMPLETADAS: 'lubelab_muestras_completadas',
    CONFIG_FLOTA: 'lubelab_config_flota',
    FALLAS_FUNCIONALES: 'lubelab_fallas_funcionales',
    FLOTA_DB: 'lubelab_flota_db',
    USERS: 'lubelab_users',
    CONFIG_MUESTRAS: 'lubelab_config_muestras'
  };

  const guardarDatosServidor = async (data) => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error("Error al guardar en base de datos central", err);
    }
  };

  // Shadow Wrapper de LocalStorage para sincronización automática
  const localStorage = {
    getItem: (key) => {
      if (useServerAPI) {
        const val = serverCache[key];
        if (val === undefined || val === null) return null;
        if (typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      }
      return window.localStorage.getItem(key);
    },
    setItem: (key, val) => {
      if (useServerAPI) {
        try {
          serverCache[key] = JSON.parse(val);
        } catch(e) {
          serverCache[key] = val;
        }
        guardarDatosServidor(serverCache);
      } else {
        window.localStorage.setItem(key, val);
      }
    },
    removeItem: (key) => {
      if (useServerAPI) {
        delete serverCache[key];
        guardarDatosServidor(serverCache);
      } else {
        window.localStorage.removeItem(key);
      }
    },
    clear: () => {
      if (useServerAPI) {
        serverCache = {};
        guardarDatosServidor(serverCache);
      } else {
        window.localStorage.clear();
      }
    }
  };

  const SEMILLA_USUARIOS = [
    { username: 'admin', password: 'admin123', role: 'Administrador' },
    { username: 'analista', password: 'lube123', role: 'Analista' },
    { username: 'inspector', password: 'insp123', role: 'Inspector' },
    { username: 'visor', password: 'view123', role: 'Visor' },
    { username: 'jesus.rodriguez', password: 'Martina.1', role: 'Administrador' }
  ];
  let sessionUser = null;
  let loteMuestrasActuales = [];

  const SEMILLA_CONFIG_MUESTRAS = [
    {
      model: "LM75",
      samples: [
        {
          name: "Motor",
          analyses: [
            { name: "Viscosidad 100°C", unit: "cSt", normalMin: 12.5, normalMax: 16.3, warningMin: 11.5, warningMax: 17.5 },
            { name: "Humedad", unit: "%", normalMax: 0.01, warningMax: 0.01 },
            { name: "Conteo de Partículas (ISO)", unit: "código", normalMax: 18, warningMax: 20 }
          ]
        },
        {
          name: "Hidráulico",
          analyses: [
            { name: "Viscosidad 40°C", unit: "cSt", normalMin: 61.2, normalMax: 74.8, warningMin: 55.0, warningMax: 80.0 },
            { name: "Humedad", unit: "%", normalMax: 0.01, warningMax: 0.01 },
            { name: "Conteo de Partículas (ISO)", unit: "código", normalMax: 17, warningMax: 19 }
          ]
        }
      ]
    },
    {
      model: "MDR700",
      samples: [
        {
          name: "Compresor",
          analyses: [
            { name: "Viscosidad 40°C", unit: "cSt", normalMin: 41.4, normalMax: 50.6, warningMin: 38.0, warningMax: 54.0 },
            { name: "Humedad", unit: "%", normalMax: 0.01, warningMax: 0.01 },
            { name: "Conteo de Partículas (ISO)", unit: "código", normalMax: 16, warningMax: 18 }
          ]
        },
        {
          name: "Transmisión",
          analyses: [
            { name: "Viscosidad 100°C", unit: "cSt", normalMin: 13.5, normalMax: 18.5, warningMin: 12.0, warningMax: 20.0 },
            { name: "Humedad", unit: "%", normalMax: 0.01, warningMax: 0.01 }
          ]
        }
      ]
    }
  ];

  // --- MIGRACIÓN DE DATOS HEREDADOS (FIX TIEMPOS) ---
  const fixLegacyBatchTimes = () => {
    if (localStorage.getItem('lubelab_legacy_times_fixed')) return;
    
    let completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
    let activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    let changed = false;

    const fixSamples = (arr) => {
      const batchCounts = {};
      arr.forEach(s => {
        const bId = s.batchId || s.id;
        if (bId) {
          batchCounts[bId] = (batchCounts[bId] || 0) + 1;
        }
      });

      arr.forEach(s => {
        const bId = s.batchId || s.id;
        if (bId && batchCounts[bId] > 1) {
          const bs = batchCounts[bId];
          s.times.espera = Math.round(s.times.espera / bs);
          s.times.analisis = Math.round(s.times.analisis / bs);
          s.times.reporte = Math.round(s.times.reporte / bs);
          s.times.repeticion = Math.round(s.times.repeticion / bs);
          s.times.falla = Math.round(s.times.falla / bs);
          changed = true;
        }
      });
    };

    fixSamples(completadas);
    fixSamples(activas);

    if (changed) {
      localStorage.setItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS, JSON.stringify(completadas));
      localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(activas));
    }
    localStorage.setItem('lubelab_legacy_times_fixed', 'true');
  };
  fixLegacyBatchTimes();

  // === DATOS SEMILLA ===
  const SEMILLA_EQUIPOS_LAB = [
    { id: 'ICP-101', name: 'Espectrómetro ICP-OES', location: 'Área Espectrometría', status: 'Available', mttr: 0, mtbf: 720, availability: 100 },
    { id: 'VISC-201', name: 'Viscosímetro Automático Houillon', location: 'Área Fisicoquímica', status: 'Available', mttr: 0, mtbf: 720, availability: 100 },
    { id: 'FTIR-301', name: 'Espectrómetro FTIR Nicolet', location: 'Área Infrarrojo', status: 'Available', mttr: 0, mtbf: 720, availability: 100 },
    { id: 'COUNT-401', name: 'Contador de Partículas Láser', location: 'Área Contaminación', status: 'Calibrating', mttr: 0, mtbf: 720, availability: 100 },
    { id: 'TITR-501', name: 'Titulador Karl Fischer', location: 'Área Fisicoquímica', status: 'Out of Service', mttr: 0, mtbf: 720, availability: 100 }
  ];

  const SEMILLA_FALLAS_LAB = [
    { id: 'FAIL-001', equipId: 'TITR-501', desc: 'Falla en electrodo de doble platino y bomba dosificadora', duration: 12.5, date: '2026-06-02' },
    { id: 'FAIL-002', equipId: 'COUNT-401', desc: 'Presencia de microburbujas en sensor óptico láser', duration: 4.0, date: '2026-06-08' },
    { id: 'FAIL-003', equipId: 'VISC-201', desc: 'Atascamiento en capilar térmico nro 2', duration: 2.5, date: '2026-06-11' },
    { id: 'FAIL-004', equipId: 'ICP-101', desc: 'Desviación en alineación óptica del plasma', duration: 1.5, date: '2026-06-12' }
  ];

  const SEMILLA_STANDARDS = [
    { id: 'STD-VISC-100', name: 'Viscosity Reference Oil VG 100', parameter: 'Viscosidad @ 40°C', nominal: 100.0, sd: 1.2, unit: 'cSt' },
    { id: 'STD-WATER-200', name: 'Water Standard 200 ppm', parameter: 'Humedad KF', nominal: 200.0, sd: 8.5, unit: 'ppm' }
  ];

  const SEMILLA_QC_RUNS = [
    { id: 'QC-001', stdId: 'STD-VISC-100', val: 99.85, date: '2026-06-01T08:00' },
    { id: 'QC-002', stdId: 'STD-VISC-100', val: 100.12, date: '2026-06-02T08:00' },
    { id: 'QC-003', stdId: 'STD-VISC-100', val: 99.54, date: '2026-06-03T08:00' },
    { id: 'QC-004', stdId: 'STD-VISC-100', val: 100.45, date: '2026-06-04T08:00' },
    { id: 'QC-005', stdId: 'STD-VISC-100', val: 98.92, date: '2026-06-05T08:00' },
    { id: 'QC-006', stdId: 'STD-VISC-100', val: 99.78, date: '2026-06-06T08:00' },
    { id: 'QC-007', stdId: 'STD-VISC-100', val: 101.15, date: '2026-06-07T08:00' },
    { id: 'QC-008', stdId: 'STD-VISC-100', val: 100.32, date: '2026-06-08T08:00' },
    { id: 'QC-009', stdId: 'STD-VISC-100', val: 99.98, date: '2026-06-09T08:00' },
    { id: 'QC-010', stdId: 'STD-VISC-100', val: 99.64, date: '2026-06-10T08:00' },
    { id: 'QC-011', stdId: 'STD-VISC-100', val: 100.08, date: '2026-06-11T08:00' },
    { id: 'QC-012', stdId: 'STD-VISC-100', val: 99.41, date: '2026-06-12T08:00' },
    { id: 'QC-013', stdId: 'STD-VISC-100', val: 100.22, date: '2026-06-13T08:00' },
    { id: 'QC-014', stdId: 'STD-VISC-100', val: 99.91, date: '2026-06-14T08:00' }
  ];

  const EQUIPOS_MINEROS = [
    { id: 'DI 08', name: 'Drill Diamond;LM75' },
    { id: 'DI 06 (PARKED)', name: 'Longyear MDR700 Wheel Drill' }
  ];

  const SEMILLA_CONFIG_FLOTA = {
    'DI 08': { 'FEED ASSY': true, 'HYDRAULIC SYS': true, 'WATERPUMP': false },
    'DI 06 (PARKED)': { 'COMPRESSOR': true, 'DRILL SYS': true }
  };

  const SEMILLA_FALLAS_FUNCIONALES = [
    { id: 'FF-001', equipId: 'DI 08', component: 'FEED ASSY', date: '2026-06-13', obs: 'Desgaste severo en rieles de avance.' },
    { id: 'FF-002', equipId: 'DI 08', component: 'HYDRAULIC SYS', date: '2026-06-06', obs: 'Pérdida de presión en bomba hidráulica principal.' },
    { id: 'FF-003', equipId: 'DI 06 (PARKED)', component: 'COMPRESSOR', date: '2026-06-02', obs: 'Falla de válvula reguladora de caudal de aire.' }
  ];

  const SEMILLA_MUESTRAS_ACTIVAS = [
    { 
      id: 'LOTE-1406-A', 
      entryTime: '2026-06-14T12:05:00', 
      obs: 'Envases plásticos bien rotulados. Tº ambiente.', 
      missing: 'Falta SAP ubicación', 
      status: 'En análisis',
      operator: 'Carlos Ruiz',
      equipId: 'DI 08',
      component: 'HYDRAULIC SYS',
      currentStageStart: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      times: { espera: 300, analisis: 900, reporte: 0, repeticion: 300, falla: 0 },
      simulatedValues: { visc: 68.2, water: 120, iso: '18/16/13' },
      stageHistory: [
        { stage: 'En espera', duration: 300, obs: 'Ingresado al sistema' }
      ]
    },
    { 
      id: 'LOTE-1406-B', 
      entryTime: '2026-06-14T12:20:00', 
      obs: 'Muestras de bomba de agua con sospecha de dilución.', 
      missing: 'Ninguno', 
      status: 'En cola',
      operator: 'Sofía Vergara',
      equipId: 'DI 08',
      component: 'WATERPUMP',
      currentStageStart: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      times: { espera: 900, analisis: 0, reporte: 0, repeticion: 0, falla: 0 },
      simulatedValues: { visc: 30.5, water: 110, iso: '18/16/13' },
      stageHistory: [
        { stage: 'En espera', duration: 900, obs: 'En cola para análisis de viscosidad' }
      ]
    },
    { 
      id: 'LOTE-1406-C', 
      entryTime: '2026-06-14T12:35:00', 
      obs: 'Muestra de compresor crítico.', 
      missing: 'Ninguno', 
      status: 'En espera',
      operator: 'Carlos Ruiz',
      equipId: 'DI 06 (PARKED)',
      component: 'COMPRESSOR',
      currentStageStart: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      times: { espera: 120, analisis: 0, reporte: 0, repeticion: 0, falla: 0 },
      simulatedValues: { visc: 45.4, water: 140, iso: '16/14/11' },
      stageHistory: []
    }
  ];

  const SEMILLA_MUESTRAS_COMPLETADAS = [
    { 
      id: 'LOTE-1401', 
      entryTime: '2026-06-08T09:00:00', 
      obs: 'Recomendación: Programar cambio de aceite a la brevedad por viscosidad baja.', 
      missing: 'Ninguno', 
      equipId: 'DI 08',
      component: 'HYDRAULIC SYS',
      operator: 'Carlos Ruiz',
      times: { espera: 600, analisis: 1800, reporte: 300, repeticion: 0, falla: 0 },
      simulatedValues: { visc: 52.5, water: 150, iso: '18/16/13' },
      severity: 'Critical',
      stageHistory: [
        { stage: 'En espera', duration: 600, obs: 'Ingresado al sistema' },
        { stage: 'En cola', duration: 300, obs: 'En cola' },
        { stage: 'En análisis', duration: 1500, obs: 'Mediciones ópticas' },
        { stage: 'Reportando', duration: 300, obs: 'Generando reporte' }
      ]
    },
    { 
      id: 'LOTE-1402', 
      entryTime: '2026-06-05T11:15:00', 
      obs: 'Recomendación: Detener equipo de inmediato, filtrar sistema e inspeccionar fugas de agua.', 
      missing: 'Ninguno', 
      equipId: 'DI 08',
      component: 'HYDRAULIC SYS',
      operator: 'Sofía Vergara',
      times: { espera: 1200, analisis: 2100, reporte: 450, repeticion: 600, falla: 0 },
      simulatedValues: { visc: 67.5, water: 1250, iso: '22/20/16' },
      severity: 'Critical',
      stageHistory: [
        { stage: 'En espera', duration: 1200, obs: 'Lote retrasado' },
        { stage: 'En cola', duration: 500, obs: 'Cola' },
        { stage: 'En análisis', duration: 1600, obs: 'Análisis de viscosidad y agua' },
        { stage: 'Reportando', duration: 450, obs: 'Finalizado' }
      ]
    },
    { 
      id: 'LOTE-1403', 
      entryTime: '2026-06-10T08:30:00', 
      obs: 'Recomendación: Condición normal. Continuar con plan de monitoreo.', 
      missing: 'Ninguno', 
      equipId: 'DI 08',
      component: 'WATERPUMP',
      operator: 'Carlos Ruiz',
      times: { espera: 200, analisis: 1500, reporte: 250, repeticion: 0, falla: 0 },
      simulatedValues: { visc: 29.8, water: 80, iso: '16/14/11' },
      severity: 'Normal',
      stageHistory: [
        { stage: 'En espera', duration: 200, obs: 'Ingresado' },
        { stage: 'En análisis', duration: 1500, obs: 'OK' }
      ]
    },
    { 
      id: 'LOTE-1404', 
      entryTime: '2026-06-07T10:00:00', 
      obs: 'Recomendación: Programar cambio de filtros en próxima parada.', 
      missing: 'Ninguno', 
      equipId: 'DI 06 (PARKED)',
      component: 'COMPRESSOR',
      operator: 'Sofía Vergara',
      times: { espera: 900, analisis: 1950, reporte: 400, repeticion: 300, falla: 1200 },
      simulatedValues: { visc: 40.2, water: 450, iso: '19/17/14' },
      severity: 'Warning',
      stageHistory: [
        { stage: 'En espera', duration: 900, obs: 'Ingresado' },
        { stage: 'En análisis', duration: 1950, obs: 'Análisis viscosidad' }
      ]
    },
    { 
      id: 'LOTE-1405', 
      entryTime: '2026-06-13T14:20:00', 
      obs: 'Recomendación: Condición estable.', 
      missing: 'Ninguno', 
      equipId: 'DI 06 (PARKED)',
      component: 'DRILL SYS',
      operator: 'Carlos Ruiz',
      times: { espera: 1500, analisis: 2400, reporte: 500, repeticion: 0, falla: 0 },
      simulatedValues: { visc: 318.0, water: 120, iso: '16/14/11' },
      severity: 'Normal',
      stageHistory: []
    },
    { 
      id: 'LOTE-1407', 
      entryTime: '2026-06-01T10:00:00', 
      obs: 'Recomendación: Programar cambio de aceite en rampa por viscosidad baja.', 
      missing: 'Ninguno', 
      equipId: 'DI 08',
      component: 'WATERPUMP',
      operator: 'Carlos Ruiz',
      times: { espera: 300, analisis: 1400, reporte: 300, repeticion: 0, falla: 0 },
      simulatedValues: { visc: 26.2, water: 100, iso: '17/15/12' },
      severity: 'Warning',
      stageHistory: []
    }
  ];

  const SEMILLA_FLOTA_DB = [
    { marca: 'Drill Diamond', modelo: 'LM75', equipo: 'DI 08', nombre_equipo: 'Drill Diamond;LM75', sap_location: '3113-10-10-03-DRD1008BOOM-FEAS', componente: 'FEED ASSY', grado_viscosidad: '#ND', lubricante_recomendado: '-', lubricante_utilizado: 'Ningunos', capacidad: '', observaciones: 'Cambio o/500 hs', es_mayor: true, vida_presupuestada: 500 },
    { marca: 'Drill Diamond', modelo: 'LM75', equipo: 'DI 08', nombre_equipo: 'Drill Diamond;LM75', sap_location: '3113-10-10-03-DRD1008HYSY', componente: 'HYDRAULIC SYS', grado_viscosidad: 'ISO VG 68 / 8,6 cSt', lubricante_recomendado: '', lubricante_utilizado: 'Shell Tellus S2 M 68', capacidad: '', observaciones: '', es_mayor: true, vida_presupuestada: 2000 },
    { marca: 'Drill Diamond', modelo: 'LM75', equipo: 'DI 08', nombre_equipo: 'Drill Diamond;LM75', sap_location: '3113-10-10-03-DRD1008WTSY-WTPU', componente: 'WATERPUMP', grado_viscosidad: 'SAE 30 / 10,9 cSt', lubricante_recomendado: '', lubricante_utilizado: 'Shell Spirax S4 CX 30', capacidad: '', observaciones: 'Filtro c/1000 hs', es_mayor: false, vida_presupuestada: 1000 },
    { marca: 'Longyear', modelo: 'MDR700', equipo: 'DI 06 (PARKED)', nombre_equipo: 'Longyear MDR700 Wheel Drill', sap_location: '3113-10-10-03-DRW0006ASY-COMP', componente: 'COMPRESSOR', grado_viscosidad: 'ISO VG 46 / 8,9 cSt', lubricante_recomendado: '', lubricante_utilizado: 'Shell Corena S3 R 46', capacidad: 4.5, observaciones: '', es_mayor: true, vida_presupuestada: 2000 },
    { marca: 'Longyear', modelo: 'MDR700', equipo: 'DI 06 (PARKED)', nombre_equipo: 'Longyear MDR700 Wheel Drill', sap_location: '3113-10-10-03-DRW0006BOOM-DRSY', componente: 'DRILL SYS', grado_viscosidad: 'ISO VG 320 / 25 cSt', lubricante_recomendado: '', lubricante_utilizado: 'Shell Omala S2 G 320', capacidad: 4.5, observaciones: '', es_mayor: true, vida_presupuestada: 5000 }
  ];

  const parseNombreEquipo = (fullName) => {
    if (!fullName) return { marca: 'N/A', modelo: 'N/A' };
    const nameStr = String(fullName).trim();
    if (nameStr.includes(';')) {
      const parts = nameStr.split(';');
      return {
        marca: parts[0].trim(),
        modelo: parts[1] ? parts[1].trim() : 'N/A'
      };
    }
    // Fallback split by space
    const parts = nameStr.split(/\s+/);
    if (parts.length >= 2) {
      return {
        marca: parts[0].trim(),
        modelo: parts[1].trim()
      };
    }
    return {
      marca: nameStr,
      modelo: 'N/A'
    };
  };

  const obtenerNombreEquipo = (equipId) => {
    const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    const match = flota.find(item => item.equipo === equipId);
    if (match) {
      if (match.nombre_equipo) {
        return `${match.nombre_equipo} (${match.equipo})`;
      }
      return `${match.marca} ${match.modelo} (${match.equipo})`;
    }
    const eqMin = EQUIPOS_MINEROS.find(e => e.id === equipId);
    return eqMin ? eqMin.name : equipId;
  };

  const inicializarLocalStorage = () => {
    if (!window.localStorage.getItem(STORAGE_KEYS.EQUIPOS)) window.localStorage.setItem(STORAGE_KEYS.EQUIPOS, JSON.stringify(SEMILLA_EQUIPOS_LAB));
    if (!window.localStorage.getItem(STORAGE_KEYS.FALLAS)) window.localStorage.setItem(STORAGE_KEYS.FALLAS, JSON.stringify(SEMILLA_FALLAS_LAB));
    if (!window.localStorage.getItem(STORAGE_KEYS.STANDARDS)) window.localStorage.setItem(STORAGE_KEYS.STANDARDS, JSON.stringify(SEMILLA_STANDARDS));
    if (!window.localStorage.getItem(STORAGE_KEYS.QC_RUNS)) window.localStorage.setItem(STORAGE_KEYS.QC_RUNS, JSON.stringify(SEMILLA_QC_RUNS));
    if (!window.localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) window.localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(SEMILLA_MUESTRAS_ACTIVAS));
    if (!window.localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) window.localStorage.setItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS, JSON.stringify(SEMILLA_MUESTRAS_COMPLETADAS));
    if (!window.localStorage.getItem(STORAGE_KEYS.CONFIG_FLOTA)) window.localStorage.setItem(STORAGE_KEYS.CONFIG_FLOTA, JSON.stringify(SEMILLA_CONFIG_FLOTA));
    if (!window.localStorage.getItem(STORAGE_KEYS.FALLAS_FUNCIONALES)) window.localStorage.setItem(STORAGE_KEYS.FALLAS_FUNCIONALES, JSON.stringify(SEMILLA_FALLAS_FUNCIONALES));
    if (!window.localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) window.localStorage.setItem(STORAGE_KEYS.FLOTA_DB, JSON.stringify(SEMILLA_FLOTA_DB));
    if (!window.localStorage.getItem(STORAGE_KEYS.USERS)) window.localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEMILLA_USUARIOS));
    if (!window.localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) window.localStorage.setItem(STORAGE_KEYS.CONFIG_MUESTRAS, JSON.stringify(SEMILLA_CONFIG_MUESTRAS));
  };

  const cargarBaseDeDatos = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          serverCache = data;
          useServerAPI = true;
          console.log("Conectado al servidor de base de datos compartida.");
        } else {
          console.log("Inicializando base de datos en el servidor...");
          useServerAPI = false; // temporal
          inicializarLocalStorage();
          const localData = {};
          Object.keys(STORAGE_KEYS).forEach(k => {
            const storageKey = STORAGE_KEYS[k];
            localData[storageKey] = JSON.parse(window.localStorage.getItem(storageKey));
          });
          await guardarDatosServidor(localData);
          serverCache = localData;
          useServerAPI = true;
        }
      }
    } catch (err) {
      console.warn("No se pudo conectar al servidor API. Usando LocalStorage local.", err);
      useServerAPI = false;
      inicializarLocalStorage();
    }
  };

  // === CARGAR SELECTORES DINÁMICOS EN CASCADA DESDE LA FLOTA ===
  const actualizarSelectoresFlota = () => {
    const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    const uniqueEquips = Array.from(new Set(flota.map(item => item.equipo))).sort();

    const selectEquipSample = document.getElementById('sample-equip-target');
    const selectEquipFF = document.getElementById('ff-select-equip');
    
    if (selectEquipSample) {
      selectEquipSample.innerHTML = '';
      uniqueEquips.forEach(eq => {
        const opt = document.createElement('option');
        opt.value = eq;
        opt.textContent = obtenerNombreEquipo(eq);
        selectEquipSample.appendChild(opt);
      });
    }

    if (selectEquipFF) {
      selectEquipFF.innerHTML = '';
      uniqueEquips.forEach(eq => {
        const opt = document.createElement('option');
        opt.value = eq;
        opt.textContent = obtenerNombreEquipo(eq);
        selectEquipFF.appendChild(opt);
      });
    }

    const selectCompSample = document.getElementById('sample-comp-target');
    const selectCompFF = document.getElementById('ff-select-comp');

    const fillComponents = (eqSelect, compSelect) => {
      if (!eqSelect || !compSelect) return;
      const selected = eqSelect.value;
      const comps = Array.from(new Set(flota.filter(item => item.equipo === selected).map(item => item.componente))).sort();
      compSelect.innerHTML = '';
      comps.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        compSelect.appendChild(opt);
      });
    };

    if (selectEquipSample && selectCompSample) {
      selectEquipSample.onchange = () => fillComponents(selectEquipSample, selectCompSample);
      fillComponents(selectEquipSample, selectCompSample);
    }

    if (selectEquipFF && selectCompFF) {
      selectEquipFF.onchange = () => fillComponents(selectEquipFF, selectCompFF);
      fillComponents(selectEquipFF, selectCompFF);
    }
  };

  actualizarSelectoresFlota();

  // === VARIABLE GLOBAL Y CONFIGURACIÓN DE FILTROS EN INSPECCIÓN ===
  let filterComponentMode = 'Todos';
  
  const setupInspectionFilters = () => {
    const btnTodos = document.getElementById('btn-toggle-todos');
    const btnMayores = document.getElementById('btn-toggle-mayores');
    
    if (btnTodos && btnMayores) {
      btnTodos.onclick = () => {
        filterComponentMode = 'Todos';
        btnTodos.classList.add('active-toggle');
        btnMayores.classList.remove('active-toggle');
        recalcularYRenderizarMétricasInspección();
      };
      
      btnMayores.onclick = () => {
        filterComponentMode = 'Mayores';
        btnMayores.classList.add('active-toggle');
        btnTodos.classList.remove('active-toggle');
        recalcularYRenderizarMétricasInspección();
      };
    }
  };
  
  setupInspectionFilters();

  // === RUTA DE NAVEGACIÓN PRINCIPAL (HUB DE SELECCIÓN Y LOGIN) ===
  const mainHub = document.getElementById('welcome-screen');
  const consoleGestion = document.getElementById('console-gestion');
  const consoleInspeccion = document.getElementById('console-inspeccion');
  const consoleAdmin = document.getElementById('console-admin');
  const consolePersonal = document.getElementById('console-personal');
  const consoleVisor = document.getElementById('console-visor');

  const updateWelcomeScreenVisibility = () => {
    const cardGestion = document.getElementById('btn-enter-gestion').closest('.glass-card');
    if (sessionUser && (sessionUser.role === 'Analista' || sessionUser.role === 'Administrador')) {
      cardGestion.style.display = 'block';
    } else {
      cardGestion.style.display = 'none';
    }

    
    const btnPersonal = document.getElementById('btn-enter-personal');
    if (btnPersonal) {
      const cardPersonal = btnPersonal.closest('.glass-card');
      if (sessionUser && (sessionUser.role === 'Administrador' || sessionUser.role === 'Analista')) {
        cardPersonal.style.display = 'block';
      } else {
        cardPersonal.style.display = 'none';
      }
    }

    const btnAdmin = document.getElementById('btn-enter-admin');
    if (btnAdmin) {
      const cardAdmin = btnAdmin.closest('.glass-card');
      if (sessionUser && sessionUser.role === 'Administrador') {
        cardAdmin.style.display = 'block';
      } else {
        cardAdmin.style.display = 'none';
      }
    }
  };

  document.getElementById('btn-enter-gestion').addEventListener('click', () => {
    if (sessionUser && sessionUser.role !== 'Analista' && sessionUser.role !== 'Administrador') {
      alert("Acceso denegado: Se requiere perfil de Analista");
      return;
    }
    mainHub.classList.add('hidden');
    consoleGestion.classList.remove('hidden');
    consoleInspeccion.classList.add('hidden');
    consoleAdmin.classList.add('hidden');
    activarPestañaSidebar(consoleGestion, 'view-equipos');
    cargarSeccionEquipos();
  });

  document.getElementById('btn-enter-inspeccion').addEventListener('click', () => {
    mainHub.classList.add('hidden');
    consoleGestion.classList.add('hidden');
    consoleInspeccion.classList.remove('hidden');
    consoleAdmin.classList.add('hidden');
    activarPestañaSidebar(consoleInspeccion, 'view-insp-estado');
    cargarSeccionInspEstado();
  });

  const btnEnterAdmin = document.getElementById('btn-enter-admin');
  if (btnEnterAdmin) {
    btnEnterAdmin.addEventListener('click', () => {
      if (sessionUser && sessionUser.role !== 'Administrador' && sessionUser.role !== 'Analista') {
        alert("Acceso denegado: Se requiere perfil de Administrador");
        return;
      }
      mainHub.classList.add('hidden');
      consoleGestion.classList.add('hidden');
      consoleInspeccion.classList.add('hidden');
      consoleAdmin.classList.remove('hidden');
      activarPestañaSidebar(consoleAdmin, 'view-admin-users');
      cargarSeccionAdminUsuarios();
    });
  }

  
  const btnEnterPersonal = document.getElementById('btn-enter-personal');
  if (btnEnterPersonal) {
    btnEnterPersonal.addEventListener('click', () => {
      if (sessionUser && sessionUser.role !== 'Administrador') {
        alert("Acceso denegado: Se requiere perfil de Administrador");
        return;
      }
      mainHub.classList.add('hidden');
      consoleGestion.classList.add('hidden');
      consoleInspeccion.classList.add('hidden');
      consoleAdmin.classList.add('hidden');
      consolePersonal.classList.remove('hidden');
      activarPestañaSidebar(consolePersonal, 'view-objetivos');
      
    });
  }

  document.querySelectorAll('.btn-back-hub').forEach(btn => {
    btn.addEventListener('click', () => {
      mainHub.classList.remove('hidden');
      consoleGestion.classList.add('hidden');
      consoleInspeccion.classList.add('hidden');
      consoleAdmin.classList.add('hidden');
      updateWelcomeScreenVisibility();
      if (intervalTimers) {
        clearInterval(intervalTimers);
        intervalTimers = null;
      }
    });
  });

  // Cerrar Sesión
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      sessionUser = null;
      document.getElementById('console-gestion').classList.add('hidden');
      document.getElementById('console-inspeccion').classList.add('hidden');
      document.getElementById('console-admin').classList.add('hidden');
      document.getElementById('console-visor').classList.add('hidden');
      document.getElementById('welcome-screen').classList.add('hidden');
      document.getElementById('view-login').classList.remove('hidden');
    };
  });

  // Manejo de Login
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.onsubmit = (e) => {
      e.preventDefault();
      const usernameEl = document.getElementById('login-username');
      const passwordEl = document.getElementById('login-password');
      const errorEl = document.getElementById('login-error-msg');

      const username = usernameEl.value.trim().toLowerCase();
      const password = passwordEl.value;

      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || SEMILLA_USUARIOS;
      const match = users.find(u => u.username.toLowerCase() === username && u.password === password);

      if (match) {
        sessionUser = match;
        errorEl.classList.add('hidden');
        usernameEl.value = '';
        passwordEl.value = '';
        iniciarSesionInterfaz(match);
      } else {
        errorEl.classList.remove('hidden');
      }
    };
  }

  const iniciarSesionInterfaz = (user) => {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('console-gestion').classList.add('hidden');
    document.getElementById('console-inspeccion').classList.add('hidden');
    document.getElementById('console-admin').classList.add('hidden');
    document.getElementById('console-visor').classList.add('hidden');
    document.getElementById('welcome-screen').classList.add('hidden');

    if (user.role === 'Administrador' || user.role === 'Analista') {
      document.getElementById('welcome-screen').classList.remove('hidden');
      updateWelcomeScreenVisibility();
    } else if (user.role === 'Inspector') {
      document.getElementById('console-inspeccion').classList.remove('hidden');
      activarPestañaSidebar(consoleInspeccion, 'view-insp-estado');
      cargarSeccionInspEstado();
    } else if (user.role === 'Visor') {
      document.getElementById('console-visor').classList.remove('hidden');
      activarPestañaSidebar(consoleVisor, 'view-visor-lotes');
      cargarSeccionVisorLotes();
    }
  };

  const activarPestañaSidebar = (branchEl, targetViewId) => {
    const items = branchEl.querySelectorAll('.menu-item');
    const views = branchEl.querySelectorAll('.tab-view');
    
    items.forEach(item => {
      if (item.getAttribute('data-target') === targetViewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    views.forEach(view => {
      if (view.id === targetViewId) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    const branch = branchEl.id;
    if (branch === 'console-gestion') {
      const info = infoPestañasGestion[targetViewId];
      document.getElementById('view-title').textContent = info.title;
      document.getElementById('view-subtitle').textContent = info.subtitle;
    } else if (branch === 'console-inspeccion') {
      const info = infoPestañasInspeccion[targetViewId];
      document.getElementById('insp-view-title').textContent = info.title;
      document.getElementById('insp-view-subtitle').textContent = info.subtitle;
    } else if (branch === 'console-admin') {
      const info = infoPestañasAdmin[targetViewId];
      document.getElementById('admin-view-title').textContent = info.title;
      document.getElementById('admin-view-subtitle').textContent = info.subtitle;
    } else if (branch === 'console-personal') {
      const info = infoPestañasPersonal[targetViewId];
      if (info) {
        document.getElementById('personal-view-title').textContent = info.title;
        document.getElementById('personal-view-subtitle').textContent = info.subtitle;
      }
    
    } else if (branch === 'console-visor') {
      const info = infoPestañasVisor[targetViewId];
      document.getElementById('visor-view-title').textContent = info.title;
      document.getElementById('visor-view-subtitle').textContent = info.subtitle;
    }
  };

  // === ENRUTADORES DE SUB-PESTAÑAS ===
  const infoPestañasGestion = {
    'view-equipos': { title: 'Configuración de Laboratorio', subtitle: 'Habilitación de instrumentos, carga de manuales PDF y chat de asistencia técnica' },
    'view-muestras': { title: 'Flujo Analítico de Muestras', subtitle: 'Ingresos del día, cronómetros activos por etapa y registros de tiempos' },
    'view-qc': { title: 'Revisión de Estándares & QC', subtitle: 'Monitoreo de calibración del laboratorio, gráficos Levey-Jennings y reglas de Westgard' },
    'view-flota': { title: 'Configuración Flota de Mina', subtitle: 'Definir cuáles componentes se consideran componentes mayores' },
    'view-fallas-funcionales': { title: 'Registro de Fallas Funcionales', subtitle: 'Ingreso manual de fechas de fallas mecánicas de componentes en mina' },
    
    
    'view-etiquetado': { title: 'Equipos Etiquetados', subtitle: 'Control fotográfico y estadístico de fluidos por modelo' },
    
    'view-historial': { title: 'Bóveda Histórica', subtitle: 'Importación masiva de resultados estadísticos del laboratorio (Big Data)' },
      
      'view-inventario': { title: 'Inventario y Costos', subtitle: 'Control de insumos y consumibles del laboratorio' }
  };

  
  const infoPestañasPersonal = {
      'view-objetivos': { title: 'Objetivos 2026', subtitle: 'Control y seguimiento de avance de objetivos' },
      'view-charlas': { title: 'Generador Charlas IA', subtitle: 'Generación asistida de charlas de 5 minutos' },
      'view-capacitaciones': { title: 'Capacitaciones', subtitle: 'Gestión general de capacitaciones creadas, recibidas e impartidas' },
      'view-tiempos': { title: 'Gestión de Tiempos', subtitle: 'Análisis y distribución de tiempos de ciclo y cuellos de botella' }
  };

  const infoPestañasInspeccion = {
    'view-insp-estado': { title: 'Estado de Muestras', subtitle: 'Monitoreo de flujo y cronómetros de lotes en el laboratorio' },
    'view-insp-kpis': { title: 'KPIs del Laboratorio', subtitle: 'Dashboard y metas de calidad analítica e inspección clínica de muestras' }
  };

  const infoPestañasAdmin = {
    'view-admin-users': { title: 'Gestión de Usuarios', subtitle: 'Registro de personal del laboratorio, control de claves y asignación de perfiles' }
  };

  const infoPestañasVisor = {
    'view-visor-lotes': { title: 'Lotes en Laboratorio', subtitle: 'Monitoreo de flujo y cronómetros de lotes en el laboratorio' },
    'view-visor-informes': { title: 'Informes Analíticos de Laboratorio', subtitle: 'Resultados validados y reportes técnicos certificados' }
  };

  consoleGestion.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      activarPestañaSidebar(consoleGestion, target);

      if (target === 'view-equipos') cargarSeccionEquipos();
      else if (target === 'view-muestras') cargarSeccionMuestras();
      else if (target === 'view-qc') cargarSeccionQC();
      else if (target === 'view-flota') cargarSeccionFlota();
      else if (target === 'view-fallas-funcionales') cargarSeccionFallasFuncionales();
    });
  });

  consoleInspeccion.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      activarPestañaSidebar(consoleInspeccion, target);

      if (target === 'view-insp-estado') cargarSeccionInspEstado();
      else if (target === 'view-insp-kpis') cargarSeccionInspKPIs();
    });
  });

  consoleAdmin.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      activarPestañaSidebar(consoleAdmin, target);

      if (target === 'view-admin-users') cargarSeccionAdminUsuarios();
    });
  });

  
    consolePersonal.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        activarPestañaSidebar(consolePersonal, target);
      });
    });

    consoleVisor.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      activarPestañaSidebar(consoleVisor, target);

      if (target === 'view-visor-lotes') cargarSeccionVisorLotes();
      else if (target === 'view-visor-informes') cargarSeccionVisorInformes();
    });
  });

  const clockG = document.getElementById('time-badge-gestion');
  const clockI = document.getElementById('time-badge-inspeccion');
  const clockA = document.getElementById('time-badge-admin');
  const clockV = document.getElementById('time-badge-visor');
  const updateClocks = () => {
    const ahora = new Date();
    const str = ahora.toLocaleDateString('es-ES') + ' ' + ahora.toLocaleTimeString('es-ES');
    if (clockG) clockG.textContent = str;
    if (clockI) clockI.textContent = str;
    if (clockA) clockA.textContent = str;
    if (clockV) clockV.textContent = str;

    // Actualizar también los contadores de etapas en curso
    try {
      const active = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
      active.forEach(s => {
        const sec = Math.floor((Date.now() - new Date(s.currentStageStart).getTime()) / 1000);
        const elapsedMin = (sec / 60).toFixed(1);
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const sc = String(sec % 60).padStart(2, '0');
        const elI = document.getElementById(`insp-timer-${s.id}`);
        const bId = s.batchId || s.id;
        const elV = document.getElementById(`visor-timer-${bId}`);
        if (elI) elI.textContent = `${elapsedMin} min`;
        if (elV) elV.textContent = `${m}:${sc}`;
      });
    } catch(e) {}

    // Polling del servidor si estamos en red (cada 5 segundos)
    if (useServerAPI && (!window.lastServerPoll || Date.now() - window.lastServerPoll > 5000)) {
      window.lastServerPoll = Date.now();
      fetch('/api/data').then(res => res.json()).then(data => {
        if (data && Object.keys(data).length > 0) {
          const prevCacheStr = JSON.stringify(serverCache);
          serverCache = data;
          const newCacheStr = JSON.stringify(serverCache);
          
          // Si hubo cambios reales en los datos, forzar actualización visual
          if (prevCacheStr !== newCacheStr) {
             const activeVisorTab = document.querySelector('#console-visor .tab-view.active');
             if (activeVisorTab && activeVisorTab.id === 'view-visor-lotes') {
                try {
                    cargarSeccionVisorLotes(true);
                } catch(e) {}
             }
          }
        }
      }).catch(e => {});
    } else if (!useServerAPI) {
      // Auto-refresh en modo local si detectamos cambios de otra pestaña
      const activeVisorTab = document.querySelector('#console-visor .tab-view.active');
      if (activeVisorTab && activeVisorTab.id === 'view-visor-lotes') {
         // Comparamos un hash simple de la data para no repintar innecesariamente
         const currentHash = localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS) || "";
         if (window.lastVisorActiveHash !== currentHash) {
             window.lastVisorActiveHash = currentHash;
             try {
                 cargarSeccionVisorLotes(true);
             } catch(e) {}
         }
      }
    }
  };
  setInterval(updateClocks, 1000);
  updateClocks();

  const abrirModal = (id) => {
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
  };
  const cerrarModal = (id) => {
    const target = document.getElementById(id);
    if (target) target.classList.remove('active');
  };

  // Cerrar modales
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => overlay.classList.remove('active'));
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });


  // ==========================================
  // === MÓDULO 1: DISPONIBILIDAD LAB ==========
  // ==========================================
  let chartFailures = null;

  const cargarSeccionEquipos = () => {
    const equipos = JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPOS)) || [];
    const fallas = JSON.parse(localStorage.getItem(STORAGE_KEYS.FALLAS)) || [];
    
    const equiposActualizados = recalcularKPIsEquipos(equipos, fallas);
    localStorage.setItem(STORAGE_KEYS.EQUIPOS, JSON.stringify(equiposActualizados));

    const avgDisp = equiposActualizados.reduce((sum, eq) => sum + eq.availability, 0) / equiposActualizados.length;
    document.getElementById('kpi-equipos-disponibilidad').textContent = `${avgDisp.toFixed(1)}%`;

    const eqConFallas = equiposActualizados.filter(eq => eq.mttr > 0);
    const avgMttr = eqConFallas.length > 0 ? (eqConFallas.reduce((sum, eq) => sum + eq.mttr, 0) / eqConFallas.length) : 0;
    document.getElementById('kpi-equipos-mttr').textContent = `${avgMttr.toFixed(1)} h`;

    const avgMtbf = equiposActualizados.reduce((sum, eq) => sum + eq.mtbf, 0) / equiposActualizados.length;
    document.getElementById('kpi-equipos-mtbf').textContent = `${avgMtbf.toFixed(0)} h`;
    document.getElementById('kpi-equipos-fallas').textContent = fallas.length;

    const tbody = document.getElementById('equipos-table-body');
    tbody.innerHTML = '';
    equiposActualizados.forEach(eq => {
      const tr = document.createElement('tr');
      let badgeClass = eq.status === 'Available' ? 'badge-success' : (eq.status === 'Calibrating' ? 'badge-warning' : 'badge-danger');
      let statusText = eq.status === 'Available' ? 'Disponible' : (eq.status === 'Calibrating' ? 'Calibración' : 'Fuera Serv.');

      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--primary);">${eq.name} <span style="font-size:0.75rem; color:var(--text-muted); display:block;">${eq.id}</span></td>
        <td>${eq.location}</td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
        <td style="font-family: monospace; font-weight:600;">${eq.mttr.toFixed(1)} h</td>
        <td style="font-family: monospace; font-weight:600;">${eq.mtbf.toFixed(0)} h</td>
        <td style="font-family: monospace; font-weight:700; color: var(--primary);">${eq.availability.toFixed(1)}%</td>
        <td>
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn btn-secondary btn-icon-only btn-change-status" data-id="${eq.id}" title="Cambiar Estado">
              <i data-lucide="refresh-cw" style="width:14px; height:14px;"></i>
            </button>
            <button class="btn btn-danger btn-icon-only btn-delete-equip" data-id="${eq.id}" title="Eliminar Equipo">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-primary btn-sm btn-open-support" data-id="${eq.id}" style="padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="message-square" style="width:13px; height:13px; vertical-align: middle;"></i>
            Manual & Chat
          </button>
        </td>
      `;

      tr.querySelector('.btn-change-status').addEventListener('click', () => {
        const statuses = ['Available', 'Calibrating', 'Out of Service'];
        eq.status = statuses[(statuses.indexOf(eq.status) + 1) % statuses.length];
        localStorage.setItem(STORAGE_KEYS.EQUIPOS, JSON.stringify(equiposActualizados));
        cargarSeccionEquipos();
      });

      tr.querySelector('.btn-delete-equip').addEventListener('click', () => {
        if (confirm(`¿Está seguro de que desea eliminar el equipo "${eq.name}"? Se borrarán sus manuales, fallas y configuraciones asociadas.`)) {
          eliminarEquipo(eq.id);
        }
      });

      tr.querySelector('.btn-open-support').addEventListener('click', () => {
        abrirSoporteEquipo(eq.id);
      });

      tbody.appendChild(tr);
    });

    lucide.createIcons();
    renderizarHistoricoFallasSide(equiposActualizados, fallas);
    renderizarGraficoFallas(equiposActualizados, fallas);

    const sel = document.getElementById('fail-select-equip');
    sel.innerHTML = '';
    equiposActualizados.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.name;
      sel.appendChild(opt);
    });

    inicializarConfiguracionMuestras();
  };

  const renderizarConfigModel = (modelName, tempConfigObj = null) => {
    const tbody = document.getElementById('model-config-samples-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let modelConfig;
    if (tempConfigObj) {
      modelConfig = tempConfigObj;
    } else {
      const configs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
      modelConfig = configs.find(c => c.model === modelName) || { model: modelName, samples: [] };
    }

    if (modelConfig.samples.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:2rem 0; font-style:italic;">No hay componentes configurados para este modelo. Haga clic en 'Agregar Muestra / Componente' para comenzar.</td></tr>`;
      return;
    }

    modelConfig.samples.forEach((sample, sampleIdx) => {
      const tr = document.createElement('tr');
      
      let analysesHTML = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
      
      const standardParams = [
        { key: 'visc100', name: 'Viscosidad 100°C', unit: 'cSt', type: 'range' },
        { key: 'visc40', name: 'Viscosidad 40°C', unit: 'cSt', type: 'range' },
        { key: 'water', name: 'Humedad', unit: '%', type: 'max' },
        { key: 'iso', name: 'Conteo de Partículas (ISO)', unit: 'código', type: 'max' }
      ];

      standardParams.forEach(param => {
        const existing = sample.analyses ? sample.analyses.find(a => a.name === param.name) : null;
        const checked = existing ? 'checked' : '';
        const displayStyle = existing ? 'display: flex;' : 'display: none;';

        let limitInputsHTML = '';
        if (param.type === 'range') {
          const nMin = existing ? existing.normalMin ?? '' : '';
          const nMax = existing ? existing.normalMax ?? '' : '';
          const wMin = existing ? existing.warningMin ?? '' : '';
          const wMax = existing ? existing.warningMax ?? '' : '';
          limitInputsHTML = `
            <div class="param-limits-row" style="${displayStyle} gap: 8px; align-items: center; margin-top: 4px; font-size: 0.75rem;">
              <span>Normal:</span>
              <input type="number" step="any" class="form-control limit-input val-normal-min" placeholder="Mín" value="${nMin}" style="width: 65px; height:24px; padding:2px 6px; font-size:0.75rem;">
              <span>-</span>
              <input type="number" step="any" class="form-control limit-input val-normal-max" placeholder="Máx" value="${nMax}" style="width: 65px; height:24px; padding:2px 6px; font-size:0.75rem;">
              <span style="margin-left: 8px;">Adv:</span>
              <input type="number" step="any" class="form-control limit-input val-warning-min" placeholder="Mín" value="${wMin}" style="width: 65px; height:24px; padding:2px 6px; font-size:0.75rem;">
              <span>-</span>
              <input type="number" step="any" class="form-control limit-input val-warning-max" placeholder="Máx" value="${wMax}" style="width: 65px; height:24px; padding:2px 6px; font-size:0.75rem;">
              <span>${param.unit}</span>
            </div>
          `;
        } else {
          const nMax = existing ? existing.normalMax ?? '' : '';
          const wMax = existing ? existing.warningMax ?? '' : '';
          limitInputsHTML = `
            <div class="param-limits-row" style="${displayStyle} gap: 8px; align-items: center; margin-top: 4px; font-size: 0.75rem;">
              <span>Lím. Normal (Máx):</span>
              <input type="number" step="any" class="form-control limit-input val-normal-max" placeholder="Val" value="${nMax}" style="width: 70px; height:24px; padding:2px 6px; font-size:0.75rem;">
              <span style="margin-left: 8px;">Lím. Advertencia (Máx):</span>
              <input type="number" step="any" class="form-control limit-input val-warning-max" placeholder="Val" value="${wMax}" style="width: 70px; height:24px; padding:2px 6px; font-size:0.75rem;">
              <span>${param.unit}</span>
            </div>
          `;
        }

        analysesHTML += `
          <div class="param-config-group" data-name="${param.name}" data-type="${param.type}">
            <label style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size:0.8rem; color:var(--text-primary); cursor:pointer;">
              <input type="checkbox" class="chk-param-active" ${checked} style="width:14px; height:14px; margin-right: 4px;">
              ${param.name}
            </label>
            ${limitInputsHTML}
          </div>
        `;
      });

      analysesHTML += `</div>`;

      tr.innerHTML = `
        <td style="vertical-align: top; padding-top: 1rem;">
          <input type="text" class="form-control sample-name-input" value="${sample.name}" placeholder="Ej: Motor" style="font-weight:600; font-size:0.85rem; height:32px;">
        </td>
        <td style="padding: 1rem 0;">
          ${analysesHTML}
        </td>
        <td style="text-align: center; vertical-align: top; padding-top: 1rem;">
          <button class="btn btn-danger btn-icon-only btn-delete-sample-point" title="Eliminar Muestra">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
          </button>
        </td>
      `;

      tr.querySelectorAll('.chk-param-active').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const limitsDiv = e.target.closest('.param-config-group').querySelector('.param-limits-row');
          if (limitsDiv) {
            limitsDiv.style.display = e.target.checked ? 'flex' : 'none';
          }
        });
      });

      tr.querySelector('.btn-delete-sample-point').addEventListener('click', () => {
        modelConfig.samples.splice(sampleIdx, 1);
        renderizarConfigModel(modelName, modelConfig);
      });

      tbody.appendChild(tr);
    });

    lucide.createIcons();
  };

  const inicializarConfiguracionMuestras = () => {
    const select = document.getElementById('select-config-model');
    if (!select) return;

    const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    const configs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;

    const modelosFlota = Array.from(new Set(flota.map(x => x.modelo))).filter(Boolean);
    const modelosConfig = configs.map(c => c.model);
    const todosModelos = Array.from(new Set([...modelosFlota, ...modelosConfig])).sort();

    const currentSelectedValue = select.value;
    select.innerHTML = '';
    todosModelos.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    });

    if (currentSelectedValue && todosModelos.includes(currentSelectedValue)) {
      select.value = currentSelectedValue;
    } else if (todosModelos.length > 0) {
      select.value = todosModelos[0];
    }

    if (select.value) {
      renderizarConfigModel(select.value);
    }

    select.onchange = (e) => {
      renderizarConfigModel(e.target.value);
    };

    const btnNewModel = document.getElementById('btn-add-config-model');
    if (btnNewModel) {
      btnNewModel.onclick = () => {
        const nuevo = prompt("Ingrese el nombre/código del nuevo modelo de equipo (ej: DS311):");
        if (nuevo && nuevo.trim() !== '') {
          const val = nuevo.trim().toUpperCase();
          let optAlready = Array.from(select.options).find(o => o.value === val);
          if (!optAlready) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);
          }
          select.value = val;
          renderizarConfigModel(val);
        }
      };
    }

    const btnDeleteModel = document.getElementById('btn-delete-config-model');
    if (btnDeleteModel) {
      btnDeleteModel.onclick = () => {
        const currentModel = select.value;
        if (!currentModel) {
          alert("Por favor, seleccione un modelo para eliminar.");
          return;
        }
        
        if (confirm(`¿Está seguro que desea eliminar completamente la configuración de análisis para el modelo "${currentModel}"? Esta acción no se puede deshacer.`)) {
          let configsLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
          
          configsLocal = configsLocal.filter(c => c.model !== currentModel);
          localStorage.setItem(STORAGE_KEYS.CONFIG_MUESTRAS, JSON.stringify(configsLocal));
          
          alert(`El modelo "${currentModel}" ha sido eliminado exitosamente.`);
          
          // Refresh the select options
          const uniqueModels = [...new Set(configsLocal.map(c => c.model))];
          select.innerHTML = uniqueModels.map(m => `<option value="${m}">${m}</option>`).join('');
          
          if (uniqueModels.length > 0) {
            select.value = uniqueModels[0];
            renderizarConfigModel(uniqueModels[0]);
          } else {
            select.innerHTML = '';
            document.getElementById('model-config-samples-body').innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted);">No hay modelos configurados.</td></tr>`;
          }
          
          // Actualizar selectores en otras partes de la app si es necesario
          if (typeof actualizarSelectoresFlota === 'function') actualizarSelectoresFlota();
        }
      };
    }

    const btnAddSamplePoint = document.getElementById('btn-add-sample-point');
    if (btnAddSamplePoint) {
      btnAddSamplePoint.onclick = () => {
        const currentModel = select.value;
        if (!currentModel) return;

        const currentConfigs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
        let modelConfig = currentConfigs.find(c => c.model === currentModel);
        if (!modelConfig) {
          modelConfig = { model: currentModel, samples: [] };
          currentConfigs.push(modelConfig);
        }

        modelConfig.samples.push({
          name: "Nuevo Componente",
          analyses: []
        });

        renderizarConfigModel(currentModel, modelConfig);
      };
    }

    const btnSave = document.getElementById('btn-save-model-config');
    if (btnSave) {
      btnSave.onclick = () => {
        const currentModel = select.value;
        if (!currentModel) return;

        const tbody = document.getElementById('model-config-samples-body');
        const rows = tbody.querySelectorAll('tr');
        const samples = [];

        let isValid = true;
        rows.forEach(row => {
          const nameInput = row.querySelector('.sample-name-input');
          if (!nameInput) return;
          const name = nameInput.value.trim();
          if (name === '') {
            alert("El nombre de la muestra no puede estar vacío.");
            isValid = false;
            return;
          }

          const analyses = [];
          const groups = row.querySelectorAll('.param-config-group');
          groups.forEach(g => {
            const chk = g.querySelector('.chk-param-active');
            if (chk && chk.checked) {
              const nameParam = g.getAttribute('data-name');
              const type = g.getAttribute('data-type');
              const analysisObj = { name: nameParam };

              if (type === 'range') {
                const nMin = parseFloat(g.querySelector('.val-normal-min').value);
                const nMax = parseFloat(g.querySelector('.val-normal-max').value);
                const wMin = parseFloat(g.querySelector('.val-warning-min').value);
                const wMax = parseFloat(g.querySelector('.val-warning-max').value);

                if (isNaN(nMin) || isNaN(nMax) || isNaN(wMin) || isNaN(wMax)) {
                  alert(`Por favor, complete todos los límites numéricos para ${nameParam} en la muestra ${name}.`);
                  isValid = false;
                  return;
                }
                analysisObj.normalMin = nMin;
                analysisObj.normalMax = nMax;
                analysisObj.warningMin = wMin;
                analysisObj.warningMax = wMax;
              } else {
                const nMax = parseFloat(g.querySelector('.val-normal-max').value);
                const wMax = parseFloat(g.querySelector('.val-warning-max').value);

                if (isNaN(nMax) || isNaN(wMax)) {
                  alert(`Por favor, complete todos los límites numéricos para ${nameParam} en la muestra ${name}.`);
                  isValid = false;
                  return;
                }
                analysisObj.normalMax = nMax;
                analysisObj.warningMax = wMax;
              }
              analyses.push(analysisObj);
            }
          });

          samples.push({ name, analyses });
        });

        if (!isValid) return;

        const configsLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
        const idx = configsLocal.findIndex(c => c.model === currentModel);
        if (idx !== -1) {
          configsLocal[idx].samples = samples;
        } else {
          configsLocal.push({ model: currentModel, samples });
        }

        localStorage.setItem(STORAGE_KEYS.CONFIG_MUESTRAS, JSON.stringify(configsLocal));
        alert("Configuración de muestras guardada con éxito para el modelo: " + currentModel);
        renderizarConfigModel(currentModel);
      };
    }

    const btnViewConfig = document.getElementById('btn-view-config-json');
    if (btnViewConfig) {
      btnViewConfig.onclick = () => {
        const configsLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
        
        let report = "--- BASE DE DATOS DE MODELOS ACTUAL ---\n\n";
        report += `Total de modelos configurados: ${configsLocal.length}\n\n`;
        
        configsLocal.forEach(c => {
          report += `■ Modelo: ${c.model} (${c.samples.length} componentes)\n`;
          c.samples.forEach(s => {
            report += `  - ${s.name}: ${s.analyses.map(a => a.name).join(', ')}\n`;
          });
          report += '\n';
        });

        alert("Se descargará un resumen de la base de datos actual para que puedas verificarla.");
        
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cargado_Modelos_BD_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    const btnImport = document.getElementById('btn-import-config-excel');
    const inputExcel = document.getElementById('input-excel-config');

    if (btnImport && inputExcel) {
      btnImport.onclick = () => inputExcel.click();
      
      inputExcel.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, {type: 'binary'});
            const sheetName = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});

            if (rows.length < 2) {
              alert("El archivo está vacío o no tiene el formato esperado.");
              return;
            }

            const headers = rows[0].map(h => String(h || '').toUpperCase().trim());
            let idxActivo = headers.findIndex(h => h.includes('ACTIVO') || h.includes('MODELO') || h.includes('EQUIPO'));
            let idxComponente = headers.findIndex(h => h.includes('COMPONENTE') || h.includes('MUESTRA'));
            
            if (idxActivo === -1 || idxComponente === -1) {
              alert("No se encontraron las columnas 'ACTIVO' y 'COMPONENTE'. Verifique el archivo.");
              return;
            }

            // Encontrar columnas de viscosidad y conteo de partículas (ej. 4 µm)
            const viscIdxs = [];
            const isoIdxs = [];
            headers.forEach((h, i) => {
              if (h.includes('VISC')) viscIdxs.push(i);
              if (/4\s*µ?u?m/i.test(h) || h.includes('ISO') || h.includes('PART')) isoIdxs.push(i);
            });

            const currentConfigs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
            let updatedModels = 0;
            let lastModel = "";

            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row) continue;
              
              let model = row[idxActivo];
              if (!model) {
                model = lastModel; // Herencia para celdas combinadas/vacías
              } else {
                lastModel = model;
              }
              
              const comp = row[idxComponente];

              if (!model || !comp) continue;

              function parseLimit(str) {
                if (!str) return undefined;
                const match = String(str).match(/\d+([.,]\d+)?/);
                if (match) return parseFloat(match[0].replace(',', '.'));
                return undefined;
              }

              let wMinVisc, nMinVisc, nMaxVisc, wMaxVisc;
              if (viscIdxs.length >= 5) {
                wMinVisc = parseLimit(row[viscIdxs[0]]);
                nMinVisc = parseLimit(row[viscIdxs[1]]);
                nMaxVisc = parseLimit(row[viscIdxs[3]]);
                wMaxVisc = parseLimit(row[viscIdxs[4]]);
              }

              let maxIsoWarn = undefined;
              let maxIsoCrit = undefined;
              for (let j = 0; j < isoIdxs.length; j += 2) {
                let w = parseLimit(row[isoIdxs[j]]);
                let c = parseLimit(row[isoIdxs[j+1]]);
                if (w !== undefined) maxIsoWarn = Math.max(maxIsoWarn || 0, w);
                if (c !== undefined) maxIsoCrit = Math.max(maxIsoCrit || 0, c);
              }

              let modelConfig = currentConfigs.find(c => String(c.model).trim().toUpperCase() === String(model).trim().toUpperCase());
              if (!modelConfig) {
                modelConfig = { model: String(model).trim(), samples: [] };
                currentConfigs.push(modelConfig);
              }

              let sampleConfig = modelConfig.samples.find(s => String(s.name).trim().toUpperCase() === String(comp).trim().toUpperCase());
              if (!sampleConfig) {
                sampleConfig = { name: String(comp).trim(), analyses: [] };
                modelConfig.samples.push(sampleConfig);
              }

              // Asignar Viscosidad solo si hay al menos un número
              if (wMinVisc !== undefined || nMinVisc !== undefined || nMaxVisc !== undefined || wMaxVisc !== undefined) {
                let viscAnalysis = sampleConfig.analyses.find(a => a.name.includes("Viscosidad"));
                
                // Determinar temperatura correcta basada en el componente
                let cName = String(comp).toUpperCase();
                let correctTemp = "100°C";
                if (cName.includes('HIDR') || cName.includes('COMPRESOR') || cName.includes('TURBINA')) {
                  correctTemp = "40°C";
                }
                
                if (!viscAnalysis || !viscAnalysis.name.includes(correctTemp)) {
                  // Si existe una pero es de la temperatura incorrecta, la removemos
                  if (viscAnalysis) {
                    sampleConfig.analyses = sampleConfig.analyses.filter(a => !a.name.includes("Viscosidad"));
                  }
                  viscAnalysis = { name: `Viscosidad ${correctTemp}`, unit: "cSt" };
                  sampleConfig.analyses.push(viscAnalysis);
                }
                
                if (wMinVisc !== undefined) viscAnalysis.warningMin = wMinVisc;
                if (nMinVisc !== undefined) viscAnalysis.normalMin = nMinVisc;
                if (nMaxVisc !== undefined) viscAnalysis.normalMax = nMaxVisc;
                if (wMaxVisc !== undefined) viscAnalysis.warningMax = wMaxVisc;
              }

              // Asignar ISO solo si hay al menos un número
              if (maxIsoWarn !== undefined || maxIsoCrit !== undefined) {
                let isoAnalysis = sampleConfig.analyses.find(a => a.name.includes("ISO") || a.name.includes("Part"));
                if (!isoAnalysis) {
                  isoAnalysis = { name: "Conteo de Partículas (ISO)", unit: "código" };
                  sampleConfig.analyses.push(isoAnalysis);
                }
                if (maxIsoWarn !== undefined) isoAnalysis.normalMax = maxIsoWarn;
                if (maxIsoCrit !== undefined) isoAnalysis.warningMax = maxIsoCrit;
              }
              updatedModels++;
            }

            if (updatedModels > 0) {
              // Aplicar criterio de Humedad para TODOS los componentes (solicitado por el usuario)
              currentConfigs.forEach(mc => {
                mc.samples.forEach(sc => {
                  let hum = sc.analyses.find(a => a.name.includes("Humedad") || a.name.includes("Agua"));
                  if (!hum) {
                    hum = { name: "Humedad", unit: "%" };
                    sc.analyses.push(hum);
                  }
                  hum.normalMax = 0.01;
                  hum.warningMax = 0.01;
                });
              });

              localStorage.setItem(STORAGE_KEYS.CONFIG_MUESTRAS, JSON.stringify(currentConfigs));
              alert(`¡Importación exitosa! Se procesaron límites para ${updatedModels} componentes y se aplicó el criterio de Humedad globalmente.`);
              
              const currentModel = document.getElementById('select-config-model').value;
              
              // Actualizar selectores para asegurar que el nuevo modelo aparezca
              const select = document.getElementById('select-config-model');
              const uniqueModels = [...new Set(currentConfigs.map(c => c.model))];
              select.innerHTML = uniqueModels.map(m => `<option value="${m}">${m}</option>`).join('');
              
              if (currentModel && uniqueModels.includes(currentModel)) {
                select.value = currentModel;
                renderizarConfigModel(currentModel);
              } else if (uniqueModels.length > 0) {
                select.value = uniqueModels[0];
                renderizarConfigModel(uniqueModels[0]);
              }
            } else {
              alert("No se importó ningún límite. Revise que la estructura del Excel coincida.");
            }

          } catch(e) {
            console.error("Error importando excel:", e);
            alert("Ocurrió un error al procesar el archivo Excel.");
          }
          
          inputExcel.value = '';
        };
        reader.readAsBinaryString(file);
      };
    }
  };

  let activeSampleReportingId = null;
  let userEditedDiagnostico = false;
  let currentSampleAnalysesConfig = [];
  let currentHistoricalBigData = [];

  const abrirModalCargaResultados = async (sampleId) => {
    window.abrirModalCargaResultados = abrirModalCargaResultados;
    activeSampleReportingId = sampleId;
    userEditedDiagnostico = false;

    const active = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const sample = active.find(x => x.id === sampleId);
    if (!sample) return;

    if (window.HistorialDB) {
      try {
        currentHistoricalBigData = await window.HistorialDB.getByEquipoComponente(sample.equipId, sample.component);
      } catch (e) {
        currentHistoricalBigData = [];
      }
    } else {
      currentHistoricalBigData = [];
    }

    document.getElementById('results-modal-subtitle').innerHTML = `Muestra: <strong>${sample.id}</strong> | Equipo: <strong>${obtenerNombreEquipo(sample.equipId)} (${sample.component})</strong>`;

    const modelName = obtenerModeloDeFlota(sample.equipId);
    const configs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
    const modelConfig = configs.find(c => c.model === modelName);
    
    let sampleConfig = modelConfig ? modelConfig.samples.find(s => s.name === sample.component) : null;
    if (!sampleConfig) {
      sampleConfig = {
        name: sample.component,
        analyses: [
          { name: "Viscosidad 100°C", unit: "cSt", normalMin: 12.5, normalMax: 16.3, warningMin: 11.5, warningMax: 17.5 },
          { name: "Humedad", unit: "%", normalMax: 0.01, warningMax: 0.01 }
        ]
      };
    }
    
    currentSampleAnalysesConfig = sampleConfig.analyses || [];

    const trendSelect = document.getElementById('select-trend-parameter');
    trendSelect.innerHTML = '';
    currentSampleAnalysesConfig.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.name;
      opt.textContent = a.name;
      trendSelect.appendChild(opt);
    });

    const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
    const histSamples = completed
      .filter(s => s.equipId === sample.equipId && s.component === sample.component)
      .sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime))
      .slice(-3);

    const containerParams = document.getElementById('results-parameters-inputs-container');
    containerParams.innerHTML = '';

    const containerHist = document.getElementById('results-historical-inputs-container');
    containerHist.innerHTML = '';

    currentSampleAnalysesConfig.forEach(a => {
      const divParam = document.createElement('div');
      divParam.className = 'form-group';
      
      let limitsInfo = '';
      if (a.normalMin !== undefined) {
        limitsInfo = `Normal: ${a.normalMin}-${a.normalMax} | Adv: ${a.warningMin}-${a.warningMax} ${a.unit}`;
      } else {
        limitsInfo = `Normal: <${a.normalMax} | Adv: <${a.warningMax} ${a.unit}`;
      }

      let inputHTML = '';
      if (a.name === 'Humedad') {
        inputHTML = `
          <select class="form-control current-param-input" data-name="${a.name}" style="font-size:0.8rem; height:32px; flex-grow:1; color:var(--text-primary); background:var(--bg-secondary);" required>
            <option value="">-- Seleccionar Humedad --</option>
            <option value="<0.01">&lt;0,01% (normal y se puede continuar analizando)</option>
            <option value=">0.01">&gt;0,01% (critico y esta condicion impide todo analisis posterior)</option>
          </select>
        `;
      } else {
        inputHTML = `
          <input type="number" step="any" class="form-control current-param-input" data-name="${a.name}" placeholder="Ingrese valor" style="font-size:0.8rem; height:32px; flex-grow:1; color:var(--text-primary); background:var(--bg-secondary);" required>
        `;
      }

      divParam.innerHTML = `
        <label style="font-weight:600; color:var(--text-primary); display:flex; justify-content:space-between; font-size:0.8rem;">
          <span>${a.name} (${a.unit}):</span>
          <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">${limitsInfo}</span>
        </label>
        <div style="display:flex; gap:10px; align-items:center; margin-top:4px;">
          ${inputHTML}
          <span class="badge badge-secondary param-status-badge" style="font-size:0.75rem; width:80px; text-align:center;">Normal</span>
        </div>
      `;
      containerParams.appendChild(divParam);

      const divHistRow = document.createElement('div');
      divHistRow.className = 'glass-card';
      divHistRow.style.cssText = 'padding:10px; display:flex; flex-direction:column; gap:6px; background:rgba(255,255,255,0.01);';
      divHistRow.setAttribute('data-param-name', a.name);

      let h1 = '', h2 = '', h3 = '';
      const getParamValue = (sObj) => {
        if (!sObj) return '';
        if (sObj.measuredValues && sObj.measuredValues[a.name] !== undefined) {
          return sObj.measuredValues[a.name];
        }
        if (sObj.simulatedValues) {
          if (a.name.includes('Viscosidad 100°C') || a.name.includes('Viscosidad 40°C')) return sObj.simulatedValues.visc;
          if (a.name.includes('Humedad')) return sObj.simulatedValues.water;
          if (a.name.includes('Conteo')) {
            const first = parseInt(sObj.simulatedValues.iso.split('/')[0]);
            return isNaN(first) ? 18 : first;
          }
        }
        return '';
      };

      const getNormalizedHumedad = (sObj) => {
        let val = getParamValue(sObj);
        if (val === undefined || val === null || val === '') return '';
        if (typeof val === 'number') {
          return val > 0.01 ? '>0.01' : '<0.01';
        }
        const strVal = String(val).trim();
        if (strVal.includes('>')) return '>0.01';
        if (strVal.includes('<')) return '<0.01';
        const parsed = parseFloat(strVal);
        if (!isNaN(parsed)) {
          return parsed > 0.01 ? '>0.01' : '<0.01';
        }
        return '';
      };

      if (a.name === 'Humedad') {
        if (histSamples.length >= 1) h3 = getNormalizedHumedad(histSamples[histSamples.length - 1]);
        if (histSamples.length >= 2) h2 = getNormalizedHumedad(histSamples[histSamples.length - 2]);
        if (histSamples.length >= 3) h1 = getNormalizedHumedad(histSamples[histSamples.length - 3]);
      } else {
        if (histSamples.length >= 1) h3 = getParamValue(histSamples[histSamples.length - 1]);
        if (histSamples.length >= 2) h2 = getParamValue(histSamples[histSamples.length - 2]);
        if (histSamples.length >= 3) h1 = getParamValue(histSamples[histSamples.length - 3]);
      }

      let histInputsHTML = '';
      if (a.name === 'Humedad') {
        const createHistSelect = (val, classSuffix) => {
          return `
            <select class="form-control hist-input ${classSuffix}" style="font-size:0.75rem; height:24px; padding:2px 6px; color:var(--text-primary); background:var(--bg-secondary);">
              <option value="">N/A</option>
              <option value="<0.01" ${val === '<0.01' ? 'selected' : ''}>&lt;0,01%</option>
              <option value=">0.01" ${val === '>0.01' ? 'selected' : ''}>&gt;0,01%</option>
            </select>
          `;
        };
        histInputsHTML = `
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.65rem;">Ant. -3:</label>
            ${createHistSelect(h1, 'hist-val-3')}
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.65rem;">Ant. -2:</label>
            ${createHistSelect(h2, 'hist-val-2')}
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.65rem;">Ant. -1:</label>
            ${createHistSelect(h3, 'hist-val-1')}
          </div>
        `;
      } else {
        histInputsHTML = `
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.65rem;">Ant. -3:</label>
            <input type="number" step="any" class="form-control hist-input hist-val-3" value="${h1}" placeholder="N/A" style="font-size:0.75rem; height:24px; padding:2px 6px; color:var(--text-primary); background:var(--bg-secondary);">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.65rem;">Ant. -2:</label>
            <input type="number" step="any" class="form-control hist-input hist-val-2" value="${h2}" placeholder="N/A" style="font-size:0.75rem; height:24px; padding:2px 6px; color:var(--text-primary); background:var(--bg-secondary);">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.65rem;">Ant. -1:</label>
            <input type="number" step="any" class="form-control hist-input hist-val-1" value="${h3}" placeholder="N/A" style="font-size:0.75rem; height:24px; padding:2px 6px; color:var(--text-primary); background:var(--bg-secondary);">
          </div>
        `;
      }

      divHistRow.innerHTML = `
        <span style="font-size:0.75rem; font-weight:700; color:var(--primary);">${a.name} (Históricos)</span>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
          ${histInputsHTML}
        </div>
      `;
      containerHist.appendChild(divHistRow);
    });

    containerParams.querySelectorAll('.current-param-input').forEach(input => {
      const trigger = () => {
        evaluarResultadosActuales();
        actualizarGraficoTendencia();
      };
      input.oninput = trigger;
      input.onchange = trigger;
    });

    containerHist.querySelectorAll('.hist-input').forEach(input => {
      const trigger = () => {
        actualizarGraficoTendencia();
      };
      input.oninput = trigger;
      input.onchange = trigger;
    });

    trendSelect.onchange = () => {
      actualizarGraficoTendencia();
    };

    document.getElementById('results-diagnostico').oninput = () => {
      userEditedDiagnostico = true;
    };

    evaluarResultadosActuales();
    actualizarGraficoTendencia();
    abrirModal('modal-input-results');
  };

  const evaluarResultadosActuales = () => {
    const container = document.getElementById('results-parameters-inputs-container');
    const inputs = container.querySelectorAll('.current-param-input');
    
    let worstSeverity = 'Normal';
    let deviatingParams = [];

    // Buscar si hay humedad crítica primero para aplicar el bloqueo
    let isHumedadCritica = false;
    inputs.forEach(input => {
      const name = input.getAttribute('data-name');
      if (name === 'Humedad' && input.value === '>0.01') {
        isHumedadCritica = true;
      }
    });

    inputs.forEach(input => {
      const name = input.getAttribute('data-name');
      const badge = input.closest('div').querySelector('.param-status-badge');

      // Bloquear o desbloquear otros campos si la humedad es crítica
      if (name !== 'Humedad') {
        input.disabled = isHumedadCritica;
        if (isHumedadCritica) {
          input.value = ''; // Limpiar si está bloqueado
          badge.textContent = 'Suspendido';
          badge.className = 'badge badge-secondary param-status-badge';
          return;
        }
      }

      let val;
      let isPending = false;
      if (name === 'Humedad') {
        if (!input.value) {
          isPending = true;
        } else {
          val = input.value;
        }
      } else {
        val = parseFloat(input.value);
        if (isNaN(val)) {
          isPending = true;
        }
      }

      if (isPending) {
        badge.textContent = 'Pendiente';
        badge.className = 'badge badge-secondary param-status-badge';
        return;
      }

      const paramConfig = currentSampleAnalysesConfig.find(a => a.name === name);
      if (!paramConfig) return;

      let severity = 'Normal';

      if (name === 'Humedad') {
        if (val === '>0.01') {
          severity = 'Critical';
        } else {
          severity = 'Normal';
        }
      } else {
        if (paramConfig.normalMin !== undefined) {
          if (val <= paramConfig.warningMin || val >= paramConfig.warningMax) {
            severity = 'Critical';
          } else if (val <= paramConfig.normalMin || val >= paramConfig.normalMax) {
            severity = 'Warning';
          }
        } else {
          if (val >= paramConfig.warningMax) {
            severity = 'Critical';
          } else if (val >= paramConfig.normalMax) {
            severity = 'Warning';
          }
        }
      }

      if (severity === 'Critical') {
        badge.textContent = 'Crítico';
        badge.className = 'badge badge-danger param-status-badge';
        worstSeverity = 'Critical';
        deviatingParams.push(name);
      } else if (severity === 'Warning') {
        badge.textContent = 'Advertencia';
        badge.className = 'badge badge-warning param-status-badge';
        if (worstSeverity !== 'Critical') worstSeverity = 'Warning';
        deviatingParams.push(name);
      } else {
        badge.textContent = 'Normal';
        badge.className = 'badge badge-success param-status-badge';
      }
    });

    const mainBadge = document.getElementById('auto-severity-badge');
    if (worstSeverity === 'Critical') {
      mainBadge.textContent = 'CRÍTICO';
      mainBadge.className = 'badge badge-danger';
    } else if (worstSeverity === 'Warning') {
      mainBadge.textContent = 'ADVERTENCIA';
      mainBadge.className = 'badge badge-warning';
    } else {
      mainBadge.textContent = 'NORMAL';
      mainBadge.className = 'badge badge-success';
    }

    if (!userEditedDiagnostico) {
      const diagTextArea = document.getElementById('results-diagnostico');
      if (isHumedadCritica) {
        diagTextArea.value = `Recomendación: Condición Crítica. Humedad fuera de límite (>0.01%). Se suspenden los análisis posteriores de viscosidad y conteo de partículas debido a la presencia excesiva de agua. Programar cambio inmediato de aceite y drenado del sistema.`;
      } else if (worstSeverity === 'Critical') {
        diagTextArea.value = `Recomendación: Condición Crítica. Desviación severa en ${deviatingParams.join(', ')}. Programar paro inmediato del equipo para inspeccionar fugas, corregir niveles o realizar cambio de aceite según corresponda.`;
      } else if (worstSeverity === 'Warning') {
        diagTextArea.value = `Recomendación: Condición de Advertencia. Desviación moderada en ${deviatingParams.join(', ')}. Realizar seguimiento preventivo en el próximo mantenimiento.`;
      } else {
        diagTextArea.value = `Recomendación: Condición Normal. Parámetros dentro de los rangos de control. Seguir con el monitoreo rutinario.`;
      }
    }
  };

  const actualizarGraficoTendencia = () => {
    const trendSelect = document.getElementById('select-trend-parameter');
    const paramName = trendSelect.value;
    if (!paramName) return;

    const paramConfig = currentSampleAnalysesConfig.find(a => a.name === paramName);
    if (!paramConfig) return;

    const containerParams = document.getElementById('results-parameters-inputs-container');
    const currentInput = containerParams.querySelector(`.current-param-input[data-name="${paramName}"]`);
    const valActual = currentInput ? currentInput.value : '';

    let datos = [];
    
    if (currentHistoricalBigData && currentHistoricalBigData.length > 0) {
      let colName = paramName;
      if (paramName.includes("Viscosidad 100")) colName = "Visc 100°C (cSt)";
      else if (paramName.includes("Viscosidad 40")) colName = "Visc 40°C (cSt)";
      else if (paramName.includes("Humedad")) colName = "Agua (%)";
      else if (paramName.includes("Hierro") || paramName === "Fe") colName = "Fe (ppm)";
      else if (paramName.includes("Cobre") || paramName === "Cu") colName = "Cu (ppm)";
      else if (paramName.includes("Plomo") || paramName === "Pb") colName = "Pb (ppm)";
      else if (paramName.includes("Silicio") || paramName === "Si") colName = "Si (ppm)";
      else if (paramName.includes("Aluminio") || paramName === "Al") colName = "Al (ppm)";
      else if (paramName.includes("Cromo") || paramName === "Cr") colName = "Cr (ppm)";
      else if (paramName.includes("Conteo") || paramName.includes("ISO")) colName = "Código ISO";

      // Extraer últimos 20 históricos para una gráfica de súper larga tendencia
      const historyToMap = currentHistoricalBigData.slice(-20);
      datos = historyToMap.map(r => r[colName] || r[paramName] || r[colName.replace('°', '')] || '');
      
      // Inyectar muestra actual
      datos.push(valActual);
    } else {
      const containerHist = document.getElementById('results-historical-inputs-container');
      const histRow = containerHist.querySelector(`.glass-card[data-param-name="${paramName}"]`);
      if (histRow) {
        datos.push(histRow.querySelector('.hist-val-3').value);
        datos.push(histRow.querySelector('.hist-val-2').value);
        datos.push(histRow.querySelector('.hist-val-1').value);
      }
      datos.push(valActual);
    }

    const nMin = paramConfig.normalMin !== undefined ? paramConfig.normalMin : null;
    const nMax = paramConfig.normalMax !== undefined ? paramConfig.normalMax : null;
    const wMin = paramConfig.warningMin !== undefined ? paramConfig.warningMin : null;
    const wMax = paramConfig.warningMax !== undefined ? paramConfig.warningMax : null;

    dibujarGraficoTendenciaCanvas(datos, nMin, nMax, wMin, wMax);
  };

  const dibujarGraficoTendenciaCanvas = (datos, normalMin, normalMax, warningMin, warningMax) => {
    const canvas = document.getElementById('canvas-trend-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const puntos = datos.map((val, idx) => {
      let numVal = parseFloat(val);
      let displayVal = val !== null && val !== undefined ? String(val) : '';
      if (val === '<0.01' || val === '<0,01') {
        numVal = 0.005;
        displayVal = '<0,01%';
      } else if (val === '>0.01' || val === '>0,01') {
        numVal = 0.015;
        displayVal = '>0,01%';
      } else if (!isNaN(numVal)) {
        displayVal = numVal.toFixed(1);
      }
      return {
        val: numVal,
        displayVal: displayVal,
        originalIdx: idx,
        label: idx === 3 ? 'Actual' : `Hist -${3 - idx}`
      };
    }).filter(p => p.val !== null && p.val !== undefined && !isNaN(p.val));

    if (puntos.length === 0) {
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ingrese valores para ver la tendencia', width / 2, height / 2);
      return;
    }

    let allVals = puntos.map(p => p.val);
    if (normalMin !== null && normalMin !== undefined) allVals.push(normalMin);
    if (normalMax !== null && normalMax !== undefined) allVals.push(normalMax);
    if (warningMin !== null && warningMin !== undefined) allVals.push(warningMin);
    if (warningMax !== null && warningMax !== undefined) allVals.push(warningMax);

    let minVal = Math.min(...allVals);
    let maxVal = Math.max(...allVals);
    
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    if (maxVal === minVal) {
      minVal -= 1;
      maxVal += 1;
    } else {
      const range = maxVal - minVal;
      minVal -= range * 0.15;
      maxVal += range * 0.15;
    }

    const getX = (idx) => padding + (idx * (chartWidth / 3));
    const getY = (val) => padding + chartHeight - ((val - minVal) / (maxVal - minVal) * chartHeight);

    if (normalMin !== null && normalMax !== null) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      const yMin = getY(normalMin);
      const yMax = getY(normalMax);
      ctx.fillRect(padding, Math.min(yMin, yMax), chartWidth, Math.abs(yMin - yMax));

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      ctx.beginPath();
      ctx.moveTo(padding, yMin); ctx.lineTo(width - padding, yMin);
      ctx.moveTo(padding, yMax); ctx.lineTo(width - padding, yMax);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (normalMax !== null) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      const yMax = getY(normalMax);
      ctx.fillRect(padding, yMax, chartWidth, height - padding - yMax);

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding, yMax); ctx.lineTo(width - padding, yMax);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    puntos.forEach((p, idx) => {
      const x = getX(p.originalIdx);
      const y = getY(p.val);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    puntos.forEach((p, idx) => {
      const x = getX(p.originalIdx);
      const y = getY(p.val);

      ctx.fillStyle = p.originalIdx === 3 ? 'var(--warning)' : 'var(--primary)';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.displayVal, x, y - 8);

      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '8px sans-serif';
      ctx.fillText(p.label, x, height - 4);
    });
  };

  const inicializarGuardadoResultadosAnalisis = () => {
    const btnSaveImmediate = document.getElementById('btn-save-analysis-results');
    const btnSaveDefer = document.getElementById('btn-save-analysis-defer');

    const handleSave = (generatePDF) => {
      if (!activeSampleReportingId) return;

      const containerParams = document.getElementById('results-parameters-inputs-container');
      const inputs = containerParams.querySelectorAll('.current-param-input');

      const measuredValues = {};
      let hasEmpty = false;

      inputs.forEach(input => {
        const name = input.getAttribute('data-name');
        if (input.disabled) {
          measuredValues[name] = 'SUSPENDIDO';
          return;
        }
        if (name === 'Humedad') {
          if (!input.value) {
            alert("Por favor, seleccione el resultado para Humedad.");
            hasEmpty = true;
            return;
          }
          measuredValues[name] = input.value;
          return;
        }
        const val = parseFloat(input.value);
        if (isNaN(val)) {
          alert(`Por favor, ingrese el resultado para ${name}.`);
          hasEmpty = true;
          return;
        }
        measuredValues[name] = val;
      });

      if (hasEmpty) return;

      const containerHist = document.getElementById('results-historical-inputs-container');
      const historicalValues = {};

      currentSampleAnalysesConfig.forEach(a => {
        const histRow = containerHist.querySelector(`.glass-card[data-param-name="${a.name}"]`);
        if (histRow) {
          if (a.name === 'Humedad') {
            const h1 = histRow.querySelector('.hist-val-3').value;
            const h2 = histRow.querySelector('.hist-val-2').value;
            const h3 = histRow.querySelector('.hist-val-1').value;
            historicalValues[a.name] = [
              h1 === '' ? null : h1,
              h2 === '' ? null : h2,
              h3 === '' ? null : h3
            ];
          } else {
            const h1 = parseFloat(histRow.querySelector('.hist-val-3').value);
            const h2 = parseFloat(histRow.querySelector('.hist-val-2').value);
            const h3 = parseFloat(histRow.querySelector('.hist-val-1').value);
            historicalValues[a.name] = [
              isNaN(h1) ? null : h1,
              isNaN(h2) ? null : h2,
              isNaN(h3) ? null : h3
            ];
          }
        }
      });

      const diagnostico = document.getElementById('results-diagnostico').value.trim();
      const severity = document.getElementById('auto-severity-badge').textContent.trim();

      let finalSeverity = 'Normal';
      if (severity === 'CRÍTICO') finalSeverity = 'Critical';
      else if (severity === 'ADVERTENCIA') finalSeverity = 'Warning';

      const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
      const idx = activas.findIndex(s => s.id === activeSampleReportingId);

      if (idx !== -1) {
        const sample = activas[idx];
        
        let finalDiagnostico = diagnostico;
        let horasAceite = 0;
        let porcentajeVida = 0;
        let horasAceiteMsg = '-';
        let porcentajeVidaMsg = '-';
        
        if (sample.horometro && sample.hrUltimoCambio) {
          horasAceite = parseFloat(sample.horometro) - parseFloat(sample.hrUltimoCambio);
          horasAceiteMsg = horasAceite + ' hrs';
          if (horasAceite < 0) {
            const warningText = "VERIFICAR HOROMETROS Y/O CAMBIO DE COMPONENTES";
            if (!finalDiagnostico.includes(warningText)) {
              finalDiagnostico = warningText + ". " + finalDiagnostico;
            }
          }
        }
        
        const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
        const fleetItem = flota.find(f => f.equipo === sample.equipId && f.componente === sample.component);
        if (fleetItem && fleetItem.vida_presupuestada && sample.horometro) {
          porcentajeVida = (parseFloat(sample.horometro) / parseFloat(fleetItem.vida_presupuestada)) * 100;
          porcentajeVidaMsg = porcentajeVida.toFixed(1) + '%';
        }
        
        sample.measuredValues = measuredValues;
        sample.historicalValues = historicalValues;
        sample.obs = finalDiagnostico;
        sample.severity = finalSeverity;
        sample.horasAceiteCalculadas = horasAceiteMsg;
        sample.porcentajeVidaCalculado = porcentajeVidaMsg;

        if (measuredValues["Viscosidad 100°C"] !== undefined) sample.simulatedValues.visc = measuredValues["Viscosidad 100°C"];
        else if (measuredValues["Viscosidad 40°C"] !== undefined) sample.simulatedValues.visc = measuredValues["Viscosidad 40°C"];
        
        if (measuredValues["Humedad"] !== undefined) sample.simulatedValues.water = measuredValues["Humedad"];
        
        if (measuredValues["Conteo de Partículas (ISO)"] !== undefined) {
          const isoCodeVal = measuredValues["Conteo de Partículas (ISO)"];
          sample.simulatedValues.iso = `${isoCodeVal}/${Math.max(12, isoCodeVal - 2)}/${Math.max(9, isoCodeVal - 5)}`;
        }

        localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(activas));
        
        avanzarEtapaMuestra(activeSampleReportingId, 'Completado');
        
        if (generatePDF && typeof window.generarReportePDF === 'function') {
           window.generarReportePDF(sample, fleetItem);
        }
      }

      cerrarModal('modal-input-results');
    };

    if (btnSaveImmediate) btnSaveImmediate.onclick = () => handleSave(true);
    if (btnSaveDefer) btnSaveDefer.onclick = () => handleSave(false);
  };

  let activeBatchCargaMasivaId = null;

  window.abrirModalCargaMasiva = (batchId) => {
    activeBatchCargaMasivaId = batchId;
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    const batchSamples = activas.filter(s => (s.batchId || s.id) === batchId);

    const headTr = document.getElementById('batch-results-head');
    headTr.innerHTML = `
      <th>Muestra / Componente</th>
      <th style="width: 100px;">Viscosidad (cSt)</th>
      <th style="width: 100px;">Humedad</th>
      <th style="width: 120px;">Código ISO 4406</th>
      <th style="width: 250px;">Diagnóstico / Obs.</th>
    `;

    const tbody = document.getElementById('batch-results-body');
    tbody.innerHTML = '';

    batchSamples.forEach(s => {
      const eqName = obtenerNombreEquipo(s.equipId);
      const tr = document.createElement('tr');
      tr.setAttribute('data-sample-id', s.id);

      tr.innerHTML = `
        <td><strong style="color:var(--primary);">${s.controlNumber || s.id}</strong><br><span style="font-size:0.7rem; color:var(--text-muted)">${eqName} (${s.component})</span></td>
        <td><input type="number" step="any" class="form-control batch-param-input" data-param-name="Viscosidad 100°C" style="width:80px; height:24px; font-size:0.75rem; padding:2px 6px; color:var(--text-primary); background:var(--bg-secondary);"></td>
        <td>
          <select class="form-control batch-param-input" data-param-name="Humedad" style="width:85px; height:24px; font-size:0.7rem; padding:2px; color:var(--text-primary); background:var(--bg-secondary);">
            <option value="">Sel...</option>
            <option value="<0.01"><0.01</option>
            <option value=">0.01">>0.01</option>
          </select>
        </td>
        <td><input type="text" class="form-control batch-param-input" data-param-name="Conteo de Partículas (ISO)" placeholder="Ej: 21/19/16" style="width:100px; height:24px; font-size:0.75rem; padding:2px 6px; color:var(--text-primary); background:var(--bg-secondary);"></td>
        <td><input type="text" class="form-control batch-obs-input" placeholder="Ej: Condición normal." style="width:100%; height:24px; font-size:0.75rem; color:var(--text-primary); background:var(--bg-secondary);"></td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('modal-batch-results').classList.add('active');
  };

  const inicializarGuardadoMasivo = () => {
    const btnDefer = document.getElementById('btn-save-batch-defer');
    const btnImmediate = document.getElementById('btn-save-batch-immediate');

    const handleBatchSave = (generatePDF) => {
      if (!activeBatchCargaMasivaId) return;

      const tbody = document.getElementById('batch-results-body');
      const rows = tbody.querySelectorAll('tr');
      const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
      const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;

      let hasEmpty = false;
      const updates = [];

      rows.forEach(tr => {
         const sampleId = tr.getAttribute('data-sample-id');
         const inputs = tr.querySelectorAll('.batch-param-input');
         const obsInput = tr.querySelector('.batch-obs-input').value.trim();

         const measuredValues = {};
         inputs.forEach(input => {
            const name = input.getAttribute('data-param-name');
            const val = input.value;
            // Allow empty ISO or parameters, don't strict block if not entered
            if (val !== '') {
               if (name === 'Humedad' || name === 'Conteo de Partículas (ISO)') {
                 measuredValues[name] = val;
               } else {
                 measuredValues[name] = parseFloat(val);
               }
            }
         });

         updates.push({ sampleId, measuredValues, obsInput });
      });

      updates.forEach(u => {
         const idx = activas.findIndex(s => s.id === u.sampleId);
         if (idx !== -1) {
            const sample = activas[idx];
            const fleetItem = flota.find(f => f.equipo === sample.equipId && f.componente === sample.component);
            
            const modelName = obtenerModeloDeFlota(sample.equipId);
            const configs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
            const modelConfig = configs.find(c => c.model === modelName);
            let sampleConfig = modelConfig ? modelConfig.samples.find(sm => sm.name === sample.component) : null;
            if (!sampleConfig) {
              sampleConfig = {
                analyses: [
                  { name: "Viscosidad 100°C", normalMin: 12.5, normalMax: 16.3, warningMin: 11.5, warningMax: 17.5 },
                  { name: "Humedad", normalMax: 0.01, warningMax: 0.01 }
                ]
              };
            }
            const paramConfigs = sampleConfig.analyses || [];

            let worstSeverity = 'Normal';
            
            Object.keys(u.measuredValues).forEach(name => {
               const val = u.measuredValues[name];
               const paramConfig = paramConfigs.find(a => a.name === name);
               if (!paramConfig) return;

               let severity = 'Normal';
               if (name === 'Humedad') {
                 if (val === '>0.01') severity = 'Critical';
               } else {
                 if (paramConfig.normalMin !== undefined) {
                   if (val <= paramConfig.warningMin || val >= paramConfig.warningMax) severity = 'Critical';
                   else if (val <= paramConfig.normalMin || val >= paramConfig.normalMax) severity = 'Warning';
                 } else {
                   if (val >= paramConfig.warningMax) severity = 'Critical';
                   else if (val >= paramConfig.normalMax) severity = 'Warning';
                 }
               }

               if (severity === 'Critical') worstSeverity = 'Critical';
               else if (severity === 'Warning' && worstSeverity !== 'Critical') worstSeverity = 'Warning';
            });

            // ISO Code Severity Calculation (Format: 21/19/16)
            if (u.measuredValues["Conteo de Partículas (ISO)"]) {
               const isoParts = u.measuredValues["Conteo de Partículas (ISO)"].split('/');
               if (isoParts.length > 0) {
                 const isoFirst = parseInt(isoParts[0], 10);
                 if (!isNaN(isoFirst)) {
                   if (isoFirst >= 21) worstSeverity = 'Critical';
                   else if (isoFirst >= 19 && worstSeverity !== 'Critical') worstSeverity = 'Warning';
                 }
               }
            }

            let finalDiagnostico = u.obsInput || `Muestra completada en lote. Severidad: ${worstSeverity}`;
            let horasAceite = 0;
            let porcentajeVida = 0;
            let horasAceiteMsg = '-';
            let porcentajeVidaMsg = '-';
            
            if (sample.horometro && sample.hrUltimoCambio) {
              horasAceite = parseFloat(sample.horometro) - parseFloat(sample.hrUltimoCambio);
              horasAceiteMsg = horasAceite + ' hrs';
              if (horasAceite < 0) {
                const warningText = "VERIFICAR HOROMETROS Y/O CAMBIO DE COMPONENTES";
                if (!finalDiagnostico.includes(warningText)) {
                  finalDiagnostico = warningText + ". " + finalDiagnostico;
                }
              }
            }
            
            if (fleetItem && fleetItem.vida_presupuestada && sample.horometro) {
              porcentajeVida = (parseFloat(sample.horometro) / parseFloat(fleetItem.vida_presupuestada)) * 100;
              porcentajeVidaMsg = porcentajeVida.toFixed(1) + '%';
            }

            sample.measuredValues = u.measuredValues;
            sample.obs = finalDiagnostico;
            sample.severity = worstSeverity;
            sample.horasAceiteCalculadas = horasAceiteMsg;
            sample.porcentajeVidaCalculado = porcentajeVidaMsg;

            if (u.measuredValues["Viscosidad 100°C"] !== undefined) sample.simulatedValues.visc = u.measuredValues["Viscosidad 100°C"];
            if (u.measuredValues["Humedad"] !== undefined) sample.simulatedValues.water = u.measuredValues["Humedad"];
            if (u.measuredValues["Conteo de Partículas (ISO)"] !== undefined) {
              const isoStr = u.measuredValues["Conteo de Partículas (ISO)"];
              sample.simulatedValues.iso = isoStr;
              
              if (isoStr.includes('/')) {
                 const parts = isoStr.split('/');
                 // Keep the full string in measuredValues, don't overwrite it with parseInt
              } else {
                 const isoNum = parseInt(isoStr, 10);
                 if (!isNaN(isoNum)) {
                   sample.simulatedValues.iso = `${isoNum}/${Math.max(12, isoNum - 2)}/${Math.max(9, isoNum - 5)}`;
                 }
              }
            }
         }
      });

      localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(activas));

      const processedSamples = [];

      updates.forEach(u => {
         const idx = activas.findIndex(s => s.id === u.sampleId);
         if (idx !== -1) {
            processedSamples.push(activas[idx]);
         }
         avanzarEtapaMuestra(u.sampleId, 'Completado');
      });

      if (generatePDF && typeof window.generarReporteLotePDF === 'function') {
         window.generarReporteLotePDF(processedSamples);
      }

      cerrarModal('modal-batch-results');
      cargarSeccionMuestras();
    };

    if (btnDefer) btnDefer.onclick = () => handleBatchSave(false);
    if (btnImmediate) btnImmediate.onclick = () => handleBatchSave(true);
  };

  const recalcularKPIsEquipos = (equipos, fallas) => {
    const TIEMPO_TEORICO = 720;
    if (!equipos) return [];
    return equipos.map(eq => {
      const eqFallas = fallas.filter(f => f.equipId === eq.id);
      const n = eqFallas.length;
      if (n === 0) return { ...eq, mttr: 0, mtbf: TIEMPO_TEORICO, availability: 100 };
      const totFail = eqFallas.reduce((sum, f) => sum + Number(f.duration), 0);
      return {
        ...eq,
        mttr: totFail / n,
        mtbf: Math.max(0, TIEMPO_TEORICO - totFail) / n,
        availability: ((Math.max(0, TIEMPO_TEORICO - totFail)) / TIEMPO_TEORICO) * 100
      };
    });
  };

  const renderizarHistoricoFallasSide = (equipos, fallas) => {
    const list = document.getElementById('failures-summary-list');
    list.innerHTML = '';
    equipos.map(eq => {
      const f = fallas.filter(fa => fa.equipId === eq.id);
      return {
        name: eq.name,
        count: f.length,
        avg: f.length > 0 ? (f.reduce((s, fa) => s + fa.duration, 0) / f.length) : 0
      };
    }).sort((a,b) => b.count - a.count).slice(0, 4).forEach(item => {
      const d = document.createElement('div');
      d.className = 'failure-item';
      d.innerHTML = `
        <div class="failure-item-meta"><span class="failure-item-name">${item.name}</span><span class="failure-item-desc">T.M. Reparación: ${item.avg.toFixed(1)} h</span></div>
        <div class="failure-item-count">${item.count}</div>
      `;
      list.appendChild(d);
    });
  };

  const renderizarGraficoFallas = (equipos, fallas) => {
    const options = {
      series: [
        { name: 'Nº Fallas', type: 'column', data: equipos.map(eq => fallas.filter(f => f.equipId === eq.id).length) },
        { name: 'MTTR Promedio (h)', type: 'line', data: equipos.map(eq => {
          const f = fallas.filter(fa => fa.equipId === eq.id);
          return f.length > 0 ? (f.reduce((s, fa) => s + fa.duration, 0) / f.length) : 0;
        }) }
      ],
      chart: { height: 250, type: 'line', background: 'transparent', toolbar: { show: false }, foreColor: '#475569' }, // foreColor oscuro
      stroke: { width: [0, 4], curve: 'smooth' },
      colors: ['#002f6c', '#ef4444'], // Azul Newmont
      grid: { borderColor: '#e2e8f0' }, // Grillas claras
      labels: equipos.map(e => e.name),
      xaxis: { type: 'category', axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: [
        { title: { text: 'Nº de Detenciones', style: { color: '#002f6c' } } },
        { opposite: true, title: { text: 'Horas (MTTR)', style: { color: '#ef4444' } } }
      ],
      tooltip: { theme: 'light' },
      legend: { labels: { colors: '#475569' }, position: 'top' }
    };
    if (chartFailures) chartFailures.destroy();
    chartFailures = new ApexCharts(document.querySelector("#chart-failures-recurrent"), options);
    chartFailures.render();
  };

  document.getElementById('btn-show-add-failure').addEventListener('click', () => abrirModal('modal-add-failure'));
  document.getElementById('form-add-failure').addEventListener('submit', (e) => {
    e.preventDefault();
    const equipId = document.getElementById('fail-select-equip').value;
    const desc = document.getElementById('fail-desc').value;
    const duration = parseFloat(document.getElementById('fail-duration').value);
    const date = document.getElementById('fail-date').value;

    const fallas = JSON.parse(localStorage.getItem(STORAGE_KEYS.FALLAS)) || [];
    fallas.push({ id: `FAIL-${String(fallas.length+1).padStart(3,'0')}`, equipId, desc, duration, date });
    localStorage.setItem(STORAGE_KEYS.FALLAS, JSON.stringify(fallas));

    const equipos = JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPOS)) || [];
    const idx = equipos.findIndex(eq => eq.id === equipId);
    if (idx !== -1) {
      equipos[idx].status = 'Out of Service';
      localStorage.setItem(STORAGE_KEYS.EQUIPOS, JSON.stringify(equipos));
    }
    document.getElementById('form-add-failure').reset();
    cerrarModal('modal-add-failure');
    cargarSeccionEquipos();
  });


  // ==========================================
  // === MÓDULO GESTIÓN 2: MUESTRAS EN VIVO ====
  // ==========================================
  const cargarSeccionMuestras = () => {
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];

    document.getElementById('kpi-muestras-activas').textContent = activas.length;
    document.getElementById('kpi-muestras-completas').textContent = completadas.length;

    if (completadas.length > 0) {
      const esp = completadas.reduce((s, m) => s + (m.times && m.times.espera ? m.times.espera : 0), 0) / completadas.length / 60;
      document.getElementById('kpi-muestras-espera-avg').textContent = `${esp.toFixed(1)} min`;

      const ana = completadas.reduce((s, m) => s + (m.times && m.times.analisis ? m.times.analisis : 0), 0) / completadas.length / 60;
      document.getElementById('kpi-muestras-analisis-avg').textContent = `${ana.toFixed(1)} min`;
    }

    renderizarMuestrasActivasCards(activas);
    renderizarMuestrasCompletadasTable(completadas);
    if (window.lucide) setTimeout(() => lucide.createIcons(), 0);
  };

  window.deleteActiveBatch = (batchId) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el lote activo ${batchId}?`)) return;
    let activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    activas = activas.filter(x => (x.batchId || x.id) !== batchId);
    localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(activas));
    cargarSeccionMuestras();
    if (document.getElementById('view-insp-estado').classList.contains('active') && typeof cargarSeccionInspKPIs === 'function') {
      cargarSeccionInspKPIs();
    }
  };

  window.deleteCompletedSample = (sampleId) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la muestra completada ${sampleId}?`)) return;
    let completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
    completadas = completadas.filter(x => x.id !== sampleId);
    localStorage.setItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS, JSON.stringify(completadas));
    cargarSeccionMuestras();
    if (document.getElementById('view-insp-estado').classList.contains('active') && typeof cargarSeccionInspKPIs === 'function') {
      cargarSeccionInspKPIs();
    }
  };

  window.deleteCompletedBatch = (batchId) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar todas las muestras del lote ${batchId}?`)) return;
    let completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
    completadas = completadas.filter(x => (x.batchId || x.id) !== batchId);
    localStorage.setItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS, JSON.stringify(completadas));
    cargarSeccionMuestras();
    if (document.getElementById('view-insp-estado').classList.contains('active') && typeof cargarSeccionInspKPIs === 'function') {
      cargarSeccionInspKPIs();
    }
  };

  const renderizarMuestrasActivasCards = (muestras) => {
    const container = document.getElementById('active-samples-container');
    if (!container) return;
    try {
      container.innerHTML = '';

      if (muestras.length === 0) {
      container.innerHTML = `<div style="grid-column:span 3; text-align:center; color:var(--text-muted); padding:3rem 0; font-style:italic;">No hay muestras activas.</div>`;
      if (intervalTimers) { clearInterval(intervalTimers); intervalTimers = null; }
      return;
    }

    const grouped = {};
    muestras.forEach(s => {
      const bId = s.batchId || s.id;
      if (!grouped[bId]) grouped[bId] = [];
      grouped[bId].push(s);
    });

    Object.keys(grouped).forEach(batchId => {
      const batchSamples = grouped[batchId];
      const s = batchSamples[0]; // Representative sample for the batch
      
      const card = document.createElement('div');
      card.className = 'glass-card';
      card.style.padding = '1.5rem';

      let nextStageBtnText = '';
      let nextStage = '';
      let badgeClass = 'badge-secondary';
      
      switch (s.status) {
        case 'En espera': nextStageBtnText = 'Ingresar Lote a Cola'; nextStage = 'En cola'; badgeClass = 'badge-secondary'; break;
        case 'En cola': nextStageBtnText = 'Iniciar Análisis del Lote'; nextStage = 'En análisis'; badgeClass = 'badge-warning'; break;
        case 'En análisis': nextStageBtnText = 'Lote Terminado'; nextStage = 'Reportando'; badgeClass = 'badge-info'; break;
        case 'Reportando': nextStageBtnText = ''; badgeClass = 'badge-purple'; break;
      }

      const eqName = obtenerNombreEquipo(s.equipId);
      const repSum = batchSamples.reduce((acc, curr) => acc + (curr.times && curr.times.repeticion ? curr.times.repeticion : 0), 0);
      const failSum = batchSamples.reduce((acc, curr) => acc + (curr.times && curr.times.falla ? curr.times.falla : 0), 0);

      let actionsHTML = '';
      if (s.status === 'Reportando') {
        actionsHTML = `
        <div style="margin-top:10px;">
          <button class="btn btn-primary btn-sm" style="width:100%; font-size:0.8rem; padding:6px 8px;" onclick="window.abrirModalCargaMasiva('${batchId}')">Cargar Resultados de Lote</button>
        </div>`;
      } else {
        actionsHTML = `
        <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:6px; margin-top:10px;">
          <button class="btn btn-primary btn-sm" onclick="window.avanzarEtapaLote('${batchId}', '${nextStage}')">${nextStageBtnText} <i data-lucide="chevron-right" style="width:12px; height:12px;"></i></button>
          <button class="btn btn-secondary btn-sm" onclick="window.agregarRepLote('${batchId}')">+ Rep</button>
          <button class="btn btn-secondary btn-sm" onclick="window.agregarFallaLote('${batchId}')">+ Falla</button>
        </div>`;
      }

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <h4 style="font-family:var(--font-heading); font-size:1.1rem; color:var(--primary); font-weight:700;">Lote: ${batchId}</h4>
            <span style="font-size:0.7rem; color:var(--text-muted); display:block; margin-top:2px;">${eqName} (${batchSamples.length} muestras)</span>
            <span style="font-size:0.7rem; color:var(--text-muted);">Resp: ${s.operator}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-danger btn-sm" style="padding: 4px; border-radius: 4px;" onclick="window.deleteActiveBatch('${batchId}')" title="Eliminar Lote"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
            <span class="badge ${badgeClass}">${s.status}</span>
          </div>
        </div>
        <p style="font-size:0.78rem; color:var(--text-primary); min-height:36px; margin-bottom:8px;"><strong>Obs:</strong> ${s.obs}</p>
        
        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--panel-border); padding-top:10px;">
          <div class="timer-container">
            <span class="timer-dot active"></span>
            <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">EN ETAPA:</span>
            <div class="timer-box running" id="timer-display-${batchId}">00:00</div>
          </div>
        </div>

        <div class="time-details-grid">
          <div class="time-detail-item"><span class="time-detail-label">Repeticiones (m)</span><span class="time-detail-val" id="rep-val-${batchId}">${(repSum/60).toFixed(0)}</span></div>
          <div class="time-detail-item"><span class="time-detail-label">T. Falla (m)</span><span class="time-detail-val" id="fail-val-${batchId}">${(failSum/60).toFixed(0)}</span></div>
        </div>

        ${actionsHTML}
      `;

      container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();

    if (intervalTimers) clearInterval(intervalTimers);
    intervalTimers = setInterval(() => {
      const active = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
      const grouped = {};
      active.forEach(s => {
        const bId = s.batchId || s.id;
        if (!grouped[bId]) grouped[bId] = [];
        grouped[bId].push(s);
      });
      Object.keys(grouped).forEach(batchId => {
        const timerEl = document.getElementById(`timer-display-${batchId}`);
        if (timerEl) {
          const s = grouped[batchId][0];
          const sec = Math.floor((Date.now() - new Date(s.currentStageStart).getTime()) / 1000);
          const m = String(Math.floor(sec / 60)).padStart(2, '0');
          const sc = String(sec % 60).padStart(2, '0');
          timerEl.textContent = `${m}:${sc}`;
        }
      });
    }, 1000);
    } catch(e) {
      container.innerHTML = `<div style="color:red; font-weight:bold; grid-column:span 3; padding:2rem; background:white; border:2px solid red; z-index:9999; position:relative;">ERROR (Activas): ${e.stack}</div>`;
    }
  };

  const actualizarMuestraEnLocalStorage = (sample) => {
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const idx = activas.findIndex(s => s.id === sample.id);
    if (idx !== -1) {
      activas[idx] = sample;
      localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(activas));
    }
  };

  window.avanzarEtapaLote = (batchId, nextStage) => {
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const inBatch = activas.filter(s => (s.batchId || s.id) === batchId);
    inBatch.forEach(s => avanzarEtapaMuestra(s.id, nextStage, inBatch.length));
    cargarSeccionMuestras();
  };

  window.agregarRepLote = (batchId) => {
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const inBatch = activas.filter(s => (s.batchId || s.id) === batchId);
    inBatch.forEach(s => {
      s.times.repeticion += Math.round(300 / inBatch.length);
      actualizarMuestraEnLocalStorage(s);
    });
    cargarSeccionMuestras();
  };

  window.agregarFallaLote = (batchId) => {
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const inBatch = activas.filter(s => (s.batchId || s.id) === batchId);
    inBatch.forEach(s => {
      s.times.falla += Math.round(600 / inBatch.length);
      actualizarMuestraEnLocalStorage(s);
    });
    cargarSeccionMuestras();
  };

  const avanzarEtapaMuestra = (id, nextStage, batchSize = 1) => {
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const idx = activas.findIndex(s => s.id === id);
    if (idx === -1) return;

    const sample = activas[idx];
    const now = new Date().toISOString();
    const totalDuration = Math.floor((Date.now() - new Date(sample.currentStageStart).getTime()) / 1000);
    
    // Si la muestra está en un lote, el tiempo real consumido POR MUESTRA es el tiempo total dividido por la cantidad de muestras en el lote.
    const duration = Math.round(totalDuration / Math.max(1, batchSize));

    // Guardar historial de etapas
    sample.stageHistory = sample.stageHistory || [];
    sample.stageHistory.push({
      stage: sample.status,
      duration: duration,
      obs: `Completado: ${sample.status}`
    });

    // Acumular tiempos (duración en segundos)
    if (sample.status === 'En espera') {
      sample.times.espera += duration;
    } else if (sample.status === 'En cola') {
      sample.times.espera += duration;
    } else if (sample.status === 'En análisis') {
      sample.times.analisis += duration;
    } else if (sample.status === 'Reportando') {
      sample.times.reporte += duration;
    }

    if (nextStage === 'Completado') {
      // Eliminar de activas, agregar a completadas
      activas.splice(idx, 1);
      localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(activas));

      const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
      
      // Si no tiene severidad guardada, calcularla de forma automática (retrocompatibilidad)
      if (!sample.severity) {
        const visc = sample.simulatedValues.visc;
        const water = sample.simulatedValues.water;
        const iso = sample.simulatedValues.iso;
        const isoFirst = parseInt(iso.split('/')[0]) || 18;

        let limits = { vMinCrit: 12.0, vMaxCrit: 16.5, vMinWarn: 13.0, vMaxWarn: 15.5 };
        const compLower = String(sample.component).toLowerCase();
        if (compLower.includes('hyd') || compLower.includes('hidr')) {
          limits = { vMinCrit: 55.0, vMaxCrit: 80.0, vMinWarn: 60.0, vMaxWarn: 75.0 };
        } else if (compLower.includes('water') || compLower.includes('bomba')) {
          limits = { vMinCrit: 24.0, vMaxCrit: 36.0, vMinWarn: 27.0, vMaxWarn: 33.0 };
        } else if (compLower.includes('comp')) {
          limits = { vMinCrit: 38.0, vMaxCrit: 52.0, vMinWarn: 41.0, vMaxWarn: 49.0 };
        } else if (compLower.includes('drill') || compLower.includes('omala')) {
          limits = { vMinCrit: 270.0, vMaxCrit: 370.0, vMinWarn: 290.0, vMaxWarn: 350.0 };
        }

        let severity = 'Normal';
        if (visc <= limits.vMinCrit || visc >= limits.vMaxCrit || water >= 1000 || isoFirst >= 21) {
          severity = 'Critical';
        } else if ((visc <= limits.vMinWarn && visc > limits.vMinCrit) || (visc >= limits.vMaxWarn && visc < limits.vMaxCrit) || (water >= 400 && water < 1000) || (isoFirst >= 19 && isoFirst < 21)) {
          severity = 'Warning';
        }

        sample.severity = severity;
      }
      
      sample.status = 'Completado';
      
      // Generar una recomendación si hay severidad y no hay observación guardada
      if (!sample.obs) {
        if (sample.severity === 'Critical') {
          sample.obs = `Recomendación: Condición Crítica. Programar paro inmediato del equipo para inspeccionar y corregir la anomalía.`;
        } else if (sample.severity === 'Warning') {
          sample.obs = `Recomendación: Condición de Advertencia. Realizar seguimiento preventivo e inspeccionar filtros en el próximo mantenimiento programado.`;
        } else {
          sample.obs = `Recomendación: Condición Normal. Seguir con el plan de monitoreo rutinario.`;
        }
      }

      completadas.push(sample);
      localStorage.setItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS, JSON.stringify(completadas));
    } else {
      sample.status = nextStage;
      sample.currentStageStart = now;
      localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(activas));
    }

    cargarSeccionMuestras();
  };

  const renderizarMuestrasCompletadasTable = (muestras) => {
    const tbody = document.getElementById('completed-samples-table-body');
    if (!tbody) return;
    try {
      tbody.innerHTML = '';
      
      const batches = {};
    muestras.forEach(s => {
      const bId = s.batchId || s.id;
      if (!batches[bId]) batches[bId] = [];
      batches[bId].push(s);
    });

    Object.values(batches).reverse().forEach(b => {
      const tr = document.createElement('tr');
      const first = b[0];
      const batchId = first.batchId || first.id;
      
      const totalEspera = b.reduce((acc, s) => acc + (s.times && s.times.espera ? s.times.espera : 0), 0);
      const totalAnalisis = b.reduce((acc, s) => acc + (s.times && s.times.analisis ? s.times.analisis : 0), 0);
      const totalReporte = b.reduce((acc, s) => acc + (s.times && s.times.reporte ? s.times.reporte : 0), 0);
      const totalRepeticion = b.reduce((acc, s) => acc + (s.times && s.times.repeticion ? s.times.repeticion : 0), 0);
      const totalFalla = b.reduce((acc, s) => acc + (s.times && s.times.falla ? s.times.falla : 0), 0);
      
      const tot = (totalEspera + totalAnalisis + totalReporte + totalRepeticion + totalFalla) / 60;
      const avgM = ((totalAnalisis + totalReporte) / b.length) / 60;
      
      // The checkbox now has data-batch instead of data-id
      tr.innerHTML = `
        <td style="text-align: center;"><input type="checkbox" class="batch-export-check" data-batch="${batchId}" checked style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--primary);"></td>
        <td style="font-weight:700; color:var(--primary);">${batchId}</td>
        <td style="text-align:center;"><strong>${b.length}</strong></td>
        <td>${new Date(first.entryTime || Date.now()).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</td>
        <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${first.obs}">${first.obs}</td>
        <td><span class="badge ${first.missing && first.missing.toLowerCase()!=='ninguno'?'badge-warning':'badge-secondary'}">${first.missing || 'Ninguno'}</span></td>
        <td style="font-family:monospace; text-align:center;">${(totalEspera/60).toFixed(1)}</td>
        <td style="font-family:monospace; text-align:center;">${(totalAnalisis/60).toFixed(1)}</td>
        <td style="font-family:monospace; text-align:center;">${(totalReporte/60).toFixed(1)}</td>
        <td style="font-family:monospace; text-align:center; color:var(--warning);">${(totalRepeticion/60).toFixed(0)}</td>
        <td style="font-family:monospace; text-align:center; color:var(--danger);">${(totalFalla/60).toFixed(0)}</td>
        <td style="font-family:monospace; text-align:center; font-weight:700; color:var(--primary);">${tot.toFixed(1)} min</td>
        <td style="font-family:monospace; text-align:center; font-weight:700; color:#10b981;">${avgM.toFixed(1)} min</td>
        <td style="text-align:center;">
          <button class="btn btn-danger btn-sm" style="padding: 2px 6px;" onclick="window.deleteCompletedBatch('${batchId}')" title="Eliminar Lote"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="15" style="color:red; font-weight:bold; padding:2rem; background:white; border:2px solid red;">ERROR (Completadas): ${e.stack}</td></tr>`;
    }
  };



  const prepararModalIngresoMuestras = () => {
    try {
      loteMuestrasActuales = [];
      document.getElementById('form-add-sample').reset();
      
      const d = new Date();
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      document.getElementById('sample-batch-name').value = `LOTE-${yy}${mm}${dd}-${hh}${min}`;
      
      document.getElementById('sample-operator').value = sessionUser ? sessionUser.username : '';
      
      const todayStr = d.toISOString().split('T')[0];
      document.getElementById('bulk-fecha-rec').value = todayStr;
      document.getElementById('bulk-control-inicial').value = '30001';

      const selectEquip = document.getElementById('sample-equip-target');
      selectEquip.innerHTML = '<option value="">-- Seleccionar Equipo --</option>';
      
      const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
      const uniqueEquips = Array.from(new Set(flota.map(x => x.equipo))).sort();
      
      uniqueEquips.forEach(eq => {
        const opt = document.createElement('option');
        opt.value = eq;
        opt.textContent = obtenerNombreEquipo(eq);
        selectEquip.appendChild(opt);
      });

      const alertModel = document.getElementById('modal-model-detected-alert');
      alertModel.textContent = 'Seleccione un equipo para ver los componentes preconfigurados.';
      document.getElementById('modal-preconfigured-checkboxes').innerHTML = '';
      document.getElementById('modal-batch-samples-body').innerHTML = '';

      selectEquip.onchange = (e) => {
        actualizarComponentesPreconfiguradosLote(e.target.value);
      };

      document.getElementById('bulk-horometro').oninput = aplicarCambiosMasivosLote;
      document.getElementById('bulk-horometro-cambio').oninput = aplicarCambiosMasivosLote;
      document.getElementById('bulk-fecha-rec').onchange = aplicarCambiosMasivosLote;
      document.getElementById('bulk-tipo-muestra').onchange = aplicarCambiosMasivosLote;
      document.getElementById('bulk-ot').oninput = aplicarCambiosMasivosLote;
      document.getElementById('bulk-cambio-aceite').onchange = aplicarCambiosMasivosLote;
      document.getElementById('bulk-control-inicial').oninput = () => {
        recalcularConsecutivosLote();
        regenerarTablaBatchMuestras();
      };

      const btnAddCustom = document.getElementById('btn-modal-add-custom-sample');
      if (btnAddCustom) {
        btnAddCustom.onclick = () => {
          const name = prompt("Ingrese el nombre del componente / muestra personalizada:");
          if (name && name.trim() !== '') {
            const bulkHorometro = document.getElementById('bulk-horometro').value;
            const bulkHorometroCambio = document.getElementById('bulk-horometro-cambio').value;
            const bulkFecha = document.getElementById('bulk-fecha-rec').value;
            const bulkTipo = document.getElementById('bulk-tipo-muestra').value;
            const bulkOt = document.getElementById('bulk-ot').value;

            loteMuestrasActuales.push({
              uid: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              name: name.trim(),
              analyses: [
                { name: "Viscosidad 100°C", unit: "cSt", normalMin: 12.5, normalMax: 16.3, warningMin: 11.5, warningMax: 17.5 },
                { name: "Humedad", unit: "%", normalMax: 0.01, warningMax: 0.01 }
              ],
              horometro: bulkHorometro,
              hrUltimoCambio: bulkHorometroCambio,
              fechaRec: bulkFecha,
              tipoMuestra: bulkTipo,
              ot: bulkOt,
              controlNumber: 0,
              isPreconfigured: false
            });

            recalcularConsecutivosLote();
            regenerarTablaBatchMuestras();
          }
        };
      }

      abrirModal('modal-add-sample');
    } catch (err) {
      alert("Error en prepararModalIngresoMuestras: " + (err.stack || err.message || err));
    }
  };

  const actualizarComponentesPreconfiguradosLote = (equipId) => {
    const alertModel = document.getElementById('modal-model-detected-alert');
    const chkContainer = document.getElementById('modal-preconfigured-checkboxes');
    chkContainer.innerHTML = '';
    loteMuestrasActuales = [];
    document.getElementById('modal-batch-samples-body').innerHTML = '';

    if (!equipId) {
      alertModel.textContent = 'Seleccione un equipo para ver los componentes preconfigurados.';
      return;
    }

    const modelName = obtenerModeloDeFlota(equipId);
    alertModel.innerHTML = `Modelo detectado para <strong>${equipId}</strong>: <span class="badge badge-info">${modelName || 'Desconocido'}</span>`;

    // Obtener todos los componentes asociados a este equipo en la flota
    const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    const fleetComponents = flota.filter(x => x.equipo === equipId).map(x => x.componente).filter(Boolean);
    
    // Obtener las configuraciones del modelo
    const configs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
    const modelConfig = configs.find(c => c.model === modelName);

    // Combinar componentes de la flota y de la configuración para mostrar todos los componentes posibles
    const allComponentNames = Array.from(new Set([
      ...fleetComponents,
      ...(modelConfig ? modelConfig.samples.map(s => s.name) : [])
    ])).sort();

    if (allComponentNames.length === 0) {
      chkContainer.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No hay componentes registrados en la flota ni configurados para el modelo.</div>`;
      return;
    }

    allComponentNames.forEach(compName => {
      // Buscar si tiene análisis configurados en el modelo
      let analyses = [];
      let isPreconfigured = false;
      
      if (modelConfig && modelConfig.samples) {
        const compConf = modelConfig.samples.find(s => s.name === compName);
        if (compConf && compConf.analyses) {
          analyses = compConf.analyses;
          isPreconfigured = true;
        }
      }
      
      // Si no tiene análisis configurados, usar análisis por defecto basados en el nombre
      if (analyses.length === 0) {
        const isHyd = compName.toLowerCase().includes('hyd') || compName.toLowerCase().includes('hidr');
        const isComp = compName.toLowerCase().includes('comp');
        
        let defaultVisc = { name: "Viscosidad 100°C", unit: "cSt", normalMin: 12.5, normalMax: 16.3, warningMin: 11.5, warningMax: 17.5 };
        if (isHyd) {
          defaultVisc = { name: "Viscosidad 40°C", unit: "cSt", normalMin: 61.2, normalMax: 74.8, warningMin: 55.0, warningMax: 80.0 };
        } else if (isComp) {
          defaultVisc = { name: "Viscosidad 40°C", unit: "cSt", normalMin: 41.4, normalMax: 50.6, warningMin: 38.0, warningMax: 54.0 };
        }
        
        analyses = [
          defaultVisc,
          { name: "Humedad", unit: "%", normalMax: 0.01, warningMax: 0.01 },
          { name: "Conteo de Partículas (ISO)", unit: "código", normalMax: 18, warningMax: 20 }
        ];
      }

      const label = document.createElement('label');
      label.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #fff; cursor: pointer; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--panel-border);';
      
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.value = compName;
      chk.style.cssText = 'width: 12px; height: 12px;';
      
      chk.onchange = (e) => {
        if (e.target.checked) {
          const bulkHorometro = document.getElementById('bulk-horometro').value;
          const bulkHorometroCambio = document.getElementById('bulk-horometro-cambio').value;
          const bulkFecha = document.getElementById('bulk-fecha-rec').value;
          const bulkTipo = document.getElementById('bulk-tipo-muestra').value;
          const bulkOt = document.getElementById('bulk-ot').value;

          loteMuestrasActuales.push({
            uid: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: compName,
            analyses: analyses,
            horometro: bulkHorometro,
            hrUltimoCambio: bulkHorometroCambio,
            fechaRec: bulkFecha,
            tipoMuestra: bulkTipo,
            ot: bulkOt,
            controlNumber: 0,
            isPreconfigured: isPreconfigured
          });
        } else {
          loteMuestrasActuales = loteMuestrasActuales.filter(x => x.name !== compName);
        }
        recalcularConsecutivosLote();
        regenerarTablaBatchMuestras();
      };

      label.appendChild(chk);
      label.appendChild(document.createTextNode(compName));
      chkContainer.appendChild(label);
    });
  };

  const obtenerModeloDeFlota = (equipId) => {
    const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    const match = flota.find(x => x.equipo === equipId);
    return match ? match.modelo : '';
  };

  const aplicarCambiosMasivosLote = () => {
    const h = document.getElementById('bulk-horometro').value;
    const hc = document.getElementById('bulk-horometro-cambio').value;
    const f = document.getElementById('bulk-fecha-rec').value;
    const t = document.getElementById('bulk-tipo-muestra').value;
    const ot = document.getElementById('bulk-ot').value;
    const cambioAceite = document.getElementById('bulk-cambio-aceite').value;

    loteMuestrasActuales.forEach(s => {
      s.horometro = h;
      s.hrUltimoCambio = hc;
      s.fechaRec = f;
      s.tipoMuestra = t;
      s.ot = ot;
      s.cambioAceite = cambioAceite;
    });

    regenerarTablaBatchMuestras();
  };

  const recalcularConsecutivosLote = () => {
    const baseVal = parseInt(document.getElementById('bulk-control-inicial').value);
    if (isNaN(baseVal)) return;

    loteMuestrasActuales.forEach((s, idx) => {
      s.controlNumber = baseVal + idx;
    });
  };

  const regenerarTablaBatchMuestras = () => {
    const tbody = document.getElementById('modal-batch-samples-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (loteMuestrasActuales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:1rem 0; font-style:italic;">No hay muestras seleccionadas.</td></tr>`;
      return;
    }

    loteMuestrasActuales.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace; font-weight:700; color:var(--primary);">${s.controlNumber}</td>
        <td>
          <input type="text" class="form-control item-name" value="${s.name}" style="height:24px; padding:2px 6px; font-size:0.75rem; color:var(--text-primary); background:var(--bg-secondary);">
        </td>
        <td>
          <input type="number" class="form-control item-horometro" value="${s.horometro || ''}" style="height:24px; padding:2px 6px; font-size:0.75rem; width:80px; color:var(--text-primary); background:var(--bg-secondary);">
        </td>
        <td>
          <input type="number" class="form-control item-horometro-cambio" value="${s.hrUltimoCambio || ''}" style="height:24px; padding:2px 6px; font-size:0.75rem; width:80px; color:var(--text-primary); background:var(--bg-secondary);">
        </td>
        <td>
          <input type="text" class="form-control item-ot" value="${s.ot || ''}" style="height:24px; padding:2px 6px; font-size:0.75rem; width:80px; color:var(--text-primary); background:var(--bg-secondary);">
        </td>
        <td>
          <select class="form-control item-cambio-aceite" style="height:24px; padding:2px 6px; font-size:0.75rem; width:85px; color:var(--text-primary); background:var(--bg-secondary);">
            <option value="NO INDICADO" ${s.cambioAceite === 'NO INDICADO' || !s.cambioAceite ? 'selected' : ''}>No Ind.</option>
            <option value="SI" ${s.cambioAceite === 'SI' ? 'selected' : ''}>SÍ</option>
            <option value="NO" ${s.cambioAceite === 'NO' ? 'selected' : ''}>NO</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-control item-tipo" value="${s.tipoMuestra || ''}" style="height:24px; padding:2px 6px; font-size:0.75rem; width:85px; color:var(--text-primary); background:var(--bg-secondary);">
        </td>
        <td style="text-align:center;">
          <div style="display:flex; gap:2px; justify-content:center;">
            <button type="button" class="btn btn-secondary btn-move-up" style="width:20px; height:20px; padding:0; display:inline-flex; align-items:center; justify-content:center; font-size: 0.6rem;" ${idx === 0 ? 'disabled' : ''}>⬆</button>
            <button type="button" class="btn btn-secondary btn-move-down" style="width:20px; height:20px; padding:0; display:inline-flex; align-items:center; justify-content:center; font-size: 0.6rem;" ${idx === loteMuestrasActuales.length - 1 ? 'disabled' : ''}>⬇</button>
          </div>
        </td>
        <td style="text-align:center;">
          <button type="button" class="btn btn-danger btn-remove-item" style="width:20px; height:20px; padding:0; display:inline-flex; align-items:center; justify-content:center; font-size: 0.8rem; font-weight: bold;">&times;</button>
        </td>
      `;

      tr.querySelector('.item-name').oninput = (e) => { s.name = e.target.value; };
      tr.querySelector('.item-horometro').oninput = (e) => { s.horometro = e.target.value; };
      tr.querySelector('.item-horometro-cambio').oninput = (e) => { s.hrUltimoCambio = e.target.value; };
      tr.querySelector('.item-ot').oninput = (e) => { s.ot = e.target.value; };
      tr.querySelector('.item-cambio-aceite').onchange = (e) => { s.cambioAceite = e.target.value; };
      tr.querySelector('.item-tipo').oninput = (e) => { s.tipoMuestra = e.target.value; };

      tr.querySelector('.btn-remove-item').onclick = () => {
        loteMuestrasActuales.splice(idx, 1);
        
        const chkContainer = document.getElementById('modal-preconfigured-checkboxes');
        const chks = chkContainer.querySelectorAll('input[type="checkbox"]');
        chks.forEach(c => {
          if (c.value === s.name) c.checked = false;
        });

        recalcularConsecutivosLote();
        regenerarTablaBatchMuestras();
      };

      tr.querySelector('.btn-move-up').onclick = () => {
        const temp = loteMuestrasActuales[idx];
        loteMuestrasActuales[idx] = loteMuestrasActuales[idx - 1];
        loteMuestrasActuales[idx - 1] = temp;
        recalcularConsecutivosLote();
        regenerarTablaBatchMuestras();
      };

      tr.querySelector('.btn-move-down').onclick = () => {
        const temp = loteMuestrasActuales[idx];
        loteMuestrasActuales[idx] = loteMuestrasActuales[idx + 1];
        loteMuestrasActuales[idx + 1] = temp;
        recalcularConsecutivosLote();
        regenerarTablaBatchMuestras();
      };

      tbody.appendChild(tr);
    });
  };


  // ==========================================
  // === MÓDULO GESTIÓN 3: ESTÁNDARES & QC =====
  // ==========================================
  let chartQC = null;


  window.evaluarReglasWestgard = (runs, mean, sd) => {
    if (!runs || runs.length === 0) return [];
    const violations = [];
    const r = runs[runs.length - 1];
    if (!r) return violations;
    const dev = (r.val - mean) / sd;
    
    if (Math.abs(dev) >= 3) {
      violations.push({ rule: 'Regla 1_3s (Rechazo)', desc: 'El último ensayo supera las ±3 Desviaciones Estándar.', action: 'Detener análisis y recalibrar equipo inmediatamente.' });
    }
    
    if (runs.length >= 2) {
      const prev = runs[runs.length - 2];
      const prevDev = (prev.val - mean) / sd;
      if ((dev >= 2 && prevDev >= 2) || (dev <= -2 && prevDev <= -2)) {
        violations.push({ rule: 'Regla 2_2s (Rechazo)', desc: 'Dos ensayos consecutivos superan ±2 SD del mismo lado.', action: 'Revisar estándares por posible error sistemático.' });
      }
      if (Math.abs(dev - prevDev) >= 4) {
        violations.push({ rule: 'Regla R_4s (Rechazo)', desc: 'La diferencia entre los dos últimos puntos es de 4 SD.', action: 'Revisar instrumento por error aleatorio alto.' });
      }
    }
    return violations;
  };

  const cargarSeccionQC = () => {

    const stds = JSON.parse(localStorage.getItem(STORAGE_KEYS.STANDARDS)) || [];
    const sel = document.getElementById('qc-select-standard');
    const last = sel.value;

    sel.innerHTML = '';
    stds.forEach(std => {
      const opt = document.createElement('option');
      opt.value = std.id;
      opt.textContent = `${std.name} (${std.parameter})`;
      sel.appendChild(opt);
    });

    if (last && stds.some(s => s.id === last)) sel.value = last;
    renderizarControlChartQC();
  };

  const renderizarControlChartQC = () => {
    const stdId = document.getElementById('qc-select-standard').value;
    if (!stdId) return;

    const stds = JSON.parse(localStorage.getItem(STORAGE_KEYS.STANDARDS)) || [];
    const runs = JSON.parse(localStorage.getItem(STORAGE_KEYS.QC_RUNS)) || [];
    const std = stds.find(s => s.id === stdId);
    if (!std) return;

    const stdRuns = runs.filter(r => r.stdId === stdId).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const n = stdRuns.length;
    let mean = std.nominal, sd = std.sd;

    if (n >= 2) {
      const sum = stdRuns.reduce((s,r)=>s+Number(r.val), 0);
      mean = sum / n;
      const sumSq = stdRuns.reduce((s,r)=>s+Math.pow(Number(r.val)-mean,2), 0);
      sd = Math.sqrt(sumSq / (n - 1)) || std.sd;
    }

    document.getElementById('qc-val-nominal').textContent = `${std.nominal.toFixed(2)} ${std.unit}`;
    document.getElementById('qc-val-mean').textContent = `${mean.toFixed(2)} ${std.unit}`;
    document.getElementById('qc-val-sd').textContent = `${sd.toFixed(2)} ${std.unit}`;

    const tbody = document.getElementById('qc-runs-history-body');
    tbody.innerHTML = '';
    [...stdRuns].reverse().forEach(r => {
      const dev = r.val - mean;
      const devSD = (dev/sd).toFixed(1);
      let cls = 'text-normal';
      if (Math.abs(devSD) >= 3) cls = 'text-critical';
      else if (Math.abs(devSD) >= 2) cls = 'text-caution';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(r.date).toLocaleDateString('es-ES')}</td>
        <td style="font-weight:700; color:var(--primary);">${r.val.toFixed(2)} ${std.unit}</td>
        <td class="${cls}">${dev >= 0 ? '+' : ''}${dev.toFixed(2)} (${devSD} SD)</td>
      `;
      tbody.appendChild(tr);
    });

    const violations = evaluarReglasWestgard(stdRuns, mean, sd);
    const card = document.getElementById('qc-status-card');
    const valSt = document.getElementById('qc-val-status');
    const box = document.getElementById('westgard-advisory-box');
    const tit = document.getElementById('westgard-status-title');
    const dsc = document.getElementById('westgard-status-desc');

    if (violations.length > 0) {
      card.className = 'glass-card kpi-card danger';
      valSt.textContent = 'Alerta Calibr.';
      box.className = 'westgard-alert-box';
      tit.textContent = violations[0].rule;
      dsc.innerHTML = `${violations[0].desc}<br><strong>Recomendación:</strong> ${violations[0].action}`;
    } else {
      card.className = 'glass-card kpi-card success';
      valSt.textContent = 'Estable';
      box.className = 'westgard-alert-box normal';
      tit.textContent = 'Calibración Estable';
      dsc.textContent = 'Cumple las reglas estadísticas de Westgard.';
    }

    const options = {
      series: [{ name: 'Valor', data: stdRuns.map(r => r.val.toFixed(2)) }],
      chart: { height: 350, type: 'line', background: 'transparent', toolbar: { show: false }, foreColor: '#475569' },
      colors: ['#002f6c'], // Azul Newmont
      stroke: { curve: 'straight', width: 3 },
      markers: { size: 5, colors: ['#ffb81c'] }, // Marcadores en Oro
      grid: { borderColor: '#e2e8f0' },
      xaxis: { categories: stdRuns.map((r,i) => `C${i+1}`), axisBorder:{show:false}, axisTicks:{show:false} },
      yaxis: { min: mean - 3.5 * sd, max: mean + 3.5 * sd, labels: { style: { colors: '#475569' } } },
      annotations: {
        yaxis: [
          { y: mean, borderColor: '#10b981', label: { style:{color:'#fff', background:'#10b981', fontWeight:'bold'}, text: `MEDIA: ${mean.toFixed(2)}` } },
          { y: mean + sd, borderColor: '#64748b', label: { text: '+1 SD' } },
          { y: mean - sd, borderColor: '#64748b', label: { text: '-1 SD' } },
          { y: mean + 2*sd, borderColor: '#f59e0b', label: { text: '+2 SD (Warning)' } },
          { y: mean - 2*sd, borderColor: '#f59e0b', label: { text: '-2 SD' } },
          { y: mean + 3*sd, borderColor: '#ef4444', label: { text: '+3 SD (Action)' } },
          { y: mean - 3*sd, borderColor: '#ef4444', label: { text: '-3 SD' } }
        ]
      },
      tooltip: { theme: 'light' }
    };

    if (chartQC) chartQC.destroy();
    chartQC = new ApexCharts(document.querySelector("#chart-qc-levey-jennings"), options);
    chartQC.render();
  };


  // ===============================================
  // === MÓDULO GESTIÓN 4: CONFIGURACIÓN FLOTA ====
  // ===============================================
  const cargarSeccionFlota = () => {
    const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    
    // Obtener los dropdowns de filtros
    const filterMarca = document.getElementById('filter-fleet-marca');
    const filterModelo = document.getElementById('filter-fleet-modelo');
    const filterEquipo = document.getElementById('filter-fleet-equipo');
    const filterLube = document.getElementById('filter-fleet-lube');
    
    const selMarca = filterMarca.value;
    const selModelo = filterModelo.value;
    const selEquipo = filterEquipo.value;
    const selLube = filterLube.value;
    
    // Obtener valores únicos ordenados para llenar los filtros
    const marcasUnicas = Array.from(new Set(flota.map(x => x.marca))).filter(Boolean).sort();
    const modelosUnicos = Array.from(new Set(flota.map(x => x.modelo))).filter(Boolean).sort();
    const equiposUnicos = Array.from(new Set(flota.map(x => x.equipo))).filter(Boolean).sort();
    const lubesUnicos = Array.from(new Set(flota.map(x => x.lubricante_utilizado))).filter(Boolean).sort();
    
    const actualizarDropdownFiltro = (dropdown, valores, valorSeleccionado) => {
      dropdown.innerHTML = '<option value="">Todas</option>';
      if (dropdown === filterModelo) dropdown.innerHTML = '<option value="">Todos</option>';
      else if (dropdown === filterEquipo) dropdown.innerHTML = '<option value="">Todos</option>';
      else if (dropdown === filterLube) dropdown.innerHTML = '<option value="">Todos</option>';
      
      valores.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        if (v === valorSeleccionado) opt.selected = true;
        dropdown.appendChild(opt);
      });
    };
    
    // Si no se han cargado los filtros aún, los inicializamos
    if (filterMarca.innerHTML === '' || filterMarca.innerHTML === '<option value="">Todas</option>') {
      actualizarDropdownFiltro(filterMarca, marcasUnicas, selMarca);
      actualizarDropdownFiltro(filterModelo, modelosUnicos, selModelo);
      actualizarDropdownFiltro(filterEquipo, equiposUnicos, selEquipo);
      actualizarDropdownFiltro(filterLube, lubesUnicos, selLube);
      
      // Enlazamos los eventos de cambio
      filterMarca.onchange = () => filtrarYRenderizarTablaFlota();
      filterModelo.onchange = () => filtrarYRenderizarTablaFlota();
      filterEquipo.onchange = () => filtrarYRenderizarTablaFlota();
      filterLube.onchange = () => filtrarYRenderizarTablaFlota();
      document.getElementById('filter-fleet-sap').oninput = () => filtrarYRenderizarTablaFlota();
    }
    
    filtrarYRenderizarTablaFlota();
    inicializarEventosUploadYTemplate();
  };

  const filtrarYRenderizarTablaFlota = () => {
    const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    
    const selMarca = document.getElementById('filter-fleet-marca').value;
    const selModelo = document.getElementById('filter-fleet-modelo').value;
    const selEquipo = document.getElementById('filter-fleet-equipo').value;
    const selLube = document.getElementById('filter-fleet-lube').value;
    const searchSap = document.getElementById('filter-fleet-sap').value.toLowerCase().trim();
    
    const tbody = document.getElementById('fleet-table-body');
    const emptyMsg = document.getElementById('fleet-empty-message');
    tbody.innerHTML = '';
    
    let count = 0;
    flota.forEach((row, globalIndex) => {
      // Filtrado
      if (selMarca && row.marca !== selMarca) return;
      if (selModelo && row.modelo !== selModelo) return;
      if (selEquipo && row.equipo !== selEquipo) return;
      if (selLube && row.lubricante_utilizado !== selLube) return;
      if (searchSap && !row.sap_location.toLowerCase().includes(searchSap)) return;
      
      count++;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center; font-weight: bold; color: var(--text-muted);">${count}</td>
        <td style="font-weight: bold; color: var(--primary);">${row.equipo}</td>
        <td>${row.nombre_equipo || (row.marca + ' ' + row.modelo)}</td>
        <td style="font-family: monospace; font-weight: 600; color: #d97706;">${row.sap_location}</td>
        <td>${row.componente}</td>
        <td style="font-family: monospace;">${row.grado_viscosidad}</td>
        <td style="color: var(--text-muted);">${row.lubricante_recomendado || '-'}</td>
        <td style="color: #10b981; font-weight: 500;">${row.lubricante_utilizado}</td>
        <td style="text-align: center; font-family: monospace;">${row.capacidad || ''}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${row.observaciones || ''}">${row.observaciones || ''}</td>
        <td style="text-align: center;">
          <input type="checkbox" class="chk-fleet-mayor" data-index="${globalIndex}" ${row.es_mayor ? 'checked' : ''} style="cursor: pointer; transform: scale(1.25);">
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    emptyMsg.style.display = count === 0 ? 'block' : 'none';
    
    // Escuchar cambios en los checkboxes de Componentes Mayores
    tbody.querySelectorAll('.chk-fleet-mayor').forEach(chk => {
      chk.addEventListener('change', () => {
        const idx = parseInt(chk.getAttribute('data-index'));
        const currentFlota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
        currentFlota[idx].es_mayor = chk.checked;
        localStorage.setItem(STORAGE_KEYS.FLOTA_DB, JSON.stringify(currentFlota));
        
        // Recalcular métricas en Inspección reactivamente si la consola está abierta
        recalcularYRenderizarMétricasInspección();
      });
    });
  };

  const inicializarEventosUploadYTemplate = () => {
    const btnTrigger = document.getElementById('btn-trigger-upload');
    const fileInput = document.getElementById('fleet-upload-input');
    const btnTemplate = document.getElementById('btn-export-template');
    
    // Evitamos duplicar los event listeners
    if (btnTrigger && !btnTrigger.dataset.bound) {
      btnTrigger.dataset.bound = "true";
      btnTrigger.onclick = () => fileInput.click();
      
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to Array of Arrays (AOA) to find the header row dynamically
            const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            let headerRowIdx = -1;
            for (let i = 0; i < aoa.length; i++) {
              const row = aoa[i];
              if (row && row.some(cell => {
                const val = String(cell || '').toLowerCase();
                return val.includes('código equipo') || val.includes('codigo equipo') || val.includes('nombre del equipo') || val.includes('ubicación técnica') || val.includes('ubicacion tecnica');
              })) {
                headerRowIdx = i;
                break;
              }
            }

            if (headerRowIdx === -1) {
              alert("No se encontró la fila de cabeceras en el archivo (buscando 'Código Equipo' o 'Nombre del Equipo').");
              return;
            }

            const headers = aoa[headerRowIdx].map(h => String(h || '').trim());
            const dataRows = aoa.slice(headerRowIdx + 1);
            
            if (dataRows.length === 0) {
              alert("El archivo cargado no contiene filas de datos.");
              return;
            }
            
            const nuevaFlota = [];
            dataRows.forEach((row) => {
              if (!row || row.length === 0) return;
              
              const getVal = (headerNames) => {
                for (let name of headerNames) {
                  const hIdx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
                  if (hIdx !== -1 && row[hIdx] !== undefined && row[hIdx] !== null) {
                    return row[hIdx];
                  }
                }
                return undefined;
              };

              const equipo = getVal(['Código Equipo', 'Código de Equipo', 'Codigo Equipo', 'EQUIPO', 'Equipo', 'UNIT']) || '';
              const nombre_equipo = getVal(['Nombre del Equipo', 'Nombre de Equipo', 'Nombre', 'EQUIPMENT NAME']) || '';
              const sap = getVal(['Ubicación Técnica', 'Ubicacion Tecnica', 'UBICACION SAP', 'Ubicación SAP', 'SAP', 'TECHNICAL LOCATION']) || '';
              const componenteRaw = getVal(['Componente', 'COMPONENTE', 'COMPONENT']) || '';
              const visc = getVal(['Viscosidad / Grado', 'Viscosidad/Grado', 'Viscosidad', 'Grado', 'GRADO / VISCOSIDAD', 'VISCOSIDAD / GRADO']) || '-';
              const lubeRec = getVal(['Lubricante / Fluido Recomendado (Fábrica)', 'Lubricante Recomendado (Fábrica)', 'Lubricante / Fluido Recomendado', 'Lubricante Recomendado', 'LUBRICANTE RECOMENDADO']) || '-';
              const lubeUtil = getVal(['Lubricante / Fluido Actual', 'Lubricante Actual', 'Lubricante Utilizado', 'LUBRICANTE UTILIZADO', 'LUBRICANTE / FLUIDO ACTUAL']) || '-';
              const cap = getVal(['Capacidad (L)', 'Capacidad(L)', 'Capacidad', 'CAPACIDAD (L)']) || '';
              const obs = getVal(['Observaciones', 'OBSERVACIONES', 'OBS']) || '';

              // Skip rows that don't have equipment code or component to prevent importing empty padding rows
              if (!String(equipo).trim() && !String(nombre_equipo).trim() && !String(componenteRaw).trim()) return;

              let componente = String(componenteRaw).trim();
              const compLower = componente.toLowerCase();
              const sapLower = String(sap).toLowerCase();
              if (compLower === 'differential' || compLower === 'diferencial') {
                if (sapLower.includes('axa1') || sapLower.includes('axle1') || sapLower.includes('ax1')) {
                  componente = 'Diferencial Delantero (Axle Assy;Position 1)';
                } else if (sapLower.includes('axa2') || sapLower.includes('axle2') || sapLower.includes('ax2')) {
                  componente = 'Diferencial Trasero (Axle Assy;Position 2)';
                }
              }

              const { marca, modelo } = parseNombreEquipo(nombre_equipo);
              
              nuevaFlota.push({
                id: `FLT-${String(nuevaFlota.length + 1).padStart(3,'0')}`,
                marca,
                modelo,
                equipo: String(equipo).trim(),
                nombre_equipo: String(nombre_equipo).trim(),
                componente: componente,
                sap_location: String(sap).trim(),
                grado_viscosidad: String(visc).trim(),
                lubricante_utilizado: String(lubeUtil).trim(),
                lubricante_recomendado: String(lubeRec).trim(),
                capacidad: cap,
                observaciones: String(obs).trim(),
                es_mayor: false
              });
            });
            
            if (nuevaFlota.length === 0) {
              alert("No se pudieron extraer componentes válidos del archivo.");
              return;
            }

            localStorage.setItem(STORAGE_KEYS.FLOTA_DB, JSON.stringify(nuevaFlota));
            fileInput.value = '';
            
            // Re-vincular filtros y actualizar selectores dinámicos
            document.getElementById('filter-fleet-marca').innerHTML = '<option value="">Todas</option>';
            actualizarSelectoresFlota();
            cargarSeccionFlota();
            
            alert(`Base de datos de flota recreada con éxito! Se cargaron ${nuevaFlota.length} componentes.`);
          } catch (err) {
            console.error(err);
            alert("Error al procesar el archivo Excel. Asegúrese de que tenga el formato y las columnas adecuadas.");
          }
        };
        reader.readAsBinaryString(file);
      };
    }
    
    if (btnTemplate && !btnTemplate.dataset.bound) {
      btnTemplate.dataset.bound = "true";
      btnTemplate.onclick = () => {
        const ws_data = [
          ["#", "Código Equipo", "Nombre del Equipo", "Ubicación Técnica", "Componente", "Viscosidad / Grado", "Lubricante / Fluido Recomendado (Fábrica)", "Lubricante / Fluido Actual", "Capacidad (L)", "Observaciones"],
          [1, "DI 08", "Drill Diamond;LM75", "3113-10-10-03-DRD1008BOOM-FEAS", "FEED ASSY", "#ND", "-", "Ningunos", "", "Cambio o/500 hs"],
          [2, "DI 08", "Drill Diamond;LM75", "3113-10-10-03-DRD1008HYSY", "HYDRAULIC SYS", "ISO VG 68 / 8,6 cSt", "", "Shell Tellus S2 M 68", "", ""],
          [3, "DI 08", "Drill Diamond;LM75", "3113-10-10-03-DRD1008WTSY-WTPU", "WATERPUMP", "SAE 30 / 10,9 cSt", "", "Shell Spirax S4 CX 30", "", "Filtro c/1000 hs"],
          [4, "DI 06 (PARKED)", "Longyear MDR700 Wheel Drill", "3113-10-10-03-DRW0006ASY-COMP", "COMPRESSOR", "ISO VG 46 / 8,9 cSt", "", "Shell Corena S3 R 46", 4.5, ""],
          [5, "DI 06 (PARKED)", "Longyear MDR700 Wheel Drill", "3113-10-10-03-DRW0006BOOM-DRSY", "DRILL SYS", "ISO VG 320 / 25 cSt", "", "Shell Omala S2 G 320", 4.5, ""]
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "Flota");
        XLSX.writeFile(wb, "plantilla_flota_jr_labs.xlsx");
      };
    }
  };


  // =======================================================
  // === MÓDULO GESTIÓN 5: FALLAS FUNCIONALES EN MINA =======
  // =======================================================
  const cargarSeccionFallasFuncionales = () => {
    const fFuncionales = JSON.parse(localStorage.getItem(STORAGE_KEYS.FALLAS_FUNCIONALES)) || [];
    const tbody = document.getElementById('functional-failures-table-body');
    tbody.innerHTML = '';
    
    if (fFuncionales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem 0;">No hay fallas funcionales en mina registradas.</td></tr>`;
      return;
    }

    [...fFuncionales].reverse().forEach(ff => {
      const eqName = obtenerNombreEquipo(ff.equipId);
      const hasPriorAlert = verificarAlertaPreviaFallaFuncional(ff.equipId, ff.component, ff.date);
      const alertBadge = hasPriorAlert 
        ? `<span class="badge badge-success">Sí (Predictiva Correcta)</span>`
        : `<span class="badge badge-danger">No (Falla No Detectada)</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: monospace;">${new Date(ff.date).toLocaleDateString('es-ES')}</td>
        <td style="font-weight:600; color:var(--primary);">${eqName}</td>
        <td>${ff.component}</td>
        <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${ff.obs}">${ff.obs}</td>
        <td>${alertBadge}</td>
      `;
      tbody.appendChild(tr);
    });
  };

  const verificarAlertaPreviaFallaFuncional = (equipId, component, failureDateStr) => {
    const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
    const failDate = new Date(failureDateStr);
    
    const matches = completadas.filter(s => {
      if (s.equipId !== equipId || s.component !== component) return false;
      const diffDays = (failDate.getTime() - new Date(s.entryTime || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 15 && (s.severity === 'Critical' || s.severity === 'Warning');
    });
    return matches.length > 0;
  };

  document.getElementById('form-add-functional-failure').addEventListener('submit', (e) => {
    e.preventDefault();
    const equipId = document.getElementById('ff-select-equip').value;
    const component = document.getElementById('ff-select-comp').value;
    const date = document.getElementById('ff-date').value;
    const obs = document.getElementById('ff-desc').value;

    const fFuncionales = JSON.parse(localStorage.getItem(STORAGE_KEYS.FALLAS_FUNCIONALES)) || [];
    fFuncionales.push({ id: `FF-${String(fFuncionales.length+1).padStart(3,'0')}`, equipId, component, date, obs });
    localStorage.setItem(STORAGE_KEYS.FALLAS_FUNCIONALES, JSON.stringify(fFuncionales));
    
    document.getElementById('form-add-functional-failure').reset();
    cargarSeccionFallasFuncionales();
    alert("Falla funcional mecánica registrada.");
  });


  // ========================================================
  // === CONSOLE 2: INSPECCIÓN - ESTADO MUESTRAS =============
  // ========================================================
  const cargarSeccionInspEstado = () => {
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];

    document.getElementById('insp-active-samples-count').textContent = `${activas.length} Activos`;

    const container = document.getElementById('insp-active-samples-flow-container');
    container.innerHTML = '';

    if (activas.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem 0; font-style:italic;">No hay lotes en curso en el laboratorio actualmente.</div>`;
    } else {
      activas.forEach(s => {
        const flowCard = document.createElement('div');
        flowCard.className = 'flow-batch-card';

        const etapas = ['En espera', 'En cola', 'En análisis', 'Reportando', 'Completado'];
        const currentIdx = etapas.indexOf(s.status);
        const eqName = obtenerNombreEquipo(s.equipId);
        const elapsedMin = (Math.floor((Date.now() - new Date(s.currentStageStart).getTime()) / 1000) / 60).toFixed(1);

        let timelineNodesHTML = '';
        etapas.slice(0, 4).forEach((et, idx) => {
          let cls = '';
          let timeInfo = '';
          let obsInfo = '';

          if (idx < currentIdx) {
            cls = 'completed';
            let dur = et === 'En espera' ? s.times.espera : (et === 'En cola' ? s.times.espera : s.times.analisis);
            timeInfo = `${(dur/60).toFixed(1)}m`;
            obsInfo = s.obs.length > 20 ? s.obs.slice(0,20)+'...' : s.obs;
          } else if (idx === currentIdx) {
            cls = 'active';
            timeInfo = `corriendo...`;
            obsInfo = `En curso por ${s.operator}`;
          }

          timelineNodesHTML += `
            <div class="timeline-stage-node ${cls}">
              <div class="timeline-stage-indicator">${idx + 1}</div>
              <div class="timeline-stage-name">${et}</div>
              <div class="timeline-stage-time">${timeInfo}</div>
              <div class="timeline-stage-obs" title="${obsInfo}">${obsInfo}</div>
            </div>
          `;
        });

        flowCard.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h4 style="font-family:var(--font-heading); font-size:1.15rem; color:var(--primary); font-weight:700; display:inline-block;">${s.id}</h4>
              <span class="badge badge-info" style="margin-left:8px; vertical-align:middle;">${s.status}</span>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                Equipo: <strong>${eqName}</strong> | Componente: <strong>${s.component}</strong> | Responsable: <strong>${s.operator}</strong>
              </p>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Etapa actual hace:</span>
              <span style="font-family:monospace; font-size:1.1rem; font-weight:700; color:#b45309;" id="insp-timer-${s.id}">${elapsedMin} min</span>
            </div>
          </div>
          <div class="timeline-stages-wrapper">
            <div class="timeline-line"></div>
            ${timelineNodesHTML}
          </div>
        `;
        container.appendChild(flowCard);
      });
    }

    const tbody = document.getElementById('insp-completed-samples-table-body');
    tbody.innerHTML = '';
    const batchAvgs = {};
    completadas.forEach(s => {
      const bId = s.batchId || s.id;
      if(!batchAvgs[bId]) {
        const b = completadas.filter(x => (x.batchId || x.id) === bId);
        const sum = b.reduce((acc, curr) => acc + curr.times.analisis + curr.times.reporte, 0);
        batchAvgs[bId] = (sum / b.length) / 60;
      }
    });

    [...completadas].reverse().forEach(s => {
      const tr = document.createElement('tr');
      const tot = (s.times.espera + s.times.analisis + s.times.reporte + s.times.repeticion + s.times.falla) / 60;
      const bId = s.batchId || s.id;
      const avgM = batchAvgs[bId] || 0;
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--primary);">${s.id}</td>
        <td>${new Date(s.entryTime || Date.now()).toLocaleString('es-ES', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
        <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${s.obs}">${s.obs}</td>
        <td><span class="badge ${s.missing && s.missing.toLowerCase()!=='ninguno'?'badge-warning':'badge-secondary'}">${s.missing || 'Ninguno'}</span></td>
        <td style="font-family:monospace; text-align:center;">${(s.times.espera/60).toFixed(1)}m</td>
        <td style="font-family:monospace; text-align:center;">${(s.times.analisis/60).toFixed(1)}m</td>
        <td style="font-family:monospace; text-align:center;">${(s.times.reporte/60).toFixed(1)}m</td>
        <td style="font-family:monospace; text-align:center; color:var(--warning);">${(s.times.repeticion/60).toFixed(0)}m</td>
        <td style="font-family:monospace; text-align:center; color:var(--danger);">${(s.times.falla/60).toFixed(0)}m</td>
        <td style="font-family:monospace; text-align:center; font-weight:700; color:var(--primary);">${tot.toFixed(1)} min</td>
        <td style="font-family:monospace; text-align:center; font-weight:700; color:#10b981;">${avgM.toFixed(1)} min</td>
      `;
      tbody.appendChild(tr);
    });
  };


  // ========================================================
  // === CONSOLE 2: INSPECCIÓN - KPIs & GRÁFICOS ============
  // ========================================================
  // ========================================================
  // === CONSOLE 2: INSPECCIÓN - KPIs & GRÁFICOS ============
  // ========================================================
  
  const actualizarKpiTiempoPorMuestra = () => {
    const logger = document.getElementById('kpi-debug-log');
    const log = (msg) => { if(logger) logger.value += msg + '\\n'; };
    if(logger) logger.value = ''; // clear
    log('Started actualizarKpiTiempoPorMuestra');

    try {
      const filterVal = document.getElementById('insp-kpi-time-filter').value;
      log('filterVal: ' + filterVal);
      const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
      log('completadas.length: ' + completadas.length);
      
      let filtered = [];
      
      if (filterVal === 'all') {
        filtered = completadas;
      } else if (filterVal === 'day') {
        const dayVal = document.getElementById('insp-kpi-date-from').value;
        log('dayVal: ' + dayVal);
        if (!dayVal) return log('Aborted: dayVal empty');
        const [yy, mm, dd] = dayVal.split('-');
        filtered = completadas.filter(s => {
          const sD = new Date(s.entryTime || Date.now());
          return sD.getFullYear() === parseInt(yy) && (sD.getMonth() + 1) === parseInt(mm) && sD.getDate() === parseInt(dd);
        });
      } else if (filterVal === 'range') {
        const fromVal = document.getElementById('insp-kpi-date-from').value;
        const toVal = document.getElementById('insp-kpi-date-to').value;
        log('fromVal: ' + fromVal + ', toVal: ' + toVal);
        if (!fromVal || !toVal) return log('Aborted: range empty');
        const dFrom = new Date(fromVal + 'T00:00:00');
        const dTo = new Date(toVal + 'T23:59:59');
        log('dFrom: ' + dFrom + ', dTo: ' + dTo);
        filtered = completadas.filter(s => {
          const sD = new Date(s.entryTime || Date.now());
          return sD >= dFrom && sD <= dTo;
        });
      } else if (filterVal === 'month') {
        const monthVal = document.getElementById('insp-kpi-month').value;
        log('monthVal: ' + monthVal);
        if (!monthVal) return log('Aborted: month empty');
        const [yy, mm] = monthVal.split('-');
        filtered = completadas.filter(s => {
          const sD = new Date(s.entryTime || Date.now());
          return sD.getFullYear() === parseInt(yy) && (sD.getMonth() + 1) === parseInt(mm);
        });
      } else if (filterVal === 'year') {
        const yearVal = document.getElementById('insp-kpi-year').value;
        log('yearVal: ' + yearVal);
        filtered = completadas.filter(s => new Date(s.entryTime || Date.now()).getFullYear() === parseInt(yearVal));
      }

      log('filtered.length: ' + filtered.length);

      const statusEl = document.getElementById('insp-kpi-avg-muestra-status');
      const valEl = document.getElementById('insp-kpi-avg-muestra-val');
      
      if(!window.inspRendimientoGauge) {
        log('init echarts');
        window.inspRendimientoGauge = echarts.init(document.getElementById('chart-insp-gauge-rendimiento'), 'dark');
      }

      if (filtered.length === 0) {
        log('No data');
        valEl.textContent = '-- min';
        statusEl.textContent = 'Sin datos';
        statusEl.style.color = 'var(--text-muted)';
        statusEl.style.backgroundColor = 'transparent';
        window.inspRendimientoGauge.setOption({ series: [{ data: [{ value: 0 }], itemStyle: { color: '#475569' } }] });
        if(window.inspTrendRendimiento) window.inspTrendRendimiento.clear();
        return;
      }

    // Group by batch
    const batchAvgs = [];
    const grouped = {};
    filtered.forEach(s => {
      const bId = s.batchId || s.id;
      if(!grouped[bId]) grouped[bId] = [];
      grouped[bId].push(s);
    });

    const trendDataByDay = {};

    Object.values(grouped).forEach(batch => {
      const sum = batch.reduce((acc, curr) => acc + curr.times.analisis + curr.times.reporte, 0);
      const avgMin = (sum / batch.length) / 60;
      batchAvgs.push(avgMin);

      // Extract date for trend
      const firstSampleDate = new Date(batch[0].entryTime);
      const dateStr = firstSampleDate.toISOString().split('T')[0];
      if (!trendDataByDay[dateStr]) trendDataByDay[dateStr] = [];
      trendDataByDay[dateStr].push(avgMin);
    });

    const overallAvg = batchAvgs.reduce((acc, val) => acc + val, 0) / batchAvgs.length;
    
    // Escala (1 analyst, Visc + Particulas + Agua + 30m Estufa -> target ~20 min / muestra)
    // <= 18 min: 100 pts
    // 19-25 min: 80 pts
    // 26-35 min: 60 pts
    // 36-45 min: 40 pts
    // > 45 min: 20 pts
    let score = 0;
    let color = '';
    let label = '';
    if (overallAvg <= 15) { score = 100; color = '#10b981'; label = 'Sobresaliente'; }
    else if (overallAvg <= 20) { score = 80; color = '#10b981'; label = 'Excelente'; }
    else if (overallAvg <= 30) { score = 60; color = '#eab308'; label = 'Bueno'; }
    else if (overallAvg <= 45) { score = 40; color = '#f97316'; label = 'Necesita Mejora'; }
    else { score = 20; color = '#ef4444'; label = 'Crítico'; }

    valEl.textContent = `${overallAvg.toFixed(1)} min`;
    statusEl.textContent = label;
    statusEl.style.color = color;
    statusEl.style.backgroundColor = color + '20';

    const option = {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          center: ['50%', '80%'],
          radius: '120%',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 5,
          itemStyle: {
            color: color,
            shadowColor: 'rgba(0,0,0,0.1)',
            shadowBlur: 5,
            shadowOffsetX: 1,
            shadowOffsetY: 1
          },
          progress: {
            show: true,
            roundCap: true,
            width: 22
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '15%',
            width: 16,
            offsetCenter: [0, '-50%'],
            itemStyle: { color: color }
          },
          axisLine: {
            roundCap: true,
            lineStyle: { width: 22, color: [[1, '#e2e8f0']] }
          },
          axisTick: { 
            show: true,
            splitNumber: 4,
            lineStyle: { color: '#94a3b8', width: 1 },
            length: 8
          },
          splitLine: { 
            show: true,
            length: 16,
            lineStyle: { color: '#64748b', width: 2 }
          },
          axisLabel: { 
            show: true,
            distance: -45,
            color: '#64748b',
            fontSize: 10,
            fontWeight: 'bold',
            formatter: function(val) {
              if (val === 100) return '100\n(S)';
              if (val === 80) return '80\n(E)';
              if (val === 60) return '60\n(B)';
              if (val === 40) return '40\n(NM)';
              if (val === 20) return '20\n(C)';
              if (val === 0) return '0';
              return '';
            }
          },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '-10%'],
            fontSize: 32,
            fontWeight: 'bolder',
            color: color,
            formatter: '{value} pts'
          },
          data: [{ value: score }]
        }
      ]
    };
    window.inspRendimientoGauge.setOption(option, true);

    // NUEVO: Gráfico de Tendencia
    if(!window.inspTrendRendimiento) {
      window.inspTrendRendimiento = echarts.init(document.getElementById('chart-insp-trend-rendimiento'), 'dark');
    }

    const sortedDates = Object.keys(trendDataByDay).sort((a, b) => new Date(a) - new Date(b));
    const trendLabels = [];
    const trendValues = [];

    let prevDate = null;
    let prevVal = null;

    sortedDates.forEach(date => {
      const vals = trendDataByDay[date];
      const avgForDay = vals.reduce((a,b) => a+b, 0) / vals.length;
      
      const d = new Date(date + 'T00:00:00');
      const labelStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
      
      let slope = null;
      if (prevDate !== null && prevVal !== null) {
        const daysDiff = (d - prevDate) / (1000 * 60 * 60 * 24);
        slope = (avgForDay - prevVal) / daysDiff;
      }

      trendLabels.push(labelStr);
      trendValues.push({
        value: parseFloat(avgForDay.toFixed(1)),
        slope: slope
      });
      
      prevDate = d;
      prevVal = avgForDay;
    });

    const trendOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const pt = params[0].data;
          const val = pt.value;
          const slope = pt.slope;
          let slopeText = '';
          if (slope !== null && slope !== undefined) {
             const sign = slope > 0 ? '+' : '';
             const color = slope > 0 ? '#ef4444' : '#10b981'; // Subir tiempo es malo (rojo), bajar es bueno (verde)
             slopeText = `<br/>Pendiente (variación): <span style="color:${color}; font-weight:bold;">${sign}${slope.toFixed(2)} min/día</span>`;
          } else {
             slopeText = `<br/>Pendiente (variación): --`;
          }
          return `${params[0].name}<br/>Promedio: <b>${val} min</b>${slopeText}`;
        }
      },
      grid: { left: '5%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: trendLabels,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        name: 'Minutos',
        nameTextStyle: { color: '#94a3b8' },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        axisLabel: { color: '#94a3b8' }
      },
      series: [
        {
          name: 'Promedio por Muestra',
          data: trendValues,
          type: 'line',
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' }
            ])
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#ef4444',
              type: 'solid',
              width: 2
            },
            label: {
              position: 'insideEndTop',
              formatter: 'Límite Crítico ({c} min)',
              color: '#ef4444',
              fontWeight: 'bold',
              distance: [0, 5]
            },
            data: [
              { yAxis: 5.21 }
            ]
          }
        }
      ]
    };

    window.inspTrendRendimiento.setOption(trendOption, true);
    } catch (err) {
      log('ERROR: ' + err.message + '\\n' + err.stack);
    }
  };


  const cargarSeccionInspKPIs = () => {
    const logger = document.getElementById('kpi-debug-log');
    if(logger) logger.value = 'Loaded cargarSeccionInspKPIs...\\n';
    
    try {
      recalcularYRenderizarMétricasInspección();
      if(logger) logger.value += 'Finished recalcularYRenderizarMétricasInspección\\n';
    } catch (e) {
      if(logger) logger.value += 'ERROR in recalcular: ' + e.message + '\\n';
    }
    
    // Inicializar el nuevo KPI de Tiempo Promedio
    const filterSel = document.getElementById('insp-kpi-time-filter');
    const dFrom = document.getElementById('insp-kpi-date-from');
    const dTo = document.getElementById('insp-kpi-date-to');
    const dSep = document.getElementById('insp-kpi-date-to-sep');
    const iMonth = document.getElementById('insp-kpi-month');
    const iYear = document.getElementById('insp-kpi-year');
    
    if(logger) logger.value += `Elements found: filterSel=${!!filterSel}, dFrom=${!!dFrom}, dTo=${!!dTo}, iMonth=${!!iMonth}\\n`;
    
    if (filterSel) {
      try {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7*24*60*60*1000);
        dTo.value = today.toISOString().split('T')[0];
        dFrom.value = lastWeek.toISOString().split('T')[0];
        iMonth.value = today.toISOString().slice(0, 7);
        if(logger) logger.value += 'Set dates successfully\\n';
      } catch (e) {
        if(logger) logger.value += 'ERROR setting dates: ' + e.message + '\\n';
      }
      
      const toggleInputs = () => {
        try {
          const v = filterSel.value;
          dFrom.style.display = (v === 'day' || v === 'range') ? 'inline-block' : 'none';
          dTo.style.display = v === 'range' ? 'inline-block' : 'none';
          dSep.style.display = v === 'range' ? 'inline-block' : 'none';
          iMonth.style.display = v === 'month' ? 'inline-block' : 'none';
          iYear.style.display = v === 'year' ? 'inline-block' : 'none';
          actualizarKpiTiempoPorMuestra();
        } catch (e) {
          console.error(e);
          const statusEl = document.getElementById('insp-kpi-avg-muestra-status');
          if (statusEl) statusEl.textContent = 'Error: ' + e.message;
        }
      };
      
      // Eliminar listeners previos para evitar duplicados si se llama varias veces
      filterSel.removeEventListener('change', toggleInputs);
      dFrom.removeEventListener('change', actualizarKpiTiempoPorMuestra);
      dTo.removeEventListener('change', actualizarKpiTiempoPorMuestra);
      iMonth.removeEventListener('change', actualizarKpiTiempoPorMuestra);
      iYear.removeEventListener('change', actualizarKpiTiempoPorMuestra);

      filterSel.addEventListener('change', toggleInputs);
      dFrom.addEventListener('change', actualizarKpiTiempoPorMuestra);
      dTo.addEventListener('change', actualizarKpiTiempoPorMuestra);
      iMonth.addEventListener('change', actualizarKpiTiempoPorMuestra);
      iYear.addEventListener('change', actualizarKpiTiempoPorMuestra);
      
      toggleInputs();
    }
  };

  const recalcularYRenderizarMétricasInspección = () => {
    const completadasRaw = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
    const flotaDb = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;
    const fallasLab = JSON.parse(localStorage.getItem(STORAGE_KEYS.FALLAS)) || [];
    const fFuncionalesRaw = JSON.parse(localStorage.getItem(STORAGE_KEYS.FALLAS_FUNCIONALES)) || [];
    const equiposLab = JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPOS)) || [];

    let muestrasCompletadas = [];
    let fFuncionales = [];

    if (filterComponentMode === 'Todos') {
      muestrasCompletadas = [...completadasRaw];
      fFuncionales = [...fFuncionalesRaw];
    } else {
      muestrasCompletadas = completadasRaw.filter(s => {
        const match = flotaDb.find(item => item.equipo === s.equipId && item.componente === s.component);
        return match ? match.es_mayor === true : false;
      });
      fFuncionales = fFuncionalesRaw.filter(ff => {
        const match = flotaDb.find(item => item.equipo === ff.equipId && item.componente === ff.component);
        return match ? match.es_mayor === true : false;
      });
    }

    const avgDispLab = equiposLab.reduce((sum, e) => sum + e.availability, 0) / equiposLab.length;
    document.getElementById('insp-kpi-disponibilidad').textContent = `${avgDispLab.toFixed(1)}%`;
    document.getElementById('insp-kpi-fallas').textContent = fallasLab.length;

    const totalRepeticionesSeg = muestrasCompletadas.reduce((sum, s) => sum + s.times.repeticion, 0);
    document.getElementById('insp-kpi-repeticiones').textContent = Math.round(totalRepeticionesSeg / 300);

    const avgAnalisisSeg = muestrasCompletadas.length > 0 
      ? (muestrasCompletadas.reduce((sum, s) => sum + s.times.analisis, 0) / muestrasCompletadas.length)
      : 0;
    document.getElementById('insp-kpi-avg-analisis').textContent = `${Math.round(avgAnalisisSeg / 60)} min`;

    const nCrit = muestrasCompletadas.filter(s => s.severity === 'Critical').length;
    const nWarn = muestrasCompletadas.filter(s => s.severity === 'Warning').length;
    const nNorm = muestrasCompletadas.filter(s => s.severity === 'Normal').length;

    document.getElementById('insp-severity-crit-count').textContent = nCrit;
    document.getElementById('insp-severity-warn-count').textContent = nWarn;
    document.getElementById('insp-severity-normal-count').textContent = nNorm;

    const drilldownContainer = document.getElementById('drilldown-severity-container');
    const drilldownTbody = document.getElementById('drilldown-table-body');
    const drilldownTitle = document.getElementById('drilldown-title');

    const toggleDrilldown = (severity) => {
      drilldownContainer.classList.remove('hidden');
      drilldownTitle.textContent = `Detalle de Muestras en Estado: ${severity === 'Critical' ? 'CRÍTICO' : 'ADVERTENCIA'}`;
      drilldownTbody.innerHTML = '';
      
      const filtered = muestrasCompletadas.filter(s => s.severity === severity);
      if (filtered.length === 0) {
        drilldownTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); font-style:italic;">No hay muestras registradas.</td></tr>`;
        return;
      }

      filtered.forEach(s => {
        const eqName = obtenerNombreEquipo(s.equipId);
        const tr = document.createElement('tr');
        
        const causas = [];
        const visc = s.simulatedValues.visc;
        const water = s.simulatedValues.water;
        const iso = s.simulatedValues.iso;
        const isoFirst = parseInt(iso.split('/')[0]) || 18;

        let limits = { vMinCrit: 12.0, vMaxCrit: 16.5, vMinWarn: 13.0, vMaxWarn: 15.5 };
        const compLower = String(s.component).toLowerCase();
        if (compLower.includes('hyd') || compLower.includes('hidr')) {
          limits = { vMinCrit: 55.0, vMaxCrit: 80.0, vMinWarn: 60.0, vMaxWarn: 75.0 };
        } else if (compLower.includes('water') || compLower.includes('bomba')) {
          limits = { vMinCrit: 24.0, vMaxCrit: 36.0, vMinWarn: 27.0, vMaxWarn: 33.0 };
        } else if (compLower.includes('comp')) {
          limits = { vMinCrit: 38.0, vMaxCrit: 52.0, vMinWarn: 41.0, vMaxWarn: 49.0 };
        } else if (compLower.includes('drill') || compLower.includes('omala')) {
          limits = { vMinCrit: 270.0, vMaxCrit: 370.0, vMinWarn: 290.0, vMaxWarn: 350.0 };
        }

        const isWaterCrit = (typeof water === 'number' && water > 0.01 && water < 1.0) ||
                            (typeof water === 'string' && water.includes('>'));
        if (severity === 'Critical') {
          if (visc <= limits.vMinCrit || visc >= limits.vMaxCrit) causas.push(`Viscosidad @ 100°C: ${visc} cSt (Límite: <${limits.vMinCrit} o >${limits.vMaxCrit})`);
          if (isWaterCrit) causas.push(`Humedad: ${typeof water === 'string' ? water.replace('.', ',') : water + '%'} (Límite: >0.01%)`);
          else if (typeof water === 'number' && water >= 1000) causas.push(`Humedad KF: ${water} ppm (Límite: >=1000 ppm)`);
          if (isoFirst >= 21) causas.push(`Código ISO 4406: ${iso} (Límite: >=21)`);
        } else {
          if ((visc <= limits.vMinWarn && visc > limits.vMinCrit) || (visc >= limits.vMaxWarn && visc < limits.vMaxCrit)) causas.push(`Viscosidad @ 100°C: ${visc} cSt (Límite advertencia)`);
          if (typeof water === 'number' && water >= 400 && water < 1000) causas.push(`Humedad KF: ${water} ppm (Límite advertencia)`);
          if (isoFirst >= 19 && isoFirst < 21) causas.push(`Código ISO 4406: ${iso} (Límite advertencia)`);
        }

        if (causas.length === 0) causas.push("Desviación analítica menor.");

        tr.innerHTML = `
          <td style="font-weight:700; color:var(--primary);">${s.id}</td>
          <td>${eqName}</td>
          <td>${s.component}</td>
          <td style="color:#b45309; font-size:0.85rem; line-height:1.4; font-weight:600;">${causas.join('<br>')}</td>
        `;
        drilldownTbody.appendChild(tr);
      });
    };

    document.getElementById('card-severity-critical').onclick = () => toggleDrilldown('Critical');
    document.getElementById('card-severity-warning').onclick = () => toggleDrilldown('Warning');
    document.getElementById('btn-close-drilldown').onclick = () => drilldownContainer.classList.add('hidden');

    const proyeccionAnual = Math.round((muestrasCompletadas.length / 14) * 365);
    document.getElementById('insp-kpi-proyeccion-anual').textContent = proyeccionAnual.toLocaleString('es-ES');

    renderizarGraficoKPIRecomendaciones(muestrasCompletadas);
    renderizarGraficoKPITarget2H(muestrasCompletadas);
    renderizarGraficoKPIAlertasPredictivas(fFuncionales, completadasRaw);
    renderizarGraficoDesgloseTiempos(muestrasCompletadas);
  };

  const renderizarGraficoKPIRecomendaciones = (muestras) => {
    const total = muestras.length;
    if (total === 0) {
      document.getElementById('chart-insp-recomendaciones').innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">Sin Datos</span>`;
      return;
    }
    const pct = Math.round((muestras.filter(s => s.severity !== 'Normal' && s.obs !== '').length / total) * 100);
    const options = {
      series: [pct],
      chart: { height: 180, type: 'radialBar' },
      plotOptions: {
        radialBar: {
          hollow: { size: '65%' },
          dataLabels: {
            name: { show: false },
            value: { offsetY: 6, fontSize: '24px', color: '#1e293b', formatter: (val) => `${val}%` } // color oscuro
          }
        }
      },
      colors: ['#002f6c'], // Azul Newmont
      stroke: { lineCap: 'round' }
    };
    if (chartRec) chartRec.destroy();
    chartRec = new ApexCharts(document.querySelector("#chart-insp-recomendaciones"), options);
    chartRec.render();
  };

  const renderizarGraficoKPITarget2H = (muestras) => {
    const total = muestras.length;
    if (total === 0) return;
    const cumplen = muestras.filter(s => (s.times.espera + s.times.analisis + s.times.reporte + s.times.repeticion + s.times.falla) <= 7200).length;
    const pct = Math.round((cumplen / total) * 100);
    const color = pct >= 95 ? '#10b981' : '#f59e0b';
    const options = {
      series: [pct],
      chart: { height: 200, type: 'radialBar' },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: { size: '65%' },
          dataLabels: {
            name: { show: true, color: '#64748b', fontSize: '11px', label: 'Meta: 95%', offsetY: -8 },
            value: { fontSize: '28px', color: '#1e293b', formatter: (val) => `${val}%`, offsetY: 12 }
          }
        }
      },
      colors: [color],
      stroke: { lineCap: 'round' },
      labels: ['Meta: 95%']
    };
    if (chartTarget) chartTarget.destroy();
    chartTarget = new ApexCharts(document.querySelector("#chart-insp-cumplimiento-2h"), options);
    chartTarget.render();
  };

  const renderizarGraficoDesgloseTiempos = (muestras) => {
    if (muestras.length === 0) return;
    const avgEsp = (muestras.reduce((sum, s) => sum + s.times.espera, 0) / muestras.length / 60);
    const avgAna = (muestras.reduce((sum, s) => sum + s.times.analisis, 0) / muestras.length / 60);
    const avgRep = (muestras.reduce((sum, s) => sum + s.times.reporte, 0) / muestras.length / 60);

    const options = {
      series: [
        { name: 'Espera / Cola', data: [Number(avgEsp.toFixed(1))] },
        { name: 'Análisis', data: [Number(avgAna.toFixed(1))] },
        { name: 'Reporte', data: [Number(avgRep.toFixed(1))] }
      ],
      chart: { type: 'bar', height: 160, stacked: true, background: 'transparent', toolbar: { show: false }, foreColor: '#475569' },
      plotOptions: { bar: { horizontal: true, barHeight: '40%', borderRadius: 8 } },
      stroke: { width: 1, colors: ['#ffffff'] },
      colors: ['#ffb81c', '#002f6c', '#8b5cf6'], // Newmont Gold y Navy
      xaxis: { categories: ['Minutos Promedio'], labels: { formatter: (val) => `${val} min` }, axisBorder: { show: false } },
      yaxis: { show: false },
      tooltip: { theme: 'light', y: { formatter: (val) => `${val} min` } },
      legend: { position: 'bottom', horizontalAlign: 'center', labels: { colors: '#475569' } }
    };
    if (chartBreakdown) chartBreakdown.destroy();
    chartBreakdown = new ApexCharts(document.querySelector("#chart-insp-desglose-tiempos"), options);
    chartBreakdown.render();
  };

  const renderizarGraficoKPIAlertasPredictivas = (fallasFuncionales, muestrasHistorial) => {
    const totalFallas = fallasFuncionales.length;
    if (totalFallas === 0) {
      renderizarAlertaPredictivaChartContainer(100);
      return;
    }
    let detectadas = 0;
    fallasFuncionales.forEach(ff => {
      const failDate = new Date(ff.date);
      const hasPriorAlert = muestrasHistorial.some(s => {
        if (s.equipId !== ff.equipId || s.component !== ff.component) return false;
        const diffDays = (failDate.getTime() - new Date(s.entryTime || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 15 && (s.severity === 'Critical' || s.severity === 'Warning');
      });
      if (hasPriorAlert) detectadas++;
    });
    renderizarAlertaPredictivaChartContainer(Math.round((detectadas / totalFallas) * 100));
  };

  const renderizarAlertaPredictivaChartContainer = (pct) => {
    const color = pct >= 85 ? '#10b981' : '#ef4444';
    const options = {
      series: [pct],
      chart: { height: 180, type: 'radialBar' },
      plotOptions: {
        radialBar: {
          hollow: { size: '65%' },
          dataLabels: {
            name: { show: true, color: '#64748b', fontSize: '11px', label: 'Meta: 85%', offsetY: -8 },
            value: { fontSize: '24px', color: '#1e293b', formatter: (val) => `${val}%`, offsetY: 10 }
          }
        }
      },
      colors: [color],
      stroke: { lineCap: 'round' },
      labels: ['Meta: 85%']
    };
    if (chartAlert) chartAlert.destroy();
    chartAlert = new ApexCharts(document.querySelector("#chart-insp-alertas-prefalla"), options);
    chartAlert.render();
  };

  // ========================================================
  // === MÓDULO 6: SOPORTE E INSTRUMENTOS PDF & ONLINE CHAT ==
  // ========================================================
  
  // Configuración de PDF.js
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Base de conocimiento integrada para simulación en línea
  const BASE_CONOCIMIENTO_ONLINE = {
    'ICP-101': {
      name: 'Espectrómetro ICP-OES Nicolet',
      manufacturer: 'Nicolet Instruments',
      model: 'ICP-OES 1000 Premium',
      calibration: 'Diaria / Semanal',
      maintenance: 'Semestral (6 meses)',
      range: '0.01 ppm - 5000 ppm',
      suggestions: [
        '¿Cómo resolver falla de encendido de plasma?',
        '¿Cómo solucionar obstrucción en el nebulizador?',
        '¿Por qué se descalibró ópticamente el ICP?',
        'Procedimiento de limpieza de la antorcha'
      ],
      answers: {
        'default': 'Para el Espectrómetro ICP-OES, el síntoma reportado requiere inspección del sistema de introducción de muestras (nebulizador, cámara de ciclón) o verificación de la estabilidad del flujo de gas argón (presión mínima de 80 psi). Asegúrese de que el extractor de gases esté encendido y que el agua de enfriamiento (chiller) esté a 18°C.',
        'plasma': 'Falla de Encendido de Plasma:\n1. Verifique la presión y flujo del gas Argón (debe ser grado 5.0, alta pureza).\n2. Confirme que la bobina de inducción de radiofrecuencia (RF) no presente depósitos ni carbonización.\n3. Asegúrese de que la puerta del compartimento de la antorcha esté completamente cerrada (los interruptores de seguridad interbloqueados bloquean el encendido si está abierta).\n4. Revise el flujo de refrigerante en el Chiller. Si el flujo es insuficiente, el interlock de seguridad se activará.',
        'nebulizador': 'Nebulizador Obstruido:\n1. Apague la bomba peristáltica y retire el capilar de teflón del nebulizador.\n2. Lave a contracorriente con ácido nítrico al 10% utilizando una herramienta de limpieza de nebulizadores o una jeringa de punta fina.\n3. NUNCA introduzca cables de metal en el nebulizador de cuarzo ya que puede astillarlo e inutilizarlo.\n4. Si la obstrucción persiste, sumerja el nebulizador en una solución de de detergente neutro en baño ultrasónico durante 15 minutos.',
        'óptica': 'Descalibración Óptica (Deriva de Señal):\n1. La deriva térmica es la causa principal de descalibración óptica. Permita que el instrumento se precaliente por 30-45 minutos antes de calibrar.\n2. Ejecute una alineación óptica del plasma (Mercury Lamp Alignment) usando la lámpara integrada de mercurio.\n3. Si la intensidad de emisión es baja, limpie la ventana de visualización axial o radial del plasma (suele acumular depósitos de sílice).\n4. Verifique la estabilidad de la bomba peristáltica; la variación en la velocidad de bombeo simula descalibración óptica.',
        'antorcha': 'Limpieza de Antorcha de Cuarzo:\n1. Desmonte la antorcha con cuidado usando guantes de nitrilo limpios.\n2. Sumerja la antorcha en ácido nítrico caliente al 10-20% durante toda la noche (no use ácidos más concentrados ni agua regia a menos que sea necesario).\n3. Enjuague abundantemente con agua desionizada de Tipo I y deje secar al aire en un ambiente libre de polvo antes de reinstalar.'
      }
    },
    'VISC-201': {
      name: 'Viscosímetro Automático Houillon',
      manufacturer: 'Houillon Instruments Inc.',
      model: 'H-201 Ultra-Fast',
      calibration: 'Mensual con Aceite Patrón',
      maintenance: 'Anual (12 meses)',
      range: '2 cSt - 2000 cSt a 40°C / 100°C',
      suggestions: [
        '¿Cómo limpiar un capilar térmico obstruido?',
        'Error de temperatura / Fluctuación del baño térmico',
        '¿Cómo realizar calibración mensual?',
        '¿Qué disolvente usar para la limpieza del capilar?'
      ],
      answers: {
        'default': 'Para el Viscosímetro Houillon, se aconseja verificar la integridad física del capilar de vidrio y la limpieza del solvente de lavado. Fluctuaciones menores en la temperatura del baño térmico (>0.1°C) invalidan la prueba analítica.',
        'obstruido': 'Capilar Obstruido o Atascado:\n1. Aspire a contracorriente utilizando la bomba de vacío interna y lave repetidamente con solvente de limpieza fuerte (tolueno o heptano).\n2. Si hay acumulación de resina de aceite oxidado, llene el capilar con solución limpiadora ácida (ácido crómico o sulfocrómico diluido) y déjelo reposar por 30 minutos.\n3. Enjuague con abundante acetona para eliminar residuos de agua y seque con aire filtrado.\n4. PRECAUCIÓN: No aplique presión mecánica excesiva con varillas ya que la pared de vidrio interna del capilar Houillon es extremadamente delgada.',
        'temperatura': 'Fluctuación en el Baño Térmico:\n1. Verifique que el nivel del aceite de silicona del baño esté al menos 2 cm por encima del sensor de temperatura y de la resistencia de calentamiento.\n2. Revise el funcionamiento del motor de agitación del baño; si gira lento o hace ruido, el calor no se distribuirá uniformemente, provocando deriva de temperatura.\n3. Confirme que la sonda de temperatura PT100 esté calibrada y firmemente sujeta.\n4. Si el baño sobrecalienta, limpie el relé de estado sólido del circuito de potencia, que puede haberse quedado pegado.',
        'calibración': 'Calibración Mensual del Viscosímetro:\n1. Seleccione un aceite patrón certificado (CRM) cuyo valor de viscosidad esté cerca del rango medio del capilar a calibrar.\n2. Realice un mínimo de 4 corridas del aceite patrón a la temperatura establecida (40°C o 100°C).\n3. Calcule el promedio de los tiempos de flujo y determine el nuevo Factor de Constante del Capilar (C) mediante la fórmula: C = Viscosidad Patrón / Tiempo Promedio.\n4. Actualice la constante C en el software del instrumento y verifique la calibración con un segundo patrón de control de calidad.',
        'disolvente': 'Disolvente de Lavado Recomendado:\n1. Para aceites de motor usados pesados, utilice una mezcla de heptano y tolueno (50/50) como disolvente primario.\n2. Para disolvente secundario (secado rápido), utilice Acetona pura grado analítico.\n3. Asegúrese de que el aire comprimido utilizado para el secado final esté completamente libre de humedad y aceite de compresor (use trampas coalescentes).'
      }
    },
    'FTIR-301': {
      name: 'Espectrómetro FTIR Nicolet',
      manufacturer: 'Thermo Nicolet',
      model: 'Nicolet iS5 FTIR',
      calibration: 'Mensual (Verificación Poliestireno)',
      maintenance: 'Anual / Bianual',
      range: '4000 cm⁻¹ - 400 cm⁻¹ (Espectro Medio)',
      suggestions: [
        'Humedad alta detectada en el divisor de haz',
        'Baja energía de la fuente infrarroja',
        '¿Cómo realizar la prueba de poliestireno?',
        'Limpieza del cristal ATR de Seleniuro de Zinc (ZnSe)'
      ],
      answers: {
        'default': 'Para el espectrómetro FTIR, el error reportado suele asociarse al desgaste de la fuente IR (lámpara EverGlo) o a la degradación del desecante interno. Los divisores de haz de KBr son altamente higroscópicos y se dañan de forma permanente con humedad relativa >40%.',
        'humedad': 'Humedad Alta en el Divisor de Haz:\n1. Reemplace los cartuchos desecantes internos de gel de sílice de inmediato. El indicador visual de humedad del software debe estar en verde.\n2. Si la humedad relativa de la sala supera el 50%, instale un deshumidificador externo.\n3. Los divisores de haz de KBr (Bromuro de Potasio) absorben humedad y se opacan, disminuyendo la transmisión óptica. Si el cristal está opaco, deberá ser pulido por servicio técnico o reemplazado.',
        'fuente': 'Baja Energía / Falla de Fuente IR:\n1. La fuente IR (lámpara infrarroja) tiene una vida útil de aprox. 2-3 años. Si el indicador de energía baja de 50%, planifique el reemplazo.\n2. Verifique la alineación del espejo colimador interno mediante la función "Auto-Align" en el menú de diagnóstico del software.\n3. Limpie los espejos planos externos del compartimento de muestra usando aire seco filtrado, nunca los toque con paños o solventes directos.',
        'poliestireno': 'Verificación Mensual con Poliestireno:\n1. Coloque el estándar de película de poliestireno certificado en el portamuestras del compartimento.\n2. Recoja un espectro de transmisión en el rango 4000 a 400 cm-1.\n3. Compare las posiciones de los picos de absorción clave (especialmente a 3060, 2849, 1601, 1028 y 906 cm-1). La desviación máxima permitida es de +/- 1 cm-1.\n4. Registre los valores en la carta de control QC para monitorear deriva espectral.',
        'atr': 'Limpieza del Cristal ATR (ZnSe / Diamante):\n1. Limpie suavemente el cristal después de cada análisis con una toallita de papel para lentes humedecida en heptano o alcohol isopropílico.\n2. No use solventes fuertemente clorados ni ácidos concentrados sobre cristales de ZnSe o Seleniuro de Zinc, ya que liberarán vapores tóxicos de seleniuro de hidrógeno.\n3. Para muestras muy adheridas, use una solución de detergente neutro y frote ligeramente con un hisopo de algodón.'
      }
    },
    'COUNT-401': {
      name: 'Contador de Partículas Láser',
      manufacturer: 'LubePart Inc.',
      model: 'LPC-400 Laser Counter',
      calibration: 'Semestral (ISO 11171)',
      maintenance: 'Semestral (6 meses)',
      range: 'Canales ISO 4µm, 6µm, 14µm, 21µm',
      suggestions: [
        'Error de coincidencia por concentración alta',
        'Presencia de microburbujas en el sensor óptico',
        '¿Cómo purgar o realizar retrolavado del capilar?',
        'Calibración con polvo de prueba ISO MTD'
      ],
      answers: {
        'default': 'Para el Contador de Partículas Láser, la saturación del sensor por alta concentración de hollín o partículas es común. Diluya la muestra con solvente limpio purgado (queroseno filtrado a 0.2 micras) para evitar lecturas de coincidencia erróneas.',
        'coincidencia': 'Error de Coincidencia (Concentración Alta):\n1. Si la muestra de aceite usado excede el límite del sensor (típicamente 10,000 partículas/ml), el rayo láser leerá múltiples partículas como una sola grande.\n2. Diluya la muestra en una proporción 10:1 o 100:1 usando un disolvente compatible (queroseno o tolueno) previamente súper-filtrado mediante membrana de 0.2 micras.\n3. Limpie la celda de flujo ejecutando un ciclo de enjuague de 2 minutos con disolvente limpio.',
        'burbujas': 'Microburbujas en Sensor Láser:\n1. Las burbujas de aire son leídas por el rayo láser como partículas sólidas grandes (falsos positivos en canales de 14 micras o más).\n2. Desgasifique la muestra en baño ultrasónico durante 5 minutos antes del análisis.\n3. Ajuste la cámara de presión del inyector a 5 bar para disolver cualquier burbuja remanente en el solvente durante el flujo analítico.',
        'purgar': 'Purgado e Historial de Lavado:\n1. Realice un enjuague del capilar después de cada muestra pesada usando disolvente de lavado libre de partículas.\n2. Si el fondo no baja de 10 partículas en total (canal de 4 micras), realice un retrolavado con una bomba manual conectada a la salida del capilar óptico.\n3. Remplace el capilar óptico si presenta rayaduras internas en las ventanas de visualización de zafiro.',
        'polvo': 'Calibración ISO 11171 (ISO MTD):\n1. Utilice la suspensión de polvo de calibración certificado ISO Medium Test Dust (ISO MTD) en aceite base súper limpio.\n2. Ajuste los voltajes de discriminación del convertidor analógico-digital para que coincidan con la curva de conteo de tamaño de partículas del estándar.\n3. La calibración del LPC debe ser realizada obligatoriamente cada 6 meses por personal certificado bajo norma ISO 11171.'
      }
    },
    'TITR-501': {
      name: 'Titulador Karl Fischer',
      manufacturer: 'Swiss Titration AG',
      model: 'KF Titrator KF-500',
      calibration: 'Semanal con Agua Estándar',
      maintenance: 'Anual (12 meses)',
      range: '10 ppm - 100% de Contenido de Agua',
      suggestions: [
        'Electrodo indicador polarizado (sin detección de punto final)',
        'Falla en la válvula de la bomba dosificadora (bureta)',
        '¿Cómo preparar o reemplazar el reactivo KF?',
        'Deriva de humedad basal alta'
      ],
      answers: {
        'default': 'Para el Titulador Karl Fischer, el síntoma indica fatiga en el reactivo (ánodo/cátodo agotados) o fuga de humedad ambiental en el tapón de la celda de titulación. Reemplace los tamices moleculares (molecular sieves) del tubo desecante.',
        'electrodo': 'Electrodo Polarizado (Punto Final No Detectado):\n1. Limpie el electrodo de doble platino sumergiéndolo en ácido nítrico de limpieza durante 1 minuto, o límpielo suavemente con una toallita humedecida en etanol.\n2. Revise el cable de conexión del electrodo a la placa principal; si hay falso contacto, el voltaje de lectura fluctuará.\n3. Si el electrodo está limpio y el punto final sigue sin detectarse, asegúrese de que el agitador magnético esté funcionando a una velocidad que no genere burbujas de aire bajo el electrodo.',
        'válvula': 'Falla de Bureta / Válvula Dosificadora:\n1. Los reactivos Karl Fischer cristalizan fácilmente y obstruyen las llaves de paso y las válvulas de pistón de la bureta.\n2. Desmonte la bureta de vidrio y las mangueras de teflón, y lávelas con abundante metanol seco.\n3. Lubrique ligeramente los sellos del pistón con grasa de silicona grado laboratorio.\n4. Si el pistón presenta rayaduras que permiten fugas de reactivo, reemplace la bureta dosificadora.',
        'reactivo': 'Reemplazo del Reactivo KF:\n1. Vacíe la celda de titulación y enjuáguela con metanol seco. Descarte los reactivos agotados según normas ambientales.\n2. Llene la celda con reactivo monocomponente o bicomponente fresco según la configuración.\n3. Acondicione la celda agregando pequeñas gotas de agua hasta lograr estabilidad basal.\n4. Realice una estandarización de la bureta usando el Estándar de Agua Certificado de 1.0 mg/g de H2O.',
        'deriva': 'Deriva basal alta (Consumo Constante de Reactivo):\n1. Una deriva >15 microlitros/min indica fuga de humedad externa hacia la celda.\n2. Verifique todos los tapones de silicona y septos; reemplácelos si están perforados por agujas.\n3. Reemplace el desecante (tamiz molecular de zeolita de 3 Ångstrom) del tubo de ventilación de la celda, el cual absorbe la humedad del aire que ingresa.'
      }
    }
  };

  let currentEquipId = null;

  const abrirSoporteEquipo = (equipId) => {
    currentEquipId = equipId;
    const info = BASE_CONOCIMIENTO_ONLINE[equipId] || {
      name: 'Equipo de Laboratorio',
      manufacturer: 'N/A',
      model: 'N/A',
      calibration: 'N/A',
      maintenance: 'N/A',
      range: 'N/A',
      suggestions: ['¿Cómo calibrar?', 'Guía de limpieza'],
      answers: { 'default': 'Consulte el manual para especificaciones detalladas.' }
    };

    // Actualizar Ficha Técnica en UI
    document.getElementById('support-modal-title').textContent = `Soporte Técnico: ${info.name}`;
    document.getElementById('tech-spec-name').textContent = info.name;
    document.getElementById('tech-spec-id').textContent = equipId;

    // Verificar si hay especificaciones personalizadas guardadas del PDF
    const customSpecs = JSON.parse(localStorage.getItem(`lubelab_specs_${equipId}`));
    if (customSpecs) {
      document.getElementById('tech-spec-manufacturer').textContent = customSpecs.manufacturer;
      document.getElementById('tech-spec-model').textContent = customSpecs.model;
      document.getElementById('tech-spec-calibration').textContent = customSpecs.calibration;
      document.getElementById('tech-spec-maintenance').textContent = customSpecs.maintenance;
      document.getElementById('tech-spec-range').textContent = customSpecs.range;
      
      const badge = document.getElementById('badge-manual-status');
      badge.textContent = 'Manual Cargado';
      badge.className = 'badge badge-success';
      document.getElementById('btn-delete-manual').disabled = false;
    } else {
      document.getElementById('tech-spec-manufacturer').textContent = info.manufacturer;
      document.getElementById('tech-spec-model').textContent = info.model;
      document.getElementById('tech-spec-calibration').textContent = info.calibration;
      document.getElementById('tech-spec-maintenance').textContent = info.maintenance;
      document.getElementById('tech-spec-range').textContent = info.range;

      const badge = document.getElementById('badge-manual-status');
      badge.textContent = 'Manual Semilla';
      badge.className = 'badge badge-info';
      document.getElementById('btn-delete-manual').disabled = true;
    }

    // Inicializar Chat Feed con saludo
    const feed = document.getElementById('support-chat-feed');
    feed.innerHTML = `
      <div class="chat-message bot" style="display: flex; gap: 10px; margin-bottom: 10px; align-self: flex-start; max-width: 85%;">
        <div style="background: var(--primary); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">
          <i data-lucide="bot" style="width: 16px; height: 16px;"></i>
        </div>
        <div class="glass-card" style="padding: 10px 14px; border-radius: 4px 16px 16px 16px; font-size: 0.82rem; line-height: 1.4; background: rgba(0, 47, 108, 0.05); color: #fff;">
          Hola, soy el asistente técnico de **${info.name}**. ¿En qué puedo ayudarle hoy? Describa el síntoma o el código de error y buscaré la solución en el manual o en la base de datos técnica en línea.
        </div>
      </div>
    `;

    // Renderizar sugerencias rápidas
    const sugContainer = document.getElementById('chat-suggestions-container');
    sugContainer.innerHTML = '';
    info.suggestions.forEach(sug => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.style.fontSize = '0.72rem';
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '20px';
      btn.textContent = sug;
      btn.onclick = () => {
        document.getElementById('support-chat-input').value = sug;
        document.getElementById('form-support-chat').dispatchEvent(new Event('submit'));
      };
      sugContainer.appendChild(btn);
    });

    abrirModal('modal-equip-support');
    lucide.createIcons();
  };

  const inicializarSoporteMódulo = () => {
    const fileInput = document.getElementById('pdf-manual-input');
    const dragArea = document.getElementById('pdf-drag-drop-area');
    const btnTrigger = document.getElementById('btn-trigger-pdf-upload');
    const formChat = document.getElementById('form-support-chat');
    const btnDelete = document.getElementById('btn-delete-manual');

    if (btnTrigger) {
      btnTrigger.onclick = (e) => {
        e.stopPropagation();
        fileInput.click();
      };
    }

    if (dragArea) {
      dragArea.onclick = () => fileInput.click();
      dragArea.ondragover = (e) => { e.preventDefault(); dragArea.style.borderColor = 'var(--success)'; };
      dragArea.ondragleave = () => { dragArea.style.borderColor = 'var(--primary)'; };
      dragArea.ondrop = (e) => {
        e.preventDefault();
        dragArea.style.borderColor = 'var(--primary)';
        if (e.dataTransfer.files.length > 0) {
          procesarArchivoPDF(e.dataTransfer.files[0]);
        }
      };
    }

    if (fileInput) {
      fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
          procesarArchivoPDF(e.target.files[0]);
        }
      };
    }

    if (btnDelete) {
      btnDelete.onclick = () => {
        if (!currentEquipId) return;
        localStorage.removeItem(`lubelab_manual_${currentEquipId}`);
        localStorage.removeItem(`lubelab_specs_${currentEquipId}`);
        alert("El manual de usuario ha sido eliminado del almacenamiento local.");
        abrirSoporteEquipo(currentEquipId); // Recargar vista
      };
    }

    const procesarArchivoPDF = (file) => {
      if (!currentEquipId || !file) return;
      if (file.type !== 'application/pdf') {
        alert("Por favor, suba únicamente archivos PDF.");
        return;
      }

      const statusContainer = document.getElementById('pdf-status-container');
      const statusText = document.getElementById('pdf-status-text');
      const progressBar = document.getElementById('pdf-progress-bar');
      const statusDot = document.getElementById('pdf-status-dot');

      statusContainer.classList.remove('hidden');
      statusText.textContent = "Leyendo archivo PDF...";
      progressBar.style.width = "15%";
      statusDot.style.backgroundColor = "var(--warning)";

      const reader = new FileReader();
      reader.onload = function(evt) {
        progressBar.style.width = "40%";
        statusText.textContent = "Extrayendo texto de páginas...";
        
        const typedarray = new Uint8Array(evt.target.result);
        
        pdfjsLib.getDocument({ data: typedarray }).promise.then(pdf => {
          progressBar.style.width = "60%";
          let maxPages = pdf.numPages;
          let countPromises = [];
          
          for (let j = 1; j <= maxPages; j++) {
            countPromises.push(pdf.getPage(j).then(page => {
              return page.getTextContent().then(textContent => {
                return textContent.items.map(item => item.str).join(' ');
              });
            }));
          }

          Promise.all(countPromises).then(pagesText => {
            progressBar.style.width = "85%";
            statusText.textContent = "Guardando en memoria local...";
            const fullText = pagesText.join('\n');
            
            // Guardar texto en LocalStorage
            try {
              localStorage.setItem(`lubelab_manual_${currentEquipId}`, fullText.substring(0, 200000)); // Límite de 200k caracteres por seguridad
            } catch(e) {
              console.warn("Límite de LocalStorage excedido, guardando versión recortada", e);
              localStorage.setItem(`lubelab_manual_${currentEquipId}`, fullText.substring(0, 100000));
            }

            // Intentar extraer especificaciones con expresiones sencillas
            const manufacturerMatch = fullText.match(/(?:Manufacturer|Fabricante|Brand|Company|Corporation):\s*([A-Za-z0-9\s\-]+)/i);
            const modelMatch = fullText.match(/(?:Model|Modelo|Type|Ref):\s*([A-Za-z0-9\s\-]+)/i);
            const rangeMatch = fullText.match(/(?:Range|Rango|Limit|Capacidad|Limits):\s*([A-Za-z0-9\s\-\.\/\u00B0\u00B5]+)/i);

            const info = BASE_CONOCIMIENTO_ONLINE[currentEquipId] || {};
            const specs = {
              manufacturer: manufacturerMatch ? manufacturerMatch[1].trim() : (info.manufacturer || 'N/A'),
              model: modelMatch ? modelMatch[1].trim() : (info.model || 'N/A'),
              calibration: info.calibration || 'Requerida',
              maintenance: info.maintenance || 'Anual',
              range: rangeMatch ? rangeMatch[1].trim() : (info.range || 'N/A')
            };

            // Guardar ficha
            localStorage.setItem(`lubelab_specs_${currentEquipId}`, JSON.stringify(specs));

            progressBar.style.width = "100%";
            statusText.textContent = "Extracción completa!";
            statusDot.style.backgroundColor = "var(--success)";

            setTimeout(() => {
              statusContainer.classList.add('hidden');
              abrirSoporteEquipo(currentEquipId); // Refrescar modal
            }, 1500);

          }).catch(err => {
            console.error("Error al extraer texto del PDF", err);
            statusText.textContent = "Error al extraer texto.";
            statusDot.style.backgroundColor = "var(--danger)";
          });

        }).catch(err => {
          console.error("Error al procesar el documento PDF", err);
          statusText.textContent = "Error de formato PDF.";
          statusDot.style.backgroundColor = "var(--danger)";
        });
      };

      reader.onerror = () => {
        statusText.textContent = "Error de lectura de archivo.";
        statusDot.style.backgroundColor = "var(--danger)";
      };

      reader.readAsArrayBuffer(file);
    };

    if (formChat) {
      formChat.onsubmit = (e) => {
        e.preventDefault();
        const inputEl = document.getElementById('support-chat-input');
        const query = inputEl.value.trim();
        if (!query) return;

        inputEl.value = '';
        
        // Agregar mensaje de usuario
        const feed = document.getElementById('support-chat-feed');
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-message user';
        userMsg.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-self: flex-end; max-width: 85%; flex-direction: row-reverse;';
        userMsg.innerHTML = `
          <div style="background: var(--purple); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">
            <i data-lucide="user" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="glass-card" style="padding: 10px 14px; border-radius: 16px 4px 16px 16px; font-size: 0.82rem; line-height: 1.4; background: rgba(139, 92, 246, 0.05); color: #fff; text-align: right;">
            ${query}
          </div>
        `;
        feed.appendChild(userMsg);
        feed.scrollTop = feed.scrollHeight;
        lucide.createIcons();

        // Respuesta simulada con retraso de 800ms
        setTimeout(() => {
          const manualText = localStorage.getItem(`lubelab_manual_${currentEquipId}`);
          let answerText = '';
          let sourceLabel = '';

          // Buscador semántico básico
          const buscarEnTexto = (texto, q) => {
            const queryLower = q.toLowerCase();
            const paragraphs = texto.split(/\n+/);
            const matches = [];
            for (let p of paragraphs) {
              if (p.trim().length > 30) {
                const pLower = p.toLowerCase();
                let score = 0;
                const words = queryLower.split(/\s+/).filter(w => w.length > 3);
                for (let w of words) {
                  if (pLower.includes(w)) score++;
                }
                if (score > 0) {
                  matches.push({ paragraph: p, score: score });
                }
              }
            }
            matches.sort((a, b) => b.score - a.score);
            return matches.length > 0 ? matches[0].paragraph : null;
          };

          if (manualText) {
            const match = buscarEnTexto(manualText, query);
            if (match) {
              sourceLabel = 'Cita del Manual PDF';
              answerText = `He encontrado información relevante en el manual cargado para resolver su consulta:<br><br>*"${match.trim()}"*<br><br>**Recomendación de soporte:** Realice los pasos descritos anteriormente. Asegúrese de desenergizar el equipo antes de desmontar capilares u ópticas.`;
            }
          }

          // Si no se encuentra en el manual o no hay manual, recurre a la base preprogramada "en línea"
          if (!answerText) {
            const info = BASE_CONOCIMIENTO_ONLINE[currentEquipId];
            const qLower = query.toLowerCase();
            let keyMatch = 'default';

            if (qLower.includes('plasma') || qLower.includes('encender') || qLower.includes('encendido')) keyMatch = 'plasma';
            else if (qLower.includes('nebulizador') || qLower.includes('obstruc') || qLower.includes('tapar') || qLower.includes('tapado')) keyMatch = 'nebulizador';
            else if (qLower.includes('óptica') || qLower.includes('optica') || qLower.includes('descalibracion') || qLower.includes('calibración') || qLower.includes('calibracion') || qLower.includes('deriva')) {
              keyMatch = info.answers['óptica'] ? 'óptica' : (info.answers['calibración'] ? 'calibración' : 'default');
            }
            else if (qLower.includes('antorcha') || qLower.includes('limpiar antorcha')) keyMatch = 'antorcha';
            else if (qLower.includes('capilar') || qLower.includes('obstruido') || qLower.includes('atasco') || qLower.includes('atascado')) keyMatch = 'obstruido';
            else if (qLower.includes('temperatura') || qLower.includes('baño') || qLower.includes('bano') || qLower.includes('calor')) keyMatch = 'temperatura';
            else if (qLower.includes('disolvente') || qLower.includes('solvente') || qLower.includes('lavar')) keyMatch = 'disolvente';
            else if (qLower.includes('humedad') || qLower.includes('divisor') || qLower.includes('haz') || qLower.includes('kbr')) keyMatch = 'humedad';
            else if (qLower.includes('fuente') || qLower.includes('energia') || qLower.includes('everglo')) keyMatch = 'fuente';
            else if (qLower.includes('poliestireno') || qLower.includes('verificacion') || qLower.includes('verificación')) keyMatch = 'poliestireno';
            else if (qLower.includes('atr') || qLower.includes('cristal') || qLower.includes('znse')) keyMatch = 'atr';
            else if (qLower.includes('coincidencia') || qLower.includes('concentración') || qLower.includes('hollin') || qLower.includes('hollín')) keyMatch = 'coincidencia';
            else if (qLower.includes('burbuja') || qLower.includes('burbujas') || qLower.includes('aire')) keyMatch = 'burbujas';
            else if (qLower.includes('purgar') || qLower.includes('retrolavado') || qLower.includes('lavado')) keyMatch = 'purgar';
            else if (qLower.includes('polvo') || qLower.includes('iso mtd')) keyMatch = 'polvo';
            else if (qLower.includes('electrodo') || qLower.includes('polarizado') || qLower.includes('platino')) keyMatch = 'electrodo';
            else if (qLower.includes('válvula') || qLower.includes('valvula') || qLower.includes('dosificadora') || qLower.includes('bureta')) keyMatch = 'válvula';
            else if (qLower.includes('reactivo') || qLower.includes('karl') || qLower.includes('fischer')) keyMatch = 'reactivo';
            else if (qLower.includes('deriva') || qLower.includes('basal') || qLower.includes('consumo')) keyMatch = 'deriva';

            const answer = info.answers[keyMatch] || info.answers['default'];
            
            if (manualText) {
              sourceLabel = 'Base de Datos de Soporte Online';
              answerText = `No encontré respuestas a su síntoma exacto en el manual PDF cargado. He buscado en línea para el modelo **${info.model}** y encontré la siguiente recomendación de soporte técnico:<br><br>${answer.replace(/\n/g, '<br>')}`;
            } else {
              sourceLabel = 'Base de Datos de Soporte Online';
              answerText = `No hay un manual de usuario PDF cargado en memoria para este instrumento. Realizando búsqueda técnica en línea de contingencia para el modelo **${info.model}**:<br><br>${answer.replace(/\n/g, '<br>')}`;
            }
          }

          const botMsg = document.createElement('div');
          botMsg.className = 'chat-message bot';
          botMsg.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-self: flex-start; max-width: 85%;';
          botMsg.innerHTML = `
            <div style="background: var(--primary); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">
              <i data-lucide="bot" style="width: 16px; height: 16px;"></i>
            </div>
            <div class="glass-card" style="padding: 10px 14px; border-radius: 4px 16px 16px 16px; font-size: 0.82rem; line-height: 1.4; background: rgba(0, 47, 108, 0.05); color: #fff;">
              <span class="badge badge-info" style="font-size: 0.6rem; padding: 2px 6px; margin-bottom: 6px; display: inline-block;">${sourceLabel}</span><br>
              ${answerText}
            </div>
          `;
          feed.appendChild(botMsg);
          feed.scrollTop = feed.scrollHeight;
          lucide.createIcons();
        }, 800);
      };
    }
  };

  inicializarSoporteMódulo();
  
  // === MÓDULO 7: ELIMINACIÓN Y CREACIÓN DE EQUIPOS DESDE PDF ===
  const eliminarEquipo = (equipId) => {
    const equipos = JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPOS)) || [];
    const fallas = JSON.parse(localStorage.getItem(STORAGE_KEYS.FALLAS)) || [];
    
    const nuevosEquipos = equipos.filter(e => e.id !== equipId);
    localStorage.setItem(STORAGE_KEYS.EQUIPOS, JSON.stringify(nuevosEquipos));
    
    const nuevasFallas = fallas.filter(f => f.equipId !== equipId);
    localStorage.setItem(STORAGE_KEYS.FALLAS, JSON.stringify(nuevasFallas));

    localStorage.removeItem(`lubelab_manual_${equipId}`);
    localStorage.removeItem(`lubelab_specs_${equipId}`);

    cargarSeccionEquipos();
  };

  const inicializarCreacionEquipoMódulo = () => {
    const btnShowCreate = document.getElementById('btn-show-add-equip-pdf');
    const fileInput = document.getElementById('create-pdf-manual-input');
    const dragArea = document.getElementById('create-pdf-drag-area');
    const btnTrigger = document.getElementById('btn-trigger-create-pdf-upload');
    const formCreate = document.getElementById('form-create-equip-pdf');

    let tempExtractedText = '';

    if (btnShowCreate) {
      btnShowCreate.onclick = () => {
        formCreate.reset();
        tempExtractedText = '';
        document.getElementById('create-pdf-status-container').classList.add('hidden');
        document.getElementById('create-pdf-progress-bar').style.width = '0%';
        abrirModal('modal-add-equip-pdf');
      };
    }

    if (btnTrigger) {
      btnTrigger.onclick = (e) => {
        e.stopPropagation();
        fileInput.click();
      };
    }

    if (dragArea) {
      dragArea.onclick = () => fileInput.click();
      dragArea.ondragover = (e) => { e.preventDefault(); dragArea.style.borderColor = 'var(--success)'; };
      dragArea.ondragleave = () => { dragArea.style.borderColor = 'var(--success)'; };
      dragArea.ondrop = (e) => {
        e.preventDefault();
        dragArea.style.borderColor = 'var(--success)';
        if (e.dataTransfer.files.length > 0) {
          procesarArchivoPDFCrear(e.dataTransfer.files[0]);
        }
      };
    }

    if (fileInput) {
      fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
          procesarArchivoPDFCrear(e.target.files[0]);
        }
      };
    }

    const procesarArchivoPDFCrear = (file) => {
      if (!file) return;
      if (file.type !== 'application/pdf') {
        alert("Por favor, suba únicamente archivos PDF.");
        return;
      }

      const statusContainer = document.getElementById('create-pdf-status-container');
      const statusText = document.getElementById('create-pdf-status-text');
      const progressBar = document.getElementById('create-pdf-progress-bar');
      const statusDot = document.getElementById('create-pdf-status-dot');

      statusContainer.classList.remove('hidden');
      statusText.textContent = "Leyendo archivo PDF...";
      progressBar.style.width = "15%";
      statusDot.style.backgroundColor = "var(--warning)";

      const reader = new FileReader();
      reader.onload = function(evt) {
        progressBar.style.width = "40%";
        statusText.textContent = "Extrayendo texto...";
        
        const typedarray = new Uint8Array(evt.target.result);
        
        pdfjsLib.getDocument({ data: typedarray }).promise.then(pdf => {
          progressBar.style.width = "60%";
          let maxPages = pdf.numPages;
          let countPromises = [];
          
          for (let j = 1; j <= maxPages; j++) {
            countPromises.push(pdf.getPage(j).then(page => {
              return page.getTextContent().then(textContent => {
                return textContent.items.map(item => item.str).join(' ');
              });
            }));
          }

          Promise.all(countPromises).then(pagesText => {
            progressBar.style.width = "85%";
            statusText.textContent = "Analizando especificaciones...";
            tempExtractedText = pagesText.join('\n');
            
            const nameMatch = tempExtractedText.match(/(?:Equipment|Instrument|Device|Equipo|Instrumento):\s*([A-Za-z0-9\s\-]+)/i);
            const manufacturerMatch = tempExtractedText.match(/(?:Manufacturer|Fabricante|Brand|Company|Corporation):\s*([A-Za-z0-9\s\-]+)/i);
            const modelMatch = tempExtractedText.match(/(?:Model|Modelo|Type|Ref):\s*([A-Za-z0-9\s\-]+)/i);
            const rangeMatch = tempExtractedText.match(/(?:Range|Rango|Limit|Capacidad|Limits):\s*([A-Za-z0-9\s\-\.\/\u00B0\u00B5]+)/i);

            let inferredName = nameMatch ? nameMatch[1].trim() : '';
            if (!inferredName) {
              inferredName = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ");
            }

            document.getElementById('create-equip-name').value = inferredName;
            document.getElementById('create-equip-manufacturer').value = manufacturerMatch ? manufacturerMatch[1].trim() : "Genérico";
            document.getElementById('create-equip-model').value = modelMatch ? modelMatch[1].trim() : "N/A";
            document.getElementById('create-equip-range').value = rangeMatch ? rangeMatch[1].trim() : "Estándar";

            progressBar.style.width = "100%";
            statusText.textContent = "Extracción de manual lista!";
            statusDot.style.backgroundColor = "var(--success)";

            setTimeout(() => {
              statusContainer.classList.add('hidden');
            }, 1500);

          }).catch(err => {
            console.error("Error al extraer texto del PDF", err);
            statusText.textContent = "Error al extraer texto.";
            statusDot.style.backgroundColor = "var(--danger)";
          });

        }).catch(err => {
          console.error("Error al procesar el documento PDF", err);
          statusText.textContent = "Error de formato PDF.";
          statusDot.style.backgroundColor = "var(--danger)";
        });
      };

      reader.onerror = () => {
        statusText.textContent = "Error de lectura de archivo.";
        statusDot.style.backgroundColor = "var(--danger)";
      };

      reader.readAsArrayBuffer(file);
    };

    if (formCreate) {
      formCreate.onsubmit = (e) => {
        e.preventDefault();
        
        const name = document.getElementById('create-equip-name').value.trim();
        const manufacturer = document.getElementById('create-equip-manufacturer').value.trim();
        const model = document.getElementById('create-equip-model').value.trim();
        const location = document.getElementById('create-equip-location').value;
        const range = document.getElementById('create-equip-range').value.trim();
        const calibration = document.getElementById('create-equip-calibration').value.trim();
        const maintenance = document.getElementById('create-equip-maintenance').value.trim();

        if (!name) return;

        const newId = `EQ-${Date.now().toString().slice(-6)}`;
        const equipos = JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPOS)) || [];
        
        const nuevoEquipo = {
          id: newId,
          name: name,
          location: location,
          status: 'Available',
          mttr: 0,
          mtbf: 720,
          availability: 100
        };
        
        equipos.push(nuevoEquipo);
        localStorage.setItem(STORAGE_KEYS.EQUIPOS, JSON.stringify(equipos));

        if (tempExtractedText) {
          try {
            localStorage.setItem(`lubelab_manual_${newId}`, tempExtractedText.substring(0, 200000));
          } catch(err) {
            console.warn("Límite de LocalStorage excedido, guardando versión recortada", err);
            localStorage.setItem(`lubelab_manual_${newId}`, tempExtractedText.substring(0, 100000));
          }
        }

        const specs = {
          manufacturer: manufacturer,
          model: model,
          calibration: calibration,
          maintenance: maintenance,
          range: range
        };
        localStorage.setItem(`lubelab_specs_${newId}`, JSON.stringify(specs));

        cerrarModal('modal-add-equip-pdf');
        cargarSeccionEquipos();
      };
    }
  };

  inicializarCreacionEquipoMódulo();

  // === REGISTRO Y ADMIN DE USUARIOS (ADMINISTRADOR) ===
  const cargarSeccionAdminUsuarios = () => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || SEMILLA_USUARIOS;
    const tbody = document.getElementById('admin-users-table-body');
    tbody.innerHTML = '';
    
    users.forEach(u => {
      const tr = document.createElement('tr');
      
      const deleteBtnHTML = u.username === 'admin' 
        ? `<span class="badge badge-secondary" style="font-size:0.7rem;">Sistema</span>`
        : `<button class="btn btn-danger btn-sm btn-delete-user" data-username="${u.username}" style="padding: 4px 8px;">
             <i data-lucide="trash-2" style="width:12px; height:12px;"></i> Borrar
           </button>`;
           
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--primary);">${u.username}</td>
        <td style="font-family: monospace;">${u.password}</td>
        <td><span class="badge ${u.role === 'Administrador' ? 'badge-success' : (u.role === 'Analista' ? 'badge-info' : (u.role === 'Inspector' ? 'badge-purple' : 'badge-warning'))}">${u.role}</span></td>
        <td style="text-align: center;">${deleteBtnHTML}</td>
      `;
      
      if (u.username !== 'admin') {
        tr.querySelector('.btn-delete-user').addEventListener('click', () => {
          if (confirm(`¿Está seguro de que desea eliminar al usuario "${u.username}"?`)) {
            const nuevosUsuarios = users.filter(usr => usr.username !== u.username);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nuevosUsuarios));
            cargarSeccionAdminUsuarios();
          }
        });
      }
      
      tbody.appendChild(tr);
    });
    
    lucide.createIcons();
  };
  
  const formAddUser = document.getElementById('form-admin-add-user');
  if (formAddUser) {
    formAddUser.onsubmit = (e) => {
      e.preventDefault();
      const usernameEl = document.getElementById('admin-new-username');
      const passwordEl = document.getElementById('admin-new-password');
      const roleEl = document.getElementById('admin-new-role');
      
      const username = usernameEl.value.trim().toLowerCase();
      const password = passwordEl.value.trim();
      const role = roleEl.value;
      
      if (!username || !password) return;
      
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || SEMILLA_USUARIOS;
      
      if (users.some(u => u.username.toLowerCase() === username)) {
        alert("El nombre de usuario ya está registrado.");
        return;
      }
      
      users.push({ username, password, role, mustChangePassword: true });
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      usernameEl.value = '';
      passwordEl.value = '';
      
      cargarSeccionAdminUsuarios();
    };
  }
  
  const btnGenPass = document.getElementById('btn-admin-gen-pass');
  if (btnGenPass) {
    btnGenPass.onclick = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let pass = '';
      for (let i = 0; i < 8; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      document.getElementById('admin-new-password').value = pass;
    };
  }

  // === VISTA DE LOTES DEL VISOR ===
  const cargarSeccionVisorLotes = (isAutoRefresh = false) => {
    const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
    const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];

    const activeBatches = {};
    activas.forEach(s => {
      const bId = s.batchId || s.id;
      if (!activeBatches[bId]) activeBatches[bId] = [];
      activeBatches[bId].push(s);
    });

    const uniqueBatchIds = Object.keys(activeBatches);
    
    // Only update counts if not auto-refreshing or if elements exist
    const countEl = document.getElementById('visor-active-samples-count');
    if(countEl) countEl.textContent = `${uniqueBatchIds.length} Lotes Activos`;

    const container = document.getElementById('visor-active-samples-flow-container');
    if (!container) return;
    
    // Prevent complete redraw if it's auto refresh and no structural changes
    // A better approach is just to redraw it cleanly
    container.innerHTML = '';

    if (uniqueBatchIds.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem 0; font-style:italic;">No hay lotes en curso en el laboratorio actualmente.</div>`;
    } else {
      uniqueBatchIds.forEach(bId => {
        const batchSamples = activeBatches[bId];
        const rep = batchSamples[0]; // Representative sample
        
        const flowCard = document.createElement('div');
        flowCard.className = 'flow-batch-card';

        const etapas = ['En espera', 'En cola', 'En análisis', 'Reportando', 'Completado'];
        const currentIdx = etapas.indexOf(rep.status);
        const eqName = rep.equipId ? obtenerNombreEquipo(rep.equipId) : 'Varios Equipos';
        const elapsedSec = Math.floor((Date.now() - new Date(rep.currentStageStart).getTime()) / 1000);
        const m = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const sc = String(elapsedSec % 60).padStart(2, '0');

        let timelineNodesHTML = '';
        etapas.slice(0, 4).forEach((et, idx) => {
          let cls = '';
          let timeInfo = '';
          let obsInfo = '';

          if (idx < currentIdx) {
            cls = 'completed';
            let dur = et === 'En espera' ? (rep.times && rep.times.espera ? rep.times.espera : 0) : (et === 'En cola' ? (rep.times && rep.times.espera ? rep.times.espera : 0) : (rep.times && rep.times.analisis ? rep.times.analisis : 0));
            timeInfo = `${(dur/60).toFixed(1)}m`;
            obsInfo = rep.obs && rep.obs.length > 20 ? rep.obs.slice(0,20)+'...' : (rep.obs || 'OK');
          } else if (idx === currentIdx) {
            cls = 'active';
            timeInfo = `corriendo...`;
            obsInfo = `En curso por ${rep.operator}`;
          }

          timelineNodesHTML += `
            <div class="timeline-stage-node ${cls}">
              <div class="timeline-stage-indicator">${idx + 1}</div>
              <div class="timeline-stage-name">${et}</div>
              <div class="timeline-stage-time">${timeInfo}</div>
              <div class="timeline-stage-obs" title="${obsInfo}">${obsInfo}</div>
            </div>
          `;
        });

        flowCard.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h4 style="font-family:var(--font-heading); font-size:1.1rem; color:var(--primary); font-weight:700;">Lote: ${bId}</h4>
              <span style="font-size:0.7rem; color:var(--text-muted); display:block; margin-top:2px;">${eqName} (${batchSamples.length} muestras)</span>
              <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Resp: ${rep.operator}</span>
              <p style="font-size:0.78rem; color:var(--text-primary); margin-top:6px; margin-bottom:8px;"><strong>Obs:</strong> ${rep.obs}</p>
            </div>
            <div style="text-align:right;">
              <span class="badge badge-info" style="margin-bottom:8px; display:inline-block;">${rep.status}</span>
              <span style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:4px;">Etapa actual hace:</span>
              <span style="font-family:monospace; font-size:1.2rem; font-weight:700; color:#b45309; margin-left:auto;" id="visor-timer-${bId}">${m}:${sc}</span>
            </div>
          </div>
          <div class="timeline-stages-wrapper">
            <div class="timeline-line"></div>
            ${timelineNodesHTML}
          </div>
        `;
        container.appendChild(flowCard);
      });
    }

    const tbody = document.getElementById('visor-completed-samples-table-body');
    tbody.innerHTML = '';
    
    const batches = {};
    completadas.forEach(s => {
      const bId = s.batchId || s.id;
      if (!batches[bId]) batches[bId] = [];
      batches[bId].push(s);
    });

    Object.values(batches).reverse().forEach(b => {
      const tr = document.createElement('tr');
      const first = b[0];
      
      const totalEspera = b.reduce((acc, s) => acc + (s.times && s.times.espera ? s.times.espera : 0), 0);
      const totalAnalisis = b.reduce((acc, s) => acc + (s.times && s.times.analisis ? s.times.analisis : 0), 0);
      const totalReporte = b.reduce((acc, s) => acc + (s.times && s.times.reporte ? s.times.reporte : 0), 0);
      const totalRepeticion = b.reduce((acc, s) => acc + (s.times && s.times.repeticion ? s.times.repeticion : 0), 0);
      const totalFalla = b.reduce((acc, s) => acc + (s.times && s.times.falla ? s.times.falla : 0), 0);
      
      const tot = (totalEspera + totalAnalisis + totalReporte + totalRepeticion + totalFalla) / 60;
      const avgM = ((totalAnalisis + totalReporte) / b.length) / 60;
      
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--primary);">${first.batchId || first.id}</td>
        <td style="text-align:center;"><strong>${b.length}</strong></td>
        <td>${new Date(first.entryTime || Date.now()).toLocaleString('es-ES', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
        <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${first.obs}">${first.obs}</td>
        <td><span class="badge ${first.missing && first.missing.toLowerCase()!=='ninguno'?'badge-warning':'badge-secondary'}">${first.missing || 'Ninguno'}</span></td>
        <td style="font-family:monospace; text-align:center;">${(totalEspera/60).toFixed(1)}m</td>
        <td style="font-family:monospace; text-align:center;">${(totalAnalisis/60).toFixed(1)}m</td>
        <td style="font-family:monospace; text-align:center;">${(totalReporte/60).toFixed(1)}m</td>
        <td style="font-family:monospace; text-align:center; color:var(--warning);">${(totalRepeticion/60).toFixed(0)}m</td>
        <td style="font-family:monospace; text-align:center; color:var(--danger);">${(totalFalla/60).toFixed(0)}m</td>
        <td style="font-family:monospace; text-align:center; font-weight:700; color:var(--primary);">${tot.toFixed(1)} min</td>
        <td style="font-family:monospace; text-align:center; font-weight:700; color:#10b981;">${avgM.toFixed(1)} min</td>
      `;
      tbody.appendChild(tr);
    });
  };

  // === VISTA DE INFORMES DEL VISOR ===
  const cargarSeccionVisorInformes = (filterQuery = '') => {
    const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
    const tbody = document.getElementById('visor-informes-table-body');
    tbody.innerHTML = '';
    
    let filtered = completadas;
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      filtered = completadas.filter(s => {
        const eqName = obtenerNombreEquipo(s.equipId).toLowerCase();
        return s.id.toLowerCase().includes(q) || 
               eqName.includes(q) || 
               s.component.toLowerCase().includes(q) || 
               s.operator.toLowerCase().includes(q);
      });
    }
    
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem 0; font-style:italic;">No se encontraron informes validados.</td></tr>`;
      return;
    }
    
    [...filtered].reverse().forEach(s => {
      const tr = document.createElement('tr');
      const eqName = obtenerNombreEquipo(s.equipId);
      
      let badgeClass = s.severity === 'Critical' ? 'badge-danger' : (s.severity === 'Warning' ? 'badge-warning' : 'badge-success');
      let severityText = s.severity === 'Critical' ? 'Crítico' : (s.severity === 'Warning' ? 'Advertencia' : 'Normal');
      
      const fechaVal = new Date(s.entryTime || Date.now()).toLocaleDateString('es-ES');
      
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--primary);">REP-${s.id}</td>
        <td style="font-weight:600;">${s.id}</td>
        <td>${eqName} <span style="font-size:0.75rem; color:var(--text-muted); display:block;">${s.component}</span></td>
        <td>${fechaVal}</td>
        <td>${s.operator}</td>
        <td style="text-align: center;"><span class="badge ${badgeClass}">${severityText}</span></td>
        <td style="text-align: center;">
          <button class="btn btn-primary btn-sm btn-view-report" style="padding: 4px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;">
            <i data-lucide="file-text" style="width:12px; height:12px;"></i> Ver Informe
          </button>
        </td>
      `;
      
      tr.querySelector('.btn-view-report').addEventListener('click', () => {
        mostrarDetalleInforme(s);
      });
      
      tbody.appendChild(tr);
    });
    
    lucide.createIcons();
  };

  const mostrarDetalleInforme = (sample) => {
    const modalId = 'dynamic-report-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    
    const totMin = (sample.times.espera + sample.times.analisis + sample.times.reporte + sample.times.repeticion + sample.times.falla) / 60;
    
    let badgeClass = sample.severity === 'Critical' ? 'badge-danger' : (sample.severity === 'Warning' ? 'badge-warning' : 'badge-success');
    let boxColor = 'var(--success)';
    let boxIcon = 'check-circle';
    if (sample.severity === 'Critical') {
      boxColor = 'var(--danger)';
      boxIcon = 'alert-triangle';
    } else if (sample.severity === 'Warning') {
      boxColor = 'var(--warning)';
      boxIcon = 'alert-circle';
    }
    let severityText = sample.severity === 'Critical' ? 'CRÍTICO' : (sample.severity === 'Warning' ? 'ADVERTENCIA' : 'NORMAL');
    
    let resultsHTML = '';
    if (sample.measuredValues && Object.keys(sample.measuredValues).length > 0) {
      resultsHTML = Object.entries(sample.measuredValues).map(([name, val]) => {
        const modelName = obtenerModeloDeFlota(sample.equipId);
        const configs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG_MUESTRAS)) || SEMILLA_CONFIG_MUESTRAS;
        const modelConfig = configs.find(c => c.model === modelName);
        let unit = '';
        if (modelConfig) {
          const compConf = modelConfig.samples.find(s => s.name === sample.component);
          if (compConf) {
            const anaConf = compConf.analyses.find(a => a.name === name);
            if (anaConf) {
              unit = ' ' + (anaConf.unit || '');
            }
          }
        }
        let displayVal = val;
        if (name === 'Humedad' && typeof val === 'string') {
          displayVal = val.replace('.', ',');
        }
        return `
          <div style="background:var(--bg-secondary); padding:8px; border-radius:6px; border:1px solid var(--panel-border);">
            <span style="font-size:0.7rem; color:var(--text-muted); display:block;">${name}</span>
            <strong style="font-size:1.1rem; color:var(--text-primary); font-family:monospace;">${displayVal}${unit}</strong>
          </div>
        `;
      }).join('');
    } else {
      const viscVal = typeof sample.simulatedValues.visc === 'number' ? sample.simulatedValues.visc.toFixed(1) : sample.simulatedValues.visc;
      const waterVal = typeof sample.simulatedValues.water === 'number' ? sample.simulatedValues.water.toFixed(0) : sample.simulatedValues.water;
      resultsHTML = `
        <div style="background:var(--bg-secondary); padding:8px; border-radius:6px; border:1px solid var(--panel-border);">
          <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Viscosidad 100°C</span>
          <strong style="font-size:1.1rem; color:var(--text-primary); font-family:monospace;">${viscVal} cSt</strong>
        </div>
        <div style="background:var(--bg-secondary); padding:8px; border-radius:6px; border:1px solid var(--panel-border);">
          <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Humedad (KF)</span>
          <strong style="font-size:1.1rem; color:var(--text-primary); font-family:monospace;">${waterVal} ppm</strong>
        </div>
        <div style="background:var(--bg-secondary); padding:8px; border-radius:6px; border:1px solid var(--panel-border);">
          <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Conteo de Partículas</span>
          <strong style="font-size:1.1rem; color:var(--text-primary); font-family:monospace;">${sample.simulatedValues.iso}</strong>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 550px; width: 90%;">
        <div class="modal-header" style="border-bottom:1px solid var(--panel-border); padding-bottom:12px;">
          <h3 style="font-family: var(--font-heading); color: var(--primary); margin:0; font-weight:800;">Informe Analítico: REP-${sample.id}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('${modalId}').classList.remove('active')">&times;</button>
        </div>
        <div style="padding: 1.5rem; display:flex; flex-direction:column; gap:16px; font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Lote Relacionado: <strong>${sample.id}</strong></span>
            <span class="badge ${badgeClass}" style="font-size:0.75rem; padding:4px 10px;">${severityText}</span>
          </div>
          
          <div class="glass-card" style="padding:1rem; display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; background:var(--bg-secondary); border:1px solid var(--panel-border);">
            <div>
              <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Equipo Minero:</span>
              <strong style="color:var(--text-primary);">${obtenerNombreEquipo(sample.equipId)}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Componente:</span>
              <strong style="color:var(--text-primary);">${sample.component}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Fecha de Ingreso:</span>
              <strong style="color:var(--text-primary); font-weight:600;">${new Date(sample.entryTime || Date.now()).toLocaleString('es-ES')}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Analista Validador:</span>
              <strong style="color:var(--text-primary); font-weight:600;">${sample.operator}</strong>
            </div>
          </div>
          
          <div>
            <h4 style="font-family:var(--font-heading); color:var(--text-primary); margin-bottom:8px; border-bottom:1px solid var(--panel-border); padding-bottom:4px;">Resultados de Ensayos Físico-Químicos</h4>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; text-align:center;">
              ${resultsHTML}
            </div>
          </div>
          
          <div style="background:var(--bg-main); border-left: 4px solid ${boxColor}; padding: 16px; border-radius:6px; margin-top:8px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
            <h5 style="color:${boxColor}; font-family:var(--font-heading); margin: 0 0 6px 0; font-size:0.95rem; font-weight:800; display:flex; align-items:center; gap:6px;"><i data-lucide="${boxIcon}" style="width:16px; height:16px;"></i> Recomendación y Diagnóstico Técnico</h5>
            <p style="margin:0; line-height:1.5; font-size:0.95rem; color:var(--text-dark); font-weight:600; font-style:italic;">"${sample.obs}"</p>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:var(--text-muted); margin-top:8px; border-top:1px solid var(--panel-border); padding-top:12px;">
            <span>Tiempo de procesamiento total: <strong>${totMin.toFixed(0)} min</strong></span>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('${modalId}').classList.remove('active')">Cerrar</button>
          </div>
        </div>
      </div>
    `;
    modal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  };

  document.getElementById('btn-show-add-sample').addEventListener('click', prepararModalIngresoMuestras);
  document.getElementById('form-add-sample').addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (loteMuestrasActuales.length === 0) {
      alert("Por favor, seleccione al menos un componente o agregue una muestra personalizada.");
      return;
    }

    const batchName = document.getElementById('sample-batch-name').value.trim();
    const obsGeneral = document.getElementById('sample-observations').value.trim();
    const missingEl = document.getElementById('sample-missing-data');
    const missing = missingEl ? missingEl.value.trim() : 'Ninguno';
    const equipId = document.getElementById('sample-equip-target').value;
    const operator = document.getElementById('sample-operator').value.trim();

    if (!equipId) {
      alert("Por favor, seleccione un equipo minero.");
      return;
    }

    const active = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];

    loteMuestrasActuales.forEach(s => {
      const sId = `${batchName}-${s.controlNumber}`;
      active.push({
        id: sId,
        batchId: batchName,
        entryTime: s.fechaRec ? new Date(s.fechaRec).toISOString() : new Date().toISOString(),
        obs: obsGeneral ? `${obsGeneral} (OT: ${s.ot || '-'})` : `OT: ${s.ot || '-'}`,
        missing,
        status: 'En espera',
        operator,
        equipId,
        component: s.name,
        currentStageStart: new Date().toISOString(),
        times: { espera: 0, analisis: 0, reporte: 0, repeticion: 0, falla: 0 },
        simulatedValues: { visc: 0, water: 0, iso: '-' },
        analyses: s.analyses,
        horometro: s.horometro || '0',
        ot: s.ot || '',
        tipoMuestra: s.tipoMuestra || '',
        controlNumber: s.controlNumber,
        stageHistory: []
      });
    });

    localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(active));
    document.getElementById('form-add-sample').reset();
    cerrarModal('modal-add-sample');
    cargarSeccionMuestras();
  });

  // === SECUENCIA DE ARRANQUE GENERAL (BOOT APP) ===
  const bootApp = async () => {
    await cargarBaseDeDatos();

    // Sincronizar datos locales acumulados si el servidor está vacío o tiene menos datos
    if (useServerAPI) {
      let isCacheModified = false;
      Object.keys(STORAGE_KEYS).forEach(k => {
        const key = STORAGE_KEYS[k];
        const localValStr = window.localStorage.getItem(key);
        if (localValStr) {
          try {
            const localVal = JSON.parse(localValStr);
            const serverVal = serverCache[key];
            if (Array.isArray(localVal)) {
              if (!serverVal || serverVal.length < localVal.length) {
                console.log(`Migrando ${key} local (${localVal.length} ítems) al servidor (${serverVal ? serverVal.length : 0} ítems)...`);
                serverCache[key] = localVal;
                isCacheModified = true;
              }
            }
          } catch(e) {}
        }
      });
      if (isCacheModified) {
        await guardarDatosServidor(serverCache);
      }
    }

    // Migración automática de diferenciales ya existentes en la base de datos de flota
    try {
      const flotaKey = STORAGE_KEYS.FLOTA_DB;
      const rawFlota = localStorage.getItem(flotaKey);
      if (rawFlota) {
        const flotaArr = JSON.parse(rawFlota);
        let modified = false;
        const nuevaFlota = flotaArr.map(item => {
          let comp = item.componente || '';
          const compLower = comp.toLowerCase();
          const sapLower = (item.sap_location || '').toLowerCase();
          if (compLower === 'differential' || compLower === 'diferencial') {
            if (sapLower.includes('axa1') || sapLower.includes('axle1') || sapLower.includes('ax1')) {
              comp = 'Diferencial Delantero (Axle Assy;Position 1)';
              modified = true;
            } else if (sapLower.includes('axa2') || sapLower.includes('axle2') || sapLower.includes('ax2')) {
              comp = 'Diferencial Trasero (Axle Assy;Position 2)';
              modified = true;
            }
          }
          return { ...item, componente: comp };
        });
        if (modified) {
          console.log("Migrando nombres de diferenciales en la base de datos de flota...");
          localStorage.setItem(flotaKey, JSON.stringify(nuevaFlota));
        }
      }
    } catch (e) {
      console.error("Error al migrar diferenciales de flota:", e);
    }

    actualizarSelectoresFlota();
    setupInspectionFilters();
    inicializarGuardadoResultadosAnalisis();
    inicializarGuardadoMasivo();
    inicializarModuloQC();
    inicializarModuloObjetivos();
    inicializarModuloCharlas();
    
    const searchInput = document.getElementById('filter-informes-search');
    if (searchInput) {
      searchInput.oninput = (e) => {
        cargarSeccionVisorInformes(e.target.value);
      };
    }
    const btnResetSearch = document.getElementById('btn-filter-informes-reset');
    if (btnResetSearch) {
      btnResetSearch.onclick = () => {
        searchInput.value = '';
        cargarSeccionVisorInformes('');
      };
    }

    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('console-gestion').classList.add('hidden');
    document.getElementById('console-inspeccion').classList.add('hidden');
    document.getElementById('console-admin').classList.add('hidden');
    document.getElementById('console-visor').classList.add('hidden');

    lucide.createIcons();
  };

  bootApp();

  // ==========================================
  // === MÓDULO DE REPORTES PDF (jsPDF) =======
  // ==========================================
  
  const getBase64Logo = () => {
    try {
      const img = document.getElementById('pdf-logo-img');
      if (img && img.complete && img.naturalHeight !== 0) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 120;
        canvas.height = img.naturalHeight || 30;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/png');
      }
    } catch(e) {}
    return null;
  };

  const drawPageForSample = (doc, sample, fleetItem, logoBase64, isFirstPage) => {
    if (!isFirstPage) {
      doc.addPage();
    }
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
    
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 40, 30, 140, 35);
    } else {
      doc.setFontSize(24);
      doc.setTextColor(0, 47, 108);
      doc.setFont('helvetica', 'bold');
      doc.text("N", 40, 60);
    }
    
    // Header Right
    doc.setFontSize(14);
    doc.setTextColor(0, 150, 255); // Light blue
    doc.setFont('helvetica', 'normal');
    doc.text("CONFIABILIDAD", 550, 40, { align: 'right' });
    doc.setFontSize(11);
    doc.setTextColor(0, 47, 108); // Dark blue
    doc.setFont('helvetica', 'bold');
    doc.text("REPORTE PRELIMINAR ANALISIS", 550, 60, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text("Laboratorio de Lubricantes", 550, 75, { align: 'right' });
    
    doc.setTextColor(150, 150, 150);
    doc.text(dateStr, 550, 90, { align: 'right' });
    
    // Main Title
    doc.setFontSize(16);
    doc.setTextColor(0, 47, 108);
    doc.setFont('helvetica', 'bold');
    doc.text("INFORME DE ANÁLISIS DE LUBRICANTE", 40, 140);
    
    // Sample Data
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text("DATOS DE LA MUESTRA", 40, 170);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`ID Muestra: ${sample.id || sample.controlNumber || sample.uid}`, 40, 190);
    doc.text(`Equipo: ${obtenerNombreEquipo(sample.equipId)}`, 40, 205);
    doc.text(`Componente: ${sample.component || sample.name}`, 40, 220);
    doc.text(`Fecha Muestra: ${sample.fechaRec || 'N/A'}`, 40, 235);
    
    doc.text(`Horómetro Actual: ${sample.horometro || 'N/A'}`, 300, 190);
    doc.text(`Hr. Último Cambio: ${sample.hrUltimoCambio || 'N/A'}`, 300, 205);
    doc.text(`Horas Lubricante: ${sample.horasAceiteCalculadas || 'N/A'}`, 300, 220);
    doc.text(`Vida Componente: ${sample.porcentajeVidaCalculado || 'N/A'}`, 300, 235);
    
    // Results Table
    doc.setFont('helvetica', 'bold');
    doc.text("RESULTADOS DEL ANÁLISIS", 40, 270);
    
    const tableBody = [];
    if (sample.measuredValues) {
      Object.keys(sample.measuredValues).forEach(param => {
        tableBody.push([
          param,
          sample.measuredValues[param],
          sample.historicalValues && sample.historicalValues[param] ? sample.historicalValues[param][0] || '-' : '-'
        ]);
      });
    }
    
    doc.autoTable({
      startY: 280,
      head: [['Parámetro', 'Valor Actual', 'Valor Anterior']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [0, 47, 108] },
      styles: { fontSize: 9 }
    });
    
    const finalY = doc.lastAutoTable.finalY || 280;
    
    // Recommendations
    doc.setFont('helvetica', 'bold');
    doc.text("RECOMENDACIONES Y OBSERVACIONES", 40, finalY + 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(sample.severity === 'Critical' ? 200 : 0, 0, 0);
    
    const splitObs = doc.splitTextToSize(sample.obs || 'Sin observaciones.', 510);
    doc.text(splitObs, 40, finalY + 45);
  };

  window.generarReportePDF = (sample, fleetItem) => {
    if (!window.jspdf) {
      alert("La librería jsPDF no está cargada.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    const logoBase64 = getBase64Logo();
    
    drawPageForSample(doc, sample, fleetItem, logoBase64, true);
    
    doc.save(`Reporte_Analisis_${sample.id || sample.uid || 'Muestra'}.pdf`);
  };

  window.generarReporteLotePDF = (samplesArray) => {
      if (!window.jspdf) {
        alert("La librería jsPDF no está cargada.");
        return;
      }
      if (!samplesArray || samplesArray.length === 0) return;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('l', 'pt', 'a4');
      const logoBase64 = getBase64Logo();
      const flota = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOTA_DB)) || SEMILLA_FLOTA_DB;

      const now = new Date();
      const dateStr = now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 40, 30, 140, 35);
      } else {
        doc.setFontSize(24);
        doc.setTextColor(0, 47, 108);
        doc.setFont('helvetica', 'bold');
        doc.text("N", 40, 60);
      }
      
      doc.setFontSize(14);
      doc.setTextColor(0, 150, 255);
      doc.setFont('helvetica', 'normal');
      doc.text("CONFIABILIDAD", 800, 40, { align: 'right' });
      doc.setFontSize(11);
      doc.setTextColor(0, 47, 108);
      doc.setFont('helvetica', 'bold');
      doc.text("REPORTE RESUMIDO DE LOTE", 800, 60, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text("Laboratorio de Lubricantes", 800, 75, { align: 'right' });
      
      doc.setTextColor(150, 150, 150);
      doc.text(dateStr, 800, 90, { align: 'right' });

      doc.setFontSize(14);
      doc.setTextColor(0, 47, 108);
      doc.setFont('helvetica', 'bold');
      doc.text("CONSOLIDADO DE RESULTADOS DE ANÁLISIS", 40, 120);

      const paramSet = new Set();
      samplesArray.forEach(s => {
        if (s.measuredValues) {
          Object.keys(s.measuredValues).forEach(k => paramSet.add(k));
        }
      });
      
      const order = ['Viscosidad 100°C', 'Viscosidad 40°C', 'Humedad', 'Conteo de Partículas (ISO)'];
      let paramArray = Array.from(paramSet).sort((a,b) => {
        let ia = order.indexOf(a); let ib = order.indexOf(b);
        if (ia === -1) ia = 99; if (ib === -1) ib = 99;
        return ia - ib;
      });

      const sessionUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_USER));
      let analistaInitials = 'Lab';
      if (sessionUser && sessionUser.username) {
        analistaInitials = sessionUser.username.split(' ').map(p => p.charAt(0).toUpperCase()).join('');
      }

      const headCols = ['Muestra', 'OT', 'Analista', 'Equipo', 'Componente', 'Lubricante', 'Cambio', 'Hr.', 'Hr. Ac.', 'Vida%'].concat(paramArray, ['Tend. Sev.', 'Tend. Din.', 'Diagnóstico / Obs.']);

      const getParamSeverity = (name, val, fleetItem) => {
        if(!fleetItem || !fleetItem.analisis) {
           let severity = 'Normal';
           if (name === 'Humedad' && val === '>0.01') severity = 'Critical';
           return severity;
        }
        const paramConfig = fleetItem.analisis.find(a => a.name === name);
        if(!paramConfig) return 'Normal';
        
        let severity = 'Normal';
        if (name === 'Humedad') {
          if (val === '>0.01') severity = 'Critical';
        } else {
          const v = parseFloat(val);
          if(isNaN(v)) return 'Normal';
          if (paramConfig.normalMin !== undefined) {
            if (v <= paramConfig.warningMin || v >= paramConfig.warningMax) severity = 'Critical';
            else if (v <= paramConfig.normalMin || v >= paramConfig.normalMax) severity = 'Warning';
          } else {
            if (v >= paramConfig.warningMax) severity = 'Critical';
            else if (v >= paramConfig.normalMax) severity = 'Warning';
          }
        }
        return severity;
      };

      const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];

      function getSeverityVal(sevStr) {
        if (sevStr === 'Critical') return 2;
        if (sevStr === 'Warning') return 1;
        return 0;
      }

      function calculateTrends(s, historyCompletadas, fleetItem) {
        let history = historyCompletadas.filter(c => c.equipId === s.equipId && c.component === s.component);
        history.sort((a,b) => {
          let da = a.fecha_completado ? new Date(a.fecha_completado).getTime() : 0;
          let db = b.fecha_completado ? new Date(b.fecha_completado).getTime() : 0;
          if (da === db) return (b.id || "").localeCompare(a.id || "");
          return db - da;
        });

        // Add current sample as the newest
        history.unshift(s);

        let sevTrend = '-';
        if (history.length >= 2) {
          let currentSev = getSeverityVal(history[0].severity || 'Normal');
          let prevSev = getSeverityVal(history[1].severity || 'Normal');
          let dir = currentSev > prevSev ? 'up' : (currentSev < prevSev ? 'down' : 'equal');
          
          let count = 1;
          for (let i = 1; i < history.length - 1; i++) {
            let s1 = getSeverityVal(history[i].severity || 'Normal');
            let s2 = getSeverityVal(history[i+1].severity || 'Normal');
            let d = s1 > s2 ? 'up' : (s1 < s2 ? 'down' : 'equal');
            if (d === dir) count++;
            else break;
          }
          if (dir === 'up') sevTrend = `↑ (${count})`;
          else if (dir === 'down') sevTrend = `↓ (${count})`;
          else sevTrend = `= (${count})`;
        }

        let dinTrend = '-';
        if (history.length >= 2 && s.measuredValues) {
          let worstParam = null;
          let highestSeverity = -1;
          Object.keys(s.measuredValues).forEach(p => {
             let sevStr = getParamSeverity(p, s.measuredValues[p], fleetItem);
             let sevVal = getSeverityVal(sevStr);
             if (sevVal > highestSeverity) {
               highestSeverity = sevVal;
               worstParam = p;
             }
          });

          if (highestSeverity === 0) {
             if (s.measuredValues['Viscosidad 100°C'] !== undefined) worstParam = 'Viscosidad 100°C';
             else if (s.measuredValues['Conteo de Partículas (ISO)'] !== undefined) worstParam = 'Conteo de Partículas (ISO)';
             else worstParam = Object.keys(s.measuredValues)[0];
          }

          if (worstParam) {
             let getNumVal = (sample, param) => {
                if (!sample.measuredValues || sample.measuredValues[param] === undefined) return null;
                let val = sample.measuredValues[param];
                if (param === 'Humedad' && val === '<0.01') return 0;
                if (param === 'Humedad' && val === '>0.01') return 1;
                if (param === 'Conteo de Partículas (ISO)') {
                   let parts = String(val).split('/');
                   return parseFloat(parts[0]);
                }
                return parseFloat(val);
             };

             let v0 = getNumVal(history[0], worstParam);
             let v1 = getNumVal(history[1], worstParam);
             
             if (v0 !== null && v1 !== null && !isNaN(v0) && !isNaN(v1)) {
                let diff = v0 - v1;
                let dir = diff > (v1 * 0.02) ? 'up' : (diff < -(v1 * 0.02) ? 'down' : 'equal');
                
                let count = 1;
                for (let i = 1; i < history.length - 1; i++) {
                  let va = getNumVal(history[i], worstParam);
                  let vb = getNumVal(history[i+1], worstParam);
                  if (va !== null && vb !== null && !isNaN(va) && !isNaN(vb)) {
                    let dff = va - vb;
                    let d = dff > (vb * 0.02) ? 'up' : (dff < -(vb * 0.02) ? 'down' : 'equal');
                    if (d === dir) count++;
                    else break;
                  } else {
                    break;
                  }
                }
                
                let pNameShort = worstParam.includes('Viscosidad') ? 'Visc' : (worstParam.includes('ISO') ? 'ISO' : 'Hum');
                let symbol = dir === 'up' ? '↑' : (dir === 'down' ? '↓' : '=');
                dinTrend = `${pNameShort}: ${symbol} (${count})`;
             }
          }
        }
        return { sevTrend, dinTrend };
      }

      const tableBody = samplesArray.map(s => {
        const fleetItem = flota.find(f => f.equipo === s.equipId && f.componente === s.component);
        const lube = fleetItem && fleetItem.lubricante_utilizado ? fleetItem.lubricante_utilizado : '-';
        
        const row = [
          s.id || s.controlNumber || 'N/A',
          s.ot || '-',
          analistaInitials,
          obtenerNombreEquipo(s.equipId),
          s.component || s.name || '-',
          lube,
          s.cambioAceite || '-',
          s.horometro || '-',
          s.horasAceiteCalculadas || '-',
          s.porcentajeVidaCalculado || '-'
        ];

        paramArray.forEach(p => {
          let val = '-';
          let bgColor = null;
          let txtColor = [0,0,0];
          
          if (s.measuredValues && s.measuredValues[p] !== undefined) {
            val = s.measuredValues[p];
            let severity = getParamSeverity(p, val, fleetItem);
            
            if (p === 'Conteo de Partículas (ISO)' && severity === 'Normal') {
               const isoParts = String(val).split('/');
               if (isoParts.length > 0) {
                 const isoFirst = parseInt(isoParts[0], 10);
                 if (!isNaN(isoFirst)) {
                   if (isoFirst >= 21) severity = 'Critical';
                   else if (isoFirst >= 19) severity = 'Warning';
                 }
               }
            }
            
            if (severity === 'Critical') {
              bgColor = [239, 68, 68];
              txtColor = [255, 255, 255];
            } else if (severity === 'Warning') {
              bgColor = [245, 158, 11];
              txtColor = [255, 255, 255];
            }
          }
          
          if (bgColor) {
            row.push({ content: val, styles: { fillColor: bgColor, textColor: txtColor, fontStyle: 'bold' } });
          } else {
            row.push(val);
          }
        });

        const { sevTrend, dinTrend } = calculateTrends(s, completadas, fleetItem);
        row.push(sevTrend);
        row.push(dinTrend);
        row.push(s.obs || '-');
        return row;
      });

      doc.autoTable({
        startY: 140,
        head: [headCols],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [0, 47, 108] },
        styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
        columnStyles: {
          [headCols.length - 1]: { cellWidth: 120, halign: 'left' } // Diagnóstico
        }
      });

      const bName = samplesArray[0].batchId || samplesArray[0].id || Date.now();
      doc.save(`Reporte_Lote_Consolidado_${bName}.pdf`);
  };

  const btnExportBatchPdf = document.getElementById('btn-export-batch-pdf');
  if (btnExportBatchPdf) {
    btnExportBatchPdf.addEventListener('click', () => {
      const checkedBoxes = Array.from(document.querySelectorAll('.batch-export-check:checked'));
      if (checkedBoxes.length === 0) {
        alert("Seleccione al menos un lote para exportar.");
        return;
      }
      
      const selectedBatches = checkedBoxes.map(cb => cb.getAttribute('data-batch'));
      const activas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_ACTIVAS)) || [];
      const completadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS)) || [];
      const allSamples = [...activas, ...completadas];
      const samplesToExport = allSamples.filter(s => selectedIds.includes(s.id));
      
      if (samplesToExport.length === 0) {
        alert("No se encontraron las muestras seleccionadas.");
        return;
      }

      window.generarReporteLotePDF(samplesToExport);

      samplesToExport.forEach(s => {
        const idxA = activas.findIndex(x => x.id === s.id);
        if (idxA !== -1) {
          activas[idxA].batchPdfGenerated = true;
          activas[idxA].pdfExported = true;
        }
        const idxC = completadas.findIndex(x => x.id === s.id);
        if (idxC !== -1) {
          completadas[idxC].batchPdfGenerated = true;
          completadas[idxC].pdfExported = true;
        }
      });
      localStorage.setItem(STORAGE_KEYS.MUESTRAS_ACTIVAS, JSON.stringify(activas));
      localStorage.setItem(STORAGE_KEYS.MUESTRAS_COMPLETADAS, JSON.stringify(completadas));
      
      if (typeof cargarSeccionMuestras === 'function') {
        cargarSeccionMuestras();
      }
    });
  }
});

// ==========================================
// MÓDULO DE ESTÁNDARES Y QC
// ==========================================

    window.cargarHistorialExcel = (equip, idx) => {
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
                      mensajeResumen += `- ${sub.name}: ${history.length} registros cargados\n`;
                  }
              }
          });
          
          if (capilaresActualizados > 0) {
             localStorage.setItem('QC_STANDARDS_CONFIG', JSON.stringify(currentConfig));
             alert('¡Historial masivo cargado con exito!\nSe actualizaron ' + capilaresActualizados + ' capilares en simultaneo:\n' + mensajeResumen);
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


function inicializarModuloQC() {
  const btnManageStandards = document.getElementById('btn-show-create-standard');
  const modalQC = document.getElementById('modal-gestor-qc');
  const btnCloseQC = document.getElementById('btn-close-gestor-qc');
  const btnCancelQC = document.getElementById('btn-cancel-gestor-qc');
  const btnSaveQC = document.getElementById('btn-save-gestor-qc');
  const btnAddSub = document.getElementById('btn-add-qc-subcomponent');
  const selectEquip = document.getElementById('gestor-qc-equip');
  const subList = document.getElementById('qc-subcomponents-list');

  let currentConfig = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};

  function renderSubcomponents() {
    if (!subList) return;
    subList.innerHTML = '';
    const equip = selectEquip.value;
    const subs = currentConfig[equip] || [];
    
    if (subs.length === 0) {
      subList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding: 1rem;">No hay capilares o canales configurados para este instrumento.</p>';
      return;
    }

    subs.forEach((sub, idx) => {
      const div = document.createElement('div');
      div.className = 'glass-card';
      div.style.padding = '1rem';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items:center;">
          <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">${sub.name}</h4>
          <button class="btn btn-danger btn-sm" onclick="eliminarSubcomponenteQC('${equip}', ${idx})"><i data-lucide="trash-2"></i> Eliminar</button>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div style="flex: 1; min-width: 100px;">
             <label style="font-size:0.75rem;">Valor Nominal</label>
             <input type="number" step="0.01" class="form-control" value="${sub.nominal || ''}" onchange="actualizarSubcomponenteQC('${equip}', ${idx}, 'nominal', this.value)">
          </div>
          <div style="flex: 1; min-width: 100px;">
             <label style="font-size:0.75rem;">Desviación Estándar (SD)</label>
             <input type="number" step="0.01" class="form-control" value="${sub.sd || ''}" onchange="actualizarSubcomponenteQC('${equip}', ${idx}, 'sd', this.value)">
          </div>
          <div style="flex: 1; min-width: 120px;">
             <button class="btn btn-secondary btn-sm" style="width:100%; height: 38px; margin-bottom:6px;" onclick="window.cargarHistorialExcel('${equip}', ${idx})"><i data-lucide="upload-cloud"></i> Cargar Excel</button>
<button class="btn btn-primary btn-sm" style="width:100%; height: 38px;" onclick="window.verGraficoCapilar('${equip}', ${idx})"><i data-lucide="bar-chart-2"></i> Ver Gráfico</button>
          </div>
        </div>
      `;
      subList.appendChild(div);
    });
    lucide.createIcons();
  }

  function actualizarDesplegableEquipos() {
    if (!selectEquip) return;
    const currentVal = selectEquip.value;
    selectEquip.innerHTML = '';
    // Intentar leer de base de datos dinámica
    let equiposLab = JSON.parse(localStorage.getItem('lubelab_equipos'));
    if (!equiposLab || equiposLab.length === 0) {
      equiposLab = [
        {name: 'Spectro Visc'},
        {name: 'Contador de Partículas'},
        {name: 'Espectrómetro ICP'},
        {name: 'FTIR'}
      ];
    }
    equiposLab.forEach(e => {
       const opt = document.createElement('option');
       opt.value = e.name || e;
       opt.textContent = e.name || e;
       selectEquip.appendChild(opt);
    });
    // Restore previous selection if exists
    if (currentVal && selectEquip.querySelector(`option[value="${currentVal}"]`)) {
      selectEquip.value = currentVal;
    }
  }

  window.eliminarSubcomponenteQC = (equip, idx) => {
    if(confirm("¿Estás seguro de eliminar este canal? Se perderá su historial.")) {
      currentConfig[equip].splice(idx, 1);
      renderSubcomponents();
    }
  };

  window.actualizarSubcomponenteQC = (equip, idx, field, val) => {
    currentConfig[equip][idx][field] = parseFloat(val);
  };

  if(selectEquip) selectEquip.addEventListener('change', renderSubcomponents);

  if(btnAddSub) {
    btnAddSub.addEventListener('click', () => {
      const equip = selectEquip.value;
      const name = prompt('Ingrese el nombre del canal o capilar (Ej: Capilar ' + (currentConfig[equip] ? currentConfig[equip].length + 1 : 1) + '):');
      if (name && name.trim() !== '') {
        if (!currentConfig[equip]) currentConfig[equip] = [];
        currentConfig[equip].push({ name: name.trim(), nominal: null, sd: null, history: [] });
        renderSubcomponents();
      }
    });
  }

  window.abrirGestorQC = () => {
    actualizarDesplegableEquipos();
    renderSubcomponents();
    modalQC.classList.add('active');
    modalQC.style.display = ''; // Fallback
  };

  [btnCloseQC, btnCancelQC].forEach(b => b && b.addEventListener('click', () => {
    modalQC.classList.remove('active');
    modalQC.style.display = 'none';
  }));

  if(btnSaveQC) {
    btnSaveQC.addEventListener('click', () => {
      localStorage.setItem('QC_STANDARDS_CONFIG', JSON.stringify(currentConfig));
      alert("Configuración de estándares guardada con éxito en la base de datos.");
      modalQC.classList.remove('active');
      modalQC.style.display = 'none';
      window.actualizarSelectorDeEstandaresPrincipal();
    });
  }

  
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

  window.actualizarSelectorDeEstandaresPrincipal = () => {
    const mainSelect = document.getElementById('qc-select-standard');
    if(!mainSelect) return;
    mainSelect.innerHTML = '<option value="">-- Seleccionar un Estándar --</option>';
    const config = JSON.parse(localStorage.getItem('QC_STANDARDS_CONFIG')) || {};
    
    Object.keys(config).forEach(equip => {
      if(config[equip].length > 0) {
        const group = document.createElement('optgroup');
        group.label = equip;
        config[equip].forEach((sub, idx) => {
          const opt = document.createElement('option');
          opt.value = equip + '|' + idx;
          opt.textContent = equip + ' - ' + sub.name;
          group.appendChild(opt);
        });
        mainSelect.appendChild(group);
      }
    });
  };

  window.actualizarSelectorDeEstandaresPrincipal();
}

// ==========================================
// MÓDULO DE OBJETIVOS 2026
// ==========================================
function inicializarModuloObjetivos() {
  const STORAGE_KEY = 'lubelab_objetivos';
  let objetivos = JSON.parse(localStorage.getItem(STORAGE_KEY));
  
  if (!objetivos || objetivos.length === 0) {
    // Inicialización automática desde los datos del Excel parseados
    fetch('objetivos_seed.json').then(r => r.json()).then(data => {
      objetivos = data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(objetivos));
      renderGrid();
    }).catch(e => console.log('Sin seed de objetivos.'));
  }

  const grid = document.getElementById('objetivos-grid');
  const globalProgressEl = document.getElementById('obj-global-progress');
  const activeCountEl = document.getElementById('obj-active-count');
  
  const modalObj = document.getElementById('modal-gestor-objetivo');
  const btnClose = document.getElementById('btn-close-gestor-obj');
  const btnCancel = document.getElementById('btn-cancel-gestor-obj');
  const btnSave = document.getElementById('btn-save-gestor-obj');
  const btnAddStage = document.getElementById('btn-add-obj-stage');
  const stagesBody = document.getElementById('gestor-obj-stages-body');

  let currentObjId = null;

  function getColorClass(progress) {
    if (progress >= 100) return 'border-left: 4px solid var(--info);';
    if (progress >= 70) return 'border-left: 4px solid var(--success);';
    if (progress >= 30) return 'border-left: 4px solid var(--warning);';
    return 'border-left: 4px solid var(--danger);';
  }

  function calculateObjProgress(stages) {
    if (!stages || stages.length === 0) return 0;
    const total = stages.reduce((acc, s) => acc + (parseFloat(s.progress) || 0), 0);
    return total / stages.length;
  }

  function renderGrid() {
    if (!grid || !objetivos) return;
    grid.innerHTML = '';
    let sumGlobal = 0;

    objetivos.forEach(obj => {
      const progress = calculateObjProgress(obj.stages);
      sumGlobal += progress;

      const card = document.createElement('div');
      card.className = 'glass-card';
      card.style.padding = '20px';
      card.style.cssText += getColorClass(progress) + ' display: flex; flex-direction: column; justify-content: space-between;';
      
      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
            <span style="font-size: 0.75rem; color: var(--purple); font-weight: 600; text-transform: uppercase;">${obj.category}</span>
            <span style="font-size: 0.8rem; font-weight: bold;">${progress.toFixed(1)}%</span>
          </div>
          <h4 style="margin: 0 0 10px 0; font-size: 1rem; color: #fff; line-height: 1.4;">${obj.id}</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 15px;">${obj.title}</p>
        </div>
        <div style="margin-top: auto;">
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 15px;">
            <div style="height: 100%; width: ${progress}%; background: var(--purple); transition: width 0.5s ease;"></div>
          </div>
          <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="abrirGestorObjetivo('${obj.id}')"><i data-lucide="edit-3"></i> Administrar Avance</button>
        </div>
      `;
      grid.appendChild(card);
    });

    const globalAvg = objetivos.length > 0 ? (sumGlobal / objetivos.length) : 0;
    if (globalProgressEl) globalProgressEl.textContent = globalAvg.toFixed(1) + '%';
    if (activeCountEl) activeCountEl.textContent = objetivos.length;
    if (window.lucide) window.lucide.createIcons();
  }

  window.abrirGestorObjetivo = (id) => {
    currentObjId = id;
    const obj = objetivos.find(o => o.id === id);
    if(!obj) return;

    document.getElementById('gestor-obj-title').textContent = obj.id;
    document.getElementById('gestor-obj-category').textContent = obj.category;
    document.getElementById('gestor-obj-desc').textContent = obj.title;
    document.getElementById('gestor-obj-kpi').textContent = obj.kpi || 'No especificado';
    let std = String(obj.startDate);
    if(std.length < 6) std = 'Serial ' + std;
    document.getElementById('gestor-obj-dates').textContent = std + ' - ' + obj.endDate;

    renderStagesTable(obj.stages);
    modalObj.classList.add('active');
    modalObj.style.display = '';
  };

  function renderStagesTable(stages) {
    if(!stagesBody) return;
    stagesBody.innerHTML = '';
    stages.forEach((stage, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" class="form-control" value="${stage.title}" onchange="updateStage(${idx}, 'title', this.value)"></td>
        <td><input type="text" class="form-control" value="${stage.description}" onchange="updateStage(${idx}, 'description', this.value)"></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="range" min="0" max="100" value="${stage.progress}" style="flex:1;" oninput="this.nextElementSibling.textContent = this.value + '%'; updateStage(${idx}, 'progress', this.value)">
            <span style="font-size:0.8rem; width: 40px; display:inline-block; text-align:right;">${stage.progress}%</span>
          </div>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-danger btn-sm" onclick="deleteStage(${idx})"><i data-lucide="trash-2"></i></button>
        </td>
      `;
      stagesBody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
  }

  window.updateStage = (idx, field, value) => {
    const obj = objetivos.find(o => o.id === currentObjId);
    if (field === 'progress') value = parseFloat(value) || 0;
    obj.stages[idx][field] = value;
  };

  window.deleteStage = (idx) => {
    const obj = objetivos.find(o => o.id === currentObjId);
    if(confirm('¿Eliminar esta etapa?')) {
      obj.stages.splice(idx, 1);
      renderStagesTable(obj.stages);
    }
  };

  if (btnAddStage) {
    btnAddStage.addEventListener('click', () => {
      const obj = objetivos.find(o => o.id === currentObjId);
      obj.stages.push({ title: 'Nueva Etapa', description: '', progress: 0 });
      renderStagesTable(obj.stages);
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(objetivos));
      modalObj.classList.remove('active');
      modalObj.style.display = 'none';
      renderGrid();
      alert('Objetivo actualizado correctamente.');
    });
  }

  [btnClose, btnCancel].forEach(b => b && b.addEventListener('click', () => {
    objetivos = JSON.parse(localStorage.getItem(STORAGE_KEY));
    modalObj.classList.remove('active');
    modalObj.style.display = 'none';
  }));

  renderGrid();
  renderGrid();
}

// ==========================================
// MÓDULO GENERADOR DE CHARLAS (IA)
// ==========================================
function inicializarModuloCharlas() {
  const apiKeyInput = document.getElementById('gemini-api-key');
  const btnSaveKey = document.getElementById('btn-save-api-key');
  const keyStatus = document.getElementById('api-key-status');
  const formGenerar = document.getElementById('form-generar-charla');
  const loader = document.getElementById('charla-loader');
  const emptyState = document.getElementById('charla-empty');
  const outputContainer = document.getElementById('charla-output');
  const scriptContent = document.getElementById('charla-script-content');
  const faqContent = document.getElementById('charla-faq-content');
  const btnDescargar = document.getElementById('btn-descargar-pptx');
  const selectPlantilla = document.getElementById('charla-plantilla');
  const selectLogoTipo = document.getElementById('charla-logo-tipo');
  const containerLogo = document.getElementById('container-custom-logo');
  const inputLogo = document.getElementById('charla-custom-logo');
  const containerBg = document.getElementById('container-custom-bg');
  const inputBg = document.getElementById('charla-custom-bg');

  let currentPPTXData = null;

  if(selectLogoTipo) {
    selectLogoTipo.addEventListener('change', (e) => {
      if(containerLogo) containerLogo.style.display = e.target.value === 'personalizado' ? 'block' : 'none';
    });
  }

  if(selectPlantilla) {
    selectPlantilla.addEventListener('change', (e) => {
      if(containerBg) containerBg.style.display = e.target.value === 'imagen_fondo' ? 'block' : 'none';
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey && apiKeyInput) {
    apiKeyInput.value = savedKey;
    if(keyStatus) keyStatus.style.display = 'block';
  }

  if (btnSaveKey && apiKeyInput) {
    btnSaveKey.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        localStorage.setItem('gemini_api_key', key);
        if(keyStatus) keyStatus.style.display = 'block';
        alert('API Key de Gemini guardada localmente.');
      }
    });
  }

  if (formGenerar) {
    formGenerar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) {
        alert('Por favor, ingresa y guarda tu API Key de Google Gemini primero.');
        return;
      }

      const tema = document.getElementById('charla-tema').value;
      const audiencia = document.getElementById('charla-audiencia').value;
      const duracion = document.getElementById('charla-duracion').value;

      emptyState.style.display = 'none';
      outputContainer.style.display = 'none';
      btnDescargar.style.display = 'none';
      loader.style.display = 'block';
      currentPPTXData = null;

      try {
        const prompt = `Eres un experto en medio ambiente, seguridad industrial y lubricación técnica. Tu tarea es generar una charla de capacitación de ${duracion} minutos sobre el tema "${tema}" dirigida a un público de perfil: "${audiencia}".
Debes devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura estricta (sin bloques de código extra ni comillas markdown):
{
  "slides": [
    {"title": "Título Diapositiva 1", "points": ["Punto 1", "Punto 2"]}
  ],
  "script": "Aquí va el texto narrativo completo y continuo que el expositor leerá durante los ${duracion} minutos.",
  "faq": "Pregunta 1: Respuesta.\\nPregunta 2: Respuesta."
}
Asegúrate de generar entre 4 y 7 diapositivas (slides) precisas.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
          })
        });

        if (!response.ok) throw new Error('Error al conectar con Gemini API');

        const data = await response.json();
        let aiText = data.candidates[0].content.parts[0].text;
        
        // Limpiar posible formato markdown que envía Gemini (```json ... ```)
        aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        let resultObj = JSON.parse(aiText);
        
        loader.style.display = 'none';
        scriptContent.textContent = resultObj.script;
        faqContent.textContent = resultObj.faq;
        outputContainer.style.display = 'block';
        
        currentPPTXData = {
          tema: tema,
          audiencia: audiencia,
          slides: resultObj.slides
        };
        btnDescargar.style.display = 'inline-block';

      } catch (error) {
        console.error(error);
        loader.style.display = 'none';
        emptyState.style.display = 'block';
        alert('Ocurrió un error generando la charla. Verifica que tu API Key sea correcta o intenta de nuevo.');
      }
    });
  }

  if (btnDescargar) {
    btnDescargar.addEventListener('click', async () => {
      if (!currentPPTXData || typeof PptxGenJS === 'undefined') {
        alert('El generador PowerPoint (PptxGenJS) no ha cargado correctamente.');
        return;
      }
      
      let pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';

      const plantilla = selectPlantilla ? selectPlantilla.value : 'estandar';
      const logoTipo = selectLogoTipo ? selectLogoTipo.value : 'estandar';
      let logoData = 'logo_icon.png';
      let bgData = null;
      
      if (logoTipo === 'personalizado' && inputLogo && inputLogo.files.length > 0) {
        try {
          logoData = await fileToBase64(inputLogo.files[0]);
        } catch(e) {
          console.error("Error al leer la imagen personalizada:", e);
        }
      }

      if (plantilla === 'imagen_fondo' && inputBg && inputBg.files.length > 0) {
        try {
          bgData = await fileToBase64(inputBg.files[0]);
        } catch(e) {
          console.error("Error al leer la imagen de fondo:", e);
        }
      }

      let coverBg = { color: "ffffff" };
      let slideBg = { color: "f8f9fa" };
      
      if (plantilla === 'estandar') {
          coverBg = { color: "002f6c" };
      } else if (plantilla === 'imagen_fondo' && bgData) {
          coverBg = { data: bgData };
          slideBg = { data: bgData };
      }

      let coverObjects = [];
      let slideObjects = [];

      // Decoraciones por defecto si NO se usa una imagen de fondo
      if (plantilla === 'estandar') {
          coverObjects.push({ rect:  { x: 0, y: 5.5, w: '100%', h: 1.5, fill: { color: "8b5cf6" } } });
          slideObjects.push({ rect: { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: "002f6c" } } });
      } else if (plantilla === 'neutro') {
          coverObjects.push({ rect:  { x: 0, y: 5.5, w: '100%', h: 1.5, fill: { color: "cccccc" } } });
          slideObjects.push({ rect: { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: "333333" } } });
      }

      // Logotipos
      coverObjects.push({ image: { x: 0.5, y: 0.5, w: 1, h: 1, data: logoData.startsWith('data:') ? logoData : undefined, path: logoData.startsWith('data:') ? undefined : logoData } });
      slideObjects.push({ image: { x: 9.2, y: 0.1, w: 0.6, h: 0.6, data: logoData.startsWith('data:') ? logoData : undefined, path: logoData.startsWith('data:') ? undefined : logoData } });
      slideObjects.push({ text: { text: "Generado por Inteligencia Artificial - JR-LABS", options: { x: 0.5, y: 5.2, w: 4, h: 0.2, fontSize: 9, color: "aaaaaa" } } });

      // Definir Master para la Portada
      pptx.defineSlideMaster({
        title: "MASTER_COVER",
        background: coverBg,
        objects: coverObjects
      });

      // Definir Master para el Contenido
      pptx.defineSlideMaster({
        title: "MASTER_SLIDE",
        background: slideBg,
        objects: slideObjects
      });

      // Crear Diapositiva Portada
      let slideCover = pptx.addSlide({ masterName: "MASTER_COVER" });
      slideCover.addText(currentPPTXData.tema.toUpperCase(), { 
        x: 1, y: 2.5, w: 8, fontSize: 36, color: plantilla === 'estandar' ? "ffffff" : "002f6c", bold: true, align: "center" 
      });
      slideCover.addText("Perfil de Audiencia: " + currentPPTXData.audiencia, { 
        x: 1, y: 4.5, w: 8, fontSize: 18, color: plantilla === 'estandar' ? "f1c40f" : "8b5cf6", italic: true, align: "center" 
      });

      // Diapositivas de Contenido
      currentPPTXData.slides.forEach(s => {
        let slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        slide.addText(s.title, { 
          x: 0.5, y: 0.15, w: 8, h: 0.5, fontSize: 24, color: "ffffff", bold: true 
        });
        
        let bullets = s.points.map(p => ({ text: p, options: { bullet: true, color: "333333" } }));
        slide.addText(bullets, { 
          x: 0.5, y: 1.2, w: 9, h: 3.5, fontSize: 18, align: "left", valign: "top" 
        });
      });

      pptx.writeFile({ fileName: `Charla_${currentPPTXData.tema.replace(/\s+/g, '_').substring(0,20)}.pptx` });
    });
  }
}

// --- INICIO MÓDULO ETIQUETADO ---
function inicializarModuloEtiquetado() {
  const form = document.getElementById('form-etiquetado');
  const tbody = document.getElementById('tbody-etiquetado');
  const dashboard = document.getElementById('etiquetado-dashboard');
  const datalist = document.getElementById('etiq-modelos-list');

  if (!form || !tbody) return;

  function etiqFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // Cargar modelos desde Configuración Flota
  const dbFlota = JSON.parse(localStorage.getItem('lab_flota') || '[]');
  const modelosFlota = [...new Set(dbFlota.map(eq => eq.modelo).filter(Boolean))];

  // También obtener modelos ya registrados en el historial de etiquetado
  let dbEtiquetado = JSON.parse(localStorage.getItem('lab_equipos_etiquetados') || '[]');
  const modelosEtiquetados = [...new Set(dbEtiquetado.map(eq => eq.modelo).filter(Boolean))];

  // Combinar y poblar datalist
  const todosLosModelos = [...new Set([...modelosFlota, ...modelosEtiquetados])].sort();
  if (datalist) {
    datalist.innerHTML = todosLosModelos.map(m => `<option value="${m}"></option>`).join('');
  }

  function actualizarUI() {
    dbEtiquetado = JSON.parse(localStorage.getItem('lab_equipos_etiquetados') || '[]');
    
    // Purge old schema data if found
    if (dbEtiquetado.length > 0 && typeof dbEtiquetado[0].foto === 'string') {
      dbEtiquetado = [];
      localStorage.setItem('lab_equipos_etiquetados', '[]');
    }

    // Render Dashboard
    let total = dbEtiquetado.length;
    let countsPorModelo = {};
    dbEtiquetado.forEach(eq => {
      let mod = eq.modelo.toUpperCase().trim();
      countsPorModelo[mod] = (countsPorModelo[mod] || 0) + 1;
    });

    let dashHTML = `
      <div class="stat-card" style="background: linear-gradient(135deg, #002f6c, #004b99); color: white; padding: 20px; border-radius: 12px; min-width: 200px;">
        <div style="font-size: 0.9rem; opacity: 0.9;">Total Equipos Etiquetados</div>
        <div style="font-size: 2.5rem; font-weight: bold; margin-top: 10px;">${total}</div>
      </div>
    `;

    for (let mod in countsPorModelo) {
      dashHTML += `
        <div class="stat-card glass-card" style="padding: 20px; border-radius: 12px; min-width: 150px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 0.9rem; color: var(--text-muted);">Modelo: ${mod}</div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--primary); margin-top: 5px;">${countsPorModelo[mod]}</div>
        </div>
      `;
    }
    if (dashboard) dashboard.innerHTML = dashHTML;

    // Render Table
    tbody.innerHTML = '';
    dbEtiquetado.forEach((eq, index) => {
      const tr = document.createElement('tr');
      
      let botonesFotos = (eq.componentes || []).map(c => `
        <button class="btn btn-secondary btn-sm" onclick="window.verFotoEtiquetado(${index}, '${c}')" style="padding: 4px 8px; margin: 2px; font-size: 0.75rem;">
          <i data-lucide="image"></i> ${c}
        </button>
      `).join('');

      tr.innerHTML = `
        <td>${eq.fecha}</td>
        <td><strong>${eq.codigo}</strong></td>
        <td>${eq.modelo}</td>
        <td>${eq.componentes.join(', ')}</td>
        <td style="text-align:center; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;">
          ${botonesFotos}
        </td>
        <td style="text-align:center;">
          <button class="btn btn-danger btn-sm" onclick="window.eliminarEtiquetado(${index})" style="padding: 4px 8px;">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
  }

  // Checkboxes dynamic file inputs logic
  const checkboxesComp = document.querySelectorAll('input[name="etiq-comp"]');
  const contenedorFotos = document.getElementById('contenedor-fotos-dinamicas');
  
  checkboxesComp.forEach(cb => {
    cb.addEventListener('change', () => {
      contenedorFotos.innerHTML = '';
      const checked = document.querySelectorAll('input[name="etiq-comp"]:checked');
      checked.forEach(c => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
          <label style="font-size: 0.85rem; color: var(--primary);"><i data-lucide="camera" style="width: 14px; height: 14px;"></i> Foto para ${c.value}:</label>
          <input type="file" id="etiq-foto-${c.value.replace(/\\W/g, '')}" class="form-control" accept="image/png, image/jpeg" style="padding: 6px;" required>
        `;
        contenedorFotos.appendChild(div);
      });
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const checkboxes = document.querySelectorAll('input[name="etiq-comp"]:checked');
    const compArray = Array.from(checkboxes).map(cb => cb.value);

    if (compArray.length === 0) {
      alert("Por favor selecciona al menos un componente.");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'Guardando...';

    try {
      let fotosObj = {};
      for (let c of compArray) {
        const fileInput = document.getElementById(`etiq-foto-${c.replace(/\\W/g, '')}`);
        if (!fileInput || !fileInput.files.length) {
          throw new Error(`Falta evidencia fotográfica para ${c}.`);
        }
        fotosObj[c] = await etiqFileToBase64(fileInput.files[0]);
      }

      const nuevoRegistro = {
        fecha: document.getElementById('etiq-fecha').value,
        codigo: document.getElementById('etiq-codigo').value,
        modelo: document.getElementById('etiq-modelo').value,
        componentes: compArray,
        fotos: fotosObj
      };

      dbEtiquetado.push(nuevoRegistro);
      localStorage.setItem('lab_equipos_etiquetados', JSON.stringify(dbEtiquetado));
      
      form.reset();
      contenedorFotos.innerHTML = '';
      actualizarUI();

      // Añadir nuevo modelo al datalist dinámicamente si no existe
      if (!todosLosModelos.includes(nuevoRegistro.modelo)) {
        todosLosModelos.push(nuevoRegistro.modelo);
        datalist.innerHTML += `<option value="${nuevoRegistro.modelo}"></option>`;
      }

    } catch (err) {
      console.error(err);
      alert(err.message || "Error al procesar las imágenes.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="save"></i> Registrar Equipo`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  window.verFotoEtiquetado = function(index, componente) {
    let currentDB = JSON.parse(localStorage.getItem('lab_equipos_etiquetados') || '[]');
    const reg = currentDB[index];
    if (reg && reg.fotos && reg.fotos[componente]) {
      document.getElementById('etiq-foto-preview').src = reg.fotos[componente];
      const modal = document.getElementById('modal-foto-etiquetado');
      modal.style.display = 'flex';
      // Animación para que se vuelva opaco
      setTimeout(() => modal.classList.add('active'), 10);
    } else {
      alert("No se encontró la foto para " + componente);
    }
  };

  window.eliminarEtiquetado = function(index) {
    if (confirm("¿Estás seguro de eliminar este registro?")) {
      dbEtiquetado.splice(index, 1);
      localStorage.setItem('lab_equipos_etiquetados', JSON.stringify(dbEtiquetado));
      actualizarUI();
    }
  };

  actualizarUI();
}

// Inicializar el módulo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarModuloEtiquetado);
} else {
  inicializarModuloEtiquetado();
}
// --- FIN MÓDULO ETIQUETADO ---

// --- INICIO MÓDULO CAPACITACIONES ---
function inicializarModuloCapacitaciones() {
  const viewCap = document.getElementById('view-capacitaciones');
  if (!viewCap) return;

  // 1. Manejo de Sub-Pestañas Interiores
  const tabBtns = viewCap.querySelectorAll('.cap-tab-btn');
  const tabContents = viewCap.querySelectorAll('.cap-tab-content');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-captab');
      document.getElementById(targetId).style.display = 'block';

      // Auto-completado del usuario activo
      const localUser = JSON.parse(localStorage.getItem('lubelab_session_user') || 'null');
      if (localUser && localUser.username) {
        if(targetId === 'cap-impartidas') {
          const inputImp = document.getElementById('cap-imp-impartida');
          if(inputImp && !inputImp.value) inputImp.value = localUser.username;
        } else if (targetId === 'cap-recibidas') {
          const inputRec = document.getElementById('cap-rec-nombre');
          if(inputRec && !inputRec.value) inputRec.value = localUser.username;
        }
      }
    });
  });

  // Base64 helper (reused logic)
  function capFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // Elementos HTML
  const formCreada = document.getElementById('form-cap-creada');
  const formRecibida = document.getElementById('form-cap-recibida');
  const formImpartida = document.getElementById('form-cap-impartida');
  
  const selectTemaRec = document.getElementById('cap-rec-tema');
  const selectTemaImp = document.getElementById('cap-imp-tema');
  const inputCatImp = document.getElementById('cap-imp-cat');

  // Helper para gráficos ApexCharts globales
  let chartPersonas = null;
  let chartCursos = null;

  function actualizarUICapacitaciones() {
    const dbCreadas = JSON.parse(localStorage.getItem('lab_cap_creadas') || '[]');
    const dbRecibidas = JSON.parse(localStorage.getItem('lab_cap_recibidas') || '[]');
    const dbImpartidas = JSON.parse(localStorage.getItem('lab_cap_impartidas') || '[]');

    // --- TAB: CREADAS ---
    const tbodyCreadas = document.getElementById('tbody-cap-creadas');
    tbodyCreadas.innerHTML = '';
    dbCreadas.forEach((c, idx) => {
      tbodyCreadas.innerHTML += `
        <tr>
          <td><strong>${c.codigo}</strong></td>
          <td><span class="badge badge-info">${c.categoria}</span></td>
          <td>${c.tema}</td>
          <td style="text-align:center;">
            <button class="btn btn-danger btn-sm" onclick="window.eliminarCapCreada(${idx})"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
    });

    // Actualizar select e input de Temas en otras pestañas
    const optionsImp = `<option value="">-- Selecciona del catálogo --</option>` + 
                       dbCreadas.map(c => `<option value="${c.tema}" data-cat="${c.categoria}">${c.tema}</option>`).join('');
    
    // Para Recibidas usamos datalist (texto libre + sugerencias)
    const datalistRec = document.getElementById('cap-rec-tema-list');
    if(datalistRec) datalistRec.innerHTML = dbCreadas.map(c => `<option value="${c.tema}">`).join('');

    // Para Impartidas sigue estricto
    if(selectTemaImp) selectTemaImp.innerHTML = optionsImp;

    // --- TAB: RECIBIDAS ---
    document.getElementById('dashboard-cap-recibidas').innerHTML = `
      <div class="stat-card" style="background: linear-gradient(135deg, #002f6c, #004b99); color: white; padding: 20px; border-radius: 12px; width: fit-content;">
        <div style="font-size: 0.9rem; opacity: 0.9;">Total Capacitaciones Recibidas</div>
        <div style="font-size: 2.5rem; font-weight: bold; margin-top: 10px; color:#4ade80;">${dbRecibidas.length}</div>
      </div>
    `;
    const tbodyRecibidas = document.getElementById('tbody-cap-recibidas');
    tbodyRecibidas.innerHTML = '';
    dbRecibidas.forEach((r, idx) => {
      tbodyRecibidas.innerHTML += `
        <tr>
          <td>${r.fecha}</td><td>${r.nombre}</td><td>${r.legajo}</td><td>${r.area}</td>
          <td><strong>${r.tema}</strong></td><td>${r.impartida_por}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="window.verFotoCapacitacion('recibidas', ${idx})"><i data-lucide="image"></i> Ver Foto</button>
          </td>
          <td style="text-align:center;">
            <button class="btn btn-danger btn-sm" onclick="window.eliminarCapRecibida(${idx})"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
    });

    // --- TAB: IMPARTIDAS ---
    let totalCursosImp = dbImpartidas.length;
    let totalPersonasImp = dbImpartidas.reduce((sum, curr) => sum + (curr.asistentes ? curr.asistentes.length : 0), 0);

    document.getElementById('dashboard-cap-impartidas').innerHTML = `
      <div class="stat-card glass-card" style="padding: 20px; border-radius: 12px; flex:1;">
        <div style="font-size: 0.9rem; color: var(--text-muted);">Capacitaciones Impartidas (Cursos)</div>
        <div style="font-size: 2.5rem; font-weight: bold; margin-top: 10px; color:var(--primary);">${totalCursosImp}</div>
      </div>
      <div class="stat-card glass-card" style="padding: 20px; border-radius: 12px; flex:1;">
        <div style="font-size: 0.9rem; color: var(--text-muted);">Total Personas Capacitadas</div>
        <div style="font-size: 2.5rem; font-weight: bold; margin-top: 10px; color:#f59e0b;">${totalPersonasImp}</div>
      </div>
    `;

    const tbodyImpartidas = document.getElementById('tbody-cap-impartidas');
    tbodyImpartidas.innerHTML = '';
    
    let statsCatCursos = { '100 - Seguridad':0, '101 - Medio Ambiente':0, '102 - Técnica':0, '103 - General':0 };
    let statsCatPersonas = { '100 - Seguridad':0, '101 - Medio Ambiente':0, '102 - Técnica':0, '103 - General':0 };

    dbImpartidas.forEach((i, idx) => {
      let qAsis = i.asistentes ? i.asistentes.length : 0;
      let catClean = i.categoria || '103 - General';
      
      if(statsCatCursos[catClean] !== undefined) statsCatCursos[catClean]++;
      if(statsCatPersonas[catClean] !== undefined) statsCatPersonas[catClean] += qAsis;

      tbodyImpartidas.innerHTML += `
        <tr>
          <td>${i.fecha}</td>
          <td><strong>${i.tema}</strong></td>
          <td><span class="badge badge-info">${i.categoria}</span></td>
          <td>${i.instructor}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="window.verAsistentesCap(${idx})"><i data-lucide="users"></i> ${qAsis} Personas</button>
          </td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="window.verFotoCapacitacion('impartidas', ${idx})"><i data-lucide="image"></i> Ver Acta</button>
          </td>
          <td style="text-align:center;">
            <button class="btn btn-danger btn-sm" onclick="window.eliminarCapImpartida(${idx})"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
    });

    // Dibujar ApexCharts (destruir anteriores si existen)
    if(window.ApexCharts) {
      if(chartPersonas) chartPersonas.destroy();
      if(chartCursos) chartCursos.destroy();

      let labels = Object.keys(statsCatPersonas);
      let dataP = Object.values(statsCatPersonas);
      let dataC = Object.values(statsCatCursos);
      
      const pieOptions = {
        chart: { type: 'pie', height: 250, foreColor: '#cbd5e1', background: 'transparent' },
        labels: labels,
        colors: ['#ef4444', '#10b981', '#3b82f6', '#8b5cf6'],
        legend: { position: 'right' },
        stroke: { show: false },
        dataLabels: { enabled: true }
      };

      if (dataP.some(v => v > 0)) {
        chartPersonas = new ApexCharts(document.querySelector("#chart-cap-personas"), { ...pieOptions, series: dataP });
        chartPersonas.render();
      } else {
        document.querySelector("#chart-cap-personas").innerHTML = '<div style="color:#64748b;">Aún no hay datos para graficar.</div>';
      }

      if (dataC.some(v => v > 0)) {
        chartCursos = new ApexCharts(document.querySelector("#chart-cap-cursos"), { ...pieOptions, series: dataC });
        chartCursos.render();
      } else {
        document.querySelector("#chart-cap-cursos").innerHTML = '<div style="color:#64748b;">Aún no hay datos para graficar.</div>';
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // EVENTOS CREADAS
  formCreada.addEventListener('submit', (e) => {
    e.preventDefault();
    let db = JSON.parse(localStorage.getItem('lab_cap_creadas') || '[]');
    db.push({
      tema: document.getElementById('cap-creada-tema').value,
      categoria: document.getElementById('cap-creada-cat').value,
      codigo: document.getElementById('cap-creada-codigo').value
    });
    localStorage.setItem('lab_cap_creadas', JSON.stringify(db));
    formCreada.reset();
    actualizarUICapacitaciones();
  });

  window.eliminarCapCreada = (idx) => {
    if(!confirm('¿Eliminar del catálogo?')) return;
    let db = JSON.parse(localStorage.getItem('lab_cap_creadas') || '[]');
    db.splice(idx, 1);
    localStorage.setItem('lab_cap_creadas', JSON.stringify(db));
    actualizarUICapacitaciones();
  };

  // EVENTOS RECIBIDAS
  formRecibida.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formRecibida.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const file = document.getElementById('cap-rec-foto').files[0];
      const foto64 = await capFileToBase64(file);
      let db = JSON.parse(localStorage.getItem('lab_cap_recibidas') || '[]');
      db.push({
        nombre: document.getElementById('cap-rec-nombre').value,
        legajo: document.getElementById('cap-rec-legajo').value,
        area: document.getElementById('cap-rec-area').value,
        fecha: document.getElementById('cap-rec-fecha').value,
        impartida_por: document.getElementById('cap-rec-impartida').value,
        tema: document.getElementById('cap-rec-tema').value,
        foto: foto64
      });
      localStorage.setItem('lab_cap_recibidas', JSON.stringify(db));
      formRecibida.reset();
      actualizarUICapacitaciones();
    } catch(err) {
      alert("Error procesando imagen.");
    } finally {
      btn.disabled = false;
    }
  });

  window.eliminarCapRecibida = (idx) => {
    if(!confirm('¿Eliminar registro?')) return;
    let db = JSON.parse(localStorage.getItem('lab_cap_recibidas') || '[]');
    db.splice(idx, 1);
    localStorage.setItem('lab_cap_recibidas', JSON.stringify(db));
    actualizarUICapacitaciones();
  };

  // EVENTOS IMPARTIDAS
  selectTemaImp.addEventListener('change', () => {
    const selectedOpt = selectTemaImp.options[selectTemaImp.selectedIndex];
    inputCatImp.value = selectedOpt ? selectedOpt.getAttribute('data-cat') || '' : '';
  });

  const inputCant = document.getElementById('cap-imp-cantidad');
  const contAsistentes = document.getElementById('contenedor-asistentes');
  
  inputCant.addEventListener('input', () => {
    let cant = parseInt(inputCant.value) || 0;
    if(cant < 0) cant = 0;
    if(cant > 50) cant = 50; // Límite por seguridad visual
    contAsistentes.innerHTML = '';
    for(let i=1; i<=cant; i++) {
      contAsistentes.innerHTML += `
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; background:var(--bg-secondary); border:1px solid var(--panel-border); padding:10px; border-radius:8px;">
          <strong style="width:30px; color:var(--primary);">${i}.</strong>
          <input type="text" class="form-control asis-nombre" placeholder="Nombre Completo" style="flex:2; min-width:150px;" required>
          <input type="text" class="form-control asis-legajo" placeholder="Legajo" style="flex:1; min-width:100px;" required>
          <input type="text" class="form-control asis-area" placeholder="Área" style="flex:1; min-width:120px;" required>
        </div>
      `;
    }
  });

  formImpartida.addEventListener('submit', async (e) => {
    e.preventDefault();
    let cant = parseInt(inputCant.value) || 0;
    if(cant === 0) return alert("Debe haber al menos 1 asistente.");

    const nombres = document.querySelectorAll('.asis-nombre');
    const legajos = document.querySelectorAll('.asis-legajo');
    const areas = document.querySelectorAll('.asis-area');
    
    let asistentesArray = [];
    for(let i=0; i<cant; i++) {
      asistentesArray.push({
        nombre: nombres[i].value,
        legajo: legajos[i].value,
        area: areas[i].value
      });
    }

    const btn = formImpartida.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const file = document.getElementById('cap-imp-foto').files[0];
      const foto64 = await capFileToBase64(file);
      let db = JSON.parse(localStorage.getItem('lab_cap_impartidas') || '[]');
      db.push({
        tema: document.getElementById('cap-imp-tema').value,
        categoria: inputCatImp.value,
        fecha: document.getElementById('cap-imp-fecha').value,
        instructor: document.getElementById('cap-imp-impartida').value,
        asistentes: asistentesArray,
        foto: foto64
      });
      localStorage.setItem('lab_cap_impartidas', JSON.stringify(db));
      formImpartida.reset();
      contAsistentes.innerHTML = '';
      actualizarUICapacitaciones();
    } catch(err) {
      alert("Error procesando imagen.");
    } finally {
      btn.disabled = false;
    }
  });

  window.eliminarCapImpartida = (idx) => {
    if(!confirm('¿Eliminar acta impartida?')) return;
    let db = JSON.parse(localStorage.getItem('lab_cap_impartidas') || '[]');
    db.splice(idx, 1);
    localStorage.setItem('lab_cap_impartidas', JSON.stringify(db));
    actualizarUICapacitaciones();
  };

  window.verFotoCapacitacion = (tipo, idx) => {
    let dbName = tipo === 'recibidas' ? 'lab_cap_recibidas' : 'lab_cap_impartidas';
    let currentDB = JSON.parse(localStorage.getItem(dbName) || '[]');
    const reg = currentDB[idx];
    if (reg && reg.foto) {
      document.getElementById('cap-foto-preview').src = reg.foto;
      const modal = document.getElementById('modal-foto-cap');
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('active'), 10);
    } else {
      alert("No se encontró la evidencia fotográfica.");
    }
  };

  window.verAsistentesCap = (idx) => {
    let db = JSON.parse(localStorage.getItem('lab_cap_impartidas') || '[]');
    const reg = db[idx];
    if(reg && reg.asistentes) {
      document.getElementById('cap-asistentes-desc').textContent = `Acta: ${reg.tema} (${reg.fecha}) - Instructor: ${reg.instructor}`;
      const tb = document.getElementById('tbody-modal-asistentes');
      tb.innerHTML = reg.asistentes.map(a => `<tr><td>${a.nombre}</td><td>${a.legajo}</td><td>${a.area}</td></tr>`).join('');
      const modal = document.getElementById('modal-asistentes-cap');
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('active'), 10);
    }
  };

  // EVENTOS BUSCADOR
  const buscadorInput = document.getElementById('cap-buscador-input');
  const tbodyBuscador = document.getElementById('tbody-cap-buscador');

  if(buscadorInput) {
    buscadorInput.addEventListener('input', () => {
      const q = buscadorInput.value.toLowerCase().trim();
      if(q.length < 2) {
        tbodyBuscador.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Usa el buscador de arriba para encontrar el historial de asistencias.</td></tr>';
        return;
      }
      
      const dbImpartidas = JSON.parse(localStorage.getItem('lab_cap_impartidas') || '[]');
      const dbRecibidas = JSON.parse(localStorage.getItem('lab_cap_recibidas') || '[]');
      let resultadosHTML = '';

      dbImpartidas.forEach(cap => {
        if(cap.asistentes) {
          cap.asistentes.forEach(asis => {
            if(asis.nombre.toLowerCase().includes(q) || asis.legajo.toLowerCase().includes(q)) {
              resultadosHTML += `
                <tr>
                  <td><strong>${asis.nombre}</strong></td>
                  <td>${asis.legajo}</td>
                  <td>${asis.area}</td>
                  <td>${cap.tema}</td>
                  <td><span class="badge badge-info">${cap.categoria}</span></td>
                  <td>${cap.fecha}</td>
                  <td>${cap.instructor}</td>
                </tr>
              `;
            }
          });
        }
      });

      dbRecibidas.forEach(cap => {
        if(cap.nombre.toLowerCase().includes(q) || cap.legajo.toLowerCase().includes(q)) {
          resultadosHTML += `
            <tr>
              <td><strong>${cap.nombre}</strong></td>
              <td>${cap.legajo}</td>
              <td>${cap.area}</td>
              <td>${cap.tema}</td>
              <td><span class="badge" style="background:var(--success); color:var(--text-primary); font-size:0.7rem; padding: 2px 6px; border-radius:12px;">Recibida</span></td>
              <td>${cap.fecha}</td>
              <td>${cap.impartida_por}</td>
            </tr>
          `;
        }
      });

      if(resultadosHTML === '') {
        tbodyBuscador.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">No se encontraron resultados para esta persona.</td></tr>';
      } else {
        tbodyBuscador.innerHTML = resultadosHTML;
      }
    });
  }

  actualizarUICapacitaciones();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarModuloCapacitaciones);
} else {
  inicializarModuloCapacitaciones();
}
// --- FIN MÓDULO CAPACITACIONES ---

// --- INICIO MÓDULO HISTORIAL (INDEXEDDB) ---
const DB_NAME = 'LubeLabDB';
const DB_VERSION = 1;
const STORE_NAME = 'HistorialMuestras';

window.HistorialDB = {
  db: null,
  init: function() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (e) => reject("IndexedDB error: " + e.target.errorCode);
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('equipo_idx', 'Equipo', { unique: false });
          store.createIndex('componente_idx', 'Componente', { unique: false });
        }
      };
    });
  },
  insertAll: function(records, append = false) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!append) {
          await new Promise((res, rej) => {
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => res();
            tx.onerror = (e) => rej(e);
          });
        }

        // Insertar en lotes seguros para no bloquear la UI ni saturar el navegador
        const batchSize = 3000;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          await new Promise((res, rej) => {
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            for(let j = 0; j < batch.length; j++) {
              store.put(batch[j]);
            }
            tx.oncomplete = () => res();
            tx.onerror = (e) => rej(e);
          });
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  getAll: function() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  clear: function() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  getByEquipoComponente: function(equipo, componente) {
    return new Promise((resolve, reject) => {
      if(!this.db) { resolve([]); return; }
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('equipo_idx');
      const request = index.getAll(IDBKeyRange.only(equipo));
      
      request.onsuccess = () => {
        const results = request.result.filter(r => r.Componente && r.Componente.trim().toUpperCase() === componente.trim().toUpperCase());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }
};

function inicializarModuloHistorial() {
  const fileInput = document.getElementById('historial-upload-input');
  const btnTriggerAppend = document.getElementById('btn-trigger-historial-append');
  const btnTriggerOverride = document.getElementById('btn-trigger-historial-override');
  const btnClear = document.getElementById('btn-clear-historial');
  const statusEl = document.getElementById('historial-status');
  const tbody = document.getElementById('tbody-historial');
  const emptyMsg = document.getElementById('historial-empty-message');

  const searchInput = document.getElementById('historial-search-input');
  const btnPrev = document.getElementById('btn-historial-prev');
  const btnNext = document.getElementById('btn-historial-next');
  const pageInfo = document.getElementById('historial-page-info');
  
  if(!btnTriggerAppend && !btnTriggerOverride) return;

  let currentHistData = [];
  let filteredData = [];
  let currentPage = 1;
  const ITEMS_PER_PAGE = 50;
  let isAppendMode = false;

  function formatValue(v) { return v !== undefined && v !== null && v !== '' ? v : '-'; }

  function renderPage() {
    if(!filteredData || filteredData.length === 0) {
      if(tbody) tbody.innerHTML = '';
      if(emptyMsg) emptyMsg.style.display = 'block';
      if(btnClear) btnClear.style.display = 'none';
      if(pageInfo) pageInfo.textContent = 'Pág. 0 / 0';
      return;
    }
    if(emptyMsg) emptyMsg.style.display = 'none';
    if(btnClear) btnClear.style.display = 'inline-block';
    
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    if(currentPage < 1) currentPage = 1;
    if(currentPage > totalPages) currentPage = totalPages;

    if(pageInfo) pageInfo.textContent = `Pág. ${currentPage} / ${totalPages} (${filteredData.length} reg.)`;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageData = filteredData.slice(startIndex, endIndex);

    if(tbody) {
      tbody.innerHTML = pageData.map(r => `
        <tr>
          <td>${formatValue(r['Fecha Reporte'] || r['Fecha recepcion KIT'])}</td>
          <td><strong>${formatValue(r['Equipo'])}</strong></td>
          <td>${formatValue(r['Componente'])}</td>
          <td><span class="badge ${formatValue(r['Condición']) === 'Normal' ? 'badge-success' : 'badge-danger'}">${formatValue(r['Condición'])}</span></td>
          <td>${formatValue(r['Fe (ppm)'])}</td>
          <td>${formatValue(r['Visc 100°C (cSt)'] || r['Visc 100°C'] || r['Viscosidad 100C'])}</td>
          <td>${formatValue(r['Código ISO'] || r['Codigo ISO'])}</td>
        </tr>
      `).join('');
    }
  }

  function applyFilter() {
    const q = (searchInput.value || '').toLowerCase().trim();
    if (!q) {
      filteredData = currentHistData;
    } else {
      const terms = q.split(',').map(t => t.trim()).filter(t => t);
      
      filteredData = currentHistData.filter(r => {
        const eq = String(r['Equipo'] || '').toLowerCase();
        const nEq = String(r['N° Equipo'] || '').toLowerCase();
        const nCtrl = String(r['N° Control'] || '').toLowerCase();
        const nOT = String(r['N° de OT'] || '').toLowerCase();
        const tipoEq = String(r['Tipo de equipo'] || '').toLowerCase();
        const comp = String(r['Componente'] || '').toLowerCase();
        const iso = String(r['Código ISO'] || r['Codigo ISO'] || '').toLowerCase();
        
        // Verifica que TODOS los términos ingresados existan en alguna parte del registro (Lógica AND)
        return terms.every(term => {
          return eq.includes(term) || nEq.includes(term) || nCtrl.includes(term) || nOT.includes(term) || tipoEq.includes(term) || comp.includes(term) || iso.includes(term);
        });
      });
    }
    currentPage = 1;
    renderPage();
  }

  window.HistorialDB.init().then(() => {
    window.HistorialDB.getAll().then(data => {
      currentHistData = data;
      applyFilter();
      if(data.length > 0 && statusEl) {
        statusEl.textContent = `${data.length.toLocaleString()} registros listos.`;
      }
    });
  });

  if(searchInput) {
    searchInput.addEventListener('input', () => {
      applyFilter();
    });
  }

  if(btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
      }
    });
  }

  if(btnNext) {
    btnNext.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
      if (currentPage < totalPages) {
        currentPage++;
        renderPage();
      }
    });
  }

  if(btnTriggerAppend) {
    btnTriggerAppend.addEventListener('click', () => {
      isAppendMode = true;
      fileInput.click();
    });
  }

  if(btnTriggerOverride) {
    btnTriggerOverride.addEventListener('click', () => {
      if(confirm('ATENCIÓN: Esto borrará la bóveda actual y la reemplazará con el nuevo archivo. ¿Continuar?')) {
        isAppendMode = false;
        fileInput.click();
      }
    });
  }

  if(btnClear) {
    btnClear.addEventListener('click', () => {
      if(confirm('¿Seguro que deseas purgar los miles de registros de la bóveda histórica?')) {
        window.HistorialDB.clear().then(() => {
          statusEl.textContent = 'Historial purgado completamente.';
          currentHistData = [];
          applyFilter();
        });
      }
    });
  }

  if(fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if(statusEl) statusEl.textContent = "Procesando y extrayendo Big Data, por favor espere...";
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, {type: 'binary'});
          
          let targetSheet = workbook.SheetNames[0];
          if(workbook.SheetNames.includes("TABLA GENERAL")) targetSheet = "TABLA GENERAL";
          
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet], { defval: "" });
          
          if (jsonData.length > 0) {
            alert(`Diagnóstico del Sistema: Se lograron extraer exitosamente ${jsonData.length.toLocaleString()} filas del archivo Excel. Presiona Aceptar para inyectarlas en la Bóveda.`);
            if(statusEl) statusEl.textContent = `Inyectando ${jsonData.length.toLocaleString()} filas en la Bóveda IndexedDB por lotes seguros...`;
            
            jsonData.forEach(r => {
              if(typeof r['Fecha Reporte'] === 'number') {
                try {
                  let date = XLSX.SSF.parse_date_code(r['Fecha Reporte']);
                  r['Fecha Reporte'] = `${date.d}/${date.m}/${date.y}`;
                } catch(e){}
              }
            });

            window.HistorialDB.insertAll(jsonData, isAppendMode).then(() => {
              window.HistorialDB.getAll().then(allData => {
                currentHistData = allData;
                applyFilter();
                if(statusEl) statusEl.textContent = `¡Bóveda Alimentada! Total: ${allData.length.toLocaleString()} registros.`;
              });
              fileInput.value = ''; // Reset
            }).catch(err => {
              if(statusEl) statusEl.textContent = "Error escribiendo en BD local.";
              console.error(err);
            });
          } else {
            if(statusEl) statusEl.textContent = "El archivo parece estar vacío o no contiene datos en la hoja inicial.";
          }
        } catch (error) {
          console.error(error);
          if(statusEl) statusEl.textContent = "Error crítico leyendo el archivo. ¿Está encriptado con contraseña?";
        }
      };
      reader.readAsBinaryString(file);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarModuloHistorial);
} else {
  inicializarModuloHistorial();
}
// --- FIN MÓDULO HISTORIAL ---

window.addEventListener('resize', () => {
  if (window.inspRendimientoGauge) window.inspRendimientoGauge.resize();
  if (window.inspTrendRendimiento) window.inspTrendRendimiento.resize();
});



window.abrirLegal = function() {
  document.getElementById('modal-info-legal').style.display = 'flex';
};
window.cerrarLegal = function() {
  document.getElementById('modal-info-legal').style.display = 'none';
};
