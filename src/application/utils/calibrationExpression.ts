// INFO: the calibration value fields (x1, x2, y1, y2) accept a small
// arithmetic expression, because papers print axis values as `10⁻³`,
// `2×10⁵` or `1/300` and converting them by hand is where mistakes creep in.
//
// This is a hand-written lexer + recursive-descent parser. It deliberately
// does NOT use `eval` / `new Function`: the text comes straight from an input
// field (or a pasted string), and the only things it can ever do are the
// operations listed below. Pure: no DOM, no state.
//
// Grammar (lowest to highest precedence):
//   expr    := term (('+' | '-') term)*
//   term    := unary (('*' | '/') unary)*
//   unary   := ('+' | '-') unary | power
//   power   := primary ('^' unary)?          -- right-associative
//   primary := number | name | name '(' expr ')' | '(' expr ')'
//
// `^` binds tighter than unary minus, as in maths: `-2^2` is -4, and the
// exponent may carry its own sign: `10^-3`. `2^3^2` is 2^(3^2) = 512.
//
// Not supported on purpose:
// - implicit multiplication (`2pi`, `2(3)`): asked to write the operator, so
//   `2e5` keeps its one meaning (scientific notation);
// - a comma as the decimal point or a thousands separator (`1,5`, `1,000`):
//   both readings are common in papers, so neither is guessed;
// - `log`: log10 or ln? It is refused with a message naming both.

export type CalibrationExpressionResult =
  | { ok: true; value: number }
  | { ok: false; error: string }

const MAX_LENGTH = 200
const MAX_DEPTH = 32

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
}

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  log10: Math.log10,
  ln: Math.log,
  exp: Math.exp,
}

// INFO: characters papers (and PDF copy-paste) use for the ASCII operators.
const CHARACTER_ALIASES: Record<string, string> = {
  '×': '*',
  '·': '*',
  '⋅': '*',
  '∙': '*',
  '÷': '/',
  '−': '-', // U+2212 minus sign
  '–': '-', // U+2013 en dash
  '‒': '-', // U+2012 figure dash
  π: 'pi',
}

const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
}

const PLAIN_NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/

/** True for text that is just a number (`12`, `-0.5`, `1e-3`), no operator. */
export function isPlainNumber(text: string): boolean {
  return PLAIN_NUMBER.test(text.trim())
}

type Token =
  | { kind: 'number'; value: number; text: string }
  | { kind: 'name'; text: string }
  | { kind: 'op'; text: '+' | '-' | '*' | '/' | '^' | '(' | ')' }

class ExpressionError extends Error {}

/**
 * Rewrites the paper-style characters into the ASCII the lexer reads:
 * `×` → `*`, `−` → `-`, `π` → `pi`, and a run of superscripts into an
 * exponent, `10⁻³` → `10^(-3)`.
 */
function normalize(text: string): string {
  let out = ''
  let superscriptRun = ''
  const flush = () => {
    if (superscriptRun) {
      out += `^(${superscriptRun})`
      superscriptRun = ''
    }
  }
  for (const ch of text) {
    if (ch in SUPERSCRIPTS) {
      superscriptRun += SUPERSCRIPTS[ch]
      continue
    }
    flush()
    out += CHARACTER_ALIASES[ch] ?? ch
  }
  flush()
  return out.replace(/\*\*/g, '^')
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const numberPattern = /^(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/
  const namePattern = /^[A-Za-z][A-Za-z0-9]*/
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === ',') {
      throw new ExpressionError("Use '.' as the decimal point")
    }
    const rest = text.slice(i)
    const number = numberPattern.exec(rest)
    if (number) {
      tokens.push({
        kind: 'number',
        value: Number(number[0]),
        text: number[0],
      })
      i += number[0].length
      continue
    }
    const name = namePattern.exec(rest)
    if (name) {
      tokens.push({ kind: 'name', text: name[0] })
      i += name[0].length
      continue
    }
    if ('+-*/^()'.includes(ch)) {
      tokens.push({ kind: 'op', text: ch as '+' })
      i += 1
      continue
    }
    throw new ExpressionError(`Unexpected character '${ch}'`)
  }
  return tokens
}

function describe(token: Token | undefined): string {
  return token ? `'${token.text}'` : 'the end'
}

