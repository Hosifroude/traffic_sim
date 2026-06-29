export type TurnCommand = 'straight' | 'left' | 'right' | 'stop';
export type BrakeCommand = 'none' | 'normal' | 'hard' | 'emergency';

export interface VehicleState {
  x: number;
  y: number;
  headingDeg: number;
  speedKmh: number;
}

export interface VehicleEvent {
  time: number;
  targetSpeedKmh: number;
  durationSec: number;
  turn: TurnCommand;
  brake: BrakeCommand;
}

export interface Vehicle {
  id: string;
  name: string;
  color: string;
  length: number;
  width: number;
  startTime: number;
  initialState: VehicleState;
  events: VehicleEvent[];
}

export interface ScenarioMap {
  id: string;
  name: string;
  roadWidth: number;
  stageSize: number;
}

export interface Scenario {
  vehicles: Vehicle[];
  map: ScenarioMap;
  durationSec: number;
}

export interface SimulatedVehicleState extends VehicleState {
  id: string;
  name: string;
  color: string;
  length: number;
  width: number;
  active: boolean;
}

export interface CollisionResult {
  collided: boolean;
  time: number | null;
  vehicleIds: [string, string] | null;
}
