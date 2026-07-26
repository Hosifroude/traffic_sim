import { useEffect } from 'react';

export interface LiveDrivingInput {
  accelerator: boolean;
  brake: boolean;
  steering: 'left' | 'straight' | 'right';
}

interface Props {
  vehicleName: string | null;
  recording: boolean;
  input: LiveDrivingInput;
  onInputChange: (input: LiveDrivingInput) => void;
  onToggleRecording: () => void;
}

const isEditableElement = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || element?.tagName === 'SELECT';
};

export function LiveRecorder({ vehicleName, recording, input, onInputChange, onToggleRecording }: Props) {
  useEffect(() => {
    if (!recording) return;

    const updateFromKeyboard = (event: KeyboardEvent, pressed: boolean) => {
      if (isEditableElement(event.target)) return;
      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) return;
      event.preventDefault();

      if (key === 'w' || key === 'arrowup') onInputChange({ ...input, accelerator: pressed });
      if (key === 's' || key === 'arrowdown') onInputChange({ ...input, brake: pressed });
      if (key === 'a' || key === 'arrowleft') onInputChange({ ...input, steering: pressed ? 'left' : 'straight' });
      if (key === 'd' || key === 'arrowright') onInputChange({ ...input, steering: pressed ? 'right' : 'straight' });
    };

    const onKeyDown = (event: KeyboardEvent) => updateFromKeyboard(event, true);
    const onKeyUp = (event: KeyboardEvent) => updateFromKeyboard(event, false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [input, onInputChange, recording]);

  const holdProps = (next: Partial<LiveDrivingInput>, released: Partial<LiveDrivingInput>) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      onInputChange({ ...input, ...next });
    },
    onPointerUp: () => onInputChange({ ...input, ...released }),
    onPointerCancel: () => onInputChange({ ...input, ...released }),
  });

  return (
    <section className={`live-recorder${recording ? ' recording' : ''}`} aria-label="リアルタイム操作記録">
      <div className="recorder-header">
        <div>
          <h2>リアルタイム操作</h2>
          <p>{vehicleName ? `${vehicleName}を操作` : '先にステージ上の車両を選択'}</p>
        </div>
        <button type="button" className="record-button" disabled={!vehicleName} onClick={onToggleRecording}>
          <span aria-hidden="true" className="record-dot" />
          {recording ? '記録停止' : '記録開始'}
        </button>
      </div>
      <div className="driving-pad" aria-disabled={!recording}>
        <button type="button" disabled={!recording} className={input.steering === 'left' ? 'pressed' : ''} {...holdProps({ steering: 'left' }, { steering: 'straight' })}>左</button>
        <div className="pedals">
          <button type="button" disabled={!recording} className={`accelerator${input.accelerator ? ' pressed' : ''}`} {...holdProps({ accelerator: true }, { accelerator: false })}>アクセル</button>
          <button type="button" disabled={!recording} className={`brake${input.brake ? ' pressed' : ''}`} {...holdProps({ brake: true }, { brake: false })}>ブレーキ</button>
        </div>
        <button type="button" disabled={!recording} className={input.steering === 'right' ? 'pressed' : ''} {...holdProps({ steering: 'right' }, { steering: 'straight' })}>右</button>
      </div>
      <p className="recorder-help">PC: W/↑ アクセル、S/↓ ブレーキ、A・D/←・→ ハンドル</p>
    </section>
  );
}
