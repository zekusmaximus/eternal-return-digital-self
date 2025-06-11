// Simple test to verify content variant parsing
const fs = require('fs');

// Read the arch-glitch.md file
try {
  const content = fs.readFileSync('./src/content/arch-glitch.md', 'utf8');
  console.log('Successfully read arch-glitch.md');
  console.log('Content length:', content.length);
  
  // Look for section delimiters
  const sectionDelimiters = content.match(/---[a-zA-Z0-9\-_]+---/g);
  const visitCountDelimiters = content.match(/---\[\d+\]---/g);
  
  console.log('Section delimiters found:', sectionDelimiters);
  console.log('Visit count delimiters found:', visitCountDelimiters);
  
} catch (error) {
  console.error('Error reading file:', error.message);
}
