const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DB_FILE = path.join(__dirname, 'db.json');

// Mapeo de tipos MIME para archivos estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = req.url;
  const urlPath = url.split('?')[0];
  const method = req.method;

  console.log(`${method} ${url}`);

  // --- Endpoints de API para Base de Datos Compartida ---
  if (urlPath === '/api/data') {
    if (method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      if (fs.existsSync(DB_FILE)) {
        try {
          const data = fs.readFileSync(DB_FILE, 'utf8');
          res.statusCode = 200;
          return res.end(data);
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'Error al leer la base de datos centralizada' }));
        }
      } else {
        // Si no existe la base de datos, retornamos un objeto vacío
        res.statusCode = 200;
        return res.end(JSON.stringify({}));
      }
    } 
    
    if (method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          // Validar que sea JSON correcto antes de guardar
          JSON.parse(body);
          fs.writeFileSync(DB_FILE, body, 'utf8');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Formato de datos no válido' }));
        }
      });
      return;
    }
  }

  // --- Servidor de Archivos Estáticos ---
  if (method === 'GET') {
    let relPath = urlPath === '/' ? '/index.html' : urlPath;
    // Evitar ataques de Directory Traversal
    relPath = relPath.replace(/\.\./g, '');
    const filePath = path.join(__dirname, relPath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end('<h1>404 - Archivo no encontrado</h1>');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
  } else {
    res.statusCode = 405;
    res.end('Método no permitido');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================================`);
  console.log(`  JR-LABS Server - Ejecutándose en Red Compartida`);
  console.log(`  Acceso Local: http://localhost:${PORT}/`);
  console.log(`  Acceso en Red: http://0.0.0.0:${PORT}/`);
  console.log(`  (Consulte su IP local para acceder desde otra computadora)`);
  console.log(`=========================================================`);
});
