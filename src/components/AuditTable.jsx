import React, { useState, useMemo } from 'react';
import { Search, Eye, GitBranch, ShieldCheck, Clock, Server, User, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export default function AuditTable({
  logs = [],
  isLoading,
  onViewPayload,
  onViewTrace
}) {
  const [filterCuil, setFilterCuil] = useState('');
  const [filterTrace, setFilterTrace] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  // Filtrado local reactivo sobre audit_operations
  const filteredOperations = useMemo(() => {
    return logs.filter((op) => {
      const cuil = op.usuario?.cuil || op.userCuil || '';
      const trace = op.traceId || '';
      const canal = op.canal || op.channel || '';
      const servicio = op.operacion?.servicio || op.servicio || op.serviceName || '';
      const estado = op.estado || (op.statusCode >= 500 ? 'ERROR' : (op.statusCode >= 400 ? 'WARNING' : 'SUCCESS'));

      if (filterCuil && !String(cuil).toLowerCase().includes(filterCuil.toLowerCase())) return false;
      if (filterTrace && !String(trace).toLowerCase().includes(filterTrace.toLowerCase())) return false;
      if (filterChannel && canal !== filterChannel) return false;
      if (filterService && servicio !== filterService) return false;
      if (filterEstado && estado !== filterEstado) return false;
      return true;
    });
  }, [logs, filterCuil, filterTrace, filterChannel, filterService, filterEstado]);

  // Canales y servicios únicos
  const channels = useMemo(() => Array.from(new Set(logs.map(l => l.canal || l.channel).filter(Boolean))), [logs]);
  const services = useMemo(() => Array.from(new Set(logs.map(l => l.operacion?.servicio || l.servicio || l.serviceName).filter(Boolean))), [logs]);

  // Helper de badges de estado consolidado
  const getEstadoBadge = (estado, statusCode) => {
    const est = (estado || '').toUpperCase();
    if (est === 'ERROR' || (statusCode && statusCode >= 500)) {
      return (
        <span className="badge badge-5xx" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <XCircle size={13} /> ERROR
        </span>
      );
    }
    if (est === 'WARNING' || (statusCode && statusCode >= 400)) {
      return (
        <span className="badge badge-4xx" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <AlertTriangle size={13} /> WARNING
        </span>
      );
    }
    if (est === 'PARTIAL') {
      return (
        <span className="badge" style={{ background: 'rgba(156, 163, 175, 0.2)', color: '#d1d5db', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Info size={13} /> PARTIAL
        </span>
      );
    }
    return (
      <span className="badge badge-2xx" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
        <CheckCircle2 size={13} /> SUCCESS
      </span>
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  return (
    <div>
      {/* Metrics Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(0, 210, 255, 0.1)', padding: '0.65rem', borderRadius: '8px', color: '#00d2ff' }}>
            <Server size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operaciones de Usuario</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>{filteredOperations.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.65rem', borderRadius: '8px', color: '#10b981' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exitosas (SUCCESS)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#34d399' }}>
              {filteredOperations.filter(l => (l.estado === 'SUCCESS' || (!l.estado && l.statusCode < 400))).length}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.65rem', borderRadius: '8px', color: '#ef4444' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fallos (ERROR / WARNING)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f87171' }}>
              {filteredOperations.filter(l => l.estado === 'ERROR' || l.estado === 'WARNING' || l.statusCode >= 400).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="input-group">
          <label className="input-label">Buscar por CUIL</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej: 20328364477"
            value={filterCuil}
            onChange={(e) => setFilterCuil(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Buscar por Trace ID</label>
          <input
            type="text"
            className="input-field"
            placeholder="W3C Trace ID hex..."
            value={filterTrace}
            onChange={(e) => setFilterTrace(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Canal</label>
          <select
            className="input-field"
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
          >
            <option value="">Todos los canales</option>
            {channels.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Microservicio</label>
          <select
            className="input-field"
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
          >
            <option value="">Todos los servicios</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Estado</label>
          <select
            className="input-field"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="SUCCESS">SUCCESS (Exitoso)</option>
            <option value="WARNING">WARNING (Negocio 4XX)</option>
            <option value="ERROR">ERROR (Servidor/BTS 5XX)</option>
            <option value="PARTIAL">PARTIAL (En curso)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setFilterCuil('');
              setFilterTrace('');
              setFilterChannel('');
              setFilterService('');
              setFilterEstado('');
            }}
            title="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Usuario (CUIL / Nombre)</th>
              <th>Canal</th>
              <th>Operación de Negocio / Servicio</th>
              <th>Estado</th>
              <th>Duración</th>
              <th>Pasos Traza</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && logs.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <div className="pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search size={18} /> Cargando operaciones consolidadas desde audit_operations...
                  </div>
                </td>
              </tr>
            ) : filteredOperations.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No se encontraron operaciones de usuario que coincidan con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredOperations.map((op, idx) => {
                const cuil = op.usuario?.cuil || op.userCuil || 'ANÓNIMO';
                const nombre = op.usuario?.nombre || (op.usuario?.alias ? `@${op.usuario.alias}` : null);
                const descripcion = op.operacion?.descripcion || op.descripcion || 'Operación de usuario';
                const servicio = op.operacion?.servicio || op.servicio || op.serviceName || 'ms';
                const codigo = op.operacion?.codigo || op.codigoOperacion || '';
                const canal = op.canal || op.channel || 'BANCAWEB';
                const fecha = op.fechaHora || op.timestamp;
                const duracion = op.duracionTotalMs ?? op.durationMs ?? 0;
                const cantPasos = op.cantidadPasos ?? (op.pasos ? op.pasos.length : 1);

                return (
                  <tr 
                    key={op.traceId || op._id || idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewTrace(op.traceId)}
                    title="Hacé clic para inspeccionar la traza jerárquica Padre-Hijo"
                  >
                    <td className="mono-text" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {formatDate(fecha)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f3f4f6', fontFamily: 'var(--font-mono)' }}>
                        {cuil}
                      </div>
                      {nombre && (
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                          {nombre}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-channel">
                        {canal}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.88rem' }}>
                        {descripcion}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '3px' }}>
                        <span className="badge badge-service" style={{ fontSize: '0.65rem' }}>
                          {servicio}
                        </span>
                        {codigo && (
                          <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.05)', color: '#9ca3af' }}>
                            {codigo}
                          </span>
                        )}
                        {op.operacion?.endpoint && (
                          <span className="mono-text" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {op.operacion.endpoint}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {getEstadoBadge(op.estado, op.statusCode)}
                    </td>
                    <td className="mono-text">
                      <span style={{ color: duracion > 800 ? '#f59e0b' : '#34d399', fontWeight: 600 }}>
                        {duracion} ms
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(0, 210, 255, 0.12)', color: '#00d2ff', fontWeight: 600 }}>
                        {cantPasos} {cantPasos === 1 ? 'paso' : 'pasos'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onViewTrace(op.traceId)}
                        title="Ver detalle y cascada Padre-Hijo"
                      >
                        <GitBranch size={13} /> Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
