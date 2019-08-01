
const fs = require('fs')
const markright = require('../markright')
const markright2 = require('./markright')

const filename = process.argv[2]

const text = fs.readFileSync(filename).toString()
const mr = markright.parse(text)

const walk = (markright, dispatcher) => {
  return markright.map(node => {
    if (typeof node === 'string') {
      if ('__text__' in dispatcher) {
        dispatcher.__text__(node)
      }
    } else if (node === null) {
      if ('__null__' in dispatcher) {
        dispatcher.__null__()
      }
    } else if (typeof node === 'object') {
      if (node.id in dispatcher) {
        dispatcher[node.id](node)
      } else if ('__command__' in dispatcher) {
        dispatcher.__command__(node)
      }
    } else {
      throw new Error(`walk: Unrecognized type of node (${node})`)
    }
  })
}


const allSpace = x => /^\s*$/.test(x)

class Generator {
  constructor() {
    this.level = 0
    this.atNewline = true
    this.output = ''
  }
  
  out(x) {
    this.output += String(x)
    this.atNewline = false
  }

  indent() { return ' '.repeat(this.level*2) }
  newline() { 
    if (!this.atNewline) {
      this.out('\n' + this.indent())
      this.atNewline = true
    }
  }

  graph({ children }) {
    this.out('@graph')
    this.newline()
    walk(children, this)
  }

  __command__({ id, args, children }) {
    this.out('@' + id + (args ? `(${args.join(', ')})` : ''))
    this.level++
    if (children) {
      children = children.filter(x => !allSpace(x))
      if (children && children.length == 1) {
        const child = children[0]
        if (typeof child === 'string' && child.length < 40) {
          this.out(`{${child}}`)      
        } else {
          this.newline()
          walk(children, this)
        }
      } else {
        this.newline()
        walk(children, this)
        this.newline()
      }
    }
    this.level--
    if (this.level == 0) {
      this.newline()
    }
  }
  
  __text__(text) {
    const hasNewline = text[text.length-1] == '\n'
    if (hasNewline) {
      text = text.slice(0, text.length-1)
    }
    //const m = text.match(/^\s*(.*)/)
    // if (m) {
    this.out(text)
    // }
    if (hasNewline) this.newline()
  }
}

const gen = new Generator()
walk(mr, gen)
console.log(gen.output)

// const mr2 = markright2.parse(gen.output)
// console.log(mr2)
