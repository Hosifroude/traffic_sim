import { useState } from 'react';
import type { BrakeCommand, TurnCommand, Vehicle } from '../types';

interface Props {
  vehicle: Vehicle | undefined;
  selectedActionId: string | null;
  onSelectAction: (actionId: string) => void;
  onOpenAction: (actionId: string) => void;
  onDeleteAction: (actionId: string) => void;
}

const turnLabels: Record<TurnCommand, string> = { straight: '直進', left: '左折', right: '右折', stop: '停止' };
const brakeLabels: Record<BrakeCommand, string> = { none: 'なし', normal: '通常', hard: '強め', emergency: '急制動' };

export const getActionId = (vehicleId: string, eventIndex: number) => `${vehicleId}:${eventIndex}`;

export function VehiclePanel({ vehicle, selectedActionId, onSelectAction, onOpenAction, onDeleteAction }: Props) {
  const [contextMenu, setContextMenu] = useState<{ actionId: string; x: number; y: number } | null>(null);
  if (!vehicle) return <aside className="vehicle-panel empty">車両を選択してください</aside>;

  const sortedEvents = vehicle.events
    .map((event, index) => ({ event, index, actionId: getActionId(vehicle.id, index) }))
    .sort((a, b) => a.event.time - b.event.time);

  return (
    <aside className="vehicle-panel">
      <h2>{vehicle.name}</h2>
      <p className="muted">ステージの車両、またはタイムラインのアクションをダブルクリックして設定を開きます。</p>
      <h3>タイムライン</h3>
      {sortedEvents.length === 0 ? (
        <p className="muted">アクションはまだありません。</p>
      ) : (
        <ul className="event-list" aria-label={`${vehicle.name}のタイムライン`}>
          {sortedEvents.map(({ event, actionId }) => {
            const selected = actionId === selectedActionId;
            return (
              <li key={actionId}>
                <button
                  type="button"
                  className={`event-item${selected ? ' selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onSelectAction(actionId)}
                  onDoubleClick={() => onOpenAction(actionId)}
                  onContextMenu={(menuEvent) => {
                    menuEvent.preventDefault();
                    onSelectAction(actionId);
                    setContextMenu({ actionId, x: menuEvent.clientX, y: menuEvent.clientY });
                  }}
                >
                  <span><strong>{event.time.toFixed(1)}s</strong> {turnLabels[event.turn]} / {event.targetSpeedKmh}km/h</span>
                  <span className="muted">{event.durationSec}s / {brakeLabels[event.brake]}</span>
                </button>
                {selected && (
                  <button type="button" className="event-delete" aria-label="選択中のアクションを削除" onClick={() => onDeleteAction(actionId)}>🗑</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {selectedActionId && <button type="button" className="delete-selected" onClick={() => onDeleteAction(selectedActionId)}>選択中のアクションを削除</button>}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseLeave={() => setContextMenu(null)}>
          <button type="button" onClick={() => { onDeleteAction(contextMenu.actionId); setContextMenu(null); }}>削除</button>
        </div>
      )}
    </aside>
  );
}
