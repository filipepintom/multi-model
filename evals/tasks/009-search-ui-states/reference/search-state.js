(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SearchState = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const initialState = { status: 'idle', query: '', results: [], error: null };

  function reducer(state, action) {
    switch (action.type) {
      case 'QUERY_CHANGED':
        if (!String(action.query || '').trim()) return { ...initialState };
        return { status: 'loading', query: action.query, results: [], error: null };
      case 'RESULTS_RECEIVED': {
        if (state.status !== 'loading' || action.query !== state.query) return state;
        const results = Array.isArray(action.results) ? action.results : [];
        return { ...state, status: results.length ? 'success' : 'empty', results, error: null };
      }
      case 'REQUEST_FAILED':
        if (state.status !== 'loading' || action.query !== state.query) return state;
        return { ...state, status: 'error', results: [], error: String((action.error && action.error.message) || action.error || 'erro') };
      case 'RETRY':
        if (state.status !== 'error') return state;
        return { ...state, status: 'loading', error: null };
      default:
        return state;
    }
  }

  return { initialState, reducer };
});
