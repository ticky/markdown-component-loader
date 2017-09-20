import doEscape from './js-escape';

export default (name, value) => `\nMarkdownComponent[${doEscape(name)}] = ${doEscape(value)};\n`;
