import Big from 'big.js';

const Decimal = Big();
Decimal.strict = true;
Decimal.DP = 20;
Decimal.RM = Decimal.roundHalfUp;

export const ActionTypes = Object.freeze({
  APPEND_DIGIT: 'append_digit',
  APPEND_DECIMAL: 'append_decimal',
  SELECT_OPERATOR: 'select_operator',
  CALCULATE: 'calculate',
  CLEAR: 'clear',
});

export const ErrorCodes = Object.freeze({
  DIVIDE_BY_ZERO: 'divide_by_zero',
  RESULT_UNAVAILABLE: 'result_unavailable',
});

export function initialState() {
  return {
    entry: '0',
    leftOperand: null,
    operator: null,
    phase: 'entering',
    error: null,
    calculation: null,
  };
}

export function getDisplay(state) {
  if (state.phase === 'error') {
    return state.error === ErrorCodes.DIVIDE_BY_ZERO
      ? 'Cannot divide by zero'
      : 'Result unavailable';
  }
  return state.entry;
}

export function getCalculation(state) {
  return state.calculation ?? '';
}

export function normalizeOperand(value) {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

function formatCalculation(leftOperand, operator, rightOperand) {
  const operatorSymbols = { '*': '×', '/': '÷', '-': '−', '+': '+' };
  return `${leftOperand} ${operatorSymbols[operator]} ${rightOperand}`;
}

function errorState(code, calculation = null) {
  return {
    entry: '0',
    leftOperand: null,
    operator: null,
    phase: 'error',
    error: code,
    calculation,
  };
}

function appendDigit(state, value) {
  if (!/^\d$/.test(value)) return state;

  if (state.phase === 'result') {
    return { ...initialState(), entry: value };
  }

  if (state.phase === 'awaiting_rhs') {
    return { ...state, entry: value, phase: 'entering' };
  }

  return { ...state, entry: state.entry === '0' ? value : `${state.entry}${value}` };
}

function appendDecimal(state) {
  if (state.phase === 'result') {
    return { ...initialState(), entry: '0.' };
  }

  if (state.phase === 'awaiting_rhs') {
    return { ...state, entry: '0.', phase: 'entering' };
  }

  if (state.entry.includes('.')) return state;
  return { ...state, entry: `${state.entry}.` };
}

function selectOperator(state, operator) {
  if (!['+', '-', '*', '/'].includes(operator)) return state;

  if (state.phase === 'awaiting_rhs') {
    return { ...state, operator };
  }

  if (state.leftOperand !== null) return state;

  try {
    return {
      ...state,
      leftOperand: normalizeOperand(state.entry),
      operator,
      phase: 'awaiting_rhs',
      calculation: null,
    };
  } catch {
    return errorState(ErrorCodes.RESULT_UNAVAILABLE);
  }
}

export function evaluate(leftOperand, operator, rightOperand) {
  const left = new Decimal(leftOperand);
  const right = new Decimal(rightOperand);
  let result;

  switch (operator) {
    case '+':
      result = left.plus(right);
      break;
    case '-':
      result = left.minus(right);
      break;
    case '*':
      result = left.times(right);
      break;
    case '/':
      if (right.eq('0')) throw new RangeError(ErrorCodes.DIVIDE_BY_ZERO);
      result = left.div(right);
      break;
    default:
      throw new TypeError('Unsupported operator');
  }

  return result.eq('0') ? '0' : result.toFixed();
}

function calculate(state) {
  if (
    state.phase !== 'entering' ||
    state.leftOperand === null ||
    state.operator === null
  ) {
    return state;
  }

  try {
    const rightOperand = normalizeOperand(state.entry);
    const calculation = formatCalculation(
      state.leftOperand,
      state.operator,
      rightOperand,
    );
    const result = evaluate(
      state.leftOperand,
      state.operator,
      rightOperand,
    );
    return {
      entry: result,
      leftOperand: null,
      operator: null,
      phase: 'result',
      error: null,
      calculation,
    };
  } catch (error) {
    const calculation = state.operator && state.leftOperand !== null
      ? formatCalculation(
        state.leftOperand,
        state.operator,
        normalizeOperand(state.entry),
      )
      : null;
    return errorState(
      error instanceof RangeError && error.message === ErrorCodes.DIVIDE_BY_ZERO
        ? ErrorCodes.DIVIDE_BY_ZERO
        : ErrorCodes.RESULT_UNAVAILABLE,
      calculation,
    );
  }
}

export function reducer(state, action) {
  if (action.type === ActionTypes.CLEAR) return initialState();
  if (state.phase === 'error') return state;

  switch (action.type) {
    case ActionTypes.APPEND_DIGIT:
      return appendDigit(state, action.value);
    case ActionTypes.APPEND_DECIMAL:
      return appendDecimal(state);
    case ActionTypes.SELECT_OPERATOR:
      return selectOperator(state, action.value);
    case ActionTypes.CALCULATE:
      return calculate(state);
    default:
      return state;
  }
}
