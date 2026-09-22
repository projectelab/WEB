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
  assert.doesNotMatch(sitemap, /https:\/\/www\.desorden\.cat\/lab\//);
});
