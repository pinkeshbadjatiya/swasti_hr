// --- STATE & TABS ---
let dbLoaded = false;
let patientsList = [];
let globalDiseaseTags = [];
let globalTreatmentTags = [];

let currentPage = 1;
const ITEMS_PER_PAGE = 12;

document.addEventListener("DOMContentLoaded", fetchTags);

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    clearWorkspace();
    
    if(tabName === 'upload') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('uploadTab').classList.add('active');
    } else if(tabName === 'database') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('databaseTab').classList.add('active');
        if(!dbLoaded) fetchDatabase();
    } else if(tabName === 'gallery') {
        document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
        document.getElementById('galleryTab').classList.add('active');
        if(!dbLoaded) fetchDatabase().then(renderGallery);
        else renderGallery();
    }
}

function clearWorkspace() {
    beforeSrc = null; afterSrc = null;
    document.getElementById('beforeInput').value = ''; document.getElementById('afterInput').value = '';
    document.getElementById('beforePreview').style.display = 'none'; document.getElementById('afterPreview').style.display = 'none';
    document.getElementById('beforePreview').src = ''; document.getElementById('afterPreview').src = '';
    document.getElementById('patientSelect').value = ''; document.getElementById('patientMeta').style.display = 'none';
    
    document.getElementById('var1').style.display = 'none';
    document.getElementById('var2').style.display = 'none';
    document.getElementById('var3').style.display = 'none';
    document.getElementById('saveContainer').style.display = 'none';

    ['beforeImg1', 'afterImg1', 'beforeImg2', 'afterImg2', 'beforeImg3', 'afterImg3'].forEach(id => {
        document.getElementById(id).src = '';
        document.getElementById(id).style.filter = 'none'; 
    });

    document.getElementById('brightnessSlider').value = 100; document.getElementById('contrastSlider').value = 100;
    document.getElementById('brightVal').innerText = 100; document.getElementById('contrastVal').innerText = 100;
    document.getElementById('wipeSlider').value = 50; document.getElementById('sliderLine').style.left = '50%';
    document.getElementById('beforeImg3').style.clipPath = 'inset(0 50% 0 0)';
}

// --- DYNAMIC TAGS LOGIC ---
async function fetchTags() {
    try {
        const res = await fetch('/api/tags');
        if(res.ok) {
            const data = await res.json();
            globalDiseaseTags = data.diseaseTags || [];
            globalTreatmentTags = data.treatmentTags || [];
            populateDatalist('diseaseList', globalDiseaseTags);
            populateDatalist('treatmentList', globalTreatmentTags);
        }
    } catch(e) { console.error("Could not load tags", e); }
}

function populateDatalist(id, array) {
    const dl = document.getElementById(id);
    dl.innerHTML = '';
    array.forEach(tag => dl.innerHTML += `<option value="${tag}"></option>`);
}

// --- DATABASE & GALLERY LOGIC ---
async function fetchDatabase() {
    const select = document.getElementById('patientSelect');
    select.innerHTML = '<option value="">Loading...</option>';
    try {
        const res = await fetch('/api/database');
        if(!res.ok) throw new Error("Failed to load");
        let rawList = await res.json();
        
        // Map and Sort (Newest First based on timestamp in folder name)
        patientsList = rawList.map(p => {
            const parts = p.id.split('-');
            const timestamp = parseInt(parts[0]);
            let name = parts.slice(1).join(' ');
            if(!name) name = "Unknown";
            const dateStr = new Date(timestamp).toLocaleDateString();
            return { ...p, rawName: name, displayName: `${name.toUpperCase()} (${dateStr})`, timestamp };
        }).sort((a, b) => b.timestamp - a.timestamp); // Sort Descending
        
        select.innerHTML = '<option value="">-- Select Patient --</option>';
        patientsList.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.displayName}</option>`;
        });
        dbLoaded = true;
    } catch (e) {
        select.innerHTML = '<option value="">Error loading patients</option>';
    }
}

async function loadPatient(folderId) {
    if(!folderId) { clearWorkspace(); return; }
    const patient = patientsList.find(p => p.id === folderId);
    if(!patient) return;

    try {
        const metaRes = await fetch(patient.metadataUrl);
        const meta = await metaRes.json();
        document.getElementById('patientMeta').style.display = 'block';
        document.getElementById('metaDetails').innerHTML = `
            <strong>Name:</strong> ${meta.patientName}<br>
            <strong>Diseases:</strong> ${meta.diseaseTags.join(', ') || 'N/A'}<br>
            <strong>Treatments:</strong> ${meta.treatmentTags.join(', ') || 'N/A'}<br>
            <strong>Date:</strong> ${new Date(meta.dateSaved).toLocaleDateString()}
        `;
    } catch(e) {}
    setImages(patient.beforeUrl, patient.afterUrl);
}

function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '';
    
    if(patientsList.length === 0) {
        grid.innerHTML = '<p style="color: #666;">No patients saved yet.</p>';
        return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = patientsList.slice(start, end);

    pageItems.forEach(p => {
        // We use the combined URL to display in the gallery
        const combinedUrl = p.beforeUrl.replace('before.jpg', 'combined.jpg');
        grid.innerHTML += `
            <div class="gallery-card">
                <img src="${combinedUrl}" alt="${p.rawName}" crossorigin="anonymous" onclick="switchTab('database'); document.getElementById('patientSelect').value='${p.id}'; loadPatient('${p.id}');">
                <h4>${p.rawName.toUpperCase()}</h4>
                <p>${new Date(p.timestamp).toLocaleDateString()}</p>
            </div>
        `;
    });

    document.getElementById('pageIndicator').innerText = `Page ${currentPage} of ${Math.ceil(patientsList.length / ITEMS_PER_PAGE)}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = end >= patientsList.length;
}

