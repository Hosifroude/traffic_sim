import type { Scenario, SimulatedVehicleState, Vehicle } from '../types';
import { samplePath } from '../simulation/engine';

interface Props {
  scenario: Scenario;
  states: SimulatedVehicleState[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  onOpenVehicleSettings: (id: string) => void;
}

function Ghosts({ vehicle, durationSec }: { vehicle: Vehicle; durationSec: number }) {
  const points = samplePath(vehicle, durationSec, 1);
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');
  return (
    <g opacity="0.55">
      <polyline points={path} fill="none" stroke={vehicle.color} strokeWidth="3" strokeDasharray="8 8" />
      {points.map((point, index) => (
        <circle key={`${vehicle.id}-${index}`} cx={point.x} cy={point.y} r="6" fill={vehicle.color} opacity="0.28" />
      ))}
    </g>
  );
}

export function Stage({ scenario, states, selectedVehicleId, onSelectVehicle, onOpenVehicleSettings }: Props) {
  const { stageSize, roadWidth } = scenario.map;
  const half = stageSize / 2;
  return (
    <section className="stage-card" aria-label="交通シナリオステージ">
      <svg className="stage" viewBox={`${-half} ${-half} ${stageSize} ${stageSize}`} role="img">
        <rect x={-half} y={-half} width={stageSize} height={stageSize} fill="#7fb069" />
        <rect x={-half} y={-roadWidth / 2} width={stageSize} height={roadWidth} fill="#3f3f46" />
        <rect x={-roadWidth / 2} y={-half} width={roadWidth} height={stageSize} fill="#3f3f46" />
        <line x1={-half} y1="0" x2={half} y2="0" stroke="#f8fafc" strokeWidth="4" strokeDasharray="26 22" opacity="0.8" />
        <line x1="0" y1={-half} x2="0" y2={half} stroke="#f8fafc" strokeWidth="4" strokeDasharray="26 22" opacity="0.8" />
        {scenario.vehicles.map((vehicle) => <Ghosts key={vehicle.id} vehicle={vehicle} durationSec={scenario.durationSec} />)}
        {states.map((vehicle) => (
          <g
            key={vehicle.id}
            transform={`translate(${vehicle.x} ${vehicle.y}) rotate(${vehicle.headingDeg})`}
            onClick={() => onSelectVehicle(vehicle.id)}
            onDoubleClick={() => onOpenVehicleSettings(vehicle.id)}
            className="vehicle-hit"
          >
            <rect
              x={-vehicle.length / 2}
              y={-vehicle.width / 2}
              width={vehicle.length}
              height={vehicle.width}
              rx="6"
              fill={vehicle.color}
              stroke={vehicle.id === selectedVehicleId ? '#facc15' : '#111827'}
              strokeWidth={vehicle.id === selectedVehicleId ? 5 : 2}
            />
            <rect x="4" y={-vehicle.width / 2 + 3} width="12" height={vehicle.width - 6} rx="3" fill="#dbeafe" opacity="0.85" />
          </g>
        ))}
      </svg>
    </section>
  );
}
