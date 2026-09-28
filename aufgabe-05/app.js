'use strict';

/*
    ==================================================
    PRÜFEN, OB GLMATRIX GELADEN WURDE
    ==================================================
*/

if (typeof mat4 === 'undefined' || typeof vec3 === 'undefined') {
  throw new Error(
    'glMatrix wurde nicht geladen. Prüfe den Pfad zu ../ext/gl-matrix.js.',
  );
}

/*
    ==================================================
    CANVAS UND WEBGL
    ==================================================
*/

const canvas = document.querySelector('#sceneCanvas');

const gl = canvas.getContext('webgl', {
  antialias: true,
});

if (gl === null) {
  throw new Error('WebGL konnte nicht initialisiert werden.');
}

/*
    ==================================================
    SHADER
    ==================================================
*/

const vertexShaderSource = `

    attribute vec3 aPosition;
    attribute vec3 aColor;


    uniform mat4 uModelMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uProjectionMatrix;


    varying vec3 vColor;


    void main() {

        gl_Position =
            uProjectionMatrix *
            uViewMatrix *
            uModelMatrix *
            vec4(
                aPosition,
                1.0
            );


        vColor =
            aColor;

    }

`;

const fragmentShaderSource = `

    precision mediump float;

    varying vec3 vColor;

    uniform vec3 uSolidColor;
    uniform float uUseSolidColor;

    void main() {

        vec3 finalColor =
            mix(
                vColor,
                uSolidColor,
                uUseSolidColor
            );

        gl_FragColor =
            vec4(
                finalColor,
                1.0
            );

    }

`;

/*
    ==================================================
    SHADER KOMPILIEREN
    ==================================================
*/

function createShader(type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  const successful = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (!successful) {
    const message = gl.getShaderInfoLog(shader);

    gl.deleteShader(shader);

    throw new Error(`Shader-Fehler: ${message}`);
  }

  return shader;
}

/*
    ==================================================
    SHADER-PROGRAMM
    ==================================================
*/

function createProgram() {
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);

  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);

  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  const successful = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (!successful) {
    const message = gl.getProgramInfoLog(program);

    gl.deleteProgram(program);

    throw new Error(`Programm-Fehler: ${message}`);
  }

  return program;
}

const program = createProgram();

/*
    ==================================================
    ATTRIBUTE UND UNIFORM LOCATIONS
    ==================================================
*/

const positionLocation = gl.getAttribLocation(program, 'aPosition');

const colorLocation = gl.getAttribLocation(program, 'aColor');

const modelMatrixLocation = gl.getUniformLocation(program, 'uModelMatrix');

const viewMatrixLocation = gl.getUniformLocation(program, 'uViewMatrix');

const projectionMatrixLocation = gl.getUniformLocation(
  program,
  'uProjectionMatrix',
);

const solidColorLocation = gl.getUniformLocation(program, 'uSolidColor');

const useSolidColorLocation = gl.getUniformLocation(program, 'uUseSolidColor');

/*
    ==================================================
    ALLGEMEINE MESH-FUNKTION
    ==================================================

    Diese Funktion verwenden wir später nicht nur
    für den Würfel, sondern auch für Torus und Kugel.
*/

function createMesh(positions, colors, indices) {
  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const colorBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );

  return {
    positionBuffer: positionBuffer,

    colorBuffer: colorBuffer,

    indexBuffer: indexBuffer,

    indexCount: indices.length,
  };
}

/*
    ==================================================
    WÜRFEL
    ==================================================

    Jede Würfelseite besitzt eigene Vertices.
    Dadurch kann jede Seite eine eigene,
    gleichmäßige Farbe erhalten.
*/

const cubePositions = [
  // Vorderseite
  -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,

  // Rückseite
  1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,

  // Linke Seite
  -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,

  // Rechte Seite
  1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,

  // Oberseite
  -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,

  // Unterseite
  -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
];

