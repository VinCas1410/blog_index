const fs = require('fs');
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');
const xml2js = require('xml2js');

// Configuration from config.json
const config = require('./config.json');
const postsDirectory = config.postsDirectory; // Folder where markdown files are stored
const outputDirectory = config.outputDirectory || 'xml'; // Folder to save XML
const siteMetadata = config.site;

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
            date: attributes.date || new Date().toUTCString(),
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
                        description: post.content,
                        pubDate: post.date,
                        guid: post.guid,
                    })),
                },
            ],
        },
    };

    // Convert JavaScript object to XML
    const builder = new xml2js.Builder();
    return builder.buildObject(rss);
}

// Save the generated RSS XML to the output directory
function saveRss(xml) {
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    const outputPath = path.join(outputDirectory, 'index.xml');
    fs.writeFileSync(outputPath, xml);
    console.log('RSS feed generated at', outputPath);
}

// Run the RSS generation
generateRss().catch(err => {
    console.error('Error generating RSS:', err);
});