import codecs
import re

with codecs.open('app_v3.js', 'r', 'utf-8') as f:
    js = f.read()

# 1. Add infoPestañasPersonal and update infoPestañasGestion
js = js.replace("'view-objetivos': { title: 'Objetivos 2026', subtitle: 'Control y seguimiento de avance de objetivos' },", "")
js = js.replace("'view-charlas': { title: 'Generador Charlas IA', subtitle: 'Generaci\u00f3n asistida de charlas de 5 minutos' },", "")
js = js.replace("'view-capacitaciones': { title: 'Capacitaciones', subtitle: 'Gesti\u00f3n general de capacitaciones creadas, recibidas e impartidas' },", "")
js = js.replace("'view-tiempos': { title: 'Gesti\u00f3n de Tiempos', subtitle: 'An\u00e1lisis y distribuci\u00f3n de tiempos de ciclo y cuellos de botella' },", "")

info_personal = """
  const infoPesta\u00f1asPersonal = {
      'view-objetivos': { title: 'Objetivos 2026', subtitle: 'Control y seguimiento de avance de objetivos' },
      'view-charlas': { title: 'Generador Charlas IA', subtitle: 'Generaci\u00f3n asistida de charlas de 5 minutos' },
      'view-capacitaciones': { title: 'Capacitaciones', subtitle: 'Gesti\u00f3n general de capacitaciones creadas, recibidas e impartidas' },
      'view-tiempos': { title: 'Gesti\u00f3n de Tiempos', subtitle: 'An\u00e1lisis y distribuci\u00f3n de tiempos de ciclo y cuellos de botella' }
  };
"""

target_insert = "const infoPesta\u00f1asInspeccion = {"
if target_insert in js and "infoPestañasPersonal" not in js:
    js = js.replace(target_insert, info_personal + "\n  " + target_insert)

# 2. Add consolePersonal reference
js = js.replace("const consoleAdmin = document.getElementById('console-admin');", 
                "const consoleAdmin = document.getElementById('console-admin');\n  const consolePersonal = document.getElementById('console-personal');")

# 3. Handle btn-enter-personal in actualizarOpcionesSegunRol
auth_logic = """
    const btnPersonal = document.getElementById('btn-enter-personal');
    if (btnPersonal) {
      const cardPersonal = btnPersonal.closest('.glass-card');
      if (sessionUser && sessionUser.role === 'Administrador') {
        cardPersonal.style.display = 'block';
      } else {
        cardPersonal.style.display = 'none';
      }
    }
"""
if "const btnPersonal" not in js:
    js = js.replace("const btnAdmin = document.getElementById('btn-enter-admin');", 
                    auth_logic + "\n    const btnAdmin = document.getElementById('btn-enter-admin');")

# 4. Handle btn-enter-personal click event
click_logic = """
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
      activarPesta\u00f1aSidebar(consolePersonal, 'view-objetivos');
      cargarSeccionObjetivos();
    });
  }
"""
if "btnEnterPersonal.addEventListener" not in js:
    js = js.replace("document.querySelectorAll('.btn-back-hub').forEach(btn => {", 
                    click_logic + "\n  document.querySelectorAll('.btn-back-hub').forEach(btn => {")


# 5. Handle titles for consolePersonal in Sidebar item click event
title_logic = """} else if (branch === 'console-personal') {
      const info = infoPesta\u00f1asPersonal[targetViewId];
      if (info) {
        document.getElementById('personal-view-title').textContent = info.title;
        document.getElementById('personal-view-subtitle').textContent = info.subtitle;
      }
    """
if "branch === 'console-personal'" not in js:
    js = re.sub(r"\} else if \(branch === 'console-visor'\) \{", 
                title_logic + "\n    } else if (branch === 'console-visor') {", js)

# 6. Ensure consolePersonal is hidden when going back to hub
if "consolePersonal.classList.add('hidden')" not in js:
    js = js.replace("consoleInspeccion.classList.add('hidden');\n        consoleAdmin.classList.add('hidden');", 
                    "consoleInspeccion.classList.add('hidden');\n        consoleAdmin.classList.add('hidden');\n        if(consolePersonal) consolePersonal.classList.add('hidden');")

with codecs.open('app_v3_new.js', 'w', 'utf-8') as f:
    f.write(js)
print("app_v3 modified.")
