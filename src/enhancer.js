import { lift } from 'redux-lift';
import isPromise from 'is-promise';

import { addPromise } from './actions';
import waitReducer from './reducer';

/**
 * Compose a child state and a `redux-wait` state into a single state object.
 *
 * @function
 *
 * @param {Object} child The child store state
 *
 * @param {Object} wait  The `redux-wait` store state.
 *
 * @returns {Object} The composed state.
 */
export const composeState = (child, wait) => ({ child, wait });

/**
 * Extract the child store state from a composed state object.
 *
 * @function
 *
 * @param {Object} composedState The composed state.
 *
 * @returns {Object} The child store state.
 */
export const extractChildState = ({ child }) => child;

/**
 * Extract the `redux-wait` state from a composed state object.
 *
 * @function
 *
 * @param {Object} composedState The composed state.
 *
 * @returns {Object}               The `redux-wait` state.
 */
export const extractWaitState = ({ wait }) => wait;

/**
 * Update the `redux-wait` state.
 *
 * @function
 *
 * @param {Object} composedState The composed state.
 *
 * @param {Object} wait The new `redux-wait` state
 *
 * @returns {Object} The composed, updated state.
 */
export const updateState = (composedState, wait) => composeState(
  extractChildState(composedState),
  wait,
);

/**
 * Create a `reducer` function lifter.
 *
 * @function
 *
 * @param {Function} waitReducer The `redux-wait` state reducer.
 *
 * @returns {Function} A function that lifts a `reducer` function.
 */
export const createLiftReducer = (waitReducer) => (reducer) => {
  return (state, action) =>  composeState(
    reducer(extractChildState(state), action),
    waitReducer(extractWaitState(state), action),
  );
};

/**
 * Create dispatch function lifter.
 *
 * @function
 *
 * @param {Function} handleAction Callback `({Object}) => {Promise}`.
 *
 * @returns {Function} A function that lifts a `dispatch` function.
 */
const createLiftDispatch = (handleAction) => (dispatch) => (action) => {
  const promise = handleAction(action);

  if (isPromise(promise)) {
    dispatch(addPromise(promise));
  }

  dispatch(action);

  return action;
};

/**
 * Create a `redux-wait` store enhancer.
 *
 * @function
 *
 * @param {Function} options.handleAction Callback `({Object}) => {Promise}`.
 *
 * @returns {Function} A Redux store enhancer.
 */
export default ({ handleAction = ({ payload }) => payload } = {}) => lift({
  liftReducer: createLiftReducer(waitReducer),
  liftState: composeState,
  unliftState: extractChildState,
  liftDispatch: createLiftDispatch(handleAction),
});
