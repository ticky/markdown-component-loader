import SHA256 from 'sha.js/sha256';
import anyBase from 'any-base';

export default (content) => (
  anyBase(anyBase.HEX, 'abcdefghijklmnopqrstuvwxyz')(
    new SHA256()
      .update(content, 'utf-8')
      .digest('hex')
  )
);
