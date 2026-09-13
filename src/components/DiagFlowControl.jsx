import React, { useState, useEffect } from 'react';
import { Layers, Power, Clock, User, HelpCircle, Check, AlertCircle, RefreshCw } from 'lucide-react';

const KNOWN_SERVICES = [
  { id: 'GLOBAL', name: 'GLOBAL (Todos los Microservicios)', desc: 'Activa el diagnóstico en toda la malla' },
  { id: 'msauth', name: 'ms-auth (Autenticación)', desc: 'Flujos de login, BSM y handshake BTS' },
  { id: 'mspreferencia', name: 'ms-preferencia', desc: 'Control central de flags y parametría' },
  { id: 'msbtservicesproxy', name: 'ms-btservicesproxy', desc: 'Proxy SOAP/REST hacia Bantotal Core' },
  { id: 'msbsmproxy', name: 'ms-bsmproxy', desc: 'Proxy de integración con BSM' },
  { id: 'mspersona', name: 'ms-persona', desc: 'Consultas de datos filiatorios y clientes' },
  { id: 'mscuentas', name: 'ms-cuentas', desc: 'Saldos, CBU y consultas de cuentas' }
];

export default function DiagFlowControl({ prefUrl }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [ttlMinutes, setTtlMinutes] = useState(30);
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('operador_salminus');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pref/admin/diag/config');
      if (res.ok) {
        const data = await res.json();
        setConfigs(Array.isArray(data) ? data : []);
      }
    } catch {
      // Si el microservicio no está corriendo, mantenemos la lista base
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleOff = async (serviceId) => {
    try {
      const res = await fetch(`/api/pref/admin/diag/config/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: false,
          reason: 'Desactivado manualmente desde Backoffice',
          updatedBy: operator
        })
      });
      if (res.ok) {
        showToast(`Diagnóstico apagado para ${serviceId}`);
        fetchConfigs();
      }
    } catch (err) {
      showToast(`Error al apagar: ${err.message}`);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Debes ingresar un motivo de investigación (obligatorio para auditoría).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pref/admin/diag/config/${selectedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          ttlMinutes: Number(ttlMinutes),
          reason: reason.trim(),
          updatedBy: operator.trim()
        })
      });
      if (res.ok) {
        showToast(`Diagnóstico activado por ${ttlMinutes}m para ${selectedService.id}`);
        setSelectedService(null);
        setReason('');
        fetchConfigs();
      } else {
        alert('Error en la respuesta del servidor');
      }
    } catch (err) {
      alert(`Error al activar: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceConfig = (serviceId) => {
    return configs.find(c => (c.service || '').toLowerCase() === serviceId.toLowerCase());
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="card-title">
            <Layers color="#00d2ff" size={20} />
            Panel de Control Centralizado DIAG.FLOW
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Activa o desactiva la secuencia detallada de diagnóstico en caliente sin reiniciar pods ni redesplegar.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchConfigs} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'pulse' : ''} /> Refrescar Estado
        </button>
      </div>

      {toastMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-sm)',
          color: '#34d399',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={16} /> {toastMessage}
        </div>
      )}

      {/* Grid of Microservices */}
      <div className="diagflow-grid">
        {KNOWN_SERVICES.map((srv) => {
          const cfg = getServiceConfig(srv.id);
          const isAct = cfg?.effectivelyEnabled || cfg?.enabled;

          return (
            <div key={srv.id} className={`diagflow-card ${isAct ? 'active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge" style={{
                  background: srv.id === 'GLOBAL' ? 'rgba(0, 210, 255, 0.15)' : '#1f2937',
                  color: srv.id === 'GLOBAL' ? '#38bdf8' : '#fff'
                }}>
                  {srv.id}
                </span>
                <span className={`badge ${isAct ? 'badge-4xx' : 'badge-2xx'}`}>
                  {isAct ? 'DIAG ACTIVO' : 'OFF (Silencioso)'}
                </span>
              </div>

              <div>
                <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{srv.name}</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{srv.desc}</p>
              </div>

              {isAct ? (
                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24' }}>
                    <Clock size={12} /> Auto-expira: {cfg?.expiresAt ? new Date(cfg.expiresAt).toLocaleTimeString() : 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                    <User size={12} /> {cfg?.updatedBy || 'sistema'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    "{cfg?.reason || 'Sin motivo'}"
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Cero overhead. Sin logs de diagnóstico en Kibana.
                </div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                {isAct ? (
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => handleToggleOff(srv.id)}
                  >
                    <Power size={13} /> Apagar Inmediatamente
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => setSelectedService(srv)}
                  >
                    <Power size={13} /> Activar Diagnóstico...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activation Modal */}
      {selectedService && (
        <div className="modal-overlay" onClick={() => setSelectedService(null)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Power size={18} color="#00d2ff" />
                Activar DIAG.FLOW para: {selectedService.id}
              </h3>
            </div>
            <form onSubmit={handleActivate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Duración / Auto-expiración (TTL)</label>
                  <select
                    className="select-field"
                    value={ttlMinutes}
                    onChange={(e) => setTtlMinutes(e.target.value)}
                  >
                    <option value="5">5 Minutos (Prueba rápida)</option>
                    <option value="15">15 Minutos (Revisión puntual)</option>
                    <option value="30">30 Minutos (Estándar investigación)</option>
                    <option value="60">1 Hora (60 min)</option>
                    <option value="120">2 Horas (Máximo permitido)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Operador Responsable</label>
                  <input
                    type="text"
                    className="input-field"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Motivo de Activación (Obligatorio)</label>
                  <textarea
                    className="input-field"
                    style={{ height: '80px', resize: 'vertical' }}
                    placeholder="Ej: Investigando lentitud en handshake Bantotal para Banca Móvil (INC-4891)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedService(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Activando...' : 'Confirmar y Encender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
