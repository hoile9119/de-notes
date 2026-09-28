function currentMermaidTheme() {
  return document.body.getAttribute("data-md-color-scheme") === "slate" ? "dark" : "default";
}

document$.subscribe(() => {
  mermaid.initialize({ startOnLoad: false, theme: currentMermaidTheme() });
  mermaid.run({ querySelector: ".mermaid" });
});

const paletteObserver = new MutationObserver(() => {
  document.querySelectorAll(".mermaid[data-processed]").forEach((el) => {
    el.removeAttribute("data-processed");
  });
  mermaid.initialize({ startOnLoad: false, theme: currentMermaidTheme() });
  mermaid.run({ querySelector: ".mermaid" });
});

paletteObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["data-md-color-scheme"],
});
