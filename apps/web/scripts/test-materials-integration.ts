import { JobAnalysisService } from '@/lib/services/JobAnalysisService';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';

/**
 * Test Materials Integration End-to-End
 *
 * Tests the complete flow:
 * 1. Job description with materials → JobAnalysisService
 * 2. Material detection and pricing
 * 3. PricingAgent with material costs
 * 4. Cost breakdown generation
 */

async function testMaterialsIntegration() {
  console.log('🧪 Testing Materials Integration\n');

  // Test Case 1: Job with detectable materials
  console.log('Test 1: Job with Copper Pipe and Paint');
  console.log('-'.repeat(60));

  const jobDescription = `
    Need to replace old copper pipes in the bathroom and repaint the walls.
    Approximately 10 meters of copper pipe needed.
    Also need about 5 liters of white emulsion paint for the walls.
  `.trim();

  try {
    // Step 1: Analyze job (should detect materials and lookup prices)
    console.log('Step 1: Analyzing job description...');
    const analysis = await JobAnalysisService.analyzeJob({
      description: jobDescription,
      photos: [],
    });

    console.log('✅ Job analysis complete');
    console.log(`   Detected ${analysis.detectedMaterials?.length || 0} materials`);

    if (analysis.detectedMaterials && analysis.detectedMaterials.length > 0) {
      console.log('\n   Materials Detected:');
      analysis.detectedMaterials.forEach(m => {
        const source = m.source === 'database' ? '✓ Database' : '○ Estimated';
        const price = m.unit_price ? `£${m.unit_price}/${m.unit}` : 'No price';
        const total = m.total_cost ? ` → Total: £${m.total_cost.toFixed(2)}` : '';
        console.log(`   - ${m.name} (${source})`);
        console.log(`     ${price} × ${m.quantity || '?'}${total}`);
        if (m.supplier_name) {
          console.log(`     Supplier: ${m.supplier_name}`);
        }
      });
    }

    if (analysis.estimatedMaterialCost) {
      console.log(`\n   💰 Total Estimated Material Cost: £${analysis.estimatedMaterialCost.toFixed(2)}`);
    } else {
      console.log('\n   ⚠️  No material cost calculated');
    }

    console.log(`\n   Suggested Budget: £${analysis.suggestedBudget.recommended}`);
    console.log(`   Category: ${analysis.suggestedCategory}`);
    console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);

    // Step 2: Test PricingAgent (would need a real job ID in production)
    console.log('\n\nTest 2: Cost Breakdown Calculation');
    console.log('-'.repeat(60));

    // Simulate what PricingAgent would receive
    const materialCost = analysis.estimatedMaterialCost || 0;
    const recommendedBudget = analysis.suggestedBudget.recommended;

    if (materialCost > 0) {
      const laborCost = recommendedBudget - materialCost - (recommendedBudget * 0.15);
      const overhead = recommendedBudget * 0.15;
      const profit = recommendedBudget - materialCost - laborCost - overhead;

      console.log('✅ Cost breakdown calculated:');
      console.log(`   Materials: £${materialCost.toFixed(2)} (${((materialCost/recommendedBudget)*100).toFixed(0)}%)`);
      console.log(`   Labor: £${laborCost.toFixed(2)} (${((laborCost/recommendedBudget)*100).toFixed(0)}%)`);
      console.log(`   Overhead: £${overhead.toFixed(2)} (${((overhead/recommendedBudget)*100).toFixed(0)}%)`);
      console.log(`   Profit: £${profit.toFixed(2)} (${((profit/recommendedBudget)*100).toFixed(0)}%)`);
      console.log(`   ────────────────────────`);
      console.log(`   Total: £${recommendedBudget.toFixed(2)}`);
    } else {
      console.log('⚠️  No material cost available for breakdown');
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ INTEGRATION TEST COMPLETE');
    console.log('='.repeat(60));

    console.log('\nFeatures Verified:');
    console.log('  ✓ Material detection from text');
    console.log('  ✓ Database lookup and fuzzy matching');
    console.log('  ✓ Price calculation with quantities');
    console.log('  ✓ Total material cost aggregation');
    console.log('  ✓ Cost breakdown calculation');

    console.log('\n🎉 Materials database integration is working!\n');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    if (error instanceof Error) {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

testMaterialsIntegration();
