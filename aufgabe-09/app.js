'use strict';

/* =========================================================
   CANVAS UND WEBGL
   ========================================================= */

const canvas = document.querySelector('#sceneCanvas');

const gl = canvas.getContext('webgl');

if (!gl) {
  throw new Error('WebGL konnte nicht initialisiert werden.');
}

/* =========================================================
   HTML-ELEMENTE
   ========================================================= */

const textureModeStatus = document.querySelector('#textureModeStatus');

const textureLoadStatus = document.querySelector('#textureLoadStatus');

const cameraStatus = document.querySelector('#cameraStatus');

const cameraAzimuthDisplay = document.querySelector('#cameraAzimuthDisplay');

const cameraElevationDisplay = document.querySelector(
  '#cameraElevationDisplay',
);

const toggleCameraButton = document.querySelector('#toggleCamera');

const topViewButton = document.querySelector('#topView');

const textureModeButtons = document.querySelectorAll('.mode-button');

/*
   Neue Elemente für die
   Lichtsteuerung.
*/

const lightAngleDisplay = document.querySelector('#lightAngleDisplay');

const moveLightButton = document.querySelector('#moveLight');

/* =========================================================
   VERTEX-SHADER
   ========================================================= */

const vertexShaderSource = `

  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aTextureCoord;


  uniform mat4 uPMatrix;
  uniform mat4 uMVMatrix;
  uniform mat3 uNMatrix;


  varying vec2 vTextureCoord;

  varying vec3 vPositionEye;
  varying vec3 vNormalEye;


  void main() {

    /*
       Vertexposition in Eye Coordinates.
    */

    vec4 tPosition =

      uMVMatrix
      *
      vec4(
        aPosition,
        1.0
      );


    /*
       Projektion.
    */

    gl_Position =

      uPMatrix
      *
      tPosition;


    /*
       Normale transformieren.
    */

    vec3 tNormal =

      normalize(
        uNMatrix
        *
        aNormal
      );


    /*
       Entsprechend TXR werden
       die Texturkoordinaten an den
       Fragment-Shader weitergegeben.
    */

    vTextureCoord =
      aTextureCoord;


    vPositionEye =
      tPosition.xyz;


    vNormalEye =
      tNormal;

  }

`;

/* =========================================================
   FRAGMENT-SHADER
   ========================================================= */

/*
   uTextureMode:

   0 = Bildtextur
   1 = prozedurale Textur


   uTime:

   Zeitwert für die Animation der
   prozeduralen Textur.
*/