const cubeIndices = [
  0, 1, 2, 0, 2, 3,

  4, 5, 6, 4, 6, 7,

  8, 9, 10, 8, 10, 11,

  12, 13, 14, 12, 14, 15,

  16, 17, 18, 16, 18, 19,

  20, 21, 22, 20, 22, 23,
];

const cubeColors = [];

/*
    Viermal dieselbe Farbe hinzufügen,
    da jede Seite vier Vertices besitzt.
*/

function addCubeFaceColor(color) {
  for (let i = 0; i < 4; i++) {
    cubeColors.push(color[0], color[1], color[2]);
  }
}

/*
    Unterschiedliche Grüntöne für die
    sechs Würfelseiten.
*/

addCubeFaceColor([0.12, 0.5, 0.3]);

addCubeFaceColor([0.05, 0.22, 0.13]);

addCubeFaceColor([0.08, 0.34, 0.21]);

addCubeFaceColor([0.16, 0.6, 0.36]);

addCubeFaceColor([0.56, 0.88, 0.68]);

addCubeFaceColor([0.03, 0.16, 0.1]);

const cubeMesh = createMesh(cubePositions, cubeColors, cubeIndices);

/*
    ==================================================
    FARBINTERPOLATION
    ==================================================
*/

function mixColor(colorA, colorB, t) {
  return [
    colorA[0] + (colorB[0] - colorA[0]) * t,

    colorA[1] + (colorB[1] - colorA[1]) * t,

    colorA[2] + (colorB[2] - colorA[2]) * t,
  ];
}

/*
    ==================================================
    PARAMETRISCHER TORUS
    ==================================================

    x = (R + r cos(v)) cos(u)
    y = r sin(v)
    z = (R + r cos(v)) sin(u)

    R = großer Radius
    r = Radius des Ringquerschnitts
*/

function createTorusGeometry(majorRadius, minorRadius, uSegments, vSegments) {
  const positions = [];

  const colors = [];

  const indices = [];

  /*
        --------------------------------------------------
        VERTICES
        --------------------------------------------------
    */

  for (let i = 0; i <= uSegments; i++) {
    const u = (i / uSegments) * 2 * Math.PI;

    for (let j = 0; j <= vSegments; j++) {
      const v = (j / vSegments) * 2 * Math.PI;

      /*
                Parametrische Torusformel.
            */

      const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);

      const y = minorRadius * Math.sin(v);

      const z = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);

      positions.push(x, y, z);

      /*
                Algorithmische Kolorierung.

                Der Farbwert verändert sich
                kontinuierlich über die Oberfläche.
            */

      const t = 0.5 + 0.5 * Math.sin(u + 0.7 * v);

      const color = mixColor(
        [0.72, 0.1, 0.08],

        [0.98, 0.64, 0.1],

        t,
      );

      colors.push(color[0], color[1], color[2]);
    }
  }

  /*
        --------------------------------------------------
        DREIECKSINDIZES
        --------------------------------------------------
    */

  const rowLength = vSegments + 1;

  for (let i = 0; i < uSegments; i++) {
    for (let j = 0; j < vSegments; j++) {
      const a = i * rowLength + j;

      const b = a + 1;

      const c = (i + 1) * rowLength + j;

      const d = c + 1;

      indices.push(
        a,
        c,
        b,

        b,
        c,
        d,
      );
    }
  }

  return {
    positions: positions,

    colors: colors,

    indices: indices,
  };
}

/*
    Torus erzeugen.
*/

const torusGeometry = createTorusGeometry(1.05, 0.34, 56, 24);

const torusMesh = createMesh(
  torusGeometry.positions,
  torusGeometry.colors,
  torusGeometry.indices,
);

/*
    ==================================================
    BODENFLÄCHE
    ==================================================

    Die Bodenfläche gehört nicht zu den zwei
    geforderten Objekten. Sie dient ausschließlich
    der räumlichen Orientierung.
*/

