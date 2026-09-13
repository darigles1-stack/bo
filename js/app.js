/**
 * SALMINUS BACKOFFICE — BANCO DE CORRIENTES
 * Lógica JavaScript pura para Auditoría MongoDB y Control DIAG.FLOW
 */

// ==============================================================================
// 1. Estado Global y Configuración
// ==============================================================================
const STATE = {
  auditBase: localStorage.getItem('salminus_audit_url') || 'http://localhost:8089',
  prefBase: localStorage.getItem('salminus_pref_url') || 'http://localhost:8099',
  refreshInterval: parseInt(localStorage.getItem('salminus_refresh_sec') || '3', 10),
  isLive: true,
  liveTimer: null,
  pingTimer: null,
  activeTab: 'auditTab',
  events: [],
  selectedEvent: null,
  currentTraceTree: null,
  diagConfigs: []
};

// ==============================================================================
// 2. Inicialización al Cargar el DOM
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupFilters();
  setupModalEvents();
  setupConfigTab();
  
  // Cargar datos iniciales
  checkConnectivity();
  loadAuditEvents();
  startLiveRefresh();
  
  // Sondeo de conectividad periódico (cada 10s)
  STATE.pingTimer = setInterval(checkConnectivity, 10000);
});

// ==============================================================================
// 3. Navegación por Pestañas
// ==============================================================================
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tabs .tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Toggle Live Refresh
  const btnLive = document.getElementById('btnLiveToggle');
  btnLive.addEventListener('click', toggleLiveRefresh);
}

function switchTab(tabId) {
  STATE.activeTab = tabId;
  
  // Actualizar botones de navegación
  document.querySelectorAll('.nav-tabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });

  // Mostrar contenido correspondiente
  document.querySelectorAll('.tab-content').forEach(tc => {
    tc.classList.toggle('active', tc.id === tabId);
  });

  // Si pasa a DIAG.FLOW, refrescar su estado
  if (tabId === 'diagTab') {
    loadDiagFlowConfigs();
  }
}

function toggleLiveRefresh() {
  STATE.isLive = !STATE.isLive;
  const btn = document.getElementById('btnLiveToggle');
  const txt = document.getElementById('liveBtnText');
  
  if (STATE.isLive) {
    btn.classList.add('active');
    txt.textContent = `Auto (${STATE.refreshInterval}s)`;
    startLiveRefresh();
    showToast('Refresco automático reanudado', 'info');
  } else {
    btn.classList.remove('active');
    txt.textContent = 'Pausado';
    clearInterval(STATE.liveTimer);
    showToast('Refresco automático pausado', 'info');
  }
}

function startLiveRefresh() {
  clearInterval(STATE.liveTimer);
  if (!STATE.isLive) return;

  STATE.liveTimer = setInterval(() => {
    if (STATE.isLive && STATE.activeTab === 'auditTab') {
      loadAuditEvents(true);
    }
  }, STATE.refreshInterval * 1000);
}

// ==============================================================================
// 4. Verificación de Conectividad (Health Checks)
// ==============================================================================
async function checkConnectivity() {
  // 1. ms-audit ping
  const auditDot = document.getElementById('auditDot');
  try {
    const res = await fetch(`${STATE.auditBase}/api/v1/audit/ping`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      auditDot.className = 'status-dot online';
      document.getElementById('auditStatusChip').title = `ms-audit conectado (HTTP 200) en ${STATE.auditBase}`;
    } else {
      auditDot.className = 'status-dot offline';
      document.getElementById('auditStatusChip').title = `ms-audit respondió error (HTTP ${res.status})`;
    }
  } catch {
    auditDot.className = 'status-dot offline';
    document.getElementById('auditStatusChip').title = `ms-audit inalcanzable en ${STATE.auditBase}`;
  }

  // 2. ms-preferencia ping
  const prefDot = document.getElementById('prefDot');
  try {
    const res = await fetch(`${STATE.prefBase}/admin/diag/config`, { credentials: 'omit', signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      prefDot.className = 'status-dot online';
      document.getElementById('preferenciaStatusChip').title = `ms-preferencia conectado (HTTP 200) en ${STATE.prefBase}`;
    } else {
      prefDot.className = 'status-dot offline';
      document.getElementById('preferenciaStatusChip').title = `ms-preferencia respondió error (HTTP ${res.status})`;
    }
  } catch {
    prefDot.className = 'status-dot offline';
    document.getElementById('preferenciaStatusChip').title = `ms-preferencia inalcanzable en ${STATE.prefBase}`;
  }
}

// ==============================================================================
// 5. Carga y Filtro de Eventos de Auditoría (MongoDB)
// ==============================================================================
function setupFilters() {
  document.getElementById('btnFilterApply').addEventListener('click', () => loadAuditEvents(false));
  document.getElementById('btnRefreshNow').addEventListener('click', () => loadAuditEvents(false));
  
  document.getElementById('btnFilterReset').addEventListener('click', () => {
    document.getElementById('searchCuil').value = '';
    document.getElementById('searchTrace').value = '';
    document.getElementById('filterChannel').value = 'ALL';
    document.getElementById('filterService').value = 'ALL';
    document.getElementById('filterStatus').value = 'ALL';
    loadAuditEvents(false);
  });

  // Enter en inputs
  ['searchCuil', 'searchTrace'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') loadAuditEvents(false);
    });
  });

  // Cambios en selectores
  ['filterChannel', 'filterService', 'filterStatus'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => filterAndRenderEvents());
  });
}

