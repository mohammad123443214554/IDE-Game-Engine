// ═══════════════════════════════════════════════════════════════
// LEVEL DATA - Easy to edit and add new levels
// ═══════════════════════════════════════════════════════════════

window.levels = {
    level1: {
        name: "Neon Starter",
        platforms: [
            { x: 0, y: 0, z: 0, w: 8, h: 1, d: 8 },      // Start platform
            { x: 10, y: 1, z: 0, w: 3, h: 0.5, d: 3 },    // Step up
            { x: 18, y: 3, z: 0, w: 4, h: 0.5, d: 4 },    // Higher
            { x: 25, y: 2, z: 2, w: 3, h: 0.5, d: 3 },    // Side
            { x: 25, y: 2, z: -2, w: 3, h: 0.5, d: 3 },   // Other side
            { x: 32, y: 4, z: 0, w: 4, h: 0.5, d: 4 },    // High platform
            { x: 40, y: 0, z: 0, w: 10, h: 1, d: 10, type: "ice" }, // Ice slide
            { x: 55, y: 2, z: 0, w: 4, h: 0.5, d: 4, type: "bounce" }, // Bounce
            { x: 65, y: 0, z: 0, w: 15, h: 1, d: 15 }     // Final area
        ],
        coins: [
            { x: 10, y: 3, z: 0 },
            { x: 18, y: 5, z: 0 },
            { x: 25, y: 4, z: 2 },
            { x: 25, y: 4, z: -2 },
            { x: 32, y: 6, z: 0 },
            { x: 40, y: 3, z: 0 },
            { x: 45, y: 3, z: 3 },
            { x: 45, y: 3, z: -3 },
            { x: 55, y: 5, z: 0 },
            { x: 65, y: 3, z: 0 },
            { x: 70, y: 3, z: 5 },
            { x: 70, y: 3, z: -5 }
        ],
        enemies: [
            { x: 18, y: 4.5, z: 0 },
            { x: 40, y: 1.5, z: 0 },
            { x: 68, y: 1.5, z: 0 }
        ],
        spawn: { x: 0, y: 2, z: 0 },
        goal: { x: 75, y: 2, z: 0 }
    },
    
    level2: {
        name: "Cyber Parkour",
        platforms: [
            { x: 0, y: 0, z: 0, w: 6, h: 1, d: 6 },
            { x: 8, y: 3, z: 0, w: 2, h: 0.5, d: 2 },
            { x: 12, y: 6, z: 0, w: 2, h: 0.5, d: 2 },
            { x: 16, y: 4, z: 3, w: 2, h: 0.5, d: 2 },
            { x: 16, y: 4, z: -3, w: 2, h: 0.5, d: 2 },
            { x: 20, y: 8, z: 0, w: 3, h: 0.5, d: 3 },
            { x: 28, y: 0, z: 0, w: 20, h: 1, d: 20, type: "ice" }
        ],
        coins: [
            { x: 8, y: 5, z: 0 },
            { x: 12, y: 8, z: 0 },
            { x: 16, y: 6, z: 3 },
            { x: 16, y: 6, z: -3 },
            { x: 20, y: 10, z: 0 },
            { x: 28, y: 3, z: 0 },
            { x: 35, y: 3, z: 5 },
            { x: 35, y: 3, z: -5 }
        ],
        enemies: [
            { x: 12, y: 7.5, z: 0 },
            { x: 28, y: 1.5, z: 5 },
            { x: 28, y: 1.5, z: -5 }
        ],
        spawn: { x: 0, y: 2, z: 0 },
        goal: { x: 40, y: 2, z: 0 }
    }
};
