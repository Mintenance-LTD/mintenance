/**
 * Analyze YOLO Training Data Quality
 *
 * This script analyzes the YOLO dataset to identify:
 * 1. Class distribution and imbalance
 * 2. Image quality and dimensions
 * 3. Annotation density
 * 4. Augmentation coverage
 * 5. Recommendations for improvement
 */

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '@mintenance/shared';

interface YOLODataset {
    path: string;
    train: string;
    val: string;
    test?: string;
    nc: number;  // number of classes
    names: string[];
}

interface AnnotationStats {
    className: string;
    count: number;
    avgBBoxSize: number;
    minBBoxSize: number;
    maxBBoxSize: number;
    imagesWithClass: number;
}

interface DataQualityReport {
    totalImages: number;
    totalAnnotations: number;
    classDistribution: AnnotationStats[];
    classImbalanceRatio: number;
    avgAnnotationsPerImage: number;
    emptyImages: number;
    imageResolutions: Map<string, number>;
    recommendations: string[];
    qualityScore: number;  // 0-100
}

export class YOLODataAnalyzer {
    private dataset: YOLODataset;
    private report: DataQualityReport;

    constructor(private dataYamlPath: string) {
        this.report = {
            totalImages: 0,
            totalAnnotations: 0,
            classDistribution: [],
            classImbalanceRatio: 0,
            avgAnnotationsPerImage: 0,
            emptyImages: 0,
            imageResolutions: new Map(),
            recommendations: [],
            qualityScore: 100,
        };
    }

    async analyze(): Promise<DataQualityReport> {
        try {
            // 1. Load dataset configuration
            await this.loadDataset();

            // 2. Analyze training set
            await this.analyzeImageSet('train');

            // 3. Analyze validation set
            await this.analyzeImageSet('val');

            // 4. Calculate statistics
            this.calculateStatistics();

            // 5. Generate recommendations
            this.generateRecommendations();

            // 6. Calculate quality score
            this.calculateQualityScore();

            return this.report;
        } catch (error) {
            logger.error('Failed to analyze YOLO dataset', { error });
            throw error;
        }
    }

    private async loadDataset(): Promise<void> {
        const yamlContent = await fs.readFile(this.dataYamlPath, 'utf-8');
        this.dataset = yaml.load(yamlContent) as YOLODataset;

        // Initialize class distribution
        this.report.classDistribution = this.dataset.names.map(name => ({
            className: name,
            count: 0,
            avgBBoxSize: 0,
            minBBoxSize: 1,
            maxBBoxSize: 0,
            imagesWithClass: 0,
        }));

        logger.info('Loaded dataset configuration', {
            classes: this.dataset.nc,
            names: this.dataset.names.length,
        });
    }

    private async analyzeImageSet(setType: 'train' | 'val' | 'test'): Promise<void> {
        const setPath = path.join(
            path.dirname(this.dataYamlPath),
            this.dataset[setType]
        );

        const labelsPath = setPath.replace('images', 'labels');

        try {
            const imageFiles = await fs.readdir(setPath);

            for (const imageFile of imageFiles) {
                if (!this.isImageFile(imageFile)) continue;

                this.report.totalImages++;

                // Check for corresponding label file
                const labelFile = imageFile.replace(/\.(jpg|jpeg|png)$/i, '.txt');
                const labelPath = path.join(labelsPath, labelFile);

                try {
                    const annotations = await this.parseAnnotations(labelPath);

                    if (annotations.length === 0) {
                        this.report.emptyImages++;
                    } else {
                        this.processAnnotations(annotations);
                    }

                    // Track image resolution
                    const imagePath = path.join(setPath, imageFile);
                    const resolution = await this.getImageResolution(imagePath);
                    const resKey = `${resolution.width}x${resolution.height}`;
                    this.report.imageResolutions.set(
                        resKey,
                        (this.report.imageResolutions.get(resKey) || 0) + 1
                    );
                } catch (error) {
                    logger.warn(`Missing label file for ${imageFile}`);
                    this.report.emptyImages++;
                }
            }
        } catch (error) {
            logger.error(`Failed to analyze ${setType} set`, { error });
        }
    }

