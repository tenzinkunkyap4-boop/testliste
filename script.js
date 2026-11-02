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

// Ab so vielen Tagen oder weniger zeigen wir den Lern-Hinweis
const WARN_TAGE = 5;

// ---------------------------------------------------------
// Kleine Helfer rund ums Datum
// ---------------------------------------------------------

// Eigene Namenslisten, damit alles genau wie im Design aussieht.
// getDay() zählt ab Sonntag (0), getMonth() ab Januar (0).
const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
  "August", "September", "Oktober", "November", "Dezember"];

// Macht aus "2026-10-11" ein Datum (Mitternacht, lokale Zeit)
function zuDatum(text) {
  const teile = text.split("-").map(Number);
  return new Date(teile[0], teile[1] - 1, teile[2]);
}

// Das Gegenstück: macht aus einem Datum wieder "2026-10-11"
function alsSchluessel(datum) {
  const monat = String(datum.getMonth() + 1).padStart(2, "0");
  const tag = String(datum.getDate()).padStart(2, "0");
  return datum.getFullYear() + "-" + monat + "-" + tag;
}

// Heute um Mitternacht. Nur das Datum zählt, nicht die Uhrzeit.
function heute() {
  const jetzt = new Date();
  return new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
}

// Schreibt ein Datum deutsch: 11.10.2026
function datumAlsText(datum) {
  const tag = String(datum.getDate()).padStart(2, "0");
  const monat = String(datum.getMonth() + 1).padStart(2, "0");
  return tag + "." + monat + "." + datum.getFullYear();
}

// Zählt die ganzen Tage von heute bis zum Test
function tageBis(datum) {
  const msProTag = 24 * 60 * 60 * 1000;
  return Math.round((datum - heute()) / msProTag);
}

// Ein Test ist vorbei, wenn sein Datum vor heute liegt
function istVorbei(test) {
  return tageBis(zuDatum(test.datum)) < 0;
}

// Formuliert die Anzahl Tage als Satz, für kommende und vergangene Tests
function tageAlsText(tage) {
  if (tage === 0) return "Heute";
  if (tage === 1) return "Morgen";
  if (tage === -1) return "Gestern";
  if (tage < 0) return "Vor " + -tage + " Tagen";
  return "Noch " + tage + " Tage";
}

// ---------------------------------------------------------
// Ein Löschen-Knopf mit Mülleimer-Symbol
// ---------------------------------------------------------
const MUELLEIMER =
  '<svg class="symbol" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

function loeschenKnopf(test, extraKlasse) {
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = "loeschen " + (extraKlasse || "");
  // Das Symbol ist fester Text von uns, darum ist innerHTML hier sicher
  knopf.innerHTML = MUELLEIMER;
  // Screenreader brauchen einen Namen, weil man nur ein Bild sieht
  knopf.setAttribute("aria-label", "«" + test.fach + "» löschen");
  knopf.addEventListener("click", function () {
    loeschenTest(test);
  });
  return knopf;
}

// ---------------------------------------------------------
// Eine kleine Karte (für «Später» und das Archiv)
// ---------------------------------------------------------
function karteBauen(test, mitNotfallplan) {
  const datum = zuDatum(test.datum);

  const karte = document.createElement("li");
  karte.className = "karte";

  // Das Datumsfeld links: Tag gross, Monat klein darunter
  const feld = document.createElement("div");
  feld.className = "datumsfeld";
  feld.setAttribute("aria-hidden", "true");
  const tag = document.createElement("span");
  tag.className = "datumsfeld-tag";
  tag.textContent = String(datum.getDate()).padStart(2, "0");
  const monat = document.createElement("span");
  monat.className = "datumsfeld-monat";
  // slice(0, 3) nimmt die ersten drei Buchstaben: "Oktober" → "Okt"
  monat.textContent = MONATE[datum.getMonth()].slice(0, 3);
  feld.appendChild(tag);
  feld.appendChild(monat);
  karte.appendChild(feld);

  // Die Angaben rechts daneben
  const angaben = document.createElement("div");
  angaben.className = "angaben";

  const fach = document.createElement("h3");
  fach.className = "fach";
  fach.textContent = test.fach;
  angaben.appendChild(fach);

  // Tage und Themen stehen in einer Zeile, getrennt mit «·»
  const zeile = document.createElement("p");
  zeile.className = "unterzeile";
  let text = tageAlsText(tageBis(datum));
  if (test.themen) text += " · " + test.themen;
  zeile.textContent = text;
  // title zeigt das genaue Datum, wenn man mit der Maus darüber fährt
  zeile.title = datumAlsText(datum);
  angaben.appendChild(zeile);

  // Nur kommende Tests bekommen einen Notfallplan-Knopf
  if (mitNotfallplan) angaben.appendChild(notfallKnopf(test, "notfall-knopf"));

  karte.appendChild(angaben);
  karte.appendChild(loeschenKnopf(test));
  return karte;
}

