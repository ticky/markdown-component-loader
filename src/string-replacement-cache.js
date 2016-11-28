import hash from 'sha.js';

const noOpReplacer = (thing) => thing;

export default class StringReplacementCache {
  constructor(expression, outputReplacer = noOpReplacer, identityReplacer = noOpReplacer, algorithm = 'sha256') {
    this.expression = expression;
    this.outputReplacer = outputReplacer;
    this.identityReplacer = identityReplacer;
    this.algorithm = algorithm;
    this._cache = {};
  }

  load(body) {
    const processed = body
      .replace(this.expression, (match, ...values) => {
        const identityHash = hash(this.algorithm)
          .update(match, 'utf-8')
          .digest('hex');

        const identity = this.identityReplacer(
            identityHash,
            match,
            ...values
          );

        this._cache[identity] = this.outputReplacer(match, ...values);

        return identity;
      });

    this.loaded = true;
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
    this.loaded = false;
    return processed;
  }
}
