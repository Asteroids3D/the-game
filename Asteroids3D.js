var gl;
var program;

// GLSL variables
var locMvMatrix, locProjMatrix, locPosition, locColor;

// rotate variables
var rotates, xSpin, ySpin, oldX, oldY;

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
var locColor;

var locTexCoords;

var theSpaceCube;
var collision;
var thePlayer;
var displaySpeed;
var displayScore;

var fired;

var playBoxVertexRadius;

var asteroidModel;
var laserBeamModel;

var SFX;

window.onload = function init() {

  // Housekeeping ----------------------------------

  canvas = document.getElementById( "gl-canvas" );

  gl = WebGLUtils.setupWebGL( canvas );
  if ( !gl ) { alert( "WebGL isn't available" ); }

  gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

  program = initShaders( gl, "vertex-shader", "fragment-shader" );
  gl.useProgram( program );

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL); // Fyrir skybox

  // Initializations ---------------------------------

  PR = PlyReader();

  asteroidModel = new AsteroidModel();
  laserBeamModel = new LaserBeamModel();

  SFX = new SFXManager();

  xSpin = ySpin = oldX = oldY = 0.0; // Ekki í notkun eins og er.

	playBoxVertexRadius = 300;
  aspect = gl.clientWidth / gl.clientHeight;
  numberOfRoids = 36; // multiple of 3
  roids = [];
  fired = false;

  thePlayer = new Player();

  for (var i = 0; i < numberOfRoids / 3; i++) {
    roids.push(new Asteroid(12));
  }
  for (var i = 0; i < numberOfRoids / 3; i++) {
    roids.push(new Asteroid(6));
  }
  for (var i = 0; i < numberOfRoids / 3; i++) {
    roids.push(new Asteroid(3));
  }

  theSkybox = new Skybox();
  theSpaceCube = new SpaceCube();

  // Lighting -----------------------------------------
  // Reynum að hafa ljósið örlítið bláleitt þar sem
  // sólin er blá.
  lightAmbient = vec4(0.2, 0.2, 0.3, 1.0);
  lightDiffuse = vec4(0.7, 0.9, 1.0, 1.0);
  lightSpecular = vec4(0.4, 0.76, 1.0, 1.0);
  lightPosition = vec4(0.5, 0.5, 1.0, 0.0);
  theSun = new Sun();

  // HTML elements ------------------------------------

  displaySpeed = document.getElementById("display-speed");
  displayScore = document.getElementById("display-score");

  // GLSL variables -----------------------------------

  locMvMatrix = gl.getUniformLocation(program, "mvMatrix");
  locProjMatrix = gl.getUniformLocation(program, "projMatrix");

  locFcoloringMode = gl.getUniformLocation(program, "fColoringMode");
  locVcoloringMode = gl.getUniformLocation(program, "vColoringMode");
  locColor = gl.getUniformLocation(program, "color");

  locTexture2D = gl.getUniformLocation(program, "sunTexture");
  locSkybox = gl.getUniformLocation(program, "skybox");

  gl.uniform1i(locTexture2D, 0);
  gl.uniform1i(locSkybox, 1);

  locPosition = gl.getAttribLocation(program, "vPosition");
  locNormal = gl.getAttribLocation(program, "vNormal");
  locTexCoords = gl.getAttribLocation(program, "vTexCoords2D");

  locLightPos = gl.getUniformLocation(program, "lightPosition");
  locAmbient = gl.getUniformLocation(program, "ambientProduct");
  locDiffuse = gl.getUniformLocation(program, "diffuseProduct");
  locSpecular = gl.getUniformLocation(program, "specularProduct");
  locShininess = gl.getUniformLocation(program, "shininess");

  gl.enableVertexAttribArray(locPosition);
  gl.enableVertexAttribArray(locNormal);

  gl.uniform4fv(locLightPos, flatten(lightPosition));

  // Initialize perspective ----------------------------

  // Langt zFar svo sólin geti verið world coord based.
  // Minna vesen svona.
  var persp = perspective(80.0, aspect, 0.1, 5000.0);
  gl.uniformMatrix4fv(locProjMatrix, false, flatten(persp));

  // Erum ekkert að nota músina eina og er, en það má alveg hafa það með ?
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

  key = {
    pressed: {},

    LEFT: 65, // W
    LEFTARROW: 37,
    UP: 87, // A
    UPARROW: 38,
    RIGHT: 68, // D
    RIGHTARROW: 39,
    DOWN: 83, // S
    DOWNARROW: 40,
    FIRE: 32, // SPACE
    ACCELERATE: 16, // SHIFT
    DECELERATE: 90, // Z
    REVERSE: 88, // X

    isDown: function(keyCode) {
      return this.pressed[keyCode]
    },
    onKeyDown: function(e) {
      this.pressed[e.keyCode] = true;
    },
    onKeyUp: function(e) {
      delete this.pressed[e.keyCode];
      if (e.keyCode == key.FIRE) fired = false;
    },

  }

  window.addEventListener("keyup", function(e) {
    key.onKeyUp(e);
    if (!key.isDown(key.ACCELERATE) && !key.isDown(key.DECELERATE) && !key.isDown(key.REVERSE)) {
      SFX.stop("thruster");
    }
  });

  window.addEventListener("keydown", function(e) { key.onKeyDown(e); });

  render();
}