const floorPositions = [
  -5.0, 0.0, -5.0, 5.0, 0.0, -5.0, 5.0, 0.0, 5.0, -5.0, 0.0, 5.0,
];

const floorColors = [
  0.82, 0.83, 0.85, 0.86, 0.87, 0.89, 0.91, 0.92, 0.93, 0.86, 0.87, 0.89,
];

const floorIndices = [0, 1, 2, 0, 2, 3];

const floorMesh = createMesh(floorPositions, floorColors, floorIndices);

/*
    ==================================================
    KUGEL-HILFSFUNKTIONEN
    ==================================================
*/

function normalizePoint(point) {
  const length = Math.sqrt(
    point[0] * point[0] + point[1] * point[1] + point[2] * point[2],
  );

  return [point[0] / length, point[1] / length, point[2] / length];
}

function createSphereMidpoint(pointA, pointB) {
  return normalizePoint([
    (pointA[0] + pointB[0]) / 2,
    (pointA[1] + pointB[1]) / 2,
    (pointA[2] + pointB[2]) / 2,
  ]);
}

function getSphereColor(point) {
  const t = (point[1] + 1) / 2;
  const violet = [0.38, 0.1, 0.68];

  const blue = [0.06, 0.34, 0.82];

  const turquoise = [0.04, 0.72, 0.62];

  if (t < 0.5) {
    return mixColor(violet, blue, t * 2);
  }

  return mixColor(blue, turquoise, (t - 0.5) * 2);
}

function addSphereTriangle(pointA, pointB, pointC, geometry) {
  const baseIndex = geometry.positions.length / 3;

  for (const point of [pointA, pointB, pointC]) {
    geometry.positions.push(point[0], point[1], point[2]);

    const color = getSphereColor(point);
    geometry.colors.push(color[0], color[1], color[2]);
  }

  geometry.triangleIndices.push(baseIndex, baseIndex + 1, baseIndex + 2);
  geometry.lineIndices.push(
    baseIndex,
    baseIndex + 1,
    baseIndex + 1,
    baseIndex + 2,
    baseIndex + 2,
    baseIndex,
  );
}

function divideSphereTriangle(pointA, pointB, pointC, depth, geometry) {
  if (depth === 0) {
    addSphereTriangle(pointA, pointB, pointC, geometry);
    return;
  }

  const midpointAB = createSphereMidpoint(pointA, pointB);
  const midpointBC = createSphereMidpoint(pointB, pointC);
  const midpointCA = createSphereMidpoint(pointC, pointA);

  divideSphereTriangle(pointA, midpointAB, midpointCA, depth - 1, geometry);
  divideSphereTriangle(midpointAB, pointB, midpointBC, depth - 1, geometry);
  divideSphereTriangle(midpointCA, midpointBC, pointC, depth - 1, geometry);
  divideSphereTriangle(midpointAB, midpointBC, midpointCA, depth - 1, geometry);
}

function createRecursiveSphereGeometry(depth) {
  const geometry = {
    positions: [],
    colors: [],
    triangleIndices: [],
    lineIndices: [],
  };

  const top = [0, 1, 0];
  const bottom = [0, -1, 0];
  const right = [1, 0, 0];
  const left = [-1, 0, 0];
  const front = [0, 0, 1];
  const back = [0, 0, -1];
  const baseTriangles = [
    [top, front, right],
    [top, right, back],
    [top, back, left],
    [top, left, front],
    [bottom, right, front],
    [bottom, back, right],
    [bottom, left, back],
    [bottom, front, left],
  ];

  for (const triangle of baseTriangles) {
    divideSphereTriangle(
      triangle[0],
      triangle[1],
      triangle[2],
      depth,
      geometry,
    );
  }

  const triangleCount = geometry.triangleIndices.length / 3;
  const vertexCount = geometry.positions.length / 3;
  const expectedTriangleCount = 8 * Math.pow(4, depth);

  if (triangleCount !== expectedTriangleCount) {
    throw new Error(
      'Die rekursive Kugel besitzt eine unerwartete Anzahl an Dreiecken.',
    );
  }

  return {
    positions: geometry.positions,
    colors: geometry.colors,
    triangleIndices: geometry.triangleIndices,
    lineIndices: geometry.lineIndices,
    triangleCount: triangleCount,
    vertexCount: vertexCount,
  };
}

