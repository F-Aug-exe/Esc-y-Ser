// Configuración de la escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Movimiento en zigzag - debe estar ANTES de coordinatesToTileNumber()
const path = [];
let direction = 1;

for (let z = 0; z < 10; z++) {
  for (let x = 0; x < 10; x++) {
    const posX = direction === 1 ? x : 9 - x;
    path.push([posX, z]);
  }
  direction *= -1;
}
// Función para convertir coordenadas (x,z) a número de casilla (0-99)
// Actualiza la función coordinatesToTileNumber para que coincida con el path:
// Función corregida para convertir coordenadas (x,z) a número de casilla (0-99)
function coordinatesToTileNumber(x, z) {
  // Busca en el path la posición de estas coordenadas
  for (let i = 0; i < path.length; i++) {
    if (path[i][0] === x && path[i][1] === z) {
      return i;
    }
  }
  return -1;
}

// Constantes para ajustes
const MODEL_SCALE = 0.00001; // Escala base para todos los modelos
const LADDER_Y_OFFSET = 0.5; // Altura de escaleras respecto al tablero
const SNAKE_Y_OFFSET = 0.3;  // Altura de serpientes respecto al tablero
const TILE_CENTER_OFFSET = 4.5; // Para centrar en casillas (10x10)


// Definición de serpientes y escaleras
const snakesAndLadders = {
  // Escaleras (casilla actual: casilla destino)
  ladders: {
    5: 14,
    9: 31,
    20: 38,
    28: 84,
    40: 59,
    51: 67,
    63: 81,
    71: 91
  },
  // Serpientes (casilla actual: casilla destino)
  snakes: {
    11: 7,
    54: 34,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    98: 79
  }
};


// Colores para resaltar las casillas especiales
const specialTileColors = {
  ladderStart: 0x3498db,  // Azul para escaleras
  snakeStart: 0xe74c3c,   // Rojo para serpientes
  normalEven: 0x88cc88,   // Color par normal
  normalOdd: 0x444444     // Color impar normal
};

// Configuración de cámara
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(120, 150, 120);
camera.lookAt(0, 0, 0);

// Variables para controles de cámara
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const cameraSpeed = 0.5;
const keysPressed = {};

// Ángulos de rotación (en radianes)
const ROTATION = {
  NORTH: 1,
  SOUTH: Math.PI,       // 180° (mirando hacia el sur)
  WEST: -Math.PI / 2,   // 90° izquierda (oeste)
  EAST: Math.PI / 2     // 90° derecha (este)
};

// Controles de cámara con mouse
renderer.domElement.addEventListener('mousedown', (event) => {
  if (event.button === 0) { // Click izquierdo
    isDragging = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };
  }
});

renderer.domElement.addEventListener('mouseup', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('mousemove', (event) => {
  if (isDragging) {
    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;
    
    // Rotación horizontal (eje Y)
    camera.position.x = Math.sin(camera.rotation.y) * camera.position.z;
    camera.position.z = Math.cos(camera.rotation.y) * camera.position.z;
    camera.rotation.y -= deltaX * 0.01;
    
    // Rotación vertical (eje X) con límites
    const newRotationX = camera.rotation.x - deltaY * 0.01;
    if (newRotationX > -Math.PI/2 && newRotationX < Math.PI/2) {
      camera.rotation.x = newRotationX;
    }
    
    camera.lookAt(0, 0, 0);
    previousMousePosition = { x: event.clientX, y: event.clientY };
  }
});

// Controles WASD
document.addEventListener('keydown', (event) => {
  keysPressed[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
  keysPressed[event.key.toLowerCase()] = false;
});

// Zoom con rueda del mouse
renderer.domElement.addEventListener('wheel', (event) => {
  camera.position.z += event.deltaY * 0.1;
  camera.lookAt(0, 0, 0);
});

// Configuración del sistema de audio
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Cargador de sonidos
const audioLoader = new THREE.AudioLoader();

// Objetos de audio
const sounds = {
    move: new THREE.Audio(audioListener),
    dice: new THREE.Audio(audioListener),
    snake: new THREE.Audio(audioListener),
    ladder: new THREE.Audio(audioListener)
};

// Cargar los sonidos (asegúrate de tener los archivos en tu directorio)
audioLoader.load('sounds/move.mp3', function(buffer) {
    sounds.move.setBuffer(buffer);
});
audioLoader.load('sounds/dice.mp3', function(buffer) {
    sounds.dice.setBuffer(buffer);
});
audioLoader.load('sounds/snake.mp3', function(buffer) {
    sounds.snake.setBuffer(buffer);
});
audioLoader.load('sounds/ladder.mp3', function(buffer) {
    sounds.ladder.setBuffer(buffer);
});

// Ajustar volumen de los sonidos
sounds.move.setVolume(0.9);
sounds.dice.setVolume(0.7);
sounds.snake.setVolume(0.8);
sounds.ladder.setVolume(0.7);


// Prevenir el menú contextual
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

// Iluminación mejorada
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));
scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5));

