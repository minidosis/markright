
// TODO: Permitir una directiva que cambie el CONTROL_CHARACTER
const DEFAULT_CONTROL_CHARACTER = '@'
const delimiters = "{}[]<>" // Tienen que estar por parejas!

// Delimiters
const openDelimiters = [...delimiters].filter((_, i) => i % 2 == 0).join('')
const isOpenDelim = ch => (openDelimiters.indexOf(ch) !== -1)
const closeDelimFor = str => [...str].reverse().map(x => delimiters[delimiters.indexOf(x) + 1]).join('')

class Parser {
  constructor(input, commandFuncs) {
    this.input = input
    this.commandFuncs = commandFuncs
    this.pos = 0
    this.lin = this.col = 1
    this.controlChar = DEFAULT_CONTROL_CHARACTER;
  }

  setControlChar(ch) { 
    if (ch.length != 1) {
      this.error(`Wrong control character: '${ch}'`)
    }
    this.controlChar = ch; 
  }

  error(msg) { throw new Error(msg) }

  ok() { return this.pos < this.input.length }
  curr() { return this.input[this.pos] }
  at(str) { return this.input.slice(this.pos, this.pos + str.length) === str }

  notAtSpace() { return this.ok() && !/\s/.test(this.curr()) }

  next(N = 1) {
    for (let i = 0; i < N; i++) {
      if (!this.ok()) {
        break
      }
      if (this.curr() == '\n') {
        this.lin++, this.col = 1
      } else {
        this.col++
      }
      this.pos++
    }
  }

  expect(str) {
    if (!this.ok() || !this.at(str)) {
      this.error(`Expected '${str}'`);
    }
    this.next(str.length)
  }

  parseIdent() {
    let start = this.pos
    while (this.ok() && /[a-zA-Z0-9_]/.test(this.curr())) {
      this.next()
    }
    return this.input.slice(start, this.pos)
  }

  parseArgs() {
    this.expect('(')
    let start = this.pos
    let end = this.input.indexOf(')', start)
    if (end === -1) {
      this.error(`Parse error: missing closing parenthesis`)
    }
    let args = this.input.slice(start, end).split(',').map(x => x.trim()).filter(x => x.length > 0)
    this.pos = end
    this.expect(')')
    return args
  }

  parseOpenDelimiter() {
    /*

    Permitimos delimitadores que son repeticiones del mismo delimitador:
    { {{ {{{ {{{{ ...
    [ [[ [[[ [[[[ ...
    < << <<< <<<< ...

    Antes usaba un delimitador arbitrario usando cualquier combinación de los delimitadores
    pero eso no permite escribir @code{<script>}, así que se permite repetición pero no mezcla.

    */
    let first = this.curr(), delim = ''
    if (isOpenDelim(first)) {
      delim += first
      this.next()
      while (this.at(first)) {
        delim += first
        this.next()
      }
    }
    return (delim.length === 0 ? null : {
      open: delim,
      close: closeDelimFor(delim),
    })
  }

  parseCommand() {
    this.expect(DEFAULT_CONTROL_CHARACTER)
    let result = {}
    result.id = this.parseIdent()
    if (this.at('(')) {
      let args = this.parseArgs()
      if (args.length > 0) {
        result.args = args
      }
    }
    let delim = this.parseOpenDelimiter();
    if (delim) {
      let children = this.parse(delim.close)
      this.expect(delim.close)
      if (children.length > 0) {
        result.children = children
      }
    }
    return result
  }

  parse(closeDelim) {
    let result = []
    let text = '';
    let newline = false;

    const lastIsCommand = () => {
      const i = result.length - 1;
      return i >= 0 && result[i] !== null && typeof result[i] === 'object';
    }

    const addPendingText = () => {
      if (text.length > 0) {
        result.push(text)
      }
      text = '';
    }

    // TODO: Quitar líneas vacías del principio y del final

    while (this.ok()) {
      if (closeDelim && this.at(closeDelim)) {
        break
      }
      if (this.at(this.controlChar + this.controlChar)) {
        text += this.controlChar
        this.next(2)
      }
      else if (this.at(this.controlChar)) {
        addPendingText()
        let cmd = this.parseCommand()
        if (this.commandFuncs && cmd.id in this.commandFuncs) {
          cmd = this.commandFuncs[cmd.id](cmd)
        }
        result.push(cmd)
        newline = false
      }
      else if (this.at('\n')) {
        text += '\n'
        this.next()
        const allSpaces = /^\s*$/.test(text)
        if (allSpaces && newline) {
          result.push(null)
          text = ''
        } else {
          addPendingText()
        }
        newline = true;
        if (this.notAtSpace() && lastIsCommand()) {
          // Meter un espacio entre un comando a final de línea y el texto que le sigue
          text += ' '
        }
      } else {
        text += this.curr()
        this.next()
      }
    }
    addPendingText()
    return result
  }
}

