import frontMatter from 'front-matter';
import { getLoaderConfig } from 'loader-utils';
import HighlightJS from 'highlight.js';

import formatImport from './formatters/import';
import formatModule from './formatters/module';
import formatStatic from './formatters/static';
import StringReplacementCache from './string-replacement-cache';
import walkHtml from './process-html';

const MarkdownIt = (() => {
  // welcome, to the
  //
  //  d8b                        d8b
  //  ?88                        ?88
  //   88b                        88b
  //   888888b  d888b8b   d8888b  888  d88'
  //   88P `?8bd8P' ?88  d8P' `P  888bd8P'
  //  d88   88P88b  ,88b 88b     d88888b
  // d88'   88b`?88P'`88b`?888P'd88' `?88b,
  //
  // d88888P  d8888b   88bd88b  d8888b
  //    d8P' d8P' ?88  88P' ?8bd8b_,dP
  //  d8P'   88b  d88 d88   88P88b
  // d88888P'`?8888P'd88'   88b`?888P'
  //
  // Replace MarkdownIt's internal HTML regexes with JSX-friendly ones
  const markdownItHtmlRegexes = require('markdown-it/lib/common/html_re');
  Object.keys(markdownItHtmlRegexes).forEach((regexName) => {
    const regex = markdownItHtmlRegexes[regexName];
    // this adds support for the `.` character within tag names
    markdownItHtmlRegexes[regexName] = new RegExp(
      regex.source.replace(
        /\[A\-Za\-z\]\[A\-Za\-z0\-9\\-\]\*/g,
        '[A-Za-z][A-Za-z0-9\\.\\-]*'
      ),
      regex.flags
    );
  });

  return require('markdown-it');
})();

// const ASSIGNMENT_COMMENT_PREFIX = '[mcl-assignment]:';

// const TsXML = {};

// const processChildNodes = (node, passElementProps) => {
//   if (node instanceof TsXML.CommentNode) {
//     const content = node.content.trim();

//     // Don't do anything to replaced assignment comments!
//     if (content.indexOf(ASSIGNMENT_COMMENT_PREFIX) !== 0) {
//       // Replace XML comment nodes with JSX style comment nodes
//       const oldNode = node;

//       node = new TsXML.TextNode();
//       node.content = `{/* ${content} */}`;

//       oldNode.parentNode.replaceChild(oldNode, node);
//     }
//   } else if (node instanceof TsXML.TextNode) {
//     // Wrap strings containing significant whitespace or curly braces
//     if (node.content && node.content.match(/^\s|{|}|\s$/)) {
//       node.content = `{${formatEscape(node.content)}}`;
//     }
//   } else if (node.tagName) {
//     // Pass through `elementProps` to tags
//     if (passElementProps) {
//       node.attrList[`{...elementProps['${node.tagName}']}`] = undefined;
//     }
//   }

//   if (node.childNodes) {
//     node.forEachChildNode((childNode) => {
//       processChildNodes(childNode, passElementProps);
//     });
//   }
// };

const DEFAULT_CONFIGURATION = {
  implicitlyImportReact: true,
  passElementProps: false,
  markdownItPlugins: []
};

module.exports = function(source) {
  // This loader is deterministic, and will
  // return the same thing for the same inputs!
  this.cacheable && this.cacheable();

  // Loads configuration from webpack config as well as loader query string
  const config = Object.assign({}, DEFAULT_CONFIGURATION, getLoaderConfig(this, 'markdownComponentLoader'));

  const invalidStatics = ['propTypes'];
  const imports = [];

  // Import React and PropTypes unless we've been asked otherwise
  if (config.implicitlyImportReact) {
    imports.push(formatImport('React', 'react'));
    imports.push(formatImport('PropTypes', 'prop-types'));
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

  // Hold onto JSX properties and assignment expressions before converting
  const markdownTagIndexes = [];

  // Find all opening or void HTML tags
  walkHtml(
    markdown,
    (match, tagFragment, offset, string, tag) => {
      // Once we get a tag which is closing
      if (typeof tag.closeIndex === 'number') {
        // Push its start and end coordinates into our list
        if (typeof tag.contentIndex === 'number') {
          markdownTagIndexes.push([tag.openIndex, tag.contentIndex]);
        } else {
          markdownTagIndexes.push([tag.openIndex, tag.closeIndex]);
        }
      }
    }
  );

  let offsetForPropertyReplacements = 0;
  let markdownSansJsxProperties = markdown;

  // Then, within each HTML tag we found, replace any assignment expressions
  const jsxPropertyCache = new StringReplacementCache(
    /[\w]+={[^}]*}}?|{\s*\.\.\.[^}]*}/g
  );

  markdownTagIndexes.forEach(([start, end]) => {
    const startIndex = start + offsetForPropertyReplacements;
    const endIndex = end + offsetForPropertyReplacements;

    const tagWithNoReplacements = markdownSansJsxProperties.slice(startIndex, endIndex);
    const tagWithPropertyReplacements = jsxPropertyCache.load(tagWithNoReplacements);

    markdownSansJsxProperties = markdownSansJsxProperties.slice(0, startIndex) + tagWithPropertyReplacements + markdownSansJsxProperties.slice(endIndex);

    offsetForPropertyReplacements += tagWithPropertyReplacements.length - tagWithNoReplacements.length;
  });

  const assignmentExpressionCache = new StringReplacementCache(
    /{({\s*(?:<.*?>|.*?)\s*})}/g,
    (match, value) => value
  );

  const markdownSansAssignments = assignmentExpressionCache.load(markdownSansJsxProperties);

  // Configure Markdown renderer, highlight code snippets, and post-process
  let renderer = new MarkdownIt()
    .configure('commonmark')
    .enable(['smartquotes'])
    .set({
      // We need explicit line breaks
      breaks: true,
      typographer: config.typographer,
      highlight(code, languageHint) {
        let highlightedContent;

        HighlightJS.configure({ tabReplace: '  ' });

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

        return highlightedContent
          .replace(/\n/g, '<br />');
      }
    });

  // Load MarkdownIt plugins
  if (config.markdownItPlugins && Array.isArray(config.markdownItPlugins)) {
    renderer = config.markdownItPlugins
      .reduce(
        (markdownRenderer, pluginDefinition) => (
          markdownRenderer.use(...(
            Array.isArray(pluginDefinition)
              ? pluginDefinition
              : [pluginDefinition]
          ))
        ),
        renderer
      );
  }

  const html = renderer.render(markdownSansAssignments) || '<!-- no input given -->';

  // TODO: Walk over each element, replacing HTMLisms with JSXisms
  // (SEE commented out `processChildNodes`)

  // Unload caches so we've got our values back!
  const jsx = jsxPropertyCache.unload(assignmentExpressionCache.unload(
    html
      .replace(/\n/g, `\n        `) // Indent for pretty inspector output 🎉
      .replace(/\n\s*$/g, '')        // Remove the trailing blank line
  ));

  return formatModule(
    config,
    imports.join(''),
    statics.join(''),
    jsx
  );
};
