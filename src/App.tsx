import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionDrawer } from './components/ActionDrawer';
import { Controls } from './components/Controls';
import { Stage } from './components/Stage';
import { TimelineGrid } from './components/TimelineGrid';
import { sampleScenario } from './sampleScenario';
import { findFirstCollision } from './simulation/collision';
import { simulateScenario } from './simulation/engine';
import type { Scenario, VehicleEvent } from './types';
import './styles.css';

const clampTime = (value: number, duration: number) => Number(Math.min(duration, Math.max(0, value)).toFixed(1));
const parseActionId = (actionId: string) => {
  const [vehicleId, index] = actionId.split(':');
  return { vehicleId, eventIndex: Number(index) };
};

export default function App() {
  const [scenario, setScenario] = useState<Scenario>(sampleScenario);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(sampleScenario.vehicles[0]?.id ?? '');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'json'>('editor');
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTime((current) => {
        const next = clampTime(current + 0.1, scenario.durationSec);
        if (next >= scenario.durationSec) setPlaying(false);
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, scenario.durationSec]);

  const states = useMemo(() => simulateScenario(scenario, time), [scenario, time]);
  const collision = useMemo(() => findFirstCollision(scenario), [scenario]);
  const json = useMemo(() => JSON.stringify(scenario, null, 2), [scenario]);

  useEffect(() => {
    if (activeTab === 'json') setJsonDraft(json);
  }, [activeTab, json]);

  const editingVehicleId = editingActionId ? parseActionId(editingActionId).vehicleId : selectedVehicleId;
  const editingVehicle = scenario.vehicles.find((vehicle) => vehicle.id === editingVehicleId);
  const editingEvent = editingActionId ? editingVehicle?.events[parseActionId(editingActionId).eventIndex] ?? null : null;

  const openVehicleSettings = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setEditingActionId(null);
    setDrawerOpen(true);
  };

  const openActionSettings = (actionId: string) => {
    const { vehicleId } = parseActionId(actionId);
    setSelectedVehicleId(vehicleId);
    setSelectedActionId(actionId);
    setEditingActionId(actionId);
    setDrawerOpen(true);
  };

  const saveEvent = (event: VehicleEvent) => {
    const vehicleId = editingActionId ? parseActionId(editingActionId).vehicleId : selectedVehicleId;
    const eventIndex = editingActionId ? parseActionId(editingActionId).eventIndex : -1;
    setScenario((current) => ({
      ...current,
      vehicles: current.vehicles.map((vehicle) => {
        if (vehicle.id !== vehicleId) return vehicle;
        const events = editingActionId
          ? vehicle.events.map((currentEvent, index) => (index === eventIndex ? event : currentEvent))
          : [...vehicle.events, event];
        return { ...vehicle, events: events.sort((a, b) => a.time - b.time) };
      }),
    }));
    setDrawerOpen(false);
  };

  const deleteAction = useCallback((actionId: string) => {
    const { vehicleId, eventIndex } = parseActionId(actionId);
    setScenario((current) => ({
      ...current,
      vehicles: current.vehicles.map((vehicle) => vehicle.id === vehicleId
        ? { ...vehicle, events: vehicle.events.filter((_, index) => index !== eventIndex) }
        : vehicle),
    }));
    setSelectedActionId(null);
    if (editingActionId === actionId) {
      setEditingActionId(null);
      setDrawerOpen(false);
    }
  }, [editingActionId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedActionId) deleteAction(selectedActionId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteAction, selectedActionId]);

  const selectAction = (actionId: string) => {
    setSelectedActionId(actionId);
    setSelectedVehicleId(parseActionId(actionId).vehicleId);
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(jsonDraft || json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const loadJson = () => {
    try {
      const nextScenario = JSON.parse(jsonDraft) as Scenario;
      if (!Array.isArray(nextScenario.vehicles) || !nextScenario.map || typeof nextScenario.durationSec !== 'number') {
        throw new Error('Scenario の必須フィールドが不足しています。');
      }
      setScenario(nextScenario);
      setJsonError(null);
      setTime((current) => clampTime(current, nextScenario.durationSec));
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSONを読み込めませんでした。');
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>交通シナリオエディタ</h1>
          <p>車両ごとの操作タイムラインで事故・ヒヤリハット状況を試作します。</p>
        </div>
      </header>
      <nav className="tabs" aria-label="編集タブ">
        <button type="button" className={activeTab === 'editor' ? 'active' : ''} onClick={() => setActiveTab('editor')}>ステージ / タイムライン</button>
        <button type="button" className={activeTab === 'json' ? 'active' : ''} onClick={() => setActiveTab('json')}>シナリオJSON</button>
      </nav>
      {activeTab === 'editor' ? (
        <div className="editor-stack">
          <div className="workspace">
            <Stage scenario={scenario} states={states} selectedVehicleId={selectedVehicleId} collision={collision} onSelectVehicle={setSelectedVehicleId} onOpenVehicleSettings={openVehicleSettings} />
          </div>
          <TimelineGrid vehicles={scenario.vehicles} durationSec={scenario.durationSec} currentTime={time} selectedActionId={selectedActionId} onSelectAction={selectAction} onOpenAction={openActionSettings} onDeleteAction={deleteAction} />
        </div>
      ) : (
        <section className="json-panel">
          <div className="json-header"><h2>Scenario JSON</h2><button onClick={copyJson}>{copied ? 'コピー済み' : 'JSONをコピー'}</button></div>
          <textarea className="json-editor" value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} spellCheck={false} />
          <div className="json-actions"><button type="button" onClick={loadJson}>JSONを読み込み</button>{jsonError && <p className="json-error">{jsonError}</p>}</div>
        </section>
      )}
      <ActionDrawer open={drawerOpen} vehicle={editingVehicle} action={editingEvent} currentTime={time} onClose={() => setDrawerOpen(false)} onSave={saveEvent} />
      <Controls time={time} duration={scenario.durationSec} playing={playing} onStep={(delta) => setTime((current) => clampTime(current + delta, scenario.durationSec))} onToggle={() => setPlaying((value) => !value)} onReset={() => { setPlaying(false); setTime(0); }} />
    </main>
  );
}
