'use strict';

/*
    ==================================================
    WEBGL INITIALISIEREN
    ==================================================
*/

const canvas = document.querySelector('#glCanvas');

const gl = canvas.getContext('webgl', {
  antialias: true,
});

const statusElement = document.querySelector('#webglStatus');

if (gl === null) {
  statusElement.textContent = 'WebGL konnte nicht initialisiert werden.';

  throw new Error('WebGL wird von diesem Browser nicht unterstützt.');
}

/*
    ==================================================
    SHADER
    ==================================================
*/

const vertexShaderSource = `

    attribute vec2 aPosition;

    attribute vec3 aColor;


    varying vec3 vColor;


    void main() {

        gl_Position = vec4(
            aPosition,
            0.0,
            1.0
        );


        vColor = aColor;

    }

`;

const fragmentShaderSource = `

    precision mediump float;


    varying vec3 vColor;


    void main() {

        gl_FragColor = vec4(
            vColor,
            1.0
        );

    }

`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  const successful = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (!successful) {
    const error = gl.getShaderInfoLog(shader);

    gl.deleteShader(shader);

    throw new Error(`Shader konnte nicht kompiliert werden: ${error}`);
  }

  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);

  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  const successful = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (!successful) {
    const error = gl.getProgramInfoLog(program);

    gl.deleteProgram(program);

    throw new Error(`Shader-Programm konnte nicht verknüpft werden: ${error}`);
  }

  return program;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

const fragmentShader = createShader(
  gl,
  gl.FRAGMENT_SHADER,
  fragmentShaderSource,
);

const program = createProgram(gl, vertexShader, fragmentShader);

/*
    ==================================================
    FARBPALETTE
    ==================================================
*/

const colors = {
  orangeDark: [0.55, 0.2, 0.08],

  orange: [0.82, 0.32, 0.1],

  orangeLight: [0.96, 0.55, 0.22],

  orangeSoft: [0.93, 0.43, 0.16],

  cream: [0.95, 0.82, 0.65],

  creamLight: [1.0, 0.94, 0.84],

  brown: [0.2, 0.12, 0.09],

  dark: [0.08, 0.07, 0.07],

  blue: [0.12, 0.37, 0.66],

  blueLight: [0.34, 0.6, 0.84],
};

/*
    ==================================================
    GEOMETRIEDATEN
    ==================================================
*/

const vertices = [];

const vertexColors = [];

const indices = [];

/*
    Ein Dreieck hinzufügen.

    a, b und c sind die Positionen.

    colorA, colorB und colorC sind
    die Farben der drei Vertices.
*/

function addTriangle(a, b, c, colorA, colorB, colorC) {
  const firstIndex = vertices.length / 2;

  vertices.push(
    a[0],
    a[1],

    b[0],
    b[1],

    c[0],
    c[1],
  );

  vertexColors.push(...colorA, ...colorB, ...colorC);

  indices.push(firstIndex, firstIndex + 1, firstIndex + 2);
}

/*
    ==================================================
    SYMMETRIE
    ==================================================
*/

const CENTER_X = 10;

function mirrorPoint(point) {
  return [2 * CENTER_X - point[0], point[1]];
}

function addSymmetricTriangle(a, b, c, colorA, colorB, colorC) {
  /*
        Linkes Dreieck
    */

  addTriangle(
    a,
    b,
    c,

    colorA,
    colorB,
    colorC,
  );

  /*
        Gespiegeltes rechtes Dreieck.

        B und C werden vertauscht,
        damit die Orientierung des
        Dreiecks erhalten bleibt.
    */

  addTriangle(
    mirrorPoint(a),
    mirrorPoint(c),
    mirrorPoint(b),

    colorA,
    colorC,
    colorB,
  );
}

/*
    ==================================================
    GRUNDFORM DES KOPFES
    ==================================================
*/

const faceCenter = [10, 10.8];

const leftBoundary = [
  [10.0, 6.2],

  [6.3, 4.2],

  [4.0, 1.0],

  [2.8, 4.8],

  [3.6, 10.5],

  [5.2, 14.8],

  [7.2, 17.2],

  [10.0, 18.4],
];

const rightBoundary = leftBoundary.slice(1, -1).reverse().map(mirrorPoint);

const boundary = [...leftBoundary, ...rightBoundary];

