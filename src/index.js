import frontMatter from 'front-matter';
import Markdown from 'markdown-it';
import RegexPlugin from 'markdown-it-regexp';
import { name, version } from '../package.json';
import hash from 'sha.js';
import { DOM as ReactDOM } from 'react';
import { getLoaderConfig } from 'loader-utils';
import DocChomp from 'doc-chomp';
import JSEsc from 'jsesc';

const JSESC_CONFIG = {
  compact: false,
  indent: '  ',
  wrap: true
};

const DEFAULT_CONFIGURATION = {
  implicitlyImportReact: true,
  passElementProps: false
};

const formatImport = (name, source) => (
  `import ${name} from '${source}';\n`
);

const formatStatic = (name, value) => (
  `\nMarkdownComponent[${JSEsc(name, JSESC_CONFIG)}] = ${JSEsc(value, JSESC_CONFIG)};\n`
);

const formatModule = ({ passElementProps }, imports, statics, content) => {
  let moduleText = DocChomp`
    // Module generated from Markdown by ${name} v${version}
    ${imports}
    MarkdownComponent.propTypes = {
      className: React.PropTypes.string,
      style: React.PropTypes.object`;

  if (passElementProps) {
    moduleText += DocChomp(2)`,
        elementProps: React.PropTypes.object
      };

      MarkdownComponent.defaultProps = {
        elementProps: {}`;
  }

  moduleText += DocChomp(0)`
    
    };
    ${statics}
    function MarkdownComponent(props) {
      const {className, style${passElementProps ? ', elementProps' : ''}} = props;

      return (
        <div className={className} style={style}>
          ${content}
        </div>
      );
    };

    export default MarkdownComponent;
    `;

  return moduleText;
};

module.exports = function(source) {
  // This loader is deterministic and will return the same thing for the same inputs!
  this.cacheable && this.cacheable();

  // Loads configuration from webpack config as well as loader query string
  const config = Object.assign({}, DEFAULT_CONFIGURATION, getLoaderConfig(this, 'markdownComponentLoader'));

  const invalidStatics = ['propTypes'];
  const imports = [];

  // Import React unless we've been asked otherwise
  if (config.implicitlyImportReact) {
    imports.push(formatImport('React', 'react'));
  }

  // Pull out imports & front-matter
  const { body, attributes: { imports: importMap, ...extraAttributes } } = frontMatter(source);

  // Add additional imports
  if (importMap) {
    Object.keys(importMap).forEach((name) => {
      imports.push(formatImport(name, importMap[name]));
    });
  }

  // Disallow passing `defaultProps` if we're passing our own
  if (config.passElementProps) {
    invalidStatics.push('defaultProps');
  }

  // Add additional statics
  const statics = Object.keys(extraAttributes).map((attribute) => {
    if (invalidStatics.indexOf(attribute) !== -1) {
      throw new Error(`You can't supply a \`${attribute}\` static! That name is reserved.`);
    }

    return formatStatic(attribute, extraAttributes[attribute]);
  });

  // Configure Markdown renderer, highlight code snippets, and post-process
  let content = new Markdown()
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
      typographer: config.typographer,
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
    .replace(/\n/g, '\n          ')   // For pretty inspector output 🎉
    .replace(/\n\s+$/g, '');          // Remove the trailing blank line

  // Pass through `elementProps` to tags React knows about (the others are already under our control)
  if (config.passElementProps) {
    content = content.replace(
      /<([^\/][^\s>]*)([^/>\s]*)/g,
      (match, tagName) => {
        return (tagName in ReactDOM)
          ? `${match} {...elementProps['${tagName}']}`
          : match;
      }
    );
  }

  return formatModule(
    config,
    imports.join(''),
    statics.join(''),
    content || '{/* no input given */}'
  );
};
