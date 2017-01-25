export default (html, callback) => {
  const tree = [];

  return html.replace(
    /(<\/?([a-z][a-z0-9\.\-]*)|\/>|>)/gi,
    (match, tagFragment, tagName) => {
      // If we have a tag name, this is an opening tag
      if (tagName) {
        tagFragment = tagFragment.replace(tagName, '');
      }

      let thisTag;
      const lastTag = tree[tree.length - 1] || {};
      let shouldPopTree = false;

      switch (tagFragment) {
        case '<':
          thisTag = { tagName, state: 'open' };
          tree.push(thisTag);
          break;

        case '/>':
          shouldPopTree = true;
          break;

        case '>':
          if (lastTag.state === 'open') {
            lastTag.state = 'content';
          }
          if (lastTag.state === 'closing') {
            shouldPopTree = true;
          }
          break;

        case '</':
          lastTag.state = 'closing';
          break;
      }

      const returnValue = callback(match, tagFragment, thisTag || lastTag, tree);

      if (shouldPopTree) {
        tree.pop();
      }

      return returnValue;
    }
  );
};
