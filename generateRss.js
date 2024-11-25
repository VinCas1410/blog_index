const fs = require('fs');
const path = require('path');
const { marked } = require('marked');  // Updated import for v3+
const frontMatter = require('front-matter');
const xml2js = require('xml2js');

// Configuration from config.json
const config = require('./config.json');
const postsDirectory = config.postsDirectory; // Folder where markdown files are stored
const outputDirectory = config.outputDirectory || 'xml'; // Folder to save XML
const siteMetadata = config.site;

// Generate lastBuildDate once and use it consistently
const lastBuildDate = new Date().toUTCString();

// Function to read Markdown files from the 'posts' directory and generate RSS
async function generateRss() {
    const posts = [];
    const files = fs.readdirSync(postsDirectory).filter(file => file.endsWith('.md'));

    for (const file of files) {
        const filePath = path.join(postsDirectory, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        const { attributes, body } = frontMatter(fileContent);
        const htmlContent = marked(body);  // Convert Markdown body to HTML

        posts.push({
            title: attributes.title,
            date: attributes.date || lastBuildDate, // Use consistent lastBuildDate as default
            content: htmlContent,
            link: `${siteMetadata.link}/${file}`,
            guid: `${siteMetadata.link}/${file}`,
        });
    }

    // Generate RSS feed XML
    const rssXml = generateXml(posts);
    saveRss(rssXml);
}

// Function to create RSS feed XML using xml2js
function generateXml(posts) {
    const rss = {
        rss: {
            $: {
                xmlns: 'http://www.w3.org/2005/Atom',  // RSS namespace
                version: '2.0',
                'xmlns:atom': 'http://www.w3.org/2005/Atom', // Atom namespace declaration
            },
            channel: [
                {
                    title: siteMetadata.title,
                    link: siteMetadata.link,
                    description: siteMetadata.description,
                    generator: siteMetadata.generator,
                    language: siteMetadata.language,
                    lastBuildDate: lastBuildDate, // Use the consistent lastBuildDate
                    // Ensure the atom:link uses the correct namespace prefix
                    'atom:link': {
                        $: {
                            href: siteMetadata.rssLink,
                            rel: 'self',
                            type: 'application/rss+xml',
                        },
                    },
                    item: posts.map(post => ({
                        title: post.title,
                        link: post.link,
                        description: post.content,
                        pubDate: post.date,
                        guid: post.guid,
                    })),
                },
            ],
        },
    };

    // Manually adjust the namespace to add "atom" prefix to the link tag
    const builder = new xml2js.Builder({
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' }
    });

    // Explicitly convert the atom:link to the desired format
    let xml = builder.buildObject(rss);

    // Replace 'atom:link' with the correct namespace prefix
    xml = xml.replace('<atom:link', '<link xmlns:atom="http://www.w3.org/2005/Atom"');

    return xml;
}



// Save the generated RSS XML to the output directory
function saveRss(xml) {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
        console.log(`Created directory: ${outputDirectory}`);
    }

    const outputPath = path.join(outputDirectory, 'index.xml');
    
    // Write XML to the file
    fs.writeFileSync(outputPath, xml);
    console.log('RSS feed generated at', outputPath);
}

// Run the RSS generation
generateRss().catch(err => {
    console.error('Error generating RSS:', err);
});
