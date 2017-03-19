var gl;

// GLSL variables
var locMvMatrix, locProjMatrix, locPosition, locColor;

// rotate variables
var rotates, xSpin, ySpin, oldX, oldY;

// translate variables
var xLoc, yLoc, zLoc;

var xDir, yDir, zDir;
var xPos, yPos, zPos;
var xDegrees, yDegrees, zDegrees;

var box1, box2, box3, box4;

var ctm, rotator;

var pitch, yaw;
var theSkybox;
var locSkybox;
var locVcoloringMode, locFcoloringMode;

var key;
var rotateSpeed;
var canvas;

var accelerationVector, movementVector;

var PR;

var lightPosition;
var lightAmbient, lightDiffuse, lightSpecular;

var numberOfRoids;
var roids;

var normalMatrix;
var theSun;
var locAltColor;


window.onload = function init() {

  // Housekeeping

  canvas = document.getElementById( "gl-canvas" );

  gl = WebGLUtils.setupWebGL( canvas );
  if ( !gl ) { alert( "WebGL isn't available" ); }

  //gl.viewport( 0, 0, canvas.width, canvas.height );
  gl.clearColor( 0.9, 0.9, 0.9, 1.0 );

  var program = initShaders( gl, "vertex-shader", "fragment-shader" );
  gl.useProgram( program );

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // My stuff

  // Initializations ---------------------------------

  PR = PlyReader();

  rotates = false;
  xSpin = ySpin = oldX = oldY = 0.0;
  xLoc = yLoc = zLoc = 0.0;


  xDir = yDir = 0.0;
  zDir = 1.0;
  xDegrees = yDegrees = zDegrees = 0.0;
  xPos = yPos = 0.0;
  zPos = 0.0;
  pitch = yaw = 0.0;
  rotateSpeed = 1.5;
  aspect = gl.clientWidth / gl.clientHeight;
  numberOfRoids = 21;
  roids = [];

  for (var i = 0; i < numberOfRoids / 3; i++) {
    roids.push(new Asteroid(6));
  }
  for (var i = 0; i < numberOfRoids / 3; i++) {
    roids.push(new Asteroid(3));
  }
  for (var i = 0; i < numberOfRoids / 3; i++) {
    roids.push(new Asteroid(1));
  }

  // lighting

  lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
  lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
  lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
  lightPosition = vec4(0.5, 0.5, 1.0, 0.0);

  theSun = new Sun(15);

  // Textures -----------------------------------------




  /*
  var veggImage = new Image();
  veggImage.src = "./brick29.jpg";
  texVegg = gl.createTexture();
  gl.bindTexture( gl.TEXTURE_2D, texVegg );
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, veggImage );
  gl.generateMipmap( gl.TEXTURE_2D );
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );

  debugger;
  */

  theSkybox = new Skybox([1.0, 1.0, 1.0]);


  skyboxVector = [
    document.getElementById("skybox-right"),
    document.getElementById("skybox-left"),
    document.getElementById("skybox-up"),
    document.getElementById("skybox-down"),
    document.getElementById("skybox-front"),
    document.getElementById("skybox-back")
  ];

  var targets = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
  ];

  skybox = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox);

  for (var i = 0; i < 6; i++) {
    gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA,
      gl.UNSIGNED_BYTE, skyboxVector[i]);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    /*
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE );
    */
