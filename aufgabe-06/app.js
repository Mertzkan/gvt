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

const toggleAnimationButton = document.querySelector('#toggleAnimation');

const stepAnimationButton = document.querySelector('#stepAnimation');

const animationStatus = document.querySelector('#animationStatus');

const ballAngleDisplay = document.querySelector('#ballAngleDisplay');

const torusAngleDisplay = document.querySelector('#torusAngleDisplay');

/* =========================================================
   SHADER
   ========================================================= */

const vertexShaderSource = `

    attribute vec3 aPosition;
    attribute vec3 aNormal;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat3 uNormalMatrix;

    uniform float uUseLighting;

    varying float vLight;

    void main() {

        gl_Position =
            uProjectionMatrix
            * uModelViewMatrix
            * vec4(aPosition, 1.0);


        vec3 transformedNormal =
            normalize(
                uNormalMatrix
                * aNormal
            );


        vec3 lightDirection =
            normalize(
                vec3(
                    0.45,
                    0.80,
                    1.00
                )
            );


        float diffuse =
            max(
                dot(
                    transformedNormal,
                    lightDirection
                ),
                0.0
            );


        float lighting =
            0.34
            + diffuse * 0.66;


        vLight =
            mix(
                1.0,
                lighting,
                uUseLighting
            );

    }

`;