const fragmentShaderSource = `

  precision mediump float;


  uniform sampler2D uTexture;

  uniform int uTextureMode;

  uniform vec3 uLightPositionEye;

  uniform float uTime;


  varying vec2 vTextureCoord;

  varying vec3 vPositionEye;
  varying vec3 vNormalEye;


  const float TAU =
    6.28318530718;



  /* =====================================================
     PROZEDURALE TEXTUR
     ===================================================== */

  vec3 createProceduralTexture(
    vec2 uv
  ) {

    /*
       UV 0 ... 1 wird auf
       0 ... 2 PI abgebildet.

       Dadurch können periodische
       Funktionen benutzt werden,
       deren Anfang und Ende an der
       Torusnaht zusammenpassen.
    */

    float u =
      uv.x
      *
      TAU;


    float v =
      uv.y
      *
      TAU;


    /*
       Langsame Bewegung.

       Der Effekt soll an fließendes
       Wasser beziehungsweise bewegten
       Marmor erinnern.
    */

    float time =
      uTime
      *
      0.55;



    /* =================================================
       GROSSE WELLEN
       ================================================= */

    float wave1 =

      sin(

        5.0
        *
        u

        +

        1.35
        *
        sin(

          3.0
          *
          v

          -

          time
          *
          1.10

        )

        +

        time
        *
        0.75

      );



    float wave2 =

      sin(

        4.0
        *
        v

        +

        1.10
        *
        cos(

          2.0
          *
          u

          +

          time
          *
          0.60

        )

        -

        time
        *
        0.50

      );



    float wave3 =

      cos(

        3.0
        *
        u

        -

        5.0
        *
        v

        +

        time
        *
        0.35

      );



    /*
       Wellen kombinieren.
    */

    float pattern =

      wave1
      *
      0.56

      +

      wave2
      *
      0.29

      +

      wave3
      *
      0.15;


    /*
       Auf 0 ... 1 abbilden.
    */

    pattern =

      pattern
      *
      0.5

      +

      0.5;


    pattern =

      clamp(
        pattern,
        0.0,
        1.0
      );



    /* =================================================
       FARBPALETTE
       ================================================= */

    vec3 darkColor =

      vec3(
        0.012,
        0.060,
        0.085
      );


    vec3 deepColor =

      vec3(
        0.015,
        0.20,
        0.27
      );


    vec3 turquoiseColor =

      vec3(
        0.025,
        0.54,
        0.61
      );


    vec3 lightColor =

      vec3(
        0.64,
        0.91,
        0.88
      );



    /*
       Dunkel zu tiefem Petrol.
    */

    vec3 color =

      mix(

        darkColor,

        deepColor,

        smoothstep(
          0.08,
          0.38,
          pattern
        )

      );



    /*
       Türkise Bereiche.
    */

    color =

      mix(

        color,

        turquoiseColor,

        smoothstep(
          0.35,
          0.72,
          pattern
        )

      );



    /*
       Helle Bereiche.
    */

    color =

      mix(

        color,

        lightColor,

        smoothstep(
          0.74,
          0.96,
          pattern
        )

      );



    /* =================================================
       FEINE ADERN
       ================================================= */

    float veinSignal =

      abs(

        sin(

          8.0
          *
          u

          +

          2.0
          *
          sin(

            4.0
            *
            v

            +

            time
            *
            0.45

          )

          +

          time
          *
          0.25

        )

      );


    float veinMask =

      1.0

      -

      smoothstep(
        0.045,
        0.16,
        veinSignal
      );


    color =

      mix(

        color,

        vec3(
          0.79,
          0.96,
          0.93
        ),

        veinMask
        *
        0.36

      );



    /* =================================================
       FEINE DETAILS
       ================================================= */

    float detail =

      0.5

      +

      0.5
      *
      sin(

        11.0
        *
        u

        -

        7.0
        *
        v

        +

        0.35
        *
        sin(
          5.0
          *
          v
        )

        -

        time
        *
        0.40

      );


    color *=

      0.94

      +

      detail
      *
      0.06;


    return color;

  }



  /* =====================================================
     MAIN
     ===================================================== */

  void main() {

    vec3 baseColor;



    /* =================================================
       BILDTEXTUR
       ================================================= */

    if (
      uTextureMode == 0
    ) {

      baseColor =

        texture2D(

          uTexture,

          vTextureCoord

        ).rgb;

    }



    /* =================================================
       PROZEDURALE TEXTUR
       ================================================= */

    else {

      baseColor =

        createProceduralTexture(
          vTextureCoord
        );

    }



    /* =================================================
       BELEUCHTUNG
       ================================================= */

    vec3 normal =

      normalize(
        vNormalEye
      );


    vec3 lightDirection =

      normalize(

        uLightPositionEye

        -

        vPositionEye

      );


    float diffuse =

      max(

        dot(
          normal,
          lightDirection
        ),

        0.0

      );



    /*
       Blickrichtung zur Kamera.
    */

    vec3 viewDirection =

      normalize(
        -vPositionEye
      );



    /*
       Spekulares Licht.
    */

    vec3 reflectionDirection =

      reflect(
        -lightDirection,
        normal
      );


    float specular =

      pow(

        max(

          dot(
            reflectionDirection,
            viewDirection
          ),

          0.0

        ),

        32.0

      );



    /*
       Auch auf der Schattenseite
       bleibt die Textur sichtbar.
    */

    float lightFactor =

      0.34

      +

      diffuse
      *
      0.66;


    vec3 finalColor =

      baseColor
      *
      lightFactor;



    /*
       Dezentes weißes Glanzlicht.
    */

    finalColor +=

      vec3(
        specular
        *
        0.18
      );



    /*
       Leichter Rim-Effekt.
    */

    float rim =

      1.0

      -

      max(

        dot(
          normal,
          viewDirection
        ),

        0.0

      );


    rim =

      pow(
        rim,
        3.0
      );


    finalColor +=

      baseColor
      *
      rim
      *
      0.07;


    finalColor =

      clamp(
        finalColor,
        0.0,
        1.0
      );


    gl_FragColor =

      vec4(
        finalColor,
        1.0
      );

  }

`;