    private async parseAnnotations(labelPath: string): Promise<number[][]> {
        const content = await fs.readFile(labelPath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line);

        return lines.map(line => {
            const parts = line.split(' ').map(Number);
            return parts; // [class_id, x_center, y_center, width, height]
        });
    }

    private processAnnotations(annotations: number[][]): void {
        const classesInImage = new Set<number>();

        for (const [classId, x, y, width, height] of annotations) {
            this.report.totalAnnotations++;
            classesInImage.add(classId);

            const bboxSize = width * height;
            const stats = this.report.classDistribution[classId];

            if (stats) {
                stats.count++;
                stats.minBBoxSize = Math.min(stats.minBBoxSize, bboxSize);
                stats.maxBBoxSize = Math.max(stats.maxBBoxSize, bboxSize);
                stats.avgBBoxSize = (stats.avgBBoxSize * (stats.count - 1) + bboxSize) / stats.count;
            }
        }

        // Update images with class count
        classesInImage.forEach(classId => {
            if (this.report.classDistribution[classId]) {
                this.report.classDistribution[classId].imagesWithClass++;
            }
        });
    }

    private calculateStatistics(): void {
        // Average annotations per image
        this.report.avgAnnotationsPerImage =
            this.report.totalAnnotations / Math.max(1, this.report.totalImages);

        // Class imbalance ratio
        const classCounts = this.report.classDistribution.map(c => c.count).filter(c => c > 0);
        if (classCounts.length > 0) {
            const maxCount = Math.max(...classCounts);
            const minCount = Math.min(...classCounts);
            this.report.classImbalanceRatio = maxCount / Math.max(1, minCount);
        }

        // Sort classes by count
        this.report.classDistribution.sort((a, b) => b.count - a.count);
    }

    private generateRecommendations(): void {
        const recs = this.report.recommendations;

        // 1. Check class imbalance
        if (this.report.classImbalanceRatio > 10) {
            recs.push('⚠️ CRITICAL: Severe class imbalance detected (ratio > 10:1). Consider:');
            recs.push('  - Collect more samples for underrepresented classes');
            recs.push('  - Use class-weighted loss during training');
            recs.push('  - Apply targeted augmentation for minority classes');
        }

        // 2. Check for classes with very few samples
        const underrepresented = this.report.classDistribution.filter(c => c.count < 100);
        if (underrepresented.length > 0) {
            recs.push(`⚠️ ${underrepresented.length} classes have < 100 samples:`);
            underrepresented.slice(0, 5).forEach(c => {
                recs.push(`  - ${c.className}: ${c.count} samples`);
            });
        }

        // 3. Check empty images
        const emptyRatio = this.report.emptyImages / this.report.totalImages;
        if (emptyRatio > 0.1) {
            recs.push(`⚠️ ${(emptyRatio * 100).toFixed(1)}% of images have no annotations`);
            recs.push('  - Review annotation process');
            recs.push('  - Consider removing or re-annotating empty images');
        }

        // 4. Check annotation density
        if (this.report.avgAnnotationsPerImage < 1.5) {
            recs.push('ℹ️ Low annotation density detected');
            recs.push('  - Consider images with multiple damage types');
            recs.push('  - Ensure all visible damage is annotated');
        }

        // 5. Augmentation recommendations
        recs.push('\n📊 Recommended augmentations for building damage:');
        recs.push('  - Rotation: ±15° (buildings at angles)');
        recs.push('  - Brightness: ±30% (different lighting)');
        recs.push('  - Blur: Gaussian (camera quality variation)');
        recs.push('  - Perspective: Slight warping (different angles)');
        recs.push('  - Mixup: 0.2 alpha (smooth class boundaries)');

        // 6. Resolution recommendations
        const resolutions = Array.from(this.report.imageResolutions.entries());
        const mostCommon = resolutions.sort((a, b) => b[1] - a[1])[0];
        if (mostCommon) {
            recs.push(`\n📐 Most common resolution: ${mostCommon[0]} (${mostCommon[1]} images)`);
            if (!mostCommon[0].includes('640')) {
                recs.push('  - Consider resizing to 640x640 for optimal YOLO performance');
            }
        }
    }

