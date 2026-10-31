import { DOMParser, type Element, type Node } from "@xmldom/xmldom";
import { DomainError } from "../domain/DomainError.js";
import { NumericRules } from "../domain/NumericRules.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import { ShapeImportData } from "../domain/ShapeImportData.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { DocumentReadResult } from "../ports/DocumentReadResult.js";
import { XmlEscaper } from "./XmlEscaper.js";

export class SvgReader {
  constructor(private readonly factory = new ShapeFactory()) {}
  public read(source: string): DocumentReadResult {
    XmlEscaper.validate(source);
    if (/<!DOCTYPE/i.test(source)) throw new DomainError("SVG DOCTYPE is not supported");
    const xml = new DOMParser({
      onError: (_level, message) => { throw new DomainError(`invalid SVG XML: ${message}`); },
      normalizeLineEndings: value => value.replace(/\r\n?/g, "\n")
    }).parseFromString(source, "text/xml");
    const root = xml.documentElement;
    if (!root || root.localName !== "svg") throw new DomainError("expected SVG root element");
    for (let node = xml.firstChild; node; node = node.nextSibling) {
      if (node === root || node.nodeType === 8 || (node.nodeType === 7 && node.nodeName === "xml")) continue;
      if (node.nodeType === 3 && !node.nodeValue?.trim()) continue;
      throw new DomainError("unsupported node outside SVG root");
    }
    const attrs = this.attributes(root);
    for (const name of Object.keys(attrs)) {
      if (!["width", "height", "viewBox"].includes(name)) throw new DomainError(`unsupported SVG root attribute: ${name}`);
    }
    const width = NumericRules.parse((attrs["width"] ?? "").replace(/px$/, ""), "width");
    const height = NumericRules.parse((attrs["height"] ?? "").replace(/px$/, ""), "height");
    const document = new SvgDocument(width, height);
    if (attrs["viewBox"] !== undefined) {
      const view = attrs["viewBox"].trim().split(/[\s,]+/).map(v => NumericRules.parse(v, "viewBox"));
      if (view.length !== 4 || view[0] !== 0 || view[1] !== 0 || view[2] !== width || view[3] !== height) {
        throw new DomainError("unsupported viewBox: expected 0 0 width height");
      }
    }
    const ids = new Set<string>();
    const reserve = (element: Element): void => {
      const id = element.getAttribute("id");
      if (id !== null) {
        if (!id || /\s/.test(id)) throw new DomainError("invalid SVG id");
        if (ids.has(id)) throw new DomainError(`duplicate id: ${id}`);
        ids.add(id);
      }
      for (const child of this.children(element)) reserve(child);
    };
    for (const child of this.children(root)) reserve(child);
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const build = (element: Element): Shape => {
      const attributes = this.attributes(element);
      const type = element.localName ?? element.tagName;
      let id = attributes["id"];
      if (id === undefined) {
        let count = counters.get(type) ?? 0;
        do { id = `${type}${++count}`; } while (ids.has(id));
        counters.set(type, count);
        ids.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
      }
      const data = new ShapeImportData(attributes, this.text(element), this.children(element).map(build));
      return this.factory.createFromSvg(type, id, data);
    };
    if (this.text(root).trim()) throw new DomainError("unexpected SVG root text");
    for (const child of this.children(root)) document.insert(build(child));
    return new DocumentReadResult(document, warnings);
  }
  private attributes(element: Element): Record<string, string> {
    if (element.namespaceURI && element.namespaceURI !== "http://www.w3.org/2000/svg") throw new DomainError("unsupported SVG namespace");
    const result: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes.item(i)!;
      if (attr.namespaceURI === "http://www.w3.org/2000/xmlns/") continue;
      if (attr.namespaceURI) throw new DomainError(`unsupported SVG attribute: ${attr.name}`);
      XmlEscaper.validate(attr.value);
      result[attr.name] = attr.value;
    }
    return result;
  }
  private children(element: Element): Element[] {
    const result: Element[] = [];
    for (let child: Node | null = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) result.push(child as Element);
      else if (![3, 4, 8].includes(child.nodeType)) throw new DomainError("unsupported node inside SVG");
    }
    return result;
  }
  private text(element: Element): string {
    let result = "";
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3 || child.nodeType === 4) result += child.nodeValue ?? "";
    }
    XmlEscaper.validate(result);
    return result;
  }
}

