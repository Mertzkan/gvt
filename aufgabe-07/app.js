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

const cameraXDisplay = document.querySelector('#cameraX');

const cameraYDisplay = document.querySelector('#cameraY');

const sceneRotationXDisplay = document.querySelector('#sceneRotationX');

const sceneRotationYDisplay = document.querySelector('#sceneRotationY');

const nearValueDisplay = document.querySelector('#nearValue');

const farValueDisplay = document.querySelector('#farValue');

const modeButtons = document.querySelectorAll('.mode-button');

/* =========================================================
   CLIPPING-EBENEN
   ========================================================= */

/*
   Die Clipping-Ebenen liegen relativ dicht
   an der tatsächlich verwendeten Szene.

   Dadurch wird der Graustufenbereich für
   die Z-Buffer-Visualisierung sinnvoll
   ausgenutzt.
*/

const NEAR = 2.0;

const FAR = 18.0;

/* =========================================================
   SHADER
   ========================================================= */

const vertexShaderSource = `

    attribute vec3 aPosition;
    attribute vec3 aNormal;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat3 uNormalMatrix;

    varying vec3 vNormal;

    void main() {

        gl_Position =
            uProjectionMatrix
            * uModelViewMatrix
            * vec4(aPosition, 1.0);


        vNormal =
            normalize(
                uNormalMatrix
                * aNormal
            );

    }

`;

const fragmentShaderSource = `

    precision mediump float;

    uniform vec4 uColor;

    uniform float uNear;
    uniform float uFar;

    /*
       1.0 = Z-Buffer
       0.0 = Farbansicht
    */
    uniform float uDepthMode;

    varying vec3 vNormal;


    /*
       gl_FragCoord.z liegt nach der
       perspektivischen Projektion im
       Bereich [0, 1].

       Dieser Wert ist bei perspektivischer
       Projektion nicht linear verteilt.

       Deshalb wird er zunächst wieder
       linearisiert.
    */
    float linearizeDepth(float depth) {

        float zNdc =
            depth * 2.0 - 1.0;


        return
            (2.0 * uNear * uFar)
            /
            (
                uFar
                + uNear
                - zNdc
                * (uFar - uNear)
            );

    }


    void main() {

        /*
           ---------------------------------------------
           Z-BUFFER-ANSICHT
           ---------------------------------------------
        */

        if (uDepthMode > 0.5) {

            float linearDepth =
                linearizeDepth(
                    gl_FragCoord.z
                );


            /*
               Lineare Entfernung auf [0, 1]
               normieren.

               near -> 0
               far  -> 1
            */
            float normalizedDepth =
                (
                    linearDepth
                    - uNear
                )
                /
                (
                    uFar
                    - uNear
                );


            normalizedDepth =
                clamp(
                    normalizedDepth,
                    0.0,
                    1.0
                );


            /*
               Aufgabenstellung:

               nahe  -> dunkel
               fern  -> hell
            */
            gl_FragColor =
                vec4(
                    vec3(
                        normalizedDepth
                    ),
                    1.0
                );


            return;

        }


        /*
           ---------------------------------------------
           FARBANSICHT
           ---------------------------------------------

           Diese Ansicht dient nur zum Vergleich
           der räumlichen Objektanordnung.
        */

        vec3 lightDirection =
            normalize(
                vec3(
                    0.45,
                    0.75,
                    1.0
                )
            );


        float diffuse =
            max(
                dot(
                    normalize(vNormal),
                    lightDirection
                ),
                0.0
            );


        float lighting =
            0.30
            + diffuse * 0.70;


        gl_FragColor =
            vec4(
                uColor.rgb
                * lighting,

                uColor.a
            );

    }

`;

/* =========================================================
   SHADER-HILFSFUNKTIONEN
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

  near: gl.getUniformLocation(shaderProgram, 'uNear'),

  far: gl.getUniformLocation(shaderProgram, 'uFar'),

  depthMode: gl.getUniformLocation(shaderProgram, 'uDepthMode'),
};

/* =========================================================
   DARSTELLUNGSMODUS
   ========================================================= */