// ---------------------------------------------------------
// Die grosse blaue Karte für den nächsten Test
// ---------------------------------------------------------
function naechsterFuellen(test) {
  const datum = zuDatum(test.datum);
  const tage = tageBis(datum);

  document.getElementById("naechster-fach").textContent = test.fach;

  // "Fr, 16.10.2026 · Kundenkontakt"
  let text = WOCHENTAGE[datum.getDay()].slice(0, 2) + ", " + datumAlsText(datum);
  if (test.themen) text += " · " + test.themen;
  document.getElementById("naechster-datum").textContent = text;

  // Grosse Zahl rechts. Am Testtag steht statt der Zahl "Heute".
  const zahl = document.getElementById("naechster-zahl");
  const einheit = document.getElementById("naechster-einheit");
  // Das Wort "Heute" ist breiter als eine Zahl, darum wird es kleiner
  zahl.classList.toggle("zaehler-wort", tage === 0);
  if (tage === 0) {
    zahl.textContent = "Heute";
    einheit.textContent = "";
  } else {
    zahl.textContent = tage;
    einheit.textContent = tage === 1 ? "Tag" : "Tage";
  }

  // Ist der Test bald (5 Tage oder weniger), wird die Warnung zum Knopf
  const bald = tage <= WARN_TAGE;
  const warnKnopf = document.getElementById("naechster-hinweis");
  warnKnopf.hidden = !bald;
  // Gibt es schon einen Plan, öffnet der Knopf ihn direkt
  document.getElementById("naechster-hinweis-text").textContent =
    test.notfallplan ? "Notfallplan öffnen" : "Jetzt Notfallplan erstellen";
  // onclick (statt addEventListener), damit beim Neuzeichnen nur ein Klick-Befehl dran ist
  warnKnopf.onclick = function () {
    notfallOeffnen(test);
  };

  // Alten Löschen-Knopf ersetzen, damit er zum aktuellen Test gehört
  const platz = document.getElementById("naechster-loeschen");
  platz.textContent = "";
  platz.appendChild(loeschenKnopf(test, "loeschen-hell"));

  // Gleich beim Notfallplan-Knopf: den normalen Knopf gibt es nur,
  // wenn der Test noch weit weg ist (sonst übernimmt der Warn-Knopf)
  const notfallPlatz = document.getElementById("naechster-notfall");
  notfallPlatz.textContent = "";
  if (!bald) {
    notfallPlatz.appendChild(notfallKnopf(test, "notfall-knopf notfall-knopf-hell"));
  }
}

