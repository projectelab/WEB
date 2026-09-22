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
  assert.match(sitemap, /\/laboratori\/territori\//);
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