// Tablero de 10x10 con serpientes y escaleras
// Tablero de 10x10 con serpientes y escaleras (colores corregidos)
const tileSize = 20;
const board = new THREE.Group();

for (let x = 0; x < 10; x++) {
  for (let z = 0; z < 10; z++) {
    // Convertir coordenadas (x,z) a número de casilla (0-99)
    const tileNumber = coordinatesToTileNumber(x, z);
    let tileColor;
    
    // Determinar color basado en el número de casilla
    if (snakesAndLadders.ladders[tileNumber] !== undefined) {
      tileColor = specialTileColors.ladderStart;
    } else if (snakesAndLadders.snakes[tileNumber] !== undefined) {
      tileColor = specialTileColors.snakeStart;
    } else {
      tileColor = (x + z) % 2 === 0 ? specialTileColors.normalEven : specialTileColors.normalOdd;
    }

    const geometry = new THREE.BoxGeometry(tileSize - 1, 1, tileSize - 1);
    const material = new THREE.MeshLambertMaterial({ color: tileColor });
    const tile = new THREE.Mesh(geometry, material);
    tile.position.set((x - 5) * tileSize, 0, (z - 5) * tileSize);
    board.add(tile);
  }
}
scene.add(board);

// Jugadores
let player1, player2;
const mtlLoader = new THREE.MTLLoader();
const objLoader = new THREE.OBJLoader();

function loadPlayer(modelPath, mtlPath, initialOffset, color, callback) {
  mtlLoader.load(mtlPath, (materials) => {
    materials.preload();
    objLoader.setMaterials(materials);
    objLoader.load(modelPath, (object) => {
      object.scale.set(0.1, 0.1, 0.1);
      
      // Crear un contenedor para el modelo
      const container = new THREE.Group();
      container.add(object);
      
      // Centrar el modelo dentro del contenedor
      // Esto puede requerir ajustes basados en tu modelo específico
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      object.position.x -= center.x;
      object.position.y -= center.y;
      object.position.z -= center.z;
      
      container.position.copy(initialOffset);
      callback(container);
    }, undefined, () => {
      const placeholder = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 10),
        new THREE.MeshLambertMaterial({ color })
      );
      placeholder.position.copy(initialOffset);
      callback(placeholder);
    });
  }, undefined, () => {
    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshLambertMaterial({ color })
    );
    placeholder.position.copy(initialOffset);
    callback(placeholder);
  });
}



// Variables globales para los modelos
let ladderModel, snakeModel;

