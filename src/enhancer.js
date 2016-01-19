import { liftAction, unliftAction, lift } from 'redux-lift';
import isPromise from 'is-promise';

import { PASS_THROUGH } from './action-types';
import { addPromise } from './actions';
import waitReducer from './reducer';

/**
 * Compose a child state and a `redux-wait` state into a single state object.
 *
 * @function
 *
 * @param {Object} childState The child store state
 *
 * @param {Object} waitState  The `redux-wait` store state.
 *
 * @returns {Object} The composed state.
 */
export const composeState = (childState, waitState) => ({
  childState,
  waitState,
});

/**
 * Extract the child store state from a composed state object.
 *
 * @function
 *
 * @param {Object} composedState The composed state.
 *
 * @returns {Object} The child store state.
 */
export const extractChildState = ({ childState }) => childState;

/**
 * Extract the `redux-wait` state from a composed state object.
 *
 * @function
 *
 * @param {Object} composedState The composed state.
 *
 * @returns {Object}               The `redux-wait` state.
 */
export const extractWaitState = ({ waitState }) => waitState;

/**
 * Update the `redux-wait` state.
 *
 * @function
 *
 * @param {Object} composedState The composed state.
 *
 * @param {Object} waitState The new `redux-wait` state
 *
 * @returns {Object} The composed, updated state.
 */
export const updateState = (composedState, waitState) => composeState(
  extractChildState(composedState),
  waitState,
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
  const map = {
    [PASS_THROUGH]: (state, action) => composeState(
      reducer(extractChildState(state), unliftAction(action)),
      extractWaitState(state)
    ),
    default: (state, action) => composeState(
      reducer(extractChildState(state), action),
      extractWaitState(state)
    ),
  };

  return (state, action) => {
    // run wait reducer
    const reducedState = waitReducer(extractWaitState(state), action);
    const composedState = composeState(extractChildState(state), reducedState);

    return (map[action.type] || map.default)(composedState, action);
  };
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

  dispatch(liftAction(PASS_THROUGH, action));

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