async function loadAuditEvents(isBackground = false) {
  const cuil = document.getElementById('searchCuil').value.trim();
  const trace = document.getElementById('searchTrace').value.trim();
  const channel = document.getElementById('filterChannel').value;

  let url = `${STATE.auditBase}/api/v1/audit/latest`;
  if (trace) {
    url = `${STATE.auditBase}/api/v1/audit/trace/${encodeURIComponent(trace)}`;
  } else if (cuil) {
    url = `${STATE.auditBase}/api/v1/audit/cuil/${encodeURIComponent(cuil)}`;
  } else if (channel !== 'ALL') {
    url = `${STATE.auditBase}/api/v1/audit/channel/${encodeURIComponent(channel)}`;
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      if (!isBackground) {
        renderEmptyTable(`No se encontraron eventos para el filtro ingresado (HTTP ${res.status}).`);
        updateMetrics([]);
      }
      return;
    }

    const data = await res.json();
    STATE.events = Array.isArray(data) ? data : [];
    filterAndRenderEvents();

  } catch (err) {
    console.error('[Backoffice] Error cargando auditoría:', err);
    if (!isBackground) {
      renderEmptyTable(`Error de conexión con ms-audit (${STATE.auditBase}): ${err.message}. Verifica que el contenedor esté arriba.`);
    }
  }
}

function filterAndRenderEvents() {
  const svcFilter = document.getElementById('filterService').value;
  const statusFilter = document.getElementById('filterStatus').value;

  const filtered = STATE.events.filter(e => {
    if (svcFilter !== 'ALL' && e.serviceName !== svcFilter) return false;
    if (statusFilter === '2XX' && (e.statusCode < 200 || e.statusCode >= 300)) return false;
    if (statusFilter === '4XX' && (e.statusCode < 400 || e.statusCode >= 500)) return false;
    if (statusFilter === '5XX' && e.statusCode < 500) return false;
    return true;
  });

  updateMetrics(filtered);
  renderTableRows(filtered);
}

function updateMetrics(list) {
  const total = list.length;
  let successCount = 0;
  let errorCount = 0;
  let durationSum = 0;

  list.forEach(e => {
    if (e.statusCode >= 200 && e.statusCode < 300) successCount++;
    if (e.statusCode >= 400) errorCount++;
    if (typeof e.durationMs === 'number') durationSum += e.durationMs;
  });

  document.getElementById('metricTotal').textContent = total.toLocaleString();
  document.getElementById('metricSuccess').textContent = successCount.toLocaleString();
  document.getElementById('metricErrors').textContent = errorCount.toLocaleString();
  
  const avg = total > 0 ? Math.round(durationSum / total) : 0;
  document.getElementById('metricAvgDuration').textContent = `${avg} ms`;
  document.getElementById('tableCountTag').textContent = `${total} registros`;
}