function createSphereMesh(geometry) {
  const mesh = createMesh(
    geometry.positions,
    geometry.colors,
    geometry.triangleIndices,
  );

  mesh.lineIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.lineIndexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(geometry.lineIndices),
    gl.STATIC_DRAW,
  );

  mesh.lineIndexCount = geometry.lineIndices.length;
  mesh.triangleCount = geometry.triangleCount;
  mesh.vertexCount = geometry.vertexCount;

  return mesh;
}

/*
    ==================================================
    KUGEL-ZUSTAND
    ==================================================
*/

let recursionDepth = 2;
const minimumRecursionDepth = 0;
const maximumRecursionDepth = 5;
let sphereDisplayMode = 'combined';
let sphereGeometry = createRecursiveSphereGeometry(recursionDepth);
let sphereMesh = createSphereMesh(sphereGeometry);

/*
    ==================================================
    KAMERA
    ==================================================
*/

const camera = {
  /*
        Aktuelle Kameraposition.
    */

  eye: vec3.fromValues(0, 3.0, 8.0),

  /*
        Punkt, auf den die Kamera schaut.
    */

  center: vec3.fromValues(0, 0.8, 0),

  /*
        Positive Y-Richtung ist oben.
    */

  up: vec3.fromValues(0, 1, 0),

  /*
        Radius der Kreisbahn.
    */

  distance: 8.0,

  /*
        Höhe unabhängig vom Radius.
    */

  height: 3.0,

  /*
        Winkel auf der Kreisbahn in Radiant.
    */

  zAngle: 0,

  /*
        Matrizen.
    */

  vMatrix: mat4.create(),

  pMatrix: mat4.create(),
};

/*
    ==================================================
    KAMERAPOSITION AUF DER KREISBAHN
    ==================================================

    x = centerX + r * sin(alpha)
    z = centerZ + r * cos(alpha)

    Die Y-Koordinate wird unabhängig davon über
    camera.height bestimmt.
*/

function calculateCameraOrbit() {
  camera.eye[0] = camera.center[0] + camera.distance * Math.sin(camera.zAngle);

  camera.eye[1] = camera.height;

  camera.eye[2] = camera.center[2] + camera.distance * Math.cos(camera.zAngle);

  /*
        View-Matrix berechnen.
    */

  mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);
}

/*
    ==================================================
    PROJEKTIONSMATRIX
    ==================================================
*/

function updateProjectionMatrix() {
  const aspect = canvas.width / canvas.height;

  /*
        45 Grad in Radiant.
    */

  const fieldOfView = (45 * Math.PI) / 180;

  mat4.perspective(camera.pMatrix, fieldOfView, aspect, 0.1, 100.0);
}

/*
    ==================================================
    CANVAS AN CSS-GRÖSSE ANPASSEN
    ==================================================
*/

function resizeCanvasToDisplaySize() {
  const pixelRatio = window.devicePixelRatio || 1;

  const displayWidth = Math.round(canvas.clientWidth * pixelRatio);

  const displayHeight = Math.round(canvas.clientHeight * pixelRatio);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;

    canvas.height = displayHeight;
  }
}

/*
    ==================================================
    KAMERA-STATUS AUF DER WEBSEITE
    ==================================================
*/

