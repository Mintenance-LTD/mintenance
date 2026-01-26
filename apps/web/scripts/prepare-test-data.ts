/**
 * Test Data Preparation Script for SAM3 Presence Detection Testing
 *
 * This script prepares realistic building damage test data for comprehensive testing
 * of the presence detection feature. It generates synthetic images and metadata
 * for damaged, undamaged, and borderline cases.
 */

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createCanvas, loadImage, Canvas } from 'canvas';
import { faker } from '@faker-js/faker';

// Test data directory structure
const TEST_DATA_DIR = path.join(process.cwd(), 'apps/web/lib/services/building-surveyor/test-data');
const DAMAGED_DIR = path.join(TEST_DATA_DIR, 'damaged');
const UNDAMAGED_DIR = path.join(TEST_DATA_DIR, 'undamaged');
const BORDERLINE_DIR = path.join(TEST_DATA_DIR, 'borderline');
const METADATA_FILE = path.join(TEST_DATA_DIR, 'metadata.json');

// Types of damage to simulate
const DAMAGE_TYPES = [
    'water_damage',
    'crack',
    'rot',
    'mold',
    'structural_damage',
    'fire_damage',
    'pest_damage',
];

// Test image specifications
interface TestImage {
    id: string;
    filename: string;
    category: 'damaged' | 'undamaged' | 'borderline';
    damageType?: string;
    severity?: 'early' | 'midway' | 'full';
    presenceScore?: number;
    expectedDetection: boolean;
    description: string;
    metadata: {
        width: number;
        height: number;
        format: string;
        createdAt: string;
        lighting: 'normal' | 'bright' | 'dark' | 'mixed';
        quality: 'high' | 'medium' | 'low';
        occlusion: number; // 0-1, percentage of damage occluded
    };
}

class TestDataGenerator {
    private testImages: TestImage[] = [];

    async initialize(): Promise<void> {
        // Create directory structure
        await this.createDirectories();
    }

    private async createDirectories(): Promise<void> {
        const dirs = [TEST_DATA_DIR, DAMAGED_DIR, UNDAMAGED_DIR, BORDERLINE_DIR];
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Generate a damaged property image
     */
    async generateDamagedImage(
        damageType: string,
        severity: 'early' | 'midway' | 'full'
    ): Promise<TestImage> {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        // Base wall color
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 800, 600);

        // Add texture
        this.addWallTexture(ctx, 800, 600);

        // Add damage based on type
        switch (damageType) {
            case 'water_damage':
                this.addWaterDamage(ctx, severity);
                break;
            case 'crack':
                this.addCrack(ctx, severity);
                break;
            case 'mold':
                this.addMold(ctx, severity);
                break;
            case 'rot':
                this.addRot(ctx, severity);
                break;
            case 'structural_damage':
                this.addStructuralDamage(ctx, severity);
                break;
            case 'fire_damage':
                this.addFireDamage(ctx, severity);
                break;
            case 'pest_damage':
                this.addPestDamage(ctx, severity);
                break;
        }

        // Generate unique filename
        const id = faker.string.uuid();
        const filename = `${damageType}_${severity}_${id}.jpg`;
        const filepath = path.join(DAMAGED_DIR, filename);

        // Save image
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
        await sharp(buffer)
            .jpeg({ quality: 90 })
            .toFile(filepath);

        // Calculate expected presence score based on severity
        const presenceScores = {
            early: 0.4 + Math.random() * 0.2,   // 0.4-0.6
            midway: 0.6 + Math.random() * 0.2,  // 0.6-0.8
            full: 0.8 + Math.random() * 0.15,   // 0.8-0.95
        };

        const testImage: TestImage = {
            id,
            filename,
            category: 'damaged',
            damageType,
            severity,
            presenceScore: presenceScores[severity],
            expectedDetection: true,
            description: `${severity} severity ${damageType.replace('_', ' ')}`,
            metadata: {
                width: 800,
                height: 600,
                format: 'jpeg',
                createdAt: new Date().toISOString(),
                lighting: 'normal',
                quality: 'high',
                occlusion: 0,
            },
        };

        this.testImages.push(testImage);
        return testImage;
    }

