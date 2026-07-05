import type { Scenario, SimulatedVehicleState, Vehicle, VehicleEvent, VehicleState } from '../types';

const STEP_SEC = 0.05;
const TURN_RATE_DEG_PER_SEC = 38;
const BRAKE_FACTOR = { none: 1, normal: 0.75, hard: 0.5, emergency: 0.25 } as const;

const kmhToPxPerSec = (kmh: number) => kmh * 2.15;
const normalize = (deg: number) => ((deg % 360) + 360) % 360;

function eventAt(events: VehicleEvent[], time: number): VehicleEvent | undefined {
  return [...events].sort((a, b) => a.time - b.time).find((event) => time >= event.time && time < event.time + Math.max(event.durationSec, STEP_SEC));
}

function nextState(state: VehicleState, vehicle: Vehicle, simTime: number, dt: number): VehicleState {
  const event = eventAt(vehicle.events, simTime);
  let headingDeg = state.headingDeg;

  if (!event) {
    return { ...state, speedKmh: 0 };
  }

  let targetSpeed = state.speedKmh;
  const progress = Math.min(1, Math.max(0, (simTime - event.time) / Math.max(event.durationSec, STEP_SEC)));
  const adjustedTarget = event.turn === 'stop' ? 0 : event.targetSpeedKmh * BRAKE_FACTOR[event.brake];
  targetSpeed = state.speedKmh + (adjustedTarget - state.speedKmh) * Math.min(1, dt / Math.max(0.1, event.durationSec - progress * event.durationSec));
  if (event.turn === 'left') headingDeg -= TURN_RATE_DEG_PER_SEC * dt;
  if (event.turn === 'right') headingDeg += TURN_RATE_DEG_PER_SEC * dt;
  if (event.turn === 'stop') targetSpeed = Math.max(0, state.speedKmh - 40 * dt);

  const rad = (headingDeg * Math.PI) / 180;
  const distance = kmhToPxPerSec(Math.max(0, targetSpeed)) * dt;
  return {
    x: state.x + Math.cos(rad) * distance,
    y: state.y + Math.sin(rad) * distance,
    headingDeg: normalize(headingDeg),
    speedKmh: Math.max(0, targetSpeed),
  };
}

export function simulateVehicle(vehicle: Vehicle, time: number): SimulatedVehicleState {
  let state: VehicleState = { ...vehicle.initialState, speedKmh: 0 };
  if (time < vehicle.startTime) {
    return { ...state, id: vehicle.id, name: vehicle.name, color: vehicle.color, length: vehicle.length, width: vehicle.width, active: false };
  }

  let elapsed = vehicle.startTime;
  while (elapsed < time) {
    const dt = Math.min(STEP_SEC, time - elapsed);
    state = nextState(state, vehicle, elapsed, dt);
    elapsed += dt;
  }

  return { ...state, id: vehicle.id, name: vehicle.name, color: vehicle.color, length: vehicle.length, width: vehicle.width, active: true };
}

export function simulateScenario(scenario: Scenario, time: number): SimulatedVehicleState[] {
  return scenario.vehicles.map((vehicle) => simulateVehicle(vehicle, Math.min(time, scenario.durationSec)));
}

export function samplePath(vehicle: Vehicle, durationSec: number, intervalSec = 1): SimulatedVehicleState[] {
  const points: SimulatedVehicleState[] = [];
  for (let time = 0; time <= durationSec + 0.001; time += intervalSec) {
    points.push(simulateVehicle(vehicle, Number(time.toFixed(1))));
  }
  return points;
}
