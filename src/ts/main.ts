import './driving-wheel.js';
import { DrivingWheel, DrivingWheelTurnEventName } from './driving-wheel.js';
const wheel: DrivingWheel = document.querySelector('driving-wheel');
const whileAngle = document.getElementById('wheel-angle');
const wheel2: DrivingWheel = document.querySelector('driving-wheel#wheel2');
const whileAngle2 = document.getElementById('wheel-angle2');

function handler() {
  whileAngle.innerText = wheel.value.toString();
}

wheel.addEventListener(DrivingWheelTurnEventName, handler);
wheel2.addEventListener(DrivingWheelTurnEventName, () => {
  whileAngle2.innerText = wheel2.value.toString();
});
