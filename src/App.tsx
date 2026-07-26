import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionDrawer } from './components/ActionDrawer';
import { Controls } from './components/Controls';
import { LiveRecorder, type LiveDrivingInput } from './components/LiveRecorder';
import { Stage } from './components/Stage';
import { TimelineGrid } from './components/TimelineGrid';
import { sampleScenario } from './sampleScenario';
import { simulateScenario } from './simulation/engine';
import type { Scenario, VehicleEvent } from './types';
import './styles.css';

const clampTime = (value: number, duration: number) => Number(Math.min(duration, Math.max(0, value)).toFixed(1));
const EMPTY_DRIVING_INPUT: LiveDrivingInput = { accelerator: false, brake: false, steering: 'straight' };
const parseActionId = (actionId: string) => {
  const [vehicleId, index] = actionId.split(':');
  return { vehicleId, eventIndex: Number(index) };
};

export default function App() {
  const [scenario, setScenario] = useState<Scenario>(sampleScenario);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'json'>('editor');
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [drivingInput, setDrivingInput] = useState<LiveDrivingInput>(EMPTY_DRIVING_INPUT);
  const recordedSpeedRef = useRef(0);
  const drivingInputRef = useRef(drivingInput);

  const updateDrivingInput = useCallback((input: LiveDrivingInput) => {
    drivingInputRef.current = input;
    setDrivingInput(input);
  }, []);

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

  useEffect(() => {
    if (!recording || !selectedVehicleId) return;
    const id = window.setInterval(() => {
      setTime((current) => {
        const next = clampTime(current + 0.1, scenario.durationSec);
        const controls = drivingInputRef.current;
        let speed = recordedSpeedRef.current;
        if (controls.brake) speed = Math.max(0, speed - 4);
        else if (controls.accelerator) speed = Math.min(80, speed + 2);
        recordedSpeedRef.current = speed;

        const brake = controls.brake ? 'hard' as const : 'none' as const;
        const turn = speed === 0 && controls.brake ? 'stop' as const : controls.steering;
        const targetSpeedKmh = controls.brake && speed > 0 ? speed / 0.5 : speed;
        const event: VehicleEvent = {
          time: current,
          durationSec: Math.max(0.1, next - current),
          targetSpeedKmh,
          turn,
          brake,
        };

        setScenario((currentScenario) => ({
          ...currentScenario,
          vehicles: currentScenario.vehicles.map((vehicle) => vehicle.id === selectedVehicleId
            ? { ...vehicle, events: [...vehicle.events, event] }
            : vehicle),
        }));

        if (next >= scenario.durationSec) {
          setRecording(false);
          updateDrivingInput(EMPTY_DRIVING_INPUT);
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [recording, scenario.durationSec, selectedVehicleId, updateDrivingInput]);

  const states = useMemo(() => simulateScenario(scenario, time), [scenario, time]);
  const json = useMemo(() => JSON.stringify(scenario, null, 2), [scenario]);

  useEffect(() => {
    if (activeTab === 'json') setJsonDraft(json);
  }, [activeTab, json]);

  const editingVehicleId = editingActionId ? parseActionId(editingActionId).vehicleId : selectedVehicleId;
  const editingVehicle = editingVehicleId ? scenario.vehicles.find((vehicle) => vehicle.id === editingVehicleId) : undefined;
  const editingEvent = editingActionId ? editingVehicle?.events[parseActionId(editingActionId).eventIndex] ?? null : null;

  const selectVehicle = (vehicleId: string) => {
    if (recording) return;
    setSelectedVehicleId(vehicleId);
    setSelectedActionId(null);
    setEditingActionId(null);
  };

  const toggleRecording = () => {
    if (recording) {
      setRecording(false);
      updateDrivingInput(EMPTY_DRIVING_INPUT);
      return;
    }
    if (!selectedVehicleId) return;
    setPlaying(false);
    setTime(0);
    recordedSpeedRef.current = 0;
    updateDrivingInput(EMPTY_DRIVING_INPUT);
    setScenario((current) => ({
      ...current,
      vehicles: current.vehicles.map((vehicle) => vehicle.id === selectedVehicleId ? { ...vehicle, events: [] } : vehicle),
    }));
    setSelectedActionId(null);
    setRecording(true);
  };

  const openVehicleSettings = (vehicleId: string) => {
    selectVehicle(vehicleId);
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
    if (!vehicleId) return;
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
            <Stage scenario={scenario} states={states} selectedVehicleId={selectedVehicleId} onSelectVehicle={selectVehicle} onOpenVehicleSettings={openVehicleSettings} />
          </div>
          <LiveRecorder
            vehicleName={scenario.vehicles.find((vehicle) => vehicle.id === selectedVehicleId)?.name ?? null}
            recording={recording}
            input={drivingInput}
            onInputChange={updateDrivingInput}
            onToggleRecording={toggleRecording}
          />
          <TimelineGrid vehicles={scenario.vehicles} durationSec={scenario.durationSec} currentTime={time} selectedTargetId={selectedVehicleId} selectedActionId={selectedActionId} onSelectAction={selectAction} onOpenAction={openActionSettings} onDeleteAction={deleteAction} />
        </div>
      ) : (
        <section className="json-panel">
          <div className="json-header"><h2>Scenario JSON</h2><button onClick={copyJson}>{copied ? 'コピー済み' : 'JSONをコピー'}</button></div>
          <textarea className="json-editor" value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} spellCheck={false} />
          <div className="json-actions"><button type="button" onClick={loadJson}>JSONを読み込み</button>{jsonError && <p className="json-error">{jsonError}</p>}</div>
        </section>
      )}
      <ActionDrawer open={drawerOpen} vehicle={editingVehicle} action={editingEvent} currentTime={time} onClose={() => setDrawerOpen(false)} onSave={saveEvent} />
      <Controls time={time} duration={scenario.durationSec} playing={playing} disabled={recording} onStep={(delta) => setTime((current) => clampTime(current + delta, scenario.durationSec))} onToggle={() => setPlaying((value) => !value)} onReset={() => { setPlaying(false); setTime(0); }} />
    </main>
  );
}
