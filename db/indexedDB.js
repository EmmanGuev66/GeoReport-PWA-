//Creación DB
let db;
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GeoReportDB", 1);

    request.onupgradeneeded = e => {
      db = e.target.result;
      db.createObjectStore("reports", { keyPath: "id" });
    };

    request.onsuccess = e => {
      db = e.target.result;
      resolve();
    };

    request.onerror = e => reject(e);
  });
}

//Guarda reporte en la DB
function saveReportDB(report) {
  const tx = db.transaction("reports", "readwrite");
  const store = tx.objectStore("reports");
  store.add(report);
}

//Obtiene todos los reportes
function getAllReports() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reports", "readonly");
    const store = tx.objectStore("reports");

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = e => reject(e);
  });
}

//Actualiza reportes
function updateReport(report) {
  const tx = db.transaction("reports", "readwrite");
  const store = tx.objectStore("reports");
  store.put(report);
}