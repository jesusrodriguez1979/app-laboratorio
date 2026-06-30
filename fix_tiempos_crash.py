import codecs

with codecs.open('app_v3.js', 'r', 'utf-8') as f:
    code = f.read()

target_str = "'view-historial': { title: 'B\u00f3veda Hist\u00f3rica', subtitle: 'Importaci\u00f3n masiva de resultados estad\u00edsticos del laboratorio (Big Data)' }"

replacement = target_str + ",\n      'view-tiempos': { title: 'Gesti\u00f3n de Tiempos', subtitle: 'An\u00e1lisis y distribuci\u00f3n de tiempos de ciclo y cuellos de botella' }"

if target_str in code:
    code = code.replace(target_str, replacement)
    with codecs.open('app_v3.js', 'w', 'utf-8') as f:
        f.write(code)
    print("Fix applied successfully.")
else:
    print("Target string not found in app_v3.js.")
