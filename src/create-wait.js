import { clearPromises } from './actions';
import { extractWaitState } from './enhancer';

/**
 * Create a function that awaits all promises in the `redux-wait` store.
 *
 * @function
 *
 * @param {Function} callback A callback function.
 *
 * @param {Object} store A `redux-wait` store.
 *
 * @param {Number} options.maxIterations The maximum callback iterations.
 *
 * @returns {Function} A function that returns a promise.
 */
export default (callback, store, { maxIterations = 1 }) => (...args) =>{
  const iterate = (count = 0) => {
    const renderResult = callback(...args);
    const { promises } = extractWaitState(store.getState());
    store.dispatch(clearPromises());

    return Promise.all(promises).then(actions => {
      if (!actions.length || count === maxIterations) {
        if (actions.length) {
          /* eslint-disable no-console */
          console.warn(`Callback completed with unresolved promises. Specify a
            higher value for the \`additionalRenders\` parameter or reduce the
            depth of async action creators.`);
          /* eslint-enable no-console */
        }
        return renderResult;
      }
      return iterate(count + 1);
    });
  };

  return iterate();
};
