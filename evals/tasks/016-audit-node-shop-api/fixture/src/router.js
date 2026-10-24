'use strict';

const { HttpError, sendError, log } = require('./http');

// Turns "/orders/:id/pay" into a regex and the list of parameter names.
// A "*" segment captures the rest of the path as params.rest.
function compile(pattern) {
  const keys = [];
  const source = pattern
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        keys.push(part.slice(1));
        return '([^/]+)';
      }
      if (part === '*') {
        keys.push('rest');
        return '(.*)';
      }
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { keys, regex: new RegExp(`^${source}/?$`) };
}

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, ...handlers) {
    this.routes.push({ method, ...compile(pattern), handlers });
    return this;
  }

  get(pattern, ...handlers) {
    return this.add('GET', pattern, ...handlers);
  }

  post(pattern, ...handlers) {
    return this.add('POST', pattern, ...handlers);
  }

  delete(pattern, ...handlers) {
    return this.add('DELETE', pattern, ...handlers);
  }

  match(method, pathname) {
    let pathMatched = false;
    for (const route of this.routes) {
      const m = route.regex.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      const params = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(m[i + 1]);
      });
      return { route, params };
    }
    return { route: null, pathMatched };
  }

  // Runs the handlers of the matching route in order. A handler that ends the
  // response stops the chain; middleware such as requireAuth just returns.
  async handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    req.path = url.pathname;
    req.query = url.searchParams;

    try {
      const { route, params, pathMatched } = this.match(req.method, url.pathname);
      if (!route) {
        throw pathMatched ? new HttpError(405, 'method not allowed') : new HttpError(404, 'not found');
      }
      req.params = params;
      for (const handler of route.handlers) {
        await handler(req, res);
        if (res.writableEnded) break;
      }
    } catch (err) {
      if (err instanceof HttpError) {
        if (!res.headersSent) sendError(res, err.status, err.message, err.details);
        return;
      }
      if (err instanceof URIError) {
        if (!res.headersSent) sendError(res, 400, 'malformed URL');
        return;
      }
      log.error('request failed', { method: req.method, path: req.path, error: err.stack });
      if (res.headersSent) res.destroy(err);
      else sendError(res, 500, 'internal server error');
    }
  }
}

module.exports = { Router };
