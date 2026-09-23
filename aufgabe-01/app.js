'use strict';

/*
    --------------------------------------------------
    SCHEIBENANIMATION
    --------------------------------------------------
*/

const FRAME_COUNT = 24;

const DEGREES_PER_FRAME = 15;

//const AUTO_SPEED = 100;

let discFps = 10;

const discImage = document.querySelector('#discImage');

const discStatus = document.querySelector('#discStatus');

const leftButton = document.querySelector('#leftButton');

const rightButton = document.querySelector('#rightButton');

const autoButton = document.querySelector('#autoButton');

const autoButtonText = document.querySelector('#autoButtonText');

const discFrameSlider = document.querySelector('#discFrameSlider');

const discFrameValue = document.querySelector('#discFrameValue');

const discFpsSlider = document.querySelector('#discFpsSlider');

const discFpsValue = document.querySelector('#discFpsValue');

let currentFrame = 0;

let autoInterval = null;

const discFrames = [];

/*
    Alle Dateinamen der 24 Einzelbilder erzeugen.
*/

for (let i = 0; i < FRAME_COUNT; i++) {
  const frameNumber = String(i).padStart(2, '0');

  const fileName = `assets/disc/frame-${frameNumber}.svg`;

  discFrames.push(fileName);
}

/*
    Einzelbilder vorladen.

    Dadurch müssen die Dateien nicht erst in dem
    Moment geladen werden, in dem sie angezeigt
    werden sollen.
*/

function preloadImages() {
  for (const frame of discFrames) {
    const image = new Image();

    image.src = frame;
  }
}

function showCurrentFrame() {
  const angle = currentFrame * DEGREES_PER_FRAME;

  discImage.src = discFrames[currentFrame];

  discImage.alt = `Scheibe im Rotationszustand ${angle} Grad`;

  let automaticStatus;

  if (autoInterval === null) {
    automaticStatus = 'Automatik aus';
  } else {
    automaticStatus = 'Automatik an';
  }

  discStatus.textContent = `Bild ${currentFrame + 1} von ${FRAME_COUNT} | ${angle}° | ${automaticStatus}`;

  discFrameSlider.value = currentFrame;

  discFrameValue.textContent = `${currentFrame + 1} / ${FRAME_COUNT}`;
}

discFrameSlider.addEventListener('input', function () {
  if (autoInterval !== null) {
    stopAutomaticRotation();
  }

  currentFrame = Number(discFrameSlider.value);

  showCurrentFrame();
});

function getDiscFrameDuration() {
  return 1000 / discFps;
}

/*
    Einen einzelnen Schritt ausführen.

    direction = 1
    bedeutet nach rechts.

    direction = -1
    bedeutet nach links.
*/

function changeFrame(direction) {
  currentFrame = currentFrame + direction;

  /*
        Wenn wir hinter dem letzten Bild angekommen
        sind, springen wir wieder zum ersten Bild.
    */

  if (currentFrame >= FRAME_COUNT) {
    currentFrame = 0;
  }

  /*
        Wenn wir vor Bild 0 angekommen sind,
        springen wir zum letzten Bild.
    */

  if (currentFrame < 0) {
    currentFrame = FRAME_COUNT - 1;
  }

  showCurrentFrame();
}

/*
    Automatische Rotation starten.
*/

function startAutomaticRotation() {
  const frameDuration = 1000 / discFps;

  autoInterval = window.setInterval(function () {
    changeFrame(1);
  }, frameDuration);

  autoButtonText.textContent = 'Automatik stoppen';

  autoButton.setAttribute('aria-pressed', 'true');

  showCurrentFrame();
}

/*
    Automatische Rotation stoppen.
*/

function stopAutomaticRotation() {
  window.clearInterval(autoInterval);

  autoInterval = null;

  autoButtonText.textContent = 'Automatik starten';

  autoButton.setAttribute('aria-pressed', 'false');

  showCurrentFrame();
}

/*
    Zwischen Start und Stop wechseln.
*/

function toggleAutomaticRotation() {
  if (autoInterval === null) {
    startAutomaticRotation();
  } else {
    stopAutomaticRotation();
  }
}

/*
    Buttons
*/

leftButton.addEventListener('click', function () {
  changeFrame(-1);
});

rightButton.addEventListener('click', function () {
  changeFrame(1);
});

autoButton.addEventListener('click', function () {
  toggleAutomaticRotation();
});

/*
    Beim Laden der Webseite.
*/

preloadImages();

showCurrentFrame();

/*
    --------------------------------------------------
    SPRITE-SHEET-ANIMATION
    --------------------------------------------------
*/

const SPRITE_FRAME_COUNT = 8;