function changePage(dir) {
    currentPage += dir;
    renderGallery();
}

// --- TAGS UI LOGIC ---
let selectedDiseases = []; let selectedTreatments = [];

function setupTagInput(inputId, containerId, arrayName) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    const addTag = (val) => {
        val = val.trim().replace(',', '');
        if (val && !arrayName.includes(val)) {
            arrayName.push(val);
            renderTags(container, input, arrayName);
        }
        input.value = '';
    };

    input.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input.value); } });
    input.addEventListener('change', e => addTag(input.value));
}

function renderTags(container, input, array) {
    container.querySelectorAll('.tag-pill').forEach(el => el.remove());
    array.forEach(tag => {
        const pill = document.createElement('div'); pill.className = 'tag-pill';
        pill.innerHTML = `${tag} <span onclick="removeTag('${tag}', this)">✕</span>`;
        container.insertBefore(pill, input);
    });
}

function removeTag(tag, element) {
    const containerId = element.parentElement.parentElement.id;
    if(containerId === 'diseaseTagContainer') selectedDiseases = selectedDiseases.filter(t => t !== tag);
    else selectedTreatments = selectedTreatments.filter(t => t !== tag);
    element.parentElement.remove();
}

setupTagInput('diseaseTagInput', 'diseaseTagContainer', selectedDiseases);
setupTagInput('treatmentTagInput', 'treatmentTagContainer', selectedTreatments);

// --- IMAGE HANDLING & VIEWER ---
const beforeInput = document.getElementById('beforeInput');
const afterInput = document.getElementById('afterInput');
let beforeSrc = null; let afterSrc = null;

function handleImageUpload(event, type) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const src = e.target.result;
            if (type === 'before') {
                document.getElementById('beforePreview').src = src; document.getElementById('beforePreview').style.display = 'block'; beforeSrc = src;
            } else {
                document.getElementById('afterPreview').src = src; document.getElementById('afterPreview').style.display = 'block'; afterSrc = src;
            }
            if(beforeSrc && afterSrc) setImages(beforeSrc, afterSrc);
        }
        reader.readAsDataURL(file);
    }
}

beforeInput.addEventListener('change', (e) => handleImageUpload(e, 'before'));
afterInput.addEventListener('change', (e) => handleImageUpload(e, 'after'));

function setImages(bSrc, aSrc) {
    beforeSrc = bSrc; afterSrc = aSrc;
    ['beforeImg1', 'beforeImg2', 'beforeImg3'].forEach(id => document.getElementById(id).src = bSrc);
    ['afterImg1', 'afterImg2', 'afterImg3'].forEach(id => document.getElementById(id).src = aSrc);
    
    const isUploadTab = document.getElementById('uploadTab').classList.contains('active');
    
    document.getElementById('var1').style.display = 'block';
    document.getElementById('var3').style.display = 'block';

    if(isUploadTab) {
        document.getElementById('var2').style.display = 'block';
        document.getElementById('saveContainer').style.display = 'block';
        setTimeout(autoAdjustLighting, 200); 
    } else {
        document.getElementById('var2').style.display = 'none';
        document.getElementById('saveContainer').style.display = 'none';
    }
}

function getImageStats(imgEl) {
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    canvas.width = 100; canvas.height = 100; 
    try {
        ctx.drawImage(imgEl, 0, 0, 100, 100);
        const imgData = ctx.getImageData(0, 0, 100, 100).data;
        let totalLuma = 0;
        for (let i = 0; i < imgData.length; i += 4) totalLuma += (0.299*imgData[i]) + (0.587*imgData[i+1]) + (0.114*imgData[i+2]);
        return { avgLuminance: totalLuma / 10000 };
    } catch(e) { return {avgLuminance: 128}; } 
}

function autoAdjustLighting() {
    const imgB = document.getElementById('beforeImg2'); const imgA = document.getElementById('afterImg2');
    if(!imgB.complete || !imgA.complete) return;
    const ratio = (getImageStats(imgB).avgLuminance / getImageStats(imgA).avgLuminance) * 100;
    document.getElementById('brightnessSlider').value = Math.max(50, Math.min(150, ratio));
    updateLighting();
}

