// ---------------------------------------------------------
// Die Liste der Tests
// Das Datum steht als JJJJ-MM-TT da. In dieser Form lässt es
// sich eindeutig lesen und einfach sortieren.
// ---------------------------------------------------------
const BEISPIELE = [
  { fach: "Wirtschaft", datum: "2026-10-11" },
  { fach: "Mathe", datum: "2026-10-18" },
  { fach: "Deutsch", datum: "2026-10-28" },
  { fach: "Englisch", datum: "2026-11-10" }
];

// Unter diesem Namen liegt die Liste im Browser-Speicher
const SPEICHER_NAME = "tests";

// Holt die Liste aus dem Browser. Beim ersten Besuch gibt es
// noch nichts, dann nehmen wir die Beispiele.
function laden() {
  try {
    const text = localStorage.getItem(SPEICHER_NAME);
    if (text) return JSON.parse(text);
  } catch (fehler) {
    // Speicher gesperrt (z. B. privates Fenster): Beispiele nehmen
  }
  return BEISPIELE.slice();
}

// Legt die Liste als Text im Browser ab
function speichern() {
  try {
    localStorage.setItem(SPEICHER_NAME, JSON.stringify(tests));
  } catch (fehler) {
    // Nicht speicherbar: Die Liste gilt dann nur bis zum Neuladen
  }
}

const tests = laden();

// Ab so vielen Tagen oder weniger zeigen wir das Warnzeichen
const WARN_TAGE = 5;

// ---------------------------------------------------------
// Kleine Helfer rund ums Datum
// ---------------------------------------------------------

// Macht aus "2026-10-11" ein Datum (Mitternacht, lokale Zeit)
function zuDatum(text) {
  const teile = text.split("-").map(Number);
  return new Date(teile[0], teile[1] - 1, teile[2]);
}

// Schreibt ein Datum deutsch: 11.10.2026
function datumAlsText(datum) {
  const tag = String(datum.getDate()).padStart(2, "0");
  const monat = String(datum.getMonth() + 1).padStart(2, "0");
  return tag + "." + monat + "." + datum.getFullYear();
}

// Zählt die ganzen Tage von heute bis zum Test
function tageBis(datum) {
  const jetzt = new Date();
  // Nur das Datum zählt, nicht die Uhrzeit
  const heute = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  const msProTag = 24 * 60 * 60 * 1000;
  return Math.round((datum - heute) / msProTag);
}

// Formuliert die Anzahl Tage als Satz
function tageAlsText(tage) {
  if (tage < 0) return "Test ist vorbei";
  if (tage === 0) return "Heute";
  if (tage === 1) return "Noch 1 Tag";
  return "Noch " + tage + " Tage";
}

// ---------------------------------------------------------
// Eine einzelne Karte bauen
// ---------------------------------------------------------
function karteBauen(test) {
  const datum = zuDatum(test.datum);
  const tage = tageBis(datum);

  const karte = document.createElement("li");
  karte.className = "karte";

  // Das Blatt: reine Optik, deshalb für Screenreader unsichtbar
  const blatt = document.createElement("div");
  blatt.className = "blatt";
  blatt.setAttribute("aria-hidden", "true");
  karte.appendChild(blatt);

  // Die Angaben unter dem Blatt
  const angaben = document.createElement("div");
  angaben.className = "angaben";

  const fach = document.createElement("h2");
  fach.className = "fach";
  fach.textContent = test.fach;
  angaben.appendChild(fach);

  const datumZeile = document.createElement("p");
  datumZeile.className = "datum";
  datumZeile.textContent = datumAlsText(datum);
  angaben.appendChild(datumZeile);

  const tageZeile = document.createElement("p");
  tageZeile.className = "tage";
  tageZeile.textContent = tageAlsText(tage);
  angaben.appendChild(tageZeile);

  // Themen nur zeigen, wenn welche eingetragen sind
  if (test.themen) {
    const themenZeile = document.createElement("p");
    themenZeile.className = "themen";
    themenZeile.textContent = "Themen: " + test.themen;
    angaben.appendChild(themenZeile);
  }

  // Warnzeichen nur, wenn der Test in 5 Tagen oder weniger ist
  if (tage >= 0 && tage <= WARN_TAGE) {
    const warnung = document.createElement("p");
    warnung.className = "warnung";
    warnung.textContent = "⚠️ Steht bald an";
    angaben.appendChild(warnung);
  }

  karte.appendChild(angaben);
  return karte;
}

// ---------------------------------------------------------
// Die ganze Seite zeichnen
// ---------------------------------------------------------
function anzeigen() {
  const liste = document.getElementById("liste");
  const leer = document.getElementById("leer");

  // Alte Karten entfernen, damit nichts doppelt erscheint
  liste.textContent = "";

  // Ist die Liste leer, zeigen wir nur das grosse Quadrat
  if (tests.length === 0) {
    liste.hidden = true;
    leer.hidden = false;
    return;
  }

  liste.hidden = false;
  leer.hidden = true;

  // Nach Datum sortieren: der nächste Test kommt zuerst.
  // slice() macht eine Kopie, damit die Originalliste bleibt, wie sie ist.
  const sortiert = tests.slice().sort(function (a, b) {
    return zuDatum(a.datum) - zuDatum(b.datum);
  });

  // Für jeden Test eine Karte in die Liste hängen
  sortiert.forEach(function (test) {
    liste.appendChild(karteBauen(test));
  });
}

// ---------------------------------------------------------
// Zwischen Liste und Formular wechseln
// ---------------------------------------------------------
function zeigeFormular() {
  document.getElementById("listenseite").hidden = true;
  document.getElementById("balken-unten").hidden = true;
  document.getElementById("formularseite").hidden = false;
  document.getElementById("titel").textContent = "Neuer Test";
  document.getElementById("fach").focus();
}

function zeigeListe() {
  document.getElementById("formularseite").hidden = true;
  document.getElementById("listenseite").hidden = false;
  document.getElementById("balken-unten").hidden = false;
  document.getElementById("titel").textContent = "Die kommenden Tests";
  // Formular leeren, damit es beim nächsten Mal frisch ist
  document.getElementById("formular").reset();
  document.getElementById("meldung").hidden = true;
}

// ---------------------------------------------------------
// Einen neuen Test hinzufügen
// ---------------------------------------------------------
function hinzufuegen(ereignis) {
  // Sonst würde der Browser die Seite neu laden
  ereignis.preventDefault();

  // trim() entfernt Leerzeichen am Anfang und Ende
  const fach = document.getElementById("fach").value.trim();
  const datum = document.getElementById("datum").value;
  const themen = document.getElementById("themen").value.trim();

  // Fehlt etwas, zeigen wir eine Meldung und speichern nichts
  if (fach === "" || datum === "") {
    const meldung = document.getElementById("meldung");
    meldung.textContent = "Bitte Fach und Datum ausfüllen.";
    meldung.hidden = false;
    return;
  }

  tests.push({ fach: fach, datum: datum, themen: themen });
  speichern();
  anzeigen();
  zeigeListe();
}

document.getElementById("plus").addEventListener("click", zeigeFormular);
document.getElementById("zurueck").addEventListener("click", zeigeListe);
document.getElementById("formular").addEventListener("submit", hinzufuegen);

// Los geht's
anzeigen();
