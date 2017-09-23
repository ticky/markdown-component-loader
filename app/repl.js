import React from 'react';
import ReactDOM from 'react-dom';
import DocChomp from 'doc-chomp';
import AceEditor from 'react-ace';

import 'brace/mode/markdown';
import 'brace/mode/jsx';
import 'brace/theme/tomorrow_night_eighties';

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

const COMMON_ACE_PROPS = {
  setOptions: {
    scrollPastEnd: .33,
    tabSize: 2
  },
  showPrintMargin: false,
  theme: 'tomorrow_night_eighties',
  wrapEnabled: true
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
    // this.compile(this.state.input);
  }

  render() {
    return (
      <div className="repl">
        <div className="repl-editors">
          <AceEditor
            {...COMMON_ACE_PROPS}
            className="repl-editor repl-input"
            ref={(ref) => this._inputEditor = ref}
            mode="markdown"
            value={this.state.input}
            onChange={this.handleEditorChange}
          />
          <AceEditor
            {...COMMON_ACE_PROPS}
            className="repl-editor repl-output"
            ref={(ref) => this._outputEditor = ref}
            mode="jsx"
            value={this.state.output}
            readOnly={true}
            highlightActiveLine={false}
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

  handleEditorChange(input) {
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
      console.error(error);
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