// Función para cargar modelos estáticos
function loadStaticModel(objPath, mtlPath, callback) {
    mtlLoader.load(mtlPath, (materials) => {
        materials.preload();
        objLoader.setMaterials(materials);
        objLoader.load(objPath, (object) => {
            object.scale.set(0.01, 0.01, 0.01); // Ajusta según el tamaño de tus modelos
            callback(object);
        }, undefined, (error) => {
            console.error('Error loading model:', error);
            callback(null);
        });
    }, undefined, (error) => {
        console.error('Error loading materials:', error);
        callback(null);
    });
}

// Grupo para contener todos los modelos de serpientes y escaleras
const specialTilesGroup = new THREE.Group();
scene.add(specialTilesGroup);

function placeSpecialTiles() {
    // Limpiar modelos existentes
    while(specialTilesGroup.children.length > 0) {
        specialTilesGroup.remove(specialTilesGroup.children[0]);
    }

    // Colocar escaleras (ladders)
    Object.keys(snakesAndLadders.ladders).forEach(tileNumber => {
        const tileIndex = parseInt(tileNumber);
        if (ladderModel) {
            const [x, z] = path[tileIndex];
            const ladderInstance = ladderModel.clone();
            
            // Posición y rotación de la escalera
            ladderInstance.position.set(
                (x - 4.7) * tileSize,
                16, // Altura ligeramente por encima del tablero
                (z - 4.7) * tileSize
            );
            
            // Rotación para que mire hacia la dirección del tablero
            ladderInstance.rotation.y = Math.PI / 4;
            
            // Ajustar escala según necesidad
            ladderInstance.scale.set(2.2, 2.2, 2.2);
            
            specialTilesGroup.add(ladderInstance);
        }
    });

    // Colocar serpientes (snakes)
    Object.keys(snakesAndLadders.snakes).forEach(tileNumber => {
        const tileIndex = parseInt(tileNumber);
        if (snakeModel) {
            const [x, z] = path[tileIndex];
            const snakeInstance = snakeModel.clone();
            
            // Posición y rotación de la serpiente
            snakeInstance.position.set(
                (x - 5) * tileSize,
                1, // Altura ligeramente por encima del tablero
                (z - 5) * tileSize
            );
            
            // Rotación para que la serpiente "mire" hacia adelante
            snakeInstance.rotation.y = -Math.PI / 4;
            
            // Ajustar escala según necesidad
            snakeInstance.scale.set(0.5, 0.5, 0.5);
            
            specialTilesGroup.add(snakeInstance);
        }
    });
}

// Cargar los modelos al iniciar
loadStaticModel('models/ladder.obj', 'models/ladder.mtl', (model) => {
    ladderModel = model;
    placeSpecialTiles(); // Colocar los modelos una vez cargados
});

loadStaticModel('models/snake.obj', 'models/snake.mtl', (model) => {
    snakeModel = model;
    placeSpecialTiles(); // Colocar los modelos una vez cargados
});





// Posiciones iniciales ajustadas
const initialOffset1 = new THREE.Vector3(
  tileSize * 0.05,  // +0.5 unidades en X
  tileSize/2,
  tileSize * 0.25  // -0.3 unidades en Z
);

const initialOffset2 = new THREE.Vector3(
  2.3,
  tileSize * 0.5, // -0.25 unidades en Y
  tileSize * 0.6   // -0.3 unidades en Z
);

// Cargar Player 1 (Mario)
loadPlayer('models/mario_obj.obj', 'models/mario_obj.mtl', initialOffset1, 0xff0000, (object) => {
  player1 = object;
  scene.add(player1);
  updateCharacterPositions();
});

// Cargar Player 2 (Luigi)
loadPlayer('models/luigi_obj.obj', 'models/luigi_obj.mtl', initialOffset2, 0x00ff00, (object) => {
  player2 = object;
  scene.add(player2);
  updateCharacterPositions();
});



let pathIndex1 = 0;
let pathIndex2 = 0;