/*
   Standardmäßig wird direkt die eigentliche
   Aufgabenlösung gezeigt.
*/

let displayMode = 'depth';

/* =========================================================
   KAMERA
   ========================================================= */

/*
   Die Kamera blickt entlang der negativen
   Z-Richtung auf die Szene.

   WASD verändert nur X und Y.

   Der Z-Wert bleibt unverändert.
*/

const camera = {
  x: 0.0,

  y: 0.8,

  z: 11.0,

  /*
       Die Kamera schaut immer auf einen
       festen Punkt in der Szene.

       Dadurch verändert sich beim Bewegen
       der Kamera auch der Blickwinkel.
    */
  target: vec3.fromValues(0.0, 0.0, -1.0),

  vMatrix: mat4.create(),

  pMatrix: mat4.create(),
};

/*
   Geschwindigkeit in Einheiten pro Sekunde.
*/

const CAMERA_SPEED = 5.0;

/*
   Bewegungsgrenzen.

   Die Kamera bleibt weiterhin in der
   XY-Ebene, der Z-Wert bleibt konstant.
*/

const CAMERA_X_LIMIT = 4.0;

const CAMERA_Y_MIN = -3.0;

const CAMERA_Y_MAX = 4.5;

/*
   Geschwindigkeit der Szenenrotation
   in Radiant pro Sekunde.
*/

const SCENE_ROTATION_SPEED = (100 * Math.PI) / 180;

/* =========================================================
   SZENENROTATION
   ========================================================= */

const sceneRotation = {
  x: (20 * Math.PI) / 180,

  y: (35 * Math.PI) / 180,
};

const ROTATION_STEP = (5 * Math.PI) / 180;

/* =========================================================
   MODELLE
   ========================================================= */

const models = [];

/* =========================================================
   WÜRFEL-GEOMETRIE
   ========================================================= */

function createCubeGeometry() {
  /*
       Für jede Würfelseite werden eigene
       Vertices benutzt.

       Dadurch besitzt jede Seite eine
       eindeutige Flächennormale.
    */

  const positions = new Float32Array([
    /*
               Vorderseite
            */
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,

    /*
               Rückseite
            */
    1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,

    /*
               Oberseite
            */
    -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,

    /*
               Unterseite
            */
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,

    /*
               Rechte Seite
            */
    1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,

    /*
               Linke Seite
            */
    -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
  ]);

  const normals = new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,

    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,

    4, 5, 6, 4, 6, 7,

    8, 9, 10, 8, 10, 11,

    12, 13, 14, 12, 14, 15,

    16, 17, 18, 16, 18, 19,

    20, 21, 22, 20, 22, 23,
  ]);

  return {
    positions,
    normals,
    indices,
  };
}

/* =========================================================
   KUGEL-GEOMETRIE
   ========================================================= */

function createSphereGeometry() {
  const positions = [];
  const normals = [];
  const indices = [];

  const latitudeBands = 28;

  const longitudeBands = 36;

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

      /*
               Bei der Einheitskugel ist
               die Position gleichzeitig
               die Flächennormale.
            */
      normals.push(x, y, z);
    }
  }

  const rowLength = longitudeBands + 1;

  for (let latitude = 0; latitude < latitudeBands; latitude++) {
    for (let longitude = 0; longitude < longitudeBands; longitude++) {
      const first = latitude * rowLength + longitude;

      const second = first + rowLength;

      indices.push(first, second, first + 1);

      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),

    normals: new Float32Array(normals),

    indices: new Uint16Array(indices),
  };
}

/* =========================================================
   TORUS-GEOMETRIE
   ========================================================= */

