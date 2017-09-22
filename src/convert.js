import frontMatter from 'front-matter';
import walkHtml from 'hastml';
import { decode as decodeEntities } from 'he';
import HighlightJS from 'highlight.js';
import MarkdownIt from './jsx-friendly-markdown-it';

import formatImport from './formatters/import';
import formatModule from './formatters/module';
import formatStatic from './formatters/static';
import formatEscape from './formatters/js-escape';
import StringReplacementCache from './string-replacement-cache';

const ASSIGNMENT_EXPRESSION_PREFIX = 'mclAssignmentBeginI';
const ASSIGNMENT_EXPRESSION_SUFFIX = 'IEnd';
const ASSIGNMENT_EXPRESSION_REGEXP = (
  // Assignment Expression IDs are 55 lower-case characters long
  `${ASSIGNMENT_EXPRESSION_PREFIX}[a-z]{55}${ASSIGNMENT_EXPRESSION_SUFFIX}`
);
const ASSIGNMENT_EXPRESSION_COMMENT_REGEXP = (
  `{/\\*(${ASSIGNMENT_EXPRESSION_REGEXP})\\*/}`
);

const DEFAULT_CONFIGURATION = {
  implicitlyImportReact: true,
  passElementProps: false,
  markdownItPlugins: []
};

export default (source, config) => {
  // First, we handle the configuration and front-matter

  config = Object.assign({}, DEFAULT_CONFIGURATION, config);

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

  // Now, we start processing the markdown itself

  // Hold onto JSX properties and assignment expressions before converting
  let offsetForPropertyReplacements = 0;
  let markdownSansJsxProperties = markdown;

  const jsxPropertyCache = new StringReplacementCache(
    /[\w]+={[^}]*}\s*}?|{\s*\.\.\.[^}]*}/g
  );

  // Find all opening or void HTML tags
  walkHtml(
    markdown,
    (match, tagFragment, offset, string, tag) => {
      // Once we get a tag which is closing
      if (typeof tag.closeIndex === 'number') {
        // Replace any assignment expressions within its opening tag
        const startIndex = tag.openIndex + offsetForPropertyReplacements;
        const endIndex = (
          typeof tag.contentIndex === 'number'
            ? tag.contentIndex
            : tag.closeIndex
        ) + offsetForPropertyReplacements;

        const tagWithNoReplacements = markdownSansJsxProperties.slice(startIndex, endIndex);
        const tagWithPropertyReplacements = jsxPropertyCache.load(tagWithNoReplacements);

        markdownSansJsxProperties = markdownSansJsxProperties.slice(0, startIndex) + tagWithPropertyReplacements + markdownSansJsxProperties.slice(endIndex);

        offsetForPropertyReplacements += tagWithPropertyReplacements.length - tagWithNoReplacements.length;
      }
    }
  );

  // Replace all remaining double-brace assignment expressions with comments
  const assignmentExpressionCache = new StringReplacementCache(
    /{({\s*(?:<.*?>|.*?)\s*})}/g,
    (match, value) => value,
    (identityHash) => `${ASSIGNMENT_EXPRESSION_PREFIX}${identityHash}${ASSIGNMENT_EXPRESSION_SUFFIX}`
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

  // Render markdown to HTML, and replace assignment expressions with comments
  const html = (
    renderer.render(markdownSansAssignments) || '<!-- no input given -->'
  ).replace(
    new RegExp(ASSIGNMENT_EXPRESSION_REGEXP, 'g'),
    '<!--$&-->'
  );

  // Collect all the HTML tags and their positions
  const htmlOffsets = [0];

  walkHtml(
    html,
    (match, tagFragment, offset) => {
      if (tagFragment[0] === '<') {
        htmlOffsets.push(offset);
      } else { // ∴ tagFragment[tagFragment.length - 1] === '>'
        htmlOffsets.push(offset + tagFragment.length);
      }
    }
  );

  // Here, we collect all the positions at which SGML tags begin or end
  let jsx = htmlOffsets
    .map((offset, index, array) => {
      let fragment = html.slice(offset, array[index + 1]);

      // Then we check, for each of them, whether they are a tag or a text node
      if (fragment[0] === '<' || fragment[fragment.length - 1] === '>') {
        // If they're tags, we check whether they're a comment,
        if (fragment.slice(0, 4) === '<!--') {
          // and replace them with JSX style comments
          return `{/*${fragment.slice(4, -3)}*/}`;
        } else {
          // otherwise, we will...
          if (fragment[1] !== '/') {
            // ...replace `class` properties with `className` for React compatibility
            fragment = fragment.replace(/(\sclass)(=)/, '$1Name$2');

            // and, if we've been asked to, add the `elementProps` pass-through.
            if (config.passElementProps) {
              const tagName = fragment.slice(1, fragment.search(/[\s\n]/));

              return fragment.replace(
                /(\s*\/?>)/,
                ` {...elementProps[${formatEscape(tagName)}]}$1`
              );
            }
          }
        }
      } else {
        // If they're not tags, they're a text node. We split on newlines, and...
        return fragment.split(/\n/g).map((line) => {
          // ...wrap string lines containing curly braces

          if (line.match(/[{}]/)) {
            return `{${formatEscape(decodeEntities(line))}}`;
          }

          return line;
        }).join('\n');
      }

      // fall back to returning input
      return fragment;
    })
    // Put it all back together,
    .join('')
    // Restore assignment expressions to their original form
    .replace(
      new RegExp(ASSIGNMENT_EXPRESSION_COMMENT_REGEXP, 'g'),
      '$1'
    )
    // Indent for pretty inspector output 🎉
    .replace(/\n/g, '\n          ')
    // And remove the trailing blank line
    .replace(/\n\s*$/g, '');

  // Unload caches so we've got our values back!
  jsx = jsxPropertyCache.unload(assignmentExpressionCache.unload(jsx));

  return formatModule(
    config,
    imports.join(''),
    statics.join(''),
    jsx
  );
};
