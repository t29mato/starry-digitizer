// INFO: How the canvas compares against the imported state (docs/design/
// auto-extraction-review-design.md, "6."). View-only: not in undo history
// or project files.
export class ReviewView {
  // INFO: overlay of moved / deleted / added / reassigned points (toggle)
  showChanges = false
  // INFO: show the imported points instead of the current ones; only while
  // a button or the `i` key is held, so nobody edits invisible points
  showInitial = false

  setShowChanges(value: boolean): void {
    this.showChanges = value
  }

  setShowInitial(value: boolean): void {
    this.showInitial = value
  }
}
