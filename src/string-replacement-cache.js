import hash from 'sha.js';
import anyBase from 'any-base';

const alphabeticHash = ((alphabet) => {
  // we use `hexToBase52` so generated identities are exclusively alphabetic
  // as this causes them to fly under parsers' radars more effectively
  const hexToBase52 = anyBase(anyBase.HEX, alphabet + alphabet.toUpperCase());
  return (content) => hexToBase52(hash('sha256').update(content, 'utf-8').digest('hex'));
})('abcdefghijklmnopqrstuvwxyz');

const noOpReplacer = (thing) => thing;

export default class StringReplacementCache {
  constructor(expression, outputReplacer = noOpReplacer, identityReplacer = noOpReplacer) {
    this.expression = expression;
    this.outputReplacer = outputReplacer;
    this.identityReplacer = identityReplacer;
    this._cache = {};
  }

  load(body) {
    const processed = body
      .replace(this.expression, (match, ...values) => {
        const identityHash = alphabeticHash(match);

        const identity = this.identityReplacer(
            identityHash,
            match,
            ...values
          );

        this._cache[identity] = this.outputReplacer(match, ...values);

        return identity;
      });

    return processed;
  }

  unload(body) {
    let processed = body;

    Object.keys(this._cache).forEach((identity) =>
      processed = processed
        .replace(
          new RegExp(
            identity.replace(
              /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
              '\\$&'
            ),
            'g'
          ),
          this._cache[identity]
        )
    );

    this._cache = {};
    return processed;
  }
}