function updateCharacterPositions() {
  if (player1) {
      const [x1, z1] = path[pathIndex1];
      const tileNumber1 = pathIndex1;
      
      // Posición precisa centrada en la casilla
      player1.position.set(
          (x1 - 4.5) * tileSize,  // -4.5 para centrar en tablero 10x10
          5 + initialOffset1.y,
          (z1 - 4.5) * tileSize
      );
      
      player1.rotation.y = getRotationForPosition(x1, z1);
      
      let extraInfo1 = "";
      if (snakesAndLadders.ladders[tileNumber1]) {
          extraInfo1 = ` (Escalera a ${snakesAndLadders.ladders[tileNumber1]})`;
      } else if (snakesAndLadders.snakes[tileNumber1]) {
          extraInfo1 = ` (Serpiente a ${snakesAndLadders.snakes[tileNumber1]})`;
      }
      
      document.getElementById('status1').textContent = `Mario: Casilla ${tileNumber1}${extraInfo1}`;
  }
  
  if (player2) {
      const [x2, z2] = path[pathIndex2];
      const tileNumber2 = pathIndex2;
      
      // Posición precisa centrada en la casilla
      player2.position.set(
          (x2 - 4.5) * tileSize,  // -4.5 para centrar en tablero 10x10
          5 + initialOffset2.y,
          (z2 - 4.5) * tileSize
      );
      
      player2.rotation.y = getRotationForPosition(x2, z2);
      
      let extraInfo2 = "";
      if (snakesAndLadders.ladders[tileNumber2]) {
          extraInfo2 = ` (Escalera a ${snakesAndLadders.ladders[tileNumber2]})`;
      } else if (snakesAndLadders.snakes[tileNumber2]) {
          extraInfo2 = ` (Serpiente a ${snakesAndLadders.snakes[tileNumber2]})`;
      }
      
      document.getElementById('status2').textContent = `Luigi: Casilla ${tileNumber2}${extraInfo2}`;
  }
  
  // Verificar victoria después de cada movimiento
  checkWinCondition();
}

// Sistema de dado
const dice = document.getElementById('dice');
const diceFaces = { 
  1: { x: 0, y: 0 }, 
  2: { x: 0, y: 180 }, 
  3: { x: 0, y: -90 }, 
  4: { x: 0, y: 90 }, 
  5: { x: -90, y: 0 }, 
  6: { x: 90, y: 0 } 
};

let currentPlayer = 1;

// Modificar el evento click del dado para mostrar mejor los turnos
document.getElementById('rollBtn').addEventListener('click', () => {
  const roll = Math.floor(Math.random() * 6) + 1;
  dice.style.display = 'block';
  dice.style.transform = 'rotateX(720deg) rotateY(720deg) scale(1.5)';
  
  setTimeout(() => {
    dice.style.transform = `rotateX(${diceFaces[roll].x}deg) rotateY(${diceFaces[roll].y}deg) scale(1)`;
    setTimeout(() => {
      dice.style.display = 'none';
      if (currentPlayer === 1) {
        moveCharacter(roll, 'player1');
        currentPlayer = 2;
        document.getElementById('turn').textContent = "Turno: Luigi (Jugador 2)";
      } else {
        moveCharacter(roll, 'player2');
        currentPlayer = 1;
        document.getElementById('turn').textContent = "Turno: Mario (Jugador 1)";
      }
    }, 1000);
  }, 1000);
});

function moveCharacter(steps, player) {
  let currentIndex = player === 'player1' ? pathIndex1 : pathIndex2;
  let newIndex = (currentIndex + steps) % path.length;
  
  // Reproducir sonido de dado al inicio del movimiento
  if (sounds.dice.isPlaying) sounds.dice.stop();
  sounds.dice.play();
  
  // Mover el jugador paso a paso
  for (let i = 1; i <= steps; i++) {
      setTimeout(() => { 
          const tempIndex = (currentIndex + i) % path.length;
          if (player === 'player1') {
              pathIndex1 = tempIndex;
          } else {
              pathIndex2 = tempIndex;
          }
          updateCharacterPositions();
          
          // Reproducir sonido de movimiento en cada paso
          if (sounds.move.isPlaying) sounds.move.stop();
          sounds.move.play();
      }, 300 * i);
  }

  // Después de completar el movimiento, verificar serpientes/escaleras
  setTimeout(() => {
      checkSnakesAndLadders(player, newIndex);
  }, 300 * steps + 100);
}

