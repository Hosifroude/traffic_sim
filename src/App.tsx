import { useEffect, useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { Stage } from './components/Stage';
import { VehiclePanel } from './components/VehiclePanel';
import { sampleScenario } from './sampleScenario';
import { findFirstCollision } from './simulation/collision';
import { simulateScenario } from './simulation/engine';
import type { Scenario, VehicleEvent } from './types';
import './styles.css';

const clampTime = (value: number, duration: number) => Number(Math.min(duration, Math.max(0, value)).toFixed(1));

export default function App() {
  const [scenario, setScenario] = useState<Scenario>(sampleScenario);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(sampleScenario.vehicles[0]?.id ?? '');
  const [copied, setCopied] = useState(false);

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
  const selectedVehicle = scenario.vehicles.find((vehicle) => vehicle.id === selectedVehicleId);

  const addEvent = (vehicleId: string, event: VehicleEvent) => {
    setScenario((current) => ({
      ...current,
      vehicles: current.vehicles.map((vehicle) => vehicle.id === vehicleId
        ? { ...vehicle, events: [...vehicle.events, event].sort((a, b) => a.time - b.time) }
        : vehicle),
    }));
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>交通シナリオエディタ</h1>
          <p>車両ごとの操作タイムラインで事故・ヒヤリハット状況を試作します。</p>
        </div>
      </header>
      <div className="workspace">
        <Stage scenario={scenario} states={states} selectedVehicleId={selectedVehicleId} collision={collision} onSelectVehicle={setSelectedVehicleId} />
        <VehiclePanel vehicle={selectedVehicle} currentTime={time} onAddEvent={addEvent} />
      </div>
      <section className="json-panel">
        <div className="json-header"><h2>Scenario JSON</h2><button onClick={copyJson}>{copied ? 'コピー済み' : 'JSONをコピー'}</button></div>
        <pre>{json}</pre>
      </section>
      <Controls time={time} duration={scenario.durationSec} playing={playing} onStep={(delta) => setTime((current) => clampTime(current + delta, scenario.durationSec))} onToggle={() => setPlaying((value) => !value)} onReset={() => { setPlaying(false); setTime(0); }} />
    </main>
  );
}
