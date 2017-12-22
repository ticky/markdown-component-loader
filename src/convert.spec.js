/* global __dirname, jest, describe, expect, it */
import convert from './convert';
import React from 'react';
import PropTypes from 'prop-types';
import { transform as BabelTransform } from 'babel-core';
import renderer from 'react-test-renderer';
import DocChomp from 'doc-chomp';

import path from 'path';
import { readFileSync } from 'fs';

import MARKDOWN_COMPONENT_FIXTURES from './__fixtures__/components';
const BOOL_FIXTURES = [undefined, true, false];

jest.mock('foo');
jest.mock('./images/logo.svg');

// Call out to Babel and supply the shared configuration
const TRANSFORM_WITH_BABEL = (code) => (
  BabelTransform(code, require('../package.json').babel).code
);

// Requires the module generated via transforming with Babel,
// makes a simple attempt to sandbox, but either way this _is_
// still calling `eval`, friends.
const REQUIRE_STRING_MODULE = (code) => (
  // We have to explicitly expose React & PropTypes to the `eval`
  // context, otherwise they're unavailable when using implicit imports
  function(React, PropTypes) { // eslint-disable-line no-unused-vars
    const exports = {};
    eval(code); // eslint-disable-line no-eval
    return exports;
  }
)(React, PropTypes);

const SLICE_OUT_PREAMBLE = (code) => {
  // Trim the first line, as this is a version comment
  const preambleStartOffset = code.indexOf('\n');
  // Take until the function itself begins
  const preambleEndOffset = code.indexOf('function MarkdownComponent(props) {');

  return code.slice(preambleStartOffset, preambleEndOffset);
};

// Runs a single fixture, checking Markdown Component Loader successfully executes,
// that the React module matches our expectations, that Babel is happy with it, and
// that it renders as expected.
const RUN_ONE_FIXTURE = (component, configuration) => {
  let loadedComponent;
  let transformedComponent;

  it('executes without errors', () => {
    expect(() => loadedComponent = convert(component, configuration)).not.toThrowError();
  });

  it('has the expected preamble', () => {
    expect(SLICE_OUT_PREAMBLE(loadedComponent)).toMatchSnapshot();
  });

  it('transforms with Babel without issue', () => {
    expect(() => transformedComponent = TRANSFORM_WITH_BABEL(loadedComponent)).not.toThrowError();
  });

  it('renders as expected within React', () => {
    let Component;

    expect(() => Component = REQUIRE_STRING_MODULE(transformedComponent).default).not.toThrowError();

    expect(Object.keys(Component).reduce((acc, key) => {
      acc[key] = Component[key];
      return acc;
    }, {})).toMatchSnapshot();

    const tree = renderer.create(<Component />);

    expect(tree.toJSON()).toMatchSnapshot();
  });
};

// Runs all fixtures given a particular configuration
const RUN_FIXTURES_WITH_CONFIG = (config) => (() => {
  MARKDOWN_COMPONENT_FIXTURES.forEach(
    (component, index) => (
      describe(`for component example ${index + 1}`, () => {
        RUN_ONE_FIXTURE(component, config);
      })
    )
  );
});

const PLUGIN_FIXTURES = [
  undefined,          // test for default fallback
  "somenonsensevalue" // test resilience
];

PLUGIN_FIXTURES.push([
  require("markdown-it-anchor")
]);

PLUGIN_FIXTURES.push([
  require("markdown-it-anchor"),
  [require("markdown-it-table-of-contents"), { containerClass: 'my-container-class' }]
]);

PLUGIN_FIXTURES.push([
  path.relative(__dirname, require.resolve("markdown-it-anchor"))
]);

// And now, the party can start!
describe('convert', () => {
  BOOL_FIXTURES.forEach((implicitlyImportReact) => {
    BOOL_FIXTURES.forEach((passElementProps) => {
      PLUGIN_FIXTURES.forEach((markdownItPlugins) => {
        const config = { implicitlyImportReact, passElementProps };

        if (markdownItPlugins) {
          config.markdownItPlugins = markdownItPlugins;
        }

        describe(
          `with a config object of \`${JSON.stringify(config)}\``,
          RUN_FIXTURES_WITH_CONFIG(config)
        );
      });
    });
  });

  describe(`doesn't trigger any kind of comment highlighting in highlights`, () => {
    RUN_ONE_FIXTURE(
      DocChomp`
        \`\`\`markdown
        {{ typeof props }}
        \`\`\`
      `
    );
  });

  describe('handles interpolations within sentences which should be quoted', () => {
    RUN_ONE_FIXTURE(
      DocChomp`
        foo {{Infinity}} { bar {{Infinity}} } {}
      `
    );
  });

  describe('gracefully handles loose greater-than and less-than symbols', () => {
    RUN_ONE_FIXTURE(
      DocChomp`
        > foo bar!
        >
        > baz!

        pizza < waffles

        food>sleep

        <asdfrafghsgu
      `
    );
  });

  describe(`isn't confused by unmatched closing tags`, () => {
    let loadedComponent;

    it('when transforming', () => {
      expect(() => loadedComponent = convert(
        DocChomp`
          asdf

          </div>

          ghjkl
        `
      )).not.toThrowError();
    });

    it('has the expected preamble', () => {
      expect(SLICE_OUT_PREAMBLE(loadedComponent)).toMatchSnapshot();
    });

    it('has the expected rendered body', () => {
      const openDiv = '<div className={className}';
      const openDivOffset = loadedComponent.indexOf(openDiv);
      const closeDiv = '</div>\n  );';
      const closeDivOffset = loadedComponent.indexOf(closeDiv) + 6;

      expect(loadedComponent.slice(openDivOffset, closeDivOffset)).toMatchSnapshot();
    });

    it('throws an error when passed to Babel', () => {
      expect(() => TRANSFORM_WITH_BABEL(loadedComponent)).toThrowErrorMatchingSnapshot();
    });
  });

  describe('happily renders its own homepage', () => {
    RUN_ONE_FIXTURE(
      readFileSync(
        path.join(__dirname, '../app/Homepage.mdx'),
        { encoding: 'utf-8' }
      ),
      {
        markdownItPlugins: [
          [
            require('markdown-it-anchor'),
            {
              permalink: true,
              permalinkBefore: true,
              permalinkSymbol: '🔗'
            }
          ]
        ]
      }
    );
  });

  it('throws if a reserved static is specified', () => {
    expect(() => convert(
      DocChomp`
        ---
        propTypes: this is reserved so it should throw!
        ---
        # This should throw!
      `
    )).toThrowErrorMatchingSnapshot();
  });
});