// Utility functions ---------------------------------

function manageKeyInput(player) {
    // svissaði óvart pitch og yaw í byrjun, nenni ekki að laga.
    if (key.isDown(key.LEFT) || key.isDown(key.LEFTARROW)) player.yaw -= player.lookSpeed % 360;
    if (key.isDown(key.RIGHT) || key.isDown(key.RIGHTARROW)) player.yaw += player.lookSpeed % 360;
    if ((key.isDown(key.UP) || key.isDown(key.UPARROW)) && player.pitch < 88) player.pitch += player.lookSpeed;
    if ((key.isDown(key.DOWN) || key.isDown(key.DOWNARROW)) && player.pitch > -88) player.pitch -= player.lookSpeed;
    if (key.isDown(key.ACCELERATE)) {
      SFX.play("thruster");
      // Space movement.. má alveg setja e-h hámark á velocity.
      player.velocity = add(player.velocity,
                            scale(player.acceleration, player.direction));

      displaySpeed.innerText = player.getSpeed().toFixed(2);
    }
    if (key.isDown(key.DECELERATE)) {
      // Check if we're already at zero. Don't want to normalize zero vectors
      if (!equal(player.velocity, vec3())) {
        SFX.play("thruster");
        // Set to zero below certain point as we'll never get a precise zero otherwise
        if (Math.abs(player.velocity[0]) <= 0.01 &&
            Math.abs(player.velocity[1]) <= 0.01 &&
            Math.abs(player.velocity[2]) <= 0.01) {
          player.velocity = vec3();
          SFX.stop("thruster");
        } else {
          player.velocity = subtract(player.velocity,
                                scale(player.acceleration, nseNormalize(player.velocity)));
        }
      }
      displaySpeed.innerText = player.getSpeed().toFixed(2);
    }
    if (key.isDown(key.REVERSE)) {
      SFX.play("thruster");
      // Space movement.. má alveg setja e-h hámark á velocity.
      player.velocity = subtract(player.velocity,
                            scale(player.acceleration, player.direction));

      displaySpeed.innerText = player.getSpeed().toFixed(2);
    }
    if (key.isDown(key.FIRE)) {
      if (fired == false) thePlayer.fireLasers();
      fired = true;
    }
}

function setPerspective() {
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;

  if (canvas.width  != displayWidth || canvas.height != displayHeight) {
    aspect = displayWidth / displayHeight;
    canvas.width  = displayWidth;
    canvas.height = displayHeight;

    proj = perspective( 80.0, aspect, 0.01, 5000.0 );
    gl.uniformMatrix4fv(locProjMatrix, false, flatten(proj));

    gl.viewport( 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );
  }
}

