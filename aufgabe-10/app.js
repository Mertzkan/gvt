'use strict';

/* =========================================================
   KONFIGURATION
   ========================================================= */

/*
   Unsere zunächst verwendeten t-SNE-Parameter.

   Diese Werte können wir später noch vergleichen
   und gegebenenfalls optimieren.
*/

const TSNE_CONFIG = {
  perplexity: 10,
  epsilon: 20,
  dim: 3,
};

/*
   Die t-SNE-Koordinaten können je nach Lauf
   sehr unterschiedliche Zahlenbereiche besitzen.

   Für die reine WebGL-Darstellung skalieren wir
   die komplette Punktwolke daher einheitlich auf
   einen festen räumlichen Radius.

   Die relativen Abstände der Punkte bleiben dabei
   erhalten.
*/

const DISPLAY_RADIUS = 3.25;

/*
   Größe jeder dargestellten Kugel.
*/

const POINT_SCALE = 0.095;

/*
   Farben der drei Klassen.

   1 = Kama
   2 = Rosa
   3 = Canadian

   Die Werte entsprechen auch ungefähr
   der Legende in unserer style.css.
*/

const CLASS_COLORS = {
  1: [0.184, 0.435, 0.69],

  2: [0.776, 0.361, 0.29],

  3: [0.263, 0.518, 0.357],
};

/* =========================================================
   HTML-ELEMENTE
   ========================================================= */

const canvas = document.querySelector('#sceneCanvas');

const tsneModeStatus = document.querySelector('#tsneModeStatus');

const stepCountDisplay = document.querySelector('#stepCount');

const perplexityStatus = document.querySelector('#perplexityStatus');

const epsilonStatus = document.querySelector('#epsilonStatus');

const dimensionStatus = document.querySelector('#dimensionStatus');

const dataCountStatus = document.querySelector('#dataCountStatus');

const csvStatus = document.querySelector('#csvStatus');

const bestDataStatus = document.querySelector('#bestDataStatus');

const restartButton = document.querySelector('#restartTsne');

const stepButton = document.querySelector('#stepTsne');

const step10Button = document.querySelector('#step10Tsne');

/*
   Dieser Button ist nur während unserer
   Entwicklungsphase notwendig.

   Wenn wir ihn später aus der HTML entfernen,
   läuft die Anwendung trotzdem weiter.
*/

const exportBestButton = document.querySelector('#exportBest');

/* =========================================================
   WEBGL
   ========================================================= */

const gl = canvas.getContext('webgl');

if (!gl) {
  throw new Error('WebGL konnte nicht initialisiert werden.');
}

let prog = null;

let sphereMesh = null;

/* =========================================================
   DATEN UND t-SNE
   ========================================================= */

/*
   Originaldaten:

   210 Datensätze
   ×
   7 Merkmale.
*/

let rawData = [];

/*
   Z-standardisierte Daten.

   Diese Daten gehen später in t-SNE.
*/

let standardizedData = [];

/*
   Klassen 1, 2 oder 3.
*/

let labels = [];

/*
   Aktuelle t-SNE-Instanz.

   Beim Anzeigen von seeds-best.json
   brauchen wir zunächst keine laufende Instanz.
*/

let tSNE = null;

/*
   Die echten aktuellen t-SNE-Koordinaten.

   Diese werden später auch in
   seeds-best.json gespeichert.
*/

let currentEmbedding = [];

/*
   Für die WebGL-Darstellung zentrierte
   und einheitlich skalierte Koordinaten.
*/

let displayPositions = [];

/*
   Sichtbarer Step-Count.
*/

let currentStep = 0;

/*
   Mögliche Zustände:

   loading
   saved
   live
*/

let currentMode = 'loading';

/* =========================================================
   KAMERA NACH NAV
   ========================================================= */

/*
   Die Funktionen rotateX(), rotateY(),
   rotateZ() und translate() orientieren
   sich direkt an der NAV-Lerneinheit.

   Transformationen werden direkt mit der
   bestehenden View-Matrix multipliziert.
*/

