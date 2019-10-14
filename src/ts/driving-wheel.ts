import { DoubleTap } from './double-touch-click.js';

const oneDegreeAnimTime = 100 / 60;

export const DrivingWheelTurnEventName = 'input';

export class DrivingWheel extends HTMLElement {
  static readonly observedAttributes = ['value', 'min-angle', 'max-angle', 'step', 'dbl-click-value'];
  private wheel: HTMLElement;
  private interacting = false;
  private visibleAngle = 0;
  private curAngle = 0;
  private curStep = 1;
  private curDblClickValue = 0;
  private userActionInitialAngle = 0;

  private minPossibleAngle = -Infinity;
  private maxPossibleAngle = Infinity;
  private touchIdentifier: number;
  private doubleTapInitializer: DoubleTap;
  constructor() {
    super();
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onDblClick = this.onDblClick.bind(this);
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
    this.minPossibleAngle = value;
  }

  get maxAngle(): number {
    return this.maxPossibleAngle;
  }

  set maxAngle(value: number) {
    this.maxPossibleAngle = value;
  }
  get step(): number {
    return this.curStep;
  }

  set step(newStep: number) {
    this.curStep = newStep;
  }

  get dblClickValue(): number {
    return this.curDblClickValue;
  }

  set dblClickValue(value: number) {
    this.curDblClickValue = value;
  }

  connectedCallback() {
    for (const prop of ['minAngle', 'maxAngle', 'value', 'step']) {
      this.upgradeProperty(prop);
    }
    this.initEvents();
    this.doubleTapInitializer = new DoubleTap(this.wheel);
  }

  disconnectedCallback() {
    this.removeEvents();
    this.onMouseUp();
    this.doubleTapInitializer.destroy();
  }

  attributeChangedCallback(attrName: string, oldValue: string, newValue: string): void {
    switch (attrName) {
      case 'value':
        if (Number.isFinite(Number(newValue))) {
          this.setCurAngle(Number(newValue));
        }
        return;
      case 'min-angle': this.minAngle = Number.isFinite(Number(newValue)) ? Number(newValue) : this.minAngle; return;
      case 'max-angle': this.maxAngle = Number.isFinite(Number(newValue)) ? Number(newValue) : this.maxAngle; return;
      case 'step':
        const parsed = Number(newValue);
        this.step = Number.isFinite(parsed) && parsed > 0 ? Number(newValue) : this.step;
        return;
      case 'dbl-click-value':
        this.dblClickValue = Number.isFinite(Number(newValue)) ? Number(newValue) : this.dblClickValue;
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
    this.wheel.addEventListener('dblclick', this.onDblClick);
    this.wheel.addEventListener('dbltap', this.onDblClick);
  }

  private removeEvents() {
    this.wheel.removeEventListener('mousedown', this.onMouseDown);
    this.wheel.removeEventListener('touchstart', this.onTouchStart);
    this.wheel.removeEventListener('dblclick', this.onDblClick);
    this.wheel.removeEventListener('dbltap', this.onDblClick);
  }

  private onDblClick() {
    this.removeDynamicEventListeners();
    this.interacting = false;
    this.moveSlowlyTo(this.dblClickValue, true);
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
    this.userActionInitialAngle = this.getAngle(event);
  }

  private onTouchStart(event: TouchEvent) {
    if (!this.interacting) {
      const touch = event.changedTouches[0];
      this.touchIdentifier = touch.identifier;
      document.addEventListener('touchmove', this.onMouseMove);
      document.addEventListener('touchend', this.onMouseUp);
      this.userActionInitialAngle = this.getAngle(touch);
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
    const currentEffectiveTurn = angle - this.userActionInitialAngle;
    this.userActionInitialAngle = angle;
    const differences = [currentEffectiveTurn - 360, currentEffectiveTurn, currentEffectiveTurn + 360];
    const smallestDist = differences
      .reduce((prev, cur) => Math.abs(prev) < Math.abs(cur) ? prev : cur, differences.pop());

    this.setCurAngle(this.visibleAngle + smallestDist, true);
  }

  private setCurAngle(newAngle: number, dispatchEvent = false) {
    let angle: number;
    if (newAngle < this.minAngle) {
      angle = this.minAngle;
    } else if (newAngle > this.maxAngle) {
      angle = this.maxAngle;
    } else {
      angle = newAngle;
    }
    const newCurAngle = Math.round(angle / this.step) * this.step;
    this.visibleAngle = dispatchEvent ? angle : newCurAngle;
    this.wheel.style.transform = `rotate(${this.visibleAngle}deg)`;
    if (dispatchEvent && newCurAngle !== this.curAngle) {
      this.curAngle = newCurAngle;
      this.dispatchEvent(new Event(DrivingWheelTurnEventName));
    }
  }

  private getAngle(event: MouseEvent | Touch): number {
    const svgRect = this.wheel.getBoundingClientRect();
    const centerX = (svgRect.left + svgRect.right) / 2;
    const centerY = (svgRect.top + svgRect.bottom) / 2;
    const y = centerY - event.clientY;
    const x = event.clientX - centerX;
    const alpha = 90 - Math.atan2(y, x) * (180 / Math.PI);
    const angle = alpha > 180 ? alpha - 360 : alpha;
    return angle;
  }

  private onMouseUp() {
    this.removeDynamicEventListeners();
    this.moveSlowlyTo(this.curAngle);
    this.interacting = false;
  }

  private removeDynamicEventListeners() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onMouseMove);
    document.removeEventListener('touchend', this.onMouseUp);
  }
}

customElements.define('driving-wheel', DrivingWheel);
