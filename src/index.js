import frontMatter from 'front-matter';
import { getLoaderConfig } from 'loader-utils';
import HighlightJS from 'highlight.js';
import MarkdownIt from 'markdown-it';
import { DOM as ReactDOM } from 'react';

import formatImport from './formatters/import';
import formatModule from './formatters/module';
import formatStatic from './formatters/static';
import hexToAlpha from './hex-to-alpha';
import htmlToJsx from './html-to-jsx';
import StringReplacementCache from './string-replacement-cache';

const DEFAULT_CONFIGURATION = {
  implicitlyImportReact: true,
  passElementProps: false
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
  const { body: markdown, attributes: { imports: importMap, ...staticAttributes } } = frontMatter(source);

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
  const statics = Object.keys(staticAttributes).map((attribute) => {
    if (invalidStatics.indexOf(attribute) !== -1) {
      throw new Error(`You can't supply a \`${attribute}\` static! That name is reserved.`);
    }

    return formatStatic(attribute, staticAttributes[attribute]);
  });

  // Hold onto assignment expressions before passing to htmlToJsx
  //
  // Object style properties get special treatment here as HTMLtoJSX
  // will ignore them because they're not strings - what fun!
  //
  // p.s. We use hexToAlpha in these so that `highlight.js` doesn't
  // try to highlight sha256es which begin with numbers 🙄
  const stylePropertyCache = new StringReplacementCache(/style={{[^}]*}}/g, undefined, (identity) => hexToAlpha(identity));
  const assignmentExpressionCache = new StringReplacementCache(
    /{({\s*(?:<.*?>|.*?)\s*})}/g,
    (match, value) => value,
    (identity) => hexToAlpha(identity)
  );

  const markdownSansAssignments = assignmentExpressionCache.load(stylePropertyCache.load(markdown));

  // Configure Markdown renderer, highlight code snippets, and post-process
  const html = new MarkdownIt()
    .configure('commonmark')
    .enable([
      'smartquotes'
    ])
    .set({
      // We need explicit line breaks
      breaks: true,
      typographer: config.typographer,
      highlight(code, languageHint) {
        let highlightedContent;

        HighlightJS.configure({
          useBR: true,
          tabReplace: '  '
        });

        // Try highlighting with a given hint
        if (languageHint && HighlightJS.getLanguage(languageHint)) {
          try {
            highlightedContent = HighlightJS.highlight(languageHint, code).value;
          } catch (err) {} // eslint-disable-line no-empty
        }

        // Highlight without a hint
        if (!highlightedContent) {
          try {
            highlightedContent = HighlightJS.highlightAuto(code).value;
          } catch (err) {} // eslint-disable-line no-empty
        }

        return HighlightJS.fixMarkup(highlightedContent);
      }
    })
    .render(markdownSansAssignments);


  let jsx = htmlToJsx(
    html || '<!-- no input given -->',
    '          ' // indentation
  );

  // Unload caches so we've got our values back!
  jsx = stylePropertyCache.unload(assignmentExpressionCache.unload(jsx));

  // Pass through `elementProps` to tags React knows about (the others are already under our control)
  if (config.passElementProps) {
    jsx = jsx.replace(
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
    jsx
  );
};
