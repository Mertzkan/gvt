'use strict';

/*
    ==================================================
    HILFSFUNKTIONEN FÜR FARBEN
    ==================================================
*/

function mixColor(colorA, colorB, t) {
  return [
    colorA[0] + (colorB[0] - colorA[0]) * t,
    colorA[1] + (colorB[1] - colorA[1]) * t,
    colorA[2] + (colorB[2] - colorA[2]) * t,
  ];
}

function gradient3(colorA, colorB, colorC, t) {
  if (t < 0.5) {
    return mixColor(colorA, colorB, t * 2);
  }

  return mixColor(colorB, colorC, (t - 0.5) * 2);
}

/*
    ==================================================
    3D ROTATION
    ==================================================

    Wir verwenden noch keine Kamera.

    Die erzeugten Punkte werden lediglich um
    feste Winkel gedreht, damit die räumliche
    Struktur besser sichtbar wird.
*/

function rotatePoint(point, rotation) {
  let x = point[0];
  let y = point[1];
  let z = point[2];

  /*
        Rotation um X
    */

  const cosX = Math.cos(rotation.x);

  const sinX = Math.sin(rotation.x);

  let newY = y * cosX - z * sinX;

  let newZ = y * sinX + z * cosX;

  y = newY;
  z = newZ;

  /*
        Rotation um Y
    */

  const cosY = Math.cos(rotation.y);

  const sinY = Math.sin(rotation.y);

  let newX = x * cosY + z * sinY;

  newZ = -x * sinY + z * cosY;

  x = newX;
  z = newZ;

  /*
        Rotation um Z
    */

  const cosZ = Math.cos(rotation.z);

  const sinZ = Math.sin(rotation.z);

  newX = x * cosZ - y * sinZ;

  newY = x * sinZ + y * cosZ;

  return [newX, newY, z];
}

/*
    ==================================================
    PARAMETRISCHE GEOMETRIE ERZEUGEN
    ==================================================
*/

function createParametricGeometry(config) {
  const rawPositions = [];

  const colors = [];

  /*
        --------------------------------------------------
        VERTICES UND FARBEN
        --------------------------------------------------
    */

  for (let i = 0; i <= config.uSegments; i++) {
    const uNormalized = i / config.uSegments;

    const u = config.uMin + uNormalized * (config.uMax - config.uMin);

    for (let j = 0; j <= config.vSegments; j++) {
      const vNormalized = j / config.vSegments;

      const v = config.vMin + vNormalized * (config.vMax - config.vMin);

      /*
                Punkt anhand der jeweiligen
                parametrischen Formel berechnen.
            */

      const point = config.formula(u, v);

      rawPositions.push(point);

      /*
                Farbe algorithmisch bestimmen.
            */

      const color = config.colorFunction(u, v, uNormalized, vNormalized, point);

      colors.push(color[0], color[1], color[2]);
    }
  }

  /*
        --------------------------------------------------
        DREIECKSINDIZES
        --------------------------------------------------

        Ein Rasterfeld:

        a ------- b
        |       / |
        |     /   |
        |   /     |
        | /       |
        c ------- d

        wird in zwei Dreiecke zerlegt:

        a,c,b
        b,c,d
    */

  const triangleIndices = [];

  for (let i = 0; i < config.uSegments; i++) {
    for (let j = 0; j < config.vSegments; j++) {
      const rowLength = config.vSegments + 1;

      const a = i * rowLength + j;

      const b = a + 1;

      const c = (i + 1) * rowLength + j;

      const d = c + 1;

      triangleIndices.push(
        a,
        c,
        b,

        b,
        c,
        d,
      );
    }
  }

  /*
        --------------------------------------------------
        LINIENINDIZES
        --------------------------------------------------

        Linien in Richtung des Parameters v.
    */

  const lineIndices = [];

  for (let i = 0; i <= config.uSegments; i++) {
    for (let j = 0; j < config.vSegments; j++) {
      const rowLength = config.vSegments + 1;

      const a = i * rowLength + j;

      const b = a + 1;

      lineIndices.push(a, b);
    }
  }

  /*
        Linien in Richtung des Parameters u.
    */

  for (let j = 0; j <= config.vSegments; j++) {
    for (let i = 0; i < config.uSegments; i++) {
      const rowLength = config.vSegments + 1;

      const a = i * rowLength + j;

      const b = (i + 1) * rowLength + j;

      lineIndices.push(a, b);
    }
  }

  /*
        --------------------------------------------------
        ROTATION
        --------------------------------------------------
    */

  const rotatedPositions = rawPositions.map(function (point) {
    return rotatePoint(point, config.rotation);
  });

  /*
        --------------------------------------------------
        MITTELPUNKT DER GEOMETRIE
        --------------------------------------------------

        Zunächst bestimmen wir die Bounding Box.
    */

  let minX = Infinity;
  let maxX = -Infinity;

  let minY = Infinity;
  let maxY = -Infinity;

  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const point of rotatedPositions) {
    minX = Math.min(minX, point[0]);

    maxX = Math.max(maxX, point[0]);

    minY = Math.min(minY, point[1]);

    maxY = Math.max(maxY, point[1]);

    minZ = Math.min(minZ, point[2]);

    maxZ = Math.max(maxZ, point[2]);
  }

  const centerX = (minX + maxX) / 2;

  const centerY = (minY + maxY) / 2;

  const centerZ = (minZ + maxZ) / 2;

  /*
        --------------------------------------------------
        AUTOMATISCHE SKALIERUNG
        --------------------------------------------------

        Die Geometrie soll sicher innerhalb von
        -1 bis +1 bleiben.

        0.82 lässt etwas Rand zum Canvas.
    */

  let maxDistance = 0;

  for (const point of rotatedPositions) {
    const centeredX = point[0] - centerX;

    const centeredY = point[1] - centerY;

    const centeredZ = point[2] - centerZ;

    maxDistance = Math.max(
      maxDistance,
      Math.abs(centeredX),
      Math.abs(centeredY),
      Math.abs(centeredZ),
    );
  }

  const scale = 0.82 / maxDistance;

  /*
        --------------------------------------------------
        FINALE POSITIONSDATEN
        --------------------------------------------------
    */

  const positions = [];

  for (const point of rotatedPositions) {
    positions.push(
      (point[0] - centerX) * scale,

      (point[1] - centerY) * scale,

      (point[2] - centerZ) * scale,
    );
  }

  /*
        Sicherheitsprüfung für Uint16Array.
    */

  const vertexCount = positions.length / 3;

  if (vertexCount > 65535) {
    throw new Error('Zu viele Vertices für Uint16-Indizes.');
  }

  return {
    positions: new Float32Array(positions),

    colors: new Float32Array(colors),

    triangleIndices: new Uint16Array(triangleIndices),

    lineIndices: new Uint16Array(lineIndices),

    vertexCount: vertexCount,

    triangleCount: triangleIndices.length / 3,

    lineCount: lineIndices.length / 2,
  };
}

