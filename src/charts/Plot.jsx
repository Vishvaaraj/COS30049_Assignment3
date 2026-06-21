// react-plotly.js's default export expects the full `plotly.js` package as
// a peer dependency. We use the much lighter `plotly.js-dist-min` build
// instead, bound via the factory pattern, and import Plot from this file
// everywhere rather than directly from 'react-plotly.js'.
import Plotly from 'plotly.js-cartesian-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';

const Plot = createPlotlyComponent(Plotly);

export default Plot;
