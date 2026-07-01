import { useMemo, useRef, useState } from 'react';
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

const PIXELS_PER_SECOND = 72;
const ROW_LABEL_WIDTH = 104;
const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 34;
const BAR_HEIGHT = 18;
const BAR_TOP_INSET = 8;
const DOUBLE_TAP_MS = 320;
const GROUP_GAP = 8;
const MIN_TIMELINE_WIDTH = 560;

const turnLabels: Record<TurnCommand, string> = { straight: '直進', left: '左折', right: '右折', stop: '停止' };
const brakeLabels: Record<BrakeCommand, string> = { none: 'なし', normal: '通常', hard: '強め', emergency: '急制動' };

type TimelineActionType = 'accelerator' | 'brake' | 'leftTurn' | 'rightTurn' | 'leftIndicator' | 'rightIndicator';
type ActionGroupId = 'driving' | 'equipment';

const ACTION_META: Record<TimelineActionType, { label: string; shortLabel: string; color: string; groupId: ActionGroupId }> = {
  accelerator: { label: 'アクセル', shortLabel: 'A', color: '#22c55e', groupId: 'driving' },
  brake: { label: 'ブレーキ', shortLabel: 'B', color: '#ef4444', groupId: 'driving' },
  leftTurn: { label: '左折', shortLabel: 'L', color: '#3b82f6', groupId: 'driving' },
  rightTurn: { label: '右折', shortLabel: 'R', color: '#a855f7', groupId: 'driving' },
  leftIndicator: { label: '左ウインカー', shortLabel: 'LW', color: '#eab308', groupId: 'equipment' },
  rightIndicator: { label: '右ウインカー', shortLabel: 'RW', color: '#f97316', groupId: 'equipment' },
};

const ACTION_GROUPS: Array<{ id: ActionGroupId; label: string; actions: TimelineActionType[] }> = [
  { id: 'driving', label: '走行操作', actions: ['accelerator', 'brake', 'leftTurn', 'rightTurn'] },
  { id: 'equipment', label: '装備操作', actions: ['leftIndicator', 'rightIndicator'] },
];

