import { SimulationRunStatus } from '../types/simulation';

export class SimulationClock {
  private startTime: string = '10:30:00';
  private elapsedSeconds: number = 0;
  private speedMultiplier: number = 1; // 1x, 2x, 5x, 10x
  private status: SimulationRunStatus = 'IDLE';
  private timer: ReturnType<typeof setInterval> | null = null;
  private onTickCallback?: (timeStr: string, elapsedSeconds: number) => void;

  constructor(startTime: string = '10:30:00') {
    this.startTime = startTime;
  }

  public start(onTick?: (timeStr: string, elapsedSeconds: number) => void) {
    if (onTick) this.onTickCallback = onTick;
    this.status = 'RUNNING';
    this.stopTimer();

    // Tick every 1000ms divided by speedMultiplier
    const intervalMs = Math.max(100, Math.floor(1000 / this.speedMultiplier));
    this.timer = setInterval(() => {
      if (this.status === 'RUNNING') {
        this.elapsedSeconds += 1;
        const timeStr = this.getFormattedTime();
        if (this.onTickCallback) this.onTickCallback(timeStr, this.elapsedSeconds);
      }
    }, intervalMs);
  }

  public pause() {
    this.status = 'PAUSED';
  }

  public resume() {
    if (this.status === 'PAUSED') {
      this.status = 'RUNNING';
    }
  }

  public stop() {
    this.status = 'STOPPED';
    this.stopTimer();
  }

  public reset() {
    this.stopTimer();
    this.elapsedSeconds = 0;
    this.status = 'IDLE';
  }

  public setSpeed(speed: number) {
    this.speedMultiplier = speed;
    if (this.status === 'RUNNING') {
      this.start(this.onTickCallback);
    }
  }

  public getFormattedTime(): string {
    const [h, m, s] = this.startTime.split(':').map(Number);
    const totalSec = (h * 3600 + m * 60 + (s || 0) + this.elapsedSeconds) % 86400;
    const hours = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSec % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  public getElapsedMinutes(): number {
    return Math.floor(this.elapsedSeconds / 60);
  }

  public getStatus(): SimulationRunStatus {
    return this.status;
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