function getBoundaryColor(point) {
  const y = point[1];

  if (y < 4.5) {
    return colors.orangeDark;
  }

  if (y > 15) {
    return colors.orangeDark;
  }

  if (y > 11) {
    return colors.orange;
  }

  return colors.orangeSoft;
}

/*
    Grundfläche als Dreiecksfächer aufbauen.

    Innerhalb jedes Dreiecks werden die
    Vertex-Farben interpoliert.
*/

for (let i = 0; i < boundary.length; i++) {
  const nextIndex = (i + 1) % boundary.length;

  const pointA = boundary[i];

  const pointB = boundary[nextIndex];

  addTriangle(
    faceCenter,

    pointA,

    pointB,

    colors.orangeLight,

    getBoundaryColor(pointA),

    getBoundaryColor(pointB),
  );
}

/*
    ==================================================
    INNERE OHREN
    ==================================================
*/

addSymmetricTriangle(
  [4.0, 1.4],

  [3.2, 4.6],

  [5.6, 4.2],

  colors.brown,

  colors.orangeDark,

  colors.orangeSoft,
);

addSymmetricTriangle(
  [4.0, 1.4],

  [5.6, 4.2],

  [4.5, 4.8],

  colors.brown,

  colors.orangeSoft,

  colors.orangeDark,
);

/*
    ==================================================
    STIRN-FACETTEN
    ==================================================
*/

addSymmetricTriangle(
  [6.3, 4.2],

  [10.0, 6.2],

  [7.2, 7.2],

  colors.orangeDark,

  colors.orangeLight,

  colors.orangeSoft,
);

addSymmetricTriangle(
  [7.2, 7.2],

  [10.0, 6.2],

  [8.7, 9.0],

  colors.orangeSoft,

  colors.orangeLight,

  colors.orange,
);

/*
    ==================================================
    AUGENBEREICH
    ==================================================
*/

const eyeA = [4.8, 8.4];

const eyeB = [6.2, 7.8];

const eyeC = [7.6, 8.5];

const eyeD = [6.3, 9.5];

addSymmetricTriangle(
  eyeA,
  eyeB,
  eyeC,

  colors.cream,

  colors.creamLight,

  colors.cream,
);

addSymmetricTriangle(
  eyeA,
  eyeC,
  eyeD,

  colors.cream,

  colors.cream,

  colors.creamLight,
);

/*
    ==================================================
    DUNKLE AUGEN
    ==================================================
*/

function addDiamond(center, radiusX, radiusY, outerColor, centerColor) {
  const top = [center[0], center[1] - radiusY];

  const right = [center[0] + radiusX, center[1]];

  const bottom = [center[0], center[1] + radiusY];

  const left = [center[0] - radiusX, center[1]];

  addTriangle(center, top, right, centerColor, outerColor, outerColor);

  addTriangle(center, right, bottom, centerColor, outerColor, outerColor);

  addTriangle(center, bottom, left, centerColor, outerColor, outerColor);

  addTriangle(center, left, top, centerColor, outerColor, outerColor);
}

addDiamond(
  [6.2, 8.65],

  0.48,
  0.34,

  colors.dark,
  colors.brown,
);

addDiamond(
  [13.8, 8.65],

  0.48,
  0.34,

  colors.dark,
  colors.brown,
);

/*
    Kleine blaue Pupillen.
*/

addDiamond(
  [6.2, 8.65],

  0.18,
  0.14,

  colors.blue,
  colors.blueLight,
);

addDiamond(
  [13.8, 8.65],

  0.18,
  0.14,

  colors.blue,
  colors.blueLight,
);

/*
    ==================================================
    WANGEN
    ==================================================
*/

addSymmetricTriangle(
  [6.3, 9.5],

  [6.0, 11.6],

  [9.2, 13.4],

  colors.orangeSoft,

  colors.orangeLight,

  colors.cream,
);

addSymmetricTriangle(
  [6.0, 11.6],

  [5.2, 14.8],

  [9.2, 13.4],

  colors.orange,

  colors.orangeDark,

  colors.cream,
);

addSymmetricTriangle(
  [5.2, 14.8],

  [8.2, 15.4],

  [7.2, 17.2],

  colors.orangeDark,

  colors.orangeSoft,

  colors.orangeDark,
);

