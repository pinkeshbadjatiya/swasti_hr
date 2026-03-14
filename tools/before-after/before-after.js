// --- TABS & STATE LOGIC ---
let dbLoaded = false;
let patientsList = [];

function switchTab(tabName) {
    // 1. Update active tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 2. CLEAR THE WORKSPACE (Fixes the overlapping data issue)
    clearWorkspace();
    
    // 3. Show requested tab
    if(tabName === 'upload') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('uploadTab').classList.add('active');
    } else {
        document.getElementById('dbTabBtn').classList.add('active');
        document.getElementById('databaseTab').classList.add('active');
        if(!dbLoaded) fetchDatabase();
    }
}

// Reset everything to default state
function clearWorkspace() {
    beforeSrc = null;
    afterSrc = null;

    // Reset File Inputs & Previews
    document.getElementById('beforeInput').value = '';
    document.getElementById('afterInput').value = '';
    document.getElementById('beforePreview').style.display = 'none';
    document.getElementById('afterPreview').style.display = 'none';
    document.getElementById('beforePreview').src = '';
    document.getElementById('afterPreview').src = '';

    // Reset Database Dropdown & Metadata
    document.getElementById('patientSelect').value = '';
    document.getElementById('patientMeta').style.display = 'none';
    document.getElementById('metaDetails').innerHTML = '';

    // Hide Viewer Sections & Save Button
    document.getElementById('var1').style.display = 'none';
    document.getElementById('var2').style.display = 'none';
    document.getElementById('var3').style.display = 'none';
    document.getElementById('saveContainer').style.display = 'none';

    // Clear Viewer Images & CSS Filters
    const viewerImages = ['beforeImg1', 'afterImg1', 'beforeImg2', 'afterImg2', 'beforeImg3', 'afterImg3'];
    viewerImages.forEach(id => {
        const img = document.getElementById(id);
        img.src = '';
        img.style.filter = 'none'; 
    });

    // Reset Sliders
    document.getElementById('brightnessSlider').value = 100;
    document.getElementById('contrastSlider').value = 100;
    document.getElementById('brightVal').innerText = 100;
    document.getElementById('contrastVal').innerText = 100;
    document.getElementById('wipeSlider').value = 50;
    document.getElementById('sliderLine').style.left = '50%';
    document.getElementById('beforeImg3').style.clipPath = 'inset(0 50% 0 0)';
}

// --- DATABASE LOGIC ---
async function fetchDatabase() {
    const select = document.getElementById('patientSelect');
    select.innerHTML = '<option value="">Loading...</option>';
    try {
        const res = await fetch('/api/database');
        if(!res.ok) throw new Error("Failed to load database");
        patientsList = await res.json();
        
        select.innerHTML = '<option value="">-- Select Patient --</option>';
        patientsList.forEach(p => {
            let name = p.id.split('-').slice(1).join(' ');
            if(!name) name = p.id;
            select.innerHTML += `<option value="${p.id}">${name.toUpperCase()}</option>`;
        });
        dbLoaded = true;
    } catch (e) {
        console.error(e);
        select.innerHTML = '<option value="">Error loading patients</option>';
    }
}

async function loadPatient(folderId) {
    if(!folderId) {
        clearWorkspace(); // Clear if they select the empty "-- Select Patient --" option
        return;
    }
    const patient = patientsList.find(p => p.id === folderId);
    if(!patient) return;

    // Load Metadata to show tags
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
    } catch(e) { console.log("No metadata found"); }

    setImages(patient.beforeUrl, patient.afterUrl);
}

// --- TAGS LOGIC ---
let selectedDiseases = [];
let selectedTreatments = [];

function setupTagInput(inputId, containerId, arrayName) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = this.value.trim().replace(',', '');
            if (val && !arrayName.includes(val)) {
                arrayName.push(val);
                renderTags(container, input, arrayName);
            }
            this.value = '';
        }
    });
    input.addEventListener('change', function(e) {
        const val = this.value.trim();
        if(val && !arrayName.includes(val)) {
            arrayName.push(val);
            renderTags(container, input, arrayName);
            this.value = '';
        }
    });
}

function renderTags(container, input, array) {
    container.querySelectorAll('.tag-pill').forEach(el => el.remove());
    array.forEach(tag => {
        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        pill.innerHTML = `${tag} <span onclick="removeTag('${tag}', this)">✕</span>`;
        container.insertBefore(pill, input);
    });
}

