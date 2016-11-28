import DocChomp from 'doc-chomp';

import { name, version } from '../../package.json';

export default ({ passElementProps }, imports, statics, jsx) => {
  let moduleText = DocChomp`
    // Module generated from Markdown by ${name} v${version}
    ${imports}
    MarkdownComponent.propTypes = {
      className: React.PropTypes.string,
      style: React.PropTypes.object`;

  if (passElementProps) {
    moduleText += DocChomp(2)`,
        elementProps: React.PropTypes.object
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