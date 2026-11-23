import type { StarrydataRefDTO } from '@/application/dto/projectDTO'

// INFO: F18 of docs/design/starryai-auto.md: which Starrydata paper (SID) and
// which figure in it ("Fig.", e.g. 3(b)) the image on screen is. Typed by the
// person; optional; saved with the project (ProjectDTO.starrydata).
//
// Not part of the undo history (HistoryManager snapshots axes and datasets
// only), like wpd-auto's fields are not undone with the points. `edits`
// counts the person's changes only — a restore or a new image does not move
// it — so a host can tell a typed change from a loaded one (the starryai
// build sends `starrydata.ref` on typed changes only).

/** The longest SID / Fig. kept (wpd-auto's limits, backend/COLLECT.md). */
export const SID_MAX_LENGTH = 32
export const FIGURE_MAX_LENGTH = 16

/** Trimmed and cut to the limits; what is saved and recorded. */
export function normalizeStarrydataRef(value: {
  sid?: unknown
  figure?: unknown
}): StarrydataRefDTO {
  const text = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().slice(0, max) : ''
  return {
    sid: text(value.sid, SID_MAX_LENGTH),
    figure: text(value.figure, FIGURE_MAX_LENGTH),
  }
}

export class StarrydataRef {
  /** as typed (the field's text) */
  sid = ''
  figure = ''
  /** how many times the person changed a field (never reset) */
  edits = 0

  /** The person typed in a field. */
  set(value: { sid?: string; figure?: string }): void {
    const sid = value.sid ?? this.sid
    const figure = value.figure ?? this.figure
    if (sid === this.sid && figure === this.figure) return
    this.sid = sid
    this.figure = figure
    this.edits += 1
  }

  /** From a saved project; absent = empty. Not counted as an edit. */
  restore(dto: StarrydataRefDTO | undefined): void {
    this.sid = dto?.sid ?? ''
    this.figure = dto?.figure ?? ''
  }

  /** A new image: the fields belonged to the previous one. */
  clear(): void {
    this.restore(undefined)
  }

  /** What the project saves; undefined when both fields are empty. */
  toDTO(): StarrydataRefDTO | undefined {
    const dto = normalizeStarrydataRef(this)
    return dto.sid || dto.figure ? dto : undefined
  }
}