function updateCameraDisplay() {
  const angleInDegrees = (camera.zAngle * 180) / Math.PI;

  /*
        Winkel immer zwischen 0 und 360 anzeigen.
    */

  const normalizedAngle = ((angleInDegrees % 360) + 360) % 360;

  document.querySelector('#cameraAngle').textContent =
    `${normalizedAngle.toFixed(0)}°`;

  document.querySelector('#cameraDistance').textContent =
    camera.distance.toFixed(1);

  document.querySelector('#cameraEye').textContent =
    `(${camera.eye[0].toFixed(2)}, ` +
    `${camera.eye[1].toFixed(2)}, ` +
    `${camera.eye[2].toFixed(2)})`;
}

/*
    ==================================================
    EIN MESH ZEICHNEN
    ==================================================
*/

function drawMesh(mesh, modelMatrix) {
  /*
        Positionen.
    */

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);

  gl.enableVertexAttribArray(positionLocation);

  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

  /*
        Farben.
    */

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colorBuffer);

  gl.enableVertexAttribArray(colorLocation);

  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

  /*
        Model-Matrix.
    */

  gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);

  /*
        Index-Buffer.
    */

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

  gl.uniform1f(useSolidColorLocation, 0.0);

  gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
}

/*
    ==================================================
    REKURSIVE KUGEL ZEICHNEN
    ==================================================
*/

function drawRecursiveSphere(mesh, modelMatrix) {
  /*
        Positionen.
    */

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);

  gl.enableVertexAttribArray(positionLocation);

  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

  /*
        Farben.
    */

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colorBuffer);

  gl.enableVertexAttribArray(colorLocation);

  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

  /*
        Model-Matrix.
    */

  gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);

  /*
        --------------------------------------------------
        GEFÜLLTE OBERFLÄCHE
        --------------------------------------------------
    */

  if (sphereDisplayMode === 'combined') {
    /*
            Kleine Tiefenverschiebung verhindert
            Z-Fighting zwischen Oberfläche und Linien.
        */

    gl.enable(gl.POLYGON_OFFSET_FILL);

    gl.polygonOffset(1, 1);

    gl.uniform1f(useSolidColorLocation, 0.0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  /*
        --------------------------------------------------
        DRAHTGITTER
        --------------------------------------------------
    */

  if (sphereDisplayMode === 'combined') {
    /*
            In der kombinierten Ansicht etwas heller.
        */

    gl.uniform3f(solidColorLocation, 0.14, 0.16, 0.2);
  } else {
    /*
            Reine Liniendarstellung deutlich dunkler.
        */

    gl.uniform3f(solidColorLocation, 0.04, 0.05, 0.08);
  }

  gl.uniform1f(useSolidColorLocation, 1.0);

  gl.lineWidth(1);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.lineIndexBuffer);

  gl.drawElements(gl.LINES, mesh.lineIndexCount, gl.UNSIGNED_SHORT, 0);
}

/*
    ==================================================
    SZENE RENDERN
    ==================================================
*/