/* =========================================================
   SHADER ERZEUGEN
   ========================================================= */

function createShader(type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);

    gl.deleteShader(shader);

    throw new Error('Shader-Fehler:\n' + message);
  }

  return shader;
}

/* =========================================================
   SHADER-PROGRAMM
   ========================================================= */

function createProgram() {
  const vertexShader = createShader(
    gl.VERTEX_SHADER,

    vertexShaderSource,
  );

  const fragmentShader = createShader(
    gl.FRAGMENT_SHADER,

    fragmentShaderSource,
  );

  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);

  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);

    gl.deleteProgram(program);

    throw new Error('Programm-Link-Fehler:\n' + message);
  }

  return program;
}

const prog = createProgram();

gl.useProgram(prog);

/* =========================================================
   ATTRIBUTE
   ========================================================= */

prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');

prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');

prog.textureCoordAttrib = gl.getAttribLocation(prog, 'aTextureCoord');

gl.enableVertexAttribArray(prog.positionAttrib);

gl.enableVertexAttribArray(prog.normalAttrib);

gl.enableVertexAttribArray(prog.textureCoordAttrib);

/* =========================================================
   UNIFORMS
   ========================================================= */

prog.pMatrixUniform = gl.getUniformLocation(prog, 'uPMatrix');

prog.mvMatrixUniform = gl.getUniformLocation(prog, 'uMVMatrix');

prog.nMatrixUniform = gl.getUniformLocation(prog, 'uNMatrix');

prog.textureUniform = gl.getUniformLocation(prog, 'uTexture');

prog.textureModeUniform = gl.getUniformLocation(prog, 'uTextureMode');

prog.lightPositionUniform = gl.getUniformLocation(prog, 'uLightPositionEye');

prog.timeUniform = gl.getUniformLocation(prog, 'uTime');

/* =========================================================
   TEXTURMODUS
   ========================================================= */

/*
   0 = Bildtextur
   1 = prozedurale Textur
*/

let textureMode = 0;

/*
   Animationszeit nur für
   die prozedurale Textur.
*/

let proceduralTime = 0.0;

/* =========================================================
   KAMERA
   ========================================================= */

const camera = {
  eye: vec3.create(),

  center: vec3.fromValues(0.0, 0.0, 0.0),

  up: vec3.fromValues(0.0, 1.0, 0.0),

  vMatrix: mat4.create(),

  pMatrix: mat4.create(),
};

/*
   Genügend Abstand zum Torus.
*/

const CAMERA_RADIUS = 6.3;

let cameraAzimuth = (35 * Math.PI) / 180;

let cameraElevation = (25 * Math.PI) / 180;

const TOP_CAMERA_ELEVATION = (77 * Math.PI) / 180;

const MIN_CAMERA_ELEVATION = (-5 * Math.PI) / 180;

const MAX_CAMERA_ELEVATION = (80 * Math.PI) / 180;

const CAMERA_MANUAL_STEP = (6 * Math.PI) / 180;

let cameraAnimationRunning = false;

const CAMERA_ROTATION_SPEED = (12 * Math.PI) / 180;

let topViewEnabled = false;

let elevationBeforeTopView = cameraElevation;

/* =========================================================
   KAMERA BERECHNEN
   ========================================================= */

function updateCamera() {
  const horizontalRadius = CAMERA_RADIUS * Math.cos(cameraElevation);

  const height = CAMERA_RADIUS * Math.sin(cameraElevation);

  camera.eye[0] = horizontalRadius * Math.sin(cameraAzimuth);

  camera.eye[1] = height;

  camera.eye[2] = horizontalRadius * Math.cos(cameraAzimuth);

  mat4.lookAt(
    camera.vMatrix,

    camera.eye,

    camera.center,

    camera.up,
  );
}

/* =========================================================
   TORUS-MODELL
   ========================================================= */

