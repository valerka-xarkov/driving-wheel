
const doubleTapTimeout = 500;

export class DoubleTap {
  private firstTimeStamp = 0;
  private secondTimeStamp = 0;

  constructor(private element: HTMLElement) {
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.addEvents();
  }

  destroy() {
    this.removeEvents();
    this.element = null;
  }

  private removeEvents() {
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchend', this.onTouchEnd);
  }
  private addEvents() {
    this.element.addEventListener('touchstart', this.onTouchStart);
    this.element.addEventListener('touchend', this.onTouchEnd);
  }

  private onTouchStart(event: TouchEvent) {
    this.firstTimeStamp = Date.now();
  }

  private onTouchEnd(event: TouchEvent) {
    if (Date.now() - this.secondTimeStamp < doubleTapTimeout) {
      const touchEvent = new TouchEvent('dbltap', event as any);
      this.element.dispatchEvent(touchEvent);
    } else {
      this.secondTimeStamp = this.firstTimeStamp;
    }
  }
}