function getSphericalDirection(pitch, yaw) {
  return [
    Math.cos(radians(yaw)) * Math.cos(radians(pitch)),
    Math.sin(radians(pitch)),
    Math.sin(radians(yaw)) * Math.cos(radians(pitch))
  ];
}

function createRandomCoords() {
  var tooCloseToStart = true;
  // Svæðið er 200*200*200
  var randX, randY, randZ;
  while(tooCloseToStart) {
    randX = -100 + Math.random() * 550;
    randY = -100 + Math.random() * 550;
    randZ = -100 + Math.random() * 550;

    // Viljum ekki leyfa asteroid að fá upphafsstað sem er of nálægt player.
    if (!(randX < 20.0 && randX > -20.0 && randY < 20.0 && randY > -20.0 &&
        randZ < 20.0 && randZ > -20.0)) tooCloseToStart = false;
  }

  return vec3(randX, randY, randZ);
}

function getCubeArrays(size) {
  var x = -(size[0] / 2);
  var y = -(size[1] / 2);
  var z = -(size[2] / 2);

  var vertices = [
    vec3(x,         y,         z+size[2]),
    vec3(x,         y+size[1], z+size[2]),
    vec3(x+size[0], y+size[1], z+size[2]),
    vec3(x+size[0], y,         z+size[2]),
    vec3(x,         y,         z),
    vec3(x,         y+size[1], z),
    vec3(x+size[0], y+size[1], z),
    vec3(x+size[0], y,         z),
  ];
  var vSize = vertices.length;

  var index = [
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
  var iSize = index.length;

  var normals = [];
  for (var i = 0; i < 6; i++) {
    normals.push(vec3(0.0, 0.0, 1.0));
  }
  for (var i = 0; i < 6; i++) {
    normals.push(vec3(0.0, 1.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    normals.push(vec3(1.0, 0.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    normals.push(vec3(-1.0, 0.0, 0.0));
  }
  for (var i = 0; i < 6; i++) {
    normals.push(vec3(0.0, 0.0, -1.0));
  }
  for (var i = 0; i < 6; i++) {
    normals.push(vec3(0.0, -1.0, 0.0));
  }
  var nSize = normals.length;

  return {
    vertices,
    index,
    normals,
    vSize,
    iSize,
    nSize
  };
}

function SFXManager() {
  this.soundsEnabled = true;
  this.musicEnabled = true;

  this.SFX = {
    "laser": {
      "audio": new Audio("sfx/laser.mp3"),
      "interruptable": true},
    "thruster": {
      "audio": new Audio("sfx/thruster.mp3"),
      "interruptable": false},
    "alien": {
      "audio": new Audio("sfx/thruster.mp3"),
      "interruptable": false},
    "laserhit": {
      "audio": new Audio("sfx/laser.mp3"),
      "interruptable": true},
    "collision": {
      "audio": new Audio("sfx/laser.mp3"),
      "interruptable": true}
  };

  this.play = function(sound) {
    if (!this.soundsEnabled)
      return;
    if (this.SFX[sound].interruptable == true ||
        this.SFX[sound].audio.currentTime == 0) {
      // Call stop in case the sound is already playing (if applicable)
      this.stop(sound);
      this.SFX[sound].audio.play();
    }
  };

  this.stop = function(sound) {
    this.SFX[sound].audio.pause();
    this.SFX[sound].audio.currentTime = 0;
  };
}

function isCollision(asteroid, player) {
  function checkCollisionWithObject(objLocation) {
    if ((objLocation[0] >= roidX - size && objLocation[0] <= roidX + size)
     && (objLocation[1] >= roidY - size && objLocation[1] <= roidY + size)
     && (objLocation[2] >= roidZ - size && objLocation[2] <= roidZ + size)) {
      // Object collision!
      return true;
    }
  }

  var roidX = asteroid.location[0];
  var roidY = asteroid.location[1];
  var roidZ = asteroid.location[2];
  var size = asteroid.size;

  if (!player.isImmune && checkCollisionWithObject(player.location)) {
    var shieldPoint = document.getElementById("shield-" + player.shield);
    shieldPoint.style.visibility = "hidden";

    player.shield -= 1;
    // red flashing screen.

    if (player.shield < 1) {
      console.log("Player should die");
    } else {
      // gefum 2 sek í recovery eftir roid bump.
      player.isImmune = true;
      setTimeout(function() { player.isImmune = false; }, 2000);
      /*
      var weightProportion = player.weight / (player.weight + asteroid.weight);
      player.velocity = scale();
      asteroid.velocity = scale();
      */
    }
  }

  for (var i = 0; i < player.Lasers.length; i++) {
    var lasers = player.Lasers[i];
    if (lasers.isActive) {
      if (checkCollisionWithObject(lasers.laser1Location)
          || checkCollisionWithObject(lasers.laser2Location)) {
        lasers.isActive = false;

        // Create new asteroids
        if (asteroid.size > 3) {
          roids.push(new Asteroid(asteroid.size / 2,
                                    asteroid.location,
                                    lasers.sideNormal));
          roids.push(new Asteroid(asteroid.size / 2,
                                    asteroid.location,
                                    negate(lasers.sideNormal)));
        }



        // give player points & show on screen.
        if (asteroid.size == 12) player.points += 1;
        else if (asteroid.size == 6) player.points += 2;
        else player.points += 5;
        displayScore.innerText = player.points;

        // Cleanup dead asteroid
        gl.deleteBuffer(asteroid.normalsBuffer);
        gl.deleteBuffer(asteroid.vertexBuffer);
        var index  = roids.indexOf(asteroid);
        roids.splice(index, 1);
        asteroid = null;

        return true;
      }
    }
  }
}

// Models for .ply files -----------------------------
// Svo það sé ekki hlaðið inn úr .ply skrá fyrir hvert object.

function AsteroidModel() {

  var plyData = PR.read("models/asteroid.ply");

  this.vertices = plyData.points;
  this.normals = plyData.normals;
}

function LaserBeamModel() {

  var plyData = PR.read("models/beam1.ply");

  this.vertices = plyData.points;
  this.normals = plyData.normals;

}


// Object constructors ----------------------------------

function Player() {

  this.lives = 5;

  // Movement ---------------------------------

  this.location = vec3();
  this.direction = vec3(0.0, 0.0, 1.0);
  this.acceleration = 0.01;
  this.velocity = vec3();
  this.weight = 80;
  this.lookSpeed = 1.5;
  this.points = 0;
  this.shield = 5;
  this.isImmune = false;

  this.yaw = 0.0;
  this.pitch = 0.0;

  this.getSpeed = function() {
    // calculate velocity vector length.
    return Math.sqrt(Math.pow(this.velocity[0],2) + Math.pow(this.velocity[1], 2),
                      + Math.pow(this.velocity[2], 2)) * 100;
  }

  // Lasers --------------------------------------

  this.numberOfLasers = 4;
  this.Lasers = [];

  for (var i = 0; i < 4; i++) {
    this.Lasers.push(new LaserBeams());
  }

  this.fireLasers = function() {
    for (var i = 0; i < this.numberOfLasers; i++) {
      if (!this.Lasers[i].isActive) {
        var lasers = this.Lasers[i];
        lasers.direction = this.direction;
        lasers.velocity = add(this.velocity, scale(lasers.speed, this.direction));
        lasers.isActive = true;
        SFX.play("laser");

        //lasers.location = this.location;

        // laser starting placement relative to player camera.
        var rads = Math.atan2(Math.sqrt(dot(cross(this.direction, lasers.initDirection),
                                            cross(this.direction, lasers.initDirection))),
                              dot(this.direction, lasers.initDirection));
        var degrees = -rads * 180 / Math.PI;
        var axis = cross(this.direction, lasers.initDirection);

        var topNormal = getSphericalDirection(this.pitch + 90, this.yaw);

        lasers.sideNormal = cross(topNormal, this.direction);
        lasers.laser1Location = add(this.location, scale(5, lasers.sideNormal));
        lasers.laser1Location = add(lasers.laser1Location, scale(-4, topNormal));
        lasers.laser2Location = add(this.location, scale(5, negate(lasers.sideNormal)));
        lasers.laser2Location = add(lasers.laser2Location, scale(-4, topNormal));
        lasers.transformationMatrix = mult(rotate(degrees, axis), lasers.baseMatrix);

        return;
      }
    }
  }
}


function LaserBeams() {

  // Object data ---------------------------------

  this.vertices = laserBeamModel.vertices;
  this.normals = laserBeamModel.normals;

  this.vSize = this.vertices.length;

  this.color = vec4(0.0, 1.0, 1.0, 1.0);
  this.isActive = false;

  // World coordinates transformation -----------------

  this.laser1Location = vec3();
  this.laser2Location = vec3();
  this.direction = vec3();
  this.speed = 8.0;
  this.velocity = vec3();
  this.transformationMatrix = mat4();
  this.baseMatrix = mult(rotateX(90), scalem(3.0, 10.0, 3.0));
  this.initDirection = vec3(0.0, 0.0, 1.0);
  this.sideNormal = vec3();

  // Buffers ------------------------------------------

  this.nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

  this.vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

}

function Asteroid(size,
                  location = createRandomCoords(),
                  direction = normalize(createRandomCoords())) {

  // Object data ---------------------------------

  this.vertices = asteroidModel.vertices;
  this.normals = asteroidModel.normals;

  this.vSize = this.vertices.length;

  // World coordinates transformation -------------

  this.location = location;
  this.direction = direction;

  if (size == 12) speed = 0.1 + Math.random() * 0.4;
  else if (size == 6) speed = 0.3 + Math.random() * 0.5;
  else if (size == 3) speed = 0.5 + Math.random() * 0.6;

  this.velocity = scale(speed, this.direction);

  // Snúningur
  this.rotAxis = normalize(vec3(Math.random(), Math.random(), Math.random()));
  this.theta = 1.0;
  this.rotateSpeed = 0.1 + Math.random() * 2;

  // 3 stærðir á asteroids í boði
  this.size = size;
  this.scaleMatrix = scalem(size, size, size);

  // Árekstur
  // Notum til að reikna út nýtt velocity við árekstur.
  this.weight = size * 100;

  // Lighting -------------------------------------

  this.ambient = vec4(0.1, 0.1, 0.1, 1.0);
  this.diffuse = vec4(0.7, 0.7, 0.7, 1.0);
  this.specular = vec4(1.0, 1.0, 1.0, 1.0);
  this.shininess = 60.0;

  // Buffers -------------------------------------

  this.normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

}


function Skybox() {

  // Object data ---------------------------------

  this.arrays = getCubeArrays([1.0, 1.0, 1.0]);

  // Buffers -------------------------------------

  this.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(this.arrays.index), gl.STATIC_DRAW);

  this.normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.arrays.normals), gl.STATIC_DRAW);

  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.arrays.vertices), gl.STATIC_DRAW);

  // Texture -------------------------------------

  var imageArray = [
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

  this.texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);

  for (var i = 0; i < 6; i++) {
    gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA,
      gl.UNSIGNED_BYTE, imageArray[i]);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  // Ekki viss af hverju þetta þarf þar sem skyboxið er alltaf eins
  // en það renderar ekki án þess að hafa þetta.
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
}