    /**
     * Generate an undamaged property image
     */
    async generateUndamagedImage(surfaceType: string): Promise<TestImage> {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        // Clean surface based on type
        switch (surfaceType) {
            case 'wall':
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 800, 600);
                this.addWallTexture(ctx, 800, 600, 0.1); // Very subtle texture
                break;
            case 'ceiling':
                ctx.fillStyle = '#fafafa';
                ctx.fillRect(0, 0, 800, 600);
                this.addCeilingPattern(ctx);
                break;
            case 'floor':
                this.addWoodFloorPattern(ctx);
                break;
            case 'tile':
                this.addTilePattern(ctx);
                break;
        }

        const id = faker.string.uuid();
        const filename = `undamaged_${surfaceType}_${id}.jpg`;
        const filepath = path.join(UNDAMAGED_DIR, filename);

        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
        await sharp(buffer)
            .jpeg({ quality: 90 })
            .toFile(filepath);

        const testImage: TestImage = {
            id,
            filename,
            category: 'undamaged',
            presenceScore: Math.random() * 0.1, // 0-0.1
            expectedDetection: false,
            description: `Clean ${surfaceType} with no damage`,
            metadata: {
                width: 800,
                height: 600,
                format: 'jpeg',
                createdAt: new Date().toISOString(),
                lighting: 'normal',
                quality: 'high',
                occlusion: 0,
            },
        };