const fragmentShaderSource = `

    precision mediump float;

    uniform vec4 uColor;

    varying float vLight;

    void main() {

        gl_FragColor =
            vec4(
                uColor.rgb * vLight,
                uColor.a
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

function createProgram() {
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);

  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

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

const shaderProgram = createProgram();

gl.useProgram(shaderProgram);

/* =========================================================
   SHADER-POSITIONEN
   ========================================================= */

const shaderLocations = {
  position: gl.getAttribLocation(shaderProgram, 'aPosition'),

  normal: gl.getAttribLocation(shaderProgram, 'aNormal'),

  modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),

  projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),

  normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),

  color: gl.getUniformLocation(shaderProgram, 'uColor'),

  useLighting: gl.getUniformLocation(shaderProgram, 'uUseLighting'),
};

/* =========================================================
   KAMERA
   ========================================================= */

const camera = {
  eye: vec3.fromValues(9.0, 6.6, 11.2),

  center: vec3.fromValues(0.0, 1.4, 0.0),

  up: vec3.fromValues(0.0, 1.0, 0.0),

  vMatrix: mat4.create(),

  pMatrix: mat4.create(),
};

function updateCamera() {
  mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);
}

/* =========================================================
   GRÖSSEN DER SZENE
   ========================================================= */

/*
   Torus:

   großer Radius R = 1.85
   kleiner Radius r = 0.38
*/

const TORUS_MAJOR_RADIUS = 1.85;

const TORUS_MINOR_RADIUS = 0.38;

/*
   Die Kugeln sind jetzt deutlich größer.
*/

const BALL_RADIUS = 0.46;

/*
   Außerhalb des Torus laufen die Kugeln
   auf einer großen Kreisbahn.
*/

const OUTER_ORBIT_RADIUS = 4.2;

/* =========================================================
   FARBEN
   ========================================================= */

const BALL_COLORS = [
  [0.0, 0.88, 0.94, 1.0],

  [0.92, 0.1, 0.82, 1.0],

  [0.08, 0.27, 0.94, 1.0],

  [1.0, 0.82, 0.04, 1.0],
];

const BODY_LINE_COLOR = [0.1, 0.11, 0.14, 1.0];

/* =========================================================
   MODELLE
   ========================================================= */

const models = [];

const ballModels = [];

let torusModel = null;

let gridModel = null;

/* =========================================================
   TORUS-GEOMETRIE
   ========================================================= */

function createTorusGeometry() {
  const positions = [];

  const normals = [];

  const triangleIndices = [];

  const lineIndices = [];

  /*
       Nicht zu viele Segmente verwenden,
       damit das Drahtgitter noch gut
       erkennbar bleibt.
    */

  const majorSegments = 48;

  const minorSegments = 18;

  for (let i = 0; i <= majorSegments; i++) {
    const u = (i / majorSegments) * Math.PI * 2;

    const cosU = Math.cos(u);

    const sinU = Math.sin(u);

    for (let j = 0; j <= minorSegments; j++) {
      const v = (j / minorSegments) * Math.PI * 2;

      const cosV = Math.cos(v);

      const sinV = Math.sin(v);

      const x = (TORUS_MAJOR_RADIUS + TORUS_MINOR_RADIUS * cosV) * cosU;

      const y = TORUS_MINOR_RADIUS * sinV;

      const z = (TORUS_MAJOR_RADIUS + TORUS_MINOR_RADIUS * cosV) * sinU;

      positions.push(x, y, z);

      normals.push(cosV * cosU, sinV, cosV * sinU);
    }
  }

  const rowLength = minorSegments + 1;

  for (let i = 0; i < majorSegments; i++) {
    for (let j = 0; j < minorSegments; j++) {
      const a = i * rowLength + j;

      const b = (i + 1) * rowLength + j;

      const c = a + 1;

      const d = b + 1;

      triangleIndices.push(a, b, c);

      triangleIndices.push(b, d, c);

      /*
               Linien entlang beider
               parametrischen Richtungen.
            */

      lineIndices.push(a, b);

      lineIndices.push(a, c);
    }
  }

  return {
    positions: new Float32Array(positions),

    normals: new Float32Array(normals),

    triangleIndices: new Uint16Array(triangleIndices),

    lineIndices: new Uint16Array(lineIndices),
  };
}

/* =========================================================
   KUGEL-GEOMETRIE
   ========================================================= */

function createSphereGeometry() {
  const positions = [];

  const normals = [];

  const triangleIndices = [];

  const lineIndices = [];

  const latitudeBands = 16;

  const longitudeBands = 24;

  for (let latitude = 0; latitude <= latitudeBands; latitude++) {
    const theta = (latitude * Math.PI) / latitudeBands;

    const sinTheta = Math.sin(theta);

    const cosTheta = Math.cos(theta);

    for (let longitude = 0; longitude <= longitudeBands; longitude++) {
      const phi = (longitude * 2 * Math.PI) / longitudeBands;

      const sinPhi = Math.sin(phi);

      const cosPhi = Math.cos(phi);

      const x = sinTheta * cosPhi;

      const y = cosTheta;

      const z = sinTheta * sinPhi;

      positions.push(x, y, z);

      normals.push(x, y, z);
    }
  }

  const rowLength = longitudeBands + 1;

  for (let latitude = 0; latitude < latitudeBands; latitude++) {
    for (let longitude = 0; longitude < longitudeBands; longitude++) {
      const first = latitude * rowLength + longitude;

      const second = first + rowLength;

      triangleIndices.push(first, second, first + 1);

      triangleIndices.push(second, second + 1, first + 1);

      lineIndices.push(first, second);

      lineIndices.push(first, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),

    normals: new Float32Array(normals),

    triangleIndices: new Uint16Array(triangleIndices),

    lineIndices: new Uint16Array(lineIndices),
  };
}

/* =========================================================
   GITTER-GEOMETRIE
   ========================================================= */

function createGridGeometry() {
  const positions = [];

  const normals = [];

  const size = 8;

  const step = 0.5;

  for (let x = -size; x <= size; x += step) {
    positions.push(
      x,
      0,
      -size,

      x,
      0,
      size,
    );

    normals.push(
      0,
      1,
      0,

      0,
      1,
      0,
    );
  }

  for (let z = -size; z <= size; z += step) {
    positions.push(
      -size,
      0,
      z,

      size,
      0,
      z,
    );

    normals.push(
      0,
      1,
      0,

      0,
      1,
      0,
    );
  }

  return {
    positions: new Float32Array(positions),

    normals: new Float32Array(normals),

    triangleIndices: null,

    lineIndices: null,

    drawArraysMode: gl.LINES,
  };
}

/* =========================================================
   GEOMETRIE AUSWÄHLEN
   ========================================================= */

function createGeometry(geometryName) {
  if (geometryName === 'torus') {
    return createTorusGeometry();
  }

  if (geometryName === 'sphere') {
    return createSphereGeometry();
  }

  if (geometryName === 'plane') {
    return createGridGeometry();
  }

  throw new Error('Unbekannte Geometrie: ' + geometryName);
}

/* =========================================================
   BUFFER INITIALISIEREN
   ========================================================= */

function initDataAndBuffers(model, geometryName) {
  const geometry = createGeometry(geometryName);

  model.geometryName = geometryName;

  model.positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, model.positionBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

  model.normalBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);

  model.vertexCount = geometry.positions.length / 3;

  /*
       Dreiecksbuffer
    */

  if (geometry.triangleIndices) {
    model.triangleIndexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.triangleIndexBuffer);

    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      geometry.triangleIndices,
      gl.STATIC_DRAW,
    );

    model.triangleIndexCount = geometry.triangleIndices.length;
  } else {
    model.triangleIndexBuffer = null;

    model.triangleIndexCount = 0;
  }

  /*
       Linienbuffer
    */

  if (geometry.lineIndices) {
    model.lineIndexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.lineIndexBuffer);

    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      geometry.lineIndices,
      gl.STATIC_DRAW,
    );

    model.lineIndexCount = geometry.lineIndices.length;
  } else {
    model.lineIndexBuffer = null;

    model.lineIndexCount = 0;
  }

  model.drawArraysMode = geometry.drawArraysMode || null;
}

/* =========================================================
   TRANSFORMATIONEN INITIALISIEREN
   ========================================================= */

function initTransformations(model, translate, rotate, scale) {
  model.translate = translate.slice();

  model.rotate = rotate.slice();

  model.scale = scale.slice();

  model.mMatrix = mat4.create();

  model.mvMatrix = mat4.create();

  model.normalMatrix = new Float32Array(9);
}

/* =========================================================
   MODELL ERZEUGEN
   ========================================================= */

function createModel(
  geometryName,
  fillstyle,
  color,
  translate,
  rotate,
  scale,
  strokeColor = BODY_LINE_COLOR,
) {
  const model = {};

  model.fillstyle = fillstyle;

  model.color = color.slice();

  model.strokeColor = strokeColor.slice();

  initDataAndBuffers(model, geometryName);

  initTransformations(model, translate, rotate, scale);

  models.push(model);

  return model;
}

const SCENE_Y_OFFSET = 2.0;

/* =========================================================
   SZENE INITIALISIEREN
   ========================================================= */

function initModels() {
  /*
       -----------------------------------------------------
       TORUS
       -----------------------------------------------------
    */

  torusModel = createModel(
    'torus',
    'fill',

    [0.72, 0.76, 0.82, 1.0],

    [0, SCENE_Y_OFFSET, 0],

    [0, 0, 0],

    [1, 1, 1],

    [0.16, 0.18, 0.22, 1.0],
  );

  /*
       -----------------------------------------------------
       GITTER
       -----------------------------------------------------
    */

  gridModel = createModel(
    'plane',
    'wireframe',

    [0.52, 0.56, 0.62, 1.0],

    [0, -3.0, 0],

    [0, 0, 0],

    [1, 1, 1],

    [0.52, 0.56, 0.62, 1.0],
  );

  /*
       -----------------------------------------------------
       VIER GROSSE KUGELN
       -----------------------------------------------------
    */

  for (let i = 0; i < 4; i++) {
    const ball = createModel(
      'sphere',
      'fill',

      BALL_COLORS[i],

      [0, 0, 0],

      [0, 0, 0],

      [BALL_RADIUS, BALL_RADIUS, BALL_RADIUS],

      [0.08, 0.09, 0.12, 1.0],
    );

    ball.baseScale = BALL_RADIUS;

    ballModels.push(ball);
  }
}

/* =========================================================
   TRANSFORMATIONEN BERECHNEN
   ========================================================= */

function updateTransformations(model) {
  const mMatrix = model.mMatrix;

  const mvMatrix = model.mvMatrix;

  mat4.identity(mMatrix);

  mat4.identity(mvMatrix);

  mat4.translate(mMatrix, mMatrix, model.translate);

  mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);

  mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);

  mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);

  mat4.scale(mMatrix, mMatrix, model.scale);

  mat4.multiply(mvMatrix, camera.vMatrix, mMatrix);

  /*
       Da alle Modelle gleichmäßig skaliert
       werden, kann der Rotationsanteil der
       Model-View-Matrix für die Normalen
       verwendet werden.

       Der Shader normalisiert die Normale
       anschließend erneut.
    */

  const n = model.normalMatrix;

  n[0] = mvMatrix[0];
  n[1] = mvMatrix[1];
  n[2] = mvMatrix[2];

  n[3] = mvMatrix[4];
  n[4] = mvMatrix[5];
  n[5] = mvMatrix[6];

  n[6] = mvMatrix[8];
  n[7] = mvMatrix[9];
  n[8] = mvMatrix[10];
}

/* =========================================================
   SHADER-DATEN BINDEN
   ========================================================= */

function bindModelData(model) {
  gl.bindBuffer(gl.ARRAY_BUFFER, model.positionBuffer);

  gl.vertexAttribPointer(shaderLocations.position, 3, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(shaderLocations.position);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);

  gl.vertexAttribPointer(shaderLocations.normal, 3, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(shaderLocations.normal);

  gl.uniformMatrix4fv(shaderLocations.modelViewMatrix, false, model.mvMatrix);

  gl.uniformMatrix4fv(shaderLocations.projectionMatrix, false, camera.pMatrix);

  gl.uniformMatrix3fv(shaderLocations.normalMatrix, false, model.normalMatrix);
}

/* =========================================================
   GEFÜLLTE FLÄCHE ZEICHNEN
   ========================================================= */

function drawSurface(model) {
  if (!model.triangleIndexBuffer || model.fillstyle === 'wireframe') {
    return;
  }

  bindModelData(model);

  gl.uniform4fv(shaderLocations.color, model.color);

  gl.uniform1f(shaderLocations.useLighting, 1.0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.triangleIndexBuffer);

  /*
       Oberfläche minimal nach hinten
       verschieben, damit das Drahtgitter
       anschließend sauber sichtbar bleibt.
    */

  gl.enable(gl.POLYGON_OFFSET_FILL);

  gl.polygonOffset(1.0, 1.0);

  gl.drawElements(gl.TRIANGLES, model.triangleIndexCount, gl.UNSIGNED_SHORT, 0);

  gl.disable(gl.POLYGON_OFFSET_FILL);
}

/* =========================================================
   LINIEN ZEICHNEN
   ========================================================= */

function drawLines(model) {
  bindModelData(model);

  gl.uniform4fv(shaderLocations.color, model.strokeColor);

  gl.uniform1f(shaderLocations.useLighting, 0.0);

  if (model.lineIndexBuffer) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.lineIndexBuffer);

    gl.drawElements(gl.LINES, model.lineIndexCount, gl.UNSIGNED_SHORT, 0);

    return;
  }

  if (model.drawArraysMode) {
    gl.drawArrays(model.drawArraysMode, 0, model.vertexCount);
  }
}

/* =========================================================
   MODELL ZEICHNEN
   ========================================================= */

function drawModel(model) {
  if (model.fillstyle === 'wireframe') {
    drawLines(model);

    return;
  }

  drawSurface(model);

  drawLines(model);
}

/* =========================================================
   CANVAS-GRÖSSE
   ========================================================= */

function resizeCanvasToDisplaySize() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const width = Math.round(canvas.clientWidth * pixelRatio);

  const height = Math.round(canvas.clientHeight * pixelRatio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;

    canvas.height = height;
  }
}

/* =========================================================
   RENDERN
   ========================================================= */

function render() {
  resizeCanvasToDisplaySize();

  gl.viewport(0, 0, canvas.width, canvas.height);

  const aspect = canvas.width / canvas.height;

  mat4.perspective(
    camera.pMatrix,

    (45 * Math.PI) / 180,

    aspect,

    0.1,

    100,
  );

  gl.clearColor(0.95, 0.96, 0.97, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);

  gl.depthFunc(gl.LEQUAL);

  gl.useProgram(shaderProgram);

  for (let i = 0; i < models.length; i++) {
    updateTransformations(models[i]);

    drawModel(models[i]);
  }
}
/* =========================================================
   ANIMATION
   ========================================================= */

/*
   Die Animation läuft direkt nach dem Laden.
*/

let animationRunning = true;

let animationTime = 0;

let previousAnimationFrameTime = null;

/* =========================================================
   ZEITLICHER ABLAUF
   ========================================================= */

/*
   Ein Abschnitt für eine Kugel besteht aus:

   3 Sekunden:
   Alle vier Kugeln bewegen sich gemeinsam
   auf der äußeren Kreisbahn.

   5 Sekunden:
   Eine Kugel führt ihre kreisförmige
   Solo-Bahn durch den Torus aus.

   Danach ist die nächste Kugel an der Reihe.
*/

const OUTER_ORBIT_DURATION = 3.0;

const SOLO_DURATION = 5.0;

const SLOT_DURATION = OUTER_ORBIT_DURATION + SOLO_DURATION;

/*
   Geschwindigkeit der gemeinsamen
   äußeren Kreisbewegung.

   20 Grad pro Sekunde.
*/

const OUTER_ORBIT_SPEED = (20 * Math.PI) / 180;

/*
   Ein manueller Tastenschritt.
*/

const MANUAL_TIME_STEP = 0.16;

/* =========================================================
   SOLO-KREIS
   ========================================================= */

/*
   Die Solo-Bahn ist ein echter Kreis.

   Der äußere Bahnradius beträgt:

   4.20

   Der Solo-Kreis besitzt den halben Radius:

   2.10

   Dadurch hat der Kreis einen Durchmesser
   von 4.20.

   Ein Punkt des Kreises liegt deshalb
   auf der äußeren Bahn.

   Der gegenüberliegende Punkt befindet
   sich exakt im Mittelpunkt des Torus.
*/

const SOLO_CIRCLE_RADIUS = OUTER_ORBIT_RADIUS / 2;

/* =========================================================
   TORUSROTATION
   ========================================================= */

/*
   Der Torus wird gleichzeitig um mehrere
   Achsen gedreht.

   Die zusätzlichen Sinus- und
   Kosinusanteile verhindern eine einfache
   "Autoreifenrotation".
*/

function updateTorusRotation() {
  const t = animationTime;

  torusModel.rotate[0] = 0.72 + t * 0.16 + Math.sin(t * 0.53) * 0.32;

  torusModel.rotate[1] = 0.32 + t * 0.21 + Math.cos(t * 0.37) * 0.24;

  torusModel.rotate[2] = 0.18 + t * 0.13 + Math.sin(t * 0.61) * 0.28;
}

/* =========================================================
   AKTUELLE TORUSROTATION ALS MATRIX
   ========================================================= */

/*
   Diese Matrix wird nicht nur für den
   Torus selbst verwendet.

   Auch die Kugelbahnen werden damit
   räumlich ausgerichtet.

   Dadurch bewegen sich Torus und Kugeln
   synchron.
*/

function createCurrentTorusRotationMatrix() {
  const matrix = mat4.create();

  mat4.rotateX(matrix, matrix, torusModel.rotate[0]);

  mat4.rotateY(matrix, matrix, torusModel.rotate[1]);

  mat4.rotateZ(matrix, matrix, torusModel.rotate[2]);

  return matrix;
}

/* =========================================================
   AKTUELLEN ZEITABSCHNITT BESTIMMEN
   ========================================================= */

function getAnimationPhase() {
  /*
       Nummer des aktuellen 8-Sekunden-
       Abschnitts.
    */

  const slotIndex = Math.floor(animationTime / SLOT_DURATION);

  /*
       Lokale Zeit innerhalb dieses
       Abschnitts.
    */

  const slotTime = animationTime % SLOT_DURATION;

  /*
       Die aktive Kugel wechselt nach
       jedem Abschnitt:

       0 -> Cyan
       1 -> Magenta
       2 -> Blau
       3 -> Gelb
       danach wieder 0
    */

  const activeBallIndex = slotIndex % 4;

  /*
       Wie viel tatsächliche Zeit wurde
       bislang auf der gemeinsamen
       äußeren Kreisbahn verbracht?

       Während des Solo-Durchflugs
       wird diese Uhr angehalten.

       Dadurch bleibt der Einstiegspunkt
       der Solo-Kreisbahn unverändert.
    */

  const completedOrbitPhases = slotIndex * OUTER_ORBIT_DURATION;

  const currentOrbitTime = Math.min(slotTime, OUTER_ORBIT_DURATION);

  const orbitTime = completedOrbitPhases + currentOrbitTime;

  const outerAngle = orbitTime * OUTER_ORBIT_SPEED;

  /*
       Befinden wir uns bereits im
       Solo-Abschnitt?
    */

  const soloActive = slotTime >= OUTER_ORBIT_DURATION;

  let soloProgress = 0;

  if (soloActive) {
    soloProgress = (slotTime - OUTER_ORBIT_DURATION) / SOLO_DURATION;
  }

  return {
    activeBallIndex,
    outerAngle,
    soloActive,
    soloProgress,
  };
}

/* =========================================================
   NORMALE ÄUSSERE KREISBAHN
   ========================================================= */

function calculateOuterOrbitPosition(ballIndex, outerAngle) {
  /*
       Die vier Kugeln besitzen auf der
       äußeren Kreisbahn einen festen
       Abstand von 90 Grad.
    */

  const phase = (ballIndex * Math.PI) / 2;

  const angle = outerAngle + phase;

  /*
       Kreisbahn in der lokalen XZ-Ebene
       des Torus.
    */

  return vec3.fromValues(
    OUTER_ORBIT_RADIUS * Math.cos(angle),

    0,

    OUTER_ORBIT_RADIUS * Math.sin(angle),
  );
}

/* =========================================================
   KREISFÖRMIGE SOLO-BAHN
   ========================================================= */

/*
   Diese Funktion ist der entscheidende
   Unterschied zur vorherigen Version.

   Wir interpolieren NICHT mehr zwischen
   mehreren geraden Bewegungsabschnitten.

   Stattdessen bewegt sich die aktive
   Kugel auf EINEM echten Kreis.
*/

function calculateSoloCirclePosition(ballIndex, outerAngle, progress) {
  /*
       Die aktive Kugel besitzt weiterhin
       ihre normale Phasenverschiebung.
    */

  const phase = (ballIndex * Math.PI) / 2;

  /*
       Dieser Winkel bestimmt die Richtung,
       in der sich der Startpunkt der
       Solo-Bahn relativ zum Torus befindet.
    */

  const radialAngle = outerAngle + phase;

  /*
       Solo-Winkel:

       progress = 0
       -> 0 Grad

       progress = 0.5
       -> 180 Grad
       -> Mittelpunkt des Torus

       progress = 1
       -> 360 Grad
       -> zurück zum Ausgangspunkt
    */

  const soloAngle = progress * Math.PI * 2;

  /*
       -----------------------------------------------------
       KREISGLEICHUNG

       Der Mittelpunkt dieses Solo-Kreises
       liegt um SOLO_CIRCLE_RADIUS vom
       Toruszentrum entfernt.

       Der Kreis besitzt ebenfalls
       SOLO_CIRCLE_RADIUS als Radius.

       Dadurch läuft er durch:

       1. den äußeren Startpunkt
       2. das Zentrum des Torus
       3. zurück zum äußeren Startpunkt
       -----------------------------------------------------
    */

  /*
       Radialer Abstand zur Y-Achse
       des Torus.
    */

  const radialDistance = SOLO_CIRCLE_RADIUS * (1 + Math.cos(soloAngle));

  /*
       Höhe auf dem Kreis.
    */

  const y = SOLO_CIRCLE_RADIUS * Math.sin(soloAngle);

  /*
       Aus radialDistance und radialAngle
       werden wieder x und z berechnet.
    */

  const x = radialDistance * Math.cos(radialAngle);

  const z = radialDistance * Math.sin(radialAngle);

  return vec3.fromValues(x, y, z);
}

/* =========================================================
   ANIMIERTE OBJEKTE AKTUALISIEREN
   ========================================================= */

function updateAnimatedObjects() {
  /*
       Zuerst wird die aktuelle
       Torusrotation berechnet.
    */

  updateTorusRotation();

  /*
       Danach bestimmen wir, wo wir uns
       innerhalb der Choreografie befinden.
    */

  const phase = getAnimationPhase();

  /*
       Die aktuelle Torusorientierung wird
       anschließend auch auf die Kugelbahnen
       angewendet.
    */

  const torusRotationMatrix = createCurrentTorusRotationMatrix();

  for (let i = 0; i < ballModels.length; i++) {
    const model = ballModels[i];

    let localPosition;

    /*
           -------------------------------------------------
           SOLO

           Genau eine Kugel verlässt
           während ihres Solo-Zeitfensters
           die äußere Kreisbahn.
           -------------------------------------------------
        */

    if (phase.soloActive && i === phase.activeBallIndex) {
      localPosition = calculateSoloCirclePosition(
        i,
        phase.outerAngle,
        phase.soloProgress,
      );
    } else {
      /*
           -------------------------------------------------
           ÄUSSERE KREISBAHN

           Alle anderen Kugeln bleiben
           auf der großen Kreisbahn.
           -------------------------------------------------
        */
      localPosition = calculateOuterOrbitPosition(i, phase.outerAngle);
    }

    /*
           -------------------------------------------------
           SYNCHRONISATION MIT DEM TORUS

           Die lokale Kreisposition wird
           mit der aktuellen räumlichen
           Rotation des Torus transformiert.
           -------------------------------------------------
        */

    const worldPosition = vec3.create();

    vec3.transformMat4(worldPosition, localPosition, torusRotationMatrix);

    model.translate[0] = worldPosition[0];

    model.translate[1] = worldPosition[1] + SCENE_Y_OFFSET;

    model.translate[2] = worldPosition[2];

    /*
           -------------------------------------------------
           EIGENROTATION DER KUGELN

           Wegen des Drahtgitters auf den
           Kugeln ist diese Rotation sichtbar.
           -------------------------------------------------
        */

    model.rotate[0] = animationTime * (0.72 + i * 0.05);

    model.rotate[1] = animationTime * (0.94 + i * 0.07);

    model.rotate[2] = animationTime * (0.48 + i * 0.04);

    /*
           Alle Kugeln bleiben gleich groß.

           Dadurch bleibt auch die
           Kollisionsberechnung eindeutig.
        */

    model.scale[0] = model.baseScale;

    model.scale[1] = model.baseScale;

    model.scale[2] = model.baseScale;
  }
}

/* =========================================================
   WARUM DIE SOLO-BAHN DEN TORUS NICHT BERÜHRT
   ========================================================= */

/*
   Torus:

   großer Radius:
   R = 1.85

   kleiner Radius:
   r = 0.38

   Kugelradius:
   rk = 0.46

   Sicherheitsradius um die Torusröhre:

   r + rk
   = 0.84


   Solo-Kreis:

   Radius:
   4.20 / 2
   = 2.10


   Mittelpunkt des Solo-Kreises:

   Abstand 2.10 vom Toruszentrum.


   In der Schnittebene liegt der Mittelpunkt
   der Torusröhre bei Abstand 1.85.

   Abstand zwischen den beiden
   Kreismittelpunkten:

   |2.10 - 1.85|
   = 0.25


   Der Solo-Kreis umschließt den gesamten
   Sicherheitsbereich der Torusröhre.

   0.25 + 0.84
   = 1.09

   und:

   1.09 < 2.10


   Deshalb schneidet die Kreisbahn der
   Kugel den Sicherheitsbereich des Torus
   nicht.

   Der Durchflug erfolgt durch das
   Zentrum des freien Toruslochs.
*/

/* =========================================================
   STATUSANZEIGE
   ========================================================= */

function radiansToDegrees(radians) {
  let degrees = (radians * 180) / Math.PI;

  degrees = degrees % 360;

  if (degrees < 0) {
    degrees += 360;
  }

  return degrees;
}

function updateStatusDisplay() {
  const phase = getAnimationPhase();

  ballAngleDisplay.textContent =
    radiansToDegrees(phase.outerAngle).toFixed(0) + '°';

  torusAngleDisplay.textContent =
    radiansToDegrees(torusModel.rotate[1]).toFixed(0) + '°';

  animationStatus.textContent = animationRunning ? 'Läuft' : 'Pausiert';
}

/* =========================================================
   BEDIENELEMENTE AKTUALISIEREN
   ========================================================= */

function updateControls() {
  toggleAnimationButton.setAttribute('aria-pressed', String(animationRunning));

  toggleAnimationButton.classList.toggle('active', animationRunning);

  toggleAnimationButton.textContent = animationRunning
    ? 'Animation pausieren'
    : 'Animation starten';

  stepAnimationButton.disabled = animationRunning;
}

/* =========================================================
   EINZELSCHRITT
   ========================================================= */

function performSingleStep() {
  animationTime += MANUAL_TIME_STEP;

  updateAnimatedObjects();

  updateStatusDisplay();

  render();
}

/* =========================================================
   START / PAUSE BUTTON
   ========================================================= */

toggleAnimationButton.addEventListener('click', function () {
  animationRunning = !animationRunning;

  updateControls();

  updateStatusDisplay();
});

/* =========================================================
   EINZELSCHRITT-BUTTON
   ========================================================= */

stepAnimationButton.addEventListener('click', function () {
  if (animationRunning) {
    return;
  }

  performSingleStep();
});

/* =========================================================
   TASTE K
   ========================================================= */

/*
   Wenn die Animation läuft:

   K
   -> pausieren
   -> einen Schritt ausführen

   Wenn die Animation bereits pausiert:

   K
   -> einen weiteren Schritt ausführen
*/

window.addEventListener('keydown', function (event) {
  if (event.key.toLowerCase() !== 'k') {
    return;
  }

  event.preventDefault();

  if (animationRunning) {
    animationRunning = false;

    updateControls();
  }

  performSingleStep();
});

/* =========================================================
   ANIMATIONSLOOP
   ========================================================= */

function animate(currentTime) {
  if (previousAnimationFrameTime === null) {
    previousAnimationFrameTime = currentTime;
  }

  let deltaTime = (currentTime - previousAnimationFrameTime) / 1000;

  /*
       Große Sprünge verhindern,
       zum Beispiel nach einem Wechsel
       des Browser-Tabs.
    */

  deltaTime = Math.min(deltaTime, 0.1);

  previousAnimationFrameTime = currentTime;

  if (animationRunning) {
    animationTime += deltaTime;

    updateAnimatedObjects();

    updateStatusDisplay();

    render();
  }

  requestAnimationFrame(animate);
}

/* =========================================================
   FENSTERGRÖSSE
   ========================================================= */

window.addEventListener('resize', function () {
  render();
});

/* =========================================================
   INITIALISIERUNG
   ========================================================= */

function init() {
  /*
       Feste Kamera.
    */

  updateCamera();

  /*
       Torus, Kugeln und Gitter erzeugen.
    */

  initModels();

  /*
       Ausgangszustand berechnen.

       Bei t = 0 liegen alle vier Kugeln
       auf der äußeren Kreisbahn.
    */

  updateAnimatedObjects();

  updateStatusDisplay();

  updateControls();

  render();

  /*
       Animation läuft automatisch.
    */

  requestAnimationFrame(animate);
}

init();
