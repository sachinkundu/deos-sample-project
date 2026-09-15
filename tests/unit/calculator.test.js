import { describe, expect, it } from 'vitest';
import {
  ActionTypes,
  ErrorCodes,
  evaluate,
  getCalculation,
  getDisplay,
  initialState,
  normalizeOperand,
  reducer,
} from '../../src/calculator.js';

const digit = (value) => ({ type: ActionTypes.APPEND_DIGIT, value });
const decimal = () => ({ type: ActionTypes.APPEND_DECIMAL });
const operator = (value) => ({ type: ActionTypes.SELECT_OPERATOR, value });
const calculate = () => ({ type: ActionTypes.CALCULATE });
const clear = () => ({ type: ActionTypes.CLEAR });

function enter(state, value) {
  return [...value].reduce(
    (current, character) =>
      reducer(current, character === '.' ? decimal() : digit(character)),
    state,
  );
}

function expression(left, operation, right) {
  let state = enter(initialState(), left);
  state = reducer(state, operator(operation));
  state = enter(state, right);
  return reducer(state, calculate());
}

describe('number entry through the shared action stream', () => {
  it('enters a decimal through button-equivalent actions', () => {
    expect(getDisplay(enter(initialState(), '1.5'))).toBe('1.5');
  });

  it('enters a decimal through keyboard-equivalent actions', () => {
    expect(getDisplay(enter(initialState(), '2.25'))).toBe('2.25');
  });

  it('preserves a leading zero and ignores duplicate decimal points', () => {
    let state = reducer(initialState(), decimal());
    expect(state.entry).toBe('0.');
    state = enter(initialState(), '1.5');
    expect(reducer(state, decimal())).toBe(state);
  });

  it('starts fresh with a digit or decimal after a result', () => {
    const result = expression('1', '+', '2');
    expect(reducer(result, digit('7'))).toEqual({ ...initialState(), entry: '7' });
    expect(reducer(result, decimal())).toEqual({ ...initialState(), entry: '0.' });
  });
});

describe('four-operation decimal arithmetic', () => {
  it.each([
    ['addition', '1.5', '+', '2.25', '3.75'],
    ['subtraction to a negative result', '7', '-', '10', '-3'],
    ['multiplication', '2.5', '*', '4', '10'],
    ['division', '7.5', '/', '2.5', '3'],
  ])('%s displays the exact result', (_name, left, operation, right, expected) => {
    expect(getDisplay(expression(left, operation, right))).toBe(expected);
  });

  it.each([
    ['7', '-', '10', '7 − 10'],
    ['2.5', '*', '4', '2.5 × 4'],
    ['7.5', '/', '2.5', '7.5 ÷ 2.5'],
  ])('shows %s %s %s above its result', (left, operation, right, expected) => {
    expect(getCalculation(expression(left, operation, right))).toBe(expected);
  });

  it.each([
    ['0.1', '+', '0.2', '0.3'],
    ['1234567890123', '+', '1', '1234567890124'],
    ['1', '/', '10000000', '0.0000001'],
    ['1000000000000000000000', '*', '1', '1000000000000000000000'],
    ['1', '/', '3', '0.33333333333333333333'],
    ['2', '/', '3', '0.66666666666666666667'],
  ])('formats %s %s %s without binary or exponent artifacts', (left, operation, right, expected) => {
    expect(evaluate(left, operation, right)).toBe(expected);
  });

  it('normalizes negative zero', () => {
    expect(evaluate('0', '-', '0')).toBe('0');
  });

  it('normalizes only one trailing decimal at operand boundaries', () => {
    expect(normalizeOperand('1.')).toBe('1');
    expect(normalizeOperand('1.25')).toBe('1.25');
    expect(getDisplay(expression('1.', '+', '2'))).toBe('3');
    expect(getDisplay(expression('1', '+', '2.'))).toBe('3');
  });
});

describe('deterministic transitions and recovery', () => {
  it('replaces an operator before right-hand entry', () => {
    let state = enter(initialState(), '8');
    state = reducer(state, operator('+'));
    state = reducer(state, operator('-'));
    state = enter(state, '2');
    expect(getDisplay(reducer(state, calculate()))).toBe('6');
  });

  it('keeps 8 + = pending and completes only after a right operand', () => {
    let state = enter(initialState(), '8');
    state = reducer(state, operator('+'));
    const premature = reducer(state, calculate());
    expect(premature).toBe(state);
    expect(getDisplay(premature)).toBe('8');
    expect(premature.phase).toBe('awaiting_rhs');
    expect(getDisplay(reducer(enter(premature, '2'), calculate()))).toBe('10');
  });

  it('ignores implicit chaining and repeated equals', () => {
    let rightEntry = enter(reducer(enter(initialState(), '8'), operator('+')), '2');
    expect(reducer(rightEntry, operator('*'))).toBe(rightEntry);
    const result = reducer(rightEntry, calculate());
    expect(reducer(result, calculate())).toBe(result);
  });

  it('reuses a result as the next left operand', () => {
    let state = expression('8', '+', '2');
    state = reducer(state, operator('*'));
    state = enter(state, '3');
    expect(getDisplay(reducer(state, calculate()))).toBe('30');
  });

  it.each(['partial', 'result'])('clear resets %s state', (kind) => {
    const state = kind === 'partial'
      ? enter(reducer(enter(initialState(), '9'), operator('+')), '4')
      : expression('6', '*', '7');
    expect(reducer(state, clear())).toEqual(initialState());
  });

  it('locks division-by-zero errors until clear and then permits success', () => {
    const error = expression('8', '/', '0.0');
    expect(error).toEqual({
      entry: '0',
      leftOperand: null,
      operator: null,
      phase: 'error',
      error: ErrorCodes.DIVIDE_BY_ZERO,
      calculation: '8 ÷ 0.0',
    });
    expect(getDisplay(error)).toBe('Cannot divide by zero');
    expect(reducer(error, digit('7'))).toBe(error);
    expect(reducer(error, decimal())).toBe(error);
    expect(reducer(error, operator('+'))).toBe(error);
    expect(reducer(error, calculate())).toBe(error);
    expect(getDisplay(expressionFrom(reducer(error, clear()), '8', '/', '2'))).toBe('4');
  });

  it('locks unexpected arithmetic failures as Result unavailable until clear', () => {
    const malformed = {
      entry: 'not-a-number',
      leftOperand: '1',
      operator: '+',
      phase: 'entering',
      error: null,
      calculation: null,
    };
    const error = reducer(malformed, calculate());
    expect(error.error).toBe(ErrorCodes.RESULT_UNAVAILABLE);
    expect(getDisplay(error)).toBe('Result unavailable');
    expect(reducer(error, digit('2'))).toBe(error);
    expect(reducer(error, clear())).toEqual(initialState());
  });
});

function expressionFrom(start, left, operation, right) {
  let state = enter(start, left);
  state = reducer(state, operator(operation));
  state = enter(state, right);
  return reducer(state, calculate());
}