const camera = {
  vMatrix: mat4.create(),

  pMatrix: mat4.create(),

  translate: function (vec) {
    const M = mat4.create();

    mat4.translate(
      M,

      M,

      vec,
    );

    mat4.multiply(
      this.vMatrix,

      M,

      this.vMatrix,
    );
  },

  rotateX: function (angle) {
    const M = mat4.create();

    mat4.rotateX(
      M,

      M,

      angle,
    );

    mat4.multiply(
      this.vMatrix,

      M,

      this.vMatrix,
    );
  },

  rotateY: function (angle) {
    const M = mat4.create();

    mat4.rotateY(
      M,

      M,

      angle,
    );

    mat4.multiply(
      this.vMatrix,

      M,

      this.vMatrix,
    );
  },

  rotateZ: function (angle) {
    const M = mat4.create();

    mat4.rotateZ(
      M,

      M,

      angle,
    );

    mat4.multiply(
      this.vMatrix,

      M,

      this.vMatrix,
    );
  },
};

/* =========================================================
   KAMERA ZURÜCKSETZEN
   ========================================================= */

function resetCamera() {
  mat4.identity(camera.vMatrix);

  /*
     Leicht erhöhte Startansicht.

     Zuerst wird die Szene gedreht.
  */

  camera.rotateX((-16 * Math.PI) / 180);

  camera.rotateY((28 * Math.PI) / 180);

  /*
     Danach wird die Kamera beziehungsweise
     die View-Matrix entlang Z verschoben.
  */

  camera.translate([0, 0, -8.2]);
}

/* =========================================================
   VERTEX-SHADER
   ========================================================= */

const vertexShaderSource = `

  attribute vec3 aPosition;
  attribute vec3 aNormal;


  uniform mat4 uPMatrix;
  uniform mat4 uMVMatrix;
  uniform mat3 uNMatrix;


  varying vec3 vNormalEye;


  void main() {

    vec4 tPosition =

      uMVMatrix
      *
      vec4(
        aPosition,
        1.0
      );


    gl_Position =

      uPMatrix
      *
      tPosition;


    vNormalEye =

      normalize(
        uNMatrix
        *
        aNormal
      );

  }

`;

/* =========================================================
   FRAGMENT-SHADER
   ========================================================= */

