import DocChomp from 'doc-chomp';
import formatImport from './import';
import formatStatic from './static';

const formatCollection = (formatter, collection = {}) => (
  Object.keys(collection).map(
    (name) => formatter(name, collection[name])
  ).join('')
);

export default (imports, statics, jsxContent, { passElementProps }) => {
  let moduleText = DocChomp`
    // Module generated from Markdown by Markdown Component Loader v${__VERSION__}
    ${formatCollection(formatImport, imports)}
    MarkdownComponent.propTypes = {
      className: PropTypes.string,
      style: PropTypes.object`;

  if (passElementProps) {
    moduleText += DocChomp(2)`,
        elementProps: PropTypes.object
      };

      MarkdownComponent.defaultProps = {
        elementProps: {}`;
  }

  moduleText += DocChomp(0)`
    
    };
    ${formatCollection(formatStatic, statics)}
    function MarkdownComponent(props) {
      const { className, style${passElementProps ? ', elementProps' : ''} } = props;

      return (
        <div className={className} style={style}>
          ${jsxContent}
        </div>
      );
    };

    export default MarkdownComponent;
    `;

  return moduleText;
};