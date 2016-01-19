import { liftAction, unliftAction, lift } from 'redux-lift';
import isPromise from 'is-promise';

import { INIT, PASS_THROUGH } from './action-types';
import { addPromise } from './actions';
import waitReducer from './reducer';

export const isReduxAction = (action) => action.type.match(/$@@redux/);

/**
 * Compose a parent state and a `redux-wait` state into a single state object.
 *
 * @function
 *
 * @param {Object} parentState The parent store state
 *
 * @param {Object} waitState  The `redux-wait` store state.
 *
 * @returns {Object} The composed state.
 */
export const composeState = (parentState, waitState) => ({
  parentState,
  waitState,
});

/**
 * Extract the parent store state from a composed state object.
 *
 * @function
 *
 * @param {Object} composedState The composed state.
 *
 * @returns {Object} The parent store state.
 */
export const extractParentState = ({ parentState }) => parentState;

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
  extractParentState(composedState),
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
  const parentReducer = (state, action) => {
    const map = {
      [PASS_THROUGH]: (state, action) => reducer(state, unliftAction(action)),
      default: (state) => state,
    };

    return (map[action.type] || map.default)(state, action);
  };

  return (state, action) => {
    return composeState(
      parentReducer(extractParentState(state), action),
      waitReducer(extractWaitState(state), action)
    );
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
const createLiftDispatch = (handleAction) => (dispatch) => {
  dispatch(liftAction(PASS_THROUGH, { type: INIT }));

  return (action) => {
    const promise = handleAction(action);

    if (isPromise(promise)) {
      dispatch(addPromise(promise));
    }

    dispatch(liftAction(PASS_THROUGH, action));

    return action;
  };
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
  unliftState: extractParentState,
  liftDispatch: createLiftDispatch(handleAction),
});