const model = {
  translate: [0.0, 0.0, 0.0],

  rotate: [1.02, 0.1, 0.2],

  scale: [1.0, 1.0, 1.0],

  mMatrix: mat4.create(),

  mvMatrix: mat4.create(),

  nMatrix: mat3.create(),

  texture: null,

  textureCoord: null,

  vboPosition: null,

  vboNormal: null,

  vboTextureCoord: null,

  ibo: null,

  indexCount: 0,
};

/* =========================================================
   TORUS-GEOMETRIE
   ========================================================= */

function createTorusGeometry() {
  const position = [];

  const normal = [];

  const textureCoord = [];

  const indices = [];

  const majorRadius = 1.55;

  const minorRadius = 0.56;

  const majorSegments = 96;

  const minorSegments = 48;

  /* =====================================================
     VERTICES

     Der erste und letzte Ring werden
     geometrisch doppelt erzeugt.

     Dadurch können sie UV 0 bzw. UV 1
     besitzen und bilden eine saubere
     Texturgrenze.
     ===================================================== */

  for (let i = 0; i <= majorSegments; i++) {
    const u = (i / majorSegments) * Math.PI * 2;

    const cosU = Math.cos(u);

    const sinU = Math.sin(u);

    for (let j = 0; j <= minorSegments; j++) {
      const v = (j / minorSegments) * Math.PI * 2;

      const cosV = Math.cos(v);

      const sinV = Math.sin(v);

      /*
         Position.
      */

      const x = (majorRadius + minorRadius * cosV) * cosU;

      const y = minorRadius * sinV;

      const z = (majorRadius + minorRadius * cosV) * sinU;

      position.push(x, y, z);

      /*
         Normale.
      */

      const nx = cosV * cosU;

      const ny = sinV;

      const nz = cosV * sinU;

      normal.push(nx, ny, nz);

      /*
         Texturkoordinaten.
      */

      const s = i / majorSegments;

      const t = j / minorSegments;

      textureCoord.push(s, t);
    }
  }

  /* =====================================================
     INDIZES
     ===================================================== */

  const rowLength = minorSegments + 1;

  for (let i = 0; i < majorSegments; i++) {
    for (let j = 0; j < minorSegments; j++) {
      const a = i * rowLength + j;

      const b = (i + 1) * rowLength + j;

      const c = a + 1;

      const d = b + 1;

      indices.push(a, b, c);

      indices.push(b, d, c);
    }
  }

  return {
    position: new Float32Array(position),

    normal: new Float32Array(normal),

    textureCoord: new Float32Array(textureCoord),

    indices: new Uint16Array(indices),
  };
}

/* =========================================================
   BUFFER INITIALISIEREN
   ========================================================= */

function initDataAndBuffers(model) {
  const geometry = createTorusGeometry();

  model.textureCoord = geometry.textureCoord;

  /* POSITION */

  model.vboPosition = gl.createBuffer();

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.vboPosition,
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,

    geometry.position,

    gl.STATIC_DRAW,
  );

  /* NORMALE */

  model.vboNormal = gl.createBuffer();

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.vboNormal,
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,

    geometry.normal,

    gl.STATIC_DRAW,
  );

  /*
     TEXTURKOORDINATEN

     Bezeichnung aus TXR:
     model.vboTextureCoord
  */

  model.vboTextureCoord = gl.createBuffer();

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.vboTextureCoord,
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,

    model.textureCoord,

    gl.STATIC_DRAW,
  );

  /* INDEX BUFFER */

  model.ibo = gl.createBuffer();

  gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,

    model.ibo,
  );

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,

    geometry.indices,

    gl.STATIC_DRAW,
  );

  model.indexCount = geometry.indices.length;

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

/* =========================================================
   POWER OF TWO
   ========================================================= */

function isPowerOfTwo(value) {
  return value > 0 && (value & (value - 1)) === 0;
}

/* =========================================================
   BILDTEXTUR LADEN
   ========================================================= */

