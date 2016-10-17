/* global describe, expect, it, require */
const render = require('./index');

const MARKDOWN_DOCS = [];

MARKDOWN_DOCS.push(
`# Basic Markdown Template

This is a basic Markdown template, with no interpolations going on.

This should be

- easy and;
- predictable!
`
);

MARKDOWN_DOCS.push(
`# Here's a code snippet with no interpolations

\`\`\`shell
npm install -g yarn
\`\`\`
`
);

MARKDOWN_DOCS.push(
`# Here's a code snippet with things which shouldn't be treated as interpolations

\`\`\`shell
function rbenv() {
  RUBY=blah
}
\`\`\`
`
);

MARKDOWN_DOCS.push(
`# Here's a paragraph with a simple interpolation

There are {{Object.keys(props).length}} props being supplied to this component.
`
);

MARKDOWN_DOCS.push(
`# Here's a code snippet with a simple interpolation

\`\`\`shell
function rbenv() {
  RUBY={{props.rubycontent}}
}
\`\`\`
`
);

MARKDOWN_DOCS.push(
`# Markdown Template

This is a changed {{'{Markdown}'}} template!!! {{props.foo || '{bar}'}}

If you have [Homebrew](http://brew.sh/) installed you can use our [buildkite formula repository](https://github.com/buildkite/homebrew-buildkite) to install the agent:

\`\`\`shell
brew tap buildkite/buildkite
brew install --token='{{props.token || 'INSERT-YOUR-AGENT-TOKEN-HERE'}}' buildkite-agent

function() {
  ENV="foo_bar"
}
\`\`\`

If you don't use Homebrew you should follow the [Linux](/docs/agent/linux) install instructions.
`
);

MARKDOWN_DOCS.push(
`---
imports:
  foo: ./foo
  '{ foo as Bar, baz as bat }': ./another
---
# Markdown template with imports and interpolations

We're importing foo, which is {{foo}}.

We're also adding a react component here: {{<Bar {...bat} style={{ foo: 'bar' }} />}}
`
);

MARKDOWN_DOCS.push(
`---
imports:
  '{ name, version }': ./package.json
---

This is a _Markdown Component_ file. Here you can include JSX-style assignment expressions; this component was generated using version {{ version }} of {{ name }}!

Props passed to this component are available as \`props\`, so you can embed those too! Hello there, {{ props.who || 'world' }}!

Another cool thing you can do is use JSX **directly** - here's an SVG element, used inline: {{ <svg style={{ display: 'inline', height: '1em' }} width="304" height="290"><path stroke="black" d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" /></svg> }}.
`
);

const FAKE_WEBPACK_CONTEXT = { cacheable() {} };

describe('Webpack loader', () => {
  it('returns a valid React module', () => {
    MARKDOWN_DOCS.forEach((doc) => {
      expect(render.call(FAKE_WEBPACK_CONTEXT, doc)).toMatchSnapshot();
    });
  });
});