function checkSnakesAndLadders(player, currentIndex) {
  const tileNumber = currentIndex;
  let newIndex = currentIndex;
  let message = "";
  let soundToPlay = null;

  // Verificar escaleras
  if (snakesAndLadders.ladders[tileNumber]) {
      newIndex = snakesAndLadders.ladders[tileNumber];
      message = `¡Escalera! Subes a la casilla ${newIndex}`;
      soundToPlay = sounds.ladder;
  } 
  // Verificar serpientes
  else if (snakesAndLadders.snakes[tileNumber]) {
      newIndex = snakesAndLadders.snakes[tileNumber];
      message = `¡Serpiente! Bajas a la casilla ${newIndex}`;
      soundToPlay = sounds.snake;
  }

  // Si hay movimiento especial
  if (message) {
      alert(message);
      
      // Reproducir sonido correspondiente
      if (soundToPlay.isPlaying) soundToPlay.stop();
      soundToPlay.play();
      
      // Mover al jugador a la nueva posición
      if (player === 'player1') {
          pathIndex1 = newIndex;
      } else {
          pathIndex2 = newIndex;
      }
      updateCharacterPositions();
  }
}

function updateCharacterPositions() {
  if (player1) {
    const [x1, z1] = path[pathIndex1];
    const tileNumber1 = pathIndex1;
    
    player1.position.set(
      (x1 - 5) * tileSize + initialOffset1.x,
      5 + initialOffset1.y,
      (z1 - 5) * tileSize + initialOffset1.z
    );
    
    player1.rotation.y = getRotationForPosition(x1, z1);
    
    // Mostrar si está en serpiente o escalera
    let extraInfo1 = "";
    if (snakesAndLadders.ladders[tileNumber1]) {
      extraInfo1 = ` (Escalera a ${snakesAndLadders.ladders[tileNumber1]})`;
    } else if (snakesAndLadders.snakes[tileNumber1]) {
      extraInfo1 = ` (Serpiente a ${snakesAndLadders.snakes[tileNumber1]})`;
    }
    
    document.getElementById('status1').textContent = `Mario: Casilla ${tileNumber1}${extraInfo1}`;
  }
  
  if (player2) {
    const [x2, z2] = path[pathIndex2];
    const tileNumber2 = pathIndex2;
    
    player2.position.set(
      (x2 - 5) * tileSize + initialOffset2.x,
      5 + initialOffset2.y,
      (z2 - 5) * tileSize + initialOffset2.z
    );
    
    player2.rotation.y = getRotationForPosition(x2, z2);
    
    // Mostrar si está en serpiente o escalera
    let extraInfo2 = "";
    if (snakesAndLadders.ladders[tileNumber2]) {
      extraInfo2 = ` (Escalera a ${snakesAndLadders.ladders[tileNumber2]})`;
    } else if (snakesAndLadders.snakes[tileNumber2]) {
      extraInfo2 = ` (Serpiente a ${snakesAndLadders.snakes[tileNumber2]})`;
    }
    
    document.getElementById('status2').textContent = `Luigi: Casilla ${tileNumber2}${extraInfo2}`;
  }
}

