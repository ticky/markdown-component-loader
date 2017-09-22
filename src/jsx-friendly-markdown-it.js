// welcome, to the
//
//  d8b                        d8b
//  ?88                        ?88
//   88b                        88b
//   888888b  d888b8b   d8888b  888  d88'
//   88P `?8bd8P' ?88  d8P' `P  888bd8P'
//  d88   88P88b  ,88b 88b     d88888b
// d88'   88b`?88P'`88b`?888P'd88' `?88b,
//
// d88888P  d8888b   88bd88b  d8888b
//    d8P' d8P' ?88  88P' ?8bd8b_,dP
//  d8P'   88b  d88 d88   88P88b
// d88888P'`?8888P'd88'   88b`?888P'
//
// Replace MarkdownIt's internal HTML regexes with JSX-friendly ones
const markdownItHtmlRegexes = require('markdown-it/lib/common/html_re');
Object.keys(markdownItHtmlRegexes).forEach((regexName) => {
  const regex = markdownItHtmlRegexes[regexName];
  // this adds support for the `.` character within tag names
  markdownItHtmlRegexes[regexName] = new RegExp(
    regex.source.replace(
      /\[A-Za-z\]\[A-Za-z0-9\\-\]\*/g,
      '[A-Za-z][A-Za-z0-9\\.\\-]*'
    ),
    regex.flags
  );
});

export default require('markdown-it');