function createTorusGeometry() {
  const positions = [];
  const normals = [];
  const indices = [];

  const majorRadius = 1.35;

  const minorRadius = 0.42;

  const majorSegments = 56;

  const minorSegments = 24;

  for (let i = 0; i <= majorSegments; i++) {
    const u = (i / majorSegments) * Math.PI * 2;

    const cosU = Math.cos(u);

    const sinU = Math.sin(u);

    for (let j = 0; j <= minorSegments; j++) {
      const v = (j / minorSegments) * Math.PI * 2;

      const cosV = Math.cos(v);

      const sinV = Math.sin(v);

      const x = (majorRadius + minorRadius * cosV) * cosU;

      const y = minorRadius * sinV;

      const z = (majorRadius + minorRadius * cosV) * sinU;

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

      indices.push(a, b, c);

      indices.push(b, d, c);
    }
  }

  return {
    positions: new Float32Array(positions),

    normals: new Float32Array(normals),

    indices: new Uint16Array(indices),
  };
}

/* =========================================================
   ZYLINDER-GEOMETRIE
   ========================================================= */

function createCylinderGeometry() {
  const positions = [];
  const normals = [];
  const indices = [];

  const segments = 48;

  /*
       -----------------------------------------------------
       MANTEL
       -----------------------------------------------------
    */

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;

    const x = Math.cos(angle);

    const z = Math.sin(angle);

    /*
           Unterer Punkt
        */
    positions.push(x, -1, z);

    normals.push(x, 0, z);

    /*
           Oberer Punkt
        */
    positions.push(x, 1, z);

    normals.push(x, 0, z);
  }

  for (let i = 0; i < segments; i++) {
    const bottomA = i * 2;

    const topA = bottomA + 1;

    const bottomB = bottomA + 2;

    const topB = bottomA + 3;

    indices.push(bottomA, bottomB, topA);

    indices.push(bottomB, topB, topA);
  }

  /*
       -----------------------------------------------------
       OBERER DECKEL
       -----------------------------------------------------
    */

  const topCenterIndex = positions.length / 3;

  positions.push(0, 1, 0);

  normals.push(0, 1, 0);

  const topRingStart = positions.length / 3;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;

    positions.push(Math.cos(angle), 1, Math.sin(angle));

    normals.push(0, 1, 0);
  }

  for (let i = 0; i < segments; i++) {
    indices.push(topCenterIndex, topRingStart + i, topRingStart + i + 1);
  }

  /*
       -----------------------------------------------------
       UNTERER DECKEL
       -----------------------------------------------------
    */

  const bottomCenterIndex = positions.length / 3;

  positions.push(0, -1, 0);

  normals.push(0, -1, 0);

  const bottomRingStart = positions.length / 3;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;

    positions.push(Math.cos(angle), -1, Math.sin(angle));

    normals.push(0, -1, 0);
  }

  for (let i = 0; i < segments; i++) {
    indices.push(
      bottomCenterIndex,
      bottomRingStart + i + 1,
      bottomRingStart + i,
    );
  }

  return {
    positions: new Float32Array(positions),

    normals: new Float32Array(normals),

    indices: new Uint16Array(indices),
  };
}

/* =========================================================
   GEOMETRIE AUSWÄHLEN
   ========================================================= */

function createGeometry(geometryName) {
  if (geometryName === 'cube') {
    return createCubeGeometry();
  }

  if (geometryName === 'sphere') {
    return createSphereGeometry();
  }

  if (geometryName === 'torus') {
    return createTorusGeometry();
  }

  if (geometryName === 'cylinder') {
    return createCylinderGeometry();
  }

  throw new Error('Unbekannte Geometrie: ' + geometryName);
}

/* =========================================================
   BUFFER INITIALISIEREN
   ========================================================= */

function initBuffers(model, geometryName) {
  const geometry = createGeometry(geometryName);

  /*
       Positionsbuffer
    */

  model.positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, model.positionBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

  /*
       Normalenbuffer
    */

  model.normalBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);

  /*
       Indexbuffer
    */

  model.indexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

  model.indexCount = geometry.indices.length;
}

/* =========================================================
   MODELL ERZEUGEN
   ========================================================= */