/*
  gl.generateMipmap( gl.TEXTURE_2D );
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
*/





  // GLSL variables -----------------------------------

  locMvMatrix = gl.getUniformLocation(program, "mvMatrix");
  locProjMatrix = gl.getUniformLocation(program, "projMatrix");
  locSkybox = gl.getUniformLocation(program, "skybox");
  locFcoloringMode = gl.getUniformLocation(program, "fColoringMode");
  locVcoloringMode = gl.getUniformLocation(program, "vColoringMode");
  locAltColor = gl.getUniformLocation(program, "altColor");

  locPosition = gl.getAttribLocation(program, "vPosition");
  locNormal = gl.getAttribLocation(program, "vNormal");

  // lighting

  locLightPos = gl.getUniformLocation(program, "lightPosition");
  locAmbient = gl.getUniformLocation(program, "ambientProduct");
  locDiffuse = gl.getUniformLocation(program, "diffuseProduct");
  locSpecular = gl.getUniformLocation(program, "specularProduct");
  locShininess = gl.getUniformLocation(program, "shininess");

  gl.enableVertexAttribArray(locPosition);
  gl.enableVertexAttribArray(locNormal);

  gl.uniform4fv(locLightPos, flatten(lightPosition));


  // Initialize perspective ----------------------------

  // Important to run this first because of first
  // assigment of aspect : gl.clientWidth ...
  var persp = perspective(50.0, aspect, 0.1, 200.0);
  gl.uniformMatrix4fv(locProjMatrix, false, flatten(persp));

  xPosDisplay = document.getElementById("xpos-display");
  yPosDisplay = document.getElementById("ypos-display");
  zPosDisplay = document.getElementById("zpos-display");

  xAngleDisplay = document.getElementById("xangle-display");
  yAngleDisplay = document.getElementById("yangle-display");
  zAngleDisplay = document.getElementById("zangle-display");

  xLookDisplay = document.getElementById("xlook-display");
  yLookDisplay = document.getElementById("ylook-display");
  zLookDisplay = document.getElementById("zlook-display");


  //pageBody = document.getElementsByID("body");
  //pageBody.onresize = setPerspective();

  canvas.addEventListener("mousedown", function(e) {
    rotates = true;
      oldX = e.offsetX;
      oldY = e.offsetY;
      e.preventDefault();
  });

  canvas.addEventListener("mousemove", function(e) {
    if (rotates) {
      xSpin = (xSpin + (e.offsetY - oldY)/4) % 360;
      ySpin = (ySpin + (e.offsetX - oldX)/4) % 360;
      oldX = e.offsetX;
      oldY = e.offsetY;
    }
  });

  window.addEventListener("mouseup", function() {
    rotates = false;
  });

  window.addEventListener("keyup", function(e) {
    key.onKeyUp(e);
    if (!key.isDown(key.ACCELERATE)) accelerate = false;
  });

  window.addEventListener("keydown", function(e) { key.onKeyDown(e); });

  /* Þetta verður zoom out from spaceship

  var fovDisplay = document.getElementById("fov-display");
  canvas.addEventListener("mousewheel", function(e) {
    if (e.wheelDelta > 0 && fieldOfView < 150.0) fieldOfView += 5.0;
    else if (e.wheelDelta < 0 && fieldOfView > 10.0) fieldOfView -= 5.0;
  });*/

  /*
  frontNormal = vec4(0.0, 0.0, 1.0, 0.0);
  topNormal = vec4(0.0, 1.0, 0.0, 0.0);
  rightNormal = vec4(1.0, 0.0, 0.0, 0.0);

  function rotateXAxisDegrees(degrees) {
    var rotator = rotate(degrees, 1.0, 0.0, 0.0);

    frontNormal = mult(rotator, frontNormal);
    topNormal = mult(rotator, topNormal);
    rightNormal = mult(rotator, rightNormal);
  }

  function rotateYAxisDegrees(degrees) {
    var rotator = rotate(degrees, 1.0, 1.0, 0.0);

    frontNormal = mult(rotator, frontNormal);
    topNormal = mult(rotator, topNormal);
    rightNormal = mult(rotator, rightNormal);
  }





  ctm = mat4();
  //var locDisplay = document.getElementById("loc-display");
  var xAxis = vec3(1.0, 0.0, 0.0);
  var yAxis = vec3(0.0, 1.0, 0.0);
  window.addEventListener("keydown", function(e) {

  switch (e.keyCode) {
    case 87: // w
      //zLoc += 0.1;

      //rotateSpeed % 360;




      /*zDegrees += rotateSpeed % 360;


      yDir = Math.sin(radians(yDegrees));
      zDir = Math.cos(radians(zDegrees));
      */

      /*
      rotator = rotate(-rotateSpeed, xAxis);
      //rotator[3] = vec4(xPos, yPos, zPos, 1.0);
      frontNormal = mult(rotator, frontNormal);
      ctm = mult(rotator, ctm);
      */


      //frontNormal = mult(tmp, frontNormal);
      //topNormal = mult(tmp, topNormal);
      //rightNormal = mult(tmp, rightNormal);

      /*
      rotator = rotate(-rotateSpeed, xAxis);
      ctm = mult(rotator, ctm);
      */ /*
      break;
    case 65: // a
      //xLoc += 0.1;

      // xDegrees -= rotateSpeed % 360;

      // xDir -= rotateSpeed;



      /*
      rotator = rotate(-rotateSpeed, yAxis);
      frontNormal = mult(rotator, frontNormal);
      ctm = mult(rotator, ctm);
      */
      /*
      //yLook += rotateSpeed*yAngle % 360;
      zDegrees += rotateSpeed % 360;
      xDegrees += rotateSpeed % 360;
      xDir = Math.sin(radians(xDegrees));
      zDir = Math.cos(radians(zDegrees));


      ctm = mult(ctm, rotate(xDegrees, vec3(xDir, yDir, zDir)));
      */ /*
      break;
    case 83: // s
      // zLoc -= 0.1;

      /*
      rotator = rotate(rotateSpeed, xAxis);
      frontNormal = mult(rotator, frontNormal);
      ctm = mult(rotator, ctm);
      */




      /*
      yDegrees -= rotateSpeed % 360;
      zDegrees -= rotateSpeed % 360;
      //xLook += rotateSpeed*xAngle % 360;
      yDir = Math.sin(radians(yDegrees));
      zDir = Math.cos(radians(zDegrees));
      ctm = mult(ctm, rotate(yDegrees, vec3(xDir, yDir, zDir)));
      */ /*
      break;
    case 68: // d
      // xLoc -= 0.1;



      /*
      rotator = rotate(rotateSpeed, yAxis);
      frontNormal = mult(rotator, frontNormal);
      ctm = mult(rotator, ctm);
      */
      /*
      //yLook += rotateSpeed*yAngle % 360;
      zDegrees -= rotateSpeed % 360;
      xDegrees -= rotateSpeed % 360;
      xDir = Math.sin(radians(xDegrees));
      zDir = Math.cos(radians(zDegrees));


      ctm = mult(ctm, rotate(xDegrees, vec3(xDir, yDir, zDir)));
      */ /*
      break;
    case 81: // q
      //if (yLoc < 0.0)
      //yLoc += 0.1;
      break;
    case 69: // e
      //yLoc -= 0.1;
      break;
    case 32: // Spacebar



      break;
      /*
      xPos += frontNormal[0];
      yPos += frontNormal[1];
      zPos += frontNormal[2];
      tmp = translate(xPos, yPos, zPos);
      ctm = mult(ctm, tmp);

  }; */ /*
}); */

  key = {
    pressed: {},

    LEFT: 65,
    UP: 87, //
    RIGHT: 68, // D
    DOWN: 83, // S
    FIRE: 17, // CTRL
    ACCELERATE: 32, // SPACE

    isDown: function(keyCode) {
      return this.pressed[keyCode]
    },
    onKeyDown: function(e) {
      this.pressed[e.keyCode] = true;
    },
    onKeyUp: function(e) {
      delete this.pressed[e.keyCode];
    },

  }

  render();
}

