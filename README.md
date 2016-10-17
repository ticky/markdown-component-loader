# Markdown Component Loader

Turn Markdown into dynamic, stateless React components

## Why?

The initial idea was to allow documentation to be better integrated, allowing it to be both context-sensitive and contextually informative, but I can see this being useful for other stuff, too!

## Usage

### Installation

```shell
yarn add markdown-component-loader
```

~_or_~

```shell
npm install --save markdown-component-loader
```

### Webpack Configuration

You then need to configure Webpack to use the loader, in your `webpack.config.js`;

```javascript
module.exports = {
  module: {
    loaders: {
      {
        test: /\.mdx$/i,
        loader: 'babel-loader!markdown-component-loader'
      }
      {...more}
    }
  },
  {...more}
};
```

### Usage and Syntax

`mdx` allows you interleave both React props and React components within your prose and code snippets! `mdx` files may optionally start with yaml-formatted frontmatter. `imports` specified will be included in the React component's definition.

Here's an example of an `mdx` file;
```markdown
---
imports:
  '{ name, version }': ./package.json
---

This is a _Markdown Component_ file. Here you can include JSX-style assignment expressions; this component was generated using version {{ version }} of {{ name }}!

Props passed to this component are available as `props`, so you can embed those too! Hello there, {{ props.who || 'world' }}!

Another cool thing you can do is use JSX **directly** - here’s an SVG element, used inline: {{ <svg style={{ display: 'inline', height: '1em' }} width="304" height="290"><path stroke="black" d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" /></svg> }}.

```

_**Note**: destructuring imports must be quoted, but others need not be._

The above `mdx` file will produce the following module within Webpack;

```javascript
// Module generated from markdown by markdown-component-loader v0.0.1
import React from 'react';
import { name, version } from './package.json';

export default function(props) {
  return (
    <div>
      <p>This is a <em>Markdown Component</em> file. Here you can include JSX-style assignment expressions; this component was generated using version { version } of { name }!</p>
      <p>Props passed to this component are available as <code>props</code>, so you can embed those too! Hello there, { props.who || 'world' }!</p>
      <p>Another cool thing you can do is use JSX <strong>directly</strong> - here’s an SVG element, used inline: { <svg style={{ display: 'inline', height: '1em' }} width="304" height="290"><path stroke="black" d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" /></svg> }.</p>
    </div>
  );
};

```

You can then include it anywhere you like in your own React code;

```javascript
// app.js
import ReactDOM from 'react-dom';

import Readme from './readme.mdx';

ReactDOM.render(<Readme who="you" />, document.getElementById('main'));
```

## Prior Art

[react-markdown-loader](https://github.com/javiercf/react-markdown-loader) by Javier Cubides allows use of React components within fenced code blocks (albeit not assignment expressions), and gave me the idea to use yaml front-matter for imports. Thanks! 😁