function removeTag(tag, element) {
    const containerId = element.parentElement.parentElement.id;
    if(containerId === 'diseaseTagContainer') {
        selectedDiseases = selectedDiseases.filter(t => t !== tag);
    } else {
        selectedTreatments = selectedTreatments.filter(t => t !== tag);
    }
    element.parentElement.remove();
}

setupTagInput('diseaseTagInput', 'diseaseTagContainer', selectedDiseases);
setupTagInput('treatmentTagInput', 'treatmentTagContainer', selectedTreatments);

// --- IMAGE HANDLING LOGIC ---
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
                document.getElementById('beforePreview').src = src;
                document.getElementById('beforePreview').style.display = 'block';
                beforeSrc = src;
            } else {
                document.getElementById('afterPreview').src = src;
                document.getElementById('afterPreview').style.display = 'block';
                afterSrc = src;
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
    
    document.getElementById('var1').style.display = 'block';
    document.getElementById('var2').style.display = 'block';
    document.getElementById('var3').style.display = 'block';
    
    if(document.getElementById('uploadTab').classList.contains('active')) {
        document.getElementById('saveContainer').style.display = 'block';
    }

    setTimeout(autoAdjustLighting, 200); 
}

// --- VIEWER CONTROLS ---
function getImageStats(imgEl) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 100; canvas.height = 100; 
    try {
        ctx.drawImage(imgEl, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100).data;
        let totalLuminance = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            totalLuminance += (0.299 * imageData[i]) + (0.587 * imageData[i+1]) + (0.114 * imageData[i+2]);
        }
        return { avgLuminance: totalLuminance / 10000 };
    } catch(e) { return {avgLuminance: 128}; } 
}

function autoAdjustLighting() {
    const imgBefore = document.getElementById('beforeImg2');
    const imgAfter = document.getElementById('afterImg2');
    if(!imgBefore.complete || !imgAfter.complete) return;

    const statsB = getImageStats(imgBefore);
    const statsA = getImageStats(imgAfter);
    let brightnessRatio = (statsB.avgLuminance / statsA.avgLuminance) * 100;
    
    document.getElementById('brightnessSlider').value = Math.max(50, Math.min(150, brightnessRatio));
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

const wipeSlider = document.getElementById('wipeSlider');
wipeSlider.addEventListener('input', (e) => {
    document.getElementById('beforeImg3').style.clipPath = `inset(0 ${100 - e.target.value}% 0 0)`;
    document.getElementById('sliderLine').style.left = `${e.target.value}%`;
});

// --- SAVE LOGIC ---
function openSaveModal() { document.getElementById('saveModal').style.display = 'flex'; }
function closeSaveModal() { document.getElementById('saveModal').style.display = 'none'; }

async function submitToGitHub() {
    const btn = document.getElementById('submitBtn');
    btn.innerText = "Saving..."; btn.disabled = true;

    try {
        const name = document.getElementById('patientName').value || 'Anonymous';
        
        const metadata = {
            patientName: name,
            diseaseTags: selectedDiseases,
            treatmentTags: selectedTreatments,
            dateSaved: new Date().toISOString()
        };

        const canvas = document.createElement('canvas');
        canvas.width = 1600; canvas.height = 800; 
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,1600,800);
        ctx.drawImage(document.getElementById('beforeImg1'), 0, 0, 800, 800);
        ctx.filter = `brightness(${document.getElementById('brightnessSlider').value}%) contrast(${document.getElementById('contrastSlider').value}%)`;
        ctx.drawImage(document.getElementById('afterImg1'), 800, 0, 800, 800);

        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientName: name,
                metadataBase64: btoa(JSON.stringify(metadata, null, 2)),
                beforeBase64: beforeSrc,
                afterBase64: afterSrc,
                combinedBase64: canvas.toDataURL('image/jpeg', 0.8)
            })
        });

        if (response.ok) {
            alert("Successfully saved to Database!");
            closeSaveModal();
            document.getElementById('patientName').value = '';
            
            // Clear tags arrays and UI
            selectedDiseases = [];
            selectedTreatments = [];
            document.getElementById('diseaseTagContainer').querySelectorAll('.tag-pill').forEach(el => el.remove());
            document.getElementById('treatmentTagContainer').querySelectorAll('.tag-pill').forEach(el => el.remove());

            dbLoaded = false; 
            switchTab('database'); // Jump to database tab to see the new entry
        } else {
            const err = await response.json();
            throw new Error(err.error || "Failed to save.");
        }
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.innerText = "Commit & Save"; btn.disabled = false;
    }
}
