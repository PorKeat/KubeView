type YamlScalar = string | number | boolean | null;
type YamlValue =
  YamlScalar | YamlValue[] | { [key: string]: YamlValue | undefined };

const NUMBER_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const RESERVED_PATTERN = /^(true|false|null|~|yes|no|on|off)$/i;
const UNSAFE_SCALAR_PATTERN =
  /(?::\s|:$)|[\n\r\t#[\]{}&*!|>'"%@`,]|^[-?:,\[\]{}#&*!|>'"%@`]/;
const UNSAFE_KEY_PATTERN = /[:\s\n\r\t#[\]{}&*!|>'"%@`,]/;

function isPlainObject(value: unknown): value is Record<string, YamlValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }
  const text = String(value);
  if (text === "") return '""';
  if (
    RESERVED_PATTERN.test(text) ||
    NUMBER_PATTERN.test(text) ||
    UNSAFE_SCALAR_PATTERN.test(text) ||
    /^\s|\s$/.test(text) ||
    /^[-?]/.test(text)
  ) {
    return JSON.stringify(text);
  }
  return text;
}

function formatKey(key: string): string {
  if (key === "" || UNSAFE_KEY_PATTERN.test(key) || /^[-?]/.test(key)) {
    return JSON.stringify(key);
  }
  return key;
}

function serialize(value: unknown, indent: number): string {
  const pad = " ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          const nested = serialize(item, indent + 2);
          if (nested === "{}" || nested === "[]") {
            return `${pad}- ${nested}`;
          }
          const [first, ...rest] = nested.split("\n");
          return `${pad}- ${first.slice(indent + 2)}${
            rest.length > 0 ? `\n${rest.join("\n")}` : ""
          }`;
        }
        return `${pad}- ${formatScalar(item)}`;
      })
      .join("\n");
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(
      ([, entry]) => entry !== undefined,
    );
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, entry]) => {
        const renderedKey = formatKey(key);
        if (Array.isArray(entry)) {
          if (entry.length === 0) return `${pad}${renderedKey}: []`;
          return `${pad}${renderedKey}:\n${serialize(entry, indent + 2)}`;
        }
        if (isPlainObject(entry)) {
          if (Object.keys(entry).length === 0) {
            return `${pad}${renderedKey}: {}`;
          }
          return `${pad}${renderedKey}:\n${serialize(entry, indent + 2)}`;
        }
        return `${pad}${renderedKey}: ${formatScalar(entry)}`;
      })
      .join("\n");
  }

  return formatScalar(value);
}

/** Serialize a Kubernetes manifest object to readable YAML without a runtime dependency. */
export function toManifestYaml(manifest: Record<string, unknown>): string {
  return `${serialize(manifest, 0)}\n`;
}
