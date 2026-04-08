//DOM
const fab = document.getElementById('fab');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const saveBtn = document.getElementById('saveReport');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const photoInput = document.getElementById('photo');
const deletePhotoBtn = document.getElementById('deletePhotoBtn'); 
const preview = document.getElementById('preview'); 
const getLocationBtn = document.getElementById('getLocation');
const locationText = document.getElementById('locationText');
const reportList = document.getElementById('report-list');
const video = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const startCameraBtn = document.getElementById('startCamera');
const takePhotoBtn = document.getElementById('takePhoto');
const cameraContainer = document.getElementById('cameraContainer');
const closeCameraBtn = document.getElementById('closeCamera');

let stream = null;
let currentPhoto = null; 
let currentLocation = null;
let dbReady = false;

//SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registrado con éxito', reg))
      .catch(err => console.error('Error al registrar SW', err));
  });
}

function isOnline() { return navigator.onLine; }

//Notificaciones
function showNotification(message) {
  if (Notification.permission === "granted") {
    new Notification("GeoReport", { body: message });
  }
}

//Conversión Base64 para imagenes desde Files
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

//Carga reportes
async function loadReports() {
  const reports = await getAllReports();
  reportList.innerHTML = '';

  if (reports.length === 0) {
    reportList.innerHTML = '<p style="text-align:center; color:gray; margin-top:20px;">Sin reportes</p>';
    return;
  }

  reports.forEach(r => {
    const div = document.createElement('div');
    div.innerHTML = `
      <h3>${r.title}</h3>
      <p>${r.description}</p>
      ${r.photo ? `<img src="${r.photo}" width="120">` : ''}
      ${r.location ? `<p>📍 ${r.location.lat}, ${r.location.lng}</p>` : ''}
      <p>Estado: ${r.synced ? 'Enviado' : 'Pendiente'}</p>
      <hr>
    `;
    reportList.appendChild(div);
  });
}

//Sincroniza reportes
async function syncReports() {
  if (typeof getAllReports !== 'undefined') {
    const reports = await getAllReports();
    for (let r of reports) {
      if (!r.synced) {
        // Simulación de envío
        await new Promise(res => setTimeout(res, 1000));
        r.synced = true;
        await updateReport(r); 
      }
    }
    loadReports();
  }
}

//Resetea formulario
function resetForm() {
  titleInput.value = '';
  descInput.value = '';
  photoInput.value = '';
  locationText.textContent = 'Sin ubicación';
  currentLocation = null;
  currentPhoto = null;
  preview.src = '';
  deletePhotoBtn.classList.add('hidden');
  modal.classList.add('hidden');
}

//Cierra camara
function closeCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  cameraContainer.classList.remove('active');
  cameraContainer.classList.add('hidden'); // Forzamos ocultar
  modal.classList.remove('hidden');
}

//INICIALIZACIÓN DE DB

initDB().then(() => {
  dbReady = true;
  loadReports();
  if (navigator.onLine) syncReports();
});

//EVENT LISTENERS
fab.addEventListener('click', () => {
  modal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
  resetForm();
});

//Guarda imagen desde files
photoInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;

  currentPhoto = await fileToBase64(file);
  preview.src = currentPhoto;
  deletePhotoBtn.classList.remove('hidden');
});

deletePhotoBtn.addEventListener('click', () => {
  currentPhoto = null;
  preview.src = '';
  photoInput.value = '';
  deletePhotoBtn.classList.add('hidden');
});

//Inicia Camara
startCameraBtn.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    
    // IMPORTANTE: Quitar hidden y poner active
    cameraContainer.classList.remove('hidden');
    cameraContainer.classList.add('active');
    modal.classList.add('hidden');
  } catch (err) { 
    console.error(err);
    alert("No se pudo acceder a la cámara");
  }
});

//Toma foto desde Camara
takePhotoBtn.addEventListener('click', () => {
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  currentPhoto = canvas.toDataURL('image/png');
  preview.src = currentPhoto;
  deletePhotoBtn.classList.remove('hidden');
  closeCamera();
});

//Localización
getLocationBtn.addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(position => {
    currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
    locationText.textContent = `📍 ${currentLocation.lat}, ${currentLocation.lng}`;
  });
});

//Guarda Reporte
saveBtn.addEventListener('click', async () => {
  if (!titleInput.value || !descInput.value || !photoInput.value || !locationText.value) 
    return alert("El reporte debe incluir titulo, descripcion, imagen y localizacion, revisa los campos");

  const report = {
    id: Date.now(),
    title: titleInput.value,
    description: descInput.value,
    photo: currentPhoto,
    location: currentLocation,
    date: new Date().toISOString(),
    synced: false
  };

  if (isOnline()) {
    report.synced = true;
    showNotification("Reporte enviado");
  } else {
    showNotification("Guardado offline");
  }

  await saveReportDB(report);
  loadReports();
  resetForm();
});

//Cierra camara
closeCameraBtn.addEventListener('click', closeCamera);