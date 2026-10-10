// ---------------------------------------------------------
// Die Liste der Tests
// Das Datum steht als JJJJ-MM-TT da. In dieser Form lässt es
// sich eindeutig lesen und einfach sortieren.
// ---------------------------------------------------------

// Unter diesem Namen liegt die Liste im Browser-Speicher
const SPEICHER_NAME = "tests";

// Holt die Liste aus dem Browser. Beim ersten Besuch gibt es
// noch nichts, dann startet man mit einer leeren Liste.
function laden() {
  try {
    const text = localStorage.getItem(SPEICHER_NAME);
    if (text) return JSON.parse(text);
  } catch (fehler) {
    // Speicher gesperrt (z. B. privates Fenster): leer starten
  }
  return [];
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

// Ein Test ist vorbei, wenn sein Datum vor heute liegt
function istVorbei(test) {
  return tageBis(zuDatum(test.datum)) < 0;
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

  // Knopf zum Löschen dieses einen Tests
  const loeschen = document.createElement("button");
  loeschen.type = "button";
  loeschen.className = "loeschen";
  loeschen.textContent = "Löschen";
  loeschen.addEventListener("click", function () {
    loeschenTest(test);
  });
  angaben.appendChild(loeschen);

  karte.appendChild(angaben);
  return karte;
}

// ---------------------------------------------------------
// Einen Test löschen
// ---------------------------------------------------------
function loeschenTest(test) {
  if (!confirm("«" + test.fach + "» wirklich löschen?")) return;

  // indexOf findet die Stelle dieses Tests in der Originalliste
  const stelle = tests.indexOf(test);
  tests.splice(stelle, 1);
  speichern();
  anzeigen();
}

// ---------------------------------------------------------
// Karten in eine Liste füllen
// ---------------------------------------------------------
function listeFuellen(liste, auswahl) {
  // Alte Karten entfernen, damit nichts doppelt erscheint
  liste.textContent = "";
  auswahl.forEach(function (test) {
    liste.appendChild(karteBauen(test));
  });
}

// ---------------------------------------------------------
// Die ganze Seite zeichnen
// ---------------------------------------------------------
function anzeigen() {
  // Nach Datum sortieren: der nächste Test kommt zuerst.
  // slice() macht eine Kopie, damit die Originalliste bleibt, wie sie ist.
  const sortiert = tests.slice().sort(function (a, b) {
    return zuDatum(a.datum) - zuDatum(b.datum);
  });

  // filter() teilt in kommende und vergangene Tests auf
  const kommend = sortiert.filter(function (test) {
    return !istVorbei(test);
  });
  // Im Archiv steht der zuletzt geschriebene Test zuoberst
  const vorbei = sortiert.filter(istVorbei).reverse();

  // Kommende Tests – oder das grosse Quadrat, wenn keine da sind
  const liste = document.getElementById("liste");
  listeFuellen(liste, kommend);
  liste.hidden = kommend.length === 0;
  document.getElementById("leer").hidden = kommend.length > 0;

  // Archiv
  const archiv = document.getElementById("archiv");
  listeFuellen(archiv, vorbei);
  archiv.hidden = vorbei.length === 0;
  document.getElementById("archiv-leer").hidden = vorbei.length > 0;
}

// ---------------------------------------------------------
// Zwischen den Seiten wechseln
// ---------------------------------------------------------
const TITEL = {
  listenseite: "Die kommenden Tests",
  formularseite: "Neuer Test",
  archivseite: "Archiv"
};

// Zeigt eine Seite und versteckt die anderen
function zeigeSeite(name) {
  Object.keys(TITEL).forEach(function (seite) {
    document.getElementById(seite).hidden = seite !== name;
  });
  document.getElementById("titel").textContent = TITEL[name];
  // Der Plus-Balken gehört nur zur Liste
  document.getElementById("balken-unten").hidden = name !== "listenseite";
  window.scrollTo(0, 0);
}

function zeigeFormular() {
  zeigeSeite("formularseite");
  document.getElementById("fach").focus();
}

function zeigeListe() {
  zeigeSeite("listenseite");
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
document.getElementById("leer-plus").addEventListener("click", zeigeFormular);
document.getElementById("zurueck").addEventListener("click", zeigeListe);
document.getElementById("zum-archiv").addEventListener("click", function () {
  zeigeSeite("archivseite");
});
document.getElementById("archiv-zurueck").addEventListener("click", zeigeListe);
document.getElementById("formular").addEventListener("submit", hinzufuegen);

// Los geht's
anzeigen();
