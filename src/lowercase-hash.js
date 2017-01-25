import hash from 'sha.js';
import anyBase from 'any-base';

export default (content) => (
  anyBase(anyBase.HEX, 'abcdefghijklmnopqrstuvwxyz')(
    hash('sha256')
      .update(content, 'utf-8')
      .digest('hex')
  )
);
