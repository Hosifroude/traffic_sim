import { useRef } from 'react';
import type { BrakeCommand, TurnCommand, Vehicle } from '../types';

interface Props {
  vehicles: Vehicle[];
  durationSec: number;
  currentTime: number;
  selectedTargetId: string | null;
  selectedActionId: string | null;
  onSelectAction: (actionId: string) => void;
  onOpenAction: (actionId: string) => void;
  onDeleteAction: (actionId: string) => void;
}

export const getActionId = (vehicleId: string, eventIndex: number) => `${vehicleId}:${eventIndex}`;

const PIXELS_PER_SECOND = 56;
const TIME_GUTTER_WIDTH = 56;
const COLUMN_WIDTH = 68;
const BAR_INSET = 6;
const HEADER_HEIGHT = 40;
const DOUBLE_TAP_MS = 320;

const turnLabels: Record<TurnCommand, string> = { straight: '直進', left: '左折', right: '右折', stop: '停止' };
const brakeLabels: Record<BrakeCommand, string> = { none: 'なし', normal: '通常', hard: '強め', emergency: '急制動' };

type TimelineActionType = 'accelerator' | 'brake' | 'leftTurn' | 'rightTurn' | 'leftIndicator' | 'rightIndicator';

const actionColumns: Array<{ type: TimelineActionType; label: string; fullLabel: string }> = [
  { type: 'accelerator', label: 'A', fullLabel: 'アクセル' },
  { type: 'brake', label: 'B', fullLabel: 'ブレーキ' },
  { type: 'leftTurn', label: 'L', fullLabel: '左折' },
  { type: 'rightTurn', label: 'R', fullLabel: '右折' },
  { type: 'leftIndicator', label: 'LW', fullLabel: '左ウインカー' },
  { type: 'rightIndicator', label: 'RW', fullLabel: '右ウインカー' },
];

interface TimelineAction {
  actionId: string;
  targetId: string;
  actionType: TimelineActionType;
  startTime: number;
  endTime: number;
  duration: number;
  parameters: {
    vehicleName: string;
    targetSpeedKmh: number;
    turn: TurnCommand;
    brake: BrakeCommand;
  };
}

function getActionTypes(event: Vehicle['events'][number]): TimelineActionType[] {
  const types: TimelineActionType[] = [];
  if (event.targetSpeedKmh > 0 && event.brake === 'none') types.push('accelerator');
  if (event.brake !== 'none' || event.targetSpeedKmh === 0 || event.turn === 'stop') types.push('brake');
  if (event.turn === 'left') types.push('leftTurn', 'leftIndicator');
  if (event.turn === 'right') types.push('rightTurn', 'rightIndicator');
  return types.length > 0 ? types : ['accelerator'];
}

function buildTimelineActions(vehicles: Vehicle[]): TimelineAction[] {
  return vehicles.flatMap((vehicle) => vehicle.events.flatMap((event, index) => {
    const startTime = event.time;
    const duration = Math.max(0.1, event.durationSec);
    const endTime = startTime + duration;
    const actionId = getActionId(vehicle.id, index);
    return getActionTypes(event).map((actionType) => ({
      actionId,
      targetId: vehicle.id,
      actionType,
      startTime,
      endTime,
      duration,
      parameters: {
        vehicleName: vehicle.name,
        targetSpeedKmh: event.targetSpeedKmh,
        turn: event.turn,
        brake: event.brake,
      },
    }));
  }));
}

function filterTimelineActions(actions: TimelineAction[], selectedTargetId: string | null) {
  if (!selectedTargetId) return [];
  return actions.filter((action) => action.targetId === selectedTargetId);
}

