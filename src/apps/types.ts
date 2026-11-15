export interface AppProps {
  /** Id of the window hosting this app instance. */
  windowId: string;
  /** Launch arguments passed to openApp (e.g. { fileId }). */
  props: Record<string, unknown>;
}
