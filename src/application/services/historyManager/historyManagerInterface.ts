/**
 * What moved the undo/redo stacks.
 *
 * INFO: `capture` is the one a host needs to know about — it means "the user
 * just did something in the digitizer that is now undoable". The others exist
 * so a host driving a single, shared undo stack can tell its OWN calls to
 * `undo()` / `redo()` apart from a fresh user action; without that distinction
 * it would push a new entry for the very undo it just performed (see the
 * "single undo stack" recipe in the README).
 */
export type HistoryChangeType = 'capture' | 'undo' | 'redo' | 'clear'

/**
 * Payload of a history notification. Deliberately carries no project data:
 * a listener that wants the new state reads it from the repositories (or the
 * `change` event of <StarryDigitizer>), and a payload with nothing to echo
 * back cannot start a write-back loop.
 */
export interface HistoryChange {
  /** which call moved the stacks */
  type: HistoryChangeType
  /** stack state AFTER the change (same value as `canUndo`) */
  canUndo: boolean
  /** stack state AFTER the change (same value as `canRedo`) */
  canRedo: boolean
}

export type HistoryChangeListener = (change: HistoryChange) => void

export interface HistoryManagerInterface {
  /** true when there is a snapshot to go back to */
  readonly canUndo: boolean
  /** true when there is a snapshot to go forward to */
  readonly canRedo: boolean

  /**
   * Push the current axisSets/datasets state onto the undo stack and clear
   * the redo stack. Call this right BEFORE a mutation you want to be able
   * to undo (i.e. it captures the state to return to, not the result).
   */
  capture(): void

  /** Restore the most recently captured snapshot, if any. */
  undo(): void

  /** Re-apply the snapshot that the last undo() moved away from, if any. */
  redo(): void

  /** Discard all history. Used when starting a fresh project (new image). */
  clear(): void

  /**
   * Observe stack movements. Returns the unsubscribe function.
   *
   * INFO: this is the one thing `reactive()` cannot give a host. `canUndo` /
   * `canRedo` are observable state, but "a capture just happened" is an
   * event: two captures in a row leave `canUndo` at `true` throughout, and a
   * Vue watcher would coalesce them anyway. A host that keeps its own undo
   * stack has to push exactly one entry per capture, so it needs the event.
   *
   * Listeners run synchronously, AFTER the stacks have moved, so `canUndo` /
   * `canRedo` (and the repositories, for undo/redo) already show the new
   * state. Do not mutate digitizer state from a listener: that would re-enter
   * the manager and notify again. Record the event and get out — a host that
   * needs to write something back should do it from its own event loop turn.
   */
  subscribe(listener: HistoryChangeListener): () => void
}
