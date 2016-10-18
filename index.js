const frontMatter = require('front-matter');
const Markdown = require('markdown-it');
const RegexPlugin = require('markdown-it-regexp');
const { name, version } = require('./package.json');
const hash = require('sha.js');
const ReactDOM = require('react').DOM;

const formatImport = (name, source) => `import ${name} from '${source}';`;

const formatModule = (imports, content) => (
  `// Module generated from Markdown by ${name} v${version}
${imports}

MarkdownComponent.propTypes = {
  className: React.PropTypes.string,
  style: React.PropTypes.object,
  elementProps: React.PropTypes.object
};

MarkdownComponent.defaultProps = {
  elementProps: {}
};

function MarkdownComponent(props) {
  const {className, style, elementProps} = props;

  return (
    <div className={className} style={style}>
      ${content}
    </div>
  );
};

export default MarkdownComponent;
`
);

module.exports = function(source) {
  // This loader is deterministic and will return the same thing for the same inputs!
  this.cacheable();

  // Always import React
  const imports = [formatImport('React', 'react')];

  // Pull out front-matter
  const { body, attributes } = frontMatter(source);

  // Add additional imports
  if (attributes.imports) {
    Object.keys(attributes.imports).forEach((name) => {
      source = attributes.imports[name];
      imports.push(formatImport(name, source));
    });
  }

  // Configure Markdown renderer, highlight code snippets, and post-process
  const content = new Markdown()
    .configure('commonmark')
    .use(
      RegexPlugin(/{({\s*(?:<.*?>|.*?)\s*})}/, (match) => match[1]) // Plugin to pass through assignment expressions without escaping
    )
    .enable([
      'smartquotes'
    ])
    .set({
      // We need explicit line breaks
      breaks: true,
      // Curly quotes are good and nice and smh if you don’t want ‘em
      typographer: true,
      highlight(content, languageHint) {
        const preprocessed_content = {};
        let highlightedContent;

        const highlight = require('highlight.js');
        highlight.configure({
          useBR: true,
          tabReplace: '  '
        });

        // Hold onto JSX assignment expressions before passing to highlighter
        content = content.replace(/{({\s*(?:<.*?>|.*?)\s*})}/g, (match, value) => {
          const key = hash('sha256').update(value, 'utf-8').digest('hex');
          preprocessed_content[key] = value;
          return key;
        });

        // Try highlighting with a given hint
        if (languageHint && highlight.getLanguage(languageHint)) {
          try {
            highlightedContent = highlight.highlight(languageHint, content).value;
          } catch (err) {} // eslint-disable-line no-empty
        }

        // Highlight without a hint
        if (!highlightedContent) {
          try {
            highlightedContent = highlight.highlightAuto(content).value;
          } catch (err) {} // eslint-disable-line no-empty
        }

        // Quote curly braces
        highlightedContent = highlightedContent.replace(/[\{\}]/g, (match) => `{'${match}'}`);

        // Put back the JSX assignment expressions we pulled out before returning
        Object.keys(preprocessed_content).forEach((key) =>
          highlightedContent = highlightedContent.replace(key, preprocessed_content[key])
        );

        return highlight.fixMarkup(highlightedContent);
      }
    })
    .render(body)                     // --- Above this line, we talk markdown, below, we start talking something in the overlap of (JS(X)HTML) ---
    .replace(/class=/g, 'className=') // React compatibility
    .replace(/<br>/g, '<br />')       // More React compatibility (markdown-it doesn’t let you output XHTML-style self-closers 🙃)
    .replace(/\n/g, '\n      ')       // For pretty inspector output 🎉
    .replace(/\n\s+$/g, '')           // Remove the trailing blank line
    .replace(
      /<([^\/][^\s>]*)([^/>\s]*)/g,
      (match, tagName) => {
        // Pass through `elementProps` to tags React knows about (the others are already under our control)
        return (tagName in ReactDOM)
          ? `${match} {...elementProps['${tagName}']}`
          : match;
      }
    );

  return formatModule(imports.join('\n'), content || '{/* no input given */}');
};
