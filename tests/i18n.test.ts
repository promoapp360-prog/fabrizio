import { describe, expect, it } from "vitest";
import { makeTranslator } from "../src/lib/i18n/translate";
import { isLanguage, languageDirection, languages } from "../src/lib/i18n/languages";
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { translateTree } from "../src/lib/i18n/translate-tree";

describe("Lingue del sito pubblico", () => {
  it("comprende l’italiano e tutte le 19 lingue della foto", () => {
    expect(languages).toHaveLength(20);
    expect(new Set(languages.map(item => item.code)).size).toBe(20);
    expect(isLanguage("he")).toBe(true);
    expect(isLanguage("javascript:alert(1)")).toBe(false);
    expect(isLanguage("../../admin")).toBe(false);
  });
  it("usa destra-sinistra solo per l’ebraico", () => {
    expect(languageDirection("he")).toBe("rtl");
    expect(languageDirection("ru")).toBe("ltr");
  });
  it("traduce senza modificare dati o prezzi dinamici", () => {
    const t = makeTranslator({
      "Menu": "Carta",
      "Tavolo {0}": "Mesa {0}",
      "Almeno {0} minuti di preavviso, entro 7 giorni.": "Al menos {0} minutos de antelación, dentro de 7 días.",
      "{0} a porzione": "{0} por ración",
    });
    expect(t(" Menu ")).toBe(" Carta ");
    expect(t("Tavolo 14")).toBe("Mesa 14");
    expect(t("Almeno 30 minuti di preavviso, entro 7 giorni.")).toBe("Al menos 30 minutos de antelación, dentro de 7 días.");
    expect(t("25,00 € a porzione")).toBe("25,00 € por ración");
    expect(t("cliente@example.com")).toBe("cliente@example.com");
    expect(t("Nota personale non catalogata")).toBe("Nota personale non catalogata");
  });
  it("mantiene le nuove righe degli orari e la lingua originale se manca una traduzione", () => {
    const t = makeTranslator({ "Pranzo": "Almuerzo", "Cena": "Cena" });
    expect(t("Pranzo\nCena")).toBe("Almuerzo\nCena");
    expect(makeTranslator({})("Nome cliente")).toBe("Nome cliente");
  });
  it("prepara i testi server prima dello streaming senza cambiare input e collegamenti", () => {
    const t = makeTranslator({ "Menu": "תפריט", "Nome": "שם" });
    const tree = createElement("div", null,
      createElement("h1", null, "Menu"),
      createElement("a", { href: "/menu" }, "Menu"),
      createElement("input", { name: "name", defaultValue: "Nome", placeholder: "Nome" }),
      createElement("p", { translate: "no" }, "Nome"),
    );
    const html = renderToStaticMarkup(translateTree(tree, t));
    expect(html).toContain("<h1>תפריט</h1>");
    expect(html).toContain('href="/menu">תפריט</a>');
    expect(html).toContain('value="Nome"');
    expect(html).toContain('placeholder="שם"');
    expect(html).toContain('translate="no">Nome</p>');
  });
  it("mantiene le proprietà commerciali e le chiavi anche in italiano", () => {
    const Component = (_props: { productId: string; name: string }) => null;
    const child = createElement(Component, { key: "stable", productId: "product-id", name: "Menu" });
    const itTree = translateTree(child, makeTranslator({}));
    const esTree = translateTree(child, makeTranslator({ Menu: "Carta" }));
    expect(isValidElement(itTree)).toBe(true);
    expect(isValidElement(esTree)).toBe(true);
    if (isValidElement<Record<string, unknown>>(itTree) && isValidElement<Record<string, unknown>>(esTree)) {
      expect(itTree.key).toBe(esTree.key);
      expect(esTree.props.productId).toBe("product-id");
      expect(esTree.props.name).toBe("Menu");
    }
  });
});