        this.testImages.push(testImage);
        return testImage;
    }

    /**
     * Generate borderline cases (unclear if damage present)
     */
    async generateBorderlineImage(scenario: string): Promise<TestImage> {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 800, 600);
        this.addWallTexture(ctx, 800, 600);

        let presenceScore = 0;
        let description = '';

        switch (scenario) {
            case 'shadow':
                // Shadow that looks like water damage
                this.addShadow(ctx);
                presenceScore = 0.25 + Math.random() * 0.1; // Near threshold
                description = 'Shadow that resembles water damage';
                break;

            case 'dirt':
                // Surface dirt that might be confused with mold
                this.addDirt(ctx);
                presenceScore = 0.20 + Math.random() * 0.1;
                description = 'Surface dirt that could be mistaken for mold';
                break;

            case 'wear':
                // Normal wear and tear
                this.addWearAndTear(ctx);
                presenceScore = 0.15 + Math.random() * 0.15;
                description = 'Normal wear and tear patterns';
                break;

            case 'reflection':
                // Light reflection that might look like damage
                this.addReflection(ctx);
                presenceScore = 0.10 + Math.random() * 0.15;
                description = 'Light reflection on surface';
                break;

            case 'subtle_damage':
                // Very early stage real damage
                this.addSubtleDamage(ctx);
                presenceScore = 0.30 + Math.random() * 0.15;
                description = 'Very early stage damage, barely visible';
                break;
        }

        const id = faker.string.uuid();
        const filename = `borderline_${scenario}_${id}.jpg`;
        const filepath = path.join(BORDERLINE_DIR, filename);

        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
        await sharp(buffer)
            .jpeg({ quality: 90 })
            .toFile(filepath);

        // Borderline cases: detection depends on threshold
        const expectedDetection = presenceScore > 0.3;

        const testImage: TestImage = {
            id,
            filename,
            category: 'borderline',
            presenceScore,
            expectedDetection,
            description,
            metadata: {
                width: 800,
                height: 600,
                format: 'jpeg',
                createdAt: new Date().toISOString(),
                lighting: 'normal',
                quality: 'high',
                occlusion: 0,
            },
        };

        this.testImages.push(testImage);
        return testImage;
    }

    /**
     * Generate edge case images (blurry, dark, overexposed, etc.)
     */
    async generateEdgeCaseImage(edgeCase: string): Promise<TestImage> {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        // Start with base image
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 800, 600);

        // Add some damage (may or may not be visible due to edge case)
        this.addWaterDamage(ctx, 'midway');

        let quality: 'high' | 'medium' | 'low' = 'high';
        let lighting: 'normal' | 'bright' | 'dark' | 'mixed' = 'normal';
        let description = '';
        let presenceScore = 0;

        const id = faker.string.uuid();
        let filepath = '';

        switch (edgeCase) {
            case 'blurry':
                // Apply blur filter
                const blurryBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
                filepath = path.join(BORDERLINE_DIR, `edge_blurry_${id}.jpg`);
                await sharp(blurryBuffer)
                    .blur(10)
                    .jpeg({ quality: 60 })
                    .toFile(filepath);
                quality = 'low';
                description = 'Blurry image with unclear damage';
                presenceScore = 0.35; // Uncertain due to blur
                break;

            case 'dark':
                // Darken the image
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, 800, 600);
                filepath = path.join(BORDERLINE_DIR, `edge_dark_${id}.jpg`);
                await sharp(canvas.toBuffer()).toFile(filepath);
                lighting = 'dark';
                description = 'Underexposed image';
                presenceScore = 0.25;
                break;

            case 'overexposed':
                // Overexpose the image
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 800, 600);
                filepath = path.join(BORDERLINE_DIR, `edge_bright_${id}.jpg`);
                await sharp(canvas.toBuffer()).toFile(filepath);
                lighting = 'bright';
                description = 'Overexposed image';
                presenceScore = 0.20;
                break;

            case 'occluded':
                // Add furniture/objects blocking part of the damage
                this.addOcclusion(ctx);
                filepath = path.join(BORDERLINE_DIR, `edge_occluded_${id}.jpg`);
                await sharp(canvas.toBuffer()).toFile(filepath);
                description = 'Partially occluded damage';
                presenceScore = 0.50;
                break;
        }

        const testImage: TestImage = {
            id,
            filename: path.basename(filepath),
            category: 'borderline',
            presenceScore,
            expectedDetection: presenceScore > 0.3,
            description,
            metadata: {
                width: 800,
                height: 600,
                format: 'jpeg',
                createdAt: new Date().toISOString(),
                lighting,
                quality,
                occlusion: edgeCase === 'occluded' ? 0.4 : 0,
            },
        };

        this.testImages.push(testImage);
        return testImage;
    }

    // Helper methods for drawing damage patterns
    private addWallTexture(ctx: CanvasRenderingContext2D, width: number, height: number, opacity = 0.3) {
        ctx.globalAlpha = opacity;
        for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * width, Math.random() * height);
            ctx.lineTo(Math.random() * width, Math.random() * height);
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    private addWaterDamage(ctx: CanvasRenderingContext2D, severity: string) {
        const gradient = ctx.createRadialGradient(400, 200, 50, 400, 200, severity === 'full' ? 200 : 100);
        gradient.addColorStop(0, 'rgba(139, 119, 101, 0.8)');
        gradient.addColorStop(0.5, 'rgba(160, 140, 120, 0.6)');
        gradient.addColorStop(1, 'rgba(180, 160, 140, 0.3)');

        ctx.fillStyle = gradient;
        ctx.fillRect(300, 100, severity === 'full' ? 400 : 200, severity === 'full' ? 300 : 150);

        // Add water stain rings
        ctx.strokeStyle = 'rgba(120, 100, 80, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < (severity === 'full' ? 5 : 3); i++) {
            ctx.beginPath();
            ctx.arc(400, 200, 30 + i * 20, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    private addCrack(ctx: CanvasRenderingContext2D, severity: string) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = severity === 'full' ? 4 : severity === 'midway' ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(200, 100);

        // Create jagged crack pattern
        const points = severity === 'full' ? 20 : 10;
        for (let i = 0; i < points; i++) {
            ctx.lineTo(
                200 + i * 20 + Math.random() * 10,
                100 + i * 20 + Math.random() * 20 - 10
            );
        }
        ctx.stroke();
    }

    private addMold(ctx: CanvasRenderingContext2D, severity: string) {
        const spots = severity === 'full' ? 50 : severity === 'midway' ? 25 : 10;

        for (let i = 0; i < spots; i++) {
            const x = 300 + Math.random() * 200;
            const y = 200 + Math.random() * 150;
            const radius = Math.random() * (severity === 'full' ? 8 : 4) + 2;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(50, 60, 50, 0.8)');
            gradient.addColorStop(1, 'rgba(70, 80, 70, 0.3)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private addRot(ctx: CanvasRenderingContext2D, severity: string) {
        const area = severity === 'full' ? 300 : severity === 'midway' ? 200 : 100;

        ctx.fillStyle = 'rgba(101, 67, 33, 0.7)';
        ctx.fillRect(350, 250, area, area * 0.7);

        // Add texture
        for (let i = 0; i < area / 10; i++) {
            ctx.strokeStyle = 'rgba(80, 50, 20, 0.3)';
            ctx.beginPath();
            ctx.moveTo(350 + Math.random() * area, 250);
            ctx.lineTo(350 + Math.random() * area, 250 + area * 0.7);
            ctx.stroke();
        }
    }

    private addStructuralDamage(ctx: CanvasRenderingContext2D, severity: string) {
        // Large crack with displacement
        ctx.strokeStyle = '#222';
        ctx.lineWidth = severity === 'full' ? 8 : 4;

        ctx.beginPath();
        ctx.moveTo(100, 300);
        ctx.lineTo(700, 350);
        ctx.stroke();

        // Add debris
        if (severity === 'full') {
            for (let i = 0; i < 10; i++) {
                ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
                ctx.fillRect(
                    100 + Math.random() * 600,
                    350 + Math.random() * 50,
                    Math.random() * 20 + 10,
                    Math.random() * 20 + 10
                );
            }
        }
    }

    private addFireDamage(ctx: CanvasRenderingContext2D, severity: string) {
        const gradient = ctx.createRadialGradient(400, 300, 50, 400, 300, severity === 'full' ? 250 : 150);
        gradient.addColorStop(0, 'rgba(20, 20, 20, 0.9)');
        gradient.addColorStop(0.5, 'rgba(50, 40, 30, 0.7)');
        gradient.addColorStop(1, 'rgba(80, 60, 40, 0.3)');

        ctx.fillStyle = gradient;
        ctx.fillRect(250, 150, 300, 300);
    }

    private addPestDamage(ctx: CanvasRenderingContext2D, severity: string) {
        const holes = severity === 'full' ? 20 : 10;

        for (let i = 0; i < holes; i++) {
            ctx.fillStyle = 'rgba(60, 40, 20, 0.8)';
            ctx.beginPath();
            ctx.arc(
                200 + Math.random() * 400,
                150 + Math.random() * 300,
                Math.random() * 5 + 3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    private addCeilingPattern(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, 800, 600);

        // Add subtle texture
        ctx.strokeStyle = '#f5f5f5';
        ctx.lineWidth = 1;
        for (let x = 0; x < 800; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 600);
            ctx.stroke();
        }
    }

    private addWoodFloorPattern(ctx: CanvasRenderingContext2D) {
        const woodColors = ['#8B4513', '#A0522D', '#D2691E'];

        for (let y = 0; y < 600; y += 30) {
            ctx.fillStyle = woodColors[Math.floor(Math.random() * woodColors.length)];
            ctx.fillRect(0, y, 800, 30);
        }
    }

    private addTilePattern(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 800, 600);

        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;

        for (let x = 0; x < 800; x += 100) {
            for (let y = 0; y < 600; y += 100) {
                ctx.strokeRect(x, y, 100, 100);
            }
        }
    }

    private addShadow(ctx: CanvasRenderingContext2D) {
        const gradient = ctx.createLinearGradient(300, 100, 500, 300);
        gradient.addColorStop(0, 'rgba(100, 100, 100, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(300, 100, 200, 200);
    }

    private addDirt(ctx: CanvasRenderingContext2D) {
        for (let i = 0; i < 30; i++) {
            ctx.fillStyle = `rgba(120, 100, 80, ${Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(
                Math.random() * 800,
                Math.random() * 600,
                Math.random() * 3 + 1,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    private addWearAndTear(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
        ctx.lineWidth = 1;

        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 800, Math.random() * 600);
            ctx.lineTo(Math.random() * 800, Math.random() * 600);
            ctx.stroke();
        }
    }

    private addReflection(ctx: CanvasRenderingContext2D) {
        const gradient = ctx.createLinearGradient(200, 200, 400, 400);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(200, 200, 200, 200);
    }

    private addSubtleDamage(ctx: CanvasRenderingContext2D) {
        // Very light water stain
        ctx.fillStyle = 'rgba(150, 140, 130, 0.2)';
        ctx.fillRect(350, 250, 100, 80);
    }

    private addOcclusion(ctx: CanvasRenderingContext2D) {
        // Add furniture silhouette
        ctx.fillStyle = 'rgba(80, 60, 40, 0.9)';
        ctx.fillRect(300, 350, 200, 250);

        // Add cabinet
        ctx.fillStyle = 'rgba(100, 80, 60, 0.9)';
        ctx.fillRect(100, 200, 150, 300);
    }

    /**
     * Generate complete test dataset
     */
    async generateCompleteDataset(): Promise<void> {
        console.log('Generating test dataset...');

        // Generate damaged images (various types and severities)
        for (const damageType of DAMAGE_TYPES) {
            for (const severity of ['early', 'midway', 'full'] as const) {
                await this.generateDamagedImage(damageType, severity);
                console.log(`Generated damaged: ${damageType} - ${severity}`);
            }
        }

        // Generate undamaged images
        const surfaces = ['wall', 'ceiling', 'floor', 'tile'];
        for (const surface of surfaces) {
            for (let i = 0; i < 3; i++) {
                await this.generateUndamagedImage(surface);
                console.log(`Generated undamaged: ${surface} #${i + 1}`);
            }
        }

        // Generate borderline cases
        const borderlineScenarios = ['shadow', 'dirt', 'wear', 'reflection', 'subtle_damage'];
        for (const scenario of borderlineScenarios) {
            for (let i = 0; i < 2; i++) {
                await this.generateBorderlineImage(scenario);
                console.log(`Generated borderline: ${scenario} #${i + 1}`);
            }
        }

        // Generate edge cases
        const edgeCases = ['blurry', 'dark', 'overexposed', 'occluded'];
        for (const edgeCase of edgeCases) {
            await this.generateEdgeCaseImage(edgeCase);
            console.log(`Generated edge case: ${edgeCase}`);
        }

        // Save metadata
        await this.saveMetadata();
        console.log(`\nTest dataset generated successfully!`);
        console.log(`Total images: ${this.testImages.length}`);
        console.log(`Damaged: ${this.testImages.filter(img => img.category === 'damaged').length}`);
        console.log(`Undamaged: ${this.testImages.filter(img => img.category === 'undamaged').length}`);
        console.log(`Borderline: ${this.testImages.filter(img => img.category === 'borderline').length}`);
    }

    private async saveMetadata(): Promise<void> {
        const metadata = {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            totalImages: this.testImages.length,
            categories: {
                damaged: this.testImages.filter(img => img.category === 'damaged').length,
                undamaged: this.testImages.filter(img => img.category === 'undamaged').length,
                borderline: this.testImages.filter(img => img.category === 'borderline').length,
            },
            damageTypes: DAMAGE_TYPES,
            images: this.testImages,
        };

        await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
    }
}

// Main execution
async function main() {
    const generator = new TestDataGenerator();
    await generator.initialize();
    await generator.generateCompleteDataset();
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

export { TestDataGenerator, TestImage };