const fragmentShaderSource = `

  precision mediump float;


  uniform vec3 uColor;


  varying vec3 vNormalEye;


  void main() {

    vec3 normal =

      normalize(
        vNormalEye
      );


    /*
       Eine einfache Lichtquelle in
       Kamerarichtung.

       Sie dient nur dazu, die kleinen
       Kugeln räumlich lesbar zu machen.
    */

    vec3 lightDirection =

      normalize(

        vec3(
          0.35,
          0.65,
          1.0
        )

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
       Genügend Umgebungslicht,
       damit alle Klassenfarben sichtbar
       bleiben.
    */

    float lightFactor =

      0.42

      +

      0.58
      *
      diffuse;


    vec3 finalColor =

      uColor
      *
      lightFactor;


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

/* =========================================================
   SHADER INITIALISIEREN
   ========================================================= */

function initShaderProgram() {
  prog = createProgram();

  gl.useProgram(prog);

  /*
     Attribute.
  */

  prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');

  prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');

  /*
     Uniforms.
  */

  prog.pMatrixUniform = gl.getUniformLocation(prog, 'uPMatrix');

  prog.mvMatrixUniform = gl.getUniformLocation(prog, 'uMVMatrix');

  prog.nMatrixUniform = gl.getUniformLocation(prog, 'uNMatrix');

  prog.colorUniform = gl.getUniformLocation(prog, 'uColor');

  gl.enableVertexAttribArray(prog.positionAttrib);

  gl.enableVertexAttribArray(prog.normalAttrib);
}

/* =========================================================
   KUGEL-GEOMETRIE AUS DIM
   ========================================================= */

/*
   Wir verwenden die Kugel-Geometrie aus

   GVT_Src_vertexData_sphere.js

   Der Geometrie-Buffer wird nur EINMAL
   angelegt.

   Alle 210 Datensätze greifen beim Zeichnen
   auf dieselben Buffer zurück.

   Nur Position, Farbe und Modellmatrix
   ändern sich.
*/

function initSphereGeometry() {
  if (typeof sphere === 'undefined') {
    throw new Error('GVT_Src_vertexData_sphere.js wurde nicht geladen.');
  }

  const geometry = {};

  sphere.createVertexData.apply(geometry);

  sphereMesh = {
    vboPosition: gl.createBuffer(),

    vboNormal: gl.createBuffer(),

    iboTriangles: gl.createBuffer(),

    indexCount: geometry.indicesTris.length,
  };

  /*
     Positionen.
  */

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    sphereMesh.vboPosition,
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,

    geometry.vertices,

    gl.STATIC_DRAW,
  );

  /*
     Normalen.
  */

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    sphereMesh.vboNormal,
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,

    geometry.normals,

    gl.STATIC_DRAW,
  );

  /*
     Dreiecksindizes.
  */

  gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,

    sphereMesh.iboTriangles,
  );

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,

    geometry.indicesTris,

    gl.STATIC_DRAW,
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

/* =========================================================
   CSV LADEN
   ========================================================= */

async function loadSeedsCSV() {
  csvStatus.textContent = 'Lädt …';

  /*
     Wichtig:

     Die Webseite muss über einen Webserver
     gestartet werden.

     Also beispielsweise GitHub Pages oder
     einen lokalen Entwicklungsserver.
  */

  const response = await fetch(
    'data/seeds_dataset.csv',

    {
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(
      'seeds_dataset.csv konnte nicht geladen werden. HTTP ' + response.status,
    );
  }

  const csvText = await response.text();

  /*
     CSV-Verarbeitung entsprechend DIM
     mit Papa Parse.
  */

  const result = Papa.parse(
    csvText,

    {
      delimiter: ',',

      dynamicTyping: true,

      skipEmptyLines: true,
    },
  );

  if (result.errors.length > 0) {
    console.warn(
      'Papa Parse Hinweise:',

      result.errors,
    );
  }

  rawData = [];

  labels = [];

  /* =========================================================
   DATEN UND LABEL TRENNEN
   ========================================================= */

  result.data.forEach(function (row, index) {
    /*
         Erwartet werden:

         7 Merkmale
         +
         1 Klassenlabel.
      */

    if (!Array.isArray(row) || row.length < 8) {
      console.warn(
        'Ungültige CSV-Zeile übersprungen:',

        index + 1,

        row,
      );

      return;
    }

    const features = row.slice(0, 7).map(Number);

    const classLabel = Number(row[7]);

    const validFeatures = features.every(Number.isFinite);

    const validLabel = [1, 2, 3].includes(classLabel);

    if (!validFeatures || !validLabel) {
      console.warn(
        'Ungültige CSV-Zeile übersprungen:',

        index + 1,

        row,
      );

      return;
    }

    rawData.push(features);

    labels.push(classLabel);
  });

  if (rawData.length === 0) {
    throw new Error(
      'In der CSV-Datei wurden keine gültigen Seeds-Daten gefunden.',
    );
  }

  /*
     Vor t-SNE standardisieren.
  */

  standardizedData = standardizeData(rawData);

  dataCountStatus.textContent = String(rawData.length);

  csvStatus.textContent = 'Geladen';

  console.info(
    'Seeds CSV geladen:',

    rawData.length,

    'Datensätze mit 7 Merkmalen.',
  );
}

/* =========================================================
   Z-STANDARDISIERUNG
   ========================================================= */

/*
   Für jedes Merkmal:

   z = (x - Mittelwert) / Standardabweichung
*/

function standardizeData(data) {
  const numberOfRows = data.length;

  const numberOfFeatures = data[0].length;

  const means = new Array(numberOfFeatures).fill(0);

  const standardDeviations = new Array(numberOfFeatures).fill(0);

  /* =====================================================
     MITTELWERTE
     ===================================================== */

  for (let feature = 0; feature < numberOfFeatures; feature++) {
    for (let row = 0; row < numberOfRows; row++) {
      means[feature] += data[row][feature];
    }

    means[feature] /= numberOfRows;
  }

  /* =====================================================
     STANDARDABWEICHUNGEN
     ===================================================== */

  for (let feature = 0; feature < numberOfFeatures; feature++) {
    let squaredSum = 0;

    for (let row = 0; row < numberOfRows; row++) {
      const difference = data[row][feature] - means[feature];

      squaredSum += difference * difference;
    }

    standardDeviations[feature] = Math.sqrt(squaredSum / numberOfRows);
  }

  /* =====================================================
     STANDARDISIERTE DATEN ERZEUGEN
     ===================================================== */

  return data.map(function (row) {
    return row.map(function (value, feature) {
      const sigma = standardDeviations[feature];

      /*
             Sicherheitsfall:
             keine Division durch 0.
          */

      if (sigma === 0) {
        return 0;
      }

      return (value - means[feature]) / sigma;
    });
  });
}

/* =========================================================
   GESPEICHERTES BESTES ERGEBNIS
   ========================================================= */

async function loadBestResult() {
  bestDataStatus.textContent = 'Lädt …';

  try {
    const response = await fetch(
      'data/seeds-best.json',

      {
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const json = await response.json();

    /*
       Unsere Datei enthält später:

       {
         parameters: {...},
         points: [...]
       }
    */

    if (!json || !Array.isArray(json.points)) {
      throw new Error('Ungültiges JSON-Format.');
    }

    if (json.points.length !== rawData.length) {
      throw new Error(
        'Die Anzahl der gespeicherten Punkte passt nicht zur CSV-Datei.',
      );
    }

    /*
       Koordinaten auslesen.
    */

    const positions = json.points.map(function (point, index) {
      const x = Number(point.x);

      const y = Number(point.y);

      const z = Number(point.z);

      if (![x, y, z].every(Number.isFinite)) {
        throw new Error('Ungültige 3D-Koordinate bei Punkt ' + index + '.');
      }

      return [x, y, z];
    });

    currentEmbedding = positions;

    /*
       Der gespeicherte Step-Count
       kommt aus der JSON-Datei.
    */

    currentStep = Number(json.parameters && json.parameters.iterations) || 1000;

    currentMode = 'saved';

    /*
       Für das gespeicherte Ergebnis gibt
       es keine dazugehörige laufende
       t-SNE-Instanz mehr.

       Ein neuer Lauf entsteht erst
       durch Restart.
    */

    tSNE = null;

    updateDisplayPositions();

    updateStatusDisplay();

    /*
       Erst nach Restart kann wieder
       iteriert werden.
    */

    setStepButtonsEnabled(false);

    bestDataStatus.textContent = 'Geladen';

    render();

    console.info(
      'Gespeichertes t-SNE-Ergebnis geladen:',

      currentStep,

      'Iterationen.',
    );

    return true;
  } catch (error) {
    /*
       Dieser Fall ist JETZT in der
       Entwicklungsphase normal.

       Später darf seeds-best.json
       bei der finalen Abgabe nicht fehlen.
    */

    console.info(
      'Noch kein seeds-best.json vorhanden. Entwicklungsmodus wird gestartet.',

      error.message,
    );

    bestDataStatus.textContent = 'Noch nicht vorhanden';

    return false;
  }
}

/* =========================================================
   t-SNE INITIALISIEREN
   ========================================================= */

function startNewTsne() {
  if (standardizedData.length === 0) {
    return;
  }

  /*
     Parameter entsprechend unserer
     aktuell getesteten Konfiguration.
  */

  const options = {
    epsilon: TSNE_CONFIG.epsilon,

    perplexity: TSNE_CONFIG.perplexity,

    dim: TSNE_CONFIG.dim,
  };

  /*
     t-SNE-Instanz aus tsne.js.
  */

  tSNE = new tsnejs.tSNE(options);

  /*
     Entsprechend DIM:

     initDataRaw() erhält die
     Eingangsdaten.

     Bei uns wurden diese zuvor
     z-standardisiert.
  */

  tSNE.initDataRaw(standardizedData);

  /*
     Nach initDataRaw():

     iter = 0

     und tSNE hat bereits eine
     zufällige Ausgangsposition.
  */

  currentStep = tSNE.iter;

  currentMode = 'live';

  currentEmbedding = cloneEmbedding(tSNE.getSolution());

  updateDisplayPositions();

  /*
     Kamera auf eine gut erkennbare
     Ausgangsperspektive zurücksetzen.
  */

  resetCamera();

  updateStatusDisplay();

  setStepButtonsEnabled(true);

  render();
}

/* =========================================================
   t-SNE ITERIEREN
   ========================================================= */

function stepTsne(numberOfSteps) {
  if (!tSNE) {
    return;
  }

  /*
     Genau die geforderte Zahl
     an Iterationen ausführen.
  */

  for (let i = 0; i < numberOfSteps; i++) {
    tSNE.step();
  }

  /*
     Der interne Iterationszähler
     von tSNEJS wird übernommen.
  */

  currentStep = tSNE.iter;

  currentEmbedding = cloneEmbedding(tSNE.getSolution());

  updateDisplayPositions();

  updateStatusDisplay();

  render();
}

/* =========================================================
   EMBEDDING KOPIEREN
   ========================================================= */

function cloneEmbedding(embedding) {
  return embedding.map(function (point) {
    return [point[0], point[1], point[2]];
  });
}

/* =========================================================
   3D-DATEN FÜR WEBGL SKALIEREN
   ========================================================= */

/*
   t-SNE erzeugt je nach Lauf unterschiedliche
   absolute Zahlenbereiche.

   Das ist für die mathematische Lösung kein
   Problem, für eine konstante Kameraposition
   aber unpraktisch.

   Deshalb:

   1. Schwerpunkt bestimmen.
   2. Punktwolke um den Ursprung zentrieren.
   3. Alle drei Achsen mit DEMSELBEN Faktor
      skalieren.

   Dadurch bleiben Form und relative
   Abstände erhalten.
*/

function updateDisplayPositions() {
  if (currentEmbedding.length === 0) {
    displayPositions = [];

    return;
  }

  const mean = [0, 0, 0];

  currentEmbedding.forEach(function (point) {
    mean[0] += point[0];

    mean[1] += point[1];

    mean[2] += point[2];
  });

  mean[0] /= currentEmbedding.length;

  mean[1] /= currentEmbedding.length;

  mean[2] /= currentEmbedding.length;

  let maxRadius = 0;

  const centered = currentEmbedding.map(function (point) {
    const p = [point[0] - mean[0], point[1] - mean[1], point[2] - mean[2]];

    const radius = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);

    maxRadius = Math.max(
      maxRadius,

      radius,
    );

    return p;
  });

  const scale = maxRadius > 0 ? DISPLAY_RADIUS / maxRadius : 1;

  displayPositions = centered.map(function (point) {
    return [point[0] * scale, point[1] * scale, point[2] * scale];
  });
}

/* =========================================================
   STATUSANZEIGE
   ========================================================= */

function updateStatusDisplay() {
  perplexityStatus.textContent = String(TSNE_CONFIG.perplexity);

  epsilonStatus.textContent = String(TSNE_CONFIG.epsilon);

  dimensionStatus.textContent = String(TSNE_CONFIG.dim);

  stepCountDisplay.textContent = String(currentStep);

  if (currentMode === 'saved') {
    tsneModeStatus.textContent = 'Gespeichert';
  } else if (currentMode === 'live') {
    tsneModeStatus.textContent = 'Neuer Lauf';
  } else {
    tsneModeStatus.textContent = 'Lädt …';
  }
}

/* =========================================================
   STEP-BUTTONS AKTIVIEREN
   ========================================================= */

function setStepButtonsEnabled(enabled) {
  stepButton.disabled = !enabled;

  step10Button.disabled = !enabled;
}

/* =========================================================
   BESTES ERGEBNIS EXPORTIEREN
   ========================================================= */

/*
   Diese Funktion brauchen wir nur,
   bis wir unsere finale
   seeds-best.json erzeugt haben.
*/

function exportBestResult() {
  if (currentEmbedding.length !== rawData.length) {
    alert('Es ist noch kein vollständiges t-SNE-Ergebnis vorhanden.');

    return;
  }

  if (currentMode !== 'live') {
    alert('Starte zuerst mit Restart einen neuen t-SNE-Lauf und iteriere ihn.');

    return;
  }

  /*
     JSON-Struktur für unsere
     gespeicherte Lösung.
  */

  const exportData = {
    dataset: 'Seeds Dataset',

    preprocessing: 'z-score',

    parameters: {
      perplexity: TSNE_CONFIG.perplexity,

      epsilon: TSNE_CONFIG.epsilon,

      dim: TSNE_CONFIG.dim,

      iterations: currentStep,
    },

    points: currentEmbedding.map(function (point, index) {
      return {
        x: Number(point[0].toFixed(8)),

        y: Number(point[1].toFixed(8)),

        z: Number(point[2].toFixed(8)),

        class: labels[index],
      };
    }),
  };

  const json = JSON.stringify(
    exportData,

    null,

    2,
  );

  const blob = new Blob(
    [json],

    {
      type: 'application/json',
    },
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;

  link.download = 'seeds-best.json';

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/* =========================================================
   MATRIZEN FÜR DAS ZEICHNEN
   ========================================================= */

const modelMatrix = mat4.create();

const modelViewMatrix = mat4.create();

const normalMatrix = mat3.create();

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

  /*
     Heller neutraler Hintergrund passend
     zu den vorherigen Aufgaben.
  */

  gl.clearColor(0.945, 0.955, 0.965, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (displayPositions.length === 0) {
    return;
  }

  /*
     Perspektivische Projektion.
  */

  const aspect = canvas.width / canvas.height;

  mat4.perspective(
    camera.pMatrix,

    (42 * Math.PI) / 180,

    aspect,

    0.1,

    100.0,
  );

  gl.useProgram(prog);

  gl.uniformMatrix4fv(
    prog.pMatrixUniform,

    false,

    camera.pMatrix,
  );

  /* =====================================================
     GEMEINSAME KUGELBUFFER
     ===================================================== */

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    sphereMesh.vboPosition,
  );

  gl.vertexAttribPointer(
    prog.positionAttrib,

    3,

    gl.FLOAT,

    false,

    0,

    0,
  );

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    sphereMesh.vboNormal,
  );

  gl.vertexAttribPointer(
    prog.normalAttrib,

    3,

    gl.FLOAT,

    false,

    0,

    0,
  );

  gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,

    sphereMesh.iboTriangles,
  );

  /* =====================================================
     ALLE 210 DATENSÄTZE ZEICHNEN
     ===================================================== */

  for (let i = 0; i < displayPositions.length; i++) {
    /*
       Modellmatrix zurücksetzen.
    */

    mat4.identity(modelMatrix);

    /*
       Kugel an t-SNE-Position verschieben.
    */

    mat4.translate(
      modelMatrix,

      modelMatrix,

      displayPositions[i],
    );

    /*
       Kleine Kugel.
    */

    mat4.scale(
      modelMatrix,

      modelMatrix,

      [POINT_SCALE, POINT_SCALE, POINT_SCALE],
    );

    /*
       ModelView.
    */

    mat4.multiply(
      modelViewMatrix,

      camera.vMatrix,

      modelMatrix,
    );

    /*
       Normalenmatrix.
    */

    mat3.normalFromMat4(
      normalMatrix,

      modelViewMatrix,
    );

    gl.uniformMatrix4fv(
      prog.mvMatrixUniform,

      false,

      modelViewMatrix,
    );

    gl.uniformMatrix3fv(
      prog.nMatrixUniform,

      false,

      normalMatrix,
    );

    /*
       Farbe anhand der Klasse.
    */

    const color = CLASS_COLORS[labels[i]] || [0.5, 0.5, 0.5];

    gl.uniform3fv(
      prog.colorUniform,

      color,
    );

    /*
       Kugel zeichnen.
    */

    gl.drawElements(
      gl.TRIANGLES,

      sphereMesh.indexCount,

      gl.UNSIGNED_SHORT,

      0,
    );
  }
}

/* =========================================================
   INTERAKTION
   ========================================================= */

function initEventHandlers() {
  /* =====================================================
     RESTART
     ===================================================== */

  restartButton.addEventListener(
    'click',

    function () {
      startNewTsne();
    },
  );

  /* =====================================================
     STEP
     ===================================================== */

  stepButton.addEventListener(
    'click',

    function () {
      stepTsne(1);
    },
  );

  /* =====================================================
     STEP 10
     ===================================================== */

  step10Button.addEventListener(
    'click',

    function () {
      stepTsne(10);
    },
  );

  /* =====================================================
     TEMPORÄRER EXPORT
     ===================================================== */

  if (exportBestButton) {
    exportBestButton.addEventListener(
      'click',

      function () {
        exportBestResult();
      },
    );
  }

  /*
     Navigationsschritte.
  */

  const rotationStep = (6 * Math.PI) / 180;

  const translationStep = 0.35;

  /* =====================================================
     TASTATUR
     ===================================================== */

  window.addEventListener(
    'keydown',

    function (event) {
      const key = event.key.toLowerCase();

      /* =================================================
         R

         Restart.
         ================================================= */

      if (key === 'r') {
        event.preventDefault();

        startNewTsne();

        return;
      }

      /* =================================================
         T / SHIFT + T

         Ein beziehungsweise zehn
         t-SNE-Schritte.
         ================================================= */

      if (key === 't') {
        event.preventDefault();

        if (event.shiftKey) {
          stepTsne(10);
        } else {
          stepTsne(1);
        }

        return;
      }

      /* =================================================
         PFEIL LINKS
         ================================================= */

      if (event.key === 'ArrowLeft') {
        event.preventDefault();

        camera.rotateY(-rotationStep);

        render();

        return;
      }

      /* =================================================
         PFEIL RECHTS
         ================================================= */

      if (event.key === 'ArrowRight') {
        event.preventDefault();

        camera.rotateY(rotationStep);

        render();

        return;
      }

      /* =================================================
         PFEIL HOCH
         ================================================= */

      if (event.key === 'ArrowUp') {
        event.preventDefault();

        camera.rotateX(-rotationStep);

        render();

        return;
      }

      /* =================================================
         PFEIL RUNTER
         ================================================= */

      if (event.key === 'ArrowDown') {
        event.preventDefault();

        camera.rotateX(rotationStep);

        render();

        return;
      }

      /* =================================================
         W

         Kamera näher an die Daten.
         ================================================= */

      if (key === 'w') {
        event.preventDefault();

        camera.translate([0, 0, translationStep]);

        render();

        return;
      }

      /* =================================================
         S

         Kamera weiter zurück.
         ================================================= */

      if (key === 's') {
        event.preventDefault();

        camera.translate([0, 0, -translationStep]);

        render();

        return;
      }

      /* =================================================
         ZUSÄTZLICHE NAV-STEUERUNG

         X / Y / Z

         Shift kehrt die Rotationsrichtung um.
         ================================================= */

      const sign = event.shiftKey ? -1 : 1;

      if (key === 'x') {
        camera.rotateX(sign * rotationStep);

        render();

        return;
      }

      if (key === 'y') {
        camera.rotateY(sign * rotationStep);

        render();

        return;
      }

      if (key === 'z') {
        camera.rotateZ(sign * rotationStep);

        render();
      }
    },
  );

  /* =====================================================
     FENSTERGRÖSSE
     ===================================================== */

  window.addEventListener(
    'resize',

    function () {
      render();
    },
  );
}

/* =========================================================
   INITIALISIERUNG
   ========================================================= */

async function init() {
  /*
     Während des Ladens können keine
     Berechnungsschritte ausgeführt werden.
  */

  restartButton.disabled = true;

  setStepButtonsEnabled(false);

  /*
     Parameter sofort anzeigen.
  */

  perplexityStatus.textContent = String(TSNE_CONFIG.perplexity);

  epsilonStatus.textContent = String(TSNE_CONFIG.epsilon);

  dimensionStatus.textContent = String(TSNE_CONFIG.dim);

  /*
     WebGL vorbereiten.
  */

  initShaderProgram();

  initSphereGeometry();

  initEventHandlers();

  /*
     Depth Buffer.
  */

  gl.enable(gl.DEPTH_TEST);

  gl.depthFunc(gl.LEQUAL);

  /*
     Rückseiten der Kugeln nicht rendern.
  */

  gl.enable(gl.CULL_FACE);

  gl.cullFace(gl.BACK);

  gl.frontFace(gl.CCW);

  /*
     Kamera.
  */

  resetCamera();

  try {
    /* =====================================================
       1. SEEDS CSV
       ===================================================== */

    await loadSeedsCSV();

    restartButton.disabled = false;

    /* =====================================================
       2. GESPEICHERTES ERGEBNIS
       ===================================================== */

    const bestResultLoaded = await loadBestResult();

    /*
       Entwicklungszustand:

       Solange seeds-best.json noch nicht
       existiert, starten wir automatisch
       einen neuen zufälligen Lauf bei Step 0.

       In der FINALEN Abgabe darf dieser Fall
       nicht mehr auftreten.
    */

    if (!bestResultLoaded) {
      startNewTsne();
    }
  } catch (error) {
    console.error(error);

    csvStatus.textContent = 'Fehler';

    bestDataStatus.textContent = 'Nicht geladen';

    tsneModeStatus.textContent = 'Fehler';
  }
}

init();
