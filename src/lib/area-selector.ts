export interface IPoint {
  x: number;
  y: number;
}
export interface IPosition {
  top: number;
  left: number;
}

const interactedClassName = 'interacted';

export class AreaSelector extends HTMLElement {
  static get observedAttributes() {
    return ['height', 'width', 'pointer-size', 'zero-x', 'zero-y', 'reset-when-stop'];
  }
  private curPointerSize = 10;
  private curZeroX = 0;
  private curZeroY = 0;
  private curHeight = 100;
  private curWidth = 100;
  private curResetWhenStop = true;
  private area = document.createElement('div');
  private pointer = document.createElement('div');
  private shadow: ShadowRoot;
  private interacting = false;
  private touchIdentifier: number;
  private curPosition: IPosition;

  constructor() {
    super();
    this.mouseMoveHandler = this.mouseMoveHandler.bind(this);
    this.mouseUpHandler = this.mouseUpHandler.bind(this);
    this.initUserInteractionEvents = this.initUserInteractionEvents.bind(this);
    this.shadow = this.attachShadow({ mode: 'open' });
    this.preparePointer();
  }

  get height(): number {
    return this.curHeight;
  }
  set height(height: number) {
    this.curHeight = Number.isFinite(height) ? height : this.curHeight;
    this.area.style.height = `${this.curHeight}px`;
  }

  get width(): number {
    return this.curWidth;
  }
  set width(width: number) {
    this.curWidth = Number.isFinite(width) ? width : this.curWidth;
    this.area.style.width = `${this.curWidth}px`;
  }

  get pointerSize(): number {
    return this.curPointerSize;
  }
  set pointerSize(size: number) {
    this.curPointerSize = Number.isFinite(size) ? size : this.curPointerSize;
    this.pointer.style.height = this.pointer.style.width = `${this.curPointerSize}px`;
    this.pointer.style.borderRadius = `${this.pointerSize}px`;
  }

  get resetWhenStop(): boolean {
    return this.curResetWhenStop;
  }
  set resetWhenStop(resetWhenStop: boolean) {
    this.curResetWhenStop = resetWhenStop;
  }

  get zeroX(): number {
    return this.curZeroX;
  }
  set zeroX(zeroX: number) {
    this.curZeroX = zeroX;
    if (!this.interacting) {
      this.setPointerPosition(this.zeroX, this.zeroY);
    }
  }

  get zeroY(): number {
    return this.curZeroY;
  }
  set zeroY(zeroY: number) {
    this.curZeroY = zeroY;
    if (!this.interacting) {
      this.setPointerPosition(this.zeroX, this.zeroY);
    }
  }

  connectedCallback() {
    const props: Array<keyof AreaSelector> = ['zeroX', 'zeroY', 'resetWhenStop', 'pointerSize', 'width', 'height'];
    for (const prop of props) {
      this.upgradeProperty(prop);
    }
    this.initPointerWatch();
  }

  disconnectedCallback() {
    this.removePointerWatch();
  }

  attributeChangedCallback(attrName: string, oldValue: string, newValue: string) {
    switch (attrName) {
      case 'pointer-size':
        return (this.pointerSize = +newValue);
      case 'height':
        return (this.height = +newValue);
      case 'width':
        return (this.width = +newValue);
      case 'pointer-size':
        return (this.pointerSize = +newValue);
      case 'zero-x':
        return (this.zeroX = +newValue);
      case 'zero-y':
        return (this.zeroY = +newValue);
      case 'reset-when-stop':
        return (this.resetWhenStop = newValue === 'true');
    }
  }

  position(): IPosition {
    return { ...this.curPosition };
  }
  pointFromZero(): IPoint {
    return {
      x: this.curPosition.left - this.width / 2,
      y: -(this.curPosition.top - this.height / 2),
    };
  }
  pointFromZeroPercents(): IPoint {
    return {
      x: this.getPercentFromZero(this.width, this.curPosition.left, this.pointerSize, this.zeroX),
      y: this.getPercentFromZero(
        this.height,
        this.height - this.curPosition.top,
        this.pointerSize,
        this.height - this.zeroY
      ),
    };
  }

  private getPercentFromZero(size: number, position: number, pointerSize: number, zeroPosition: number): number {
    if (position >= zeroPosition) {
      return (position - zeroPosition) / (size - zeroPosition - pointerSize / 2);
    } else {
      return (position - zeroPosition) / (zeroPosition - pointerSize / 2);
    }
  }

