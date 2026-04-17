const DATA_UPDATED_EVENT = 'app:data-updated';

export function emitDataUpdated(source = 'unknown') {
  window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT, { detail: { source, at: Date.now() } }));
}

export function onDataUpdated(handler) {
  window.addEventListener(DATA_UPDATED_EVENT, handler);
  return () => window.removeEventListener(DATA_UPDATED_EVENT, handler);
}
