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
}
