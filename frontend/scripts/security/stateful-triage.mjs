import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const reviewedCommit = '6b41ddea71771a85035daa4fc09f0b2405e10b2a';
const catalogues = ['antecedente-personal', 'dato-funcional-nutricion', 'ejercicio-test-movimiento', 'tipo-antecedente-traumatico', 'tipo-evento-importante'];

export async function verifyStatefulAlerts(origin, cookies, alerts) {
  const source = JSON.parse(readFileSync(new URL('../../deploy/staging/backend-source.json', import.meta.url), 'utf8'));
  const result = { reviewedCommit, actualSourceCommit: source.commit, acceptedAlertIds: [], probes: [], rationale: 'Reviewed CatalogoService uses parameterized TypeORM repository operations and no filesystem calls. Stateful POST uniqueness returns 201 then 409; differential scanners can mistake this for SQL or file access.' };
  if (source.commit !== reviewedCommit) return result;
  const candidates = alerts.filter(alert => {
    const path = new URL(alert.url).pathname;
    const catalogue = path.split('/').at(-1);
    if (!catalogues.includes(catalogue) || path !== '/api/catalogos/' + catalogue || alert.method !== 'POST' || alert.param !== 'nombre' || alert.inputVector !== 'json' || alert.evidence) return false;
    return (alert.pluginId === '6' && alert.confidence === 'Low' && alert.attack === catalogue)
      || (alert.pluginId === '40018' && alert.confidence === 'Medium' && alert.attack === 'Diabetes mellitus AND 1=1');
  });
  const request = async (path, method = 'GET', body) => fetch(new URL(path, origin), { method, headers: { Cookie: cookies, Origin: origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  for (const catalogue of [...new Set(candidates.map(alert => new URL(alert.url).pathname.split('/').at(-1)))]) {
    const path = '/api/catalogos/' + catalogue;
    const marker = 'SecurityProbe ' + randomUUID();
    const payloads = [marker, marker + "' OR '1'='1", marker + '/../../etc/passwd'];
    const created = [];
    const proof = { path, passed: false, observations: [] };
    try {
      for (const nombre of payloads) {
        const response = await request(path, 'POST', { nombre });
        if (response.status !== 201) throw new Error('Unique literal was not created normally');
        const item = await response.json();
        created.push(item.id);
        if (item.nombre !== nombre || !Number.isInteger(item.id)) throw new Error('Literal value was not preserved');
        const duplicate = await request(path, 'POST', { nombre });
        if (duplicate.status !== 409) throw new Error('Duplicate did not follow the same uniqueness rule');
        proof.observations.push({ value: nombre, firstStatus: 201, repeatedStatus: 409, preservedAsLiteral: true });
      }
      const response = await request(path + '?soloActivos=false');
      if (!response.ok) throw new Error('Cannot verify persisted values');
      const rows = await response.json();
      for (const nombre of payloads) if (rows.filter(row => row.nombre === nombre).length !== 1) throw new Error('Unexpected persisted result');
      proof.passed = true;
      result.acceptedAlertIds.push(...candidates.filter(alert => new URL(alert.url).pathname === path).map(alert => alert.id));
    } catch (error) { proof.error = error.message; }
    finally { for (const id of created) await request(path + '/' + id + '/desactivar', 'PATCH').catch(() => {}); }
    result.probes.push(proof);
  }
  return result;
}
