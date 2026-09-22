import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("portfolio routes are wired without exposing the internal LAB route", async () => {
  const [home, projects, laboratori, robots, sitemap] = await Promise.all([
    read("../public/index.html"),
    read("../public/projectes/index.html"),
    read("../public/laboratori/index.html"),
    read("../public/robots.txt"),
    read("../public/sitemap.xml"),
  ]);

  assert.match(home, /id="projectes"/);
  assert.match(home, /href="\/projectes\/"/);
  assert.match(home, /href="\/laboratori\/"/);
  assert.doesNotMatch(home, /href="\/lab\/"/);

  assert.match(projects, /NUTRIKOM/);
  assert.match(projects, /NOX BELLUM/);
  assert.match(projects, /THE CLUB/);
  assert.match(projects, /PATA/);
  assert.match(projects, /VIU SVC/);

  assert.match(laboratori, /SURO/);
  assert.match(laboratori, /MARINA/);
  assert.match(laboratori, /\/laboratori\/suro\//);
  assert.match(laboratori, /\/laboratori\/territori\//);
  assert.match(laboratori, /\/laboratori\/experiments\//);
  assert.match(robots, /Disallow: \/lab\//);

  assert.match(sitemap, /\/projectes\//);
  for (const route of [
    "nutrikom",
    "pugnator-nox-bellum",
    "the-club-padel",
    "pata-negra",
    "federacio-catalana-esgrima",
    "viu-svc",
    "producte-digital",
  ]) {
    assert.match(sitemap, new RegExp(`/projectes/${route}/`));
  }
  assert.match(sitemap, /\/laboratori\//);
  assert.match(sitemap, /\/laboratori\/suro\//);
  assert.match(sitemap, /\/laboratori\/marina\//);
  assert.match(sitemap, /\/laboratori\/territori\//);
  assert.match(sitemap, /\/laboratori\/ia-visual\//);
  assert.match(sitemap, /\/laboratori\/lip-sync\//);
  assert.match(sitemap, /\/laboratori\/experiments\//);
  assert.doesNotMatch(sitemap, /https:\/\/www\.desorden\.cat\/lab\//);

  for (const media of [
    "/media/portfolio/nutrikom.mp4",
    "/media/portfolio/pugnator-nox-bellum.mp4",
    "/media/portfolio/the-club-padel.mp4",
    "/media/portfolio/esgrima.mp4",
    "/media/portfolio/suro.mp4",
  ]) {
    assert.ok((home + projects + laboratori).includes(media), `Missing portfolio media reference: ${media}`);
  }

  // Ensure HOME and /projectes/ remain lightweight with zero HQ video references.
  assert.doesNotMatch(home, /\/media\/portfolio\/hq\//, "HOME must not reference HQ videos");
  assert.doesNotMatch(projects, /\/media\/portfolio\/hq\//, "Projects index must not reference HQ videos");
});

test("individual case pages reference their designated HQ assets", async () => {
  const [esgrima, pugnator, suro, territori, experiments] = await Promise.all([
    read("../public/projectes/federacio-catalana-esgrima/index.html"),
    read("../public/projectes/pugnator-nox-bellum/index.html"),
    read("../public/laboratori/suro/index.html"),
    read("../public/laboratori/territori/index.html"),
    read("../public/laboratori/experiments/index.html"),
  ]);

  assert.match(pugnator, /\/media\/portfolio\/hq\/boxing-event-01\.mp4/);
  assert.match(esgrima, /\/media\/portfolio\/hq\/esgrima-masculina-01\.mp4/);
  assert.match(esgrima, /\/media\/portfolio\/hq\/esgrima-masculina-02\.mp4/);
  assert.match(esgrima, /\/media\/portfolio\/hq\/esgrima-femenina-01\.mp4/);
  assert.match(esgrima, /\/media\/portfolio\/hq\/esgrima-femenina-02\.mp4/);
  assert.match(suro, /\/media\/portfolio\/hq\/suro-poble-01\.mp4/);
  assert.match(suro, /\/media\/portfolio\/hq\/suro-poble-02\.mp4/);
  assert.match(territori, /\/media\/portfolio\/hq\/territori-muntanya-01\.mp4/);
  assert.match(territori, /\/media\/portfolio\/hq\/territori-historic-01\.mp4/);
  assert.match(experiments, /\/media\/portfolio\/hq\/ia-visual-01\.mp4/);
  assert.match(experiments, /\/media\/portfolio\/hq\/lip-sync-01\.mp4/);
});

test("the-club-padel case page does not display degraded video and nutrikom does not link missing HQ", async () => {
  const [padel, nutrikom] = await Promise.all([
    read("../public/projectes/the-club-padel/index.html"),
    read("../public/projectes/nutrikom/index.html"),
  ]);

  assert.doesNotMatch(padel, /<video/, "The Club Padel must not have a video element");
  assert.doesNotMatch(padel, /\/media\/portfolio\/the-club-padel\.mp4/, "The Club Padel must not reference the low-quality video");
  assert.doesNotMatch(padel, /\/media\/portfolio\/hq\//, "The Club Padel must not reference nonexistent HQ videos");

  assert.doesNotMatch(nutrikom, /\/media\/portfolio\/hq\//, "Nutrikom must not reference missing HQ videos");
  assert.match(nutrikom, /\/media\/portfolio\/nutrikom\.mp4/, "Nutrikom preserves valid preview video");
});

test("home showcases 6 LAB cards with lightweight previews and no HQ", async () => {
  const home = await read("../public/index.html");

  const expectedLabRoutes = [
    "/laboratori/suro/",
    "/laboratori/marina/",
    "/laboratori/territori/",
    "/laboratori/ia-visual/",
    "/laboratori/lip-sync/",
    "/laboratori/experiments/",
  ];

  for (const route of expectedLabRoutes) {
    assert.match(home, new RegExp(`href="${route}"`), `Home must link to ${route}`);
  }

  assert.match(home, /TOT ÉS REAL\.<br>SURO NO\./);
  assert.match(home, /D'IMATGE A<br>PERSONATGE\./);
  assert.match(home, /ENTORN<br>REAL\./);
  assert.match(home, /IMATGE I<br>DIRECCIÓ\./);
  assert.match(home, /IMATGE, VEU<br>I RITME\./);
  assert.match(home, /PROVES AMB<br>FUTUR\./);

  assert.match(home, /\/media\/portfolio\/suro\.mp4/);
  assert.match(home, /\/media\/portfolio\/marina-poster\.webp/);
  assert.match(home, /\/media\/portfolio\/territori\.mp4/);
  assert.match(home, /\/media\/portfolio\/ia-visual\.mp4/);
  assert.match(home, /\/media\/portfolio\/lip-sync\.mp4/);
  assert.match(home, /\/media\/portfolio\/experiments\.mp4/);

  assert.doesNotMatch(home, /\/media\/portfolio\/hq\//, "Home must never load HQ media");
});

test("new LAB case pages load and link back to laboratori", async () => {
  const [marina, iaVisual, lipSync] = await Promise.all([
    read("../public/laboratori/marina/index.html"),
    read("../public/laboratori/ia-visual/index.html"),
    read("../public/laboratori/lip-sync/index.html"),
  ]);

  assert.match(marina, /href="\/laboratori\/"/);
  assert.match(marina, /MARINA/);
  assert.match(marina, /\/media\/portfolio\/marina-poster\.webp/);

  assert.match(iaVisual, /href="\/laboratori\/"/);
  assert.match(iaVisual, /\/media\/portfolio\/hq\/ia-visual-01\.mp4/);

  assert.match(lipSync, /href="\/laboratori\/"/);
  assert.match(lipSync, /\/media\/portfolio\/hq\/lip-sync-01\.mp4/);
});