function initTexture(model, filename) {
  const texture = gl.createTexture();

  model.texture = texture;

  texture.loaded = false;

  /*
     Platzhaltertextur.
  */

  gl.bindTexture(
    gl.TEXTURE_2D,

    texture,
  );

  const placeholderPixel = new Uint8Array([185, 198, 210, 255]);

  gl.texImage2D(
    gl.TEXTURE_2D,

    0,

    gl.RGBA,

    1,
    1,

    0,

    gl.RGBA,

    gl.UNSIGNED_BYTE,

    placeholderPixel,
  );

  gl.texParameteri(
    gl.TEXTURE_2D,

    gl.TEXTURE_MIN_FILTER,

    gl.LINEAR,
  );

  gl.texParameteri(
    gl.TEXTURE_2D,

    gl.TEXTURE_MAG_FILTER,

    gl.LINEAR,
  );

  gl.bindTexture(
    gl.TEXTURE_2D,

    null,
  );

  /*
     Echtes Bild laden.
  */

  texture.image = new Image();

  texture.image.onload = function () {
    onloadTextureImage(texture);
  };

  texture.image.onerror = function () {
    texture.loaded = false;

    textureLoadStatus.textContent = 'Fehler';

    console.error(
      'Die Bildtextur konnte nicht geladen werden:',

      filename,
    );
  };

  texture.image.src = filename;
}

/* =========================================================
   BILDDATEN AN WEBGL ÜBERGEBEN
   ========================================================= */

function onloadTextureImage(texture) {
  texture.loaded = true;

  gl.bindTexture(
    gl.TEXTURE_2D,

    texture,
  );

  gl.pixelStorei(
    gl.UNPACK_FLIP_Y_WEBGL,

    true,
  );

  gl.texImage2D(
    gl.TEXTURE_2D,

    0,

    gl.RGBA,

    gl.RGBA,

    gl.UNSIGNED_BYTE,

    texture.image,
  );

  const width = texture.image.width;

  const height = texture.image.height;

  const powerOfTwo = isPowerOfTwo(width) && isPowerOfTwo(height);

  if (powerOfTwo) {
    gl.texParameteri(
      gl.TEXTURE_2D,

      gl.TEXTURE_MIN_FILTER,

      gl.LINEAR_MIPMAP_LINEAR,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,

      gl.TEXTURE_MAG_FILTER,

      gl.LINEAR,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,

      gl.TEXTURE_WRAP_S,

      gl.REPEAT,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,

      gl.TEXTURE_WRAP_T,

      gl.REPEAT,
    );

    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    gl.texParameteri(
      gl.TEXTURE_2D,

      gl.TEXTURE_MIN_FILTER,

      gl.LINEAR,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,

      gl.TEXTURE_MAG_FILTER,

      gl.LINEAR,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,

      gl.TEXTURE_WRAP_S,

      gl.CLAMP_TO_EDGE,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,

      gl.TEXTURE_WRAP_T,

      gl.CLAMP_TO_EDGE,
    );
  }

  gl.bindTexture(
    gl.TEXTURE_2D,

    null,
  );

  textureLoadStatus.textContent = width + ' × ' + height;

  render();
}

/* =========================================================
   MODELLMATRIZEN
   ========================================================= */

function updateModelMatrices() {
  mat4.identity(model.mMatrix);

  mat4.translate(
    model.mMatrix,

    model.mMatrix,

    model.translate,
  );

  mat4.rotateX(
    model.mMatrix,

    model.mMatrix,

    model.rotate[0],
  );

  mat4.rotateY(
    model.mMatrix,

    model.mMatrix,

    model.rotate[1],
  );

  mat4.rotateZ(
    model.mMatrix,

    model.mMatrix,

    model.rotate[2],
  );

  mat4.scale(
    model.mMatrix,

    model.mMatrix,

    model.scale,
  );

  mat4.multiply(
    model.mvMatrix,

    camera.vMatrix,

    model.mMatrix,
  );

  mat3.normalFromMat4(
    model.nMatrix,

    model.mvMatrix,
  );
}

/* =========================================================
   MODELLDATEN AN SHADER BINDEN
   ========================================================= */

