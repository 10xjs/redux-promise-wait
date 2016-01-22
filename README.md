# Redux Promise Wait

An indispensable tool for rendering Redux apps on the server.

[![Build Status](https://travis-ci.org/nealgranger/redux-promise-wait.svg?branch=master)](https://travis-ci.org/nealgranger/redux-promise-wait)
[![Coverage Status](https://coveralls.io/repos/github/nealgranger/redux-promise-wait/badge.svg?branch=master)](https://coveralls.io/github/nealgranger/redux-promise-wait?branch=master)

### Installation

```
npm install --save redux-promise-wait
```

## Examples

### Rendering an async React app on the Server

Redux Promise Wait is used to run a callback function repeatedly until the Redux store state settles when all chains of asynchronous actions have resolved.

Redux Promise Wait includes two components which work together to achieve this goal.

 - `waitEnhancer()` creates Redux Store enhancer which collects promises from dispatched actions.
 - `createWait()` creates a function that returns a promise that resolves with all of the collected promises.

**1. Enhanced your Redux Store**

The enhancer returned from `waitEnhancer()` observes calls to `store.dispatch` to capture promises from acync actions. It works out-of-the-box along side [`redux-promise`](https://github.com/acdlite/redux-promise) with no additional configuration.

*`store/create-store.js`*

```js
import waitEnhancer from 'redux-promise-wait/enhancer';
import { createStore, applyMiddleware, compose } from 'redux';
import promiseMiddleware from 'redux-promise';

const enhancedCreateStore = compose(
  waitEnhancer(),
  appleMiddleware(promiseMiddleware),
)(createStore);

export default enhancedCreateStore;
```

**2. Create an Iterator**

A call to `createWait()` takes 3 parameters, a `callback` function, a Redux Promise Wait enhanced `store`, and an optional `config`. It returns a function that returns a promise and that takes the same arguments as your callback.

> Redux Promise Wait has no dependency on React and it is actually not coupled to React in any way. It's up to you to handle any React specific code in your wait function callback.

*`server.js`*

```js
import React from 'react';
import createWait from 'redux-promise-wait/create-wait';
import { renderToString } from 'react-dom/server';

import reducer from '../reducer';
import Root from '../containers/root'; 
import enhancedCreateStore from '../store/create-store';

// Create a new Redux store instance.
const store = enhancedCreateStore(reducer);

// Define a wait callback.
const renderCallback = () => renderToString(<Root store={store}/>);

// Create a wait function.
const renderWait = createWait(renderCallback, store, { maxInterations = 3 });

...
```

When the wait function is called, it repeatedly fires the callback, keeping track of any async actions by way of the the enhancer. Once an callback iteration completes where no async actions are found or `config.maxIterations` is reached, the wait function promise resolves the callback return value. Only the result returned from last call to the callback is resolved.

> The callback you provide is expected to update the store state through async action creators. An app with connected components which request data from an api endpoint when the app is rendered is a common example.

*`server.js`*

```js
...

const props = { store };

// Run the wait function.
renderWait().then((result) => 
  console.log(`render callback result: ${result}`)
);
```

> Any arguments passed to a call to the wait function are forwarded to the callback. This is useful for providing the local Redux store instance to a callback defined elsewhere.


**3. Handle Server Requests**

The example is complete with all necessary code moved inside an `http.Server` handler. It returns the rendered result along with the frozen Redux store state for initialization on the client.

*`server.js`*

```js
import http from 'http';
import { routeActions } from 'redux-simple-router';

import React from 'react';
import createWait from 'redux-promise-wait/create-wait';
import { renderToString } from 'react-dom/server';

import reducer from '../reducer';
import enhancedCreateStore from '../store/create-store';
import Root from '../containers/root'; 

const { PORT = 8080 } = process.env;

// Define a wait callback.
const renderCallback = (props) => renderToString(<Root {...props}/>);

const server = http.createServer((req, res) {
  // Create a new Redux store instance.
  const store = enhancedCreateStore(reducer);
  
  // Dispatch initial navigation action.
  store.dispatch(routeActions.go(req.url));

  // Create a wait function.
  const renderWait = createWait(renderCallback, store, { maxInterations = 3 });
  
  renderWait({ store }).then((markup) => {
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
  <script src="client.js"></script>
</body>
</html>`);
  });
});

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
```

### Providing a Custom Action Handler

If you use a different async action structure, or if you need to apply more complicated logic for determining which actions can delay render, `waitEnhancer` accepts a `handleAction` config parameter. The function signature for `handleAction` is `(action : Object) => promise : Promise`. If `handleAction` returns a promise, it is included by Redux Promise Wait, otherwise the action is ignored.

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
