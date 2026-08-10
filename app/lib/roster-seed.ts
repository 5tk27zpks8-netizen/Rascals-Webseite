import { bindings } from "./cms";

const roster: Array<[string, string]> = [
  ["Alex", "Link"],
  ["Alexander", "Helmel"],
  ["André", "Kasper"],
  ["André", "Reif"],
  ["Anil", "Canova"],
  ["Axel", "Eberhardt"],
  ["Ben", "Bühler"],
  ["Benjamin", "Brandner"],
  ["Bruno", "Schuster"],
  ["Chris", "Schönemann"],
  ["Christoph", "Leger"],
  ["Christopher", "Ganesch"],
  ["Daniel", "Kovacs"],
  ["Daniel", "Schwager"],
  ["Danny", "N"],
  ["David", "Füchsle"],
  ["David", "Marra"],
  ["Davide", "Politano"],
  ["Dennis", "Bauer"],
  ["Dennis", "Link"],
  ["Dimitris", "Dolmas"],
  ["Dominik", "Schoeps"],
  ["Dorian", "Sittner"],
  ["Eduard", "Hihn"],
  ["Enver", "Jonuz"],
  ["Fabian", "Bück"],
  ["Fabian", "Djuric"],
  ["Fabian", "Dorschky"],
  ["Fabian", "Leopold"],
  ["Felix", "Merz"],
  ["Francesca", "Rodriguez"],
  ["Frank", "Schwarz"],
  ["Gianluca", "Politano"],
  ["James", "Letcher"],
  ["Jayson", "Hafner"],
  ["Jonas", "Füchsle"],
  ["Jonas", "Müller"],
  ["Josip", "Tomic"],
  ["Justin", "Bublitz"],
  ["Justin", "Liegl"],
  ["Kevin", "Klauer"],
  ["Luca", "Hartel"],
  ["Lukas", "Endlich"],
  ["Lukas", "Weihs"],
  ["Lukes", "Zeun"],
  ["Malaika", "Mangold"],
  ["Manuel", "Wolf"],
  ["Marcello", "Haase"],
  ["Marvin", "Bittner"],
  ["Matthew", "Grosz"],
  ["Mert", "Ucal"],
  ["Nicolas", "Dollansky"],
  ["Nino", "Adzaj"],
  ["Noah", "Vukmirovic"],
  ["Patrick", "Rodriguez"],
  ["Philip", "Gnaier"],
  ["Philipp", "Epple"],
  ["Sam", "Füchsle"],
  ["Sascha", "Brand"],
  ["Sebastian", "Hihn"],
  ["Sergej(Sigi)", "Link"],
  ["Seymen Thommy", "Oran"],
  ["Simon", "Liegl"],
  ["Simon", "Wannenwetsch"],
  ["Stefan", "Walter"],
  ["Thomas", "Sperr"],
  ["Tim", "Berger"],
  ["Tim", "Hessling"],
  ["Ty", "Faulks"],
  ["Ümitcan", "Yazici"],
  ["Wilhelm", "Jakuschewski"],
  ["Yannick", "Wehling"],
];

function slugifyRoster(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

export async function ensureInitialRoster() {
  const { DB } = bindings();
  const statements = roster.map(([firstName, lastName]) => {
    const slug = slugifyRoster(`${firstName}-${lastName}`);
    return DB.prepare(`INSERT OR IGNORE INTO players
      (id,slug,first_name,last_name,nickname,jersey_number,position,secondary_position,unit,team_id,height_cm,weight_kg,birth_date,joined_year,portrait,bio,instagram,captain,starter,rookie,status,return_date,active)
      VALUES (?,?,?,?,?,NULL,'','',?,'mens',NULL,NULL,NULL,NULL,'','','',0,0,0,'active',NULL,1)`)
      .bind(`roster-${slug}`, slug, firstName, lastName, "", "defense");
  });
  if (statements.length) await DB.batch(statements);
}