const SPRITE_FRAME_WIDTH = 220;

let spriteFps = 8;

const spriteImage = document.querySelector('#spriteImage');

const spriteStatus = document.querySelector('#spriteStatus');

const spritePreviousButton = document.querySelector('#spritePreviousButton');

const spriteNextButton = document.querySelector('#spriteNextButton');

const spriteAutoButton = document.querySelector('#spriteAutoButton');

const spriteAutoButtonText = document.querySelector('#spriteAutoButtonText');

const spriteFrameSlider = document.querySelector('#spriteFrameSlider');

const spriteFrameValue = document.querySelector('#spriteFrameValue');

const spriteFpsSlider = document.querySelector('#spriteFpsSlider');

const spriteFpsValue = document.querySelector('#spriteFpsValue');

let spriteFrame = 0;

let spriteInterval = null;

function showSpriteFrame() {
  const offset = spriteFrame * SPRITE_FRAME_WIDTH;

  spriteImage.style.transform = `translateX(-${offset}px)`;

  spriteFrameSlider.value = spriteFrame;

  spriteFrameValue.textContent = `${spriteFrame + 1} / ${SPRITE_FRAME_COUNT}`;

  let automaticStatus;

  if (spriteInterval === null) {
    automaticStatus = 'Automatik aus';
  } else {
    automaticStatus = 'Automatik an';
  }

  spriteStatus.textContent = `Bild ${spriteFrame + 1} von ${SPRITE_FRAME_COUNT} | ${automaticStatus}`;
}

/*
    Einen einzelnen Schritt ausführen.

    direction = 1
    bedeutet nach rechts.

    direction = -1
    bedeutet nach links.
*/

function changeSpriteFrame(direction) {
  spriteFrame = spriteFrame + direction;

  if (spriteFrame >= SPRITE_FRAME_COUNT) {
    spriteFrame = 0;
  }

  if (spriteFrame < 0) {
    spriteFrame = SPRITE_FRAME_COUNT - 1;
  }

  showSpriteFrame();
}

/*
    Automatische Animation starten.
*/

function startSpriteAnimation() {
  const frameDuration = 1000 / spriteFps;

  spriteInterval = window.setInterval(function () {
    changeSpriteFrame(1);
  }, frameDuration);

  spriteAutoButtonText.textContent = 'Automatik stoppen';

  spriteAutoButton.setAttribute('aria-pressed', 'true');

  showSpriteFrame();
}

/*
    Automatische Animation stoppen.
*/

function stopSpriteAnimation() {
  window.clearInterval(spriteInterval);

  spriteInterval = null;

  spriteAutoButtonText.textContent = 'Automatik starten';

  spriteAutoButton.setAttribute('aria-pressed', 'false');

  showSpriteFrame();
}

/*
    Zwischen Start und Stop wechseln.
*/

function toggleSpriteAnimation() {
  if (spriteInterval === null) {
    startSpriteAnimation();
  } else {
    stopSpriteAnimation();
  }
}

/*
    Buttons
*/

spritePreviousButton.addEventListener('click', function () {
  changeSpriteFrame(-1);
});

spriteNextButton.addEventListener('click', function () {
  changeSpriteFrame(1);
});

spriteAutoButton.addEventListener('click', function () {
  toggleSpriteAnimation();
});

discFpsSlider.addEventListener('input', function () {
  discFps = Number(discFpsSlider.value);

  discFpsValue.textContent = `${discFps} FPS`;

  if (autoInterval !== null) {
    stopAutomaticRotation();

    startAutomaticRotation();
  }
});

spriteFrameSlider.addEventListener('input', function () {
  if (spriteInterval !== null) {
    stopSpriteAnimation();
  }

  spriteFrame = Number(spriteFrameSlider.value);

  showSpriteFrame();
});

spriteFpsSlider.addEventListener('input', function () {
  spriteFps = Number(spriteFpsSlider.value);

  spriteFpsValue.textContent = `${spriteFps} FPS`;

  if (spriteInterval !== null) {
    stopSpriteAnimation();

    startSpriteAnimation();
  }
});

/*
    Einheitliche Tastatursteuerung für beide Animationen.
*/

document.addEventListener('keydown', function (event) {
  const key = event.key.toLowerCase();

  if (event.repeat) {
    return;
  }

  if (key === 'l') {
    changeFrame(-1);
    changeSpriteFrame(-1);
  }

  if (key === 'r') {
    changeFrame(1);
    changeSpriteFrame(1);
  }

  if (key === 'a') {
    toggleAutomaticRotation();
    toggleSpriteAnimation();
  }
});

showSpriteFrame();