// ---------------------------------------------------------
// Der Streifen mit den nächsten 7 Tagen
// ---------------------------------------------------------
function wocheFuellen(kommend) {
  // Ein Set merkt sich alle Tage, an denen ein Test ist.
  // has() fragt dann schnell nach: "Ist an diesem Tag ein Test?"
  const testTage = new Set(kommend.map(function (test) {
    return test.datum;
  }));

  const streifen = document.getElementById("woche-tage");
  streifen.textContent = "";

  for (let i = 0; i < 7; i++) {
    const tag = heute();
    // setDate rechnet über das Monatsende hinaus richtig weiter
    tag.setDate(tag.getDate() + i);
    const hatTest = testTage.has(alsSchluessel(tag));

    const eintrag = document.createElement("li");
    eintrag.className = "woche-tag";
    if (i === 0) eintrag.classList.add("ist-heute");
    if (hatTest) eintrag.classList.add("hat-test");

    // Vorgelesen wird z. B. "Freitag 16. Oktober, Test"
    let vorlesen = WOCHENTAGE[tag.getDay()] + " " + tag.getDate() + ". " + MONATE[tag.getMonth()];
    if (i === 0) vorlesen += ", heute";
    if (hatTest) vorlesen += ", Test";
    eintrag.setAttribute("aria-label", vorlesen);

    const kurz = document.createElement("span");
    kurz.className = "woche-kurz";
    kurz.textContent = WOCHENTAGE[tag.getDay()].slice(0, 2);

    const nummer = document.createElement("span");
    nummer.className = "woche-nummer";
    nummer.textContent = tag.getDate();

    // Kleine Beschriftung darunter: "Test" hat Vorrang vor "heute"
    const notiz = document.createElement("span");
    notiz.className = "woche-notiz";
    if (hatTest) notiz.textContent = "Test";
    else if (i === 0) notiz.textContent = "heute";

    eintrag.appendChild(kurz);
    eintrag.appendChild(nummer);
    eintrag.appendChild(notiz);
    streifen.appendChild(eintrag);
  }
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
function listeFuellen(liste, auswahl, mitNotfallplan) {
  // Alte Karten entfernen, damit nichts doppelt erscheint
  liste.textContent = "";
  auswahl.forEach(function (test) {
    liste.appendChild(karteBauen(test, mitNotfallplan));
  });
}

// ---------------------------------------------------------
// Die ganze Seite zeichnen
// ---------------------------------------------------------
function anzeigen() {
  // Heutiges Datum oben: "Sonntag, 11. Oktober"
  const h = heute();
  document.getElementById("heute").textContent =
    WOCHENTAGE[h.getDay()] + ", " + h.getDate() + ". " + MONATE[h.getMonth()];

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

  // Keine kommenden Tests: nur der leere Hinweis
  const keine = kommend.length === 0;
  document.getElementById("leer").hidden = !keine;
  document.getElementById("naechster").hidden = keine;
  document.getElementById("woche").hidden = keine;

  if (!keine) {
    naechsterFuellen(kommend[0]);
    wocheFuellen(kommend);
  }

  // Alle ausser dem ersten kommen unter «Später»
  const spaeter = kommend.slice(1);
  listeFuellen(document.getElementById("liste"), spaeter, true);
  document.getElementById("spaeter").hidden = spaeter.length === 0;

  // Archiv
  const archiv = document.getElementById("archiv");
  listeFuellen(archiv, vorbei);
  archiv.hidden = vorbei.length === 0;
  document.getElementById("archiv-leer").hidden = vorbei.length > 0;
}

// ---------------------------------------------------------
// Zwischen den Seiten wechseln
// ---------------------------------------------------------
const SEITEN = ["listenseite", "formularseite", "archivseite", "notfallseite", "planseite"];

// Zeigt eine Seite und versteckt die anderen
function zeigeSeite(name) {
  SEITEN.forEach(function (seite) {
    document.getElementById(seite).hidden = seite !== name;
  });
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
    document.getElementById("meldung-text").textContent = "Bitte Fach und Datum ausfüllen.";
    document.getElementById("meldung").hidden = false;
    return;
  }

  tests.push({ fach: fach, datum: datum, themen: themen });
  speichern();
  anzeigen();
  zeigeListe();
}

// =========================================================
// NOTFALLPLAN
// Die App schickt Fach, Tage, Lernziele und Muster an unseren
// Server. Der fragt Claude und schickt einen Text zurück:
// zuerst Lernkarten, dann «Übungen», dann «Lösungen».
// =========================================================

const SERVER_ADRESSE = "https://testliste-server.testliste.workers.dev";

// Gleiche Grenze wie auf dem Server
const MAX_ZEICHEN = 10000;

// Testmodus: Hängt man ?test an die Adresse (index.html?test),
// kommt eine feste Beispielantwort statt einer echten Anfrage.
// So verbraucht das Ausprobieren keine der 3 Anfragen pro Tag.
// Mit ?test=fehler sieht man, wie eine Fehlermeldung aussieht.
const TESTMODUS = new URLSearchParams(location.search).get("test");

