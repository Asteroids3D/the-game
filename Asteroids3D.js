var gl;

window.onload = function init() {

  // Housekeeping

  var canvas = document.getElementById( "gl-canvas" );

  gl = WebGLUtils.setupWebGL( canvas );
  if ( !gl ) { alert( "WebGL isn't available" ); }

  gl.viewport( 0, 0, canvas.width, canvas.height );
  gl.clearColor( 0.9, 0.9, 0.9, 1.0 );

  var program = initShaders( gl, "vertex-shader", "fragment-shader" );
  gl.useProgram( program );

  gl.enable(gl.DEPTH_TEST);

  // My stuff

  render();
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // My stuff

  window.requestAnimFrame(render);
}
