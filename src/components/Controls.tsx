interface Props {
  time: number;
  duration: number;
  playing: boolean;
  disabled?: boolean;
  onStep: (delta: number) => void;
  onToggle: () => void;
  onReset: () => void;
}

export function Controls({ time, duration, playing, disabled = false, onStep, onToggle, onReset }: Props) {
  return (
    <footer className="controls">
      <button disabled={disabled} onClick={() => onStep(-0.1)} aria-label="0.1秒戻る">◀</button>
      <strong>{time.toFixed(1)} / {duration.toFixed(1)} 秒</strong>
      <button disabled={disabled} onClick={() => onStep(0.1)} aria-label="0.1秒進む">▶</button>
      <button disabled={disabled} onClick={onToggle}>{playing ? '停止' : '再生'}</button>
      <button disabled={disabled} onClick={onReset}>リセット</button>
    </footer>
  );
}
