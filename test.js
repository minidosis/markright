
const markright = require('./index.js')

const parseTests = [
  {
    input: '@a@b@c',
    output: `[{"id":"a"},{"id":"b"},{"id":"c"}]`
  },
  {
    input: '@a@@@b',
    output: `[{"id":"a"},"@",{"id":"b"}]`
  },
  {
    input: `abc@d efg`,
    output: `["abc",{"id":"d"}," efg"]`
  },
  {
    input: `abc@d{}efg`,
    output: `["abc",{"id":"d"},"efg"]`
  },
  {
    input: 'abc@d{efg}hij',
    output: `["abc",{"id":"d","children":["efg"]},"hij"]`
  },
  {
    input: 'abc@x(y,z){efg}hij',
    output: `["abc",{"id":"x","args":["y","z"],"children":["efg"]},"hij"]`
  },
  {
    input: 'abc\ndef',
    output: '["abc\\n","def"]'
  },
  {
    input: 'abc\n\ndef',
    output: '["abc\\n",null,"def"]'
  },
  {
    input: 'abc\n\n\ndef',
    output: '["abc\\n",null,null,"def"]'
  },
  {
    input: 'abc\n\n\n\ndef',
    output: '["abc\\n",null,null,null,"def"]'
  },
  {
    input: 'abc\n    \ndef',
    output: '["abc\\n",null,"def"]'
  },
  {
    input: 'abc\n    \ndef\n    \nghi',
    output: '["abc\\n",null,"def\\n",null,"ghi"]'
  },
  {
    input: 'abc\n    \ndef\n    \nghi\n',
    output: '["abc\\n",null,"def\\n",null,"ghi\\n"]'
  },
  {
    input: 'a a a a \nb\n\nd\ne@xxx(1, 2, 3){a\n\nb}\n',
    output: `["a a a a \\n","b\\n",null,"d\\n","e",{"id":"xxx","args":["1","2","3"],"children":["a\\n",null,"b"]},"\\n"]`
  },
  {
    input: '@code{int @main()<<< int a = 1; >>>}',
    output: '[{"id":"code","children":["int ",{"id":"main","children":[" int a = 1; "]}]}]'
  },
  {
    input: '@code<<<int main() { int a = 1; }>>>',
    output: '[{"id":"code","children":["int main() { int a = 1; }"]}]'
  },
  {
    input: '@code<<<@@include <iostream>;\nusing namespace std;\n\nint main() { cout << "hi"; }>>>',
    output: '[{"id":"code","children":["@include <iostream>;\\n","using namespace std;\\n",null,"int main() { cout << \\"hi\\"; }"]}]'
  },
  {
    input: 'abc\n@d{e}\n',
    output: '["abc\\n",{"id":"d","children":["e"]},"\\n"]'
  },
  {
    input: 'abc\n\n@d{e}\n',
    output: '["abc\\n",null,{"id":"d","children":["e"]},"\\n"]'
  },
  {
    input: 'abc @d{e}\nfgh',
    output: '["abc ",{"id":"d","children":["e"]},"\\n","fgh"]'
  },
  {
    input: 'a@{}b',
    output: '["a",{"id":""},"b"]'
  },
  {
    input: '@{a}@{b}',
    output: '[{"id":"","children":["a"]},{"id":"","children":["b"]}]'
  },
  {
    input: '@code{<script>}',
    output: '[{"id":"code","children":["<script>"]}]'
  },
  {
    input: '@code<{script}>',
    output: '[{"id":"code","children":["{script}"]}]'
  }
]

// Parse tests
for (let test of parseTests) {
  if (test.output) {
    const output = markright.parse(test.input)
    if (JSON.stringify(output) !== test.output) {
      console.log("Input  ", JSON.stringify(test.input))
      console.log("Should ", test.output)
      console.log("Is     ", JSON.stringify(output))
      console.log()
    }
  }
}

const jsonTests = [
  {
    input: `@person{@name{Max}@lastname{Morath}@age{@number{27}}}@foo{@bar{x}@baz{y}}`,
    output: {
      person: {
        name: 'Max',
        lastname: 'Morath',
        age: 27,
      },
      foo: {
        bar: 'x',
        baz: 'y',
      }
    }
  }, {
    input: `@longtext{
      bla
      bla
    }`,
    output: {
      longtext: `
      bla
      bla
    `
    },
  }
]
for (let test of jsonTests) {
  const generated = markright.toJson(markright.parse(test.input))
  const correct = test.output
  if (JSON.stringify(generated) != JSON.stringify(correct)) {
    console.log("Input   ", JSON.stringify(test.input))
    console.log("Should  ", JSON.stringify(correct))
    console.log("Is      ", JSON.stringify(generated))
  }
}
