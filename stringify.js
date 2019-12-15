const {
  Item, Text, Block, Line, Command, BlockCommand, InlineCommand,
} = require('./model')

const stringify = (mr) => {
  let indent = 0
  let line = ''
  let result = ''

  const add = (x) => line += x
  const newLine = () => {
    result += line + '\n'
    line = ' '.repeat(indent * 2)
  }

  const _stringify = (x) => {
    if (x === null || x === undefined) {
      return '';
    }
    switch (x.constructor) {
      case Text: {
        if (x.text === '@') add('@@')
        else add(x.text)
        break
      }
      case Block: {
        x.children.forEach(item => {
          newLine()
          _stringify(item)
        })
        break
      }
      case Line: {
        if (x.children) x.children.map(_stringify)
        break
      }
      case BlockCommand: {
        const { name, args, rawChildren, children } = x
        add(`@${name}`)
        if (args) add(`(${args.join(',')})`)
        indent++
        if (rawChildren) {
          splitLines(rawChildren).forEach(line => {
            newLine()
            add(line)
          })
        } else {
          _stringify(children)
        }
        indent--
        break
      }
      case InlineCommand: {
        const { name, args, delim, rawChildren, children } = x
        add(`@${name}`)
        if (args) add(`(${args.join(',')})`)
        if (delim) {
          add(delim.open)
          if (rawChildren) {
            add(rawChildren)
          } else {
            _stringify(children)
          }
          add(delim.close)
        }
        break
      }
      default:
        throw new Error(`stringify of an unknown type! (obj = ${JSON.stringify(x)})`)
    }
  }

  _stringify(mr)
  if (line) {
    result += line + '\n'
  }
  return result
}

module.exports = {
  stringify
}
