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
  treemap.makeCanvas().buildTreemap().drawTiles().paintColors().makeTooltip().handleEvents();
} )
.catch( error => { throw new Error( error ) } );

// The Treemap class. Gives the methods to build the Treemap Diagram.
class Treemap {

  constructor ( data ) {
    // Sets up sizes.
    this.chartWidth   = 1100;
    this.chartHeight  = 700;
    this.margin       = { top: 60, bottom: 60, left: 60, right: 60 };
    this.canvasWidth  = this.chartWidth  - this.margin.left - this.margin.right;
    this.canvasHeight = this.chartHeight - this.margin.top  - this.margin.bottom;

    // Saves the data.
    this.ksPledges    = data[0];
    this.mvSales      = data[1];
    this.vgSales      = data[2];

    // Chains methods after instantiating.
    this.and          = this;
  }

  // Creates the canvas for the chart.
  makeCanvas ( ) {
    this.chart = d3.select( '#chart' )
      .attr( 'viewBox' , `0 0 ${this.chartWidth} ${this.chartHeight}` )
      .attr( 'preserveAspectRatio', 'xMidYMid meet' )
    this.canvas = this.chart.append( 'g' )
      .attr( 'transform', `translate( ${this.margin.left}, ${this.margin.top} )` );

    return this;
  }

  buildTreemap ( ) {
    const treemap = d3.treemap( )
      .tile( d3.treemapResquarify )
      .size( [ this.canvasWidth, this.canvasHeight ] )
      .round( true )
      .paddingInner( 2 );

    const root = d3.hierarchy( this.ksPledges )
    .eachBefore( d => { d.data.id = ( d.parent ? d.parent.data.id + '.' : '' ) + d.data.name; } )
    .sum( d => d.value )
    .sort( ( a, b ) => b.height - a.height || b.value - a.value );

    this.treeLeaves = treemap( root ).leaves( );

    return this;
  }

  drawTiles ( ) {
    const tiles = this.canvas.selectAll( 'g' )
      .data( this.treeLeaves )
      .enter( )
      .append( 'g' )
        .attr("transform", d => `translate( ${d.x0}, ${d.y0} )` );

    this.tile = tiles.append( 'rect' )
      .attr( 'id'           , ( d, i ) => i )
      .attr( 'class'        , 'tile' )
      .attr( 'data-name'    , d => d.data.name )
      .attr( 'data-category', d => d.data.category )
      .attr( 'data-value'   , d => d.data.value )
      .attr( 'width'        , d => d.x1 - d.x0 )
      .attr( 'height'       , d => d.y1 - d.y0 );

    const mask = tiles.append( 'clipPath' )
      .attr( 'id', ( d, i ) => `clipPath-${i}` )
      .append( 'use' )
      .attr( 'xlink:href', ( d, i ) => `#${i}` );

    const tileText = tiles.append( 'text' )
      .attr( 'clip-path', ( d, i ) => `url( "#clipPath-${i}" )` )
      .attr( 'class', 'tile-text' )
      .attr( 'x', 5 )
      .attr( 'y', 15 )
      .text( d => d.data.name );

    return this;
  }

  paintColors ( ) {
    const setColors = d3.scaleOrdinal( [
      "#316395","#dc3912","#ff9900","#109618","#990099","#0099c6","#8b0707",
      "#3b3eac","#b82e2e","#994499","#22aa99","#aaaa11","#6633cc","#e67300",
    ] );
    this.tile.attr( 'fill', d => setColors( d.data.category ) );

    return this;
  }

  // Creates the tooltip to display when hover each tile.
  makeTooltip ( ) {
    this.tip = d3.tip( )
      .attr( 'id', 'tooltip' )
      .html( d => d );
    this.canvas.call( this.tip );
  
    return this;
  }

  // Sets up the event handlers for each tile.
  handleEvents ( ) {
    let _self = this;
    this.tile
    .on( 'mouseover', function ( d,i ) {
      const dataValue = d3.select( this ).attr( 'data-value' );
      const tipText = `
        <h4 class="title">
          TITLE
          <hr />
        </h4>
        <div class="desc">
          <p>
            DESC
          </p>
        </div>
      `;
      const browserWidth = document.querySelector( 'html' ).clientWidth;
      _self.tip.attr( 'data-value', dataValue )
               .direction( d3.event.x < browserWidth / 2 ? 'e' : 'w' )
               .offset( d3.event.x < browserWidth / 2 ? [ 0, 50 ] : [ 0, -50 ] )
               .show( tipText );
    } )
    .on( 'mouseout', function ( d,i ) {
      _self.tip.hide( );
    } );
  }

}