function manageKeyInput() {

    if (key.isDown(key.LEFT)) pitch -= rotateSpeed % 360;
    if (key.isDown(key.RIGHT)) pitch += rotateSpeed % 360;
    if (key.isDown(key.UP) && yaw < 88) yaw += rotateSpeed;
    if (key.isDown(key.DOWN) && yaw > -88) yaw -= rotateSpeed % 360;
    if (key.isDown(key.ACCELERATE)) {
      accelerate = true;
      xPos += 0.2*xDir;
      yPos += 0.2*yDir;
      zPos += 0.2*zDir;
    }
}

function createRandomCoords() {
  var tooCloseToStart = true;
  // Svæðið er 100*100*100
  var randX, randY, randZ;
  while(tooCloseToStart) {
    randX = -50 + Math.random() * 100;
    randY = -50 + Math.random() * 100;
    randZ = -50 + Math.random() * 100;

    // Viljum ekki leyfa asteroid að fá upphafsstað sem er of nálægt player.
    if (!(randX < 10.0 && randX > -10.0 && randY < 10.0 && randY > -10.0 &&
        randZ < 10.0 && randZ > -10.0)) tooCloseToStart = false;
  }

  return vec3(randX, randY, randZ);
}


function Sun(radius, color = vec4(1.0, 1.0, 1.0, 1.0)) {
  var lats = 3;
  var longs = 3;

  this.vertices = [];
  this.normals = [];
  this.indices = [];
  this.color = color;

  var lightVector = vec3(lightPosition[0], lightPosition[1], lightPosition[2]);
  this.locationVector = scale(5, lightVector);



  // fill vertices and normals
  for (i = 0; i <= lats; i++) {
    var theta = i * Math.PI / lats;

    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);

    for (var j = 0; j <= longs; j++) {
      var phi = j * 2 * Math.PI / longs;
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);

      var x = cosPhi * sinTheta;
      var y = cosTheta;
      var z = sinPhi * sinTheta;

      this.normals.push(x, y, z);
      this.vertices.push(radius * x, radius * y, radius * z);
    };
  };

  // fill indices
  for (var i = 0; i < lats; i++) {
    for (var j = 0; j < longs; j++) {
      var first = (i * (longs + 1)) + j;
      var second = first + longs + 1;

      this.indices.push(first, second, first + 1);
      this.indices.push(second, second + 1, first + 1);
    };
  };

  this.numItems = this.indices.length;

  this.iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(this.indices), gl.STATIC_DRAW);

  this.nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

  this.vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

}

