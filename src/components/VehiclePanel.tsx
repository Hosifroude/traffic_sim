import { FormEvent, useState } from 'react';
import type { BrakeCommand, TurnCommand, Vehicle, VehicleEvent } from '../types';

interface Props {
  vehicle: Vehicle | undefined;
  currentTime: number;
  onAddEvent: (vehicleId: string, event: VehicleEvent) => void;
}

const turnLabels: Record<TurnCommand, string> = { straight: '直進', left: '左折', right: '右折', stop: '停止' };
const brakeLabels: Record<BrakeCommand, string> = { none: 'なし', normal: '通常', hard: '強め', emergency: '急制動' };

export function VehiclePanel({ vehicle, currentTime, onAddEvent }: Props) {
  const [targetSpeedKmh, setTargetSpeedKmh] = useState(20);
  const [durationSec, setDurationSec] = useState(1.5);
  const [turn, setTurn] = useState<TurnCommand>('straight');
  const [brake, setBrake] = useState<BrakeCommand>('none');

  if (!vehicle) return <aside className="vehicle-panel empty">車両を選択してください</aside>;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onAddEvent(vehicle.id, {
      time: Number(currentTime.toFixed(1)),
      targetSpeedKmh,
      durationSec,
      turn,
      brake,
    });
  };

  return (
    <aside className="vehicle-panel">
      <h2>{vehicle.name}</h2>
      <p className="muted">現在時刻 {currentTime.toFixed(1)}秒から操作を追加</p>
      <form onSubmit={submit}>
        <label>目標速度 km/h<input type="number" min="0" max="120" value={targetSpeedKmh} onChange={(e) => setTargetSpeedKmh(Number(e.target.value))} /></label>
        <label>所要時間 秒<input type="number" min="0.1" step="0.1" value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} /></label>
        <label>進行方向<select value={turn} onChange={(e) => setTurn(e.target.value as TurnCommand)}>{Object.entries(turnLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>ブレーキ強度<select value={brake} onChange={(e) => setBrake(e.target.value as BrakeCommand)}>{Object.entries(brakeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="submit">操作を追加</button>
      </form>
      <h3>タイムライン</h3>
      <ul className="event-list">
        {[...vehicle.events].sort((a, b) => a.time - b.time).map((event, index) => (
          <li key={`${event.time}-${index}`}>{event.time.toFixed(1)}s: {turnLabels[event.turn]} / {event.targetSpeedKmh}km/h / {event.durationSec}s / {brakeLabels[event.brake]}</li>
        ))}
      </ul>
    </aside>
  );
}
