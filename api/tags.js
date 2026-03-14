// File: api/tags.js
export default async function handler(req, res) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = 'pinkeshbadjatiya/swasti_hr'; // UPDATE THIS
    const BRANCH = 'main'; // or 'master'

    const fetchTags = async (filename) => {
        const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/resources/${filename}.json`;
        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }});
            if (response.ok) return await response.json();
        } catch(e) { console.error(e); }
        return []; // Return empty if file doesn't exist yet
    };

    const diseaseTags = await fetchTags('disease-tags');
    const treatmentTags = await fetchTags('treatment-tags');

    res.status(200).json({ diseaseTags, treatmentTags });
}
