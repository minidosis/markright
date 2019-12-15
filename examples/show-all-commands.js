
const mr = require('../markright')

const text = `
@person
  @name(string){James Bond}
  @age(int)
    27
    @b{28}
    @em{29@x(_)<z>}

@text
  blis blas blus
  ---
  yay!
`

const funcMap = {
  __command__: (cmd) => {
    process.stdout.write(cmd.name)
    if (cmd.args) {
      process.stdout.write(`(${cmd.args.join(',')})`)
    }
    process.stdout.write('\n')
    return mr.parse(cmd.rawChildren, funcMap)
  }
} 

mr.parse(text, funcMap)