function Sun() {
  var latitudeBands = 30;
  var longitudeBands = 30;
  var radius = 400;

  // Object data ----------------------------------------

  this.vertices = [];
  this.normals = [];
  this.textureCoords = [];
  for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
      var theta = latNumber * Math.PI / latitudeBands;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);

      for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
          var phi = longNumber * 2 * Math.PI / longitudeBands;
          var sinPhi = Math.sin(phi);
          var cosPhi = Math.cos(phi);

          var x = cosPhi * sinTheta;
          var y = cosTheta;
          var z = sinPhi * sinTheta;
          var u = 1 - (longNumber / longitudeBands);
          var v = 1 - (latNumber / latitudeBands);

          this.normals.push(x);
          this.normals.push(y);
          this.normals.push(z);
          this.textureCoords.push(u);
          this.textureCoords.push(v);
          this.vertices.push(radius * x);
          this.vertices.push(radius * y);
          this.vertices.push(radius * z);
      }
  }

  this.index = [];
  for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
      for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
          var first = (latNumber * (longitudeBands + 1)) + longNumber;
          var second = first + longitudeBands + 1;
          this.index.push(first);
          this.index.push(second);
          this.index.push(first + 1);

          this.index.push(second);
          this.index.push(second + 1);
          this.index.push(first + 1);
      }
  }
  this.size = this.index.length;

  // World coordinates transformation ----------------

  // Tökum ljós stefnuna sem notuð er fyrir lýsingu og staðsetjum
  // sólina í þá átt en í talsverðri fjarlægð.
  var lightVector = vec3(lightPosition[0], lightPosition[1], lightPosition[2]);
  var locationVector = scale(3000, lightVector);
  this.translationMatrix = translate(locationVector);

  this.rotation = 0.0;

  // Buffers -----------------------------------------

  this.iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.index), gl.STATIC_DRAW);

  this.nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

  this.tBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.textureCoords), gl.STATIC_DRAW);

  this.vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

  // Texture ----------------------------------------

  this.texture =  gl.createTexture();
  var image = document.getElementById("tex-sun");

  this.texture = gl.createTexture();
  gl.bindTexture( gl.TEXTURE_2D, this.texture );
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  gl.uniform1i(gl.getUniformLocation(program, "sunTexture"), 0);
}

