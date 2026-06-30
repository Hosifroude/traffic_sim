import type { BrakeCommand, TurnCommand, Vehicle } from '../types';

interface Props {
  vehicles: Vehicle[];
  durationSec: number;
  currentTime: number;
  selectedActionId: string | null;
  onSelectAction: (actionId: string) => void;
  onOpenAction: (actionId: string) => void;
  onDeleteAction: (actionId: string) => void;
}

export const getActionId = (vehicleId: string, eventIndex: number) => `${vehicleId}:${eventIndex}`;

const PIXELS_PER_SECOND = 56;
const TIME_GUTTER_WIDTH = 72;
const COLUMN_WIDTH = 136;
const BAR_INSET = 10;

const turnLabels: Record<TurnCommand, string> = { straight: '直進', left: '左折', right: '右折', stop: '停止' };
const brakeLabels: Record<BrakeCommand, string> = { none: 'なし', normal: '通常', hard: '強め', emergency: '急制動' };

type TimelineActionType = 'accelerator' | 'brake' | 'leftTurn' | 'rightTurn' | 'leftIndicator' | 'rightIndicator';

const actionColumns: Array<{ type: TimelineActionType; label: string }> = [
  { type: 'accelerator', label: 'アクセル' },
  { type: 'brake', label: 'ブレーキ' },
  { type: 'leftTurn', label: '左折' },
  { type: 'rightTurn', label: '右折' },
  { type: 'leftIndicator', label: '左ウインカー' },
  { type: 'rightIndicator', label: '右ウインカー' },
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

export function TimelineGrid({ vehicles, durationSec, currentTime, selectedActionId, onSelectAction, onOpenAction, onDeleteAction }: Props) {
  const actions = buildTimelineActions(vehicles);
  const totalHeight = Math.max(durationSec * PIXELS_PER_SECOND, 280);
  const ticks = Array.from({ length: Math.floor(durationSec / 0.5) + 1 }, (_, index) => Number((index * 0.5).toFixed(1)));

  return (
    <section className="timeline-card" aria-label="タイムライン編集">
      <div className="timeline-title-row">
        <div>
          <h2>タイムライン編集</h2>
          <p className="muted">縦軸が時間、横軸がアクション種別です。バーをダブルクリックすると設定を編集できます。</p>
        </div>
        {selectedActionId && (
          <button type="button" className="delete-selected compact" onClick={() => onDeleteAction(selectedActionId)}>選択中を削除</button>
        )}
      </div>
      <div className="timeline-scroll">
        <div className="timeline-grid" style={{ width: TIME_GUTTER_WIDTH + actionColumns.length * COLUMN_WIDTH, minHeight: totalHeight + 44 }}>
          <div className="timeline-corner">時間</div>
          <div className="timeline-columns" style={{ left: TIME_GUTTER_WIDTH }}>
            {actionColumns.map((column) => <div key={column.type} className="timeline-column-header">{column.label}</div>)}
          </div>
          <div className="timeline-body" style={{ top: 44, height: totalHeight }}>
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
                  aria-pressed={selected}
                  title={`${action.parameters.vehicleName}: ${action.startTime.toFixed(1)}〜${action.endTime.toFixed(1)}秒`}
                  onClick={() => onSelectAction(action.actionId)}
                  onDoubleClick={() => onOpenAction(action.actionId)}
                >
                  <strong>{action.parameters.vehicleName}</strong>
                  <span>{action.startTime.toFixed(1)}-{action.endTime.toFixed(1)}s</span>
                  <small>{turnLabels[action.parameters.turn]} / {brakeLabels[action.parameters.brake]}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
