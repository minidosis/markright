
const mr = require('../markright')

const text = `
@person
  @code{007}
  @name
    @first{James}
    @last{Bond}
  @age(int){27}
  @friend
    @name{M}
    @age(int){52}
    @friend
    @boss(bool){false}
  @height(double){170.5}
  @notMarried
`

const object = ({ rawChildren }) => {
  let result = {}
  mr.parse(rawChildren, {
    __command__: (cmd) => {
      const { name, args, rawChildren } = cmd
      const type = args && args[0]
      if (type === undefined) {
        if (cmd instanceof mr.BlockCommand) {
          if (rawChildren) {
            result[name] = object({ rawChildren })
          } else {
            result[name] = true
          }
        } else {
          result[name] = rawChildren
        }
      } else {
        switch (type) {
          case 'double':
          case 'int':
            result[name] = Number(rawChildren)
            break
          case 'string':
            result[name] = rawChildren
            break
          case 'bool':
            result[name] = (rawChildren === 'true')
            break
          default:
            throw new Error(`object: unknown object type -> '${type}' <-`)
        }
      }
    }
  })
  return result
}

const person = mr.parse(text, {
  person: object,
  __block__: ({ children }) => children.filter(item => !(item instanceof mr.Line))
})

console.log(person)