function render() {
  /*
        Canvas bei Bedarf an tatsächliche
        Bildschirmgröße anpassen.
    */

  resizeCanvasToDisplaySize();

  /*
        Da sich dadurch das Seitenverhältnis
        ändern kann, Projektion neu berechnen.
    */

  updateProjectionMatrix();

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(0.965, 0.97, 0.98, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);

  gl.depthFunc(gl.LEQUAL);

  gl.useProgram(program);

  /*
        View- und Projection-Matrix gelten
        aktuell für die gesamte Szene.
    */

  gl.uniformMatrix4fv(viewMatrixLocation, false, camera.vMatrix);

  gl.uniformMatrix4fv(projectionMatrixLocation, false, camera.pMatrix);

  /*
    ==================================================
    BODEN
    ==================================================
*/

  const floorModelMatrix = mat4.create();

  drawMesh(floorMesh, floorModelMatrix);
  /*
    ==================================================
    WÜRFEL
    ==================================================
*/

  const cubeModelMatrix = mat4.create();

  /*
    Würfel auf die linke Seite der Szene setzen.
*/

  mat4.translate(cubeModelMatrix, cubeModelMatrix, [-2.45, 0.72, 0.15]);

  /*
    Etwas kleiner als der Testwürfel.
*/

  mat4.scale(cubeModelMatrix, cubeModelMatrix, [0.72, 0.72, 0.72]);
  /*
    Feste Drehung für eine interessante
    Ausgangsansicht.
*/

  mat4.rotateY(cubeModelMatrix, cubeModelMatrix, Math.PI / 4);

  drawMesh(cubeMesh, cubeModelMatrix);

  /*
    ==================================================
    TORUS
    ==================================================
*/

  const torusModelMatrix = mat4.create();

  /*
    Auf die rechte Seite der Szene setzen.
*/

  mat4.translate(torusModelMatrix, torusModelMatrix, [2.65, 1.05, -0.5]);

  mat4.scale(torusModelMatrix, torusModelMatrix, [0.9, 0.9, 0.9]);

  mat4.rotateX(torusModelMatrix, torusModelMatrix, 0.6);

  mat4.rotateY(torusModelMatrix, torusModelMatrix, -0.35);

  drawMesh(torusMesh, torusModelMatrix);

  /*
    ==================================================
    REKURSIVE KUGEL
    ==================================================
*/

  const sphereModelMatrix = mat4.create();

  mat4.translate(sphereModelMatrix, sphereModelMatrix, [0, 1.3, -0.2]);

  mat4.scale(sphereModelMatrix, sphereModelMatrix, [1.28, 1.28, 1.28]);

  drawRecursiveSphere(sphereMesh, sphereModelMatrix);
}

/*
    ==================================================
    REKURSIONSANZEIGE
    ==================================================
*/

function updateRecursionDisplay() {
  document.querySelector('#recursionDepth').textContent = recursionDepth;

  document.querySelector('#sphereTriangleCount').textContent =
    sphereGeometry.triangleCount;

  document.querySelector('#sphereVertexCount').textContent =
    sphereGeometry.vertexCount;

  document.querySelector('#decreaseRecursion').disabled =
    recursionDepth <= minimumRecursionDepth;

  document.querySelector('#increaseRecursion').disabled =
    recursionDepth >= maximumRecursionDepth;
}

function deleteSphereMesh(mesh) {
  gl.deleteBuffer(mesh.positionBuffer);

  gl.deleteBuffer(mesh.colorBuffer);

  gl.deleteBuffer(mesh.indexBuffer);

  gl.deleteBuffer(mesh.lineIndexBuffer);
}

function rebuildSphere() {
  /*
        Alte GPU-Buffer entfernen.
    */

  deleteSphereMesh(sphereMesh);

  /*
        Geometrie mit neuer Rekursionstiefe
        vollständig neu berechnen.
    */

  sphereGeometry = createRecursiveSphereGeometry(recursionDepth);

  sphereMesh = createSphereMesh(sphereGeometry);

  updateRecursionDisplay();

  render();
}

document
  .querySelector('#decreaseRecursion')
  .addEventListener('click', function () {
    if (recursionDepth > minimumRecursionDepth) {
      recursionDepth--;

      rebuildSphere();
    }
  });

document
  .querySelector('#increaseRecursion')
  .addEventListener('click', function () {
    if (recursionDepth < maximumRecursionDepth) {
      recursionDepth++;

      rebuildSphere();
    }
  });

const modeButtons = document.querySelectorAll('.mode-button');

function updateModeButtons() {
  for (const button of modeButtons) {
    const active = button.dataset.mode === sphereDisplayMode;

    button.classList.toggle('active', active);
  }
}

for (const button of modeButtons) {
  button.addEventListener('click', function () {
    sphereDisplayMode = button.dataset.mode;

    updateModeButtons();

    render();
  });
}

