const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');
const xml2js = require('xml2js');

const config = require('./config.json');
const postsDirectory = config.postsDirectory;
const outputDirectory = config.outputDirectory || 'xml';
const siteMetadata = config.site;

const lastBuildDate = new Date().toUTCString();

async function generateRss() {
    const posts = [];
    const files = fs.readdirSync(postsDirectory).filter(file => file.endsWith('.md'));

    for (const file of files) {
        const filePath = path.join(postsDirectory, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        const { attributes, body } = frontMatter(fileContent);
        const htmlContent = marked(body);

        const postDate = attributes.date ? new Date(attributes.date).toUTCString() : lastBuildDate;

        posts.push({
            title: attributes.title,
            date: postDate,
            content: htmlContent,
            link: `${siteMetadata.link}/${file}`,
            guid: `${siteMetadata.link}/${file}`,
        });
    }

    const rssXml = generateXml(posts);
    saveRss(rssXml);
}

function generateXml(posts) {
    const rss = {
        rss: {
            $: {
                'xmlns:atom': 'http://www.w3.org/2005/Atom',
                version: '2.0',
            },
            channel: [
                {
                    title: siteMetadata.title,
                    link: siteMetadata.link,
                    description: siteMetadata.description,
                    generator: siteMetadata.generator,
                    language: siteMetadata.language,
                    lastBuildDate: lastBuildDate,
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

    const builder = new xml2js.Builder();
    return builder.buildObject(rss);
}

function saveRss(xml) {
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
        console.log(`Created directory: ${outputDirectory}`);
    }

    const outputPath = path.join(outputDirectory, 'index.xml');
    
    fs.writeFileSync(outputPath, xml);
    console.log('RSS feed generated at', outputPath);
}

generateRss().catch(err => {
    console.error('Error generating RSS:', err);
});
