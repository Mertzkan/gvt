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

const toonStatus = document.querySelector('#toonStatus');

const shaderMode = document.querySelector('#shaderMode');

const lightAngleDisplay = document.querySelector('#lightAngleDisplay');

const light1X = document.querySelector('#light1X');

const light1Y = document.querySelector('#light1Y');

const light1Z = document.querySelector('#light1Z');

const light2X = document.querySelector('#light2X');

const light2Y = document.querySelector('#light2Y');

const light2Z = document.querySelector('#light2Z');

const toggleToonButton = document.querySelector('#toggleToon');

const moveLightsButton = document.querySelector('#moveLights');

/*
   Diese Elemente sind optional.

   Wir können sie später in der HTML-Seite
   ergänzen. Der JavaScript-Code funktioniert
   aber auch ohne sie.
*/

const toggleCameraButton = document.querySelector('#toggleCamera');

const topViewButton = document.querySelector('#topView');

const cameraStatusDisplay = document.querySelector('#cameraStatus');

/* =========================================================
   VERTEX-SHADER
   ========================================================= */

const vertexShaderSource = `

    attribute vec3 aPosition;
    attribute vec3 aNormal;


    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat3 uNormalMatrix;


    varying vec3 vPositionEye;
    varying vec3 vNormalEye;


    void main() {

        vec4 positionEye =

            uModelViewMatrix
            *
            vec4(
                aPosition,
                1.0
            );


        vPositionEye =
            positionEye.xyz;


        vNormalEye =

            normalize(
                uNormalMatrix
                *
                aNormal
            );


        gl_Position =

            uProjectionMatrix
            *
            positionEye;

    }

`;

/* =========================================================
   FRAGMENT-SHADER
   ========================================================= */

/*
   Grundlage:

   - ambient
   - diffuse
   - specular
   - zwei Punktlichtquellen
   - Phong-Materialien


   Erweiterung:

   - Toon-Shading im Fragment-Shader
   - diskrete Helligkeitsstufen
   - reduzierter Toon-Glanz
   - dezenter Silhouetteneffekt
*/

