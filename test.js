
const markright = require('./markright')

const tests = [
  {
    input: `@something`,
    output: '[{"cmd":"something"}]'
  },
  {
    input: `@a@b@c`,
    output: '[[{"cmd":"a"},{"cmd":"b"},{"cmd":"c"}]]'
  },
  {
    input: `@a  @b@c`,
    output: '[[{"cmd":"a"},"  ",{"cmd":"b"},{"cmd":"c"}]]'
  },
  {
    input: `@a @b @c`,
    output: '[[{"cmd":"a"}," ",{"cmd":"b"}," ",{"cmd":"c"}]]'
  },
  {
    input: `some text@a @b @c`,
    output: '[["some text",{"cmd":"a"}," ",{"cmd":"b"}," ",{"cmd":"c"}]]'
  },
  {
    input: `@a@b@c
@d@e`,
    output: '[[{"cmd":"a"},{"cmd":"b"},{"cmd":"c"}],[{"cmd":"d"},{"cmd":"e"}]]'
  },
  {
    input: `
@mycmd(a ,  b ,  c  )
  Text inside
`,
    output: '[{"cmd":"mycmd","args":["a","b","c"],"children":["Text inside"]}]'
  },
  {
    input: `
@mycmd( a =  3 , b... ,  + +c + + )
  blis blas blus
`,
    output: '[{"cmd":"mycmd","args":["a =  3","b...","+ +c + +"],"children":["blis blas blus"]}]'
  },  
  {
    input:  `

@eatemptylinesatthebeginning
`,
    output: '[{"cmd":"eatemptylinesatthebeginning"}]'
  },
  {
    input:  `
@something
  
  Also eat the first null child
`,
    output: '[{"cmd":"something","children":["Also eat the first null child"]}]'
  },
  {
    input: `
@main
  @a
  @b
  @c
`,
    output: '[{"cmd":"main","children":[{"cmd":"a"},{"cmd":"b"},{"cmd":"c"}]}]'
  },
  {
    input: `
@main
  a
  b
  c
`,
    output: '[{"cmd":"main","children":["a","b","c"]}]'
  },
  {
    input: `
@main
  abc

  def
`,
    output: '[{"cmd":"main","children":["abc",null,"def"]}]'
  },
  {
    input: `
@command
  1st
    2nd
  3rd`,
    output: '[{"cmd":"command","children":["1st","  2nd","3rd"]}]'
  },
  {
    input: `
@command
    1st
    2nd
  3rd`,
    output: '[{"cmd":"command","children":["  1st","  2nd","3rd"]}]'
  },
  {
    input: '@a{[]}@b[{}]',
    output: '[[{"cmd":"a","children":["[]"]},{"cmd":"b","children":["{}"]}]]'
  }
]

// TODO: Stringifier tests

for (let test of tests) {
  const output = markright.parse(test.input)
  if (JSON.stringify(output) != test.output) {
    console.log("Input  ", JSON.stringify(test.input))
    console.log("Should ", test.output)
    console.log("Is     ", JSON.stringify(output))
    console.log()
  }
}
