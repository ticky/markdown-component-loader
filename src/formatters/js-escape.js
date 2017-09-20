import JSEsc from 'jsesc';

const JSESC_CONFIG = {
  compact: false,
  indent: '  ',
  wrap: true
};

export default (javascript) => JSEsc(javascript, JSESC_CONFIG);
