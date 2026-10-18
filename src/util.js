export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export const latestImage = (reading) => {
  const list = Array.isArray(reading?.images) ? reading.images : [];
  return list.length ? list[list.length - 1] : null;
};