/*
    ==================================================
    SHADER
    ==================================================
*/

const vertexShaderSource = `

    attribute vec3 aPosition;

    attribute vec3 aColor;


    uniform float uRotationAngle;


    varying vec3 vColor;


    void main() {

        float c =
            cos(uRotationAngle);

        float s =
            sin(uRotationAngle);


        /*
            Rotation um die Y-Achse.
        */

        vec3 rotatedPosition =
            vec3(

                c * aPosition.x +
                s * aPosition.z,

                aPosition.y,

                -s * aPosition.x +
                c * aPosition.z

            );


        gl_Position =
            vec4(
                rotatedPosition,
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

function createProgram(gl) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  );

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

/*
    ==================================================
    WEBGL BUFFER
    ==================================================
*/

function createBuffer(gl, target, data) {
  const buffer = gl.createBuffer();

  gl.bindBuffer(target, buffer);

  gl.bufferData(target, data, gl.STATIC_DRAW);

  return buffer;
}

/*
    ==================================================
    EINEN RENDERER FÜR EINE FLÄCHE ERZEUGEN
    ==================================================
*/

function createSurfaceRenderer(canvas, geometry) {
  const gl = canvas.getContext('webgl', {
    antialias: true,
  });

  if (gl === null) {
    throw new Error(
      `WebGL konnte für ${canvas.id} nicht initialisiert werden.`,
    );
  }

  const program = createProgram(gl);

  /*
        Buffer
    */

  const positionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, geometry.positions);

  const colorBuffer = createBuffer(gl, gl.ARRAY_BUFFER, geometry.colors);

  const triangleBuffer = createBuffer(
    gl,
    gl.ELEMENT_ARRAY_BUFFER,
    geometry.triangleIndices,
  );

  const lineBuffer = createBuffer(
    gl,
    gl.ELEMENT_ARRAY_BUFFER,
    geometry.lineIndices,
  );

  /*
        Attribute und Uniforms
    */

  const positionLocation = gl.getAttribLocation(program, 'aPosition');

  const colorLocation = gl.getAttribLocation(program, 'aColor');

  const solidColorLocation = gl.getUniformLocation(program, 'uSolidColor');

  const useSolidColorLocation = gl.getUniformLocation(
    program,
    'uUseSolidColor',
  );

  const rotationAngleLocation = gl.getUniformLocation(
    program,
    'uRotationAngle',
  );

  let mode = 'combined';

  /*
        --------------------------------------------------
        RENDERN
        --------------------------------------------------
    */

  function render(rotationAngle = 0) {
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.973, 0.973, 0.973, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);

    gl.depthFunc(gl.LEQUAL);

    gl.useProgram(program);

    gl.uniform1f(rotationAngleLocation, rotationAngle);

    /*
            Positionen
        */

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.enableVertexAttribArray(positionLocation);

    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    /*
            Farben
        */

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

    gl.enableVertexAttribArray(colorLocation);

    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    /*
            ------------------------------------------
            GEFÜLLTE FLÄCHE
            ------------------------------------------
        */

    if (mode === 'combined') {
      /*
                Die Flächen werden minimal nach
                hinten verschoben, damit die Linien
                danach ohne Z-Fighting sichtbar sind.
            */

      gl.enable(gl.POLYGON_OFFSET_FILL);

      gl.polygonOffset(1, 1);

      gl.uniform1f(useSolidColorLocation, 0.0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);

      gl.drawElements(
        gl.TRIANGLES,
        geometry.triangleIndices.length,
        gl.UNSIGNED_SHORT,
        0,
      );

      gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    /*
            ------------------------------------------
            DRAHTGITTER
            ------------------------------------------
        */

    if (mode === 'combined') {
      gl.uniform3f(solidColorLocation, 0.2, 0.22, 0.26);
    } else {
      gl.uniform3f(solidColorLocation, 0.05, 0.06, 0.08);
    }
    gl.uniform1f(useSolidColorLocation, 1.0);

    /*
            Eine Linienbreite von 1 funktioniert
            zuverlässig auf allen WebGL Systemen.
        */

    gl.lineWidth(1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineBuffer);

    gl.drawElements(
      gl.LINES,
      geometry.lineIndices.length,
      gl.UNSIGNED_SHORT,
      0,
    );
  }

  function setMode(newMode) {
    mode = newMode;
  }

  render();

  return {
    setMode: setMode,

    render: render,
  };
}

/*
    ==================================================
    FLÄCHE 1
    DINI
    ==================================================
*/

const diniGeometry = createParametricGeometry({
  uMin: 0,

  uMax: 4 * Math.PI,

  vMin: 0.25,

  vMax: 2.0,

  uSegments: 72,

  vSegments: 36,

  rotation: {
    x: -0.55,

    y: 0.65,

    z: -0.1,
  },

  formula: function (u, v) {
    const a = 1.0;

    const b = 0.2;

    const x = a * Math.cos(u) * Math.sin(v);

    const y = a * Math.sin(u) * Math.sin(v);

    const z = a * (Math.cos(v) + Math.log(Math.tan(v / 2))) + b * u;

    return [x, y, z];
  },

  colorFunction: function (u, v, uNormalized, vNormalized) {
    const t = Math.min(1, Math.max(0, 0.6 * uNormalized + 0.4 * vNormalized));

    return gradient3(
      [0.05, 0.72, 0.72],

      [0.1, 0.38, 0.82],

      [0.48, 0.18, 0.72],

      t,
    );
  },
});

/*
    ==================================================
    FLÄCHE 2
    TRIAXIAL TRITORUS
    ==================================================
*/

const tritorusGeometry = createParametricGeometry({
  uMin: -Math.PI,

  uMax: Math.PI,

  vMin: -Math.PI,

  vMax: Math.PI,

  uSegments: 64,

  vSegments: 64,

  rotation: {
    x: -0.55,

    y: 0.75,

    z: 0.2,
  },

  formula: function (u, v) {
    const x = Math.sin(u) * (1 + Math.cos(v));

    const y =
      Math.sin(u + (2 * Math.PI) / 3) * (1 + Math.cos(v + (2 * Math.PI) / 3));

    const z =
      Math.sin(u + (4 * Math.PI) / 3) * (1 + Math.cos(v + (4 * Math.PI) / 3));

    return [x, y, z];
  },

  colorFunction: function (u, v, uNormalized, vNormalized, point) {
    /*
                    Farbverlauf abhängig von
                    beiden Parametern.
                */

    const wave =
      0.5 +
      0.5 * Math.sin(2 * Math.PI * (0.65 * uNormalized + 0.35 * vNormalized));

    return gradient3(
      [0.62, 0.1, 0.16],

      [0.96, 0.38, 0.08],

      [0.98, 0.73, 0.16],

      wave,
    );
  },
});

/*
    ==================================================
    FLÄCHE 3
    EIGENE PARAMETRISIERUNG
    ==================================================
*/

const waveGeometry = createParametricGeometry({
  uMin: 0,

  uMax: 2 * Math.PI,

  vMin: -1,

  vMax: 1,

  uSegments: 96,

  vSegments: 30,

  rotation: {
    x: -0.75,

    y: 0.25,

    z: 0.2,
  },

  formula: function (u, v) {
    /*
                    Fünffach modulierte
                    Grundform.
                */

    const radius = 0.5 + 0.08 * Math.cos(5 * u);

    /*
                    Der Faktor c aus der
                    dokumentierten Formel wird
                    anschließend automatisch durch
                    die NDC-Normalisierung bestimmt.
                */

    const x = (radius + 0.16 * v * Math.cos(3 * u)) * Math.cos(u);

    const y = 0.22 * Math.sin(5 * u) + 0.18 * v * Math.sin(3 * u);

    const z = (radius + 0.16 * v * Math.cos(3 * u)) * Math.sin(u);

    return [x, y, z];
  },

  colorFunction: function (u, v, uNormalized, vNormalized) {
    /*
                    Die Farbe folgt der
                    fünffachen Wellenstruktur.
                */

    const wave = 0.5 + 0.5 * Math.sin(5 * u);

    const t = Math.min(1, Math.max(0, 0.75 * wave + 0.25 * vNormalized));

    return gradient3(
      [0.08, 0.42, 0.88],

      [0.44, 0.2, 0.82],

      [0.88, 0.24, 0.62],

      t,
    );
  },
});

/*
    ==================================================
    RENDERER ERZEUGEN
    ==================================================
*/

const renderers = {
  dini: createSurfaceRenderer(
    document.querySelector('#diniCanvas'),

    diniGeometry,
  ),

  tritorus: createSurfaceRenderer(
    document.querySelector('#tritorusCanvas'),

    tritorusGeometry,
  ),

  wave: createSurfaceRenderer(
    document.querySelector('#waveCanvas'),

    waveGeometry,
  ),
};

/*
    ==================================================
    STATISTIKEN
    ==================================================
*/

document.querySelector('#diniVertexCount').textContent =
  diniGeometry.vertexCount;

document.querySelector('#diniTriangleCount').textContent =
  diniGeometry.triangleCount;

document.querySelector('#tritorusVertexCount').textContent =
  tritorusGeometry.vertexCount;

document.querySelector('#tritorusTriangleCount').textContent =
  tritorusGeometry.triangleCount;

document.querySelector('#waveVertexCount').textContent =
  waveGeometry.vertexCount;

document.querySelector('#waveTriangleCount').textContent =
  waveGeometry.triangleCount;

/*
    ==================================================
    BUTTONS
    ==================================================
*/

const viewButtons = document.querySelectorAll('.view-button');

for (const button of viewButtons) {
  button.addEventListener('click', function () {
    const surface = button.dataset.surface;

    const mode = button.dataset.mode;

    renderers[surface].setMode(mode);

    /*
                Aktiven Button innerhalb
                derselben Fläche markieren.
            */

    const relatedButtons = document.querySelectorAll(
      `[data-surface="${surface}"]`,
    );

    for (const relatedButton of relatedButtons) {
      relatedButton.classList.remove('active');
    }

    button.classList.add('active');
  });
}

/*
    ==================================================
    ROTATIONSANIMATION
    ==================================================
*/

const rotationButton = document.querySelector('#rotationButton');

let rotationEnabled = true;

let rotationAngle = 0;

let previousTime = null;

function animate(currentTime) {
  /*
        Beim ersten Aufruf gibt es noch
        keinen vorherigen Zeitwert.
    */

  if (previousTime === null) {
    previousTime = currentTime;
  }

  const deltaTime = currentTime - previousTime;

  previousTime = currentTime;

  /*
        Nur wenn die Rotation aktiviert ist,
        wird der Winkel verändert.
    */

  if (rotationEnabled) {
    rotationAngle += deltaTime * 0.00022;
  }

  /*
        Alle drei Oberflächen mit demselben
        Winkel neu darstellen.
    */

  renderers.dini.render(rotationAngle);

  renderers.tritorus.render(rotationAngle);

  renderers.wave.render(rotationAngle);

  requestAnimationFrame(animate);
}

rotationButton.addEventListener('click', function () {
  rotationEnabled = !rotationEnabled;

  rotationButton.setAttribute('aria-pressed', String(rotationEnabled));

  if (rotationEnabled) {
    rotationButton.textContent = 'Rotation pausieren';
  } else {
    rotationButton.textContent = 'Rotation fortsetzen';
  }
});

requestAnimationFrame(animate);
