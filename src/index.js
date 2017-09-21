import { getLoaderConfig } from 'loader-utils';

import convert from './convert';

const DEFAULT_CONFIGURATION = {
  implicitlyImportReact: true,
  passElementProps: false,
  markdownItPlugins: []
};

module.exports = function(source) {
  // This loader is deterministic, and will return the same thing for the same inputs!
  this.cacheable && this.cacheable();

  // Loads configuration from Webpack
  const config = Object.assign({}, DEFAULT_CONFIGURATION, getLoaderConfig(this, 'markdownComponentLoader'));

  return convert(source, config);
};