function renderTableRows(list) {
  const tbody = document.getElementById('auditTableBody');
  if (list.length === 0) {
    renderEmptyTable('No hay registros de auditoría que coincidan con los filtros aplicados.');
    return;
  }

  let html = '';
  list.forEach(e => {
    const isSelected = STATE.selectedEvent && STATE.selectedEvent.id === e.id;
    const dateStr = e.timestamp ? formatTimestamp(e.timestamp) : 'N/A';
    const isPadre = e.stepOrder === 0;
    const stepLabel = isPadre ? 'Padre (0)' : `Hijo (${e.stepOrder})`;
    const stepClass = isPadre ? 'padre' : 'hijo';
    
    // Status Category badge
    const statusClass = e.statusCode >= 500 ? 'status-5xx' : (e.statusCode >= 400 ? 'status-4xx' : 'status-2xx');
    
    // Latency color
    const duration = e.durationMs || 0;
    const durClass = duration > 500 ? 'duration-slow' : (duration > 150 ? 'duration-medium' : 'duration-fast');

    const shortTrace = e.traceId ? (e.traceId.length > 14 ? `${e.traceId.substring(0, 8)}...${e.traceId.substring(e.traceId.length - 4)}` : e.traceId) : 'N/A';

    html += `
      <tr class="${isSelected ? 'selected' : ''}" onclick="selectAuditRow('${e.id || e.spanId}')">
        <td class="font-mono text-muted text-sm">${dateStr}</td>
        <td><span class="badge-step ${stepClass}">${stepLabel}</span></td>
        <td>
          <span class="trace-id-pill" onclick="event.stopPropagation(); copyToClipboard('${e.traceId}')" title="Clic para copiar Trace ID completo">
            ${shortTrace} 📋
          </span>
        </td>
        <td><span class="font-semibold text-sm">${escapeHtml(e.channel || 'N/A')}</span></td>
        <td class="font-mono text-sm">${escapeHtml(e.userCuil || e.userAlias || '-')}</td>
        <td><span class="font-semibold">${escapeHtml(e.serviceName || '-')}</span></td>
        <td>
          <div style="font-family: var(--font-mono); font-size: 0.8rem;">
            <strong style="color: var(--cyan);">${escapeHtml(e.httpMethod || 'POST')}</strong> 
            <span>${escapeHtml(e.endpoint || '-')}</span>
          </div>
        </td>
        <td><span class="status-badge ${statusClass}">${e.statusCode || 200}</span></td>
        <td><span class="duration-tag ${durClass}">${duration} ms</span></td>
        <td style="text-align: center;">
          <button class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" 
                  onclick="event.stopPropagation(); openDetailModalById('${e.id || e.spanId}')">
            Ver RQ/RS
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function renderEmptyTable(message) {
  document.getElementById('auditTableBody').innerHTML = `
    <tr>
      <td colspan="10" class="empty-state-cell">
        <div class="empty-state">
          <p>${message}</p>
        </div>
      </td>
    </tr>
  `;
}

// ==============================================================================
// 6. Modal de Detalle Dual (Request / Response Payloads)
// ==============================================================================
function setupModalEvents() {
  document.getElementById('btnCloseModal').addEventListener('click', closeDetailModal);
  document.getElementById('btnCloseModalBottom').addEventListener('click', closeDetailModal);
  
  // Cerrar al clickear el fondo oscuro
  document.getElementById('payloadModal').addEventListener('click', e => {
    if (e.target.id === 'payloadModal') closeDetailModal();
  });

  // Copiar botones
  document.getElementById('btnCopyReq').addEventListener('click', () => {
    const text = document.getElementById('modalReqJson').textContent;
    copyToClipboard(text, 'Request Payload copiado al portapapeles');
  });

  document.getElementById('btnCopyRs').addEventListener('click', () => {
    const text = document.getElementById('modalRsJson').textContent;
    copyToClipboard(text, 'Response Payload copiado al portapapeles');
  });

  // Abrir en árbol
  document.getElementById('btnOpenInTree').addEventListener('click', () => {
    if (STATE.selectedEvent && STATE.selectedEvent.traceId) {
      closeDetailModal();
      document.getElementById('traceTreeInput').value = STATE.selectedEvent.traceId;
      switchTab('traceTab');
      loadTraceTree(STATE.selectedEvent.traceId);
    }
  });

  // Eventos de Modal DIAG.FLOW
  document.getElementById('btnCloseDiagModal').addEventListener('click', closeDiagModal);
  document.getElementById('btnCancelDiagModal').addEventListener('click', closeDiagModal);
  document.getElementById('btnSaveDiagModal').addEventListener('click', saveDiagFlowConfig);
  document.getElementById('btnRefreshDiag').addEventListener('click', loadDiagFlowConfigs);

  // Toggle visual de TTL al cambiar radio de activación
  document.querySelectorAll('input[name="diagEnabledRadio"]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('ttlGroup').style.display = r.value === 'true' ? 'block' : 'none';
    });
  });
}

function selectAuditRow(idOrSpan) {
  const item = STATE.events.find(e => (e.id === idOrSpan) || (e.spanId === idOrSpan));
  if (item) {
    STATE.selectedEvent = item;
    openDetailModal(item);
  }
}

function openDetailModalById(idOrSpan) {
  selectAuditRow(idOrSpan);
}

function openDetailModal(event) {
  STATE.selectedEvent = event;
  
  // Status Badge
  const statusBadge = document.getElementById('modalStatusBadge');
  const code = event.statusCode || 200;
  statusBadge.className = `status-badge ${code >= 500 ? 'status-5xx' : (code >= 400 ? 'status-4xx' : 'status-2xx')}`;
  statusBadge.textContent = `${code} ${event.statusCategory || (code === 200 ? 'SUCCESS' : 'ERROR')}`;

  document.getElementById('modalTitle').textContent = `${event.serviceName || 'Microservicio'} — Step ${event.stepOrder || 0}`;
  document.getElementById('modalTraceId').textContent = `Trace: ${event.traceId || 'N/A'}`;
  
  // Metadatos
  document.getElementById('modalStep').textContent = event.stepOrder === 0 ? '0 (Padre Inbound)' : `${event.stepOrder} (Hijo Outbound)`;
  document.getElementById('modalService').textContent = event.serviceName || 'N/A';
  document.getElementById('modalChannel').textContent = event.channel || 'N/A';
  document.getElementById('modalCuil').textContent = event.userCuil || event.userAlias || 'N/A';
  document.getElementById('modalDuration').textContent = `${event.durationMs || 0} ms`;
  document.getElementById('modalPciSanitized').textContent = event.pciDssSanitized ? '✅ Blindado (PCI-DSS)' : 'ℹ️ Estándar';
  document.getElementById('modalEndpoint').textContent = `${event.httpMethod || 'POST'} ${event.endpoint || '-'}`;

  // Formatear JSONs
  document.getElementById('modalReqJson').textContent = formatJson(event.requestPayload);
  document.getElementById('modalRsJson').textContent = formatJson(event.responsePayload);

  // Extra content
  const extraHtml = `
    <div><strong>Span ID:</strong> <span class="font-mono text-cyan">${escapeHtml(event.spanId || '-')}</span></div>
    <div><strong>Parent Span ID:</strong> <span class="font-mono">${escapeHtml(event.parentSpanId || '-')}</span></div>
    <div><strong>Device ID:</strong> <span class="font-mono">${escapeHtml(event.deviceId || '-')}</span></div>
    <div><strong>Device Info:</strong> <pre class="font-mono" style="margin-top:0.2rem;">${formatJson(event.deviceInfo)}</pre></div>
    <div><strong>Ambiente / Pod:</strong> <span>${escapeHtml(event.environment || 'dev-intranet')} / ${escapeHtml(event.podName || '-')}</span></div>
  `;
  document.getElementById('modalExtraContent').innerHTML = extraHtml;

  document.getElementById('payloadModal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('payloadModal').classList.add('hidden');
}

// ==============================================================================
// 7. Tab 2: Árbol Jerárquico Padre-Hijo (Waterfall)
// ==============================================================================
document.getElementById('btnSearchTree').addEventListener('click', () => {
  const trace = document.getElementById('traceTreeInput').value.trim();
  if (!trace) {
    showToast('Ingresa un Trace ID para buscar', 'error');
    return;
  }
  loadTraceTree(trace);
});

document.getElementById('btnExampleTrace').addEventListener('click', () => {
  if (STATE.events.length > 0 && STATE.events[0].traceId) {
    const trace = STATE.events[0].traceId;
    document.getElementById('traceTreeInput').value = trace;
    loadTraceTree(trace);
  } else {
    showToast('No hay transacciones cargadas aún para tomar de ejemplo', 'info');
  }
});

async function loadTraceTree(traceId) {
  try {
    const res = await fetch(`${STATE.auditBase}/api/v1/audit/trace/${encodeURIComponent(traceId)}`);
    if (!res.ok) {
      showToast(`No se encontraron eventos para la traza ${traceId}`, 'error');
      return;
    }

    const treeData = await res.json();
    if (!Array.isArray(treeData) || treeData.length === 0) {
      showToast('Árbol de traza vacío', 'info');
      return;
    }

    // Ordenar por stepOrder ascendente
    treeData.sort((a, b) => a.stepOrder - b.stepOrder);
    STATE.currentTraceTree = treeData;
    renderTraceTree(traceId, treeData);

  } catch (err) {
    showToast(`Error al consultar árbol de traza: ${err.message}`, 'error');
  }
}

function renderTraceTree(traceId, tree) {
  document.getElementById('treeEmptyState').classList.add('hidden');
  const container = document.getElementById('treeOverviewContainer');
  container.classList.remove('hidden');

  const padre = tree.find(t => t.stepOrder === 0) || tree[0];
  document.getElementById('treeTraceIdDisplay').textContent = traceId;
  document.getElementById('treeCuilDisplay').textContent = padre.userCuil || padre.userAlias || 'N/A';
  document.getElementById('treeCanalDisplay').textContent = padre.channel || 'N/A';
  document.getElementById('treeStepsDisplay').textContent = `${tree.length} llamada(s)`;

  // Duración total (o la del padre, o max duration)
  const totalDuration = padre.durationMs || tree.reduce((acc, t) => acc + (t.durationMs || 0), 0);
  document.getElementById('treeTotalDurationDisplay').textContent = `${totalDuration} ms`;

  // Render Waterfall Bars
  const barsContainer = document.getElementById('waterfallBarsContainer');
  let barsHtml = '';
  
  tree.forEach(node => {
    const isPadre = node.stepOrder === 0;
    const dur = node.durationMs || 0;
    const pct = totalDuration > 0 ? Math.min(100, Math.max(5, Math.round((dur / totalDuration) * 100))) : 100;
    const stepName = isPadre ? `[Padre 0] ${node.serviceName}` : `[Hijo ${node.stepOrder}] ${node.serviceName}`;
    const fillClass = `step-${node.stepOrder % 4}`;

    barsHtml += `
      <div class="waterfall-bar-row">
        <div class="waterfall-svc" title="${stepName}">${stepName}</div>
        <div class="waterfall-track">
          <div class="waterfall-fill ${fillClass}" style="width: ${pct}%;"></div>
        </div>
        <div class="font-mono text-sm text-right" style="font-weight: 600;">${dur} ms</div>
      </div>
    `;
  });
  barsContainer.innerHTML = barsHtml;

  // Render Hierarchical Nodes
  const nodesContainer = document.getElementById('treeNodesContainer');
  let nodesHtml = '';

  tree.forEach(node => {
    const isPadre = node.stepOrder === 0;
    const cardType = isPadre ? 'padre' : 'hijo';
    const statusClass = node.statusCode >= 500 ? 'status-5xx' : (node.statusCode >= 400 ? 'status-4xx' : 'status-2xx');

    nodesHtml += `
      <div class="tree-node-card ${cardType}">
        <div class="tree-node-header">
          <div class="node-title-group">
            <span class="badge-step ${isPadre ? 'padre' : 'hijo'}">Step ${node.stepOrder}</span>
            <span class="node-title">${escapeHtml(node.serviceName || 'Microservicio')}</span>
            <span class="status-badge ${statusClass}">${node.statusCode}</span>
            <span class="duration-tag font-mono">${node.durationMs || 0} ms</span>
          </div>
          <div>
            <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" 
                    onclick="openDetailModalById('${node.id || node.spanId}')">
              Detalle Completo
            </button>
          </div>
        </div>

        <div style="font-size: 0.82rem; font-family: var(--font-mono); color: var(--text-secondary); margin-bottom: 0.5rem;">
          <strong style="color: var(--cyan);">${escapeHtml(node.httpMethod || 'POST')}</strong> ${escapeHtml(node.endpoint || '-')}
        </div>

        <div class="node-body">
          <div class="payload-panel">
            <div class="panel-header">
              <span class="panel-title">📥 Request</span>
              <button class="btn-copy" onclick="copyToClipboard('${escapeJs(JSON.stringify(node.requestPayload))}')">Copiar</button>
            </div>
            <pre class="json-code" style="max-height: 160px;">${formatJson(node.requestPayload)}</pre>
          </div>

          <div class="payload-panel">
            <div class="panel-header">
              <span class="panel-title">📤 Response</span>
              <button class="btn-copy" onclick="copyToClipboard('${escapeJs(JSON.stringify(node.responsePayload))}')">Copiar</button>
            </div>
            <pre class="json-code" style="max-height: 160px;">${formatJson(node.responsePayload)}</pre>
          </div>
        </div>
      </div>
    `;
  });

  nodesContainer.innerHTML = nodesHtml;
}

// ==============================================================================
// 8. Tab 3: Control Centralizado DIAG.FLOW (DB2 BTC011 + Redis)
// ==============================================================================
async function loadDiagFlowConfigs() {
  try {
    const res = await fetch(`${STATE.prefBase}/admin/diag/config`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      showToast(`Error al consultar configuraciones DIAG.FLOW (HTTP ${res.status})`, 'error');
      return;
    }
    const data = await res.json();
    STATE.diagConfigs = Array.isArray(data) ? data : [];
    renderDiagCards(STATE.diagConfigs);

  } catch (err) {
    showToast(`ms-preferencia no disponible en ${STATE.prefBase}: ${err.message}`, 'error');
    // Si falla, renderizar cards por defecto
    renderDiagCards([
      { service: 'global', enabled: false, reason: 'Por defecto (Desactivado)' },
      { service: 'msauth', enabled: false, reason: 'Por defecto (Desactivado)' },
      { service: 'mspersona', enabled: false, reason: 'Por defecto (Desactivado)' },
      { service: 'mscuentas', enabled: false, reason: 'Por defecto (Desactivado)' },
      { service: 'msbtservicesproxy', enabled: false, reason: 'Por defecto (Desactivado)' },
      { service: 'msbsmproxy', enabled: false, reason: 'Por defecto (Desactivado)' }
    ]);
  }
}

function renderDiagCards(list) {
  const grid = document.getElementById('diagCardsGrid');
  let html = '';

  list.forEach(item => {
    const isOn = item.enabled && (item.effectivelyEnabled !== false);
    const badgeClass = isOn ? 'on' : 'off';
    const badgeText = isOn ? 'DIAGNÓSTICO ON' : 'OFF (Inactivo)';
    const expiresStr = item.expiresAt ? new Date(item.expiresAt).toLocaleTimeString() : 'N/A';

    html += `
      <div class="diag-card ${isOn ? 'is-active' : ''}">
        <div class="diag-card-top">
          <div class="diag-service-name">${escapeHtml(item.service.toUpperCase())}</div>
          <span class="diag-switch-badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="diag-meta-list">
          <div class="diag-meta-row">
            <span>Auto-Expiración:</span>
            <strong>${expiresStr}</strong>
          </div>
          <div class="diag-meta-row">
            <span>Modificado por:</span>
            <strong>${escapeHtml(item.updatedBy || 'system')}</strong>
          </div>
          <div class="diag-meta-row" style="flex-direction: column; gap: 0.2rem; margin-top: 0.25rem;">
            <span>Motivo:</span>
            <span class="text-sm font-mono" style="color: var(--text-primary);">${escapeHtml(item.reason || 'Sin motivo registrado')}</span>
          </div>
        </div>

        <div class="diag-card-actions">
          <button class="btn btn-primary" onclick="openDiagModal('${escapeHtml(item.service)}', ${isOn})">
            ${isOn ? 'Modificar / Extender' : 'Activar Diagnóstico'}
          </button>
          ${isOn ? `
            <button class="btn btn-secondary" style="color: var(--red); border-color: var(--red-dim);" onclick="quickTurnOffDiag('${escapeHtml(item.service)}')">
              Apagar Ahora
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

let activeDiagService = 'msauth';

function openDiagModal(service, currentStatus) {
  activeDiagService = service;
  document.getElementById('diagModalServiceName').textContent = service.toUpperCase();
  document.getElementById('diagReason').value = '';
  document.getElementById('diagModal').classList.remove('hidden');
}

function closeDiagModal() {
  document.getElementById('diagModal').classList.add('hidden');
}

async function quickTurnOffDiag(service) {
  try {
    const res = await fetch(`${STATE.prefBase}/admin/diag/config/${encodeURIComponent(service)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: false,
        reason: 'Apagado manual desde Salminus Backoffice',
        updatedBy: 'operador_backoffice'
      })
    });

    if (res.ok) {
      showToast(`Diagnóstico para ${service} apagado exitosamente`, 'success');
      loadDiagFlowConfigs();
    } else {
      showToast(`Error al apagar diagnóstico (HTTP ${res.status})`, 'error');
    }
  } catch (err) {
    showToast(`Error al comunicar con ms-preferencia: ${err.message}`, 'error');
  }
}

