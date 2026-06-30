import codecs

with codecs.open('app_v3.js', 'r', 'utf-8') as f:
    code = f.read()

# Fix the literal \n
code = code.replace('\\nfunction inicializarModuloQC() {', '\nfunction inicializarModuloQC() {')

with codecs.open('app_v3.js', 'w', 'utf-8') as f:
    f.write(code)
print("Fix aplicado")
