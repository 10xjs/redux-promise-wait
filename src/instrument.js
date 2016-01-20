import {createStore} from 'redux';
import isPromise from 'is-promise';
import { addAction } from './actions';
import waitReducer from './reducer';

export default ({ handleAction = ({ payload }) => payload } = {}) =>
  (next) => (reducer, initialState) => {
    const store = next(reducer, initialState);
    const waitStore = createStore(waitReducer);

    return {
      ...store,
      waitStore,
      dispatch(action) {
        const promise = handleAction(action);
        if (isPromise(promise)) {
          waitStore.dispatch(addAction(action, promise));
        }
        return store.dispatch(action);
      },
    };
  };
