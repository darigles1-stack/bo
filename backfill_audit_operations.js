import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'salminus_audit';

async function runBackfill() {
  console.log(`[Backfill] Conectando a MongoDB: ${MONGO_URI}/${DB_NAME}`);
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const sourceCol = db.collection('audit_full_payloads');
    const targetCol = db.collection('audit_operations');

    console.log('[Backfill] Asegurando índices en audit_operations...');
    await targetCol.createIndex({ traceId: 1 }, { unique: true });
    await targetCol.createIndex({ fechaHora: -1 });
    await targetCol.createIndex({ 'usuario.cuil': 1, fechaHora: -1 });
    await targetCol.createIndex({ canal: 1, fechaHora: -1 });
    await targetCol.createIndex({ estado: 1, fechaHora: -1 });
    await targetCol.createIndex({ 'operacion.servicio': 1, fechaHora: -1 });
    await targetCol.createIndex({ 'operacion.codigo': 1, fechaHora: -1 });

    console.log('[Backfill] Obteniendo lista de traceIds distintos...');
    const traceIds = await sourceCol.distinct('traceId');
    console.log(`[Backfill] Encontrados ${traceIds.length} traceIds para procesar.`);

    let processedCount = 0;

    for (const traceId of traceIds) {
      if (!traceId) continue;

      const events = await sourceCol.find({ traceId }).sort({ stepOrder: 1, timestamp: 1 }).toArray();
      if (!events || events.length === 0) continue;

      const root = events[0];
      const pasos = events.map(e => ({
        stepOrder: e.stepOrder || 0,
        spanId: e.spanId,
        parentSpanId: e.parentSpanId,
        eventType: e.eventType,
        nombre: e.serviceName,
        descripcion: e.descripcionPaso || `${e.serviceName} ${e.httpMethod || ''} ${e.endpoint || ''}`.trim(),
        destino: (e.endpoint && e.endpoint.includes('bantotal')) ? 'Bantotal Core BTS' : e.serviceName,
        endpoint: e.endpoint,
        httpMethod: e.httpMethod,
        statusCode: e.statusCode || 200,
        statusCategory: e.statusCategory || '2XX_SUCCESS',
        durationMs: e.durationMs || 0,
        requestPayload: e.requestPayload,
        responsePayload: e.responsePayload,
        timestamp: e.timestamp || new Date()
      }));

      // Calcular estado global
      let hasError = pasos.some(p => p.statusCode >= 500 || (p.statusCategory && p.statusCategory.includes('5XX')));
      let hasWarning = !hasError && pasos.some(p => (p.statusCode >= 400 && p.statusCode < 500) || (p.statusCategory && p.statusCategory.includes('4XX')));
      let estado = hasError ? 'ERROR' : (hasWarning ? 'WARNING' : 'SUCCESS');

      // Calcular duraciones y fechas
      const dates = events.map(e => new Date(e.timestamp || 0)).filter(d => !isNaN(d.getTime()));
      const minDate = dates.length ? new Date(Math.min(...dates)) : new Date();
      const maxDate = dates.length ? new Date(Math.max(...dates)) : new Date();
      const maxDuration = Math.max(...pasos.map(p => p.durationMs), maxDate.getTime() - minDate.getTime(), 0);

      const consolidated = {
        traceId,
        fechaHora: minDate,
        fechaFin: maxDate,
        usuario: {
          cuil: root.userCuil || null,
          alias: root.userAlias || null,
          nombre: root.nombreUsuario || null
        },
        canal: root.channel || 'CANAL_GENERICO',
        dispositivo: {
          deviceId: root.deviceId || null,
          ip: root.deviceInfo ? root.deviceInfo.ip : null,
          browser: root.deviceInfo ? (root.deviceInfo.browser || root.deviceInfo.userAgent) : null
        },
        operacion: {
          codigo: root.codigoOperacion || `${(root.serviceName || 'OP').toUpperCase().replace('-', '_')}`,
          descripcion: root.descripcionOperacion || `${root.serviceName || ''} ${root.endpoint || ''}`.trim(),
          servicio: root.serviceName,
          servicePackage: root.servicePackage,
          endpoint: root.endpoint,
          httpMethod: root.httpMethod
        },
        estado,
        statusCode: root.statusCode || 200,
        statusCategory: root.statusCategory || '2XX_SUCCESS',
        duracionTotalMs: maxDuration,
        cantidadPasos: pasos.length,
        environment: root.environment || 'dev',
        podName: root.podName || null,
        pciDssSanitized: root.pciDssSanitized !== false,
        pasos,
        createdAt: minDate,
        updatedAt: new Date()
      };

      await targetCol.updateOne(
        { traceId },
        { $set: consolidated },
        { upsert: true }
      );

      processedCount++;
    }

    console.log(`[Backfill] Finalizado exitosamente. Total consolidados: ${processedCount}`);
  } catch (err) {
    console.error('[Backfill] Error durante el proceso:', err);
  } finally {
    await client.close();
  }
}

runBackfill();
