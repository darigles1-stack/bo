import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.SERVER_PORT || 3031;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGODB_DATABASE || 'salminus_audit';
const AUDIT_MS_URL = process.env.AUDIT_MS_URL || 'http://localhost:8089';
const PREF_MS_URL = process.env.PREF_MS_URL || 'http://localhost:8099';

app.use(cors());
app.use(express.json());

let mongoClient = null;
let db = null;

async function getDb() {
  if (db) return db;
  try {
    mongoClient = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    await mongoClient.connect();
    db = mongoClient.db(MONGO_DB);
    console.log(`[MongoDB] Conectado exitosamente a ${MONGO_URI}/${MONGO_DB}`);
    return db;
  } catch (err) {
    db = null;
    throw err;
  }
}

// 1. Estado de conectividad de MongoDB
app.get('/api/mongo/status', async (req, res) => {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    const colOps = database.collection('audit_operations');
    const colEvents = database.collection('audit_events');
    const countOps = await colOps.countDocuments();
    const countEvents = await colEvents.countDocuments();
    res.json({
      status: 'UP',
      uri: MONGO_URI,
      database: MONGO_DB,
      totalOperations: countOps,
      totalEvents: countEvents,
      primaryCollection: 'audit_operations',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      uri: MONGO_URI,
      database: MONGO_DB,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 2. Nivel A – Consulta consolidada de operaciones de usuario (audit_operations)
app.get('/api/mongo/operations', async (req, res) => {
  try {
    const database = await getDb();
    const col = database.collection('audit_operations');

    const filter = {};
    if (req.query.cuil) {
      filter['usuario.cuil'] = req.query.cuil.trim();
    }
    if (req.query.traceId) {
      filter.traceId = req.query.traceId.trim();
    }
    if (req.query.channel || req.query.canal) {
      filter.canal = (req.query.channel || req.query.canal).trim().toUpperCase();
    }
    if (req.query.service || req.query.servicio) {
      filter['operacion.servicio'] = (req.query.service || req.query.servicio).trim();
    }
    if (req.query.estado) {
      filter.estado = req.query.estado.trim().toUpperCase();
    }
    if (req.query.codigoOperacion) {
      filter['operacion.codigo'] = req.query.codigoOperacion.trim().toUpperCase();
    }
    if (req.query.from || req.query.to) {
      filter.fechaHora = {};
      if (req.query.from) filter.fechaHora.$gte = new Date(req.query.from);
      if (req.query.to) filter.fechaHora.$lte = new Date(req.query.to);
    }

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

    // Proyección liviana: excluimos el array voluminoso 'pasos' para que el listado sea ultra rápido
    const operations = await col.find(filter, { projection: { pasos: 0 } })
      .sort({ fechaHora: -1, _id: -1 })
      .limit(limit)
      .toArray();

    res.json({
      count: operations.length,
      filter,
      operations
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error consultando operaciones consolidadas en MongoDB: ' + err.message
    });
  }
});

// 3. Detalle completo de una operación por traceId (con árbol de pasos)
app.get('/api/mongo/operations/:traceId', async (req, res) => {
  try {
    const database = await getDb();
    const traceId = req.params.traceId;
    const colOps = database.collection('audit_operations');
    
    let op = await colOps.findOne({ traceId });
    if (op && op.pasos && op.pasos.length > 0) {
      return res.json(op);
    }

    // Fallback si viene de registros legados sin pasos consolidados
    const colEvents = database.collection('audit_events');
    const colLegacy = database.collection('audit_full_payloads');
    let steps = await colEvents.find({ traceId }).sort({ stepOrder: 1, timestamp: 1 }).toArray();
    if (steps.length === 0) {
      steps = await colLegacy.find({ traceId }).sort({ stepOrder: 1, timestamp: 1 }).toArray();
    }

    if (!op && steps.length === 0) {
      return res.status(404).json({ error: 'Operación no encontrada para traceId: ' + traceId });
    }

    if (!op) {
      const root = steps[0];
      op = {
        traceId,
        fechaHora: root.timestamp,
        usuario: { cuil: root.userCuil, alias: root.userAlias },
        canal: root.channel,
        operacion: { servicio: root.serviceName, endpoint: root.endpoint },
        estado: 'SUCCESS',
        duracionTotalMs: root.durationMs || 0,
        cantidadPasos: steps.length,
        pasos: steps
      };
    } else {
      op.pasos = steps;
    }

    res.json(op);
  } catch (err) {
    res.status(500).json({
      error: 'Error consultando detalle de operación en MongoDB: ' + err.message
    });
  }
});

// 4. Consulta de logs legados directa a la colección 'audit_full_payloads' / 'audit_events'
app.get('/api/mongo/logs', async (req, res) => {
  try {
    const database = await getDb();
    const col = database.collection('audit_events');

    const filter = {};
    if (req.query.cuil) {
      filter.userCuil = req.query.cuil.trim();
    }
    if (req.query.traceId) {
      filter.traceId = req.query.traceId.trim();
    }
    if (req.query.channel) {
      filter.channel = req.query.channel.trim();
    }
    if (req.query.service) {
      filter.serviceName = req.query.service.trim();
    }
    if (req.query.statusCategory) {
      filter.statusCategory = req.query.statusCategory.trim();
    }

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

    let logs = await col.find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit)
      .toArray();

    if (logs.length === 0) {
      const colLegacy = database.collection('audit_full_payloads');
      logs = await colLegacy.find(filter)
        .sort({ timestamp: -1, _id: -1 })
        .limit(limit)
        .toArray();
    }

    res.json({
      count: logs.length,
      filter,
      logs
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error consultando logs directamente en MongoDB: ' + err.message
    });
  }
});

// 5. Consulta de traza Padre-Hijo directa a MongoDB
app.get('/api/mongo/trace/:traceId', async (req, res) => {
  try {
    const database = await getDb();
    const traceId = req.params.traceId;

    // Primero revisar si está consolidada en audit_operations con sus pasos
    const colOps = database.collection('audit_operations');
    const op = await colOps.findOne({ traceId });
    if (op && op.pasos && op.pasos.length > 0) {
      return res.json({
        traceId,
        stepCount: op.pasos.length,
        steps: op.pasos
      });
    }

    const colEvents = database.collection('audit_events');
    let traceSteps = await colEvents.find({ traceId })
      .sort({ stepOrder: 1, timestamp: 1 })
      .toArray();

    if (traceSteps.length === 0) {
      const colLegacy = database.collection('audit_full_payloads');
      traceSteps = await colLegacy.find({ traceId })
        .sort({ stepOrder: 1, timestamp: 1 })
        .toArray();
    }

    res.json({
      traceId,
      stepCount: traceSteps.length,
      steps: traceSteps
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error consultando traza en MongoDB: ' + err.message
    });
  }
});

// 4. Explorador de colecciones en salminus_audit
app.get('/api/mongo/collections', async (req, res) => {
  try {
    const database = await getDb();
    const collections = await database.listCollections().toArray();
    const results = [];
    for (const c of collections) {
      const col = database.collection(c.name);
      const count = await col.countDocuments();
      results.push({ name: c.name, count });
    }
    res.json({
      database: MONGO_DB,
      collections: results
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error listando colecciones en MongoDB: ' + err.message
    });
  }
});

// 5. Proxy hacia ms-audit
app.all('/api/proxy/audit/*', (req, res) => {
  const targetPath = req.url.replace('/api/proxy/audit', '/api/v1/audit');
  proxyRequest(AUDIT_MS_URL, targetPath, req, res);
});

// 6. Proxy hacia ms-preferencia
app.all('/api/proxy/pref/*', (req, res) => {
  const targetPath = req.url.replace('/api/proxy/pref', '');
  proxyRequest(PREF_MS_URL, targetPath, req, res);
});

function proxyRequest(targetBaseUrl, targetPath, req, res) {
  const targetUrl = new URL(targetPath, targetBaseUrl);
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${targetUrl.hostname}:${targetUrl.port}`
    },
    timeout: 3000
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (e) => {
    res.status(502).json({
      error: `No se pudo conectar con el microservicio (${targetBaseUrl}): ${e.message}`
    });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
}

// 7. Servir archivos estáticos de React (dist) si existen
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[SALMINUS BACKOFFICE SERVER] Backend API y Proxy corriendo en http://localhost:${PORT}`);
  console.log(` - MongoDB API:   http://localhost:${PORT}/api/mongo/status`);
  console.log(` - Proxy ms-audit: http://localhost:${PORT}/api/proxy/audit/*`);
  console.log(` - Proxy ms-pref:  http://localhost:${PORT}/api/proxy/pref/*`);
  if (fs.existsSync(distPath)) {
    console.log(` - Frontend React: http://localhost:${PORT}`);
  }
});

