import { combineReducers } from 'redux';
import { ADD_ACTION, CLEAR_ACTIONS, STATS } from './action-types';

const actions = (state = [], action) => {
  const map = {
    [ADD_ACTION]: (state, { payload }) => [ ...state, payload ],
    [CLEAR_ACTIONS]: () => [],
    default: (state) => state,
  };

  return (map[action.type] || map.default)(state, action);
};

const stats = (state = [], action) => {
  const map = {
    [STATS]: (state, { payload }) => [ ...state, payload ],
    default: (state) => state,
  };

  return (map[action.type] || map.default)(state, action);
};

export default combineReducers({
  actions,
  stats,
});