function bindModelData() {
  /*
     Position.
  */

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.vboPosition,
  );

  gl.vertexAttribPointer(
    prog.positionAttrib,

    3,

    gl.FLOAT,

    false,

    0,

    0,
  );

  /*
     Normale.
  */

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.vboNormal,
  );

  gl.vertexAttribPointer(
    prog.normalAttrib,

    3,

    gl.FLOAT,

    false,

    0,

    0,
  );

  /*
     Texture-VBO nach TXR.
  */

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.vboTextureCoord,
  );

  gl.vertexAttribPointer(
    prog.textureCoordAttrib,

    2,

    gl.FLOAT,

    false,

    0,

    0,
  );

  /*
     Matrizen.
  */

  gl.uniformMatrix4fv(
    prog.pMatrixUniform,

    false,

    camera.pMatrix,
  );

  gl.uniformMatrix4fv(
    prog.mvMatrixUniform,

    false,

    model.mvMatrix,
  );

  gl.uniformMatrix3fv(
    prog.nMatrixUniform,

    false,

    model.nMatrix,
  );

  gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,

    model.ibo,
  );
}

/* =========================================================
   TEXTUR BINDEN
   ========================================================= */

function bindTexture() {
  gl.activeTexture(gl.TEXTURE0);

  gl.bindTexture(
    gl.TEXTURE_2D,

    model.texture,
  );

  gl.uniform1i(
    prog.textureUniform,

    0,
  );
}

/* =========================================================
   TORUS ZEICHNEN
   ========================================================= */

function draw() {
  bindModelData();

  bindTexture();

  gl.uniform1i(
    prog.textureModeUniform,

    textureMode,
  );

  /*
     Zeit an den Shader übergeben.
  */

  gl.uniform1f(
    prog.timeUniform,

    proceduralTime,
  );

  gl.drawElements(
    gl.TRIANGLES,

    model.indexCount,

    gl.UNSIGNED_SHORT,

    0,
  );
}

/* =========================================================
   LICHT
   ========================================================= */

/*
   Die bisherige feste Lichtquelle wird
   jetzt auf einer Kreisbahn bewegt.

   Höhe bleibt konstant.

   Der Startwinkel liegt ungefähr bei
   der bisherigen Position
   (4.2, 4.5, 5.0).
*/

const LIGHT_RADIUS = Math.sqrt(4.2 * 4.2 + 5.0 * 5.0);

const LIGHT_HEIGHT = 4.5;

let lightAngle = Math.atan2(5.0, 4.2);

const LIGHT_STEP = (15 * Math.PI) / 180;

const lightWorld = vec4.fromValues(0.0, LIGHT_HEIGHT, 0.0, 1.0);

const lightEye = vec4.create();

/* =========================================================
   LICHTPOSITION IM WELTRAUM
   ========================================================= */

function updateLightWorldPosition() {
  lightWorld[0] = LIGHT_RADIUS * Math.cos(lightAngle);

  lightWorld[1] = LIGHT_HEIGHT;

  lightWorld[2] = LIGHT_RADIUS * Math.sin(lightAngle);

  lightWorld[3] = 1.0;
}

/* =========================================================
   LICHT EINEN SCHRITT BEWEGEN
   ========================================================= */

function moveLightOneStep() {
  lightAngle += LIGHT_STEP;

  /*
     Winkel klein halten.
  */

  lightAngle = lightAngle % (Math.PI * 2);

  updateLightWorldPosition();

  updateStatusDisplay();

  render();
}

/* =========================================================
   LICHT AN SHADER ÜBERGEBEN
   ========================================================= */

function updateLightUniform() {
  /*
     Weltposition in
     Eye Coordinates transformieren.
  */

  vec4.transformMat4(
    lightEye,

    lightWorld,

    camera.vMatrix,
  );

  gl.uniform3f(
    prog.lightPositionUniform,

    lightEye[0],
    lightEye[1],
    lightEye[2],
  );
}

/* =========================================================
   CANVAS-GRÖSSE
   ========================================================= */

function resizeCanvasToDisplaySize() {
  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,

    2,
  );

  const width = Math.round(canvas.clientWidth * pixelRatio);

  const height = Math.round(canvas.clientHeight * pixelRatio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;

    canvas.height = height;
  }
}

/* =========================================================
   RENDER
   ========================================================= */

