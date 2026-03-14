export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = 'pinkeshbadjatiya/swasti_hr'; // CHANGE THIS TO YOUR REPO
    const BRANCH = 'main'; // or 'master' depending on your repo

    try {
        // Fetch the contents of the directory
        const response = await fetch(`https://api.github.com/repos/${REPO}/contents/data/before-and-after`, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) return res.status(200).json([]); // Folder doesn't exist yet
            throw new Error(`GitHub API Error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Filter only directories (patient folders)
        const patients = data
            .filter(item => item.type === 'dir')
            .map(item => ({
                id: item.name,
                // Construct secure raw URLs so the frontend can load the images
                metadataUrl: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${item.path}/metadata.json`,
                beforeUrl: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${item.path}/before.jpg`,
                afterUrl: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${item.path}/after.jpg`
            }));

        res.status(200).json(patients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