/*
    ==================================================
    HELLE SCHNAUZE
    ==================================================
*/

addSymmetricTriangle(
  [9.2, 13.4],

  [10.0, 14.2],

  [8.2, 15.4],

  colors.cream,

  colors.creamLight,

  colors.cream,
);

addSymmetricTriangle(
  [8.2, 15.4],

  [10.0, 15.7],

  [7.2, 17.2],

  colors.cream,

  colors.creamLight,

  colors.orangeLight,
);

/*
    ==================================================
    NASE
    ==================================================
*/

addDiamond(
  [10.0, 13.5],

  0.78,
  0.72,

  colors.dark,
  colors.brown,
);

/*
    ==================================================
    MUND
    ==================================================
*/

addTriangle(
  [9.65, 14.35],

  [10.35, 14.35],

  [10.0, 14.9],

  colors.brown,

  colors.brown,

  colors.dark,
);

/*
    ==================================================
    GEOMETRIE PRÜFEN
    ==================================================
*/

function validateGeometry() {
  if (vertices.length % 2 !== 0) {
    throw new Error('Vertex-Array enthält keine vollständigen 2D-Vertices.');
  }

  if (vertexColors.length % 3 !== 0) {
    throw new Error('Farb-Array enthält keine vollständigen RGB-Farben.');
  }

  const vertexCount = vertices.length / 2;

  const colorCount = vertexColors.length / 3;

  if (vertexCount !== colorCount) {
    throw new Error('Anzahl der Vertices und Farben stimmt nicht überein.');
  }

  if (indices.length % 3 !== 0) {
    throw new Error('Index-Array enthält keine vollständigen Dreiecke.');
  }

  for (const index of indices) {
    if (index >= vertexCount) {
      throw new Error('Index verweist auf einen nicht vorhandenen Vertex.');
    }
  }
}

validateGeometry();

/*
    ==================================================
    WEBGL KOORDINATEN
    ==================================================
*/

function gridToWebGL(x, y) {
  return [x / 10 - 1, 1 - y / 10];
}

/*
    Die Rasterkoordinaten werden erst jetzt
    in WebGL-Koordinaten umgewandelt.
*/

const webGLVertices = [];

for (let i = 0; i < vertices.length; i += 2) {
  const position = gridToWebGL(vertices[i], vertices[i + 1]);

  webGLVertices.push(position[0], position[1]);
}

/*
    ==================================================
    BUFFER
    ==================================================
*/

function createBuffer(target, data, usage) {
  const buffer = gl.createBuffer();

  gl.bindBuffer(target, buffer);

  gl.bufferData(target, data, usage);

  return buffer;
}

const positionBuffer = createBuffer(
  gl.ARRAY_BUFFER,

  new Float32Array(webGLVertices),

  gl.STATIC_DRAW,
);

const colorBuffer = createBuffer(
  gl.ARRAY_BUFFER,

  new Float32Array(vertexColors),

  gl.STATIC_DRAW,
);

const indexBuffer = createBuffer(
  gl.ELEMENT_ARRAY_BUFFER,

  new Uint16Array(indices),

  gl.STATIC_DRAW,
);

/*
    ==================================================
    ATTRIBUTE POSITIONEN
    ==================================================
*/

const positionLocation = gl.getAttribLocation(program, 'aPosition');

const colorLocation = gl.getAttribLocation(program, 'aColor');

/*
    ==================================================
    RENDERN
    ==================================================
*/

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(0.973, 0.973, 0.973, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  /*
        Positionsdaten
    */

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.enableVertexAttribArray(positionLocation);

  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  /*
        Farbdaten
    */

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

  gl.enableVertexAttribArray(colorLocation);

  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

  /*
        Indizes
    */

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  /*
        Wichtig:

        count entspricht hier der Anzahl
        der Indizes.

        Da jeweils drei Indizes ein
        Dreieck ergeben:

        triangleCount = indices.length / 3
    */

  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

render();

/*
    ==================================================
    INFORMATIONEN
    ==================================================
*/

const vertexCount = vertices.length / 2;

const triangleCount = indices.length / 3;

document.querySelector('#vertexCount').textContent = vertexCount;

document.querySelector('#triangleCount').textContent = triangleCount;

statusElement.textContent =
  'WebGL erfolgreich initialisiert. Dreiecksgeometrie wurde gerendert.';
