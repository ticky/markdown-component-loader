import JSEsc from 'jsesc';

const JSESC_CONFIG = {
  compact: false,
  indent: '  ',
  wrap: true
};

const doEscape = (javascript) => JSEsc(javascript, JSESC_CONFIG);

export default (name, value) => `\nMarkdownComponent[${doEscape(name)}] = ${doEscape(value)};\n`;
