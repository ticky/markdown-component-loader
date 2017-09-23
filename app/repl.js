import React from 'react';
import ReactDOM from 'react-dom';
import DocChomp from 'doc-chomp';
import Codemirror from 'react-codemirror2';

import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/jsx/jsx';

import convert from '../src/convert';

import './repl.css';

const DEFAULT_CONTENT = DocChomp`
  ---
  imports:
    window: global/window
  ---
  # [Markdown Component Loader](https://github.com/ticky/markdown-component-loader)

  Turn Markdown into dynamic, stateless React components

  - Integrate documentation and other prose with user info and context
  - Show your real UI components alongside documentation
  - Add other dynamic components inside documentation

  ## REPL

  This REPL allows you to view a generated component as you type.
  The generated component is an ES6 module, which you can then pass into [Babel](http://babeljs.io), and use with [React](https://facebook.github.io/react/).

  You can interpolate strings and React elements here; <code>{{ window.navigator.userAgent }}</code>!

  More information about Markdown Component Loader is avaiable [on GitHub](https://github.com/ticky/markdown-component-loader)
`;

const COMMON_CODEMIRROR_OPTIONS = {
  lineNumbers: true,
  lineWrapping: true,
  theme: 'tomorrow-night-eighties'
};

class REPL extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      input: DEFAULT_CONTENT,
      output: '',
      error: 'Not yet compiled...'
    };

    this.handleEditorChange = this.handleEditorChange.bind(this);
  }

  componentWillMount() {
    this.compile(this.state.input);
  }

  render() {
    return (
      <div className="repl">
        <div className="header">
          <img id="logo" src={require('./images/logo.svg')} alt="Markdown Component Loader" />
          <a className="bubble-link blue-bubble" href="index.html">Learn more</a>
        </div>
        <div className="repl-editors">
          <Codemirror
            className="repl-editor repl-input"
            options={{
              mode: 'markdown',
              ...COMMON_CODEMIRROR_OPTIONS
            }}
            value={this.state.input}
            onChange={this.handleEditorChange}
          />
          <Codemirror
            className="repl-editor repl-output"
            options={{
              mode: 'jsx',
              readOnly: true,
              ...COMMON_CODEMIRROR_OPTIONS
            }}
            value={this.state.output}
          />
        </div>
        {
          this.state.error && (
            <div className="repl-reporter">
              {this.state.error.toString()}
            </div>
          )
        }
      </div>
    );
  }

  handleEditorChange(editor, metadata, input) {
    this.setState({ input }, () => {
      this.compile(input);
    });
  }

  compile(input) {
    let output;

    try {
      output = convert(
        input,
        {
          passElementProps: false
        }
      );
    } catch (error) {
      this.setState({ error });
    }

    if (output) {
      this.setState({ output, error: null });
    }
  }
}

ReactDOM.render(
  <REPL />,
  document.getElementById('root')
);

