import type { Scenario } from './types';

export const sampleScenario: Scenario = {
  durationSec: 12,
  map: {
    id: 'crossroads-basic',
    name: '基本十字路',
    roadWidth: 150,
    stageSize: 720,
  },
  vehicles: [
    {
      id: 'car-a',
      name: '車両A',
      color: '#ef4444',
      length: 46,
      width: 24,
      startTime: 0,
      initialState: { x: -260, y: -40, headingDeg: 0, speedKmh: 28 },
      events: [
        { time: 1.5, targetSpeedKmh: 34, durationSec: 2, turn: 'straight', brake: 'none' },
        { time: 4.8, targetSpeedKmh: 20, durationSec: 2.2, turn: 'left', brake: 'normal' },
      ],
    },
    {
      id: 'car-b',
      name: '車両B',
      color: '#2563eb',
      length: 46,
      width: 24,
      startTime: 0,
      initialState: { x: 38, y: 260, headingDeg: -90, speedKmh: 26 },
      events: [
        { time: 2, targetSpeedKmh: 30, durationSec: 1.5, turn: 'straight', brake: 'none' },
        { time: 4.2, targetSpeedKmh: 8, durationSec: 1.3, turn: 'right', brake: 'hard' },
      ],
    },
  ],
};