function createModel(geometryName, color, translate, rotate, scale) {
  const model = {
    geometryName,

    color: color.slice(),

    translate: translate.slice(),

    rotate: rotate.slice(),

    scale: scale.slice(),

    mMatrix: mat4.create(),

    mvMatrix: mat4.create(),

    normalMatrix: mat3.create(),
  };

  initBuffers(model, geometryName);

  models.push(model);

  return model;
}

/* =========================================================
   SZENE AUFBAUEN
   ========================================================= */

function initModels() {
  /*
       -----------------------------------------------------
       KUGEL

       Liegt relativ weit vorne.

       Die Kugel überdeckt aus der
       Ausgangsperspektive Teile der
       dahinterliegenden Objekte.
       -----------------------------------------------------
    */

  createModel(
    'sphere',

    [0.1, 0.55, 0.82, 1.0],

    [-1.15, 0.2, 2.7],

    [0, 0, 0],

    [1.15, 1.15, 1.15],
  );

  /*
       -----------------------------------------------------
       WÜRFEL

       Mittlere Tiefe.
       -----------------------------------------------------
    */

  createModel(
    'cube',

    [0.18, 0.63, 0.36, 1.0],

    [0.75, -0.35, 1.0],

    [0.2, 0.35, 0.12],

    [1.15, 1.15, 1.15],
  );

  /*
       -----------------------------------------------------
       TORUS

       Hinter Kugel und Würfel.
       -----------------------------------------------------
    */

  createModel(
    'torus',

    [0.92, 0.49, 0.12, 1.0],

    [0.55, 0.55, -1.6],

    [1.1, 0.2, 0.25],

    [1.25, 1.25, 1.25],
  );

  /*
       -----------------------------------------------------
       ZYLINDER

       Am weitesten hinten.

       Durch seine Höhe bleibt er auch bei
       teilweiser Verdeckung noch sichtbar.
       -----------------------------------------------------
    */

  createModel(
    'cylinder',

    [0.55, 0.24, 0.72, 1.0],

    [3.2, -0.8, -2.0],

    [0.45, -0.3, 0.55],

    [0.78, 1.45, 0.78],
  );
}

/* =========================================================
   KAMERA BERECHNEN
   ========================================================= */

function updateCamera() {
  const eye = vec3.fromValues(
    camera.x,

    camera.y,

    camera.z,
  );

  const up = vec3.fromValues(0, 1, 0);

  /*
       Der Zielpunkt bleibt fest.

       Bewegt sich die Kamera nach oben,
       schaut sie dadurch schräg von oben
       auf die Szene.
    */

  mat4.lookAt(
    camera.vMatrix,

    eye,

    camera.target,

    up,
  );
}
/* =========================================================
   MODEL-TRANSFORMATIONEN
   ========================================================= */

function updateTransformations(model) {
  /*
       Matrix zurücksetzen.
    */

  mat4.identity(model.mMatrix);

  /*
       -----------------------------------------------------
       GEMEINSAME SZENENROTATION

       Diese Rotationen stehen VOR der
       Translation des einzelnen Körpers.

       Dadurch wird nicht nur jeder Körper
       um sich selbst gedreht, sondern die
       gesamte räumliche Anordnung um den
       Ursprung der Szene.
       -----------------------------------------------------
    */

  mat4.rotateX(model.mMatrix, model.mMatrix, sceneRotation.x);

  mat4.rotateY(model.mMatrix, model.mMatrix, sceneRotation.y);

  /*
       -----------------------------------------------------
       INDIVIDUELLE POSITION
       -----------------------------------------------------
    */

  mat4.translate(model.mMatrix, model.mMatrix, model.translate);

  /*
       -----------------------------------------------------
       INDIVIDUELLE ROTATION
       -----------------------------------------------------
    */

  mat4.rotateX(model.mMatrix, model.mMatrix, model.rotate[0]);

  mat4.rotateY(model.mMatrix, model.mMatrix, model.rotate[1]);

  mat4.rotateZ(model.mMatrix, model.mMatrix, model.rotate[2]);

  /*
       -----------------------------------------------------
       SKALIERUNG
       -----------------------------------------------------
    */

  mat4.scale(model.mMatrix, model.mMatrix, model.scale);

  /*
       Model-View-Matrix:

       MV = View * Model
    */

  mat4.multiply(model.mvMatrix, camera.vMatrix, model.mMatrix);

  /*
       Normalenmatrix für die Farbansicht.
    */

  mat3.normalFromMat4(model.normalMatrix, model.mvMatrix);
}

