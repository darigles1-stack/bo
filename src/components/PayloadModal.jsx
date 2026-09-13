import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck } from 'lucide-react';

export default function PayloadModal({ log, onClose }) {
  const [copiedRq, setCopiedRq] = useState(false);
  const [copiedRs, setCopiedRs] = useState(false);

  if (!log) return null;

  const copyToClipboard = (data, isRq) => {
    const text = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data || '');
    navigator.clipboard.writeText(text);
    if (isRq) {
      setCopiedRq(true);
      setTimeout(() => setCopiedRq(false), 2000);
    } else {
      setCopiedRs(true);
      setTimeout(() => setCopiedRs(false), 2000);
    }
  };

  const formatJson = (data) => {
    if (!data) return 'Sin datos';
    if (typeof data === 'object') return JSON.stringify(data, null, 2);
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Detalle de request / response</h3>
            <p className="mono" style={{ marginTop: 4, fontSize: '0.75rem' }}>
              {log.traceId ? `Trace ${log.traceId}` : 'Sin trace'} · Paso {log.stepOrder ?? '—'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="meta-grid">
            <div>
              <span>CUIL</span><br />
              <strong className="mono">{log.userCuil || log.usuario?.cuil || '—'}</strong>
            </div>
            <div>
              <span>Canal</span><br />
              <strong>{log.channel || log.canal || '—'}</strong>
            </div>
            <div>
              <span>Endpoint</span><br />
              <strong className="mono" style={{ color: '#93c5fd' }}>{log.httpMethod} {log.endpoint}</strong>
            </div>
            <div>
              <span>Estado</span><br />
              <strong style={{ color: (log.statusCode || 0) >= 400 ? '#f87171' : '#4ade80' }}>
                {log.statusCode || '—'} {log.statusCategory ? `(${log.statusCategory})` : ''}
              </strong>
            </div>
            <div>
              <span>Latencia</span><br />
              <strong>{log.durationMs ?? '—'} ms</strong>
            </div>
            <div>
              <span>PCI</span><br />
              <strong style={{ color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} /> Sanitizado
              </strong>
            </div>
          </div>

          <div className="json-grid">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: '0.8rem', color: '#93c5fd' }}>Request</strong>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(log.requestPayload, true)}>
                  {copiedRq ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
              <pre className="code-box">{formatJson(log.requestPayload)}</pre>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: '0.8rem', color: '#86efac' }}>Response</strong>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(log.responsePayload, false)}>
                  {copiedRs ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
              <pre className="code-box">{formatJson(log.responsePayload)}</pre>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