export function TimelineGrid({ vehicles, durationSec, currentTime, selectedTargetId, selectedActionId, onSelectAction, onOpenAction, onDeleteAction }: Props) {
  const lastTapRef = useRef<{ actionId: string; time: number } | null>(null);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedTargetId) ?? null;
  const actions = filterTimelineActions(buildTimelineActions(vehicles), selectedTargetId);
  const selectedActionVisible = selectedActionId ? actions.some((action) => action.actionId === selectedActionId) : false;
  const totalHeight = Math.max(durationSec * PIXELS_PER_SECOND, 280);
  const ticks = Array.from({ length: Math.floor(durationSec / 0.5) + 1 }, (_, index) => Number((index * 0.5).toFixed(1)));
  const gridWidth = TIME_GUTTER_WIDTH + actionColumns.length * COLUMN_WIDTH;

  const handlePointerUp = (actionId: string) => {
    const now = Date.now();
    const previousTap = lastTapRef.current;
    if (previousTap?.actionId === actionId && now - previousTap.time <= DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      onOpenAction(actionId);
      return;
    }
    lastTapRef.current = { actionId, time: now };
  };

  return (
    <section className="timeline-card" aria-label="タイムライン編集">
      <div className="timeline-title-row">
        <div className="timeline-heading">
          <h2>タイムライン編集</h2>
          {selectedVehicle ? <strong className="timeline-target" title={selectedVehicle.name}>{selectedVehicle.name}</strong> : <p className="muted">オブジェクトを選択するとタイムラインを表示します</p>}
          <p className="timeline-legend" aria-label="列名凡例">A=アクセル / B=ブレーキ / L=左折 / R=右折 / LW=左ウインカー / RW=右ウインカー</p>
        </div>
        {selectedActionVisible && selectedActionId && (
          <button type="button" className="delete-selected compact" onClick={() => onDeleteAction(selectedActionId)}>選択中を削除</button>
        )}
      </div>
      {!selectedVehicle ? (
        <div className="timeline-empty" role="status">オブジェクトを選択するとタイムラインを表示します</div>
      ) : (
        <div className="timeline-scroll">
          <div className="timeline-grid" style={{ width: gridWidth, minHeight: totalHeight + HEADER_HEIGHT }}>
            <div className="timeline-corner">時間</div>
            <div className="timeline-columns" style={{ left: TIME_GUTTER_WIDTH }}>
              {actionColumns.map((column) => <div key={column.type} className="timeline-column-header" title={column.fullLabel}>{column.label}</div>)}
            </div>
            <div className="timeline-body" style={{ top: HEADER_HEIGHT, height: totalHeight }}>
              {ticks.map((tick) => (
                <div key={tick} className={`time-tick${Number.isInteger(tick) ? ' major' : ''}`} style={{ top: tick * PIXELS_PER_SECOND }}>
                  <span>{tick.toFixed(1)}s</span>
                </div>
              ))}
              {actionColumns.map((column, index) => <div key={column.type} className="timeline-lane" style={{ left: TIME_GUTTER_WIDTH + index * COLUMN_WIDTH, width: COLUMN_WIDTH }} />)}
              <div className="playhead" style={{ top: currentTime * PIXELS_PER_SECOND }}><span>{currentTime.toFixed(1)}s</span></div>
              {actions.map((action) => {
                const columnIndex = actionColumns.findIndex((column) => column.type === action.actionType);
                const selected = selectedActionId === action.actionId;
                const column = actionColumns[columnIndex];
                return (
                  <button
                    key={`${action.actionId}-${action.actionType}`}
                    type="button"
                    className={`action-bar ${action.actionType}${selected ? ' selected' : ''}`}
                    style={{
                      left: TIME_GUTTER_WIDTH + columnIndex * COLUMN_WIDTH + BAR_INSET,
                      top: action.startTime * PIXELS_PER_SECOND,
                      height: Math.max(action.duration * PIXELS_PER_SECOND, 24),
                      width: COLUMN_WIDTH - BAR_INSET * 2,
                    }}
                    aria-label={`${column.fullLabel}: ${action.startTime.toFixed(1)}〜${action.endTime.toFixed(1)}秒、${turnLabels[action.parameters.turn]}、ブレーキ${brakeLabels[action.parameters.brake]}`}
                    aria-pressed={selected}
                    title={`${column.fullLabel}: ${action.startTime.toFixed(1)}〜${action.endTime.toFixed(1)}秒`}
                    onClick={() => onSelectAction(action.actionId)}
                    onDoubleClick={() => onOpenAction(action.actionId)}
                    onPointerUp={() => handlePointerUp(action.actionId)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
