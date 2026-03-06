import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Map {
  constructor(scene, textureLoader) {
    this.scene = scene;
    this.textureLoader = textureLoader;
    this.map = null;
    this.instancedWalls = null;
    this.wallMeshes = [];
    this.floor = null;
    this.roof = null;
    this.exitX = CONFIG.MAP_SIZE - 2;
    this.exitZ = CONFIG.MAP_SIZE - 1;
  }

  generate() {
    const maze = Array.from({ length: CONFIG.MAP_SIZE }, () => Array(CONFIG.MAP_SIZE).fill(1));

    const carve = (x, z) => {
      const dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(() => Math.random() - 0.5);
      for (const [dx, dz] of dirs) {
        const nx = x + dx, nz = z + dz;
        if (nx > 0 && nx < CONFIG.MAP_SIZE-1 && nz > 0 && nz < CONFIG.MAP_SIZE-1 && maze[nz][nx] === 1) {
          maze[nz][nx] = 0;
          maze[z + dz/2][x + dx/2] = 0;
          carve(nx, nz);
        }
      }
    };

    maze[1][1] = 0;
    carve(1, 1);

    for (let z = 1; z < CONFIG.MAP_SIZE-1; z++) {
      for (let x = 1; x < CONFIG.MAP_SIZE-1; x++) {
        if (maze[z][x] === 1 && Math.random() < 0.1) maze[z][x] = 0;
      }
    }

    maze[this.exitZ][this.exitX] = 2;
    this.map = maze;
    return maze;
  }

  loadTexture(path) {
    const t = this.textureLoader.load(path);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    return t;
  }

  build() {
    const wallDiffuse = this.loadTexture(CONFIG.TEXTURES.WALL_DIFFUSE);
    const wallNormal = this.loadTexture(CONFIG.TEXTURES.WALL_NORMAL);
    const floorDiffuse = this.loadTexture(CONFIG.TEXTURES.FLOOR_DIFFUSE);
    const floorNormal = this.loadTexture(CONFIG.TEXTURES.FLOOR_NORMAL);
    const roofDiffuse = this.loadTexture(CONFIG.TEXTURES.ROOF_DIFFUSE);
    const roofNormal = this.loadTexture(CONFIG.TEXTURES.ROOF_NORMAL);
    const roofEmission = this.loadTexture(CONFIG.TEXTURES.ROOF_EMISSION);

    const textureScale = CONFIG.TILE_SIZE / 300;
    [wallDiffuse, wallNormal].forEach(t => t.repeat.set(1, CONFIG.WALL_HEIGHT / 300));
    [floorDiffuse, floorNormal].forEach(t => t.repeat.set(this.map[0].length * textureScale, this.map.length * textureScale));
    [roofDiffuse, roofNormal, roofEmission].forEach(t => t.repeat.set(this.map[0].length * textureScale * 2, this.map.length * textureScale * 2));

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallDiffuse,
      normalMap: wallNormal,
      roughness: 0.85,
      metalness: 0.0,
      normalScale: new THREE.Vector2(1.5, 1.5),
    });

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorDiffuse,
      normalMap: floorNormal,
      roughness: 1.0,
      metalness: 0.0,
      normalScale: new THREE.Vector2(1.2, 1.2),
    });

    const roofMat = new THREE.MeshStandardMaterial({
      map: roofDiffuse,
      normalMap: roofNormal,
      emissiveMap: roofEmission,
      emissive: new THREE.Color(0xffffcc),
      emissiveIntensity: 0.7,
      roughness: 1.0,
      metalness: 0.0,
    });

    // Floor
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.TILE_SIZE * this.map[0].length, CONFIG.TILE_SIZE * this.map.length),
      floorMat
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set((CONFIG.TILE_SIZE * this.map[0].length) / 2, 0, (CONFIG.TILE_SIZE * this.map.length) / 2);
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // Roof
    this.roof = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.TILE_SIZE * this.map[0].length, CONFIG.TILE_SIZE * this.map.length),
      roofMat
    );
    this.roof.rotation.x = Math.PI / 2;
    this.roof.position.set((CONFIG.TILE_SIZE * this.map[0].length) / 2, CONFIG.WALL_HEIGHT, (CONFIG.TILE_SIZE * this.map.length) / 2);
    this.roof.receiveShadow = true;
    this.scene.add(this.roof);

    // Walls
    const wallGeo = new THREE.BoxGeometry(CONFIG.TILE_SIZE, CONFIG.WALL_HEIGHT, CONFIG.TILE_SIZE);
    const exitMat = new THREE.MeshLambertMaterial({ color: 0x000000 });

    let wallCount = 0;
    this.map.forEach(row => row.forEach(cell => { if (cell === 1) wallCount++; }));

    this.instancedWalls = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    this.instancedWalls.castShadow = true;
    this.instancedWalls.receiveShadow = true;
    this.scene.add(this.instancedWalls);

    const dummy = new THREE.Object3D();
    let wallIndex = 0;

    this.map.forEach((row, z) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          dummy.position.set(x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2, CONFIG.WALL_HEIGHT/2, z * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2);
          dummy.updateMatrix();
          this.instancedWalls.setMatrixAt(wallIndex, dummy.matrix);
          wallIndex++;
        }

        if (cell === 2) {
          const exitWall = new THREE.Mesh(wallGeo, exitMat);
          exitWall.position.set(x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2, CONFIG.WALL_HEIGHT/2, z * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2);
          exitWall.castShadow = true;
          exitWall.receiveShadow = true;
          this.scene.add(exitWall);
          this.wallMeshes.push(exitWall);
        }
      });
    });

    this.instancedWalls.instanceMatrix.needsUpdate = true;
  }

  getExitPosition() {
    return {
      x: this.exitX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
      z: this.exitZ * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2
    };
  }
}