function updateLighting() {
    const b = document.getElementById('brightnessSlider').value;
    const c = document.getElementById('contrastSlider').value;
    document.getElementById('brightVal').innerText = Math.round(b);
    document.getElementById('contrastVal').innerText = Math.round(c);
    document.getElementById('afterImg2').style.filter = `brightness(${b}%) contrast(${c}%)`;
    document.getElementById('afterImg3').style.filter = `brightness(${b}%) contrast(${c}%)`;
}

document.getElementById('brightnessSlider').addEventListener('input', updateLighting);
document.getElementById('contrastSlider').addEventListener('input', updateLighting);
document.getElementById('wipeSlider').addEventListener('input', (e) => {
    document.getElementById('beforeImg3').style.clipPath = `inset(0 ${100 - e.target.value}% 0 0)`;
    document.getElementById('sliderLine').style.left = `${e.target.value}%`;
});

// --- SAVE & LABEL CANVAS LOGIC ---
function openSaveModal() { document.getElementById('saveModal').style.display = 'flex'; }
function closeSaveModal() { document.getElementById('saveModal').style.display = 'none'; }

// Helper: Adds a white bar BELOW the image and writes text
function addLabelToImage(base64Src, text, filterStr = 'none') {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            const labelHeight = Math.max(60, img.naturalHeight * 0.08); // Scale label bar
            canvas.height = img.naturalHeight + labelHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff'; // White background for label
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.filter = filterStr;
            ctx.drawImage(img, 0, 0);
            ctx.filter = 'none'; // Reset filter so text stays crisp
            
            ctx.fillStyle = '#333333';
            ctx.font = `bold ${labelHeight * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, img.naturalHeight + (labelHeight / 2));
            
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = base64Src;
    });
}

async function submitToGitHub() {
    const btn = document.getElementById('submitBtn');
    btn.innerText = "Saving..."; btn.disabled = true;

    try {
        const name = document.getElementById('patientName').value || 'Anonymous';
        
        // 1. Process New Tags
        const mergedDiseases = [...new Set([...globalDiseaseTags, ...selectedDiseases])];
        const mergedTreatments = [...new Set([...globalTreatmentTags, ...selectedTreatments])];

        const metadata = { patientName: name, diseaseTags: selectedDiseases, treatmentTags: selectedTreatments, dateSaved: new Date().toISOString() };

        // 2. Generate Individual Labelled Images
        const filterApplied = `brightness(${document.getElementById('brightnessSlider').value}%) contrast(${document.getElementById('contrastSlider').value}%)`;
        const labeledBeforeBase64 = await addLabelToImage(beforeSrc, "BEFORE");
        const labeledAfterBase64 = await addLabelToImage(afterSrc, "AFTER", filterApplied);

        // 3. Generate Combined Image (with labels below)
        const canvas = document.createElement('canvas');
        canvas.width = 1600; canvas.height = 860; // Extra 60px for the text bar at bottom
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,1600,860);
        
        ctx.drawImage(document.getElementById('beforeImg1'), 0, 0, 800, 800);
        ctx.filter = filterApplied;
        ctx.drawImage(document.getElementById('afterImg1'), 800, 0, 800, 800);
        
        ctx.filter = 'none';
        ctx.fillStyle = '#333'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText("BEFORE", 400, 830);
        ctx.fillText("AFTER", 1200, 830);

        // 4. Send all files and merged tags to backend
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientName: name,
                metadataBase64: btoa(JSON.stringify(metadata, null, 2)),
                beforeBase64: labeledBeforeBase64,
                afterBase64: labeledAfterBase64,
                combinedBase64: canvas.toDataURL('image/jpeg', 0.8),
                updatedDiseasesBase64: btoa(JSON.stringify(mergedDiseases, null, 2)),
                updatedTreatmentsBase64: btoa(JSON.stringify(mergedTreatments, null, 2))
            })
        });

        if (response.ok) {
            alert("Successfully saved to Database!");
            closeSaveModal();
            document.getElementById('patientName').value = '';
            
            selectedDiseases = []; selectedTreatments = [];
            document.getElementById('diseaseTagContainer').querySelectorAll('.tag-pill').forEach(el => el.remove());
            document.getElementById('treatmentTagContainer').querySelectorAll('.tag-pill').forEach(el => el.remove());

            // Refresh tags locally to avoid fetching again immediately
            globalDiseaseTags = mergedDiseases;
            globalTreatmentTags = mergedTreatments;
            populateDatalist('diseaseList', globalDiseaseTags);
            populateDatalist('treatmentList', globalTreatmentTags);

            dbLoaded = false; 
            switchTab('gallery'); 
        } else { throw new Error(await response.text()); }
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.innerText = "Commit & Save"; btn.disabled = false;
    }
}
