import DocChomp from 'doc-chomp';

export default ({ passElementProps }, imports, statics, jsx) => {
  let moduleText = DocChomp`
    // Module generated from Markdown by Markdown Component Loader v${__VERSION__}
    ${imports}
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
    ${statics}
    function MarkdownComponent(props) {
      const {className, style${passElementProps ? ', elementProps' : ''}} = props;

      return (
        <div className={className} style={style}>
          ${jsx}
        </div>
      );
    };

    export default MarkdownComponent;
    `;

  return moduleText;
};