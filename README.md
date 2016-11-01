# Markdown Component Loader
[![npm](https://img.shields.io/npm/v/markdown-component-loader.svg?maxAge=2592000)](https://www.npmjs.com/package/markdown-component-loader) ![markdown-component-loader](https://img.shields.io/npm/l/markdown-component-loader.svg?maxAge=2592000) [![Build Status](https://travis-ci.org/ticky/markdown-component-loader.svg?branch=master)](https://travis-ci.org/ticky/markdown-component-loader) [![codecov](https://codecov.io/gh/ticky/markdown-component-loader/branch/master/graph/badge.svg)](https://codecov.io/gh/ticky/markdown-component-loader)

Turn Markdown into dynamic, stateless React components

- Integrate documentation and other prose with user info and context
- Show your real UI components alongside documentation
- Add other dynamic components inside documentation

## Usage

### Installation

```shell
yarn add markdown-component-loader
```

~_or_~

```shell
npm install --save markdown-component-loader
```

You'll need both Babel and Webpack in order to use it.

### Webpack Configuration

You then need to configure Webpack to use the loader, in your `webpack.config.js`;

```javascript
module.exports = {
  module: {
    loaders: [
      {
        test: /\.mdx$/i,
        loader: 'babel-loader!markdown-component-loader'
      },
      {...more}
    ]
  },
  {...more}
};
```

### Usage and Syntax

`mdx` allows you interleave both React props and React components within your prose and code snippets! `mdx` files may optionally start with yaml-formatted front-matter.

Front-matter accepts `imports`, which will be included in the React component's definition. Other front-matter keys are added as static properties of the resultant Markdown component.

Here's an example of an `mdx` file;
```markdown
---
imports:
  '{ name, version }': ./package.json
displayName: MarkdownComponentLoaderReadme
---

This is a _Markdown Component_ file. Here you can include JSX-style assignment expressions; this component was generated using version {{ version }} of {{ name }}!

Props passed to this component are available as `props`, so you can embed those too! Hello there, {{ props.who || 'world' }}!

Another cool thing you can do is use JSX **directly** - here’s an SVG element, used inline: {{ <svg style={{ display: 'inline', height: '1em' }} viewBox="0 0 304 290"><path fill="none" stroke="currentColor" strokeWidth="16" d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" /></svg> }}.

```

_**Note**: destructuring imports must be quoted, but others need not be._

The above `mdx` file will produce the following module within Webpack;

```javascript
// Module generated from Markdown by markdown-component-loader v0.0.4
import React from 'react';
import { name, version } from './package.json';

MarkdownComponent.propTypes = {
  className: React.PropTypes.string,
  style: React.PropTypes.object
};

MarkdownComponent["displayName"] = "MarkdownComponentLoaderReadme";

function MarkdownComponent(props) {
  const {className, style} = props;

  return (
    <div className={className} style={style}>
      <p>This is a <em>Markdown Component</em> file. Here you can include JSX-style assignment expressions; this component was generated using version { version } of { name }!</p>
      <p>Props passed to this component are available as <code>props</code>, so you can embed those too! Hello there, { props.who || 'world' }!</p>
      <p>Another cool thing you can do is use JSX <strong>directly</strong> - here’s an SVG element, used inline: { <svg style={{ display: 'inline', height: '1em' }} viewBox="0 0 304 290"><path fill="none" stroke="currentColor" strokeWidth="16" d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" /></svg> }.</p>
    </div>
  );
};

export default MarkdownComponent;

```

You can then include it anywhere you like in your own React code;

```javascript
import ReactDOM from 'react-dom';

import Readme from './readme.mdx';

ReactDOM.render(
  <Readme who="you" />,
  document.getElementById('main')
);
```

### Extra Configuration

Markdown Component Loader accepts configuration of options via either the webpack configuration file, or query string parameters.

```javascript
module.exports = {
  module: {
    loaders: [
      {
        test: /\.mdx$/i,
        loader: 'babel-loader!markdown-component-loader'
      }
    ]
  },
  markdownComponentLoader: {
    {...options}
  },
  {...more}
};
```

#### Available Options

* `passElementProps`: Controls whether props can be passed from the parent to the generated elements. Defaults to `false`.
* `implicitlyImportReact`: Whether to include React in the imports automatically. If set to `false`, you need to either supply React or import it explicitly. Defaults to `true`.

### Styling and Interaction

#### Container Styling

The container will have supplied `className` and `style` props passed through to it.

#### Inner Element Styling

If `passElementProps` is set to `true`, elements within the Markdown Component can be styled on a per-element-name basis. You can set this either in the `webpack.config.js` (see the "Extra Configuration" section) or the loader's query string.

All generated standard elements (read: elements which are known to `React.DOM`) will then have `elementProps['name']` spread onto them (where `name` is the tag name of the element). This option is intended to be used with [Basscss](http://www.basscss.com/) modular CSS.

Here's the above example markdown document converted with this option;

```javascript
// Module generated from Markdown by markdown-component-loader v0.0.4
import React from 'react';
import { name, version } from './package.json';

MarkdownComponent.propTypes = {
  className: React.PropTypes.string,
  style: React.PropTypes.object,
  elementProps: React.PropTypes.object
};

MarkdownComponent.defaultProps = {
  elementProps: {}
};

MarkdownComponent["displayName"] = "MarkdownComponentLoaderReadme";

function MarkdownComponent(props) {
  const {className, style, elementProps} = props;

  return (
    <div className={className} style={style}>
      <p {...elementProps['p']}>This is a <em {...elementProps['em']}>Markdown Component</em> file. Here you can include JSX-style assignment expressions; this component was generated using version { version } of { name }!</p>
      <p {...elementProps['p']}>Props passed to this component are available as <code {...elementProps['code']}>props</code>, so you can embed those too! Hello there, { props.who || 'world' }!</p>
      <p {...elementProps['p']}>Another cool thing you can do is use JSX <strong {...elementProps['strong']}>directly</strong> - here’s an SVG element, used inline: { <svg {...elementProps['svg']} style={{ display: 'inline', height: '1em' }} viewBox="0 0 304 290"><path {...elementProps['path']} fill="none" stroke="currentColor" strokeWidth="16" d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" /></svg> }.</p>
    </div>
  );
};

export default MarkdownComponent;

```

You can then specify _any_ prop you want here, and that prop will be applied to all elements of that tag name.

For example, if you wanted to get a callback from each level-1 heading instance, you could use the component like this;

```javascript
<SomeMarkdownComponent
  elementProps={{
    h1: {
      onClick: (evt) => /* do something */
    }
  }}
/>
```

This also facilitates the Basscss style, allowing, for instance, styling of anchor tags like so;

```javascript
<SomeMarkdownComponent
  elementProps={{
    a: {
      className: 'blue hover-navy text-decoration-none hover-underline'
    }
  }}
/>
```

## Prior Art

[react-markdown-loader](https://github.com/javiercf/react-markdown-loader) by Javier Cubides allows use of React components within fenced code blocks (albeit not assignment expressions), and gave me the idea to use yaml front-matter for imports. Thanks! 😁
