'use strict';

/*
    ==================================================
    WEBGL INITIALISIEREN
    ==================================================
*/

const canvas = document.querySelector('#glCanvas');

const gl = canvas.getContext('webgl');

const statusElement = document.querySelector('#webglStatus');

if (gl === null) {
  statusElement.textContent =
    'WebGL konnte in diesem Browser nicht initialisiert werden.';

  throw new Error('WebGL wird von diesem Browser nicht unterstützt.');
}

/*
    ==================================================
    SHADER
    ==================================================
*/

const vertexShaderSource = `

    attribute vec2 aPosition;

    void main() {

        gl_Position = vec4(
            aPosition,
            0.0,
            1.0
        );

    }

`;

const fragmentShaderSource = `

    precision mediump float;

    uniform vec4 uColor;

    void main() {

        gl_FragColor = uColor;

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
    GEOMETRIE DER FUCHSMASKE
    ==================================================

    Die linke Hälfte wird auf einem Raster
    von 0 bis 20 entworfen.

    Anschließend wird sie automatisch an
    der vertikalen Mittelachse x = 10
    gespiegelt.

    Dadurch bleibt die Geometrie exakt
    symmetrisch.
*/

const CENTER_X = 10;

/*
    Einen einzelnen Punkt an der
    vertikalen Mittelachse spiegeln.
*/

function mirrorPoint(point) {
  return [2 * CENTER_X - point[0], point[1]];
}

/*
    Eine komplette Linie spiegeln.
*/

function mirrorLine(line) {
  return [mirrorPoint(line[0]), mirrorPoint(line[1])];
}

/*
    --------------------------------------------------
    LINKE HÄLFTE DER HAUPTGEOMETRIE
    --------------------------------------------------
*/

const leftMainLines = [
  /*
        Außenkontur
    */

  [
    [4.0, 1.0],
    [2.8, 4.8],
  ],

  [
    [2.8, 4.8],
    [3.6, 10.5],
  ],

  [
    [3.6, 10.5],
    [5.2, 14.8],
  ],

  [
    [5.2, 14.8],
    [7.2, 17.2],
  ],

  [
    [7.2, 17.2],
    [10.0, 18.4],
  ],

  /*
        Ohr
    */

  [
    [4.0, 1.0],
    [4.3, 2.4],
  ],

  [
    [4.3, 2.4],
    [5.2, 6.5],
  ],

  [
    [5.2, 6.5],
    [6.3, 4.2],
  ],

  [
    [6.3, 4.2],
    [4.0, 1.0],
  ],

  [
    [2.8, 4.8],
    [5.2, 6.5],
  ],

  /*
        Stirnfläche
    */

  [
    [6.3, 4.2],
    [7.4, 5.2],
  ],

  [
    [7.4, 5.2],
    [10.0, 6.2],
  ],

  [
    [6.3, 4.2],
    [10.0, 6.2],
  ],

  /*
        Auge

        Das Auge ist als kantige,
        geschlossene Fläche aufgebaut.
    */

  [
    [4.8, 8.4],
    [6.2, 7.8],
  ],

  [
    [6.2, 7.8],
    [7.6, 8.5],
  ],

  [
    [7.6, 8.5],
    [6.3, 9.4],
  ],

  [
    [6.3, 9.4],
    [4.8, 8.4],
  ],

  /*
        Verbindung Stirn zum Auge
    */

  [
    [7.4, 5.2],
    [6.2, 7.8],
  ],

  [
    [7.4, 5.2],
    [7.6, 8.5],
  ],

  /*
        Innere Gesichtsfläche
    */

  [
    [7.6, 8.5],
    [9.2, 13.4],
  ],

  [
    [6.3, 9.4],
    [6.0, 11.5],
  ],

  /*
        Wange
    */

  [
    [3.6, 10.5],
    [4.1, 10.7],
  ],

  [
    [4.1, 10.7],
    [6.0, 11.5],
  ],

  [
    [6.0, 11.5],
    [9.2, 13.4],
  ],

  [
    [4.1, 10.7],
    [5.2, 14.8],
  ],

  [
    [6.0, 11.5],
    [6.7, 14.4],
  ],

  [
    [6.7, 14.4],
    [5.2, 14.8],
  ],

  /*
        Untere Gesichtsfläche
    */

  [
    [5.2, 14.8],
    [8.2, 15.4],
  ],

  [
    [8.2, 15.4],
    [7.2, 17.2],
  ],

  [
    [8.2, 15.4],
    [10.0, 18.4],
  ],

  /*
        Mundbereich

        Die blaue Nase endet bei x = 9.2.
        Von dort beginnt die schwarze
        Mundkontur.
    */

  [
    [9.2, 13.4],
    [9.2, 14.9],
  ],

  [
    [9.2, 14.9],
    [10.0, 15.5],
  ],

  [
    [9.2, 14.9],
    [8.2, 15.4],
  ],

  /*
        Barthaare

        Drei Linien mit leicht
        unterschiedlichen Winkeln.
    */

  [
    [8.5, 13.5],
    [5.0, 12.6],
  ],

  [
    [8.4, 13.9],
    [4.7, 13.8],
  ],

  [
    [8.3, 14.2],
    [5.2, 15.0],
  ],
];

/*
    --------------------------------------------------
    RECHTE HÄLFTE AUTOMATISCH ERZEUGEN
    --------------------------------------------------
*/

const rightMainLines = leftMainLines.map(mirrorLine);

/*
    Linke und rechte Hälfte zusammenführen.
*/

const mainLines = [...leftMainLines, ...rightMainLines];

/*
    --------------------------------------------------
    BLAUE AKZENTGEOMETRIE
    --------------------------------------------------

    Blau wird bewusst nur für die
    Pupillen und die Nase verwendet.
*/

const leftPupilLines = [
  [
    [6.2, 8.35],
    [6.6, 8.65],
  ],

  [
    [6.6, 8.65],
    [6.2, 8.95],
  ],

  [
    [6.2, 8.95],
    [5.8, 8.65],
  ],

  [
    [5.8, 8.65],
    [6.2, 8.35],
  ],
];

const rightPupilLines = leftPupilLines.map(mirrorLine);

/*
    Nase

          oben
           /\
          /  \
    links    rechts
          \  /
           \/
          unten
*/

const noseLines = [
  [
    [10.0, 12.5],
    [10.8, 13.4],
  ],

  [
    [10.8, 13.4],
    [10.0, 14.2],
  ],

  [
    [10.0, 14.2],
    [9.2, 13.4],
  ],

  [
    [9.2, 13.4],
    [10.0, 12.5],
  ],
];

const accentLines = [...leftPupilLines, ...rightPupilLines, ...noseLines];

/*
    ==================================================
    RASTERKOORDINATEN IN WEBGL-KOORDINATEN UMWANDELN
    ==================================================
*/

function gridToWebGL(x, y) {
  const webGLX = x / 10 - 1;

  /*
        Bei unserem Raster liegt 0 oben.

        Bei WebGL liegt +1 oben.

        Deshalb wird die Y-Achse umgerechnet.
    */

  const webGLY = 1 - y / 10;

  return [webGLX, webGLY];
}

function createVertexData(lines) {
  const vertices = [];

  for (const line of lines) {
    const start = line[0];

    const end = line[1];

    const startPosition = gridToWebGL(start[0], start[1]);

    const endPosition = gridToWebGL(end[0], end[1]);

    vertices.push(
      startPosition[0],
      startPosition[1],

      endPosition[0],
      endPosition[1],
    );
  }

  return new Float32Array(vertices);
}

const mainVertexData = createVertexData(mainLines);

const accentVertexData = createVertexData(accentLines);

/*
    ==================================================
    BUFFER ERSTELLEN
    ==================================================
*/

function createBuffer(gl, vertexData) {
  const buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  return buffer;
}

const mainBuffer = createBuffer(gl, mainVertexData);

const accentBuffer = createBuffer(gl, accentVertexData);

/*
    ==================================================
    SHADER POSITIONEN
    ==================================================
*/

const positionLocation = gl.getAttribLocation(program, 'aPosition');

const colorLocation = gl.getUniformLocation(program, 'uColor');

/*
    ==================================================
    ZEICHNEN
    ==================================================
*/

function drawGeometry(buffer, vertexCount, red, green, blue) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.enableVertexAttribArray(positionLocation);

  gl.vertexAttribPointer(
    positionLocation,

    2,

    gl.FLOAT,

    false,

    0,

    0,
  );

  gl.uniform4f(colorLocation, red, green, blue, 1.0);

  /*
        Sehr wichtig:

        count entspricht hier der Anzahl
        der Vertices.

        Nicht der Anzahl der Float-Werte.
    */

  gl.drawArrays(gl.LINES, 0, vertexCount);
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);

  /*
        Hintergrundfarbe
    */

  gl.clearColor(0.973, 0.973, 0.973, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  /*
        Wir verwenden bewusst eine
        Linienbreite von 1.

        Größere Werte sind in WebGL nicht
        auf allen Systemen verfügbar.
    */

  gl.lineWidth(1);

  const mainVertexCount = mainVertexData.length / 2;

  const accentVertexCount = accentVertexData.length / 2;

  /*
        Dunkle Hauptgeometrie
    */

  drawGeometry(mainBuffer, mainVertexCount, 0.1, 0.1, 0.1);

  /*
        Blaue Akzentgeometrie
    */

  drawGeometry(accentBuffer, accentVertexCount, 0.122, 0.373, 0.659);
}

render();

/*
    ==================================================
    INFORMATIONEN AUF DER WEBSEITE
    ==================================================
*/

const mainVertexCount = mainVertexData.length / 2;

const accentVertexCount = accentVertexData.length / 2;

const totalVertexCount = mainVertexCount + accentVertexCount;

const totalLineCount = totalVertexCount / 2;

document.querySelector('#vertexCount').textContent = totalVertexCount;

document.querySelector('#lineCount').textContent = totalLineCount;

/*
    Vom Browser unterstützten Bereich
    für gl.lineWidth() ermitteln.
*/

const lineWidthRange = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE);

document.querySelector('#lineWidthInfo').textContent =
  `${lineWidthRange[0]} bis ${lineWidthRange[1]}`;

statusElement.textContent =
  'WebGL erfolgreich initialisiert. Geometrie wurde gerendert.';
