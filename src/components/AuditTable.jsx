import React, { useMemo, useState } from 'react';
import {
  Search,
  GitBranch,
  Server,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

export default function AuditTable({ logs = [], isLoading, onViewTrace }) {
  const [filterCuil, setFilterCuil] = useState('');
  const [filterTrace, setFilterTrace] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const filteredOperations = useMemo(() => {
    return logs.filter((op) => {
      const cuil = op.usuario?.cuil || op.userCuil || '';
      const trace = op.traceId || '';
      const canal = op.canal || op.channel || '';
      const servicio = op.operacion?.servicio || op.servicio || op.serviceName || '';
      const estado =
        op.estado ||
        (op.statusCode >= 500 ? 'ERROR' : op.statusCode >= 400 ? 'WARNING' : 'SUCCESS');

      if (filterCuil && !String(cuil).toLowerCase().includes(filterCuil.toLowerCase())) return false;
      if (filterTrace && !String(trace).toLowerCase().includes(filterTrace.toLowerCase())) return false;
      if (filterChannel && canal !== filterChannel) return false;
      if (filterService && servicio !== filterService) return false;
      if (filterEstado && estado !== filterEstado) return false;
      return true;
    });
  }, [logs, filterCuil, filterTrace, filterChannel, filterService, filterEstado]);

  const channels = useMemo(
    () => Array.from(new Set(logs.map((l) => l.canal || l.channel).filter(Boolean))),
    [logs]
  );
  const services = useMemo(
    () =>
      Array.from(
        new Set(logs.map((l) => l.operacion?.servicio || l.servicio || l.serviceName).filter(Boolean))
      ),
    [logs]
  );

  const successCount = filteredOperations.filter(
    (l) => l.estado === 'SUCCESS' || (!l.estado && (l.statusCode || 200) < 400)
  ).length;
  const failCount = filteredOperations.filter(
    (l) => l.estado === 'ERROR' || l.estado === 'WARNING' || (l.statusCode || 0) >= 400
  ).length;

  const getEstadoBadge = (estado, statusCode) => {
    const est = (estado || '').toUpperCase();
    if (est === 'ERROR' || (statusCode && statusCode >= 500)) {
      return (
        <span className="badge badge-danger">
          <XCircle size={12} /> Error
        </span>
      );
    }
    if (est === 'WARNING' || (statusCode && statusCode >= 400)) {
      return (
        <span className="badge badge-warning">
          <AlertTriangle size={12} /> Advertencia
        </span>
      );
    }
    if (est === 'PARTIAL') {
      return (
        <span className="badge badge-muted">
          <Info size={12} /> Parcial
        </span>
      );
    }
    return (
      <span className="badge badge-success">
        <CheckCircle2 size={12} /> Exitoso
      </span>
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour12: false });
  };

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-icon blue"><Server size={20} /></div>
          <div>
            <div className="kpi-label">Operaciones</div>
            <div className="kpi-value">{filteredOperations.length}</div>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-icon green"><ShieldCheck size={20} /></div>
          <div>
            <div className="kpi-label">Exitosas</div>
            <div className="kpi-value" style={{ color: '#4ade80' }}>{successCount}</div>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-icon red"><AlertTriangle size={20} /></div>
          <div>
            <div className="kpi-label">Con alerta / error</div>
            <div className="kpi-value" style={{ color: '#f87171' }}>{failCount}</div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="field">
          <label>CUIL</label>
          <input className="input" placeholder="20..." value={filterCuil} onChange={(e) => setFilterCuil(e.target.value)} />
        </div>
        <div className="field">
          <label>Trace ID</label>
          <input className="input" placeholder="Identificador de traza" value={filterTrace} onChange={(e) => setFilterTrace(e.target.value)} />
        </div>
        <div className="field">
          <label>Canal</label>
          <select className="select" value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}>
            <option value="">Todos</option>
            {channels.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Servicio</label>
          <select className="select" value={filterService} onChange={(e) => setFilterService(e.target.value)}>
            <option value="">Todos</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Estado</label>
          <select className="select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="SUCCESS">Exitoso</option>
            <option value="WARNING">Advertencia</option>
            <option value="ERROR">Error</option>
            <option value="PARTIAL">Parcial</option>
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button type="button" className="btn btn-secondary" onClick={() => {
            setFilterCuil(''); setFilterTrace(''); setFilterChannel(''); setFilterService(''); setFilterEstado('');
          }}>Limpiar</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Usuario</th>
              <th>Canal</th>
              <th>Operación</th>
              <th>Estado</th>
              <th>Duración</th>
              <th>Pasos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && logs.length === 0 ? (
              <tr><td colSpan={8}><div className="state-box pulse"><Search size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Cargando actividad de clientes…</div></td></tr>
            ) : filteredOperations.length === 0 ? (
              <tr><td colSpan={8}><div className="state-box">No hay operaciones para los filtros seleccionados.</div></td></tr>
            ) : (
              filteredOperations.map((op, idx) => {
                const cuil = op.usuario?.cuil || op.userCuil || 'Anónimo';
                const nombre = op.usuario?.nombre || (op.usuario?.alias ? `@${op.usuario.alias}` : null);
                const descripcion = op.operacion?.descripcion || op.descripcion || 'Operación de usuario';
                const servicio = op.operacion?.servicio || op.servicio || op.serviceName || '—';
                const codigo = op.operacion?.codigo || op.codigoOperacion || '';
                const canal = op.canal || op.channel || '—';
                const fecha = op.fechaHora || op.timestamp;
                const duracion = op.duracionTotalMs ?? op.durationMs ?? 0;
                const cantPasos = op.cantidadPasos ?? (op.pasos ? op.pasos.length : 1);

                return (
                  <tr key={op.traceId || op._id || idx} className="clickable" onClick={() => onViewTrace(op.traceId)}>
                    <td className="mono">{formatDate(fecha)}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>{cuil}</div>
                      {nombre && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{nombre}</div>}
                    </td>
                    <td><span className="badge badge-channel">{canal}</span></td>
                    <td>
                      <div className="op-title">{descripcion}</div>
                      <div className="op-meta">
                        <span className="badge badge-service">{servicio}</span>
                        {codigo && <span className="badge badge-muted">{codigo}</span>}
                      </div>
                    </td>
                    <td>{getEstadoBadge(op.estado, op.statusCode)}</td>
                    <td className="mono" style={{ fontWeight: 600, color: duracion > 800 ? '#fbbf24' : '#86efac' }}>{duracion} ms</td>
                    <td><span className="badge badge-muted">{cantPasos}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => onViewTrace(op.traceId)}>
                        <GitBranch size={13} /> Ver detalle
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
