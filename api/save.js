// File: api/save.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Notice we are accepting URLs now, not massive Base64 strings
    const { patientName, metadataBase64, beforeImgUrl, afterImgUrl, combinedImgUrl, updatedDiseasesBase64, updatedTreatmentsBase64 } = req.body;
    
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
    const REPO = 'pinkeshbadjatiya/swasti_hr'; // UPDATE THIS

    const slug = patientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const folderName = `${Date.now()}-${slug}`;
    const basePath = `data/before-and-after/${folderName}`;

    // Helper: Fetch image from URL and convert to Base64 for GitHub
    async function fetchImageAsBase64(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download image from ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    }

    // Helper: Save to GitHub
    async function updateGitHubFile(path, contentBase64, message) {
        let sha = null;
        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }

        // Clean the base64 string just in case
        const cleanContent = contentBase64.split(',')[1] || contentBase64; 
        const body = { message, content: cleanContent };
        if (sha) body.sha = sha;

        const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!putRes.ok) throw new Error(`Failed to save ${path}: ${putRes.statusText}`);
    }

    try {
        // 1. Download images from ImgBB
        const beforeBase64 = await fetchImageAsBase64(beforeImgUrl);
        const afterBase64 = await fetchImageAsBase64(afterImgUrl);
        const combinedBase64 = await fetchImageAsBase64(combinedImgUrl);

        // 2. Save Patient Images & Meta to GitHub
        await updateGitHubFile(`${basePath}/metadata.json`, metadataBase64, `Add metadata for ${patientName}`);
        await updateGitHubFile(`${basePath}/before.jpg`, beforeBase64, `Add before image for ${patientName}`);
        await updateGitHubFile(`${basePath}/after.jpg`, afterBase64, `Add after image for ${patientName}`);
        await updateGitHubFile(`${basePath}/combined.jpg`, combinedBase64, `Add combined image for ${patientName}`);

        // 3. Update Global Tag Repositories
        await updateGitHubFile(`resources/disease-tags.json`, updatedDiseasesBase64, `Update aggregate disease tags`);
        await updateGitHubFile(`resources/treatment-tags.json`, updatedTreatmentsBase64, `Update aggregate treatment tags`);

        res.status(200).json({ success: true, message: "Saved successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
