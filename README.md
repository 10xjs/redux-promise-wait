# Redux Wait

A store enhancer for [Redux](https://github.com/rackt/redux).

Collect and await the resolution of asynchronous actions dispatched from a single event.

### Installation

```
npm install --save redux redux-wait
```

> Redux is a peer dependency of Redux Wait, and is used internally - so you will need to install it as well.

## Examples

### Rendering an async React app on the Server

Redux Wait is used to run a callback function repeatedly until the Redux store state settles when all chains of asynchronous actions have resolved.

Redux Wait includes two components which work together to achieve this goal.

 - `waitEnhancer()` creates Redux Store enhancer which collects promises from dispatched actions.
 - `createIterator()` creates callback iterator which acts on the collection of promises.

The enhancer returned from `waitEnhancer()` observes calls to `store.dispatch` to capture promises from acync actions. It works out-of-the-box along side [`redux-promise`](https://github.com/acdlite/redux-promise) with no additional configuration.

**`store/create-store.js`**

```js
import { waitEnhancer } from 'redux-wait';
import { createStore, applyMiddleware, compose } from 'redux';
import promiseMiddleware from 'redux-promise';

const enhancedCreateStore = compose(
  waitEnhancer(),
  appleMiddleware(promiseMiddleware),
)(createStore);

export default enhancedCreateStore;
```

The iterator returned from `createIterator()` repeatedly fires a callback function until the Redux store state settles. A call to `createIterator()` takes 3 parameters, an iterator `callback` function, a Redux Wait enhanced `store`, and an optional `config`.

> Redux Wait has no dependency on React and it is actually not coupled to React in any way. It's up to you to handle any React specific code in your iterator callback.

**`server.js`**

```js
import React from 'react';
import { createIterator } from 'redux-wait';
import { renderToString } from 'react-dom/server';

import reducer from '../reducer';
import Root from '../containers/root'; 
import enhancedCreateStore from '../store/create-store';

// Create a new Redux store instance.
const store = enhancedCreateStore(reducer);

// Define an iterator callback.
const renderCallback = () => renderToString(<Root store={store} />);

// Create a new Redux Wait iterator.
const iterator = createIterator(store, renderCallback, { maxInterations = 3 });

...
```

When the iterator called, it repeatedly fires the callback provided at creation, keeping track of any async actions through the enhancer. Once an callback iteration completes where no async actions are found or `config.maxIterations` is reached, the iterator promise resolves.

> The callback you provide is expected to update the store state via async action creators. An app with connected components which request data from an api endpoint when the app is rendered is a common example.

**`server.js`**

```js
...

// Run the iterator.
iterator().then((result) => 
  console.log(`render callback result: ${result}`)
);
```

> Any arguments passed to a call to the iterator are forwarded to the iterator callback. This is useful for providing the local Redux store instance to a callback defined elsewhere.

The example is complete with all necessary code moved inside an `http.Server` handler which returns the rendered result along with the frozen Redux store state for initialization on the client.

**`server.js`**

```js
import http from 'http';
import { routeActions } from 'redux-simple-router';

import React from 'react';
import { createIterator } from 'redux-wait';
import { renderToString } from 'react-dom/server';

import reducer from '../reducer';
import enhancedCreateStore from '../store/create-store';
import Root from '../containers/root'; 

const { PORT = 8080 } = process.env;

// Define an iterator callback.
const renderCallback = (store) => renderToString(<Root store={store} />);

const handleRequest(req, res) {
  // Create a new Redux store instance.
  const store = enhancedCreateStore(reducer);
  
  // Create a new Redux store instance.
  const store = enhancedCreateStore(reducer);
  
  // Dispatch initial navigation action.
  store.dispatch(routeActions.go(req.url));

  // Create a new Redux Wait iterator.
  const iterator = createIterator(store, renderCallback, { maxInterations = 3 });
  
  iterator(store).then((markup) => {
    const state = store.getState();
    
    // Set headers from Redux state.
    const { statusCode, title } = state;
    res.statusCode = statusCode;
    
    const stateJSON = JSON.stringify(state);
    
    // Send rendered markup
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
</head>
<body>
  <div id="app">${markup}</div>
  <script id="state" type="application/json">${stateJSON}</script>
</body>
</html>`);
  });
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
```

### Providing a Custom Action Handler

If you use a different async action structure, or if you need to apply more complicated logic for determining which actions can delay render, `waitEnhancer` accepts a `handleAction` config parameter. The function signature for `handleAction` is `(action : Object) => promise : Promise`. If `handleAction` returns a promise, it is included by Redux Wait, otherwise the action is ignored.

The example uses a `meta.delayRender` property to determine which actions which will delay rendering. It also shows how an async pattern other than promises within your actions can be observed.

```js
...

const handleAction = (action) => {
  if (action.meta.delayRender) {
    return new Promise((resolve, reject) => {
      action.payload.on('complete', (data) => resolve(data));
      action.payload.on('error', (err) => reject(err));
    });
  }
  return null;
}

const enhancedCreateStore = compose(
  waitEnhancer({ handleAction }),
  appleMiddleware(customAsyncMiddleware),
)(createStore);

...
```

todo:

- [x] readme
- [ ] examples
- [ ] tests + coverage
- [ ] badges + ci
- [ ] docs
