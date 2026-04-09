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
const statusDiv = document.getElementById("connectionStatus");

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

//Valida conexión real a Internet
async function isReallyOnline() {
  try {
    await fetch('https://www.google.com/generate_204', {
      method: 'GET',
      mode: 'no-cors'
    });
    console.log('fetch exitoso');
    return true;
  } catch {
    console.log('fetch fallido');
    return false;
  }
}

//Actualiza estado de conexión
async function updateConnectionStatus() {
  const online = await isReallyOnline();

  if (online) {
    statusDiv.textContent = "🟢 En línea";
    statusDiv.classList.remove("offline");
    statusDiv.classList.add("online");
  } else {
    statusDiv.textContent = "🔴 Sin conexión";
    statusDiv.classList.remove("online");
    statusDiv.classList.add("offline");
  }
}

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();

window.addEventListener('online', syncReports);
//Notificaciones
// Solicitar permiso al cargar
if ("Notification" in window) {
  Notification.requestPermission().then(permission => {
    console.log("Permiso de notificaciones:", permission);
  });
}

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

  //Carga los reportes
  reports.forEach(r => {
  const div = document.createElement('div');
  div.className = 'report-item'; // Opcional: para dar estilos CSS
  
  div.innerHTML = `
    <h3>${r.title}</h3>
    <small>ID: ${r.id}</small>
    <p>${r.description}</p>
    ${r.photo ? `<img src="${r.photo}" width="120" style="display:block; margin: 10px 0;">` : ''}
    ${r.location ? `<p>Ubicación: ${r.location.lat.toFixed(4)}, ${r.location.lng.toFixed(4)}</p>` : ''}
    <p><strong>Fecha:</strong> ${new Date(r.date).toLocaleString()}</p>
    <p><strong>Estado:</strong> 
      <span style="color: ${r.synced ? 'green' : 'orange'}">
        ${r.synced ? 'Enviado' : 'Pendiente'}
      </span>
    </p>
    <hr>
    `;
     reportList.appendChild(div);
  });
}

//Sincroniza reportes
async function syncReports() {
  const online = await isReallyOnline();
  if (!online) return;

  const reports = await getAllReports();

  for (let r of reports) {
    if (!r.synced) {
      // simular envío
      await new Promise(res => setTimeout(res, 1000));

      r.synced = true;
      await updateReport(r);

      showNotification(`Reporte "${r.title}" enviado`);
    }
  }

  loadReports();
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

//Abre el formulario
fab.addEventListener('click', async () => {
  modal.classList.remove('hidden');
  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    console.log("Permiso:", permission);
  }
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

//Borrar imagenes/fotos
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
  if (!titleInput.value || !descInput.value) 
    return alert("El reporte debe incluir titulo, y descripcion, revisa los campos");

  const report = {
    id: Date.now(),
    title: titleInput.value,
    description: descInput.value,
    photo: currentPhoto,
    location: currentLocation,
    date: new Date().toISOString(),
    synced: false
  };

   const online = await isReallyOnline();

    if (online) {
    report.synced = true;
    await updateReport(report);
    showNotification(`Reporte "${report.title}" enviado correctamente`);
    } else {
      showNotification(`Reporte "${report.title}" guardado (pendiente de envío)`);
      }

  await saveReportDB(report);
  loadReports();
  resetForm();
});

//Cierra camara
closeCameraBtn.addEventListener('click', closeCamera);