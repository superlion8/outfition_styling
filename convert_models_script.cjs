const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'model_db.txt');
const outputFile = path.join(__dirname, 'src/data/models.json');

// Ensure output directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

try {
    let content = fs.readFileSync(inputFile, 'utf8');

    // 1. Remove "// number" comments
    content = content.replace(/\/\/\s*\d+/g, '');

    // 2. Fix MongoDB specific types
    // ObjectId("...") -> "..."
    content = content.replace(/ObjectId\("([^"]+)"\)/g, '"$1"');

    // ISODate("...") -> "..."
    content = content.replace(/ISODate\("([^"]+)"\)/g, '"$1"');

    // Long("...") -> "..."
    content = content.replace(/Long\("([^"]+)"\)/g, '"$1"');

    // 3. Make it a valid JSON array
    // The file contains multiple JSON objects separated by whitespace (and the comments we removed).
    // We need to add commas between objects and wrap in [ ]

    // Split by closing brace + whitespace + opening brace to find boundaries
    // But regex replacement is safer.
    // First, trim whitespace
    content = content.trim();

    // Replace "} {" with "}, {" (newlines generally exist)
    content = content.replace(/}\s*{/g, '}, {');

    // Wrap in brackets
    content = `[${content}]`;

    // 4. Validate
    const json = JSON.parse(content);
    console.log(`Successfully parsed ${json.length} models.`);

    // 5. Write to file
    fs.writeFileSync(outputFile, JSON.stringify(json, null, 2));
    console.log(`Wrote to ${outputFile}`);

} catch (error) {
    console.error('Error converting file:', error);
    process.exit(1);
}
