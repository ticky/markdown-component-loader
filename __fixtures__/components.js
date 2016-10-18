export default [

`# Basic Markdown Template

This is a basic Markdown template, with no interpolations going on.

This should be

- easy and;
- predictable!
`,


`# Here's a code snippet with no interpolations

\`\`\`bash
npm install -g yarn
\`\`\`
`,

`# Here's a code snippet with things which shouldn't be treated as interpolations

\`\`\`bash
function rbenv() {
  RUBY=blah
}
\`\`\`
`,


`# Here's a paragraph with a simple interpolation

There are {{Object.keys(props).length}} props being supplied to this component.
`,

`# Here's a code snippet with a simple interpolation

\`\`\`bash
function rbenv() {
  RUBY={{props.rubycontent}}
}
\`\`\`
`,


`# Here's an unhinted code snippet

\`\`\`
the quick brown fox jumps over the lazy dog
\`\`\`
`,


`# Here's an unhinted snippet with no discernible language

\`\`\`
)()(())
\`\`\`
`,


`# Markdown Template

This is a {{'{Markdown}'}} template!!! {{props.foo || '{bar}'}}

\`\`\`bash
brew tap buildkite/buildkite
brew install --token='{{props.token || 'INSERT-YOUR-AGENT-TOKEN-HERE'}}' buildkite-agent

function() {
  ENV="foo_bar"
}
\`\`\`
`,


`---
imports:
  foo: foo
  '{ foo as Bar, baz as bat }': another
   # NOTE: These modules are non-relative only so they can be mocked by Jest
---
# Markdown template with imports and interpolations

We're importing foo, which is {{foo}}.

We're also adding a react component here: {{<Bar {...bat} style={{ foo: 'bar' }} />}}
`,


`---
imports:
  '{ name, version }': ./package.json
---

This is a _Markdown Component_ file. Here you can include JSX-style assignment expressions; this component was generated using version {{ version }} of {{ name }}!

Props passed to this component are available as \`props\`, so you can embed those too! Hello there, {{ props.who || 'world' }}!

Another cool thing you can do is use JSX **directly** - here's an SVG element, used inline: {{ <svg style={{ display: 'inline', height: '1em' }} width="304" height="290"><path stroke="black" d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" /></svg> }}.
`
];