const BEISPIEL_ANTWORT =
  "Unterversicherung führt zu Kürzung\n" +
  "Die Versicherungssumme ist kleiner als der echte Wert. Dann zahlt die Versicherung nur einen Teil. " +
  "Formel: Versicherungssumme ÷ Wert × Schaden.\n" +
  "Beispiel: Wert 100'000, Summe 75'000, Schaden 90'000 Franken. Die Versicherung zahlt 67'500 Franken.\n" +
  "\n" +
  "Überversicherung bringt nichts\n" +
  "Ist die Summe höher als der Wert, zahlt die Versicherung trotzdem nur den echten Schaden. " +
  "Man bezahlt also zu viel Prämie.\n" +
  "Beispiel: Velo wert 800 Franken, versichert für 1'200. Bei Diebstahl gibt es 800 Franken.\n" +
  "\n" +
  "Selbstbehalt zahlst du selbst\n" +
  "Der Selbstbehalt ist der Teil des Schadens, den du immer selbst trägst. " +
  "Er wird vom Betrag abgezogen, den die Versicherung zahlt.\n" +
  "Beispiel: Schaden 1'000 Franken, Selbstbehalt 200. Die Versicherung zahlt 800 Franken.\n" +
  "\n" +
  "Übungen\n" +
  "1. Ein Hausrat ist 60'000 Franken wert und für 45'000 versichert. " +
  "Ein Brand verursacht 20'000 Franken Schaden. Wie viel zahlt die Versicherung?\n" +
  "2. Ein Laptop ist 1'500 Franken wert und für 2'000 versichert. " +
  "Er wird gestohlen. Wie viel zahlt die Versicherung?\n" +
  "3. Schaden 3'000 Franken, keine Unterversicherung, Selbstbehalt 500 Franken. " +
  "Wie viel zahlt die Versicherung?\n" +
  "\n" +
  "Lösungen\n" +
  "1. 45'000 ÷ 60'000 × 20'000 = 15'000 Franken. Es ist eine Unterversicherung, darum wird gekürzt. " +
  "Häufiger Fehler: Man rechnet mit der Versicherungssumme statt mit dem Wert.\n" +
  "2. 1'500 Franken. Bezahlt wird nur der echte Wert. " +
  "Häufiger Fehler: Man meint, es gibt die ganze Versicherungssumme.\n" +
  "3. 3'000 − 500 = 2'500 Franken. Der Selbstbehalt wird abgezogen. " +
  "Häufiger Fehler: Man zieht den Selbstbehalt zweimal ab oder vergisst ihn.";

// Was gerade auf der Plan-Seite zu sehen ist
let planTest = null;      // der Test, zu dem der Plan gehört
let planSchritte = [];    // alle Karten und Übungen hintereinander
let planStelle = 0;       // welcher Schritt gerade angezeigt wird
let uebrigeAnfragen = null; // nur direkt nach einer neuen Anfrage bekannt

// Der Knopf «Notfallplan» auf jeder kommenden Karte
function notfallKnopf(test, klassen) {
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = klassen;
  // Gibt es schon einen gespeicherten Plan, öffnen wir ihn direkt
  knopf.textContent = test.notfallplan ? "Notfallplan öffnen" : "Notfallplan";
  knopf.addEventListener("click", function () {
    notfallOeffnen(test);
  });
  return knopf;
}

// Führt zum Notfallplan: fertigen Plan zeigen oder Eingabe öffnen
function notfallOeffnen(test) {
  if (test.notfallplan) zeigePlan(test);
  else zeigeNotfallEingabe(test);
}

// Kurzer Text oben, z. B. "Mathematik · Noch 3 Tage"
function testInfo(test) {
  return test.fach + " · " + tageAlsText(tageBis(zuDatum(test.datum)));
}

