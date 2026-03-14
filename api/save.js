// File: api/save.js

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { patientName, metadataBase64, beforeBase64, afterBase64, combinedBase64 } = req.body;
    
    // Pull the token from your secure environment variables
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
    const REPO = 'pinkeshbadjatiya/SwastiHR'; // Hardcode your repo here

    const slug = patientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const folderName = `${Date.now()}-${slug}`;
    const basePath = `data/before-and-after/${folderName}`;

    // Helper function to push to GitHub
    async function uploadToGitHub(path, content, message) {
        const cleanContent = content.split(',')[1] || content; 
        const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, content: cleanContent })
        });
        if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    try {
        // Upload all files sequentially
        await uploadToGitHub(`${basePath}/metadata.json`, metadataBase64, `Add metadata for ${patientName}`);
        await uploadToGitHub(`${basePath}/before.jpg`, beforeBase64, `Add before image for ${patientName}`);
        await uploadToGitHub(`${basePath}/after.jpg`, afterBase64, `Add after image for ${patientName}`);
        await uploadToGitHub(`${basePath}/combined.jpg`, combinedBase64, `Add combined image for ${patientName}`);

        res.status(200).json({ success: true, message: "Saved successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