const parse = (str, commandFuncs) => {
  try {
    const parser = new Parser(str, commandFuncs);
    return parser.parse()
  } catch (e) {
    console.log("Error parsing markright:", e)
    return { error: e }
  }
}

const isTextNode = (node) => {
  return typeof node === 'string'
}
const isCommandNode = (node) => {
  return typeof node === 'object' && 'id' in node && typeof node.id === 'string'
}

const walk = (markright, dispatcher) => {
  const invoke = (node, id, base) => {
    id = (id === '' ? '__empty__' : id)
    if (id in dispatcher) {
      dispatcher.dispatch(id, node)
    } else if (base in dispatcher) {
      dispatcher.dispatch(base, node)
    } else if ('__error__' in dispatcher) {
      dispatcher.dispatch('__error__', node)
    } else {
      throw new Error(`markright.walk: no dispatcher available for ${id}`)
    }
  }
  return markright.map(node => {
    if (typeof node === 'string') {
      invoke(node, '__text__')
    } else if (node === null) {
      invoke(node, '__null__')
    } else if (typeof node === 'object') {
      invoke(node, node.id, '__command__')
    } else {
      throw new Error(`markright.walk: Unrecognized type of node (${node})`)
    }
  })
}

class Generator {
  constructor() {
    this.stack = []
    this.pos = -1
    this.push()
  }

  get top() { return this.stack[this.pos] }

  get inline() { return this.top.inline }
  set inline(x) { this.top.inline = x }

  get paragraph() { return this.top.paragraph }
  set paragraph(p) { this.top.paragraph = p }

  get doc() { return this.top.doc }
  get context() { return this.stack.map(frame => frame.calling) }

  in(ctx) { return this.context.filter(x => x === ctx).length > 0 }
  add(item) { this.top.paragraph.push(item) }

  dispatch(id, node) {
    this.top.calling = id;
    this.paragraph.push(this[id](node))
  }

  push() {
    this.stack.push({ doc: [], paragraph: [], inline: true, calling: null })
    this.pos++
  }

  pop() {
    let result
    if (this.inline) {
      result = this.__paragraph__(this.paragraph)
    } else {
      if (this.paragraph.length > 0) {
        this.doc.push(this.__paragraph__(this.paragraph))
      }
      result = this.__doc__(this.doc)
    }
    this.stack.pop()
    this.pos--
    return result
  }

  __doc__(doc) { return doc.join('\n') }
  __paragraph__(paragraph) { return paragraph.join('') }
  __text__(text) { this.add(text) }

  __null__() {
    this.inline = false
    if (this.paragraph) {
      // FIXME? 
      // We can redefine __paragraph__ to process the paragraph in some 
      // way before adding it to the document...
      this.doc.push(this.__paragraph__(this.paragraph))
    }
    this.paragraph = []
  }

  __command__(node) {
    this.add(`@error{Command "${node.id}" not found}`)
  }

  generate(markright) {
    this.push()
    walk(markright, this)
    return this.pop()
  }
}

class JsonGenerator {
  constructor() {
    this.root = {};
    this.cursor = this.root;
  }

  dispatch(id, node) {
    return this[id](node)
  }

  __text__(t) { 
    if (!/\s/.test(t)) {
      throw Error(`JsonGenerator: text node within a command: '${t}'`); 
    }
  }

  __number(node) {
    if (!Array.isArray(node.children)) {
      throw Error(`JsonGenerator: wrong Number node: no children`)
    }
    if (node.children.length != 1) {
      throw Error(`JsonGenerator: wrong Number node: too many children`)
    }
    const num = Number(node.children[0]);
    if (typeof num !== 'number') {
      throw Error(`JsonGenerator: wrong Number node: child is not a number`)
    }
    return num
  }

  __command__(node) {
    if (Array.isArray(node.args) && args.length > 0) {
      throw Error(`JsonGenerator: cannot convert node '${JSON.stringify(node)}' since it has arguments.`)
    }
    if (node.children.length == 1 && isTextNode(node.children[0])) {
      // Text nodes are handled here
      this.cursor[node.id] = node.children[0]
    } 
    else if (node.children.length == 1 && isCommandNode(node.children[0]) && node.children[0].id == 'number') {
      this.cursor[node.id] = this.__number(node.children[0])
    }
    else {
      const savedCursor = this.cursor
      this.cursor = {}
      walk(node.children, this)
      savedCursor[node.id] = this.cursor
      this.cursor = savedCursor
    }
  }
}

const toJson = (markright) => {
  const gen = new JsonGenerator()
  walk(markright, gen)
  return gen.root
}

module.exports = {
  parse,
  Generator,
  isTextNode,
  isCommandNode,
  toJson,
}