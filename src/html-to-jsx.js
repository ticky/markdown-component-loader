import HTMLtoJSX from 'htmltojsx';

const prepareHtml = (html) => {
  const tree = [];

  return html.replace(
    /(<([a-z\.]+)|\/>|<\/|>)/gi,
    (match, tagFragment, tagName) => {
      // If we have a tag name, this is an opening tag
      if (tagName) {
        tagFragment = tagFragment[0];
      }

      switch (tagFragment) {
        case "<":
          tree.push(tagName);
          break;
        case "/>":
          match = `></${tree.pop()}>`;
          break;
        case ">":
          break;
        case "</":
          tree.pop();
          break;
      }

      return match;
    }
  );
};

export default (html, indent) => {
  html = prepareHtml(html);

  const jsxConverter = new HTMLtoJSX({ createClass: false });

  let jsx = jsxConverter.convert(html);

  // This is a slightly odd hack, but if the jsxConverter returns
  // and has a level of 1, it means it wrapped the contents in
  // <div/> tags because it detected multiple child elements
  if (jsxConverter.level === 1) {
    // Remove the wrapping tags HTMLtoJSX adds, as we use our own!
    jsx = jsx.replace(/(?:^<div>\n\s+|\n\s+<\/div>\n+$)/g, '');
  }

  return jsx
    .replace(/\n\s{8}/g, `\n${indent}`) // Indent for pretty inspector output 🎉
    .replace(/\n\s*$/g, '');            // Remove the trailing blank line
};
