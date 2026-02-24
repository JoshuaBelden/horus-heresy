import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const xml = readFileSync(join(__dir, 'weapons.xml'), 'utf8');

// Extract all selectionEntry blocks
const entryRe = /<selectionEntry[^>]*>([\s\S]*?)<\/selectionEntry>/g;
const nameRe = /name="([^"]+)"/;
const profileRe = /<profile[^>]*typeName="(Ranged Weapon|Melee Weapon)"[^>]*>([\s\S]*?)<\/profile>/g;
const charRe = /<characteristic[^>]*name="([^"]+)"[^>]*>([^<]*)<\/characteristic>/g;

function decodeEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'");
}

function getChars(block) {
  const map = {};
  let m;
  while ((m = charRe.exec(block)) !== null) {
    map[m[1]] = decodeEntities(m[2].trim());
  }
  charRe.lastIndex = 0;
  return map;
}

function parseNum(val) {
  if (val == null || val === '' || val === '-') return val === '-' ? '-' : null;
  const n = Number(val);
  return isNaN(n) ? val : n;
}

function parseSR(val) {
  if (!val || val === '-') return [];
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

const rangedWeapons = [];
const meleeWeapons = [];

let entryMatch;
while ((entryMatch = entryRe.exec(xml)) !== null) {
  const entryBlock = entryMatch[0];
  const nameMatch = nameRe.exec(entryBlock);
  if (!nameMatch) continue;
  const name = nameMatch[1];
  nameRe.lastIndex = 0;

  let profMatch;
  profileRe.lastIndex = 0;
  while ((profMatch = profileRe.exec(entryBlock)) !== null) {
    const typeName = profMatch[1];
    const profBlock = profMatch[2];
    const chars = getChars(profBlock);

    if (typeName === 'Ranged Weapon') {
      rangedWeapons.push({
        name,
        R: parseNum(chars['R']),
        FP: parseNum(chars['FP']),
        RS: parseNum(chars['RS']),
        AP: parseNum(chars['AP']),
        D: parseNum(chars['D']),
        specialRules: parseSR(chars['Special Rules']),
        traits: parseSR(chars['Traits']),
      });
    } else if (typeName === 'Melee Weapon') {
      meleeWeapons.push({
        name,
        IM: chars['IM'] ?? '-',
        AM: parseNum(chars['AM']),
        SM: chars['SM'] ?? '0',
        AP: parseNum(chars['AP']),
        D: parseNum(chars['D']),
        specialRules: parseSR(chars['Special Rules']),
        traits: parseSR(chars['Traits']),
      });
    }
  }
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter(w => {
    if (seen.has(w.name)) return false;
    seen.add(w.name);
    return true;
  });
}

const uniqueRanged = dedupe(rangedWeapons).sort((a, b) => a.name.localeCompare(b.name));
const uniqueMelee = dedupe(meleeWeapons).sort((a, b) => a.name.localeCompare(b.name));

function toTs(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/"([A-Za-z][A-Za-z0-9_]*)":/g, '$1:');
}

const out = `import type { RangedWeapon, MeleeWeapon } from './types';

export const rangedWeapons: RangedWeapon[] = ${toTs(uniqueRanged)};

export const meleeWeapons: MeleeWeapon[] = ${toTs(uniqueMelee)};
`;

writeFileSync(join(__dir, '../data/weapons.ts'), out);
console.log(`Done: ${uniqueRanged.length} ranged, ${uniqueMelee.length} melee weapons`);
