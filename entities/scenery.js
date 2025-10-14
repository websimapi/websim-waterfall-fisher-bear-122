import * as THREE from 'three';
import { createVoxel } from '../utils/voxel.js';
import { generateProceduralAssets } from '../systems/procedural.js';

const darkBrownMat = new THREE.MeshLambertMaterial({ color: 0x4a2d1e });
const rockMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
const grassMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
const sandMat = new THREE.MeshLambertMaterial({ color: 0xd2b48c }); // tan/sand color

function createVoxelLog() {
    const logGroup = new THREE.Group();
    logGroup.name = "log";

    const radius = 0.7;
    const length = 9;
    const voxelSize = 0.25;

    const barkMat1 = new THREE.MeshLambertMaterial({ color: 0x4a2d1e });
    const barkMat2 = new THREE.MeshLambertMaterial({ color: 0x6b442a });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x967969 });

    const materials = [barkMat1, barkMat2, woodMat];
    const geometries = materials.map(() => []);

    const occupied = new Set();
    const voxelGeo = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);

    function addVoxel(x, y, z, matIndex) {
        const gridX = Math.round(x / voxelSize);
        const gridY = Math.round(y / voxelSize);
        const gridZ = Math.round(z / voxelSize);

        const key = `${gridX},${gridY},${gridZ}`;
        if (occupied.has(key)) return;

        const dist = Math.sqrt(gridX * gridX + gridY * gridY) * voxelSize;
        if (dist > radius + voxelSize * 0.5) return;

        occupied.add(key);
        const transform = new THREE.Matrix4().setPosition(
            gridX * voxelSize,
            gridY * voxelSize,
            gridZ * voxelSize
        );
        geometries[matIndex].push(voxelGeo.clone().applyMatrix4(transform));
    }

    const numSlices = Math.ceil(length / voxelSize);
    for (let i = 0; i < numSlices; i++) {
        const z = -length / 2 + i * voxelSize;
        const sliceRadius = radius * (0.9 + Math.random() * 0.2);
        const numVoxelsInSlice = Math.floor(2 * Math.PI * sliceRadius / voxelSize);

        for (let j = 0; j < numVoxelsInSlice; j++) {
            const angle = (j / numVoxelsInSlice) * 2 * Math.PI;
            const r = sliceRadius * (0.95 + Math.random() * 0.1);
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            const matIndex = Math.random() > 0.3 ? 0 : 1;
            addVoxel(x, y, z, matIndex);
        }
    }
    
    const capPositions = [-length / 2, length / 2];
    capPositions.forEach(z => {
        const numCapVoxels = Math.floor(Math.PI * radius * radius / (voxelSize * voxelSize));
        for (let i = 0; i < numCapVoxels; i++) {
            const r = Math.sqrt(Math.random()) * radius;
            const angle = Math.random() * 2 * Math.PI;
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            const matIndex = r < radius * 0.7 ? 2 : (Math.random() > 0.3 ? 0 : 1);
            addVoxel(x, y, z, matIndex);
        }
    });

    geometries.forEach((geoArray, index) => {
        if (geoArray.length > 0) {
            const mergedGeo = THREE.BufferGeometryUtils.mergeGeometries(geoArray, false);
            const mesh = new THREE.Mesh(mergedGeo, materials[index]);
            logGroup.add(mesh);
        }
    });
    
    voxelGeo.dispose();
    geometries.forEach(arr => arr.forEach(g => g.dispose()));

    logGroup.rotation.y = Math.PI / 2;
    logGroup.position.set(0, 2.7, 1);
    
    return logGroup;
}

