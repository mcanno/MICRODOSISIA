import { loadEnv, serverEnv } from "./env";

loadEnv();

const url = serverEnv("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL no está definida. Copia .env.example a .env.");
  process.exit(1);
}

const { neon } = await import("@neondatabase/serverless");
const sql = neon(url);

/**
 * Second line of defence for the state machine: the database itself rejects
 * out-of-order transitions and a `realizada` row without documentation.
 * The application validates the same rules on top of this.
 */
const GUARD = `
CREATE OR REPLACE FUNCTION enforce_microdosis_transition() RETURNS trigger AS $$
DECLARE
  allowed boolean;
BEGIN
  IF NEW.state = OLD.state THEN
    RETURN NEW;
  END IF;

  allowed := (OLD.state = 'propuesta'   AND NEW.state = 'en_estudio')
          OR (OLD.state = 'en_estudio'  AND NEW.state = 'realizada');

  IF NOT allowed THEN
    RAISE EXCEPTION 'Transicion no permitida: % -> %', OLD.state, NEW.state;
  END IF;

  IF NEW.state = 'realizada'
     AND (NEW.documentation_url IS NULL OR btrim(NEW.documentation_url) = '') THEN
    RAISE EXCEPTION 'Una microdosis realizada debe incluir documentation_url';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS microdosis_state_guard ON microdosis;
CREATE TRIGGER microdosis_state_guard
  BEFORE UPDATE OF state ON microdosis
  FOR EACH ROW
  EXECUTE FUNCTION enforce_microdosis_transition();
`;

await sql.query(GUARD);
console.log("Trigger de transiciones aplicado (enforce_microdosis_transition).");
process.exit(0);
