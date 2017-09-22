import { getOptions } from 'loader-utils';

import convert from './convert';

module.exports = function(source) {
  // This loader is deterministic, and will return the same thing for the same inputs!
  this.cacheable && this.cacheable();

  // Load configuration from Webpack
  const config = getOptions(this);

  // Go!
  return convert(source, config);
};