/* =========================================================
   MODELL ZEICHNEN
   ========================================================= */

function drawModel(model) {
  /*
       Positionen
    */

  gl.bindBuffer(gl.ARRAY_BUFFER, model.positionBuffer);

  gl.vertexAttribPointer(shaderLocations.position, 3, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(shaderLocations.position);

  /*
       Normalen
    */

  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);

  gl.vertexAttribPointer(shaderLocations.normal, 3, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(shaderLocations.normal);

  /*
       Matrizen
    */

  gl.uniformMatrix4fv(shaderLocations.modelViewMatrix, false, model.mvMatrix);

  gl.uniformMatrix4fv(shaderLocations.projectionMatrix, false, camera.pMatrix);

  gl.uniformMatrix3fv(shaderLocations.normalMatrix, false, model.normalMatrix);

  /*
       Farbe für Vergleichsansicht.
    */

  gl.uniform4fv(shaderLocations.color, model.color);

  /*
       Geometrie zeichnen.
    */

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);

  gl.drawElements(gl.TRIANGLES, model.indexCount, gl.UNSIGNED_SHORT, 0);
}

/* =========================================================
   CANVAS AN DISPLAYGRÖSSE ANPASSEN
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

  /*
       Perspektivische Projektion.
    */

  const aspect = canvas.width / canvas.height;

  mat4.perspective(
    camera.pMatrix,

    (45 * Math.PI) / 180,

    aspect,

    NEAR,

    FAR,
  );

  /*
       Weißer Hintergrund ist für die
       Tiefendarstellung sinnvoll:

       weit entfernte Bereiche werden
       ebenfalls zunehmend hell.
    */

  gl.clearColor(0.96, 0.97, 0.98, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /*
       Z-Buffer tatsächlich aktivieren.
    */

  gl.enable(gl.DEPTH_TEST);

  gl.depthFunc(gl.LESS);

  gl.useProgram(shaderProgram);

  /*
       Clipping-Werte an Fragment-Shader.
    */

  gl.uniform1f(shaderLocations.near, NEAR);

  gl.uniform1f(shaderLocations.far, FAR);

  /*
       Modus übergeben.
    */

  gl.uniform1f(
    shaderLocations.depthMode,

    displayMode === 'depth' ? 1.0 : 0.0,
  );

  /*
       Alle Körper rendern.
    */

  for (let i = 0; i < models.length; i++) {
    updateTransformations(models[i]);

    drawModel(models[i]);
  }
}

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
  cameraXDisplay.textContent = camera.x.toFixed(2);

  cameraYDisplay.textContent = camera.y.toFixed(2);

  sceneRotationXDisplay.textContent =
    radiansToDegrees(sceneRotation.x).toFixed(0) + '°';

  sceneRotationYDisplay.textContent =
    radiansToDegrees(sceneRotation.y).toFixed(0) + '°';

  nearValueDisplay.textContent = NEAR.toFixed(1);

  farValueDisplay.textContent = FAR.toFixed(1);
}

/* =========================================================
   DARSTELLUNGSBUTTONS
   ========================================================= */

function updateModeButtons() {
  modeButtons.forEach(function (button) {
    const active = button.dataset.mode === displayMode;

    button.classList.toggle('active', active);

    button.setAttribute('aria-pressed', String(active));
  });
}

modeButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    displayMode = button.dataset.mode;

    updateModeButtons();

    render();
  });
});

/* =========================================================
   HILFSFUNKTION
   ========================================================= */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
/* =========================================================
   GEDRÜCKTE TASTEN
   ========================================================= */