class Parser {
  private position = 0
  private depth = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    if (this.tokens.length === 0) {
      throw new ExpressionError('Enter a value')
    }
    const value = this.expression()
    const next = this.peek()
    if (next) {
      if (next.kind === 'op' && next.text === ')') {
        throw new ExpressionError("Unexpected ')'")
      }
      throw new ExpressionError(`Missing an operator before ${describe(next)}`)
    }
    return value
  }

  private peek(): Token | undefined {
    return this.tokens[this.position]
  }

  private takeOp(...ops: string[]): string | undefined {
    const token = this.peek()
    if (token && token.kind === 'op' && ops.includes(token.text)) {
      this.position += 1
      return token.text
    }
    return undefined
  }

  private nested<T>(fn: () => T): T {
    this.depth += 1
    if (this.depth > MAX_DEPTH) {
      throw new ExpressionError('The expression is nested too deeply')
    }
    try {
      return fn()
    } finally {
      this.depth -= 1
    }
  }

  private expression(): number {
    return this.nested(() => {
      let value = this.term()
      for (let op = this.takeOp('+', '-'); op; op = this.takeOp('+', '-')) {
        const right = this.term()
        value = op === '+' ? value + right : value - right
      }
      return value
    })
  }

  private term(): number {
    let value = this.unary()
    for (let op = this.takeOp('*', '/'); op; op = this.takeOp('*', '/')) {
      const right = this.unary()
      value = op === '*' ? value * right : value / right
    }
    return value
  }

  private unary(): number {
    return this.nested(() => {
      const op = this.takeOp('+', '-')
      if (op) {
        const operand = this.unary()
        return op === '-' ? -operand : operand
      }
      return this.power()
    })
  }

  private power(): number {
    const base = this.primary()
    if (this.takeOp('^')) {
      // INFO: unary(), not power(): the exponent may have its own sign
      // (`10^-3`), and unary() → power() makes `^` right-associative.
      const exponent = this.unary()
      return Math.pow(base, exponent)
    }
    return base
  }

  private primary(): number {
    const token = this.peek()
    if (!token) {
      const previous = this.tokens[this.position - 1]
      throw new ExpressionError(`Missing a number after ${describe(previous)}`)
    }
    if (token.kind === 'number') {
      this.position += 1
      return token.value
    }
    if (token.kind === 'name') {
      this.position += 1
      return this.name(token.text)
    }
    if (token.text === '(') {
      this.position += 1
      const value = this.expression()
      if (!this.takeOp(')')) {
        throw new ExpressionError("Missing ')'")
      }
      return value
    }
    if (token.text === ')') {
      throw new ExpressionError("Unexpected ')'")
    }
    const previous = this.tokens[this.position - 1]
    throw new ExpressionError(
      previous
        ? `Missing a number between ${describe(previous)} and ${describe(
            token,
          )}`
        : `Missing a number before ${describe(token)}`,
    )
  }

  private name(text: string): number {
    const key = text.toLowerCase()
    if (key === 'log') {
      throw new ExpressionError('Use log10(…) or ln(…) instead of log')
    }
    // INFO: own-property lookups only, so `constructor`, `toString` and the
    // like are unknown names rather than whatever Object.prototype holds.
    if (Object.prototype.hasOwnProperty.call(FUNCTIONS, key)) {
      if (!this.takeOp('(')) {
        throw new ExpressionError(`Write ${key}(…) with parentheses`)
      }
      const argument = this.expression()
      if (!this.takeOp(')')) {
        throw new ExpressionError("Missing ')'")
      }
      return FUNCTIONS[key](argument)
    }
    if (Object.prototype.hasOwnProperty.call(CONSTANTS, key)) {
      return CONSTANTS[key]
    }
    throw new ExpressionError(`Unknown name '${text}'`)
  }
}

/**
 * Evaluates a calibration value such as `10^-3`, `10⁻³`, `2×10^5`, `2e5`,
 * `1/300` or `pi/2`. Never throws; an invalid text comes back with a message
 * meant for the person typing it.
 */
export function evaluateCalibrationExpression(
  text: string,
): CalibrationExpressionResult {
  if (text.length > MAX_LENGTH) {
    return { ok: false, error: 'The expression is too long' }
  }
  try {
    const value = new Parser(tokenize(normalize(text))).parse()
    if (!Number.isFinite(value)) {
      return { ok: false, error: 'The result is not a finite number' }
    }
    return { ok: true, value }
  } catch (e) {
    if (e instanceof ExpressionError) {
      return { ok: false, error: e.message }
    }
    throw e
  }
}

/** The value, or NaN when the text is empty or not a valid expression. */
export function parseCalibrationValue(text: string): number {
  const result = evaluateCalibrationExpression(text)
  return result.ok ? result.value : NaN
}