// ---------------------------------------------------------
// Eingabeseite
// ---------------------------------------------------------
function zeigeNotfallEingabe(test) {
  planTest = test;
  document.getElementById("notfall-info").textContent = testInfo(test);

  // Felder vorausfüllen: frühere Eingabe oder die Themen vom Test
  const frueher = test.notfallplan || {};
  document.getElementById("lernziele").value = frueher.lernziele || test.themen || "";
  document.getElementById("muster").value = frueher.muster || "";

  document.getElementById("notfall-meldung").hidden = true;
  document.getElementById("notfall-formular").hidden = false;
  document.getElementById("laden").hidden = true;

  zeigeSeite("notfallseite");
  document.getElementById("lernziele").focus();
}

function notfallMeldung(text) {
  document.getElementById("notfall-meldung-text").textContent = text;
  document.getElementById("notfall-meldung").hidden = false;
}

// Kleine Pause für den Testmodus, damit man die Ladeanzeige sieht
function warten(ms) {
  return new Promise(function (fertig) {
    setTimeout(fertig, ms);
  });
}

// Fragt den Server. Gibt { text, abgeschnitten, uebrig } zurück
// oder wirft einen Fehler mit einem Satz, den man verstehen kann.
async function notfallplanAnfragen(daten) {
  if (TESTMODUS !== null) {
    await warten(1500);
    if (TESTMODUS === "fehler") throw new Error("Für heute sind alle 3 Anfragen aufgebraucht.");
    return { text: BEISPIEL_ANTWORT, abgeschnitten: false, uebrig: 2 };
  }

  let antwort;
  try {
    antwort = await fetch(SERVER_ADRESSE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(daten),
    });
  } catch (fehler) {
    // fetch scheitert ganz, wenn es keine Verbindung gibt
    throw new Error("Keine Verbindung zum Server. Bist du online?");
  }

  let ergebnis = {};
  try {
    ergebnis = await antwort.json();
  } catch (fehler) {
    // Antwort war kein JSON: unten kommt eine allgemeine Meldung
  }

  // 403 heisst: Die Anfrage kam nicht von der GitHub-Seite
  if (antwort.status === 403) {
    throw new Error("Der Notfallplan funktioniert nur auf der Seite im Internet (GitHub).");
  }
  if (ergebnis.fehler) throw new Error(ergebnis.fehler);
  if (!antwort.ok || !ergebnis.text) {
    throw new Error("Etwas ist schiefgelaufen. Versuch es später noch einmal.");
  }
  return ergebnis;
}

async function notfallplanErstellen(ereignis) {
  ereignis.preventDefault();

  const lernziele = document.getElementById("lernziele").value.trim();
  const muster = document.getElementById("muster").value.trim();

  if (lernziele === "") {
    notfallMeldung("Bitte die Lernziele ausfüllen.");
    return;
  }
  if (lernziele.length + muster.length > MAX_ZEICHEN) {
    notfallMeldung("Zu viel Text: höchstens 10'000 Zeichen zusammen.");
    return;
  }

  // Formular verstecken, Ladeanzeige zeigen
  document.getElementById("notfall-meldung").hidden = true;
  document.getElementById("notfall-formular").hidden = true;
  document.getElementById("laden").hidden = false;

  const test = planTest;
  try {
    const ergebnis = await notfallplanAnfragen({
      fach: test.fach,
      tage: tageBis(zuDatum(test.datum)),
      lernziele: lernziele,
      muster: muster,
    });

    // Beim Test speichern, damit man ihn ohne neue Anfrage wieder öffnet
    test.notfallplan = {
      text: ergebnis.text,
      abgeschnitten: ergebnis.abgeschnitten === true,
      lernziele: lernziele,
      muster: muster,
      erstellt: alsSchluessel(heute()),
    };
    speichern();
    anzeigen();

    uebrigeAnfragen = ergebnis.uebrig;
    // Nur hinwechseln, wenn man noch auf der Warte-Seite ist
    if (!document.getElementById("notfallseite").hidden) zeigePlan(test);
  } catch (fehler) {
    // Zurück zum Formular, die Eingaben bleiben stehen
    document.getElementById("laden").hidden = true;
    document.getElementById("notfall-formular").hidden = false;
    notfallMeldung(fehler.message);
  }
}

// ---------------------------------------------------------
// Den Text der KI in Karten und Übungen zerlegen
// ---------------------------------------------------------

