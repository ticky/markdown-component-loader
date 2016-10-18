/* global jest, describe, expect, it */
const markdownComponentLoader = require('./index');
const React = require('react');
const Babel = require('babel-core');
const renderer = require('react-test-renderer');

const MARKDOWN_COMPONENT_FIXTURES = require('./__fixtures__/components').default;

jest.mock('foo');
jest.mock('another');

// Call out to Babel and supply the shared configuration
const TRANSFORM_WITH_BABEL = (code) => Babel.transform(code, require('./package.json').babel).code;

// Requires the module generated via transforming with Babel,
// makes a simple attempt to sandbox, but either way this _is_
// still calling `eval`, friends.
const REQUIRE_VIA_BABEL = (code) => (function() {
  const exports = {};
  eval(TRANSFORM_WITH_BABEL(code)); // eslint-disable-line no-eval
  return exports;
})();

// A fake Webpack context, supplying `cacheable` so the loader
// can still call that from this envrionment.
const FAKE_WEBPACK_CONTEXT = { cacheable() {} };

// The tests proper
describe('Webpack loader', () => {
  it('returns an expected React module', () => {
    MARKDOWN_COMPONENT_FIXTURES.forEach((component) => {
      expect(markdownComponentLoader.call(FAKE_WEBPACK_CONTEXT, component)).toMatchSnapshot();
    });
  });

  it('compiles with Babel without issue', () => {
    MARKDOWN_COMPONENT_FIXTURES.forEach((component) => {
      expect(TRANSFORM_WITH_BABEL(markdownComponentLoader.call(FAKE_WEBPACK_CONTEXT, component))).toMatchSnapshot();
    });
  });

  it('renders as expected within React', () => {
    MARKDOWN_COMPONENT_FIXTURES.forEach((component) => {
      const Component = REQUIRE_VIA_BABEL(markdownComponentLoader.call(FAKE_WEBPACK_CONTEXT, component)).default;

      const tree = renderer.create(<Component />);

      expect(tree.toJSON()).toMatchSnapshot();
    });
  });
});
