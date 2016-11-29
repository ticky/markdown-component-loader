/* global jest, describe, expect, it */
import markdownComponentLoader from './index';
import React from 'react';
import { transform as BabelTransform } from 'babel-core';
import renderer from 'react-test-renderer';
import { encode as encodeQuery } from 'query-params';
import DocChomp from 'doc-chomp';

import MARKDOWN_COMPONENT_FIXTURES from './__fixtures__/components';
const BOOL_FIXTURES = [undefined, true, false];

jest.mock('foo');

// Call out to Babel and supply the shared configuration
const TRANSFORM_WITH_BABEL = (code) => BabelTransform(code, require('../package.json').babel).code;

// Requires the module generated via transforming with Babel,
// makes a simple attempt to sandbox, but either way this _is_
// still calling `eval`, friends.
const REQUIRE_STRING_MODULE = (code) => (
  // We have to explicitly expose React to the `eval` context otherwise it's hidden
  function(React) { // eslint-disable-line no-unused-vars
    const exports = {};
    eval(code); // eslint-disable-line no-eval
    return exports;
  }
)(React);

// A fake Webpack context, supplying `cacheable` so the loader
// can still call that from this envrionment.
const FAKE_WEBPACK_CONTEXT = { cacheable: jest.fn() };

const RUN_WITH_CONTEXT = (context) => (() => {
  MARKDOWN_COMPONENT_FIXTURES.forEach((component, index) => {
    describe(`for component example ${index}`, () => {
      const transformedComponent = markdownComponentLoader.call(context, component);
      const transpiledComponent = TRANSFORM_WITH_BABEL(transformedComponent);

      it('returns an expected React module', () => {
        expect(transformedComponent).toMatchSnapshot();
        expect(context.cacheable).toHaveBeenCalled();
      });

      it('compiles with Babel without issue', () => {
        expect(transpiledComponent).toMatchSnapshot();
      });

      it('renders as expected within React', () => {
        const Component = REQUIRE_STRING_MODULE(transpiledComponent).default;

        const tree = renderer.create(<Component />);

        expect(tree.toJSON()).toMatchSnapshot();
        expect(Object.keys(Component)).toMatchSnapshot();
      });
    });
  });
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

describe('Webpack loader', () => {
  BOOL_FIXTURES.forEach((implicitlyImportReact) => {
    BOOL_FIXTURES.forEach((passElementProps) => {
      PLUGIN_FIXTURES.forEach((markdownItPlugins) => {
        const config = { implicitlyImportReact, passElementProps };

        if (markdownItPlugins) {
          config.markdownItPlugins = markdownItPlugins;
        }

        describe(
          `with a webpack config object of \`${JSON.stringify(config)}\``,
          RUN_WITH_CONTEXT(Object.assign({}, FAKE_WEBPACK_CONTEXT, { options: { markdownComponentLoader: config } }))
        );

        // `markdownItPlugins` can't be passed via query because they're JavaScript!
        if (!config.hasOwnProperty('markdownItPlugins')) {
          const query = `?${encodeQuery(config)}`;

          describe(
            `with a loader query of \`${query}\``,
            RUN_WITH_CONTEXT(Object.assign({}, FAKE_WEBPACK_CONTEXT, { options: {}, query }))
          );
        }
      });
    });
  });

  it('throws if a reserved static is specified', () => {
    expect(() => markdownComponentLoader.call(
      Object.assign(
        {},
        FAKE_WEBPACK_CONTEXT,
        { options: { markdownComponentLoader: {} } }
      ),
      DocChomp`
        ---
        propTypes: this is reserved so it should throw!
        ---
        # This should throw!
      `
    )).toThrowError(`You can't supply a \`propTypes\` static! That name is reserved.`);
  });
});