// size is a 3-vector, [x, y, z] representing the
//   width, height and depth of the square.
// color is a 3-vector, [r, g, b] representing the
//   red, green, blue values of the color of the square.
//   if skipped the squares vertices get random colors.
// location is a 2-vector [x, z] representing the x and z
//   translations of the square within the world coordinates.
//   the y-coordinates are calculated so that the square sits
//   on the ground.
function Asteroid(scale) {
  var plyData = PR.read("models/asteroid.ply");

  this.vertices = plyData.points;
  this.normals = plyData.normals;

  this.scaleMatrix = scalem(scale, scale, scale); // 3 stærðir á asteroids í boði

   /*
  this.index = [
    0, 3, 1, // front
    3, 2, 1, // front
    1, 2, 5, // top
    2, 6, 5, // top
    3, 6, 2, // right
    3, 7, 6, // right
    1, 5, 4, // left
    0, 1, 4, // left
    4, 5, 6, // back
    4, 6, 7, // back
    0, 4, 7, // bottom
    0, 7, 3 // bottom
  ];

  this.normals = [];

  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(0.0, 0.0, 1.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(0.0, 1.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(1.0, 0.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(-1.0, 0.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(0.0, 0.0, -1.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(0.0, -1.0, 0.0));
  }
  */
  this.size = this.vertices.length;



  this.location = createRandomCoords();
  this.rotAxis = normalize(vec3(Math.random(), Math.random(), Math.random()));
  this.theta = 1.0;
  this.rotateSpeed = 0.1 + Math.random() * 2;



  this.ambient = vec4(0.2, 0.2, 0.2, 1.0);
  this.diffuse = vec4(0.7, 0.7, 0.7, 1.0);
  this.specular = vec4(1.0, 1.0, 1.0, 1.0);
  this.shininess = 60.0;

  /*
  this.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(this.indices), gl.STATIC_DRAW);
  */
  /*
  this.colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.color), gl.STATIC_DRAW);
  */
  this.normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);
}

function Skybox(size) {
  this.x = -(size[0] / 2);
  this.y = -(size[1] / 2);
  this.z = -(size[2] / 2);
  this.vertices = [
    vec3(this.x,         this.y,         this.z+size[2]),
    vec3(this.x,         this.y+size[1], this.z+size[2]),
    vec3(this.x+size[0], this.y+size[1], this.z+size[2]),
    vec3(this.x+size[0], this.y,         this.z+size[2]),
    vec3(this.x,         this.y,         this.z),
    vec3(this.x,         this.y+size[1], this.z),
    vec3(this.x+size[0], this.y+size[1], this.z),
    vec3(this.x+size[0], this.y,         this.z),
  ];

  this.index = [
    0, 3, 1, // front
    3, 2, 1, // front
    1, 2, 5, // top
    2, 6, 5, // top
    3, 6, 2, // right
    3, 7, 6, // right
    1, 5, 4, // left
    0, 1, 4, // left
    4, 5, 6, // back
    4, 6, 7, // back
    0, 4, 7, // bottom
    0, 7, 3 // bottom
  ];

  this.normals = [];

  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(0.0, 0.0, 1.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(0.0, 1.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(1.0, 0.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(-1.0, 0.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(0.0, 0.0, -1.0));
  }
  for (var i = 0; i < 6; i++) {
    this.normals.push(vec3(0.0, -1.0, 0.0));
  }

  this.location = vec3(0.0, 0.0, 0.0);

  this.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(this.index), gl.STATIC_DRAW);

  this.normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);
}


function setPerspective(canvas) {
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;
  aspect = displayWidth / displayHeight;

  if (canvas.width  != displayWidth || canvas.height != displayHeight) {

    canvas.width  = displayWidth;
    canvas.height = displayHeight;

    proj = perspective( 50.0, aspect, 0.01, 200.0 );
    gl.uniformMatrix4fv(locProjMatrix, false, flatten(proj));
  }
}