async function saveDiagFlowConfig() {
  const isEnabled = document.querySelector('input[name="diagEnabledRadio"]:checked').value === 'true';
  const ttlMinutes = parseInt(document.getElementById('diagTtlMinutes').value, 10);
  const reason = document.getElementById('diagReason').value.trim();
  const updatedBy = document.getElementById('diagUser').value.trim() || 'operador_backoffice';

  if (!reason) {
    showToast('El motivo de la activación es obligatorio', 'error');
    document.getElementById('diagReason').focus();
    return;
  }

  try {
    const payload = {
      enabled: isEnabled,
      ttlMinutes: ttlMinutes,
      reason: reason,
      updatedBy: updatedBy
    };

    const res = await fetch(`${STATE.prefBase}/admin/diag/config/${encodeURIComponent(activeDiagService)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(`Configuración de ${activeDiagService} actualizada exitosamente en DB2`, 'success');
      closeDiagModal();
      loadDiagFlowConfigs();
    } else {
      showToast(`Error al guardar configuración (HTTP ${res.status})`, 'error');
    }
  } catch (err) {
    showToast(`Fallo de conexión al guardar configuración: ${err.message}`, 'error');
  }
}

// ==============================================================================
// 9. Tab 4: Configuración Local
// ==============================================================================
function setupConfigTab() {
  document.getElementById('cfgAuditUrl').value = STATE.auditBase;
  document.getElementById('cfgPreferenciaUrl').value = STATE.prefBase;
  document.getElementById('cfgRefreshInterval').value = STATE.refreshInterval;

  document.getElementById('btnSaveConfig').addEventListener('click', () => {
    STATE.auditBase = document.getElementById('cfgAuditUrl').value.trim();
    STATE.prefBase = document.getElementById('cfgPreferenciaUrl').value.trim();
    STATE.refreshInterval = parseInt(document.getElementById('cfgRefreshInterval').value, 10) || 3;

    localStorage.setItem('salminus_audit_url', STATE.auditBase);
    localStorage.setItem('salminus_pref_url', STATE.prefBase);
    localStorage.setItem('salminus_refresh_sec', STATE.refreshInterval);

    showToast('Configuración guardada correctamente', 'success');
    checkConnectivity();
    startLiveRefresh();
  });

  document.getElementById('btnTestConnections').addEventListener('click', async () => {
    showToast('Verificando conectividad con microservicios...', 'info');
    await checkConnectivity();
    showToast('Prueba de conectividad completada', 'success');
  });
}

// ==============================================================================
// 10. Funciones Utilitarias
// ==============================================================================
function formatTimestamp(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch {
    return String(ts);
  }
}

function formatJson(obj) {
  if (obj === null || obj === undefined) return '{}';
  if (typeof obj === 'string') {
    try {
      return JSON.stringify(JSON.parse(obj), null, 2);
    } catch {
      return obj;
    }
  }
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function copyToClipboard(text, customMessage) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(customMessage || 'Copiado al portapapeles', 'success');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente', 'error');
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
