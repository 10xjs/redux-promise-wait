import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createStore } from 'redux';
import { clearActions } from '../../src/actions';
import enhancer from '../../src/enhancer';

chai.use(sinonChai);

const reducer = (state = 0, action) => {
  const map = {
    INCREMENT: (state) => state + 1,
    default: (state) => state,
  };

  return (map[action.type] || map.default)(state, action);
};

describe('enhancer',  () => {
  let store;

  beforeEach(() => {
    store = enhancer()(createStore)(reducer);
  });

  it('should perform actions', () => {
    expect(store.getState()).to.equal(0);

    store.dispatch({ type: 'INCREMENT' });
    expect(store.getState()).to.equal(1);

    store.dispatch({ type: 'INCREMENT' });
    expect(store.getState()).to.equal(2);
  });

  it('should collect async actions', () => {
    const promise = Promise.resolve();
    const action = { type: 'TEST', payload: promise };
    const fixture = { action, promise };

    expect(store.waitStore.getState().actions).to.deep.equal([]);

    store.dispatch(action);
    expect(store.waitStore.getState().actions[0]).to.deep.equal(fixture);
  });

  describe('`clearActions`', ()=> {
    it('should clear actions', () => {
      const promise = Promise.resolve();
      const asyncAction = { type: 'TEST', payload: promise };

      expect(store.waitStore.getState().actions).to.deep.equal([]);

      store.dispatch(asyncAction);
      expect(store.waitStore.getState().actions.length).to.equal(1);

      store.waitStore.dispatch(clearActions());
      expect(store.waitStore.getState().actions).to.deep.equal([]);
    });
  });

  describe('`storeName` option', () => {
    it('should set the name of the wait store', () => {
      const namedStore = enhancer({
        storeName: 'test',
      })(createStore)(reducer);

      expect(store.test).to.be.undefined;
      expect(namedStore.test).to.be.an.object;
    });
  });

  describe('`handleAction` option', () => {
    it('should get called on dispatch', () => {
      const handleAction = sinon.spy();
      const promise = Promise.resolve();
      const asyncAction = { type: 'TEST', payload: promise };

      const store = enhancer({
        handleAction,
      })(createStore)(reducer);

      store.dispatch(asyncAction);

      expect(handleAction).to.have.been.calledWith(asyncAction);
    });
  });
});
