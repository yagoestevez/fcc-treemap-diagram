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
  treemap
    .makeCanvas( ).buildTreemap( ).drawTiles( ).paintColors( )
    .makeTooltip( ).handleEvents( ).and.makeLegend( );

  // Handle UI's click events.
  handleMenu( treemap );
} )
.catch( error => { throw new Error( error ) } );

// The Treemap class. Gives the methods to build the Treemap Diagram.
class Treemap {

  constructor ( data ) {
    // Sets up sizes.
    this.chartWidth   = 980;
    this.chartHeight  = 680;
    this.margin       = { top: 10, bottom: 100, left: 10, right: 10 };
    this.canvasWidth  = this.chartWidth  - this.margin.left - this.margin.right;
    this.canvasHeight = this.chartHeight - this.margin.top  - this.margin.bottom;

    // Saves the data.
    this.ksPledges    = data[0];
    this.mvSales      = data[1];
    this.vgSales      = data[2];

    // Selects initial dataset depending on the URL parameter provided.
    // If there's no parameter, Kickstarter dataset will be selected.
    const urlParams = new URLSearchParams( window.location.search );
    if ( urlParams.get( 'show' ) === 'kickstarter' || !urlParams.get( 'show' ) )
      this.data = this.ksPledges;
    else if ( urlParams.get( 'show' ) === 'movies' )
      this.data = this.mvSales;
    else if ( urlParams.get( 'show' ) === 'videogames' )
      this.data = this.vgSales;

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

  // Builds treemap's hierarchy.
  buildTreemap ( ) {
    this.treemap = d3.treemap( )
      .tile( d3.treemapResquarify )
      .size( [ this.canvasWidth, this.canvasHeight ] )
      .round( true )
      .paddingInner( 2 );

    const root = d3.hierarchy( this.data )
    .eachBefore( d => { d.data.id = ( d.parent ? d.parent.data.id + '.' : '' ) + d.data.name; } )
    .sum( d => d.value )
    .sort( ( a, b ) => b.height - a.height || b.value - a.value );

    this.treeLeaves = this.treemap( root ).leaves( );

    return this;
  }

  // Draws treemap's tiles and their text.
  drawTiles ( ) {
    const tiles = this.canvas.selectAll( 'g' )
      .data( this.treeLeaves )
      .enter( )
      .append( 'g' )
        .attr( 'class'    , 'tile-group' )
        .attr( 'transform', d => `translate( ${d.x0}, ${d.y0} )` );

    this.tile = tiles.append( 'rect' );
    this.tile.transition( )
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

  // Fills the treemap with colors.
  paintColors ( ) {
    this.colorScale = d3.scaleOrdinal( )
      .range( [
        "#316395","#dc3912","#ff9900","#109618","#990099","#0099c6","#8b0707",
        "#3b3eac","#b82e2e","#994499","#22aa99","#aaaa11","#6633cc","#e67300",
      ] )
      .domain( this.data.children.map( d => d.name ) );
    this.tile.attr( 'fill', d => this.colorScale( d.data.category ) );

    return this;
  }

  // Creates the legend squares and texts from the treemap.
  makeLegend ( ) {
    const categories = this.treeLeaves
      .map( leaf => leaf.data.category )
      .filter( ( cat, i, obj ) => obj.indexOf( cat ) === i );
    const WIDTH       = this.chartWidth;
    const HEIGHT      = this.canvasHeight;
    const TILE_SIZE   =  10;
    const TILE_OFFSET = 120;
    const Y_SPACE     =  10;
    const COLUMNS     = Math.floor( WIDTH / TILE_OFFSET );

    const legend = this.canvas
      .append( 'g' )
      .attr( 'id', 'legend' )
      .attr( 'transform', 'translate( 20, 10 )' )
      .selectAll( 'g' )
      .data( categories )
      .enter( )
      .append( 'g' )
        .attr( 'transform', ( d, i ) => 
          `translate(
            ${ ( i % COLUMNS ) * TILE_OFFSET },
            ${ HEIGHT + Math.floor( i / COLUMNS ) * TILE_SIZE + Y_SPACE * Math.floor( i / COLUMNS ) } 
          )` );
      
    legend.append( 'rect' )
      .attr( 'width'  , TILE_SIZE )
      .attr( 'height' , TILE_SIZE )
      .attr( 'class'  , 'legend-item' )
      .attr( 'fill'   , d => this.colorScale( d ) );
      
    legend.append("text")
      .attr( 'class', 'legend-text')
      .attr( 'x'    , TILE_SIZE + 5 )
      .attr( 'y'    , TILE_SIZE )
      .text( d => d );

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
          ${d.data.name}
          <hr />
        </h4>
        <div class="desc">
          <p>
          Value: ${d.data.value}
          </p>
          <small>Category: ${d.data.category}</small>
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

    return this;
  }

  // Update Treemap with new data.
  updateTreemap( data ) {
    this.data = data === 'kickstarter'
      ? this.ksPledges
      : data === 'movies'
        ? this.mvSales
        : this.vgSales;

    this.canvas.remove( );
    this.canvas = this.chart.append( 'g' )
      .attr( 'transform', `translate( ${this.margin.left}, ${this.margin.top} )` );

    const root = d3.hierarchy( this.data )
      .eachBefore( d => { d.data.id = ( d.parent ? d.parent.data.id + '.' : '' ) + d.data.name; } )
      .sum( d => d.value )
      .sort( ( a, b ) => b.height - a.height || b.value - a.value );

    this.treeLeaves = this.treemap( root ).leaves( );

    this.drawTiles( ).paintColors( ).makeTooltip( ).handleEvents( ).and.makeLegend( );

    return this;
  }

}

// Handles click events for the menu buttons.
function handleMenu( treemap ) {
  const title           = document.getElementById( 'title' );
  const desc            = document.getElementById( 'description' );
  const kickstarterBtn  = document.getElementById( 'kickstarterBtn' );
  const moviesBtn       = document.getElementById( 'movieBtn' );
  const videogamesBtn   = document.getElementById( 'videogameBtn' );

  kickstarterBtn.addEventListener( 'click', e => {
    e.preventDefault( );
    kickstarterBtn.classList.add( 'active' );
    moviesBtn.classList.remove( 'active' );
    videogamesBtn.classList.remove( 'active' );
    treemap.updateTreemap( 'kickstarter' );
    title.innerText = 'Kickstarter Pledges';
    desc.innerText  = 'Top 100 Most Pledged Kickstarter Campaigns Grouped By Category';
  } );
  moviesBtn.addEventListener( 'click', e => {
    e.preventDefault( );
    kickstarterBtn.classList.remove( 'active' );
    moviesBtn.classList.add( 'active' );
    videogamesBtn.classList.remove( 'active' );
    treemap.updateTreemap( 'movies' );
    title.innerText = 'Movie Sales';
    desc.innerText  = 'Top 100 Highest Grossing Movies Grouped By Genre';
  } );
  videogamesBtn.addEventListener( 'click', e => {
    e.preventDefault( );
    kickstarterBtn.classList.remove( 'active' );
    moviesBtn.classList.remove( 'active' );
    videogamesBtn.classList.add( 'active' );
    treemap.updateTreemap( 'videogames' );
    title.innerText = 'Video Game Sales';
    desc.innerText  = 'Top 100 Most Sold Video Games Grouped by Platform';
  } );
}