// Teilt Zeilen bei Leerzeilen in Blöcke: [["Titel", "Text"], [...]]
function inBloecke(zeilen) {
  const bloecke = [];
  let block = [];
  zeilen.forEach(function (zeile) {
    if (zeile.trim() === "") {
      if (block.length > 0) bloecke.push(block);
      block = [];
    } else {
      block.push(zeile.trim());
    }
  });
  if (block.length > 0) bloecke.push(block);
  return bloecke;
}

// Teilt Zeilen in nummerierte Einträge ("1. …", "2) …").
// Ohne Nummern wird bei Leerzeilen getrennt.
function inNummern(zeilen) {
  const nummer = /^\s*(übung\s*)?\d+\s*[.):]\s*/i;
  const hatNummern = zeilen.some(function (zeile) {
    return nummer.test(zeile);
  });
  if (!hatNummern) {
    return inBloecke(zeilen).map(function (block) {
      return block.join("\n");
    });
  }

  const eintraege = [];
  zeilen.forEach(function (zeile) {
    if (zeile.trim() === "") return;
    if (nummer.test(zeile)) {
      // Neue Nummer: neuer Eintrag, die Nummer selbst lassen wir weg
      eintraege.push(zeile.replace(nummer, "").trim());
    } else if (eintraege.length > 0) {
      // Folgezeile: an den letzten Eintrag anhängen
      eintraege[eintraege.length - 1] += "\n" + zeile.trim();
    }
  });
  return eintraege;
}

function planZerlegen(text) {
  // Markdown-Zeichen weg, falls die KI welche schreibt (**fett**, # Titel)
  const sauber = text.replace(/\r/g, "").replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
  const zeilen = sauber.split("\n");

  // Die Zeilen «Übungen» und «Lösungen» suchen
  function findeUeberschrift(wort) {
    return zeilen.findIndex(function (zeile) {
      const z = zeile.trim().toLowerCase();
      return z.startsWith(wort) && z.length < 25;
    });
  }
  const stelleLoesungen = findeUeberschrift("lösungen");

  // Wo beginnen die Übungen? Entweder bei der Überschrift «Übungen»
  // oder (ohne Überschrift) bei der ersten Zeile «Übung 1: …».
  // kartenEnde: bis hier gehen die Karten
  // uebungenStart: ab hier stehen die Übungen selbst
  let kartenEnde = findeUeberschrift("übungen");
  let uebungenStart = kartenEnde + 1;
  if (kartenEnde < 0) {
    kartenEnde = zeilen.findIndex(function (zeile) {
      return /^\s*übung\s*\d/i.test(zeile);
    });
    uebungenStart = kartenEnde;
  }
  if (kartenEnde < 0) kartenEnde = stelleLoesungen >= 0 ? stelleLoesungen : zeilen.length;

  const karten = inBloecke(zeilen.slice(0, kartenEnde)).map(function (block) {
    // "Karte 1:" am Anfang lassen wir weg, die Nummer steht schon oben
    const titel = block[0].replace(/^karte\s*\d+\s*[.):]\s*/i, "");
    // Erste Zeile ist der Titel, der Rest die Erklärung
    if (block.length === 1) return { titel: "", text: titel };
    return { titel: titel, text: block.slice(1).join("\n") };
  });

  let uebungen = [];
  let loesungen = [];
  if (uebungenStart > 0) {
    const uebungenEnde = stelleLoesungen > uebungenStart ? stelleLoesungen : zeilen.length;
    uebungen = inNummern(zeilen.slice(uebungenStart, uebungenEnde));
    if (stelleLoesungen > uebungenStart) {
      loesungen = inNummern(zeilen.slice(stelleLoesungen + 1));
    }
  }

  // Alles in eine Reihe: zuerst die Karten, dann die Übungen
  const schritte = karten.map(function (karte, i) {
    return { art: "karte", nummer: i + 1, anzahl: karten.length, titel: karte.titel, text: karte.text };
  });
  uebungen.forEach(function (uebung, i) {
    schritte.push({
      art: "uebung",
      nummer: i + 1,
      anzahl: uebungen.length,
      titel: "Übung " + (i + 1),
      text: uebung,
      loesung: loesungen[i] || "Zu dieser Übung fehlt die Lösung.",
    });
  });

  // Nichts erkannt? Dann den ganzen Text als eine Karte zeigen
  if (schritte.length === 0) {
    schritte.push({ art: "karte", nummer: 1, anzahl: 1, titel: "", text: text });
  }
  return schritte;
}

