import type { CollisionResult, Scenario, SimulatedVehicleState } from '../types';
import { simulateScenario } from './engine';

function rectOf(vehicle: SimulatedVehicleState) {
  return {
    left: vehicle.x - vehicle.length / 2,
    right: vehicle.x + vehicle.length / 2,
    top: vehicle.y - vehicle.width / 2,
    bottom: vehicle.y + vehicle.width / 2,
  };
}

export function vehiclesCollide(a: SimulatedVehicleState, b: SimulatedVehicleState): boolean {
  if (!a.active || !b.active) return false;
  const ar = rectOf(a);
  const br = rectOf(b);
  return ar.left < br.right && ar.right > br.left && ar.top < br.bottom && ar.bottom > br.top;
}

export function detectCollisionAt(states: SimulatedVehicleState[], time: number): CollisionResult {
  for (let i = 0; i < states.length; i += 1) {
    for (let j = i + 1; j < states.length; j += 1) {
      if (vehiclesCollide(states[i], states[j])) return { collided: true, time, vehicleIds: [states[i].id, states[j].id] };
    }
  }
  return { collided: false, time: null, vehicleIds: null };
}

export function findFirstCollision(scenario: Scenario): CollisionResult {
  for (let time = 0; time <= scenario.durationSec + 0.001; time += 0.1) {
    const rounded = Number(time.toFixed(1));
    const collision = detectCollisionAt(simulateScenario(scenario, rounded), rounded);
    if (collision.collided) return collision;
  }
  return { collided: false, time: null, vehicleIds: null };
}
