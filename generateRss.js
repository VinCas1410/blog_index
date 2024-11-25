const fs = require('fs');
const path = require('path');
const https = require('https');
const { marked } = require('marked'); // Updated import for v3+
const frontMatter = require('front-matter');
const xml2js = require('xml2js');

// Configuration from config.json
const config = require('./config.json');
const postsDirectory = config.postsDirectory; // Folder where markdown files are stored
const outputDirectory = config.outputDirectory || 'xml'; // Folder to save XML
const siteMetadata = config.site;

// Utility to escape special characters in XML
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, c => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
    }[c]));
}

// Function to fetch existing XML metadata dynamically from GitHub Pages
async function fetchExistingMetadata() {
    return new Promise((resolve, reject) => {
        https.get(siteMetadata.rssLink, (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                xml2js.parseString(data, (err, result) => {
                    if (err) return reject(err);

                    try {
                        const channel = result.rss.channel[0];
                        const title = channel.title[0];
                        const lastBuildDate = channel.lastBuildDate[0];
                        resolve({ title, lastBuildDate });
                    } catch (err) {
                        reject(new Error("Failed to parse existing RSS metadata."));
                    }
                });
            });
        }).on('error', reject);
    });
}

// Function to read Markdown files from the 'posts' directory and generate RSS
async function generateRss() {
    const posts = [];
    const files = fs.readdirSync(postsDirectory).filter(file => file.endsWith('.md'));

    for (const file of files) {
        const filePath = path.join(postsDirectory, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        const { attributes, body } = frontMatter(fileContent);
        const htmlContent = marked(body); // Convert Markdown body to HTML

        posts.push({
            title: escapeXml(attributes.title || 'Untitled Post'),
            date: attributes.date || new Date().toUTCString(),
            content: escapeXml(htmlContent),
            link: `${siteMetadata.link}/${file}`,
            guid: `${siteMetadata.link}/${file}`,
        });
    }

    // Fetch metadata from the existing RSS feed
    let title = siteMetadata.title;
    let lastBuildDate = new Date().toUTCString(); // Default to now if fetching fails
    try {
        const fetchedMetadata = await fetchExistingMetadata();
        title = fetchedMetadata.title;
        lastBuildDate = fetchedMetadata.lastBuildDate;
    } catch (err) {
        console.error('Failed to fetch existing metadata:', err);
    }

    siteMetadata.title = title; // Update with fetched title
    siteMetadata.lastBuildDate = lastBuildDate; // Use the actual lastBuildDate

    // Generate RSS feed XML
    const rssXml = generateXml(posts);
    saveRss(rssXml);
}

// Function to create RSS feed XML using xml2js
function generateXml(posts) {
    const rss = {
        rss: {
            $: {
                xmlns: 'http://www.w3.org/2005/Atom',
                version: '2.0',
            },
            channel: [
                {
                    title: siteMetadata.title,
                    link: siteMetadata.link,
                    description: siteMetadata.description,
                    generator: siteMetadata.generator,
                    language: siteMetadata.language,
                    lastBuildDate: siteMetadata.lastBuildDate,
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
                        description: `<![CDATA[${post.content}]]>`,
                        pubDate: post.date,
                        guid: post.guid,
                    })),
                },
            ],
        },
    };

    // Convert JavaScript object to XML
    const builder = new xml2js.Builder({ headless: true }); // No XML declaration for simplicity
    return builder.buildObject(rss);
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
