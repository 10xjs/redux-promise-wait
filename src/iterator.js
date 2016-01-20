import { clearActions, stats } from './actions';

const warning = (condition, message) => {
  if (process.env.NODE_ENV !== 'production' && condition) {
    /* eslint-disable no-console */
    console.warn(`[redux-wait] ${message}`);
    /* eslint-enable no-console */
  }
};

const mapAction = ({ promise, action }) =>promise.then(
  (result) => ({ action, result }),
  (error) => ({ action, error }),
);

/**
 * Create a function that awaits all promises in the `redux-wait` store.
 *
 * @function
 *
 * @param {Function} callback A callback function.
 *
 * @param {Object} store A redux store enhanced with `redux-wait`.
 *
 * @param {Number} options.maxIterations The maximum number callback iterations.
 *
 * @param {Number} options.storeName The name of the property containing the
 * `waitStore` on the base store object, this should match the same config
 * option provided to `waitEnhancer()`.
 *
 * @returns {Function} A function that returns a promise.
 */
export default (callback, store, {
  maxIterations = 2,
  storeName = 'waitStore',
} = {}) => {
  warning(
    maxIterations < 2,
    'A `maxIterations` value of less than 2 will not wait for any actions to ' +
    'resolve. Specify a higher value.'
  );

  const waitStore = store[storeName];

  warning(
    !waitStore,
    'The provided store must be created using the `waitEnhancer`.'
  );

  return (...args) => {
    const iterate = (count = 1) => {
      const start = Date.now();

      const renderResult = callback(...args);

      const { actions } = waitStore.getState();
      waitStore.dispatch(clearActions());

      if (count < maxIterations) {
        if (actions.length) {
          return Promise.all(actions.map(mapAction))
            .then((results) => {
              const duration = Date.now() - start;
              waitStore.dispatch(stats({
                results,
                duration,
              }));
              return iterate(count + 1);
            });
        }

        return Promise.resolve(renderResult);
      }

      warning(
        actions.length,
        'Callback completed with unresolved actions. Specify a higher ' +
        'value for the `maxIterations` option or reduce the depth of async ' +
        'action creator calls.'
      );

      return Promise.resolve(renderResult);
    };

    return iterate();
  };
};
