import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBIZPkopdC501zrP9rEzxaI9D9rBSpcMio",
  authDomain: "jr-laboratorio.firebaseapp.com",
  projectId: "jr-laboratorio",
  storageBucket: "jr-laboratorio.firebasestorage.app",
  messagingSenderId: "62631400839",
  appId: "1:62631400839:web:2331a94ba54ad78f406f22",
  measurementId: "G-JGPRVGKE9P"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storageDoc = doc(db, 'lab_data', 'storage');

let isSyncing = false;
let isInitialized = false;

// Interceptar llamadas a localStorage.setItem para guardar en Firebase (Solo nuestras llaves)
const originalSetItem = localStorage.setItem.bind(localStorage);

localStorage.setItem = async function(key, value) {
    originalSetItem(key, value); // Guardar localmente primero (síncrono)
    
    // Solo enviar a Firebase si es una llave de nuestra app y no estamos en medio de una sinc local
    if (!isSyncing && (key.startsWith('QC_') || key.startsWith('lubelab_'))) {
        try {
            await setDoc(storageDoc, { [key]: value }, { merge: true });
        } catch (e) {
            console.error("Error guardando en la nube:", e);
        }
    }
};

// Escuchar cambios desde la base de datos (Ej: Cuando otro usuario edita algo)
onSnapshot(storageDoc, async (snapshot) => {
    if (!snapshot.exists()) {
        // Primera vez: La base de datos está vacía, subir nuestros datos locales
        console.log("Inicializando Base de Datos en la Nube con los datos locales...");
        const initialData = {};
        let hasData = false;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('QC_') || key.startsWith('lubelab_')) {
                initialData[key] = localStorage.getItem(key);
                hasData = true;
            }
        }
        if (hasData) {
            isSyncing = true;
            await setDoc(storageDoc, initialData);
            isSyncing = false;
        }
        isInitialized = true;
    } else {
        // Descargar cambios de la nube
        const data = snapshot.data();
        isSyncing = true;
        let changed = false;
        for (const [key, value] of Object.entries(data)) {
            if (localStorage.getItem(key) !== value) {
                originalSetItem(key, value);
                changed = true;
            }
        }
        isSyncing = false;
        
        // Si llegaron datos nuevos de la nube, forzar que la pantalla se actualice
        if (changed && isInitialized) {
            console.log("Datos de la nube recibidos, actualizando pantallas...");
            window.dispatchEvent(new Event('cloud-update'));
        }
        isInitialized = true;
    }
});

// Registrar eventos de actualización global para repintar las pantallas
window.addEventListener('cloud-update', () => {
    if (typeof window.actualizarSelectorDeEstandaresPrincipal === 'function') window.actualizarSelectorDeEstandaresPrincipal();
    if (typeof window.renderSubcomponents === 'function') window.renderSubcomponents();
    
    if (typeof window.renderCatalogo === 'function') window.renderCatalogo();
    if (typeof window.renderMovimientos === 'function') window.renderMovimientos();
    if (typeof window.actualizarDashboardInv === 'function') window.actualizarDashboardInv();
});
