
const mr = require('../markright')

const text = `
@title
  hi there
  blas blis

This is @em<normal> text, with a @a(http://pauek.info){Link@x@y<>zzz}
and more on the @b{next} line, @yay @yay2(1, 2, 3)

@done{it is done}
`

const obj = mr.parse(text, {
  em: ({ children }) => new mr.Text(`**${children}**`),
  done: ({ children }) => mr.parse(`@parsedDone\n  new stuff @newcmd{${children}} and more\n`),
  yay: () => new mr.Text(`YAY`),
  yay2: ({ args }) => new mr.Text(args.join(':'))
})

process.stdout.write(mr.stringify(obj))