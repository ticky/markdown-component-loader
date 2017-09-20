/* global ace, document */
import markdownComponentLoader from '../src';

require('./repl.css');

class Editor {
  constructor(selector, mode) {
    this.$el = document.querySelector(selector);
    this.editor = ace.edit(this.$el);
    this.session = this.editor.getSession();
    this.document = this.session.getDocument();

    this.editor.setTheme('ace/theme/tomorrow_night_eighties');
    this.editor.setShowPrintMargin(false);
    this.editor.commands.removeCommands(['gotoline', 'find']);
    this.$el.setAttribute('style', 'font-family: Menlo, Monaco, Consolas, "Courier New", monospace; line-height: inherit');

    this.session.setMode(mode);
    this.session.setUseSoftTabs(true);
    this.session.setTabSize(2);
    this.session.setUseWorker(false);
    this.session.setUseWrapMode(true);

    this.editor.setOption('scrollPastEnd', 0.33);
  }
}

class REPL {
  constructor() {
    this.input = new Editor('.repl-input .ace_editor', 'ace/mode/markdown').editor;

    this.output = new Editor('.repl-output .ace_editor', 'ace/mode/jsx').editor;
    this.output.setReadOnly(true);
    this.output.setHighlightActiveLine(false);
    this.output.setHighlightGutterLine(false);

    this.$errorReporter = document.querySelector('.repl-errors');
  }

  clearOutput() {
    this.$errorReporter.innerText = '';
  }

  setOutput(output) {
    this.output.setValue(output, -1);
  }

  getSource() {
    return this.input.getValue();
  }

  printError(message) {
    this.$errorReporter.innerText = message;
  }

  compile() {
    let transformed;
    const code = this.getSource();

    this.clearOutput();

    try {
      transformed = markdownComponentLoader.call(
        {
          cacheable() {},
          options: {
            markdownComponentLoader: {
              passElementProps: false
            }
          }
        },
        code
      );
    } catch (err) {
      this.printError(`Errors:\n${err.message}`);
    }

    if (transformed) {
      this.setOutput(transformed);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const repl = new REPL();

  function onSourceChange() {
    repl.compile();
  }

  repl.input.addEventListener('change', onSourceChange);

  onSourceChange();
});
