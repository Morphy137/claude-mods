export const PANE_OPEN_STORE_KEY = 'paneOpen'

type CloseKind = 'plugin' | 'person' | 'unload'

/** A close the person or the toggle chose; an `unload` is the engine dropping the pane, not a choice. */
export function isPaneDismissal(kind: CloseKind): boolean {
  return kind !== 'unload'
}
