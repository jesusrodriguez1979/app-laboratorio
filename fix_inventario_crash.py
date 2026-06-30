import codecs

with codecs.open('app_v3.js', 'r', 'utf-8') as f:
    code = f.read()

target_str = "'view-tiempos': { title: 'Gesti\u00f3n de Tiempos', subtitle: 'An\u00e1lisis y distribuci\u00f3n de tiempos de ciclo y cuellos de botella' }"
replacement = target_str + ",\n      'view-inventario': { title: 'Inventario y Costos', subtitle: 'Control de insumos y consumibles del laboratorio' }"

if target_str in code:
    code = code.replace(target_str, replacement)
    with codecs.open('app_v3.js', 'w', 'utf-8') as f:
        f.write(code)
    print("Fix inventario aplicado con exito.")
else:
    print("No se encontro target_str en app_v3.js")
