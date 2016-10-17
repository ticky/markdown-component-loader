const frontMatter = require('front-matter');
const Markdown = require('markdown-it');
const highlight = require('highlight.js');
const RegexPlugin = require('markdown-it-regexp');
const { name, version } = require('./package.json');
const hash = require('sha.js');
const ReactDOM = require('react').DOM;

highlight.configure({
  useBR: true,
  tabReplace: '  '
});

const markdown = new Markdown({
  breaks: true,
  xhtmlOut: true,
  highlight(content, languageHint) {
    const preprocessed_content = {};
    let highlightedContent;

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


    if (highlightedContent) {
      // Put back the JSX assignment expressions we pulled out before returning
      Object.keys(preprocessed_content).forEach((key) =>
        highlightedContent = highlightedContent.replace(key, preprocessed_content[key])
      );

      return highlight.fixMarkup(highlightedContent);
    }

    return '';
  }
});

// Plugin to pass through assignment expressions without escaping
markdown.use(RegexPlugin(/{({\s*(?:<.*?>|.*?)\s*})}/, (match) => match[1]));

const formatImport = (name, source) => `import ${name} from '${source}';`;

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

  return `// Module generated from markdown by ${name} v${version}
${imports.join(`\n`)}

export default function({className, style, elementProps = {}, ...props}) {
  return (
    <div className={className} style={style}>
      ${
        markdown
          .render(body)
          .replace(/class=/g, 'className=') // React compatibility
          .replace(/<br>/g, '<br />')       // More React compatibility (markdown-it doesn't let you output XHTML-style self-closers 🙃)
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
          )
      }
    </div>
  );
};
`;
};