interface TimelineAction {
  actionId: string;
  targetId: string;
  actionType: TimelineActionType;
  groupId: ActionGroupId;
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

interface GroupInterval {
  id: string;
  groupId: ActionGroupId;
  startTime: number;
  endTime: number;
  actions: TimelineAction[];
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
      groupId: ACTION_META[actionType].groupId,
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

function buildGroupIntervals(actions: TimelineAction[], groupId: ActionGroupId): GroupInterval[] {
  const groupActions = actions.filter((action) => action.groupId === groupId).sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
  const intervals: GroupInterval[] = [];
  groupActions.forEach((action) => {
    const current = intervals.at(-1);
    if (current && action.startTime <= current.endTime) {
      current.endTime = Math.max(current.endTime, action.endTime);
      current.actions.push(action);
    } else {
      intervals.push({ id: `${groupId}-${intervals.length}`, groupId, startTime: action.startTime, endTime: action.endTime, actions: [action] });
    }
  });
  return intervals;
}

export function TimelineGrid({ vehicles, durationSec, currentTime, selectedTargetId, selectedActionId, onSelectAction, onOpenAction, onDeleteAction }: Props) {
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<ActionGroupId>>(() => new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<ActionGroupId | null>(null);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedTargetId) ?? null;
  const actions = filterTimelineActions(buildTimelineActions(vehicles), selectedTargetId);
  const selectedActionVisible = selectedActionId ? actions.some((action) => action.actionId === selectedActionId) : false;
  const ticks = Array.from({ length: Math.floor(durationSec) + 1 }, (_, index) => index);
  const timelineWidth = Math.max(durationSec * PIXELS_PER_SECOND, MIN_TIMELINE_WIDTH);
  const rows = ACTION_GROUPS.flatMap((group) => [
    { kind: 'group' as const, group },
    ...(expandedGroups.has(group.id) ? group.actions.map((actionType) => ({ kind: 'action' as const, group, actionType })) : []),
    { kind: 'gap' as const, group },
  ]);
  const totalHeight = HEADER_HEIGHT + rows.reduce((height, row) => height + (row.kind === 'gap' ? GROUP_GAP : ROW_HEIGHT), 0);
  const groupIntervals = useMemo(() => Object.fromEntries(ACTION_GROUPS.map((group) => [group.id, buildGroupIntervals(actions, group.id)])) as Record<ActionGroupId, GroupInterval[]>, [actions]);

  const toggleGroup = (groupId: ActionGroupId) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleTap = (id: string, onDoubleTap: () => void) => {
    const now = Date.now();
    const previousTap = lastTapRef.current;
    if (previousTap?.id === id && now - previousTap.time <= DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      onDoubleTap();
      return;
    }
    lastTapRef.current = { id, time: now };
  };

  let rowTop = HEADER_HEIGHT;

  return (
    <section className="timeline-card" aria-label="タイムライン編集">
      <div className="timeline-title-row">
        <div className="timeline-heading">
          <h2>タイムライン編集</h2>
          {selectedVehicle ? <strong className="timeline-target" title={selectedVehicle.name}>{selectedVehicle.name}</strong> : <p className="muted">オブジェクトを選択するとタイムラインを表示します</p>}
          <p className="timeline-legend" aria-label="凡例">A=アクセル / B=ブレーキ / L=左折 / R=右折 / LW=左ウインカー / RW=右ウインカー</p>
        </div>
        {selectedActionVisible && selectedActionId && (
          <button type="button" className="delete-selected compact" onClick={() => onDeleteAction(selectedActionId)}>選択中を削除</button>
        )}
      </div>
      {!selectedVehicle ? (
        <div className="timeline-empty" role="status">オブジェクトを選択するとタイムラインを表示します</div>
      ) : (
        <div className="timeline-scroll timeline-scroll-horizontal">
          <div className="timeline-grid timeline-grid-horizontal" style={{ width: ROW_LABEL_WIDTH + timelineWidth, height: totalHeight }}>
            <div className="timeline-corner timeline-corner-horizontal">時間</div>
            <div className="timeline-time-header" style={{ left: ROW_LABEL_WIDTH, width: timelineWidth }}>
              {ticks.map((tick) => <div key={tick} className="timeline-time-label" style={{ left: tick * PIXELS_PER_SECOND }}>{tick}s</div>)}
            </div>
            <div className="timeline-body-horizontal" style={{ top: HEADER_HEIGHT, left: ROW_LABEL_WIDTH, width: timelineWidth, height: totalHeight - HEADER_HEIGHT }}>
              {ticks.map((tick) => <div key={tick} className={`time-tick-x${tick % 5 === 0 ? ' major' : ''}`} style={{ left: tick * PIXELS_PER_SECOND }} />)}
              <div className="playhead-x" style={{ left: currentTime * PIXELS_PER_SECOND }}><span>{currentTime.toFixed(1)}s</span></div>
            </div>
            {rows.map((row) => {
              const top = rowTop;
              rowTop += row.kind === 'gap' ? GROUP_GAP : ROW_HEIGHT;
              if (row.kind === 'gap') return <div key={`gap-${row.group.id}`} />;
              if (row.kind === 'group') {
                const expanded = expandedGroups.has(row.group.id);
                const selected = selectedGroupId === row.group.id;
                return (
                  <div key={row.group.id} className="timeline-row" style={{ top, height: ROW_HEIGHT }}>
                    <button type="button" className={`timeline-row-label group-label${selected ? ' selected' : ''}`} title={`${row.group.label}を展開`} aria-expanded={expanded} onClick={() => { setSelectedGroupId(row.group.id); }} onPointerUp={() => handleTap(`group-${row.group.id}`, () => toggleGroup(row.group.id))}>{row.group.label} {expanded ? '▼' : '▶'}</button>
                    <div className="timeline-row-track" style={{ left: ROW_LABEL_WIDTH, width: timelineWidth }}>
                      {groupIntervals[row.group.id].map((interval) => (
                        <button key={interval.id} type="button" className={`group-bar${selected ? ' selected' : ''}`} style={{ left: interval.startTime * PIXELS_PER_SECOND, width: Math.max((interval.endTime - interval.startTime) * PIXELS_PER_SECOND, 18), top: BAR_TOP_INSET, height: BAR_HEIGHT }} title={`${row.group.label}: ${interval.startTime.toFixed(1)}〜${interval.endTime.toFixed(1)}秒 / ${Array.from(new Set(interval.actions.map((action) => ACTION_META[action.actionType].label))).join('、')}`} aria-label={`${row.group.label}: ${interval.startTime.toFixed(1)}〜${interval.endTime.toFixed(1)}秒`} onClick={() => setSelectedGroupId(row.group.id)} onPointerUp={() => handleTap(interval.id, () => toggleGroup(row.group.id))}>
                          {interval.actions.map((action) => <span key={`${action.actionId}-${action.actionType}`} className="group-bar-segment" style={{ left: `${((action.startTime - interval.startTime) / (interval.endTime - interval.startTime)) * 100}%`, width: `${((action.endTime - action.startTime) / (interval.endTime - interval.startTime)) * 100}%`, background: ACTION_META[action.actionType].color }} />)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              const meta = ACTION_META[row.actionType];
              const rowActions = actions.filter((action) => action.actionType === row.actionType);
              return (
                <div key={`${row.group.id}-${row.actionType}`} className="timeline-row action-row" style={{ top, height: ROW_HEIGHT }}>
                  <div className="timeline-row-label action-label" title={meta.label} aria-label={meta.label}>{meta.shortLabel}</div>
                  <div className="timeline-row-track" style={{ left: ROW_LABEL_WIDTH, width: timelineWidth }}>
                    {rowActions.map((action) => {
                      const selected = selectedActionId === action.actionId;
                      return <button key={`${action.actionId}-${action.actionType}`} type="button" className={`action-bar-x${selected ? ' selected' : ''}`} style={{ left: action.startTime * PIXELS_PER_SECOND, width: Math.max(action.duration * PIXELS_PER_SECOND, 18), top: BAR_TOP_INSET, height: BAR_HEIGHT, background: meta.color }} aria-label={`${meta.label}: ${action.startTime.toFixed(1)}〜${action.endTime.toFixed(1)}秒、${turnLabels[action.parameters.turn]}、ブレーキ${brakeLabels[action.parameters.brake]}`} aria-pressed={selected} title={`${meta.label}: ${action.startTime.toFixed(1)}〜${action.endTime.toFixed(1)}秒`} onClick={() => onSelectAction(action.actionId)} onPointerUp={() => handleTap(action.actionId, () => onOpenAction(action.actionId))} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