function getRotationForPosition(x, z) {
  // Convertir a coordenadas de tablero (1-10)
  const col = x + 1;
  const row = z + 1;

  // Primera fila (1,1) - Sin rotación (posición inicial)
  if (row === 1 && col === 1) return ROTATION.NORTH;
  
  // Primera fila (1,2) a (1,10) - 90° izquierda
  if (row === 1 && col >= 2 && col <= 10) return ROTATION.EAST;
  
  // Segunda fila (2,10) - Normal (sur)
  if (row === 2 && col === 10) return ROTATION.NORTH;
  
  // Segunda fila (2,9) a (2,1) - 90° derecha
  if (row === 2 && col <= 9 && col >= 1) return ROTATION.WEST;
  
  // Tercera fila (3,1) - Normal (sur)
  if (row === 3 && col === 1) return ROTATION.NORTH;
  
  // Tercera fila (3,2) a (3,10) - 90° izquierda
  if (row === 3 && col >= 2 && col <= 10) return ROTATION.EAST;
  
  // Continuar el patrón para filas siguientes...
  if (row % 2 === 0) { // Filas pares
    if (col === 10) return ROTATION.NORTH;
    return ROTATION.WEST;
  } else { // Filas impares
    if (col === 1) return ROTATION.NORTH;
    return ROTATION.EAST;
  }
}

// Animación y controles WASD
function animate() { 
  requestAnimationFrame(animate);
  
  // Movimiento WASD
  if (keysPressed['w']) {
    camera.position.z -= cameraSpeed;
    camera.lookAt(0, 0, 0);
  }
  if (keysPressed['s']) {
    camera.position.z += cameraSpeed;
    camera.lookAt(0, 0, 0);
  }
  if (keysPressed['a']) {
    camera.position.x -= cameraSpeed;
    camera.lookAt(0, 0, 0);
  }
  if (keysPressed['d']) {
    camera.position.x += cameraSpeed;
    camera.lookAt(0, 0, 0);
  }
  
  renderer.render(scene, camera); 
}
animate();

// Ajustar tamaño al cambiar ventana
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

// Pantalla de victoria
const victoryScreen = document.createElement('div');
victoryScreen.style.position = 'fixed';
victoryScreen.style.top = '0';
victoryScreen.style.left = '0';
victoryScreen.style.width = '100%';
victoryScreen.style.height = '100%';
victoryScreen.style.backgroundColor = 'rgba(0,0,0,0.8)';
victoryScreen.style.display = 'none';
victoryScreen.style.flexDirection = 'column';
victoryScreen.style.justifyContent = 'center';
victoryScreen.style.alignItems = 'center';
victoryScreen.style.color = 'white';
victoryScreen.style.fontSize = '3em';
victoryScreen.style.zIndex = '1000';
document.body.appendChild(victoryScreen);

const victoryText = document.createElement('div');
victoryText.style.marginBottom = '20px';
victoryScreen.appendChild(victoryText);

const restartButton = document.createElement('button');
restartButton.textContent = 'Jugar de nuevo';
restartButton.style.padding = '15px 30px';
restartButton.style.fontSize = '0.5em';
restartButton.style.cursor = 'pointer';
restartButton.addEventListener('click', restartGame);
victoryScreen.appendChild(restartButton);

function checkWinCondition() {
    if (pathIndex1 >= 99) {
        showVictory('Mario (Jugador 1)');
    } else if (pathIndex2 >= 99) {
        showVictory('Luigi (Jugador 2)');
    }
}

function showVictory(winner) {
    victoryText.textContent = `¡${winner} ha ganado!`;
    victoryScreen.style.display = 'flex';
    
    // Deshabilitar controles durante la pantalla de victoria
    document.getElementById('rollBtn').disabled = true;
}

function restartGame() {
    // Reiniciar posiciones
    pathIndex1 = 0;
    pathIndex2 = 0;
    currentPlayer = 1;
    
    // Actualizar visuales
    updateCharacterPositions();
    document.getElementById('turn').textContent = "Turno: Mario (Jugador 1)";
    
    // Ocultar pantalla de victoria
    victoryScreen.style.display = 'none';
    
    // Habilitar controles
    document.getElementById('rollBtn').disabled = false;
}
  
});