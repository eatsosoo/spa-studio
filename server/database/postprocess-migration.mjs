import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const journalPath = new URL('./migrations/meta/_journal.json', import.meta.url)
const journal = JSON.parse(await readFile(journalPath, 'utf8'))
const latest = journal.entries.at(-1)

if (!latest) {
  console.log('No migration to post-process')
  process.exit(0)
}

const migrationPath = new URL(`./migrations/${latest.tag}.sql`, import.meta.url)
const snapshotPath = new URL(`./migrations/meta/${String(latest.idx).padStart(4, '0')}_snapshot.json`, import.meta.url)

let migration = await readFile(migrationPath, 'utf8')
let snapshot = await readFile(snapshotPath, 'utf8')

if (!migration.startsWith('SET default_storage_engine = InnoDB;')) {
  migration = `SET default_storage_engine = InnoDB;\n--> statement-breakpoint\n${migration}`
}

migration = migration.replace(
  /(CREATE TABLE `[^`]+` \([\s\S]*?\n)\);(?=\r?\n--> statement-breakpoint)/g,
  '$1) ENGINE=InnoDB;',
)

const identifiers = new Set(
  [...migration.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1])
    .filter((identifier) => identifier.length > 64),
)

for (const identifier of identifiers) {
  const suffix = createHash('sha256').update(identifier).digest('hex').slice(0, 8)
  const shortened = `${identifier.slice(0, 55)}_${suffix}`
  migration = migration.replaceAll(`\`${identifier}\``, `\`${shortened}\``)
  snapshot = snapshot.replaceAll(`"${identifier}"`, `"${shortened}"`)
  console.log(`Shortened ${identifier} -> ${shortened}`)
}

const statements = migration
  .split('--> statement-breakpoint')
  .map((statement) => statement.trim())
  .filter(Boolean)

for (let foreignKeyIndex = 0; foreignKeyIndex < statements.length; foreignKeyIndex += 1) {
  const match = statements[foreignKeyIndex].match(/^ALTER TABLE `([^`]+)` DROP FOREIGN KEY /)
  if (!match) continue

  const table = match[1]
  const indexDropIndex = statements.findIndex(
    (statement, index) => index < foreignKeyIndex && statement.startsWith(`ALTER TABLE \`${table}\` DROP INDEX `),
  )
  if (indexDropIndex === -1) continue

  const [foreignKeyDrop] = statements.splice(foreignKeyIndex, 1)
  statements.splice(indexDropIndex, 0, foreignKeyDrop)
  foreignKeyIndex = indexDropIndex
  console.log(`Moved foreign-key drop before index drop on ${table}`)
}

migration = `${statements.join('\n--> statement-breakpoint\n')}\n`

await writeFile(migrationPath, migration)
await writeFile(snapshotPath, snapshot)
console.log(`Post-processed ${latest.tag}`)
