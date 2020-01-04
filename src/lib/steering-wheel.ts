const oneDegreeAnimTime = 100 / 60;

export const DrivingWheelTurnEventName = 'input';
const defaultMaxAngle = 90;
const defaultMinAngle = -90;

enum Direction {
  Vertical = 'v',
  Horizontal = 'h'
}

export class SteeringWheel extends HTMLElement {
  static readonly observedAttributes = ['value', 'min-angle', 'max-angle', 'step', 'direction', 'end-action-value'];
  private wheel: HTMLElement;
  private interacting = false;
  private visibleAngle = 0;
  private curAngle = 0;
  private curStep = 1;
  private curDirection = Direction.Horizontal;
  private curEndActionValue = NaN;

  private minPossibleAngle = defaultMinAngle;
  private maxPossibleAngle = defaultMaxAngle;
  private touchIdentifier: number;
  constructor() {
    super();
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);

    const shadow = this.attachShadow({ mode: 'open' });
    this.wheel = document.createElement('div');
    this.wheel.appendChild(document.createElement('slot'));
    shadow.appendChild(this.wheel);
    this.prepareStyles();
  }

  get value(): number {
    return this.curAngle;
  }

  set value(value: number) {
    this.setCurAngle(value);
  }

  get minAngle(): number {
    return this.minPossibleAngle;
  }

  set minAngle(value: number) {
    this.minPossibleAngle = Number.isFinite(value) ? value : defaultMinAngle;
  }

  get maxAngle(): number {
    return this.maxPossibleAngle;
  }

  set maxAngle(value: number) {
    this.maxPossibleAngle = Number.isFinite(value) ? value : defaultMaxAngle;
  }
  get step(): number {
    return this.curStep;
  }

  set step(newStep: number) {
    this.curStep = newStep;
  }
  get direction(): Direction {
    return this.curDirection;
  }

  set direction(newDirection: Direction) {
    this.curDirection = newDirection === Direction.Vertical ? Direction.Vertical : Direction.Horizontal;
  }

  get endActionValue(): number {
    return this.curEndActionValue;
  }

  set endActionValue(newValue: number) {
    this.curEndActionValue = newValue;
  }

  connectedCallback() {
    for (const prop of ['minAngle', 'maxAngle', 'value', 'step', 'direction', 'endActionValue']) {
      this.upgradeProperty(prop);
    }
    this.initEvents();
  }

  disconnectedCallback() {
    this.removeEvents();
    this.onMouseUp();
  }

  attributeChangedCallback(attrName: string, oldValue: string, newValue: string): void {
    switch (attrName) {
      case 'value':
        if (Number.isFinite(Number(newValue))) {
          this.setCurAngle(Number(newValue));
        }
        return;
      case 'min-angle': this.minAngle = Number.isFinite(Number(newValue)) ? Number(newValue) : defaultMinAngle; return;
      case 'max-angle': this.maxAngle = Number.isFinite(Number(newValue)) ? Number(newValue) : defaultMaxAngle; return;
      case 'step':
        const parsed = Number(newValue);
        this.step = Number.isFinite(parsed) && parsed > 0 ? Number(newValue) : this.step;
        return;
      case 'direction':
        this.direction = <Direction>newValue;
        return;
      case 'end-action-value':
        this.endActionValue = Number(newValue);
        return;
    }
  }

  private prepareStyles() {
    const style = document.createElement('style');
    style.textContent = ` div { position: absolute;  }
                          slot { display: block; font-size: 0;} `;
    this.shadowRoot.appendChild(style);
  }

  private upgradeProperty(prop: string) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  private initEvents() {
    this.wheel.addEventListener('mousedown', this.onMouseDown);
    this.wheel.addEventListener('touchstart', this.onTouchStart);
  }

  private removeEvents() {
    this.wheel.removeEventListener('mousedown', this.onMouseDown);
    this.wheel.removeEventListener('touchstart', this.onTouchStart);
  }

  private moveSlowlyTo(newAngle: number, dispatchEvent = false) {
    const time = Math.abs(this.curAngle - newAngle) * oneDegreeAnimTime;
    this.wheel.style.transition = `transform ${time / 1000}s ease-out 0s`;
    this.setCurAngle(newAngle, dispatchEvent);
    setTimeout(() => this.wheel.style.transition = null, time + 50);
  }

  private onMouseDown(event: MouseEvent) {
    if (!this.interacting) {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    }
    this.interacting = true;
  }

  private onTouchStart(event: TouchEvent) {
    if (!this.interacting) {
      const touch = event.changedTouches[0];
      this.touchIdentifier = touch.identifier;
      document.addEventListener('touchmove', this.onMouseMove);
      document.addEventListener('touchend', this.onMouseUp);
      event.preventDefault();
    }
    this.interacting = true;
  }

  private onMouseMove(event: MouseEvent | TouchEvent) {
    let eventData: MouseEvent | Touch = null;
    if (event instanceof TouchEvent) {
      eventData = Array.prototype.find.call(event.changedTouches, (t) => t.identifier === this.touchIdentifier);
      if (!eventData) {
        return;
      }
    } else {
      eventData = event;
    }
    const angle = this.getAngle(eventData);
    this.setCurAngle(angle, true);
  }

  private setCurAngle(newAngle: number, dispatchEvent = false) {
    const angle = Math.max(Math.min(this.maxAngle, newAngle), this.minAngle);

    const newCurAngle = Math.round(angle / this.step) * this.step;
    this.visibleAngle = dispatchEvent ? angle : newCurAngle;
    this.wheel.style.transform = `rotate(${this.visibleAngle}deg)`;
    if (dispatchEvent && newCurAngle !== this.curAngle) {
      this.curAngle = newCurAngle;
      this.dispatchEvent(new Event(DrivingWheelTurnEventName));
    }
  }

  private getAngle(event: MouseEvent | Touch): number {
    const rect = this.getBoundingClientRect();
    if (this.direction === Direction.Horizontal) {
      return (event.clientX - (rect.left + rect.width * 0.1))
        / (rect.width * 0.8) * (this.maxAngle - this.minAngle) + this.minAngle;
    } else {
      return (event.clientY - (rect.top + rect.height * 0.1))
        / (rect.height * 0.8) * (this.minAngle - this.maxAngle) - this.minAngle;
    }
  }

  private onMouseUp() {
    this.removeDynamicEventListeners();
    if (Number.isFinite(this.endActionValue)) {
      this.moveSlowlyTo(this.endActionValue, true);
    } else {
      this.moveSlowlyTo(this.curAngle);
    }
    this.interacting = false;
  }

  private removeDynamicEventListeners() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onMouseMove);
    document.removeEventListener('touchend', this.onMouseUp);
  }
}

customElements.define('steering-wheel', SteeringWheel);