function render() {
  resizeCanvasToDisplaySize();

  gl.viewport(
    0,
    0,

    canvas.width,
    canvas.height,
  );

  const aspect = canvas.width / canvas.height;

  mat4.perspective(
    camera.pMatrix,

    (42 * Math.PI) / 180,

    aspect,

    0.1,

    100.0,
  );

  gl.clearColor(0.945, 0.955, 0.965, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);

  gl.depthFunc(gl.LEQUAL);

  gl.useProgram(prog);

  updateModelMatrices();

  updateLightUniform();

  draw();
}

/* =========================================================
   GRAD-FUNKTION
   ========================================================= */

function radiansToDegrees(radians) {
  let degrees = (radians * 180) / Math.PI;

  degrees = degrees % 360;

  if (degrees < 0) {
    degrees += 360;
  }

  return degrees;
}

/* =========================================================
   STATUS AKTUALISIEREN
   ========================================================= */

function updateStatusDisplay() {
  /* =====================================================
     TEXTUR
     ===================================================== */

  textureModeStatus.textContent =
    textureMode === 0 ? 'Bildtextur' : 'Prozedural';

  textureModeButtons.forEach(function (button) {
    const buttonMode = button.dataset.textureMode;

    const active =
      (textureMode === 0 && buttonMode === 'image') ||
      (textureMode === 1 && buttonMode === 'procedural');

    button.classList.toggle(
      'active',

      active,
    );

    button.setAttribute(
      'aria-pressed',

      String(active),
    );
  });

  /* =====================================================
     KAMERA
     ===================================================== */

  cameraStatus.textContent = cameraAnimationRunning ? 'Läuft' : 'Pausiert';

  toggleCameraButton.textContent = cameraAnimationRunning
    ? 'Fahrt pausieren'
    : 'Fahrt starten';

  toggleCameraButton.classList.toggle(
    'active',

    cameraAnimationRunning,
  );

  toggleCameraButton.setAttribute(
    'aria-pressed',

    String(cameraAnimationRunning),
  );

  cameraAzimuthDisplay.textContent =
    radiansToDegrees(cameraAzimuth).toFixed(0) + '°';

  cameraElevationDisplay.textContent =
    ((cameraElevation * 180) / Math.PI).toFixed(0) + '°';

  topViewButton.classList.toggle(
    'active',

    topViewEnabled,
  );

  topViewButton.setAttribute(
    'aria-pressed',

    String(topViewEnabled),
  );

  topViewButton.textContent = topViewEnabled ? 'Normale Ansicht' : 'Draufsicht';

  /* =====================================================
     LICHT
     ===================================================== */

  if (lightAngleDisplay) {
    lightAngleDisplay.textContent =
      radiansToDegrees(lightAngle).toFixed(0) + '°';
  }
}

/* =========================================================
   TEXTURMODUS
   ========================================================= */

function setTextureMode(mode) {
  if (mode === 'image') {
    textureMode = 0;
  } else if (mode === 'procedural') {
    textureMode = 1;
  }

  updateStatusDisplay();

  render();
}

/* =========================================================
   KAMERAAUTOMATIK
   ========================================================= */

function toggleCameraAnimation() {
  cameraAnimationRunning = !cameraAnimationRunning;

  updateStatusDisplay();
}

/* =========================================================
   DRAUFSICHT
   ========================================================= */

function toggleTopView() {
  if (topViewEnabled) {
    topViewEnabled = false;

    cameraElevation = elevationBeforeTopView;
  } else {
    topViewEnabled = true;

    elevationBeforeTopView = cameraElevation;

    cameraElevation = TOP_CAMERA_ELEVATION;
  }

  updateCamera();

  updateStatusDisplay();

  render();
}

/* =========================================================
   BUTTONS
   ========================================================= */

textureModeButtons.forEach(function (button) {
  button.addEventListener(
    'click',

    function () {
      setTextureMode(button.dataset.textureMode);
    },
  );
});

toggleCameraButton.addEventListener(
  'click',

  function () {
    toggleCameraAnimation();
  },
);

topViewButton.addEventListener(
  'click',

  function () {
    toggleTopView();
  },
);

/*
   Neuer Licht-Button.
*/

if (moveLightButton) {
  moveLightButton.addEventListener(
    'click',

    function () {
      moveLightOneStep();
    },
  );
}

/* =========================================================
   TASTATUR
   ========================================================= */