export function createScenery() {
    const group = new THREE.Group();

    // Riverbed - add this first to be under the water and other objects.
    const waterWidth = 8;
    const riverLength = 100; // Extended river length
    const cliffEdgeZ = 2.5;
    const riverBedY = 1.8; // Water is at Y=2.0, banks at Y=2.1. Put this just under water.

    const riverBedGeo = new THREE.PlaneGeometry(waterWidth, riverLength);
    const riverBed = new THREE.Mesh(riverBedGeo, sandMat);
    riverBed.rotation.x = -Math.PI / 2;
    riverBed.position.set(0, riverBedY, cliffEdgeZ - riverLength / 2 - 0.5);
    group.add(riverBed);

    // Add river banks (walls)
    const bankWallHeight = 22; // Make them deep
    const bankWallThickness = 1;
    const bankWallY = riverBedY - (bankWallHeight / 2) + 0.1;
    const bankWallZ = cliffEdgeZ - riverLength / 2 - 0.5;

    const leftBankWall = createVoxel(
        -waterWidth / 2 - bankWallThickness / 2, 
        bankWallY, 
        bankWallZ, 
        bankWallThickness, 
        bankWallHeight, 
        riverLength, 
        rockMat
    );
    group.add(leftBankWall);

    const rightBankWall = createVoxel(
        waterWidth / 2 + bankWallThickness / 2, 
        bankWallY, 
        bankWallZ, 
        bankWallThickness, 
        bankWallHeight, 
        riverLength, 
        rockMat
    );
    group.add(rightBankWall);

    // Add a rock base under the river to connect to the waterfall cliff
    const riverBaseThickness = 1.0;
    const riverBase = createVoxel(0, riverBedY - riverBaseThickness / 2 - 1.0, cliffEdgeZ - riverLength / 2 - 0.5, waterWidth, riverBaseThickness, riverLength, rockMat);
    group.add(riverBase);

    // --- Lower River Section (Below Waterfall) ---
    const waterfallBottomY = -18.1;
    const lowerRiverLength = 80;
    const lowerRiverStartZ = cliffEdgeZ; // Start just after the cliff face

    // Lower riverbed
    const lowerRiverBedGeo = new THREE.PlaneGeometry(waterWidth, lowerRiverLength);
    const lowerRiverBed = new THREE.Mesh(lowerRiverBedGeo, sandMat);
    lowerRiverBed.rotation.x = -Math.PI / 2;
    lowerRiverBed.position.set(0, waterfallBottomY, lowerRiverStartZ + lowerRiverLength / 2);
    group.add(lowerRiverBed);
    
    // Lower river bank walls
    const lowerBankWallHeight = 10;
    const lowerBankWallY = waterfallBottomY - (lowerBankWallHeight / 2) + 0.1;
    const lowerBankWallZ = lowerRiverStartZ + lowerRiverLength / 2;

    const lowerLeftBankWall = createVoxel(
        -waterWidth / 2 - bankWallThickness / 2, 
        lowerBankWallY, 
        lowerBankWallZ, 
        bankWallThickness, 
        lowerBankWallHeight, 
        lowerRiverLength, 
        rockMat
    );
    group.add(lowerLeftBankWall);

    const lowerRightBankWall = createVoxel(
        waterWidth / 2 + bankWallThickness / 2, 
        lowerBankWallY, 
        lowerBankWallZ, 
        bankWallThickness, 
        lowerBankWallHeight, 
        lowerRiverLength, 
        rockMat
    );
    group.add(lowerRightBankWall);

    // Lower grass banks
    const lowerGroundY = waterfallBottomY + 0.3; // Slightly above water level
    const lowerGroundThickness = 0.4;
    const lowerBankWidth = 6;
    const lowerGroundL = createVoxel(-7, lowerGroundY - lowerGroundThickness/2, lowerBankWallZ, lowerBankWidth, lowerGroundThickness, lowerRiverLength, grassMat);
    const lowerGroundR = createVoxel(7, lowerGroundY - lowerGroundThickness/2, lowerBankWallZ, lowerBankWidth, lowerGroundThickness, lowerRiverLength, grassMat);
    group.add(lowerGroundL, lowerGroundR);

    // Rock walls under lower grass banks
    const lowerGroundWallHeight = 10;
    const lowerGroundWallY = (lowerGroundY - lowerGroundThickness / 2) - (lowerGroundWallHeight / 2);
    const lowerGroundWallL = createVoxel(-7, lowerGroundWallY, lowerBankWallZ, lowerBankWidth, lowerGroundWallHeight, lowerRiverLength, rockMat);
    const lowerGroundWallR = createVoxel(7, lowerGroundWallY, lowerBankWallZ, lowerBankWidth, lowerGroundWallHeight, lowerRiverLength, rockMat);
    group.add(lowerGroundWallL, lowerGroundWallR);

    // Cliff face behind waterfall
    // Water is at z=2.5, from y=2 to y=-18. This wall sits behind it (z < 2.5).
    group.add(createVoxel(0, -12.5, 1.8, 16, 25, 1.2, rockMat)); // Main back wall (moved behind waterfall and down)
    group.add(createVoxel(3, -10, 1.6, 4, 8, 1, rockMat)); // Ledge/variation (moved down)
    group.add(createVoxel(-4, -6, 1.7, 3, 5, 0.8, rockMat)); // (moved down)
    group.add(createVoxel(-2, -20, 1.5, 5, 7, 1, rockMat)); // (moved down)
    group.add(createVoxel(2, -3.5, 1.8, 6, 3, 1, rockMat)); // top edge (moved down)

    const log = createVoxelLog();
    group.add(log);

    // green ground shelves along both sides. Water is at y=2.0. Banks are slightly higher.
    const groundY = 2.1;
    const groundThickness = 0.4;
    const bankLength = riverLength - 4; // Make grass banks almost as long as the river
    const groundL = createVoxel(-7, groundY - groundThickness/2, -bankLength/2, 6, groundThickness, bankLength, grassMat);
    const groundR = createVoxel( 7, groundY - groundThickness/2, -bankLength/2, 6, groundThickness, bankLength, grassMat);
    group.add(groundL, groundR);

    // Add rock walls underneath the grass shelves to connect them to the mountains
    const groundWallHeight = 22; // Match river bank wall height for consistency
    const groundWallY = (groundY - groundThickness / 2) - (groundWallHeight / 2); // Position it right under the grass
    
    const groundWallL = createVoxel(-7, groundWallY, -bankLength/2, 6, groundWallHeight, bankLength, rockMat);
    const groundWallR = createVoxel(7, groundWallY, -bankLength/2, 6, groundWallHeight, bankLength, rockMat);
    group.add(groundWallL, groundWallR);

    // Generate and add all procedural assets
    const proceduralAssets = generateProceduralAssets();
    group.add(proceduralAssets);

    return group;
}