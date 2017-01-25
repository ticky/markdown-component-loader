import lowercaseHash from './lowercase-hash';

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
        const identityHash = lowercaseHash(match);

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
