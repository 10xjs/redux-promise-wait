import { CLEAR_ACTIONS, ADD_ACTION, STATS } from './action-types';

export const clearActions = () => ({
  type: CLEAR_ACTIONS,
});

export const addAction = (action, promise) => ({
  type: ADD_ACTION,
  payload: {
    action,
    promise,
  },
});

export const stats = (stats) => ({
  type: STATS,
  payload: stats,
});