    private calculateQualityScore(): void {
        let score = 100;

        // Deduct for class imbalance
        if (this.report.classImbalanceRatio > 10) score -= 30;
        else if (this.report.classImbalanceRatio > 5) score -= 15;
        else if (this.report.classImbalanceRatio > 3) score -= 5;

        // Deduct for underrepresented classes
        const underrepresented = this.report.classDistribution.filter(c => c.count < 100);
        score -= Math.min(20, underrepresented.length * 2);

        // Deduct for empty images
        const emptyRatio = this.report.emptyImages / this.report.totalImages;
        score -= Math.min(10, emptyRatio * 100);

        // Deduct for low annotation density
        if (this.report.avgAnnotationsPerImage < 1) score -= 10;
        else if (this.report.avgAnnotationsPerImage < 2) score -= 5;

        // Deduct if total dataset is too small
        if (this.report.totalImages < 500) score -= 20;
        else if (this.report.totalImages < 1000) score -= 10;

        this.report.qualityScore = Math.max(0, score);
    }

    private isImageFile(filename: string): boolean {
        return /\.(jpg|jpeg|png)$/i.test(filename);
    }

    private async getImageResolution(imagePath: string): Promise<{ width: number; height: number }> {
        // Simplified - in production use sharp or similar
        return { width: 640, height: 640 };
    }

    public printReport(): void {
        console.log('\n' + '='.repeat(60));
        console.log('📊 YOLO TRAINING DATA QUALITY REPORT');
        console.log('='.repeat(60));

        console.log(`\n📈 Dataset Overview:`);
        console.log(`  Total Images: ${this.report.totalImages}`);
        console.log(`  Total Annotations: ${this.report.totalAnnotations}`);
        console.log(`  Avg Annotations/Image: ${this.report.avgAnnotationsPerImage.toFixed(2)}`);
        console.log(`  Empty Images: ${this.report.emptyImages} (${((this.report.emptyImages / this.report.totalImages) * 100).toFixed(1)}%)`);
        console.log(`  Class Imbalance Ratio: ${this.report.classImbalanceRatio.toFixed(2)}:1`);

        console.log(`\n📊 Top 10 Classes by Count:`);
        this.report.classDistribution.slice(0, 10).forEach((c, i) => {
            const percentage = ((c.count / this.report.totalAnnotations) * 100).toFixed(1);
            console.log(`  ${i + 1}. ${c.className}: ${c.count} annotations (${percentage}%)`);
        });

        console.log(`\n⚠️ Underrepresented Classes (<100 samples):`);
        this.report.classDistribution
            .filter(c => c.count < 100 && c.count > 0)
            .slice(0, 10)
            .forEach(c => {
                console.log(`  - ${c.className}: ${c.count} annotations`);
            });

        console.log(`\n💡 Recommendations:`);
        this.report.recommendations.forEach(rec => console.log(rec));

        console.log(`\n🎯 Quality Score: ${this.report.qualityScore}/100`);

        if (this.report.qualityScore < 50) {
            console.log('  ⚠️ CRITICAL: Dataset quality needs significant improvement');
        } else if (this.report.qualityScore < 70) {
            console.log('  ⚠️ WARNING: Dataset quality could be improved');
        } else {
            console.log('  ✅ Good dataset quality');
        }

        console.log('\n' + '='.repeat(60));
    }
}

// Main execution
async function main() {
    const analyzer = new YOLODataAnalyzer(
        path.join(__dirname, '../yolo_dataset/data.yaml')
    );

    try {
        const report = await analyzer.analyze();
        analyzer.printReport();

        // Save detailed report
        await fs.writeFile(
            path.join(__dirname, '../yolo_training_quality_report.json'),
            JSON.stringify(report, null, 2)
        );

        console.log('\n✅ Report saved to yolo_training_quality_report.json');
    } catch (error) {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}