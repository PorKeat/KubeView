export interface Token {
  text: string;
  className: string;
}

/**
 * Tokenize a single YAML line into VS Code Dark+ color tokens.
 * Accurately handles keys, colons, array markers, strings, numbers, booleans,
 * comments, multiline block scalars, and embedded template expressions.
 */
export function tokenizeYamlLine(line: string): Token[] {
  if (!line) return [{ text: "", className: "" }];

  // 1. Comments
  const trimmed = line.trimStart();
  const indentLength = line.length - trimmed.length;
  const indent = line.slice(0, indentLength);

  if (trimmed.startsWith("#")) {
    return [
      { text: indent, className: "" },
      { text: trimmed, className: "text-[#6a9955] italic" },
    ];
  }

  // 2. Document headers
  if (trimmed === "---" || trimmed === "...") {
    return [
      { text: indent, className: "" },
      { text: trimmed, className: "text-[#569cd6] font-bold" },
    ];
  }

  const tokens: Token[] = [];
  if (indent) {
    tokens.push({ text: indent, className: "" });
  }

  let rest = trimmed;

  // 3. Array item prefix "- "
  if (rest.startsWith("- ") || rest === "-") {
    tokens.push({ text: "- ", className: "text-[#569cd6] font-bold" });
    rest = rest.slice(2);
  }

  if (!rest) {
    return tokens;
  }

  // 4. Key-Value match: "some.key/name: value" or "'quoted.key': value"
  const kvMatch = rest.match(/^((?:"[^"]*"|'[^']*'|[^:\s][^:]*)):(\s*.*)?$/);

  if (kvMatch) {
    const rawKey = kvMatch[1];
    const rawValue = kvMatch[2] ?? "";

    tokens.push({ text: rawKey, className: "text-[#9cdcfe] font-medium" });
    tokens.push({ text: ":", className: "text-[#d4d4d4]" });

    if (rawValue) {
      const leadingSpaceMatch = rawValue.match(/^(\s+)(.*)$/);
      const spaces = leadingSpaceMatch ? leadingSpaceMatch[1] : "";
      const val = leadingSpaceMatch ? leadingSpaceMatch[2] : rawValue;

      if (spaces) {
        tokens.push({ text: spaces, className: "" });
      }

      if (val) {
        tokens.push(...tokenizeYamlValue(val));
      }
    }

    return tokens;
  }

  // 5. Template syntax line (e.g. {{- with secret ... -}} or export VAR=...)
  if (
    rest.includes("{{") ||
    rest.startsWith("export ") ||
    rest.includes("}}")
  ) {
    tokens.push(...tokenizeTemplateOrScript(rest));
    return tokens;
  }

  // 6. Fallback scalar line
  tokens.push(...tokenizeYamlValue(rest));
  return tokens;
}

function tokenizeYamlValue(val: string): Token[] {
  const trimmed = val.trim();

  // Trailing comment: "value # comment"
  const commentIdx = val.indexOf(" #");
  if (commentIdx !== -1) {
    const beforeComment = val.slice(0, commentIdx);
    const commentPart = val.slice(commentIdx);
    return [
      ...tokenizeYamlValue(beforeComment),
      { text: commentPart, className: "text-[#6a9955] italic" },
    ];
  }

  // Block scalars |, |-, |+, >, >-, >+
  if (/^[|>][+-]?$/.test(trimmed)) {
    return [{ text: val, className: "text-[#d7ba7d] font-bold" }];
  }

  // Booleans (VS Code keyword blue)
  if (/^(true|false|yes|no)$/i.test(trimmed)) {
    return [{ text: val, className: "text-[#569cd6] font-semibold" }];
  }

  // Nulls
  if (/^(null|~)$/i.test(trimmed)) {
    return [{ text: val, className: "text-[#569cd6] font-semibold" }];
  }

  // Numbers (including integers, floats, and k8s quantities like 100m, 512Mi, 2Gi)
  if (
    /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?(m|k|M|G|T|P|E|Ki|Mi|Gi|Ti|Pi|Ei)?$/.test(
      trimmed,
    )
  ) {
    return [{ text: val, className: "text-[#b5cea8]" }];
  }

  // Quoted strings ("..." or '...') (VS Code warm coral)
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return [{ text: val, className: "text-[#ce9178]" }];
  }

  // Template tags inside value
  if (val.includes("{{")) {
    return tokenizeTemplateOrScript(val);
  }

  // Unquoted string value (e.g. secret/data/woodpecker, woodpecker-agent-, apps/v1)
  return [{ text: val, className: "text-[#ce9178]" }];
}

function tokenizeTemplateOrScript(str: string): Token[] {
  const parts = str.split(
    /(\{\{-?|-?\}\}|"[^"]*"|'[^']*'|\bwith\b|\bend\b|\brange\b|\bif\b|\belse\b|\bsecret\b|\bexport\b)/g,
  );
  return parts.filter(Boolean).map((p) => {
    if (p.startsWith("{{") || p.endsWith("}}")) {
      return { text: p, className: "text-[#ffd700] font-bold" };
    }
    if (/^(with|end|range|if|else)$/.test(p)) {
      return { text: p, className: "text-[#c586c0] font-semibold" };
    }
    if (p === "export") {
      return { text: p, className: "text-[#569cd6] font-semibold" };
    }
    if (p === "secret") {
      return { text: p, className: "text-[#dcdcaa]" };
    }
    if (p.startsWith('"') || p.startsWith("'")) {
      return { text: p, className: "text-[#ce9178]" };
    }
    if (p.startsWith(".")) {
      return { text: p, className: "text-[#9cdcfe]" };
    }
    return { text: p, className: "text-[#d4d4d4]" };
  });
}