const keysPressed = {
  w: false,
  a: false,
  s: false,
  d: false,

  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
};

/* =========================================================
   TASTE GEDRÜCKT
   ========================================================= */

window.addEventListener('keydown', function (event) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (Object.prototype.hasOwnProperty.call(keysPressed, key)) {
    keysPressed[key] = true;

    /*
               Verhindert insbesondere das Scrollen
               über die Pfeiltasten.
            */

    event.preventDefault();
  }
});

/* =========================================================
   TASTE LOSGELASSEN
   ========================================================= */

window.addEventListener('keyup', function (event) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (Object.prototype.hasOwnProperty.call(keysPressed, key)) {
    keysPressed[key] = false;

    event.preventDefault();
  }
});

/* =========================================================
   TASTENSTATUS ZURÜCKSETZEN
   ========================================================= */

/*
   Falls während gedrückter Taste das
   Browserfenster den Fokus verliert,
   sollen keine Tasten "hängen bleiben".
*/

window.addEventListener('blur', function () {
  for (const key in keysPressed) {
    keysPressed[key] = false;
  }
});

/* =========================================================
   KONTINUIERLICHE INTERAKTION
   ========================================================= */

function updateInteraction(deltaTime) {
  let changed = false;

  /*
       -----------------------------------------------------
       KAMERA
       -----------------------------------------------------
    */

  if (keysPressed.w) {
    camera.y += CAMERA_SPEED * deltaTime;

    changed = true;
  }

  if (keysPressed.s) {
    camera.y -= CAMERA_SPEED * deltaTime;

    changed = true;
  }

  if (keysPressed.a) {
    camera.x -= CAMERA_SPEED * deltaTime;

    changed = true;
  }

  if (keysPressed.d) {
    camera.x += CAMERA_SPEED * deltaTime;

    changed = true;
  }

  /*
       Grenzen einhalten.
    */

  camera.x = clamp(camera.x, -CAMERA_X_LIMIT, CAMERA_X_LIMIT);

  camera.y = clamp(camera.y, CAMERA_Y_MIN, CAMERA_Y_MAX);

  /*
       -----------------------------------------------------
       SZENENROTATION
       -----------------------------------------------------
    */

  if (keysPressed.ArrowLeft) {
    sceneRotation.y -= SCENE_ROTATION_SPEED * deltaTime;

    changed = true;
  }

  if (keysPressed.ArrowRight) {
    sceneRotation.y += SCENE_ROTATION_SPEED * deltaTime;

    changed = true;
  }

  if (keysPressed.ArrowUp) {
    sceneRotation.x -= SCENE_ROTATION_SPEED * deltaTime;

    changed = true;
  }

  if (keysPressed.ArrowDown) {
    sceneRotation.x += SCENE_ROTATION_SPEED * deltaTime;

    changed = true;
  }

  /*
       Nur bei tatsächlicher Bewegung
       Kamera, Anzeige und Szene neu
       berechnen.
    */

  if (changed) {
    updateCamera();

    updateStatusDisplay();

    render();
  }
}

/* =========================================================
   INTERAKTIONSLOOP
   ========================================================= */

let previousFrameTime = null;

function animate(currentTime) {
  if (previousFrameTime === null) {
    previousFrameTime = currentTime;
  }

  let deltaTime = (currentTime - previousFrameTime) / 1000;

  /*
       Zu große Sprünge verhindern,
       beispielsweise nach einem Wechsel
       des Browser-Tabs.
    */

  deltaTime = Math.min(deltaTime, 0.1);

  previousFrameTime = currentTime;

  updateInteraction(deltaTime);

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
       Kamera berechnen.
    */

  updateCamera();

  /*
       Vier Grundkörper erzeugen.
    */

  initModels();

  /*
       Oberfläche initialisieren.
    */

  updateStatusDisplay();

  updateModeButtons();

  /*
       Direkt mit der Z-Buffer-Ansicht
       starten.
    */

  render();

  requestAnimationFrame(animate);
}

init();