function SpaceCube() {

  // Object data ----------------------------------

  this.arrays = getCubeArrays([1.0, 1.0, 1.0]);

  // Notum stól-aðferðina (henda í eina grind ef tími)

  // Lighting -------------------------------------

  this.ambient = vec4(0.4, 0.4, 0.4, 1.0);
  this.diffuse = vec4(0.8, 0.8, 0.8, 1.0);
  this.specular = vec4(1.0, 1.0, 1.0, 1.0);
  this.shininess = 60.0;

  // Buffers --------------------------------------

  this.nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.arrays.normals), gl.STATIC_DRAW);

  this.iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(this.arrays.index), gl.STATIC_DRAW);

  this.vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(this.arrays.vertices), gl.STATIC_DRAW);

}


// Draw functions -----------------------------------

function drawAsteroid(asteroid) {

  // Check if this asteroid is colliding with the player or his lasers
  if (isCollision(asteroid, thePlayer)) {
    // Killed by lasers, no need to continue drawing.
    if (roids.indexOf(asteroid) == -1) return;
  }

  asteroid.theta += asteroid.rotateSpeed % 360;
  asteroid.location = add(asteroid.location, asteroid.velocity);

  // Wrap asteroids around
  for (var i = 0; i < 3; i++) {
    if (Math.abs(asteroid.location[i]) > playBoxVertexRadius)
      asteroid.location[i] = -1 * (asteroid.location[i] - asteroid.location[i] % playBoxVertexRadius);
  }

  var ctmRoid = mult(ctm, translate(asteroid.location));
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
  gl.drawArrays(gl.TRIANGLES, 0, asteroid.vSize);
}

