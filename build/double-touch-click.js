const doubleTapTimeout = 500;
export class DoubleTap {
    constructor(element) {
        this.element = element;
        this.firstTimeStamp = 0;
        this.secondTimeStamp = 0;
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.addEvents();
    }
    destroy() {
        this.removeEvents();
        this.element = null;
    }
    removeEvents() {
        this.element.removeEventListener('touchstart', this.onTouchStart);
        this.element.removeEventListener('touchend', this.onTouchEnd);
    }
    addEvents() {
        this.element.addEventListener('touchstart', this.onTouchStart);
        this.element.addEventListener('touchend', this.onTouchEnd);
    }
    onTouchStart(event) {
        this.firstTimeStamp = Date.now();
    }
    onTouchEnd(event) {
        if (Date.now() - this.secondTimeStamp < doubleTapTimeout) {
            const touchEvent = new TouchEvent('dbltap', event);
            this.element.dispatchEvent(touchEvent);
        }
        else {
            this.secondTimeStamp = this.firstTimeStamp;
        }
    }
}
