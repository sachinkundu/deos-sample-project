import './styles.css';
import {
  ActionTypes,
  getCalculation,
  getDisplay,
  initialState,
  reducer,
} from './calculator.js';

const display = document.querySelector('#display');
const calculation = document.querySelector('#calculation');
const keypad = document.querySelector('.keypad');
const buttons = [...document.querySelectorAll('[data-action]')];
let state = initialState();
const pressedTimers = new WeakMap();

function actionFromButton(button) {
  const action = { type: button.dataset.action };
  if (button.dataset.value) action.value = button.dataset.value;
  return action;
}

function actionFromKey(key) {
  if (/^\d$/.test(key)) return { type: ActionTypes.APPEND_DIGIT, value: key };
  if (key === '.') return { type: ActionTypes.APPEND_DECIMAL, value: key };
  if (['+', '-', '*', '/'].includes(key)) {
    return { type: ActionTypes.SELECT_OPERATOR, value: key };
  }
  if (key === 'Enter' || key === '=') return { type: ActionTypes.CALCULATE, value: '=' };
  if (key === 'Escape') return { type: ActionTypes.CLEAR, value: 'C' };
  return null;
}

function buttonForAction(action) {
  const value = action.type === ActionTypes.CLEAR ? 'C' : action.value;
  return buttons.find(
    (button) => button.dataset.action === action.type && button.dataset.value === value,
  );
}

function flashButton(button) {
  if (!button) return;
  for (const candidate of buttons) {
    clearTimeout(pressedTimers.get(candidate));
    candidate.classList.remove('is-pressed');
  }
  button.classList.add('is-pressed');
  const timer = setTimeout(() => button.classList.remove('is-pressed'), 3000);
  pressedTimers.set(button, timer);
}

function render() {
  const calculationText = getCalculation(state);
  display.value = getDisplay(state);
  display.textContent = getDisplay(state);
  display.dataset.phase = state.phase;
  calculation.textContent = calculationText;
  calculation.hidden = calculationText === '';
}

function dispatch(action, sourceButton) {
  state = reducer(state, action);
  render();
  flashButton(sourceButton ?? buttonForAction(action));
}

keypad.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  dispatch(actionFromButton(button), button);
});

window.addEventListener('keydown', (event) => {
  const action = actionFromKey(event.key);
  if (
    !action ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  dispatch(action);
});

render();