function drawSkybox(skybox) {
  gl.depthMask(false);
  gl.uniform1f(locVcoloringMode, 1.0);
  gl.uniform1f(locFcoloringMode, 1.0);

  gl.bindBuffer(gl.ARRAY_BUFFER, skybox.vertexBuffer);
  gl.vertexAttribPointer(locPosition, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, skybox.normalsBuffer);
  gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skybox.indexBuffer);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);

  gl.depthMask(true);
  gl.uniform1f(locVcoloringMode, 0.0);
  gl.uniform1f(locFcoloringMode, 0.0);
}

function drawSun(sun) {
  gl.uniform1f(locVcoloringMode, 2.0);
  gl.uniform1f(locFcoloringMode, 2.0);

  // Smá rotation til að fá smá líf í sólina, þó það sé óraunverulegt.
  sun.rotation += 0.02 % 360;
  var ctmSun = mult(ctm, sun.translationMatrix);
  ctmSun = mult(ctmSun, rotateY(sun.rotation));

  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSun));

  gl.enableVertexAttribArray(locTexCoords);

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.nBuffer);
  gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.tBuffer);
  gl.vertexAttribPointer(locTexCoords, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.vBuffer);
  gl.vertexAttribPointer(locPosition, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sun.iBuffer);

  gl.drawElements(gl.TRIANGLES, sun.size, gl.UNSIGNED_SHORT, 0);

  gl.uniform1f(locVcoloringMode, 0.0);
  gl.uniform1f(locFcoloringMode, 0.0);
  gl.disableVertexAttribArray(locTexCoords);
}

