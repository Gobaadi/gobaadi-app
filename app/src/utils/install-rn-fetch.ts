import { fetch as rnFetch } from 'whatwg-fetch';

if (typeof rnFetch === 'function' && globalThis.fetch !== rnFetch) {
  globalThis.fetch = rnFetch;
}
