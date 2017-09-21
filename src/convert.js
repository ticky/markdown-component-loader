import frontMatter from 'front-matter';
import walkHtml from 'hastml';
import HighlightJS from 'highlight.js';
import MarkdownIt from './jsx-friendly-markdown-it';

import formatImport from './formatters/import';
import formatModule from './formatters/module';
import formatStatic from './formatters/static';
import formatEscape from './formatters/js-escape';
import StringReplacementCache from './string-replacement-cache';

const ASSIGNMENT_COMMENT_PREFIX = '[mcl-assignment]:';

const DEFAULT_CONFIGURATION = {
  implicitlyImportReact: true,
  passElementProps: false,
  markdownItPlugins: []
};

export default (source, config) => {
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
    /[\w]+={[^}]*}\s*}?|{\s*\.\.\.[^}]*}/g
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
    (match, value) => value,
    (identityHash) => `<!--${ASSIGNMENT_COMMENT_PREFIX}${identityHash}-->`
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
          .replace(/\n/g, '<br />')
          .replace(/&lt;(!--\[mcl-assignment\]:[a-z]+--)&gt;/g, '<$1>');
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

  const html = (renderer.render(markdownSansAssignments) || '<!-- no input given -->');

  // Collect all the HTML tags and their positions
  const htmlTags = [];

  walkHtml(
    html,
    (match, tagFragment, offset, string, tag) => {
      if (htmlTags.indexOf(tag) === -1) {
        htmlTags.push(tag);
      }
    }
  );

  const htmlOffsets = [0];

  htmlTags.forEach((tag) => {
    const { state, openIndex, contentIndex, closeIndex, closingIndex } = tag;

    if (typeof openIndex === 'number') {
      htmlOffsets.push(openIndex);
    }

    if (typeof contentIndex === 'number') {
      // contentIndex + 1 because contentIndex if the offset of '>'
      htmlOffsets.push(contentIndex + 1);
    }

    if (typeof closingIndex === 'number') {
      htmlOffsets.push(closingIndex);
    }

    if (typeof closeIndex === 'number') {
      if (state === 'open') {
        if (html[closeIndex] === '-') {
          htmlOffsets.push(closeIndex + 3);
        } else {
          htmlOffsets.push(closeIndex + 2);
        }
      } else {
        htmlOffsets.push(closeIndex + 1);
      }
    }
  });

  let jsx = htmlOffsets
    .sort((first, second) => first - second)
    .filter((number, index, array) => !index || number !== array[index - 1])
    .reduce(
      (acc, item, index, array) => (
        acc.concat([html.slice(item, array[index + 1])])
      ),
      []
    )
    .map((fragment) => {
      if (fragment[0] === '<' || fragment[fragment.length - 1] === '>') {
        // this is a tag

        if (fragment.slice(0, 4) === '<!--') {
          // yay it's a comment!
          // Don't do anything to replaced assignment comments!
          if (fragment.slice(4, 4 + ASSIGNMENT_COMMENT_PREFIX.length) !== ASSIGNMENT_COMMENT_PREFIX) {
            // Replace XML comment nodes with JSX style comment nodes
            return `{/*${fragment.slice(4, -3)}*/}`;
          }
        } else {
          if (fragment[1] !== '/') {
            // Replace `class` with `className`
            fragment = fragment.replace(/(\sclass)(=)/, '$1Name$2');

            // Pass through `elementProps` to tags
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
        // this is a text node, let's wrap stuff on newlines
        return fragment.split(/\n/g).map((line) => (
          // Wrap string lines containing significant whitespace or curly braces
          line.match(/^\s|{|}|\s$/) ? `{${formatEscape(line)}}` : line
        )).join('\n');
      }

      // fall back to returning input
      return fragment;
    })
    .join('')
    .replace(/\n/g, '\n          ') // Indent for pretty inspector output 🎉
    .replace(/\n\s*$/g, '');        // Remove the trailing blank line;

  // Unload caches so we've got our values back!
  jsx = jsxPropertyCache.unload(assignmentExpressionCache.unload(jsx));

  return formatModule(
    config,
    imports.join(''),
    statics.join(''),
    jsx
  );
};
