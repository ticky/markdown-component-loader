import React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import Homepage from './Homepage.mdx';

import './index.css';

if (typeof document !== 'undefined') {
  ReactDOM.render(
    <Homepage />,
    document.getElementById('root')
  );
}

export default function(locals, callback) {
  const string = ReactDOMServer.renderToString(<Homepage />);
  console.log(string);
  callback(null, string);
}
