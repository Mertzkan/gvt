'use strict';

const fs = require('fs');

const path = require('path');

const FRAME_COUNT = 24;

const DEGREES_PER_FRAME = 15;

const sourcePath = path.join(__dirname, 'assets', 'disc', 'disc-original.svg');

const outputDirectory = path.join(__dirname, 'assets', 'disc');

/*
    Ausgangsdatei laden
*/

const originalSvg = fs.readFileSync(sourcePath, 'utf8');

/*
    24 einzelne Rotationszustände erzeugen
*/

for (let frame = 0; frame < FRAME_COUNT; frame++) {
  const angle = frame * DEGREES_PER_FRAME;

  /*
        Die Gruppe mit der ID "disc"
        wird um den Mittelpunkt 250 / 250 gedreht.
    */

  const rotatedSvg = originalSvg.replace(
    '<g id="disc">',
    `<g id="disc" transform="rotate(${angle} 250 250)">`,
  );

  /*
        Dateinummer zweistellig erzeugen.

        0  -> 00
        1  -> 01
        9  -> 09
        10 -> 10
    */

  const frameNumber = String(frame).padStart(2, '0');

  const fileName = `frame-${frameNumber}.svg`;

  const outputPath = path.join(outputDirectory, fileName);

  /*
        SVG-Datei speichern
    */

  fs.writeFileSync(outputPath, rotatedSvg, 'utf8');

  console.log(`${fileName} erstellt: ${angle}°`);
}

console.log('Alle Einzelbilder wurden erstellt.');
