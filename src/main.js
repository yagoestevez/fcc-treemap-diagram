////////////////////////////////////////////////////////////////////////////////////////////////////
//                        by Yago Estévez. https://twitter.com/yagoestevez                        //
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

// Required for Webpack.
require( "babel-runtime/regenerator" );
require( './index.html'              );
require( './main.scss'               );

// API endpoints.
const API_URLs = [
  'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/kickstarter-funding-data.json',
  'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/movie-data.json',
  'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/video-game-sales-data.json'
];

// Data is fetched from the API or throws an error. If everything OK,
// the Treemap Diagram is built using the data from the JSON docs.
Promise.all( API_URLs.map( url =>
  fetch( url ).then( res => res.json( ) )
) ).then( data => {
  // Hides preloader.
  document.getElementById( 'preloader' ).classList.add( 'hidden' ); 
  // Builds the Treemap Diagram.
  const treemap = new Treemap( data );
  treemap.makeCanvas().buildTreemap().drawTiles();
} )
.catch( error => { throw new Error( error ) } );

// The Treemap class. Gives the methods to build the Treemap Diagram.
class Treemap {

  constructor ( data ) {
    // Sets up sizes.
    this.chartWidth  = 1100;
    this.chartHeight = 700;

    // Saves the data.
    this.ksPledges   = data[0];
    this.mvSales     = data[1];
    this.vgSales     = data[2];

    // Chains methods after instantiating.
    this.and         = this;
  }

  // Creates the canvas for the chart.
  makeCanvas ( ) {
    this.chart = d3.select( '#chart' )
      .attr( 'viewBox' , `0 0 ${this.chartWidth} ${this.chartHeight}` )
      .attr( 'preserveAspectRatio', 'xMidYMid meet' )
      .append( 'g' );

    return this;
  }

  buildTreemap ( ) {
    const treemap = d3.treemap( )
      .tile( d3.treemapResquarify )
      .size( [ this.chartWidth, this.chartHeight ] )
      .round( true )
      .paddingInner( 1 );

    const root = d3.hierarchy( this.ksPledges )
    .eachBefore( d => { d.data.id = ( d.parent ? d.parent.data.id + '.' : '' ) + d.data.name; } )
    .sum( d => d.value )
    .sort( ( a, b ) => b.height - a.height || b.value - a.value );

    this.treeLeaves = treemap( root ).leaves( );

    return this;
  }

  drawTiles ( ) {
    const tiles = this.chart.selectAll( 'g' )
      .data( this.treeLeaves )
      .enter( )
      .append( 'g' )
        .attr("transform", d => `translate( ${d.x0}, ${d.y0} )` );

    this.tile = tiles.append( 'rect' )
      .attr( 'class'        , 'tile' )
      .attr( 'data-name'    , d => d.data.name )
      .attr( 'data-category', d => d.data.category )
      .attr( 'data-value'   , d => d.data.value )
      .attr( 'id'           , d => d.data.id )
      .attr( 'width'        , d => d.x1 - d.x0 )
      .attr( 'height'       , d => d.y1 - d.y0 );

    const tileText = tiles.append( 'text' )
      .attr( 'class', 'tile-text' )
      .attr( 'x', 5 )
      .attr( 'y', 25 )
      // .attr( 'x', d => d.x0 + 5 )
      // .attr( 'y', d => d.y0 + (d.y1-d.y0) / 2 )
      .text( d => d.data.name )

    return this;
  }

}