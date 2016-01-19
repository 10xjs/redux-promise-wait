import { ADD_PROMISE, CLEAR_PROMISES } from './action-types';

export default (state = { promises: [] }, action) => {
  const map = {
    [ADD_PROMISE]: (state, { payload }) => {
      const { promises } = state;
      return {
        ...state,
        promises: [ ...promises, payload ],
      };
    },
    [CLEAR_PROMISES]: (state) => {
      return {
        ...state,
        promises: [],
      };
    },
    default: (state) => state,
  };

  return (map[action.type] || map.default)(state, action);
};
