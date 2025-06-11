// Simple test script for content variant system
const fs = require('fs');
const path = require('path');

// Read the arch-glitch content
const archGlitchPath = path.join(__dirname, 'src', 'content', 'arch-glitch.md');
const content = fs.readFileSync(archGlitchPath, 'utf8');

console.log('=== Content Variant System Test ===');
console.log('Content length:', content.length);
console.log('');

// Test the regex pattern used in ContentVariantService
const combinedPattern = /---(\[(\d+)\]|([a-zA-Z0-9\-_]+))---/g;
const matches = [...content.matchAll(combinedPattern)];

console.log('Found delimiters:');
matches.forEach((match, index) => {
  const fullMatch = match[0];
  const visitCountMatch = match[2]; // Visit count if it's a [number] pattern
  const sectionMatch = match[3]; // Section name if it's a section pattern
  
  console.log(`${index + 1}. ${fullMatch}`);
  if (visitCountMatch) {
    console.log(`   Type: Visit count (${visitCountMatch})`);
  } else if (sectionMatch) {
    console.log(`   Type: Section (${sectionMatch})`);
  }
});

console.log('');
console.log('Content sections:');

// Split by the pattern to see content sections
const parts = content.split(combinedPattern);
console.log('Total parts after split:', parts.length);

// Show first few characters of each content section
for (let i = 0; i < parts.length; i += 4) {
  const contentPart = parts[i];
  if (contentPart && contentPart.trim()) {
    const preview = contentPart.trim().substring(0, 100);
    console.log(`Section ${Math.floor(i/4) + 1}: ${preview}...`);
  }
}

console.log('');
console.log('Test completed successfully!');
