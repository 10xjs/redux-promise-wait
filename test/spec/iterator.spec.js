import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createStore } from 'redux';
import enhancer from '../../src/enhancer';
import createIterator from '../../src/iterator';

chai.use(sinonChai);

describe('iterator',  () => {
  let store;
  let warn;

  beforeEach(() => {
    store = enhancer()(createStore)(() => {});
    warn = sinon.stub(console, 'warn');
  });

  afterEach(() => {
    warn.restore();
  });

  describe('creator', () => {
    it('should warn if `maxIterations` is < 2', () => {
      createIterator(() => {}, store, { maxIterations: 2 });
      expect(warn).not.to.have.been.called;

      createIterator(() => {}, store, { maxIterations: 1 });
      expect(warn).to.have.been.called;
    });

    it('should warn if the store is not enhanced', () => {
      const plainStore = createStore(() => {});

      createIterator(() => {}, store);
      expect(warn).not.to.have.been.called;

      createIterator(() => {}, plainStore);
      expect(warn).to.have.been.called;
    });
  });

  describe('maxIterations', () => {
    let callback;
    let iterator;

    beforeEach(() => {
      callback = sinon.spy(() => store.dispatch({
        type: 'TEST',
        payload: Promise.resolve(),
      }));
      iterator = createIterator(callback, store, { maxIterations: 5 });
    });

    it('maxIterations should limit iterations', (done) => {
      iterator().then(() => {
        expect(callback).to.have.callCount(5);
        done();
      });
    });

    it('should warn if max is reached', (done) => {
      expect(warn).not.to.have.been.called;
      iterator().then(() => {
        expect(warn).to.have.been.called;
        done();
      });
    });
  });

  describe('callback', () =>{
    it('should be called with arguments passed to iterator', () => {
      const callback = sinon.spy();
      const iterator = createIterator(callback, store);

      iterator(1, 2, 3);

      expect(callback).to.have.been.calledWith(1, 2, 3);
    });
  });

  describe('stats', () => {
    let callback;
    let iterator;

    beforeEach(() => {
      callback = () => store.dispatch({
        type: 'TEST',
        payload: Promise.resolve(),
      });
      iterator = createIterator(callback, store, { maxIterations: 5 });
    });

    it('should save stats between each iteration', (done) => {
      iterator().then(() => {
        const stats = store.waitStore.getState().stats;
        expect(stats.length).to.equal(4);
        done();
      });
    });

    it('should save successfull promise results', (done) => {
      iterator().then(() => {
        const stats = store.waitStore.getState().stats;
        expect(stats[0].results[0]).to.have.keys([ 'action', 'result' ]);
        done();
      });
    });

    it('should save failed promise errors', (done) => {
      const errorCallback = callback = () => store.dispatch({
        type: 'TEST',
        payload: Promise.reject(new Error),
      });
      const errorIterator = createIterator(errorCallback, store);

      errorIterator().then(() => {
        const stats = store.waitStore.getState().stats;
        expect(stats[0].results[0]).to.have.keys([ 'action', 'error' ]);
        done();
      });
    });
  });
});
