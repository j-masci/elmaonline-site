/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

/* eslint-disable global-require */

// The top-level (parent) route
const routes = {
  path: '',

  // Keep in mind, routes are evaluated in order
  children: [
    // The home route is added to client.js to make sure shared components are
    // added to client.js as well and not repeated in individual each route chunk.
    {
      path: '',
      load: () => import(/* webpackChunkName: 'home' */ './home'),
    },
    {
      path: '/contact',
      load: () => import(/* webpackChunkName: 'contact' */ './contact'),
    },
    {
      path: '/login',
      load: () => import(/* webpackChunkName: 'login' */ './login'),
    },
    {
      path: '/register',
      load: () => import(/* webpackChunkName: 'register' */ './register'),
    },
    {
      path: '/about',
      load: () => import(/* webpackChunkName: 'about' */ './about'),
    },
    {
      path: '/privacy',
      load: () => import(/* webpackChunkName: 'privacy' */ './privacy'),
    },
    {
      path: '/admin',
      load: () => import(/* webpackChunkName: 'admin' */ './admin'),
    },
    {
      path: '/battles/:id',
      load: () => import(/* webpackChunkName: 'battle' */ './battle'),
    },
    {
      path: '/battles',
      load: () => import(/* webpackChunkName: 'battles' */ './battles'),
    },
    {
      path: '/editor',
      load: () => import(/* webpackChunkName: 'editor' */ './editor'),
    },
    {
      path: '/kuskis',
      load: () => import(/* webpackChunkName: 'kuskis' */ './kuskis'),
    },
    {
      path: '/kuskis/:name',
      load: () => import(/* webpackChunkName: 'kuski' */ './kuski'),
    },
    {
      path: '/levels',
      load: () => import(/* webpackChunkName: 'levels' */ './levels'),
    },
    {
      path: '/levels/:id',
      load: () => import(/* webpackChunkName: 'level' */ './level'),
    },
    {
      path: '/levels/packs/:name',
      load: () => import(/* webpackChunkName: 'levelpack' */ './levelpack'),
    },
    {
      path: '/r/:uuid',
      load: () => import(/* webpackChunkName: 'replay' */ './replay'),
    },
    // Wildcard routes, e.g. { path: '(.*)', ... } (must go last)
    {
      path: '(.*)',
      load: () => import(/* webpackChunkName: 'not-found' */ './not-found'),
    },
  ],

  async action({ next }) {
    // Execute each child route until one of them return the result
    const route = await next();

    // Provide default values for title, description etc.
    route.title = `${route.title || 'Untitled Page'}`;
    route.description = route.description || '';

    return route;
  },
};

// The error page is available by permanent url for development mode
if (__DEV__) {
  routes.children.unshift({
    path: '/error',
    action: require('./error').default,
  });
}

export default routes;