window.addEventListener(
  'keydown',

  function (event) {
    const key = event.key.toLowerCase();

    /* =================================================
       K

       Kamerafahrt starten / pausieren.
       ================================================= */

    if (key === 'k') {
      event.preventDefault();

      toggleCameraAnimation();

      return;
    }

    /* =================================================
       L

       Licht um 15 Grad weiterschalten.
       ================================================= */

    if (key === 'l') {
      event.preventDefault();

      moveLightOneStep();

      return;
    }

    /* =================================================
       O

       Draufsicht.
       ================================================= */

    if (key === 'o') {
      event.preventDefault();

      toggleTopView();

      return;
    }

    /* =================================================
       LINKS
       ================================================= */

    if (event.key === 'ArrowLeft') {
      event.preventDefault();

      cameraAzimuth -= CAMERA_MANUAL_STEP;

      updateCamera();

      updateStatusDisplay();

      render();

      return;
    }

    /* =================================================
       RECHTS
       ================================================= */

    if (event.key === 'ArrowRight') {
      event.preventDefault();

      cameraAzimuth += CAMERA_MANUAL_STEP;

      updateCamera();

      updateStatusDisplay();

      render();

      return;
    }

    /* =================================================
       HOCH
       ================================================= */

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      cameraElevation += CAMERA_MANUAL_STEP;

      cameraElevation = Math.min(
        cameraElevation,

        MAX_CAMERA_ELEVATION,
      );

      topViewEnabled = false;

      updateCamera();

      updateStatusDisplay();

      render();

      return;
    }

    /* =================================================
       RUNTER
       ================================================= */

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      cameraElevation -= CAMERA_MANUAL_STEP;

      cameraElevation = Math.max(
        cameraElevation,

        MIN_CAMERA_ELEVATION,
      );

      topViewEnabled = false;

      updateCamera();

      updateStatusDisplay();

      render();
    }
  },
);

/* =========================================================
   ANIMATION
   ========================================================= */

/*
   Dieser Loop hat zwei Aufgaben:

   1. optionale Kamerafahrt
   2. prozedurale Texturanimation


   Das Licht bewegt sich NICHT automatisch.
   Es wird ausschließlich über L bzw.
   den Button verändert.
*/

let previousFrameTime = null;

function animate(currentTime) {
  if (previousFrameTime === null) {
    previousFrameTime = currentTime;
  }

  let deltaTime = (currentTime - previousFrameTime) / 1000;

  /*
     Große Sprünge nach Tabwechseln
     verhindern.
  */

  deltaTime = Math.min(deltaTime, 0.1);

  previousFrameTime = currentTime;

  let needsRender = false;

  /* =====================================================
     AUTOMATISCHE KAMERA
     ===================================================== */

  if (cameraAnimationRunning) {
    cameraAzimuth += CAMERA_ROTATION_SPEED * deltaTime;

    updateCamera();

    updateStatusDisplay();

    needsRender = true;
  }

  /* =====================================================
     PROZEDURALE TEXTUR
     ===================================================== */

  if (textureMode === 1) {
    proceduralTime += deltaTime;

    needsRender = true;
  }

  if (needsRender) {
    render();
  }

  requestAnimationFrame(animate);
}

/* =========================================================
   RESIZE
   ========================================================= */

window.addEventListener(
  'resize',

  function () {
    render();
  },
);

/* =========================================================
   INITIALISIERUNG
   ========================================================= */

function init() {
  /*
     Geometrie und VBOs.
  */

  initDataAndBuffers(model);

  /*
     Bildtextur.
  */

  initTexture(
    model,

    'textures/torus-texture.png',
  );

  /*
     Kamera.
  */

  updateCamera();

  /*
     Anfangsposition des Lichts
     berechnen.
  */

  updateLightWorldPosition();

  /*
     Statusanzeigen.
  */

  updateStatusDisplay();

  /*
     Tiefentest.
  */

  gl.enable(gl.DEPTH_TEST);

  /*
     Erstes Bild.
  */

  render();

  /*
     Animationsloop starten.

     Kamera startet pausiert.

     Die prozedurale Animation wird nur
     sichtbar, wenn der entsprechende
     Texturmodus aktiv ist.
  */

  requestAnimationFrame(animate);
}

init();