function drawAsteroid(asteroid) {
  asteroid.theta += asteroid.rotateSpeed % 360;

  ctmRoid = mult(ctm, translate(asteroid.location));
  ctmRoid = mult(ctmRoid, asteroid.scaleMatrix);
  ctmRoid = mult(ctmRoid, rotate(asteroid.theta, asteroid.rotAxis));


  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmRoid));
  gl.uniform4fv(locAmbient, mult(lightAmbient, asteroid.ambient));
  gl.uniform4fv(locDiffuse, mult(lightDiffuse, asteroid.diffuse));
  gl.uniform4fv(locSpecular, mult(lightSpecular, asteroid.specular));
  gl.uniform1f(locShininess, asteroid.shininess);

  gl.bindBuffer(gl.ARRAY_BUFFER, asteroid.normalsBuffer);
  gl.vertexAttribPointer(locNormal, 4, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, asteroid.vertexBuffer);
  gl.vertexAttribPointer(locPosition, 4, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, asteroid.size);
}

function drawSkybox(skybox) {
  gl.depthMask(false);
  gl.uniform1f(locVcoloringMode, 1.0);
  gl.uniform1f(locFcoloringMode, 1.0);

  gl.bindBuffer(gl.ARRAY_BUFFER, skybox.vertexBuffer);
  gl.vertexAttribPointer(locPosition, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, skybox.normalsBuffer);
  gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, 0, 0);

  /*
  gl.bindBuffer(gl.ARRAY_BUFFER, skybox.colorBuffer);
  gl.vertexAttribPointer(locColor, 4, gl.FLOAT, false, 0, 0);
  */
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);

  gl.depthMask(true);
  gl.uniform1f(locVcoloringMode, 0.0);
  gl.uniform1f(locFcoloringMode, 0.0);
}

function drawSun(sun) {
  gl.uniform1f(locVcoloringMode, 2.0);
  gl.uniform1f(locFcoloringMode, 2.0);
  ctmSun = mult(ctm, translate(sun.locationVector));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSun));
  gl.uniform4fv(locAltColor, sun.color);

  xPosDisplay.innerText = sun.location;

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.nBuffer);
  gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.vBuffer);
  gl.vertexAttribPointer(locPosition, 3, gl.FLOAT, false, 0, 0);

  gl.drawElements(gl.TRIANGLES, 36 , gl.UNSIGNED_BYTE, 0);

  gl.uniform1f(locVcoloringMode, 0.0);
  gl.uniform1f(locFcoloringMode, 0.0);
}


function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // My stuff

  setPerspective(canvas);
  gl.viewport( 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );




  //ctm = lookAt(vec3(xPos, yPos, zPos),
    //          vec3(xPos+xDir, yPos+yDir, zPos+zDir),
      //        vec3(0.0, 1.0, 0.0));
  /*
  ctm = mat4();
  ctm = mult(ctm, rotateX(yLook));
  ctm = mult(ctm, rotateY(xLook));
  ctm = mult(ctm, translate(xPos, yPos, zPos));
  //ctm = mult(ctm, translate(xLoc, yLoc, zLoc));
  */

  /*var mvm = mat4(
    rightNormal[0], rightNormal[1], rightNormal[2], 0.0,
    topNormal[0], topNormal[1], topNormal[2], 0.0,
    frontNormal[0], frontNormal[1], frontNormal[2], 0.0,
    xPos, yPos, zPos, 0.0
  );*/

  //debugger;
  //ctm = mult(rotator, ctm);
  //debugger;


  xDir = Math.cos(radians(pitch)) * Math.cos(radians(yaw));
  yDir = Math.sin(radians(yaw));
  zDir = Math.sin(radians(pitch)) * Math.cos(radians(yaw));


  ctm = lookAt(vec3(xPos, yPos, zPos),
                vec3(xPos+xDir, yPos+yDir, zPos+zDir),
                vec3(0.0, 1.0, 0.0));

  gl.uniform4fv(locLightPos, mult(ctm, lightPosition));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctm));


  drawSkybox(theSkybox);
  //drawSun(theSun);
  for (var i = 0; i < roids.length; i++) {
    drawAsteroid(roids[i]);
  }



  manageKeyInput();

  /*
  xPosDisplay.innerText = xPos;
  yPosDisplay.innerText = yPos;
  zPosDisplay.innerText = zPos;

  xAngleDisplay.innerText = xDir;
  yAngleDisplay.innerText = yDir;
  zAngleDisplay.innerText = zDir;

  xLookDisplay.innerText = xDegrees;
  yLookDisplay.innerText = yDegrees;
  zLookDisplay.innerText = zDegrees;
  */

  window.requestAnimFrame(render);
}
