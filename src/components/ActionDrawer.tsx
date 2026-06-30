import { FormEvent, useEffect, useState } from 'react';
import type { BrakeCommand, TurnCommand, Vehicle, VehicleEvent } from '../types';

interface Props {
  open: boolean;
  vehicle: Vehicle | undefined;
  action: VehicleEvent | null;
  currentTime: number;
  onClose: () => void;
  onSave: (event: VehicleEvent) => void;
}

const turnLabels: Record<TurnCommand, string> = { straight: '直進', left: '左折', right: '右折', stop: '停止' };
const brakeLabels: Record<BrakeCommand, string> = { none: 'なし', normal: '通常', hard: '強め', emergency: '急制動' };

export function ActionDrawer({ open, vehicle, action, currentTime, onClose, onSave }: Props) {
  const [time, setTime] = useState(Number(currentTime.toFixed(1)));
  const [targetSpeedKmh, setTargetSpeedKmh] = useState(20);
  const [durationSec, setDurationSec] = useState(1.5);
  const [turn, setTurn] = useState<TurnCommand>('straight');
  const [brake, setBrake] = useState<BrakeCommand>('none');

  useEffect(() => {
    if (!open) return;
    setTime(action?.time ?? Number(currentTime.toFixed(1)));
    setTargetSpeedKmh(action?.targetSpeedKmh ?? 20);
    setDurationSec(action?.durationSec ?? 1.5);
    setTurn(action?.turn ?? 'straight');
    setBrake(action?.brake ?? 'none');
  }, [action, currentTime, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open || !vehicle) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ time, targetSpeedKmh, durationSec, turn, brake });
  };

  return (
    <aside className="action-drawer" aria-label="アクション設定">
      <div className="drawer-header">
        <div>
          <h2>アクション設定</h2>
          <p className="muted">{action ? '既存アクションを編集中' : '新規アクションを追加'}</p>
        </div>
        <button type="button" className="icon-button" aria-label="アクション設定を閉じる" onClick={onClose}>×</button>
      </div>
      <div className="editing-summary">
        <strong>{vehicle.name}</strong>
        <span>現在のアクション：{action ? turnLabels[action.turn] : '新規'}</span>
        <span>開始：{time.toFixed(1)}秒</span>
        <span>終了：{(time + durationSec).toFixed(1)}秒</span>
      </div>
      <form onSubmit={submit}>
        <label>開始 秒<input type="number" min="0" step="0.1" value={time} onChange={(e) => setTime(Number(e.target.value))} /></label>
        <label>目標速度 km/h<input type="number" min="0" max="120" value={targetSpeedKmh} onChange={(e) => setTargetSpeedKmh(Number(e.target.value))} /></label>
        <label>所要時間 秒<input type="number" min="0.1" step="0.1" value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} /></label>
        <label>進行方向<select value={turn} onChange={(e) => setTurn(e.target.value as TurnCommand)}>{Object.entries(turnLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>ブレーキ強度<select value={brake} onChange={(e) => setBrake(e.target.value as BrakeCommand)}>{Object.entries(brakeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="submit">{action ? 'アクションを更新' : 'アクションを追加'}</button>
      </form>
    </aside>
  );
}