  private upgradeProperty(prop: string) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }
  private preparePointer(): void {
    this.pointer.className = 'area-pointer';
    this.area.className = 'area';

    this.area.appendChild(this.pointer);
    const style = document.createElement('style');
    style.innerHTML = `
    :host {
      --area-border-color: hotpink;
      --pointer-background-color: hotpink;
      --area-hover-background-color: yellowgreen;
      --area-border-radius: 100px;
      display: block;
    }
    .area-pointer {
      background-color: var(--area-border-color);
      position: absolute;
      border-radius: ${this.pointerSize}px;
      box-sizing: border-box;
    }
    .area {
      position: relative;
      border: 1px solid var(--area-border-color);
      border-radius: var(--area-border-radius);
      transition: background-color .2s ease-out 0s;
    }
    .${interactedClassName} {
      background-color: var( --area-hover-background-color);
    }
    `;
    this.shadow.append(this.area, style);
  }

  private initPointerWatch() {
    this.pointer.addEventListener('mousedown', this.initUserInteractionEvents);
    this.pointer.addEventListener('touchstart', this.initUserInteractionEvents);
  }

  private removePointerWatch() {
    this.pointer.removeEventListener('mousedown', this.initUserInteractionEvents);
    this.pointer.removeEventListener('touchstart', this.initUserInteractionEvents);
  }

  private initUserInteractionEvents(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    if (!this.interacting) {
      this.area.classList.add(interactedClassName);
      if (event instanceof TouchEvent) {
        const touch = event.changedTouches[0];
        this.touchIdentifier = touch.identifier;
      }
      document.addEventListener('mousemove', this.mouseMoveHandler);
      document.addEventListener('mouseup', this.mouseUpHandler);
      document.addEventListener('touchmove', this.mouseMoveHandler);
      document.addEventListener('touchend', this.mouseUpHandler);
      this.mouseMoveHandler(event);
    }
    this.interacting = true;
  }

  private mouseMoveHandler(event: MouseEvent | TouchEvent) {
    let eventData: MouseEvent | Touch = null;
    if (event instanceof TouchEvent) {
      eventData = Array.prototype.find.call(event.changedTouches, (t) => t.identifier === this.touchIdentifier);
      if (!eventData) {
        return;
      }
    } else {
      eventData = event;
    }
    const wrapperRect = this.getBoundingClientRect();
    const newX = this.calculatePointerPosition(eventData.clientX, wrapperRect.left, this.width);
    const newY = this.calculatePointerPosition(eventData.clientY, wrapperRect.top, this.height);
    this.setPointerPosition(newX, newY);
  }

  private setPointerPosition(x: number, y: number) {
    this.pointer.style.transform = `translate(${x - this.pointerSize / 2}px, ${y - this.pointerSize / 2}px)`;
    this.trigger(x, y);
  }

  private calculatePointerPosition(cur: number, position: number, size: number): number {
    if (cur < position + this.pointerSize / 2) {
      return this.pointerSize / 2;
    }
    if (cur > position + size - this.pointerSize / 2) {
      return size - this.pointerSize / 2;
    }
    return cur - position;
  }

  private moveSlowlyTo(x: number, y: number) {
    this.pointer.style.transition = `transform .06s ease-out 0s`;
    this.setPointerPosition(x, y);
    setTimeout(() => (this.pointer.style.transition = null), 60);
  }
  private mouseUpHandler(event: MouseEvent | TouchEvent) {
    if (event instanceof TouchEvent) {
      const touch = event.changedTouches[0];
      if (this.touchIdentifier !== touch.identifier) {
        return;
      }
    }
    if (this.interacting) {
      if (this.resetWhenStop) {
        this.moveSlowlyTo(this.zeroX, this.zeroY);
      }
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      document.removeEventListener('mouseup', this.mouseUpHandler);
      document.removeEventListener('touchmove', this.mouseMoveHandler);
      document.removeEventListener('touchend', this.mouseUpHandler);
    }
    this.area.classList.remove(interactedClassName);
    this.interacting = false;
  }

  private trigger(left: number, top: number) {
    this.curPosition = { left, top };
    this.dispatchEvent(new Event('changed'));
  }
}

customElements.define('area-selector', AreaSelector);
