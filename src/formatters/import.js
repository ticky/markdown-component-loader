import doEscape from './js-escape';

export default (name, source) => `import ${name} from ${doEscape(source)};\n`;
