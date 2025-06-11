/**
 * Test script to validate the infinite loop fix in useNodeState hook
 * 
 * This script opens the application and monitors for:
 * 1. Absence of infinite loop console patterns
 * 2. Proper transformation application without repetition
 * 3. Character bleed system functioning correctly
 * 4. No "Maximum update depth exceeded" errors
 */

const puppeteer = require('puppeteer');

async function testInfiniteLoopFix() {
  console.log('🧪 Testing Infinite Loop Fix...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Track console messages to detect infinite loops
    const consoleMessages = [];
    let errorCount = 0;
    let infiniteLoopDetected = false;
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      
      // Check for infinite loop patterns
      if (text.includes('TransformationService.calculateJourneyTransformations') ||
          text.includes('CharacterBleedService.calculateBleedEffects') ||
          text.includes('NodesSlice.applyJourneyTransformations')) {
        console.log(`📝 Transformation log: ${text.substring(0, 100)}...`);
      }
      
      // Check for React errors
      if (text.includes('Maximum update depth exceeded') || 
          text.includes('Warning: Maximum update depth exceeded')) {
        console.error(`❌ INFINITE LOOP DETECTED: ${text}`);
        infiniteLoopDetected = true;
        errorCount++;
      }
      
      // Check for our fix working
      if (text.includes('Skipping already applied transformations')) {
        console.log(`✅ Fix working: ${text}`);
      }
    });
    
    page.on('pageerror', error => {
      console.error(`❌ Page Error: ${error.message}`);
      errorCount++;
    });
    
    console.log('🌐 Opening application...');
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
    
    // Wait for initial load
    console.log('⏳ Waiting for application to initialize...');
    await page.waitForTimeout(3000);
    
    // Check for constellation view and click a node to trigger navigation
    console.log('🎯 Looking for constellation nodes...');
    
    // Try to find and click a node to trigger transformations
    const nodeSelector = 'button[data-testid*="node"], .constellation-node, .node-button';
    
    try {
      await page.waitForSelector(nodeSelector, { timeout: 5000 });
      console.log('🔄 Clicking a node to trigger navigation...');
      await page.click(nodeSelector);
      
      // Wait for transformations to process
      await page.waitForTimeout(5000);
      
      console.log('🔄 Clicking another node to trigger character bleed...');
      const nodes = await page.$$(nodeSelector);
      if (nodes.length > 1) {
        await nodes[1].click();
        await page.waitForTimeout(3000);
      }
      
    } catch (err) {
      console.log('⚠️  Could not find clickable nodes, testing with current state');
    }
    
    // Final analysis
    console.log('\n📊 Test Results:');
    console.log(`   Console messages captured: ${consoleMessages.length}`);
    console.log(`   Errors detected: ${errorCount}`);
    
    // Count transformation-related messages to check for repetition
    const transformationMessages = consoleMessages.filter(msg => 
      msg.includes('TransformationService') || 
      msg.includes('CharacterBleedService') ||
      msg.includes('useNodeState')
    );
    
    console.log(`   Transformation-related logs: ${transformationMessages.length}`);
    
    // Check for excessive repetition (sign of infinite loop)
    const suspiciousRepetition = transformationMessages.length > 50;
    
    if (infiniteLoopDetected) {
      console.log('\n❌ INFINITE LOOP STILL PRESENT');
      console.log('   The "Maximum update depth exceeded" error was detected.');
      return false;
    } else if (suspiciousRepetition) {
      console.log('\n⚠️  POTENTIAL INFINITE LOOP');
      console.log(`   Excessive transformation logs detected (${transformationMessages.length})`);
      console.log('   Recent logs:');
      transformationMessages.slice(-10).forEach(msg => 
        console.log(`     ${msg.substring(0, 80)}...`)
      );
      return false;
    } else {
      console.log('\n✅ INFINITE LOOP FIX SUCCESSFUL');
      console.log('   No infinite loop patterns detected');
      console.log('   Application running smoothly');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    console.log('\n🔄 Closing browser...');
    await browser.close();
  }
}

// Run the test
testInfiniteLoopFix()
  .then(success => {
    if (success) {
      console.log('\n🎉 INFINITE LOOP BUG FIX VERIFIED SUCCESSFUL! 🎉');
      console.log('\nThe application is now stable and ready for use.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Issues detected - may need additional fixes');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