// ---------------------------------------------------------
// Plan-Seite: eine Karte oder Übung nach der anderen
// ---------------------------------------------------------
function zeigePlan(test) {
  planTest = test;
  planSchritte = planZerlegen(test.notfallplan.text);
  planStelle = 0;

  document.getElementById("plan-titel").textContent = "Notfallplan " + test.fach;

  // Unter dem Titel: Datum und allenfalls wichtige Hinweise
  let info = "Erstellt am " + datumAlsText(zuDatum(test.notfallplan.erstellt));
  if (test.notfallplan.abgeschnitten) info += " · Die Antwort war zu lang und wurde gekürzt.";
  if (uebrigeAnfragen !== null && uebrigeAnfragen !== undefined) {
    info += " · Heute noch " + uebrigeAnfragen + (uebrigeAnfragen === 1 ? " Anfrage" : " Anfragen") + " übrig.";
  }
  uebrigeAnfragen = null; // nur einmal direkt nach dem Erstellen zeigen
  document.getElementById("plan-info").textContent = info;

  zeigeSeite("planseite");
  schrittZeigen();
}

function schrittZeigen() {
  const schritt = planSchritte[planStelle];
  const istUebung = schritt.art === "uebung";

  document.getElementById("plan-zaehler").textContent =
    (istUebung ? "Übung " : "Karte ") + schritt.nummer + " von " + schritt.anzahl;
  // Bei Übungen steht die Nummer schon oben, darum kein extra Titel
  const kopf = document.getElementById("plan-kopf");
  kopf.textContent = istUebung ? "" : schritt.titel;
  kopf.hidden = kopf.textContent === "";
  document.getElementById("plan-text").textContent = schritt.text;

  // Lösung zuerst verstecken
  document.getElementById("loesung-zeigen").hidden = !istUebung;
  document.getElementById("loesung").hidden = true;
  document.getElementById("loesung-text").textContent = istUebung ? schritt.loesung : "";

  // Knöpfe unten: Zurück nur, wenn es einen Schritt davor gibt
  document.getElementById("plan-vor").disabled = planStelle === 0;
  const weiter = document.getElementById("plan-weiter");
  const naechster = planSchritte[planStelle + 1];
  if (!naechster) weiter.textContent = "Fertig";
  else if (!istUebung && naechster.art === "uebung") weiter.textContent = "Zu den Übungen";
  else weiter.textContent = "Weiter";

  window.scrollTo(0, 0);
}

document.getElementById("plan-vor").addEventListener("click", function () {
  if (planStelle > 0) {
    planStelle--;
    schrittZeigen();
  }
});
document.getElementById("plan-weiter").addEventListener("click", function () {
  if (planStelle < planSchritte.length - 1) {
    planStelle++;
    schrittZeigen();
  } else {
    zeigeListe();
  }
});
document.getElementById("loesung-zeigen").addEventListener("click", function () {
  document.getElementById("loesung").hidden = false;
  document.getElementById("loesung-zeigen").hidden = true;
});
document.getElementById("neu-erstellen").addEventListener("click", function () {
  zeigeNotfallEingabe(planTest);
});
document.getElementById("notfall-zurueck").addEventListener("click", zeigeListe);
document.getElementById("plan-zurueck").addEventListener("click", zeigeListe);
document.getElementById("notfall-formular").addEventListener("submit", notfallplanErstellen);

document.getElementById("neuer-test").addEventListener("click", zeigeFormular);
document.getElementById("zurueck").addEventListener("click", zeigeListe);
document.getElementById("zum-archiv").addEventListener("click", function () {
  zeigeSeite("archivseite");
});
document.getElementById("archiv-zurueck").addEventListener("click", zeigeListe);
document.getElementById("formular").addEventListener("submit", hinzufuegen);

// Los geht's
anzeigen();
