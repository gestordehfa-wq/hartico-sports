import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataGrid, StatusBadge, WindowPanel } from "@hartico/ui";
import { useRacing } from "../../app/racing-context";
import { buildGrid, classifiedResults, confirmationIssues, formatLapTime, isConfirmed, pitCompliance, pitComplianceLabels, raceLapsFor } from "../../domain/results";
import { orderedCalendar } from "../../domain/rules";
import { AdminGate } from "./admin-pages";

// Consola de flujo Gran Premio → clasificación → parrilla → carrera → confirmación.
// La edición de datos usa los recursos administrativos; aquí solo se revisa y confirma.
export function RaceControlPage() {
  const { snapshot, repository, refresh } = useRacing();
  const events = useMemo(() => orderedCalendar(snapshot.grandPrix), [snapshot.grandPrix]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);

  const event = events.find(({ id }) => id === selectedId);
  const circuit = snapshot.circuits.find(({ id }) => id === event?.circuit_id);
  const season = snapshot.seasons.find(({ id }) => id === event?.season_id);
  const qualifying = snapshot.qualifying.filter(({ grand_prix_id }) => grand_prix_id === selectedId);
  const results = classifiedResults(snapshot.raceResults.filter(({ grand_prix_id }) => grand_prix_id === selectedId));
  const raceLaps = event && circuit ? raceLapsFor(event, circuit.default_laps) : 0;
  const confirmed = event ? isConfirmed(snapshot, event.id) : false;
  const issues = event ? confirmationIssues(results, raceLaps) : [];
  const grid = buildGrid(qualifying);
  const driverName = (id: string) => snapshot.drivers.find((driver) => driver.id === id)?.display_name ?? id;
  const teamName = (id: string) => snapshot.teams.find((team) => team.id === id)?.name ?? id;
  const gridDiffers = results.some((result) => grid.find((slot) => slot.driver_id === result.driver_id)?.position !== result.grid_position);

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await refresh();
      setMessage(done);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "La operación no pudo completarse.");
    } finally {
      setBusy(false);
    }
  }

  async function applyGrid() {
    if (!repository) return;
    await run(async () => {
      for (const result of results) {
        const slot = grid.find(({ driver_id }) => driver_id === result.driver_id);
        if (slot && slot.position !== result.grid_position) await repository.update("race_results", result.id, { grid_position: slot.position });
      }
    }, "Parrilla aplicada a los resultados en borrador.");
  }

  async function reopen(form: FormEvent<HTMLFormElement>) {
    form.preventDefault();
    if (!repository || !event) return;
    const reason = String(new FormData(form.currentTarget).get("reason") ?? "");
    await run(async () => {
      await repository.reopenResults(event.id, reason);
      setReopening(false);
    }, "Resultados reabiertos; la resolución quedó en el historial.");
  }

  return <AdminGate>
    <div className="admin-toolbar"><Link to="/admin">← Consola</Link><span>Flujo de Gran Premio</span></div>
    <header className="page-header"><p className="eyebrow">Administración</p><h1>Control de carrera</h1><p>Revisa parrilla, pits y confirma resultados. Confirmar congela puntos y bloquea ediciones.</p></header>
    <WindowPanel title="Gran Premio">
      <div className="form-grid">
        <label htmlFor="race-control-gp">Gran Premio
          <select id="race-control-gp" value={selectedId} onChange={(changeEvent) => { setSelectedId(changeEvent.target.value); setMessage(null); }}>
            <option value="">Seleccionar…</option>
            {events.map((item) => <option key={item.id} value={item.id}>{snapshot.seasons.find(({ id }) => id === item.season_id)?.name} · R{item.round_number} · {item.name}</option>)}
          </select>
        </label>
      </div>
    </WindowPanel>
    {event && <>
      <WindowPanel title={`${event.name} · ${season?.name ?? ""}`} status={`${circuit?.name ?? "Circuito"} · ${raceLaps} vueltas`} className="data-window">
        <p><StatusBadge status={confirmed ? "completed" : "scheduled"} label={confirmed ? "Resultados confirmados" : "Borrador de resultados"} /></p>
        {!confirmed && (issues.length ? <ul aria-label="Pendientes para confirmar">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="form-message" role="status">Listo para confirmar.</p>)}
        <div className="dialog-actions">
          <Link className="button" to="/admin/qualifying">Editar clasificación</Link>
          <Link className="button" to="/admin/race-results">Editar resultados</Link>
          {!confirmed && <button type="button" className="button" disabled={busy || !gridDiffers || !results.length} onClick={() => void applyGrid()}>Aplicar parrilla</button>}
          {!confirmed && <button type="button" className="button primary" disabled={busy || issues.length > 0} onClick={() => void run(async () => repository?.confirmResults(event.id), "Resultados confirmados.")}>Confirmar resultados</button>}
          {confirmed && <button type="button" className="button danger" disabled={busy} onClick={() => setReopening(true)}>Reabrir con resolución</button>}
        </div>
        {message && <p className="form-message" role="status">{message}</p>}
      </WindowPanel>
      <WindowPanel title="Parrilla calculada" status={`${grid.length} pilotos`} className="data-window">
        <DataGrid rows={grid} rowKey={(slot) => slot.driver_id} empty="Aún no hay tiempos de clasificación." columns={[
          { key: "position", label: "Pos", render: (slot) => slot.position }, { key: "driver", label: "Piloto", render: (slot) => driverName(slot.driver_id) },
          { key: "team", label: "Escudería", render: (slot) => teamName(slot.team_id) }, { key: "best", label: "Mejor tiempo", render: (slot) => formatLapTime(slot.best_time_ms) },
        ]} />
      </WindowPanel>
      <WindowPanel title="Carrera y pits" status={`${results.length} resultados`} className="data-window">
        <DataGrid rows={results} rowKey={(result) => result.id} empty="Aún no hay resultados de carrera." columns={[
          { key: "pos", label: "Pos", render: (result) => result.final_position ?? result.status.toUpperCase() }, { key: "driver", label: "Piloto", render: (result) => driverName(result.driver_id) },
          { key: "team", label: "Escudería", render: (result) => teamName(result.team_id) }, { key: "grid", label: "Salida", render: (result) => result.grid_position ?? "—" },
          { key: "laps", label: "Vueltas", render: (result) => `${result.laps_completed}/${raceLaps}` }, { key: "time", label: "Tiempo", render: (result) => formatLapTime(result.total_time_ms) },
          { key: "pit", label: "Pit", render: (result) => `${pitComplianceLabels[pitCompliance(result)]}${result.pit_stop_lap ? ` · vuelta ${result.pit_stop_lap}` : ""}` },
          { key: "points", label: "Puntos", render: (result) => result.points ?? "—" },
        ]} />
      </WindowPanel>
    </>}
    {reopening && event && <div className="dialog-backdrop"><form className="window confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="reopen-title" onSubmit={(submitEvent) => void reopen(submitEvent)}>
      <header className="title-bar" id="reopen-title">Reabrir resultados</header>
      <div className="window-body form-grid">
        <p>Los resultados de <strong>{event.name}</strong> volverán a borrador y saldrán del campeonato hasta confirmarlos de nuevo. La razón queda en el historial.</p>
        <label htmlFor="reopen-reason">Resolución administrativa (mín. 10 caracteres)<input id="reopen-reason" name="reason" type="text" minLength={10} required /></label>
        <div className="dialog-actions"><button type="button" className="button" onClick={() => setReopening(false)}>Cancelar</button><button type="submit" className="button danger" disabled={busy}>Reabrir</button></div>
      </div>
    </form></div>}
  </AdminGate>;
}