function drawSpaceCube(cubeSide) {

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeSide.nBuffer);
  gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeSide.vBuffer);
  gl.vertexAttribPointer(locPosition, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeSide.iBuffer);

  // 4x uppi
  var ctmSide1 = mult(ctm, translate(0.0, playBoxVertexRadius, playBoxVertexRadius));
  ctmSide1 = mult(ctmSide1, scalem(601.0, 1.0, 1.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide1));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide2 = mult(ctm, translate(playBoxVertexRadius, playBoxVertexRadius, 0.0));
  ctmSide2 = mult(ctmSide2, scalem(1.0, 1.0, 599.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide2));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide3 = mult(ctm, translate(0.0, playBoxVertexRadius, -playBoxVertexRadius));
  ctmSide3 = mult(ctmSide3, scalem(601.0, 1.0, 1.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide3));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide4 = mult(ctm, translate(-playBoxVertexRadius, playBoxVertexRadius, 0.0));
  ctmSide4 = mult(ctmSide4, scalem(1.0, 1.0, 599.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide4));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  // 4x niðri
  var ctmSide5 = mult(ctm, translate(0.0, -playBoxVertexRadius, playBoxVertexRadius));
  ctmSide5 = mult(ctmSide5, scalem(601.0, 1.0, 1.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide5));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide6 = mult(ctm, translate(playBoxVertexRadius, -playBoxVertexRadius, 0.0));
  ctmSide6 = mult(ctmSide6, scalem(1.0, 1.0, 599.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide6));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide7 = mult(ctm, translate(0.0, -playBoxVertexRadius, -playBoxVertexRadius));
  ctmSide7 = mult(ctmSide7, scalem(601.0, 1.0, 1.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide7));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide8 = mult(ctm, translate(-playBoxVertexRadius, -playBoxVertexRadius, 0.0));
  ctmSide8 = mult(ctmSide8, scalem(1.0, 1.0, 599.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide8));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  // 4x milli
  var ctmSide9 = mult(ctm, translate(playBoxVertexRadius, 0.0, playBoxVertexRadius));
  ctmSide9 = mult(ctmSide9, scalem(1.0, 599.0, 1.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide9));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide10 = mult(ctm, translate(-playBoxVertexRadius, 0.0, playBoxVertexRadius));
  ctmSide10 = mult(ctmSide10, scalem(1.0, 599.0, 1.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide10));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide11 = mult(ctm, translate(playBoxVertexRadius, 0.0, -playBoxVertexRadius));
  ctmSide11 = mult(ctmSide11, scalem(1.0, 599.0, 1.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide11));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

  var ctmSide12 = mult(ctm, translate(-playBoxVertexRadius, 0.0, -playBoxVertexRadius));
  ctmSide12 = mult(ctmSide12, scalem(1.0, 599.0, 1.0));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmSide12));
  gl.drawElements(gl.TRIANGLES, cubeSide.arrays.iSize, gl.UNSIGNED_BYTE, 0);

}

