import { DoubleTap } from './double-touch-click.js';
const oneDegreeAnimTime = 100 / 60;
export const DrivingWheelTurnEventName = 'input';
export class DrivingWheel extends HTMLElement {
    constructor() {
        super();
        this.interacting = false;
        this.visibleAngle = 0;
        this.curAngle = 0;
        this.curStep = 1;
        this.curDblClickValue = 0;
        this.userActionInitialAngle = 0;
        this.minPossibleAngle = -Infinity;
        this.maxPossibleAngle = Infinity;
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
    get value() {
        return this.curAngle;
    }
    set value(value) {
        this.setCurAngle(value);
    }
    get minAngle() {
        return this.minPossibleAngle;
    }
    set minAngle(value) {
        this.minPossibleAngle = value;
    }
    get maxAngle() {
        return this.maxPossibleAngle;
    }
    set maxAngle(value) {
        this.maxPossibleAngle = value;
    }
    get step() {
        return this.curStep;
    }
    set step(newStep) {
        this.curStep = newStep;
    }
    get dblClickValue() {
        return this.curDblClickValue;
    }
    set dblClickValue(value) {
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
    attributeChangedCallback(attrName, oldValue, newValue) {
        switch (attrName) {
            case 'value':
                if (Number.isFinite(Number(newValue))) {
                    this.setCurAngle(Number(newValue));
                }
                return;
            case 'min-angle':
                this.minAngle = Number.isFinite(Number(newValue)) ? Number(newValue) : this.minAngle;
                return;
            case 'max-angle':
                this.maxAngle = Number.isFinite(Number(newValue)) ? Number(newValue) : this.maxAngle;
                return;
            case 'step':
                const parsed = Number(newValue);
                this.step = Number.isFinite(parsed) && parsed > 0 ? Number(newValue) : this.step;
                return;
            case 'dbl-click-value':
                this.dblClickValue = Number.isFinite(Number(newValue)) ? Number(newValue) : this.dblClickValue;
                return;
        }
    }
    prepareStyles() {
        const style = document.createElement('style');
        style.textContent = ` div { position: absolute;  }
                          slot { display: block; font-size: 0;} `;
        this.shadowRoot.appendChild(style);
    }
    upgradeProperty(prop) {
        if (this.hasOwnProperty(prop)) {
            const value = this[prop];
            delete this[prop];
            this[prop] = value;
        }
    }
    initEvents() {
        this.wheel.addEventListener('mousedown', this.onMouseDown);
        this.wheel.addEventListener('touchstart', this.onTouchStart);
        this.wheel.addEventListener('dblclick', this.onDblClick);
        this.wheel.addEventListener('dbltap', this.onDblClick);
    }
    removeEvents() {
        this.wheel.removeEventListener('mousedown', this.onMouseDown);
        this.wheel.removeEventListener('touchstart', this.onTouchStart);
        this.wheel.removeEventListener('dblclick', this.onDblClick);
        this.wheel.removeEventListener('dbltap', this.onDblClick);
    }
    onDblClick() {
        this.removeDynamicEventListeners();
        this.interacting = false;
        this.moveSlowlyTo(this.dblClickValue, true);
    }
    moveSlowlyTo(newAngle, dispatchEvent = false) {
        const time = Math.abs(this.curAngle - newAngle) * oneDegreeAnimTime;
        this.wheel.style.transition = `transform ${time / 1000}s ease-out 0s`;
        this.setCurAngle(newAngle, dispatchEvent);
        setTimeout(() => this.wheel.style.transition = null, time + 50);
    }
    onMouseDown(event) {
        if (!this.interacting) {
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('mouseup', this.onMouseUp);
        }
        this.interacting = true;
        this.userActionInitialAngle = this.getAngle(event);
    }
    onTouchStart(event) {
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
    onMouseMove(event) {
        let eventData = null;
        if (event instanceof TouchEvent) {
            eventData = Array.prototype.find.call(event.changedTouches, (t) => t.identifier === this.touchIdentifier);
            if (!eventData) {
                return;
            }
        }
        else {
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
    setCurAngle(newAngle, dispatchEvent = false) {
        let angle;
        if (newAngle < this.minAngle) {
            angle = this.minAngle;
        }
        else if (newAngle > this.maxAngle) {
            angle = this.maxAngle;
        }
        else {
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
    getAngle(event) {
        const svgRect = this.wheel.getBoundingClientRect();
        const centerX = (svgRect.left + svgRect.right) / 2;
        const centerY = (svgRect.top + svgRect.bottom) / 2;
        const y = centerY - event.clientY;
        const x = event.clientX - centerX;
        const alpha = 90 - Math.atan2(y, x) * (180 / Math.PI);
        const angle = alpha > 180 ? alpha - 360 : alpha;
        return angle;
    }
    onMouseUp() {
        this.removeDynamicEventListeners();
        this.moveSlowlyTo(this.curAngle);
        this.interacting = false;
    }
    removeDynamicEventListeners() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('touchmove', this.onMouseMove);
        document.removeEventListener('touchend', this.onMouseUp);
    }
}
DrivingWheel.observedAttributes = ['value', 'min-angle', 'max-angle', 'step', 'dbl-click-value'];
customElements.define('driving-wheel', DrivingWheel);