/*
    ==================================================
    AUTOMATISCHE KAMERAROTATION
    ==================================================

    Die automatische Rotation benutzt exakt dieselbe
    Kreisbahn wie die manuelle Pfeiltastensteuerung.

    Es wird also kein Objekt gedreht.
    Verändert wird ausschließlich camera.zAngle.
*/

let autoRotationEnabled = true;

const autoRotationSpeed = (10 * Math.PI) / 180;

let previousAnimationTime = null;

const autoRotationButton = document.querySelector('#toggleAutoRotation');

function updateAutoRotationButton() {
  autoRotationButton.setAttribute('aria-pressed', String(autoRotationEnabled));

  autoRotationButton.classList.toggle('active', autoRotationEnabled);

  if (autoRotationEnabled) {
    autoRotationButton.textContent = 'Auto-Rotation pausieren';
  } else {
    autoRotationButton.textContent = 'Auto-Rotation starten';
  }
}

autoRotationButton.addEventListener('click', function () {
  autoRotationEnabled = !autoRotationEnabled;

  updateAutoRotationButton();
});

function animateCamera(currentTime) {
  if (previousAnimationTime === null) {
    previousAnimationTime = currentTime;
  }

  /*
        Zeit seit dem letzten Frame
        von Millisekunden in Sekunden umrechnen.
    */

  const deltaTime = Math.min(
    (currentTime - previousAnimationTime) / 1000,

    0.1,
  );

  previousAnimationTime = currentTime;

  if (autoRotationEnabled) {
    camera.zAngle += autoRotationSpeed * deltaTime;

    calculateCameraOrbit();

    updateCameraDisplay();

    render();
  }

  requestAnimationFrame(animateCamera);
}

/*
    ==================================================
    KAMERASTEUERUNG
    ==================================================
*/

const cameraAngleStep = (10 * Math.PI) / 180;

const cameraDistanceStep = 0.5;

const minimumCameraDistance = 4.5;

const maximumCameraDistance = 14.0;

document.addEventListener('keydown', function (event) {
  let cameraChanged = false;

  /*
            ------------------------------------------
            PFEIL LINKS
            ------------------------------------------
        */

  if (event.key === 'ArrowLeft') {
    event.preventDefault();

    autoRotationEnabled = false;

    updateAutoRotationButton();

    camera.zAngle -= cameraAngleStep;

    cameraChanged = true;
  }

  /*
            ------------------------------------------
            PFEIL RECHTS
            ------------------------------------------
        */

  if (event.key === 'ArrowRight') {
    event.preventDefault();

    autoRotationEnabled = false;

    updateAutoRotationButton();

    camera.zAngle += cameraAngleStep;

    cameraChanged = true;
  }

  /*
            ------------------------------------------
            N UND SHIFT + N
            ------------------------------------------
        */

  if (event.key.toLowerCase() === 'n') {
    event.preventDefault();

    if (event.shiftKey) {
      /*
                    Shift + N:
                    Abstand vergrößern.
                */

      camera.distance = Math.min(
        maximumCameraDistance,

        camera.distance + cameraDistanceStep,
      );
    } else {
      /*
                    N:
                    Abstand verkleinern.
                */

      camera.distance = Math.max(
        minimumCameraDistance,

        camera.distance - cameraDistanceStep,
      );
    }

    cameraChanged = true;
  }

  /*
            Nur bei tatsächlicher Änderung
            Kamera neu berechnen.
        */

  if (cameraChanged) {
    calculateCameraOrbit();

    updateCameraDisplay();

    render();
  }
});

/*
    ==================================================
    RESIZE
    ==================================================
*/

window.addEventListener('resize', function () {
  render();
});

/*
    ==================================================
    INITIALISIERUNG
    ==================================================
*/

calculateCameraOrbit();

updateCameraDisplay();

updateRecursionDisplay();

updateModeButtons();

updateAutoRotationButton();

render();

requestAnimationFrame(animateCamera);
