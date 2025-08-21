const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const BOOKS_DIR = './books';
const COVERS_DIR = './covers';
const OUTPUT_DIR = './epub_books';

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function convertToEpub(inputFilePath, coverImagePath = null) {
  const fileExtension = path.extname(inputFilePath).toLowerCase();
  const fileName = path.basename(inputFilePath, fileExtension);
  const outputPath = path.join(OUTPUT_DIR, `${fileName}.epub`);
  
  console.log(`📖 Converting: ${fileName} (${fileExtension.substring(1).toUpperCase()})`);
  
  // Build calibre command with correct and available options only
  let command = `ebook-convert "${inputFilePath}" "${outputPath}"`;
  
  // Input encoding
  command += ' --input-encoding=utf-8';

  // Common options for both formats
  command += ' --preserve-cover-aspect-ratio';
  command += ' --insert-blank-line';
  command += ' --toc-title="সূচিপত্র"'; // TOC title in Bengali
  command += ' --epub-inline-toc';
  
  // Format-specific options
  if (fileExtension === '.txt') {
    // TXT-specific options
    //command += ' --disable-markup-chapter-headings';
    
    // Chapter detection using XPath for h1 and h2 tags
    command += ' --chapter="//*[name()=\'h1\' or name()=\'h2\']"';
    command += ' --chapter-mark="pagebreak"';
    
    // Table of Contents structure
    command += ' --level1-toc="//*[name()=\'h1\']"';
    command += ' --level2-toc="//*[name()=\'h2\']"';
    
    // Search and replace to convert heading markers to HTML tags
    command += ' --sr1-search="<p>heading1 = (.+?)</p>"';
    command += ' --sr1-replace="<h1>\\1</h1>"';
    command += ' --sr2-search="<p>heading2 = (.+?)</p>"';
    command += ' --sr2-replace="<h2>\\1</h2>"';
    
  } else if (fileExtension === '.html') {
    // HTML-specific options
    command += ' --chapter="//*[name()=\'h1\' or name()=\'h2\' or name()=\'h3\']"';
    command += ' --chapter-mark="pagebreak"';
    
    // Table of Contents structure for HTML
    command += ' --level1-toc="//*[name()=\'h1\']"';
    command += ' --level2-toc="//*[name()=\'h2\']"';
    command += ' --level3-toc="//*[name()=\'h3\']"';
    
    // Enable heuristics for better HTML processing
    //command += ' --enable-heuristics';
    
    // Remove JavaScript and forms that might not work in EPUB
    command += ' --filter-css="script,form,input,textarea,select,button"';
  }
  
  // Add cover image if available
  if (coverImagePath && fs.existsSync(coverImagePath)) {
    command += ` --cover="${coverImagePath}"`;
    console.log(`🖼️ Using cover image: ${path.basename(coverImagePath)}`);
  }
  
  try {
    console.log(`🔄 Running conversion...`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.error(`⚠️ Stderr output:`, stderr);
    }
    
    // Check if the file was created successfully
    if (fs.existsSync(outputPath)) {
      console.log(`✅ Successfully converted: ${fileName}.epub`);
      return true;
    } else {
      console.error(`❌ Output file was not created: ${fileName}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Failed to convert ${fileName}:`, error.message);
    return false;
  }
}

async function testCalibreCommand() {
  try {
    // Test with a simple command first
    const { stdout } = await execAsync('ebook-convert --version');
    console.log(`✅ Calibre version: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.error('❌ Calibre test failed:', error.message);
    return false;
  }
}

async function convertAllBooks() {
  console.log('🚀 Starting EPUB conversion process...\n');
  
  // Check if Calibre is installed and working
  if (!(await testCalibreCommand())) {
    console.error('❌ Calibre is not installed or not working properly.');
    console.log('📥 Download from: https://calibre-ebook.com/download');
    return;
  }
  
  // Get all text and HTML files
  if (!fs.existsSync(BOOKS_DIR)) {
    console.error(`❌ Books directory not found: ${BOOKS_DIR}`);
    return;
  }
  
  const bookFiles = fs.readdirSync(BOOKS_DIR)
    .filter(file => file.endsWith('.txt') || file.endsWith('.html') || file.endsWith('.htm'))
    .map(file => path.join(BOOKS_DIR, file));
  
  if (bookFiles.length === 0) {
    console.log('📭 No text or HTML files found to convert.');
    return;
  }
  
  // Group files by type for summary
  const txtFiles = bookFiles.filter(file => file.endsWith('.txt'));
  const htmlFiles = bookFiles.filter(file => file.endsWith('.html') || file.endsWith('.htm'));
  
  console.log(`📚 Found ${bookFiles.length} book(s) to convert:`);
  if (txtFiles.length > 0) console.log(`   📄 ${txtFiles.length} TXT file(s)`);
  if (htmlFiles.length > 0) console.log(`   🌐 ${htmlFiles.length} HTML file(s)`);
  console.log('');
  
  let successCount = 0;
  let failCount = 0;
  
  // Process each book
  for (const bookFile of bookFiles) {
    const fileExtension = path.extname(bookFile);
    const bookName = path.basename(bookFile, fileExtension);
    
    // Look for corresponding cover image
    let coverImage = null;
    const possibleCoverExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    
    // Create possible cover name variations
    const coverNameVariations = [
      bookName,                           // Exact match
      bookName.replace(/ /g, '_'),        // Spaces to underscores
      bookName.replace(/_/g, ' ')         // Underscores to spaces
    ];
    
    for (const coverName of coverNameVariations) {
      for (const ext of possibleCoverExtensions) {
        const coverPath = path.join(COVERS_DIR, coverName + ext);
        if (fs.existsSync(coverPath)) {
          coverImage = coverPath;
          break;
        }
      }
      if (coverImage) break; // Exit outer loop if found
    }
    
    const success = await convertToEpub(bookFile, coverImage);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    console.log(''); // Add spacing between books
  }
  
  // Summary
  console.log('📊 Conversion Summary:');
  console.log(`✅ Successfully converted: ${successCount} book(s)`);
  console.log(`❌ Failed conversions: ${failCount} book(s)`);
  console.log(`📂 Output directory: ${OUTPUT_DIR}\n`);
  
  if (successCount > 0) {
    console.log('🎉 EPUB conversion completed!');
    console.log(`📖 Your EPUB files are ready in the "${OUTPUT_DIR}" folder.`);
  }
}

// Run the conversion
convertAllBooks().catch(console.error);