function drawLasers(lasers) {
  // Check if laser is outside of playbox
  for (var i = 0; i < 3; i++)
    if (Math.abs(lasers.laser1Location[i]) > playBoxVertexRadius)
      lasers.isActive = false;

  if (lasers.isActive) {
    gl.uniform1f(locVcoloringMode, 3.0);
    gl.uniform1f(locFcoloringMode, 3.0);
    gl.uniform4fv(locColor, lasers.color);

    gl.bindBuffer(gl.ARRAY_BUFFER, lasers.vBuffer);
    gl.vertexAttribPointer(locPosition, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, lasers.nBuffer);
    gl.vertexAttribPointer(locNormal, 4, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lasers.iBuffer);

    lasers.laser1Location = add(lasers.laser1Location, lasers.velocity);
    lasers.laser2Location = add(lasers.laser2Location, lasers.velocity);

    var ctmLaser1 = mult(ctm, translate(lasers.laser1Location));
    var ctmLaser2 = mult(ctm, translate(lasers.laser2Location));
    ctmLaser1 = mult(ctmLaser1, lasers.transformationMatrix);
    ctmLaser2 = mult(ctmLaser2, lasers.transformationMatrix);

    gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmLaser1));

    //gl.drawElements(gl.TRIANGLES, lasers.iSize, gl.UNSIGNED_BYTE, 0);
    gl.drawArrays(gl.TRIANGLES, 0, lasers.vSize);
    gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctmLaser2));
    //gl.drawElements(gl.TRIANGLES, lasers.iSize, gl.UNSIGNED_BYTE, 0);
    gl.drawArrays(gl.TRIANGLES, 0, lasers.vSize);

    gl.uniform1f(locVcoloringMode, 0.0);
    gl.uniform1f(locFcoloringMode, 0.0);
  }
}

function playerMovement(player) {
  player.direction = getSphericalDirection(player.pitch, player.yaw);

	var newLocation = add(player.location, player.velocity);
	// Wrap player if applicable
  for (var i = 0; i < 3; i++) {
    if (Math.abs(newLocation[i]) > playBoxVertexRadius)
      newLocation[i] = -1 * (newLocation[i] - newLocation[i] % playBoxVertexRadius);
	}

  player.location = newLocation;
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Setjum þetta alltaf ef notandi skyldi breyta gluggastærð (aspect ratio).
  setPerspective();

  playerMovement(thePlayer);

  ctm = lookAt(thePlayer.location,
                add(thePlayer.location, thePlayer.direction),
                vec3(0.0, 1.0, 0.0));


  // Færum ljósið með þ.a. það komi alltaf frá sólinni.
  gl.uniform4fv(locLightPos, mult(ctm, lightPosition));
  gl.uniformMatrix4fv(locMvMatrix, false, flatten(ctm));

  // Ekki færa þetta stuff! (nema testa reglulega :)
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, theSun.texture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, theSkybox.texture);


  drawSkybox(theSkybox);
  drawSun(theSun);

  for (var i = 0; i < roids.length; i++) {
    drawAsteroid(roids[i]);
  }

  drawSpaceCube(theSpaceCube);

	for (var i = 0; i < thePlayer.numberOfLasers; i++) {
    if (thePlayer.Lasers[i].isActive)
      drawLasers(thePlayer.Lasers[i]);
  }

  manageKeyInput(thePlayer);

  window.requestAnimFrame(render);
}