const fragmentShaderSource = `

    precision mediump float;


    struct PhongMaterial {

        vec3 ka;
        vec3 kd;
        vec3 ks;

        float ke;

    };


    struct Light {

        bool isOn;

        vec3 position;
        vec3 color;

    };


    uniform PhongMaterial material;

    uniform vec3 ambientLight;

    uniform Light light[2];


    uniform bool uUseToon;

    uniform bool uUnlit;

    uniform vec4 uUnlitColor;


    varying vec3 vPositionEye;
    varying vec3 vNormalEye;



    /* =====================================================
       TOON-STUFEN
       ===================================================== */

    float quantizeDiffuse(
        float value
    ) {

        if (
            value > 0.72
        ) {

            return 1.00;

        }


        if (
            value > 0.48
        ) {

            return 0.78;

        }


        if (
            value > 0.24
        ) {

            return 0.52;

        }


        return 0.30;

    }



    /* =====================================================
       LICHTBEITRAG
       ===================================================== */

    void calculateLight(

        bool isOn,

        vec3 lightPosition,

        vec3 lightColor,

        vec3 normal,

        vec3 viewDirection,

        inout vec3 diffuseColor,

        inout vec3 specularColor,

        inout float diffuseIntensity

    ) {

        if (
            !isOn
        ) {

            return;

        }


        /*
           Richtung vom Fragment
           zur Lichtquelle.
        */

        vec3 lightDirection =

            normalize(
                lightPosition
                -
                vPositionEye
            );


        /*
           Lambert-Anteil.
        */

        float diffuse =

            max(
                dot(
                    normal,
                    lightDirection
                ),
                0.0
            );


        diffuseIntensity +=
            diffuse;


        diffuseColor +=

            lightColor
            *
            diffuse;


        /*
           Spekularer Anteil.
        */

        if (
            diffuse > 0.0
        ) {

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

                    material.ke

                );


            specularColor +=

                lightColor
                *
                specular;

        }

    }



    /* =====================================================
       MAIN
       ===================================================== */

    void main() {

        /*
           Lichtmarker werden ohne
           Beleuchtung ausgegeben.
        */

        if (
            uUnlit
        ) {

            gl_FragColor =
                uUnlitColor;

            return;

        }


        vec3 normal =

            normalize(
                vNormalEye
            );


        /*
           Kamera befindet sich in
           Eye Coordinates im Ursprung.
        */

        vec3 viewDirection =

            normalize(
                -vPositionEye
            );


        /*
           Ambientes Licht.
        */

        vec3 ambient =

            ambientLight
            *
            material.ka;


        vec3 diffuseLight =

            vec3(
                0.0
            );


        vec3 specularLight =

            vec3(
                0.0
            );


        float diffuseIntensity =
            0.0;



        /* =================================================
           LICHT 1
           ================================================= */

        calculateLight(

            light[0].isOn,

            light[0].position,

            light[0].color,

            normal,

            viewDirection,

            diffuseLight,

            specularLight,

            diffuseIntensity

        );



        /* =================================================
           LICHT 2
           ================================================= */

        calculateLight(

            light[1].isOn,

            light[1].position,

            light[1].color,

            normal,

            viewDirection,

            diffuseLight,

            specularLight,

            diffuseIntensity

        );


        vec3 finalColor;



        /* =================================================
           TOON-SHADING
           ================================================= */

        if (
            uUseToon
        ) {

            /*
               Zwei Lichtbeiträge werden
               zusammengeführt.
            */

            float averagedDiffuse =

                clamp(

                    diffuseIntensity
                    /
                    2.0,

                    0.0,
                    1.0

                );


            /*
               Nur wenige feste
               Helligkeitsstufen.
            */

            float toonDiffuse =

                quantizeDiffuse(
                    averagedDiffuse
                );


            /*
               Spekularer Toon-Highlight.

               Bewusst wesentlich dezenter
               als in der vorherigen Version.
            */

            float specularStrength =

                max(

                    max(
                        specularLight.r,
                        specularLight.g
                    ),

                    specularLight.b

                );


            float toonSpecular =

                specularStrength > 0.72
                    ? 1.0
                    : 0.0;


            finalColor =

                ambient

                +

                material.kd
                *
                toonDiffuse

                +

                material.ks
                *
                toonSpecular
                *
                0.20;


            /*
               Dezenter Silhouetteneffekt.

               Dadurch wirken Kugeln und
               Torus stärker wie gezeichnete
               Formen.

               Der Effekt basiert auf dem
               Winkel zwischen Blickrichtung
               und Oberflächennormale.
            */

            float edgeFactor =

                abs(
                    dot(
                        normal,
                        viewDirection
                    )
                );


            if (
                edgeFactor < 0.13
            ) {

                finalColor *=
                    0.24;

            }

        }



        /* =================================================
           NORMALES PHONG-SHADING
           ================================================= */

        else {

            finalColor =

                ambient

                +

                material.kd
                *
                diffuseLight

                +

                material.ks
                *
                specularLight;

        }


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
   SHADER-LOCATIONS
   ========================================================= */

prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');

prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');

prog.modelViewMatrixUniform = gl.getUniformLocation(prog, 'uModelViewMatrix');

prog.projectionMatrixUniform = gl.getUniformLocation(prog, 'uProjectionMatrix');

prog.normalMatrixUniform = gl.getUniformLocation(prog, 'uNormalMatrix');

prog.materialKaUniform = gl.getUniformLocation(prog, 'material.ka');

prog.materialKdUniform = gl.getUniformLocation(prog, 'material.kd');

prog.materialKsUniform = gl.getUniformLocation(prog, 'material.ks');

prog.materialKeUniform = gl.getUniformLocation(prog, 'material.ke');

prog.ambientLightUniform = gl.getUniformLocation(prog, 'ambientLight');

prog.lightUniform = [];

for (let i = 0; i < 2; i++) {
  prog.lightUniform.push({
    isOn: gl.getUniformLocation(
      prog,

      'light[' + i + '].isOn',
    ),

    position: gl.getUniformLocation(
      prog,

      'light[' + i + '].position',
    ),

    color: gl.getUniformLocation(
      prog,

      'light[' + i + '].color',
    ),
  });
}

prog.useToonUniform = gl.getUniformLocation(prog, 'uUseToon');

prog.unlitUniform = gl.getUniformLocation(prog, 'uUnlit');

prog.unlitColorUniform = gl.getUniformLocation(prog, 'uUnlitColor');

/* =========================================================
   BEL-BELEUCHTUNG
   ========================================================= */

const illumination = {
  /*
       Für Toon-Shading bewusst etwas
       schwächer als der ursprüngliche
       BEL-Wert 0.5.
    */

  ambientLight: [0.16, 0.16, 0.16],

  light: [
    {
      isOn: true,

      position: [3.0, 2.4, 3.0],

      /*
               Weißes Licht.

               Die Intensität ist nur etwas
               reduziert, damit die Materialien
               nicht überstrahlen.
            */

      color: [0.82, 0.82, 0.82],
    },

    {
      isOn: true,

      position: [-3.0, 2.4, -3.0],

      color: [0.82, 0.82, 0.82],
    },
  ],
};

/* =========================================================
   PHONG-MATERIAL
   ========================================================= */

function createPhongMaterial(material) {
  material = material || {};

  material.ka = material.ka || [0.3, 0.3, 0.3];

  material.kd = material.kd || [0.6, 0.6, 0.6];

  material.ks = material.ks || [0.8, 0.8, 0.8];

  material.ke = material.ke || 10.0;

  return material;
}

/* =========================================================
   TOON-ZUSTAND
   ========================================================= */

let toonEnabled = true;

/* =========================================================
   LICHTKREIS
   ========================================================= */

const LIGHT_ORBIT_RADIUS = 4.3;

const LIGHT_HEIGHT = 2.4;

/*
   Startwinkel 45 Grad.
*/

let lightAngle = Math.PI / 4;

/*
   Jeder L-Tastendruck:

   15 Grad.
*/

const LIGHT_STEP = (15 * Math.PI) / 180;

/* =========================================================
   KAMERA
   ========================================================= */

/*
   Die Kamera bewegt sich automatisch
   auf einer Kreisbahn um die Szene.

   Die Lichtpositionen werden dadurch
   NICHT verändert.
*/

const camera = {
  target: vec3.fromValues(0.0, 0.45, 0.0),

  eye: vec3.create(),

  up: vec3.fromValues(0.0, 1.0, 0.0),

  vMatrix: mat4.create(),

  pMatrix: mat4.create(),
};

/*
   Kameraradius.

   Kleiner als vorher:
   Die Kamera steht näher an der Szene.
*/

const CAMERA_RADIUS = 7.6;

/*
   Horizontaler Winkel.
*/

let cameraAzimuth = (35 * Math.PI) / 180;

/*
   Vertikaler Blickwinkel.

   24 Grad liefert eine leicht erhöhte
   Ausgangsperspektive.
*/

let cameraElevation = (24 * Math.PI) / 180;

/*
   Normale Kamerahöhe zum Zurückschalten.
*/

const DEFAULT_CAMERA_ELEVATION = (24 * Math.PI) / 180;

/*
   Draufsicht.
*/

const TOP_CAMERA_ELEVATION = (76 * Math.PI) / 180;

/*
   Grenzen.
*/

const MIN_CAMERA_ELEVATION = (12 * Math.PI) / 180;

const MAX_CAMERA_ELEVATION = (80 * Math.PI) / 180;

/*
   Automatische Kamerarotation.
*/

let cameraAnimationRunning = true;

let topViewEnabled = false;

/*
   Langsame, ruhige Bewegung:

   14 Grad pro Sekunde.
*/

const CAMERA_ROTATION_SPEED = (14 * Math.PI) / 180;

/*
   Manueller Schritt über Pfeiltasten.
*/

const CAMERA_MANUAL_STEP = (7 * Math.PI) / 180;

/* =========================================================
   KAMERAPOSITION BERECHNEN
   ========================================================= */

function updateCamera() {
  /*
       Kugelkoordinaten.

       elevation:
       Winkel über der XZ-Ebene.

       azimuth:
       Winkel um die Y-Achse.
    */

  const horizontalRadius = CAMERA_RADIUS * Math.cos(cameraElevation);

  const height = CAMERA_RADIUS * Math.sin(cameraElevation);

  camera.eye[0] = camera.target[0] + horizontalRadius * Math.sin(cameraAzimuth);

  camera.eye[1] = camera.target[1] + height;

  camera.eye[2] = camera.target[2] + horizontalRadius * Math.cos(cameraAzimuth);

  mat4.lookAt(
    camera.vMatrix,

    camera.eye,

    camera.target,

    camera.up,
  );
}

/* =========================================================
   MODELLE
   ========================================================= */

const models = [];

let lightMarker1 = null;

let lightMarker2 = null;

/* =========================================================
   KUGEL
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
   TORUS
   ========================================================= */

function createTorusGeometry() {
  const positions = [];

  const normals = [];

  const indices = [];

  const majorRadius = 1.35;

  const minorRadius = 0.38;

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

      normals.push(
        cosV * cosU,

        sinV,

        cosV * sinU,
      );
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
   EBENE
   ========================================================= */

function createPlaneGeometry() {
  /*
       Bewusst etwas kleiner als zuvor.

       Dadurch dominiert die Ebene
       nicht mehr die gesamte Darstellung.
    */

  const positions = new Float32Array([
    -4.5, 0.0, -4.0,

    4.5, 0.0, -4.0,

    4.5, 0.0, 4.0,

    -4.5, 0.0, 4.0,
  ]);

  const normals = new Float32Array([
    0, 1, 0,

    0, 1, 0,

    0, 1, 0,

    0, 1, 0,
  ]);

  const indices = new Uint16Array([
    0, 2, 1,

    0, 3, 2,
  ]);

  return {
    positions,
    normals,
    indices,
  };
}

/* =========================================================
   GEOMETRIE AUSWÄHLEN
   ========================================================= */

function createGeometry(geometryName) {
  if (geometryName === 'sphere') {
    return createSphereGeometry();
  }

  if (geometryName === 'torus') {
    return createTorusGeometry();
  }

  if (geometryName === 'plane') {
    return createPlaneGeometry();
  }

  throw new Error('Unbekannte Geometrie: ' + geometryName);
}

/* =========================================================
   BUFFER
   ========================================================= */

function initDataAndBuffers(model, geometryName) {
  const geometry = createGeometry(geometryName);

  model.positionBuffer = gl.createBuffer();

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.positionBuffer,
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,

    geometry.positions,

    gl.STATIC_DRAW,
  );

  model.normalBuffer = gl.createBuffer();

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.normalBuffer,
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,

    geometry.normals,

    gl.STATIC_DRAW,
  );

  model.indexBuffer = gl.createBuffer();

  gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,

    model.indexBuffer,
  );

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,

    geometry.indices,

    gl.STATIC_DRAW,
  );

  model.indexCount = geometry.indices.length;
}

/* =========================================================
   TRANSFORMATIONEN
   ========================================================= */

function initTransformations(
  model,

  translate,

  rotate,

  scale,
) {
  model.translate = translate.slice();

  model.rotate = rotate.slice();

  model.scale = scale.slice();

  model.mMatrix = mat4.create();

  model.mvMatrix = mat4.create();

  model.normalMatrix = mat3.create();
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

  material,
) {
  const model = {};

  model.geometryName = geometryName;

  model.fillstyle = fillstyle;

  model.color = color.slice();

  model.material = material;

  model.unlit = false;

  initDataAndBuffers(
    model,

    geometryName,
  );

  initTransformations(
    model,

    translate,

    rotate,

    scale,
  );

  models.push(model);

  return model;
}

/* =========================================================
   SZENE INITIALISIEREN
   ========================================================= */

function initModels() {
  const fs = 'fill';

  const mDefault = createPhongMaterial();

  /*
       Kräftige, aber etwas angenehmere
       Materialfarben.
    */

  const mRed = createPhongMaterial({
    kd: [0.94, 0.16, 0.08],
  });

  const mGreen = createPhongMaterial({
    kd: [0.1, 0.72, 0.22],
  });

  const mBlue = createPhongMaterial({
    kd: [0.08, 0.3, 0.92],
  });

  /*
       BEL 03:

       Ebene ohne spekularen Anteil.
    */

  const mWhite = createPhongMaterial({
    ka: [1.0, 1.0, 1.0],

    kd: [0.56, 0.56, 0.56],

    ks: [0.0, 0.0, 0.0],
  });

  /*
       -----------------------------------------------------
       TORUS

       Der Torus steht aufrecht auf der
       Ebene.

       Sein unterster Punkt liegt ungefähr
       auf Höhe der Ebene.
       -----------------------------------------------------
    */

  createModel(
    'torus',

    fs,

    [1, 1, 1, 1],

    [0.0, 0.99, 0.0],

    [Math.PI / 2, 0.1, -0.05],

    [1.05, 1.05, 1.05],

    mRed,
  );

  /*
       -----------------------------------------------------
       GRÜNE KUGEL

       Links neben dem Torus.

       Die Unterseite liegt auf der Ebene.
       -----------------------------------------------------
    */

  createModel(
    'sphere',

    fs,

    [1, 1, 1, 1],

    [-2.55, -0.03, 0.12],

    [0, 0, 0],

    [0.78, 0.78, 0.78],

    mGreen,
  );

  /*
       -----------------------------------------------------
       BLAUE KUGEL

       Rechts neben dem Torus.
       -----------------------------------------------------
    */

  createModel(
    'sphere',

    fs,

    [1, 1, 1, 1],

    [2.55, -0.03, -0.12],

    [0, 0, 0],

    [0.78, 0.78, 0.78],

    mBlue,
  );

  /*
       -----------------------------------------------------
       EBENE
       -----------------------------------------------------
    */

  createModel(
    'plane',

    fs,

    [1, 1, 1, 1],

    [0, -0.81, 0],

    [0, 0, 0],

    [1, 1, 1],

    mWhite,
  );

  /*
       -----------------------------------------------------
       LICHTMARKER

       Kleine gelbliche Kugeln zeigen nur,
       WO sich die weißen Lichtquellen
       befinden.
       -----------------------------------------------------
    */

  lightMarker1 = createModel(
    'sphere',

    fs,

    [1.0, 0.92, 0.22, 1.0],

    illumination.light[0].position,

    [0, 0, 0],

    [0.15, 0.15, 0.15],

    mDefault,
  );

  lightMarker1.unlit = true;

  lightMarker2 = createModel(
    'sphere',

    fs,

    [1.0, 0.92, 0.22, 1.0],

    illumination.light[1].position,

    [0, 0, 0],

    [0.15, 0.15, 0.15],

    mDefault,
  );

  lightMarker2.unlit = true;
}

/* =========================================================
   MODEL-MATRIZEN
   ========================================================= */

function updateTransformations(model) {
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
    model.normalMatrix,

    model.mvMatrix,
  );
}

/* =========================================================
   LICHTPOSITIONEN
   ========================================================= */

function updateLightPositions() {
  illumination.light[0].position[0] = LIGHT_ORBIT_RADIUS * Math.cos(lightAngle);

  illumination.light[0].position[1] = LIGHT_HEIGHT;

  illumination.light[0].position[2] = LIGHT_ORBIT_RADIUS * Math.sin(lightAngle);

  const secondAngle = lightAngle + Math.PI;

  illumination.light[1].position[0] =
    LIGHT_ORBIT_RADIUS * Math.cos(secondAngle);

  illumination.light[1].position[1] = LIGHT_HEIGHT;

  illumination.light[1].position[2] =
    LIGHT_ORBIT_RADIUS * Math.sin(secondAngle);

  if (lightMarker1) {
    lightMarker1.translate[0] = illumination.light[0].position[0];

    lightMarker1.translate[1] = illumination.light[0].position[1];

    lightMarker1.translate[2] = illumination.light[0].position[2];
  }

  if (lightMarker2) {
    lightMarker2.translate[0] = illumination.light[1].position[0];

    lightMarker2.translate[1] = illumination.light[1].position[1];

    lightMarker2.translate[2] = illumination.light[1].position[2];
  }
}

/* =========================================================
   LICHTER WEITERSCHALTEN
   ========================================================= */

function moveLightsOneStep() {
  lightAngle += LIGHT_STEP;

  lightAngle = lightAngle % (Math.PI * 2);

  updateLightPositions();

  updateStatusDisplay();

  render();
}

/* =========================================================
   TOON UMSCHALTEN
   ========================================================= */

function toggleToonShading() {
  toonEnabled = !toonEnabled;

  updateStatusDisplay();

  render();
}

/* =========================================================
   KAMERA PAUSE / START
   ========================================================= */

function toggleCameraAnimation() {
  cameraAnimationRunning = !cameraAnimationRunning;

  updateStatusDisplay();
}

/* =========================================================
   DRAUFSICHT
   ========================================================= */

function toggleTopView() {
  topViewEnabled = !topViewEnabled;

  cameraElevation = topViewEnabled
    ? TOP_CAMERA_ELEVATION
    : DEFAULT_CAMERA_ELEVATION;

  updateCamera();

  updateStatusDisplay();

  render();
}

/* =========================================================
   ATTRIBUTE BINDEN
   ========================================================= */

function bindModelData(model) {
  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.positionBuffer,
  );

  gl.vertexAttribPointer(
    prog.positionAttrib,

    3,

    gl.FLOAT,

    false,

    0,

    0,
  );

  gl.enableVertexAttribArray(prog.positionAttrib);

  gl.bindBuffer(
    gl.ARRAY_BUFFER,

    model.normalBuffer,
  );

  gl.vertexAttribPointer(
    prog.normalAttrib,

    3,

    gl.FLOAT,

    false,

    0,

    0,
  );

  gl.enableVertexAttribArray(prog.normalAttrib);

  gl.uniformMatrix4fv(
    prog.modelViewMatrixUniform,

    false,

    model.mvMatrix,
  );

  gl.uniformMatrix4fv(
    prog.projectionMatrixUniform,

    false,

    camera.pMatrix,
  );

  gl.uniformMatrix3fv(
    prog.normalMatrixUniform,

    false,

    model.normalMatrix,
  );
}

/* =========================================================
   MODELL ZEICHNEN
   ========================================================= */

function draw(model) {
  bindModelData(model);

  gl.uniform1i(
    prog.unlitUniform,

    model.unlit ? 1 : 0,
  );

  gl.uniform4fv(
    prog.unlitColorUniform,

    model.color,
  );

  gl.uniform3fv(
    prog.materialKaUniform,

    model.material.ka,
  );

  gl.uniform3fv(
    prog.materialKdUniform,

    model.material.kd,
  );

  gl.uniform3fv(
    prog.materialKsUniform,

    model.material.ks,
  );

  gl.uniform1f(
    prog.materialKeUniform,

    model.material.ke,
  );

  gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,

    model.indexBuffer,
  );

  gl.drawElements(
    gl.TRIANGLES,

    model.indexCount,

    gl.UNSIGNED_SHORT,

    0,
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
   RENDERN
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

    (43 * Math.PI) / 180,

    aspect,

    0.1,

    100.0,
  );

  gl.clearColor(0.95, 0.96, 0.97, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);

  gl.depthFunc(gl.LEQUAL);

  gl.useProgram(prog);

  /*
       Ambient.
    */

  gl.uniform3fv(
    prog.ambientLightUniform,

    illumination.ambientLight,
  );

  /*
       -----------------------------------------------------
       LICHTPOSITIONEN

       Weltkoordinaten werden wie in BEL
       mit camera.vMatrix nach Eye
       Coordinates transformiert.
       -----------------------------------------------------
    */

  for (let j = 0; j < illumination.light.length; j++) {
    gl.uniform1i(
      prog.lightUniform[j].isOn,

      illumination.light[j].isOn ? 1 : 0,
    );

    const lightPos = [].concat(illumination.light[j].position);

    lightPos.push(1.0);

    vec4.transformMat4(
      lightPos,

      lightPos,

      camera.vMatrix,
    );

    lightPos.pop();

    gl.uniform3fv(
      prog.lightUniform[j].position,

      lightPos,
    );

    gl.uniform3fv(
      prog.lightUniform[j].color,

      illumination.light[j].color,
    );
  }

  gl.uniform1i(
    prog.useToonUniform,

    toonEnabled ? 1 : 0,
  );

  /*
       Ebene zuerst beziehungsweise
       alle Modelle ganz normal über den
       Z-Buffer zeichnen.

       Die tatsächliche Sichtbarkeit wird
       vom Tiefentest bestimmt.
    */

  for (let i = 0; i < models.length; i++) {
    updateTransformations(models[i]);

    draw(models[i]);
  }
}

/* =========================================================
   STATUS
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
  toonStatus.textContent = toonEnabled ? 'Ein' : 'Aus';

  shaderMode.textContent = toonEnabled ? 'Toon' : 'Phong';

  toggleToonButton.textContent = toonEnabled
    ? 'Toon-Shading ausschalten'
    : 'Toon-Shading einschalten';

  toggleToonButton.classList.toggle(
    'active',

    toonEnabled,
  );

  toggleToonButton.setAttribute(
    'aria-pressed',

    String(toonEnabled),
  );

  lightAngleDisplay.textContent = radiansToDegrees(lightAngle).toFixed(0) + '°';

  light1X.textContent = illumination.light[0].position[0].toFixed(2);

  light1Y.textContent = illumination.light[0].position[1].toFixed(2);

  light1Z.textContent = illumination.light[0].position[2].toFixed(2);

  light2X.textContent = illumination.light[1].position[0].toFixed(2);

  light2Y.textContent = illumination.light[1].position[1].toFixed(2);

  light2Z.textContent = illumination.light[1].position[2].toFixed(2);

  /*
       Optionale HTML-Anzeigen.
    */

  if (cameraStatusDisplay) {
    cameraStatusDisplay.textContent = cameraAnimationRunning
      ? 'Läuft'
      : 'Pausiert';
  }

  if (toggleCameraButton) {
    toggleCameraButton.textContent = cameraAnimationRunning
      ? 'Kamera pausieren'
      : 'Kamera starten';

    toggleCameraButton.classList.toggle(
      'active',

      cameraAnimationRunning,
    );
  }

  if (topViewButton) {
    topViewButton.classList.toggle(
      'active',

      topViewEnabled,
    );

    topViewButton.textContent = topViewEnabled
      ? 'Normale Ansicht'
      : 'Draufsicht';
  }
}

/* =========================================================
   BUTTONS
   ========================================================= */

moveLightsButton.addEventListener(
  'click',

  function () {
    moveLightsOneStep();
  },
);

toggleToonButton.addEventListener(
  'click',

  function () {
    toggleToonShading();
  },
);

if (toggleCameraButton) {
  toggleCameraButton.addEventListener(
    'click',

    function () {
      toggleCameraAnimation();
    },
  );
}

if (topViewButton) {
  topViewButton.addEventListener(
    'click',

    function () {
      toggleTopView();
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

    /*
           -------------------------------------------------
           L

           Beide Lichter 15 Grad weiter.
           -------------------------------------------------
        */

    if (key === 'l') {
      event.preventDefault();

      moveLightsOneStep();

      return;
    }

    /*
           -------------------------------------------------
           T

           Toon ein / aus.
           -------------------------------------------------
        */

    if (key === 't') {
      event.preventDefault();

      toggleToonShading();

      return;
    }

    /*
           -------------------------------------------------
           P

           Automatische Kamerafahrt
           pausieren / starten.
           -------------------------------------------------
        */

    if (key === 'p') {
      event.preventDefault();

      toggleCameraAnimation();

      return;
    }

    /*
           -------------------------------------------------
           LEERTASTE

           Ebenfalls Kamera Pause / Start.
           -------------------------------------------------
        */

    if (event.code === 'Space') {
      event.preventDefault();

      toggleCameraAnimation();

      return;
    }

    /*
           -------------------------------------------------
           O

           Draufsicht ein / aus.
           -------------------------------------------------
        */

    if (key === 'o') {
      event.preventDefault();

      toggleTopView();

      return;
    }

    /*
           -------------------------------------------------
           PFEIL LINKS / RECHTS

           Kamera manuell um die Szene.
           -------------------------------------------------
        */

    if (event.key === 'ArrowLeft') {
      event.preventDefault();

      cameraAzimuth -= CAMERA_MANUAL_STEP;

      updateCamera();

      render();

      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();

      cameraAzimuth += CAMERA_MANUAL_STEP;

      updateCamera();

      render();

      return;
    }

    /*
           -------------------------------------------------
           PFEIL HOCH / RUNTER

           Kamerahöhe verändern.
           -------------------------------------------------
        */

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
   KAMERA-ANIMATION
   ========================================================= */

let previousFrameTime = null;

function animate(currentTime) {
  if (previousFrameTime === null) {
    previousFrameTime = currentTime;
  }

  let deltaTime = (currentTime - previousFrameTime) / 1000;

  /*
       Große Sprünge verhindern,
       beispielsweise nach einem
       Tab-Wechsel.
    */

  deltaTime = Math.min(deltaTime, 0.1);

  previousFrameTime = currentTime;

  if (cameraAnimationRunning) {
    cameraAzimuth += CAMERA_ROTATION_SPEED * deltaTime;

    updateCamera();

    render();
  }

  requestAnimationFrame(animate);
}

/* =========================================================
   FENSTERGRÖSSE
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
       Modelle.
    */

  initModels();

  /*
       Lichtpositionen exakt aus der
       Kreisgleichung bestimmen.
    */

  updateLightPositions();

  /*
       Kamera berechnen.
    */

  updateCamera();

  /*
       Oberfläche.
    */

  updateStatusDisplay();

  /*
       Erstes Bild.
    */

  render();

  /*
       Automatische Kamerafahrt startet
       unmittelbar beim Laden.
    */

  requestAnimationFrame(animate);
}

init();
