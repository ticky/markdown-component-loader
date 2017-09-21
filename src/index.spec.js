/* global jest, describe, expect, it */
import DocChomp from 'doc-chomp';

describe('Webpack loader', () => {
  let mockConvert = jest.fn();
  jest.mock('./convert', () => mockConvert);
  let markdownComponentLoader = require('./index');

  // A fake Webpack context, supplying `cacheable` so the loader
  // can still call that from this envrionment.
  const FAKE_WEBPACK_CONTEXT = {
    cacheable: jest.fn()
  };

  beforeEach(() => {
    mockConvert.mockReset();
    FAKE_WEBPACK_CONTEXT.cacheable.mockReset();
  });

  it('calls through to convert function', () => {
    markdownComponentLoader.call(
      Object.assign(
        {},
        FAKE_WEBPACK_CONTEXT,
        {
          options: {
            markdownComponentLoader: {

            }
          }
        }
      ),
      DocChomp`
        ---
        ---
        # Fun test times!
      `
    );

    expect(FAKE_WEBPACK_CONTEXT.cacheable).toHaveBeenCalled();
    expect(mockConvert).toHaveBeenCalled();
    expect(mockConvert.mock.calls).toMatchSnapshot();
  });

  it('passes custom options through', () => {
    markdownComponentLoader.call(
      Object.assign(
        {},
        FAKE_WEBPACK_CONTEXT,
        {
          options: {
            markdownComponentLoader: {
              passElementProps: true,
              markdownItPlugins: [
                () => 'markdown-it-meow',
                () => 'markdown-it-purr'
              ]
            }
          }
        }
      ),
      DocChomp`
        ---
        ---
        # Fun test times!
      `
    );

    expect(FAKE_WEBPACK_CONTEXT.cacheable).toHaveBeenCalled();
    expect(mockConvert).toHaveBeenCalled();
    expect(mockConvert.mock.calls).toMatchSnapshot();
  });
});
